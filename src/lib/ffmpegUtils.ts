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

      if (onProgress) onProgress(30, 'Generating video...');

      // Stage 2: Generate video with multithreading optimization
      const isH264 = settings.codec.includes('h264') || settings.codec.includes('avc');
      const isVP9 = settings.codec.includes('vp9');
      const outputFormat = isH264 ? 'mp4' : 'webm';
      const codec = isH264 ? 'libx264' : (isVP9 ? 'libvpx-vp9' : 'libvpx');
      
      const baseCommand = [
        '-framerate', settings.fps.toString(),
        '-i', 'image_%04d.jpg',
        '-c:v', codec,
        '-pix_fmt', 'yuv420p',
        '-s', `${settings.width}x${settings.height}`,
        '-preset', 'medium',
        '-crf', '23',
        '-y',
        `output.${outputFormat}`
      ];

      // Apply multithreading optimization if enabled
      const optimizedCommand = this.getMultithreadingEnabled() 
        ? createOptimizedFFmpegCommand(baseCommand)
        : baseCommand;

      console.log('🎬 FFmpeg command:', optimizedCommand.join(' '));
      console.log(`🔧 Using ${this.getMultithreadingEnabled() ? 'multithreaded' : 'single-threaded'} processing with ${getOptimalThreadCount()} threads`);
      
      const encodingStartTime = performance.now();
      await this.ffmpeg.exec(optimizedCommand);
      const encodingTime = performance.now() - encodingStartTime;

      if (onProgress) onProgress(80, 'Finalizing video...');

      // Stage 3: Read the output
      const videoData = await this.ffmpeg.readFile(`output.${outputFormat}`);
      const videoBlob = new Blob([videoData], { type: `video/${outputFormat}` });

      if (onProgress) onProgress(90, 'Cleaning up...');

      // Stage 4: Cleanup
      await this.cleanupFiles(imageFiles.length, outputFormat);

      if (onProgress) onProgress(100, 'Complete');

      const totalTime = performance.now() - startTime;
      console.log(`✅ Video generation completed in ${totalTime.toFixed(2)}ms (encoding: ${encodingTime.toFixed(2)}ms)`);
      console.log(`📊 Performance: ${imageFiles.length} images processed at ${(imageFiles.length / (totalTime / 1000)).toFixed(2)} images/second`);

      return videoBlob;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error(`❌ Video generation failed after ${totalTime.toFixed(2)}ms:`, error);
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
        return '';
      }
    }

    if (!this.ffmpeg) {
      return '';
    }

    try {
      const videoData = await fetchFile(videoBlob);
      await this.ffmpeg.writeFile('input_video.mp4', videoData);

      // Extract first frame with optimization flags
      const baseCommand = [
        '-i', 'input_video.mp4',
        '-vframes', '1',
        '-f', 'image2',
        '-y',
        'thumbnail.jpg'
      ];

      const optimizedCommand = this.getMultithreadingEnabled() 
        ? createOptimizedFFmpegCommand(baseCommand)
        : baseCommand;

      console.log('🖼️ Thumbnail FFmpeg command:', optimizedCommand.join(' '));
      await this.ffmpeg.exec(optimizedCommand);

      const thumbnailData = await this.ffmpeg.readFile('thumbnail.jpg');
      
      // Clean up
      try {
        await this.ffmpeg.deleteFile('input_video.mp4');
        await this.ffmpeg.deleteFile('thumbnail.jpg');
      } catch (e) {
        // Ignore cleanup errors
        console.warn('Thumbnail cleanup failed:', e);
      }

      const thumbnailBlob = new Blob([thumbnailData], { type: 'image/jpeg' });
      return URL.createObjectURL(thumbnailBlob);
    } catch (error) {
      console.error('Thumbnail creation error:', error);
      
      // Try fallback thumbnail creation
      try {
        return await this.createFallbackThumbnail(videoBlob);
      } catch (fallbackError) {
        console.error('Fallback thumbnail creation also failed:', fallbackError);
        return '';
      }
    }
  }

  private async createFallbackThumbnail(videoBlob: Blob): Promise<string> {
    // Create a simple fallback thumbnail using video element
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Thumbnail creation timeout'));
      }, 10000); // 10 second timeout

      video.onloadeddata = () => {
        try {
          clearTimeout(timeout);
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = 320;
          canvas.height = 180;
          
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnailUrl);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };
      
      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load video for thumbnail'));
      };
      
      // Set video source
      video.src = URL.createObjectURL(videoBlob);
      video.load();
    });
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