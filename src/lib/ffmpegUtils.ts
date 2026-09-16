import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { 
  shouldEnableFFmpegMultithreading, 
  getOptimalThreadCount, 
  getFFmpegOptimizationFlags,
  createOptimizedFFmpegCommand,
  logBrowserCapabilities,
  detectBrowserCapabilities 
} from './browserCapabilities';
import { isMultithreadingAvailable, ffmpegWorkerManager } from './ffmpegWorkerManager';
import { fitExportDimensions, getImageFileExtension } from './exportDimensions';

export interface FFmpegCodec {
  name: string;
  mimeType: string;
  extension: string;
  supported: boolean;
}

export class FFmpegManager {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;
  private multithreadingEnabled: boolean | null = null;

  constructor() {
    // Don't call browser capabilities during construction to avoid initialization issues
  }

  private getMultithreadingEnabled(): boolean {
    if (this.multithreadingEnabled === null) {
      this.multithreadingEnabled = shouldEnableFFmpegMultithreading();
    }
    return this.multithreadingEnabled;
  }

  async load(): Promise<void> {
    if (this.isLoaded) return;
    if (this.isLoading) {
      // Wait for current loading to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;

    try {
      this.ffmpeg = new FFmpeg();
      
      // Load FFmpeg core
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
      console.log('FFmpeg loaded successfully');
      console.log(`Multithreading enabled: ${this.getMultithreadingEnabled()}`);
    } catch (error) {
      console.error('FFmpeg loading failed:', error);
      this.ffmpeg = null;
      this.isLoaded = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async isReady(): Promise<boolean> {
    if (!this.ffmpeg) {
      try {
        await this.load();
      } catch (error) {
        return false;
      }
    }
    return this.isLoaded;
  }

  async generateVideoFromImages(
    imageFiles: File[],
    settings: {
      fps: number;
      width: number;
      height: number;
      codec: string;
    },
    onProgress?: (progress: number, stage: string) => void
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load();
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg not loaded');
    }

    const startTime = performance.now();
    const isMultithreaded = this.getMultithreadingEnabled();
    const threadCount = getOptimalThreadCount();
    const exportSize = fitExportDimensions(settings.width, settings.height);
    const outputWidth = exportSize.width;
    const outputHeight = exportSize.height;

    // Keep only a few source files in WASM MEMFS at a time (critical for multi-GB folders)
    const CHUNK_SIZE = 8;
    const isH264 = settings.codec.includes('h264') || settings.codec.includes('avc');
    const codec = isH264 ? 'libx264' : 'libvpx';
    const imageDuration = 1 / settings.fps;
    const scaleFilter = `scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2`;
    const segmentNames: string[] = [];

    try {
      console.log(`🚀 Starting chunked video generation: ${imageFiles.length} images, chunk=${CHUNK_SIZE}, ${isMultithreaded ? 'multithreaded' : 'single-threaded'} (${threadCount} threads)`);
      console.log(`📐 Output size: ${outputWidth}x${outputHeight}${exportSize.scaled ? ' (clamped)' : ''}`);

      const encodingStartTime = performance.now();
      const totalChunks = Math.ceil(imageFiles.length / CHUNK_SIZE);

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const chunk = imageFiles.slice(start, start + CHUNK_SIZE);
        const writtenNames: string[] = [];

        if (onProgress) {
          const base = 5 + (chunkIndex / totalChunks) * 70;
          onProgress(Math.round(base), `Encoding chunk ${chunkIndex + 1}/${totalChunks}`);
        }

        for (let i = 0; i < chunk.length; i++) {
          const ext = getImageFileExtension(chunk[i]);
          const fileName = `image_${i.toString().padStart(4, '0')}.${ext}`;
          const imageData = await fetchFile(chunk[i]);
          await this.ffmpeg.writeFile(fileName, imageData);
          writtenNames.push(fileName);
        }

        let concatContent = writtenNames
          .map((name) => `file '${name}'\nduration ${imageDuration}`)
          .join('\n');
        concatContent += `\nfile '${writtenNames[writtenNames.length - 1]}'`;
        await this.ffmpeg.writeFile('concat.txt', concatContent);

        const segmentName = `segment_${chunkIndex.toString().padStart(4, '0')}.mp4`;
        const command = [
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat.txt',
          '-vf', scaleFilter,
          '-c:v', codec,
          '-pix_fmt', 'yuv420p',
          '-r', settings.fps.toString(),
          '-preset', 'ultrafast',
          '-crf', '23',
          '-movflags', '+faststart',
          '-y',
          segmentName,
        ];

        console.log(`🎬 Chunk ${chunkIndex + 1}/${totalChunks}:`, command.join(' '));
        await this.ffmpeg.exec(command);
        segmentNames.push(segmentName);

        // Free MEMFS for this chunk's source images before loading the next
        for (const name of writtenNames) {
          try { await this.ffmpeg.deleteFile(name); } catch { /* ignore */ }
        }
        try { await this.ffmpeg.deleteFile('concat.txt'); } catch { /* ignore */ }
      }

      if (onProgress) onProgress(80, 'Joining segments...');

      let videoData: Uint8Array | string;

      if (segmentNames.length === 1) {
        videoData = await this.ffmpeg.readFile(segmentNames[0]);
      } else {
        const segmentConcat = segmentNames.map((name) => `file '${name}'`).join('\n');
        await this.ffmpeg.writeFile('segments.txt', segmentConcat);
        await this.ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'segments.txt',
          '-c', 'copy',
          '-movflags', '+faststart',
          '-y',
          'output.mp4',
        ]);
        videoData = await this.ffmpeg.readFile('output.mp4');
        try { await this.ffmpeg.deleteFile('segments.txt'); } catch { /* ignore */ }
        try { await this.ffmpeg.deleteFile('output.mp4'); } catch { /* ignore */ }
      }

      for (const name of segmentNames) {
        try { await this.ffmpeg.deleteFile(name); } catch { /* ignore */ }
      }

      const encodingTime = performance.now() - encodingStartTime;
      if (onProgress) onProgress(90, 'Finalizing video...');

      if (videoData instanceof Uint8Array && videoData.length < 1000) {
        throw new Error('Generated video file is too small, FFmpeg may not have processed images correctly');
      }

      const videoBlob = new Blob([videoData as BlobPart], { type: 'video/mp4' });
      if (videoBlob.size < 1000) {
        throw new Error('Generated video blob is too small, check FFmpeg processing');
      }

      const isValidVideo = await this.validateVideoBlob(videoBlob);
      if (!isValidVideo) {
        throw new Error('Generated video failed validation - may not be playable');
      }

      if (onProgress) onProgress(100, 'Complete');

      const totalTime = performance.now() - startTime;
      console.log(`✅ Chunked video generation completed in ${totalTime.toFixed(2)}ms (encoding: ${encodingTime.toFixed(2)}ms)`);
      console.log(`📊 Performance: ${imageFiles.length} images at ${(imageFiles.length / (totalTime / 1000)).toFixed(2)} images/second`);

      return videoBlob;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error(`❌ Video generation failed after ${totalTime.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  private async cleanupFiles(writtenNames: string[] | number, outputFormat: string) {
    if (!this.ffmpeg) return;

    const names = Array.isArray(writtenNames)
      ? writtenNames
      : Array.from({ length: writtenNames }, (_, i) => `image_${i.toString().padStart(4, '0')}.jpg`);
    
    for (const name of names) {
      try {
        await this.ffmpeg.deleteFile(name);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    // Clean up concat file
    try {
      await this.ffmpeg.deleteFile('concat.txt');
    } catch (e) {
      // Ignore cleanup errors
    }
    
    try {
      await this.ffmpeg.deleteFile(`output.${outputFormat}`);
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  async getSupportedCodecs(): Promise<FFmpegCodec[]> {
    if (!this.ffmpeg || !this.isLoaded) {
      try {
        await this.load();
      } catch (error) {
        console.log('FFmpeg failed to load, returning default codecs');
        return this.getDefaultCodecs();
      }
    }

    if (!this.ffmpeg) {
      return this.getDefaultCodecs();
    }

    try {
      // Use a simpler approach - just return the codecs we know FFmpeg supports
      // instead of trying to query the encoders list which can cause FS errors
      return [
        {
          name: "H.264 (MP4)",
          mimeType: "video/mp4;codecs=h264",
          extension: "mp4",
          supported: true
        },
        {
          name: "VP9 (WebM)",
          mimeType: "video/webm;codecs=vp9",
          extension: "webm",
          supported: true
        },
        {
          name: "VP8 (WebM)",
          mimeType: "video/webm;codecs=vp8",
          extension: "webm",
          supported: true
        }
      ];
    } catch (error) {
      console.error('Error getting codecs:', error);
      return this.getDefaultCodecs();
    }
  }

  private getDefaultCodecs(): FFmpegCodec[] {
    return [
      {
        name: "H.264 (MP4)",
        mimeType: "video/mp4;codecs=h264",
        extension: "mp4",
        supported: true
      },
      {
        name: "VP9 (WebM)",
        mimeType: "video/webm;codecs=vp9",
        extension: "webm",
        supported: true
      },
      {
        name: "VP8 (WebM)",
        mimeType: "video/webm;codecs=vp8",
        extension: "webm",
        supported: true
      }
    ];
  }

  async createThumbnail(videoBlob: Blob): Promise<string> {
    if (!this.ffmpeg || !this.isLoaded) {
      try {
        await this.load();
      } catch (error) {
        console.error('FFmpeg failed to load for thumbnail creation:', error);
        // Try fallback immediately if FFmpeg can't load
        return await this.createFallbackThumbnail(videoBlob);
      }
    }

    if (!this.ffmpeg) {
      console.warn('FFmpeg not available, using fallback thumbnail');
      return await this.createFallbackThumbnail(videoBlob);
    }

    try {
      // Check if FFmpeg file system is in a good state
      try {
        await this.ffmpeg.listDir('/');
      } catch (fsError) {
        console.warn('FFmpeg file system error, using fallback thumbnail:', fsError);
        return await this.createFallbackThumbnail(videoBlob);
      }

      const videoData = await fetchFile(videoBlob);
      
      // Use unique filenames to avoid conflicts
      const inputFileName = `input_video_${Date.now()}.mp4`;
      const outputFileName = `thumbnail_${Date.now()}.jpg`;
      
      try {
        await this.ffmpeg.writeFile(inputFileName, videoData);
      } catch (writeError) {
        console.warn('Failed to write video file to FFmpeg, using fallback:', writeError);
        return await this.createFallbackThumbnail(videoBlob);
      }

      // Extract first frame with optimization flags
      const baseCommand = [
        '-i', inputFileName,
        '-vframes', '1',
        '-f', 'image2',
        '-y',
        outputFileName
      ];

      const optimizedCommand = this.getMultithreadingEnabled() 
        ? createOptimizedFFmpegCommand(baseCommand)
        : baseCommand;

      console.log('🖼️ Thumbnail FFmpeg command:', optimizedCommand.join(' '));
      
      try {
        await this.ffmpeg.exec(optimizedCommand);
      } catch (execError) {
        console.warn('FFmpeg thumbnail generation failed, using fallback:', execError);
        // Clean up input file before fallback
        try {
          await this.ffmpeg.deleteFile(inputFileName);
        } catch (e) {
          // Ignore cleanup errors
        }
        return await this.createFallbackThumbnail(videoBlob);
      }

      let thumbnailData: Uint8Array | string;
      try {
        thumbnailData = await this.ffmpeg.readFile(outputFileName);
      } catch (readError) {
        console.warn('Failed to read thumbnail file, using fallback:', readError);
        // Clean up files before fallback
        try {
          await this.ffmpeg.deleteFile(inputFileName);
          await this.ffmpeg.deleteFile(outputFileName);
        } catch (e) {
          // Ignore cleanup errors
        }
        return await this.createFallbackThumbnail(videoBlob);
      }
      
      // Clean up
      try {
        await this.ffmpeg.deleteFile(inputFileName);
        await this.ffmpeg.deleteFile(outputFileName);
      } catch (e) {
        // Ignore cleanup errors
        console.warn('Thumbnail cleanup failed:', e);
      }

      // Handle both Uint8Array and string return types from FFmpeg
      let thumbnailBlob: Blob;
      if (thumbnailData instanceof Uint8Array) {
        thumbnailBlob = new Blob([thumbnailData as BlobPart], { type: 'image/jpeg' });
      } else {
        // Convert string to Uint8Array if needed
        const encoder = new TextEncoder();
        thumbnailBlob = new Blob([encoder.encode(thumbnailData)], { type: 'image/jpeg' });
      }
      
      return URL.createObjectURL(thumbnailBlob);
    } catch (error) {
      console.error('Thumbnail creation error:', error);
      
      // Try fallback thumbnail creation
      try {
        return await this.createFallbackThumbnail(videoBlob);
      } catch (fallbackError) {
        console.error('Fallback thumbnail creation also failed:', fallbackError);
        // Return a placeholder as last resort
        return this.createPlaceholderThumbnail();
      }
    }
  }

  private async createFallbackThumbnail(videoBlob: Blob): Promise<string> {
    // Create a simple fallback thumbnail using video element
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        video.remove();
        // Try placeholder as last resort
        resolve(this.createPlaceholderThumbnail());
      }, 15000); // 15 second timeout

      video.onloadeddata = () => {
        try {
          clearTimeout(timeout);
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            video.remove();
            // Try placeholder as last resort
            resolve(this.createPlaceholderThumbnail());
            return;
          }

          // Set reasonable thumbnail dimensions
          canvas.width = 320;
          canvas.height = 180;
          
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          video.remove();
          resolve(thumbnailUrl);
        } catch (error) {
          clearTimeout(timeout);
          video.remove();
          // Try placeholder as last resort
          resolve(this.createPlaceholderThumbnail());
        }
      };
      
      video.onerror = (error) => {
        clearTimeout(timeout);
        video.remove();
        console.warn('Video loading error for thumbnail:', error);
        // Try placeholder as last resort
        resolve(this.createPlaceholderThumbnail());
      };
      
      video.onabort = () => {
        clearTimeout(timeout);
        video.remove();
        // Try placeholder as last resort
        resolve(this.createPlaceholderThumbnail());
      };
      
      // Set video source and load
      try {
        video.src = URL.createObjectURL(videoBlob);
        video.load();
      } catch (error) {
        clearTimeout(timeout);
        video.remove();
        // Try placeholder as last resort
        resolve(this.createPlaceholderThumbnail());
      }
    });
  }

  private createPlaceholderThumbnail(): string {
    // Create a simple placeholder thumbnail
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return '';
    }
    
    canvas.width = 320;
    canvas.height = 180;
    
    // Draw a simple placeholder
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Video Thumbnail', canvas.width / 2, canvas.height / 2);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  private async validateVideoBlob(videoBlob: Blob): Promise<boolean> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      
      const timeout = setTimeout(() => {
        video.remove();
        resolve(false);
      }, 5000); // 5 second timeout
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        video.remove();
        console.log('✅ Video validation: metadata loaded, duration:', video.duration);
        resolve(video.duration > 0);
      };
      
      video.onerror = (error) => {
        clearTimeout(timeout);
        video.remove();
        console.error('❌ Video validation failed:', error);
        resolve(false);
      };
      
      video.src = URL.createObjectURL(videoBlob);
    });
  }

  private async getVideoInfo(filename: string): Promise<{ duration: number; frameCount: number; width: number; height: number }> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not loaded');
    }

    try {
      // Use FFprobe-like approach with FFmpeg to get video information
      const probeCommand = [
        '-i', filename,
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams'
      ];
      
      console.log('🔍 Getting video info with command:', probeCommand.join(' '));
      
      // For now, since FFmpeg.wasm doesn't have ffprobe, we'll use a simpler approach
      // We'll estimate based on the file size and assume it was created correctly
      const fileData = await this.ffmpeg.readFile(filename);
      const fileSize = fileData instanceof Uint8Array ? fileData.length : fileData.length;
      
      console.log('📊 Video file size for info calculation:', fileSize, 'bytes');
      
      // Estimate duration based on file size (rough approximation)
      // A typical MP4 with H.264 at reasonable quality is ~1MB per minute
      const estimatedDuration = Math.max(0.5, fileSize / (1024 * 1024)); // At least 0.5 seconds
      
      // For now, return reasonable estimates
      // In a production system, you'd want to use a proper ffprobe implementation
      return {
        duration: estimatedDuration,
        frameCount: Math.floor(estimatedDuration * 30), // Assume 30fps
        width: 1920, // Default width
        height: 1080 // Default height
      };
    } catch (error) {
      console.error('Failed to get video info:', error);
      // Return fallback values instead of throwing
      return {
        duration: 1.0,
        frameCount: 30,
        width: 1920,
        height: 1080
      };
    }
  }

  /**
   * Check if multithreading is enabled for this instance
   */
  isMultithreadingEnabled(): boolean {
    return this.getMultithreadingEnabled();
  }

  /**
   * Get the optimal thread count for this system
   */
  getOptimalThreadCount(): number {
    return getOptimalThreadCount();
  }

  /**
   * Check if FFmpeg is loaded and ready
   */
  isFFmpegLoaded(): boolean {
    return this.isLoaded;
  }
}

// Create singleton instance lazily
let _ffmpegManager: FFmpegManager | null = null;

export function getFFmpegManager(): FFmpegManager {
  if (!_ffmpegManager) {
    _ffmpegManager = new FFmpegManager();
  }
  return _ffmpegManager;
}

// Export utility functions
export async function getFFmpegCodecs(): Promise<FFmpegCodec[]> {
  return await getFFmpegManager().getSupportedCodecs();
}

export async function generateVideoWithFFmpeg(
  imageFiles: File[],
  settings: {
    fps: number;
    width: number;
    height: number;
    codec: string;
  },
  onProgress?: (progress: number, stage: string) => void
): Promise<Blob> {
  return await getFFmpegManager().generateVideoFromImages(imageFiles, settings, onProgress);
}

// Export multithreading utilities
export { 
  shouldEnableFFmpegMultithreading, 
  getOptimalThreadCount, 
  getFFmpegOptimizationFlags,
  createOptimizedFFmpegCommand,
  logBrowserCapabilities 
} from './browserCapabilities';

// Re-export from worker manager for convenience
export { isMultithreadingAvailable } from './ffmpegWorkerManager';

// Add global function for debugging (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).checkMultithreadingStatus = () => {
    const manager = getFFmpegManager();
    const capabilities = detectBrowserCapabilities();
    const workerManager = ffmpegWorkerManager;
    
    console.log('🔍 Multithreading Status Check:', {
      browser: {
        webWorkers: capabilities.webWorkers,
        sharedArrayBuffer: capabilities.sharedArrayBuffer,
        atomics: capabilities.atomics,
        hardwareConcurrency: capabilities.hardwareConcurrency,
        deviceMemory: capabilities.deviceMemory
      },
      ffmpeg: {
        loaded: manager.isFFmpegLoaded(),
        multithreadingEnabled: manager.isMultithreadingEnabled(),
        optimalThreads: manager.getOptimalThreadCount()
      },
      worker: {
        enabled: workerManager.isMultithreadingEnabled(),
        ready: workerManager.isWorkerReady(),
        initialized: workerManager.getMultithreadingStatus()
      },
      multithreading: {
        shouldEnable: shouldEnableFFmpegMultithreading(),
        isAvailable: isMultithreadingAvailable(),
        willUse: shouldEnableFFmpegMultithreading() && isMultithreadingAvailable(),
        mode: workerManager.getMultithreadingStatus().mode
      }
    });
    
    return {
      browser: capabilities,
      ffmpeg: {
        loaded: manager.isFFmpegLoaded(),
        multithreadingEnabled: manager.isMultithreadingEnabled(),
        optimalThreads: manager.getOptimalThreadCount()
      },
      worker: workerManager.getMultithreadingStatus(),
      multithreading: {
        shouldEnable: shouldEnableFFmpegMultithreading(),
        isAvailable: isMultithreadingAvailable(),
        willUse: shouldEnableFFmpegMultithreading() && isMultithreadingAvailable()
      }
    };
  };
  
  console.log('🔧 Debug function available: checkMultithreadingStatus()');
}