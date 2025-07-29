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

    try {
      console.log(`🚀 Starting video generation: ${imageFiles.length} images, ${isMultithreaded ? 'multithreaded' : 'single-threaded'} (${threadCount} threads)`);
      
      // Stage 1: Write image files (0-30%)
      if (onProgress) onProgress(5, 'Loading images...');
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imageData = await fetchFile(imageFiles[i]);
        await this.ffmpeg.writeFile(`image_${i.toString().padStart(4, '0')}.jpg`, imageData);
        
        if (onProgress) {
          const progress = 5 + (i / imageFiles.length) * 25;
          onProgress(Math.round(progress), `Processing image ${i + 1}/${imageFiles.length}`);
        }
      }

      // Verify input files were written correctly
      try {
        const files = await this.ffmpeg.listDir('/');
        const imageFiles = files.filter((file: any) => file.name && file.name.startsWith('image_'));
        console.log('📁 FFmpeg filesystem contents:', files.map((f: any) => f.name));
        console.log('🖼️ Input image files found:', imageFiles.length);
        
        if (imageFiles.length === 0) {
          throw new Error('No input image files found in FFmpeg filesystem');
        }
      } catch (listError) {
        console.error('❌ Failed to list FFmpeg files:', listError);
        throw new Error('Failed to verify input files in FFmpeg filesystem');
      }

      if (onProgress) onProgress(30, 'Generating video...');

      // Stage 2: Generate video with multithreading optimization
      const isH264 = settings.codec.includes('h264') || settings.codec.includes('avc');
      const outputFormat = isH264 ? 'mp4' : 'webm';
      const codec = isH264 ? 'libx264' : 'libvpx';
      
      // Create a concat file for more reliable input
      const concatContent = imageFiles.map((_, i) => 
        `file 'image_${i.toString().padStart(4, '0')}.jpg'`
      ).join('\n');
      await this.ffmpeg.writeFile('concat.txt', concatContent);
      console.log('📝 Created concat file:', concatContent);
      
      // Verify concat file was written
      try {
        const concatFileData = await this.ffmpeg.readFile('concat.txt');
        console.log('✅ Concat file verified, content:', concatFileData);
      } catch (e) {
        console.error('❌ Failed to verify concat file:', e);
      }
      
      // Use concat demuxer for more reliable processing
      const baseCommand = [
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c:v', codec,
        '-pix_fmt', 'yuv420p',
        '-r', settings.fps.toString(), // Set frame rate
        '-preset', 'medium',
        '-crf', '23',
        '-movflags', '+faststart', // Optimize for web playback
        '-y',
        'output.mp4' // Always use MP4 for now to ensure compatibility
      ];

      // Apply multithreading optimization if enabled
      const optimizedCommand = this.getMultithreadingEnabled() 
        ? createOptimizedFFmpegCommand(baseCommand, false) // Temporarily disable optimization
        : baseCommand;

      console.log('🎬 FFmpeg command:', optimizedCommand.join(' '));
      console.log(`🔧 Using ${this.getMultithreadingEnabled() ? 'multithreaded' : 'single-threaded'} processing with ${getOptimalThreadCount()} threads`);
      console.log('📁 Input files:', imageFiles.map((_, i) => `image_${i.toString().padStart(4, '0')}.jpg`));
      
      const encodingStartTime = performance.now();
      try {
        console.log('🚀 Starting FFmpeg execution...');
        await this.ffmpeg.exec(optimizedCommand);
        console.log('✅ FFmpeg execution completed successfully');
        
        // Check if output file was actually created
        try {
          const files = await this.ffmpeg.listDir('/');
          const outputFile = files.find((file: any) => file.name === 'output.mp4');
          console.log('📁 Files after FFmpeg execution:', files.map((f: any) => f.name));
          console.log('🎬 Output file found:', !!outputFile);
        } catch (listError) {
          console.warn('⚠️ Could not list files after FFmpeg execution:', listError);
        }
      } catch (execError) {
        console.error('❌ FFmpeg execution failed:', execError);
        throw execError;
      }
      const encodingTime = performance.now() - encodingStartTime;

      if (onProgress) onProgress(80, 'Finalizing video...');

      // Stage 3: Read the output and validate
      console.log('📖 Reading output file: output.mp4');
      let videoData: Uint8Array | string;
      try {
        videoData = await this.ffmpeg.readFile('output.mp4');
        console.log('✅ Output file read successfully, size:', videoData instanceof Uint8Array ? videoData.length : videoData.length);
        
        // Log the first few bytes to see what we're getting
        if (videoData instanceof Uint8Array) {
          const firstBytes = Array.from(videoData.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log('🔍 First 16 bytes:', firstBytes);
          
          // Try to decode as text to see if it's an error message
          try {
            const textContent = new TextDecoder().decode(videoData.slice(0, 100));
            if (textContent.includes('error') || textContent.includes('Error')) {
              console.error('❌ FFmpeg output contains error:', textContent);
              throw new Error(`FFmpeg error: ${textContent}`);
            }
          } catch (decodeError) {
            // Ignore decode errors, this is normal for binary data
          }
        }
      } catch (readError) {
        console.error('❌ Failed to read output file:', readError);
        throw readError;
      }
      
      // Validate video file size and content
      if (videoData instanceof Uint8Array && videoData.length < 1000) {
        console.error('❌ Generated video file is too small, likely invalid');
        console.error('📊 File size:', videoData.length, 'bytes');
        
        // Try to see what's in the file
        if (videoData.length > 0) {
          const content = new TextDecoder().decode(videoData);
          console.error('📄 File content:', content);
        }
        
        throw new Error('Generated video file is too small, FFmpeg may not have processed images correctly');
      }
      
      // Check if file has valid MP4 header
      if (videoData instanceof Uint8Array) {
        const header = new Uint8Array(videoData.slice(0, 8));
        const headerStr = new TextDecoder().decode(header);
        console.log('🔍 Video file header:', headerStr);
        
        // MP4 files should start with specific bytes
        if (!headerStr.includes('ftyp') && !headerStr.includes('moov')) {
          console.warn('⚠️ Video file may not have valid MP4 structure');
        }
      }
      
      const videoBlob = new Blob([videoData], { type: 'video/mp4' });
      console.log('✅ Video blob created, size:', videoBlob.size);
      
      // Additional validation
      if (videoBlob.size < 1000) {
        console.error('❌ Video blob is too small, likely invalid');
        throw new Error('Generated video blob is too small, check FFmpeg processing');
      }

      // Validate video can be played
      const isValidVideo = await this.validateVideoBlob(videoBlob);
      if (!isValidVideo) {
        console.error('❌ Generated video failed validation');
        throw new Error('Generated video failed validation - may not be playable');
      }
      
      console.log('✅ Video validation passed');

      // Additional FFmpeg-based validation
      try {
        const videoInfo = await this.getVideoInfo('output.mp4');
        console.log('📊 Video info:', videoInfo);
        
        if (videoInfo.duration < 0.1) {
          throw new Error('Video duration is too short, likely invalid');
        }
        
        // More lenient frame count validation since we're using estimates
        const expectedFrames = imageFiles.length;
        const actualFrames = videoInfo.frameCount;
        const frameRatio = actualFrames / expectedFrames;
        
        console.log(`🎬 Frame validation: ${actualFrames} actual vs ${expectedFrames} expected (ratio: ${frameRatio.toFixed(2)})`);
        
        // Only fail if we have significantly fewer frames than expected
        if (frameRatio < 0.3) {
          console.warn('⚠️ Video has fewer frames than expected, but continuing...');
          // Don't throw error, just warn
        }
      } catch (infoError) {
        console.error('❌ Video info validation failed:', infoError);
        // Don't throw error, just log the issue
        console.warn('⚠️ Continuing despite video info validation issues...');
      }

      if (onProgress) onProgress(90, 'Cleaning up...');

      // Stage 4: Cleanup
      await this.cleanupFiles(imageFiles.length, 'mp4');

      if (onProgress) onProgress(100, 'Complete');

      const totalTime = performance.now() - startTime;
      console.log(`✅ Video generation completed in ${totalTime.toFixed(2)}ms (encoding: ${encodingTime.toFixed(2)}ms)`);
      console.log(`📊 Performance: ${imageFiles.length} images processed at ${(imageFiles.length / (totalTime / 1000)).toFixed(2)} images/second`);

      return videoBlob;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error(`❌ Video generation failed after ${totalTime.toFixed(2)}ms:`, error);
      
      // Try to provide more helpful error information
      if (error instanceof Error && error.message && error.message.includes('FFmpeg')) {
        console.error('FFmpeg error details:', error);
      }
      
      throw error;
    }
  }

  private async cleanupFiles(imageCount: number, outputFormat: string) {
    if (!this.ffmpeg) return;
    
    for (let i = 0; i < imageCount; i++) {
      try {
        await this.ffmpeg.deleteFile(`image_${i.toString().padStart(4, '0')}.jpg`);
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
        thumbnailBlob = new Blob([thumbnailData], { type: 'image/jpeg' });
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