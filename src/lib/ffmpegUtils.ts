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

    try {
      // Stage 1: Initialization (0-10%)
      onProgress?.(5, 'Initializing FFmpeg...');
      
      // Stage 2: Processing images (10-30%)
      onProgress?.(10, 'Processing images...');
      
      // Write image files to FFmpeg
      for (let i = 0; i < imageFiles.length; i++) {
        const imageData = await fetchFile(imageFiles[i]);
        await this.ffmpeg.writeFile(`image_${i.toString().padStart(4, '0')}.jpg`, imageData);
        
        // Update progress for image processing
        const imageProgress = 10 + (i / imageFiles.length) * 20;
        onProgress?.(imageProgress, `Processing image ${i + 1}/${imageFiles.length}...`);
      }

      // Create input file list
      const inputList = imageFiles.map((_, i) => 
        `file 'image_${i.toString().padStart(4, '0')}.jpg'`
      ).join('\n');
      await this.ffmpeg.writeFile('input.txt', inputList);

      // Stage 3: Encoding preparation (30-40%)
      onProgress?.(30, 'Preparing video encoding...');

      // Determine output format and codec
      const isH264 = settings.codec.includes('h264') || settings.codec.includes('avc');
      const outputFormat = isH264 ? 'mp4' : 'webm';
      const codec = isH264 ? 'libx264' : (settings.codec.includes('vp9') ? 'libvpx-vp9' : 'libvpx');

      // Build base FFmpeg command
      const baseCommand = [
        '-f', 'concat',
        '-safe', '0',
        '-i', 'input.txt',
        '-c:v', codec,
        '-pix_fmt', 'yuv420p',
        '-r', settings.fps.toString(),
        '-s', `${settings.width}x${settings.height}`,
        '-y', // Overwrite output
        `output.${outputFormat}`
      ];

      // Apply multithreading optimizations
      const optimizedCommand = this.getMultithreadingEnabled() 
        ? createOptimizedFFmpegCommand(baseCommand)
        : baseCommand;

      console.log('FFmpeg command:', optimizedCommand.join(' '));
      console.log(`Using ${this.getMultithreadingEnabled() ? 'multithreaded' : 'single-threaded'} processing`);

      // Stage 4: Video encoding (40-90%)
      onProgress?.(40, 'Encoding video...');
      
      // Execute FFmpeg command
      await this.ffmpeg.exec(optimizedCommand);
      
      // Simulate encoding progress (since FFmpeg doesn't provide real-time progress)
      for (let i = 40; i <= 90; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        onProgress?.(i, 'Encoding video...');
      }

      // Stage 5: Finalizing (90-100%)
      onProgress?.(90, 'Finalizing video...');
      
      // Read the output file
      const data = await this.ffmpeg.readFile(`output.${outputFormat}`);
      
      // Clean up files
      for (let i = 0; i < imageFiles.length; i++) {
        try {
          await this.ffmpeg.deleteFile(`image_${i.toString().padStart(4, '0')}.jpg`);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      try {
        await this.ffmpeg.deleteFile('input.txt');
        await this.ffmpeg.deleteFile(`output.${outputFormat}`);
      } catch (e) {
        // Ignore cleanup errors
      }

      onProgress?.(100, 'Video generation complete!');
      return new Blob([data], { type: `video/${outputFormat}` });
    } catch (error) {
      console.error('FFmpeg error:', error);
      throw new Error(`FFmpeg processing failed: ${error}`);
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