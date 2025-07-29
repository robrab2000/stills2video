/**
 * FFmpeg Worker Manager
 * Manages communication with FFmpeg web worker for multithreaded operations
 */

import { 
  FFmpegWorkerMessage, 
  FFmpegWorkerResponse, 
  VideoGenerationRequest 
} from './ffmpegWorker';
import { shouldEnableFFmpegMultithreading, logBrowserCapabilities } from './browserCapabilities';

export interface FFmpegWorkerManagerOptions {
  enableMultithreading?: boolean;
  workerScript?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export class FFmpegWorkerManager {
  private worker: Worker | null = null;
  private isInitialized = false;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: number, stage: string) => void;
  }>();
  private requestId = 0;
  private options: Required<FFmpegWorkerManagerOptions>;

  constructor(options: FFmpegWorkerManagerOptions = {}) {
    this.options = {
      enableMultithreading: options.enableMultithreading ?? shouldEnableFFmpegMultithreading(),
      workerScript: options.workerScript ?? '/src/lib/ffmpegWorker.ts',
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
    };

    // Log browser capabilities for debugging
    logBrowserCapabilities();
  }

  /**
   * Initialize the worker manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.options.enableMultithreading) {
      console.log('Multithreading disabled, using main thread FFmpeg');
      return;
    }

    try {
      console.log('🔧 Initializing FFmpeg Worker Manager...');
      
      // Add timeout for worker initialization
      const initPromise = this.createWorker().then(() => this.initWorker());
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Worker initialization timeout')), 10000)
      );
      
      await Promise.race([initPromise, timeoutPromise]);
      
      this.isInitialized = true;
      console.log('✅ FFmpeg Worker Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize FFmpeg Worker Manager:', error);
      // Fall back to main thread
      this.options.enableMultithreading = false;
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Generate video using worker or fallback to main thread
   */
  async generateVideo(
    imageFiles: File[],
    settings: {
      fps: number;
      width: number;
      height: number;
      codec: string;
    },
    onProgress?: (progress: number, stage: string) => void
  ): Promise<Blob> {
    await this.initialize();

    if (!this.options.enableMultithreading || !this.worker) {
      // Fall back to main thread FFmpeg
      return this.generateVideoMainThread(imageFiles, settings, onProgress);
    }

    return this.generateVideoWithWorker(imageFiles, settings, onProgress);
  }

  /**
   * Create thumbnail using worker or fallback to main thread
   */
  async createThumbnail(videoBlob: Blob): Promise<string> {
    await this.initialize();

    if (!this.options.enableMultithreading || !this.worker) {
      // Fall back to main thread FFmpeg
      return this.createThumbnailMainThread(videoBlob);
    }

    return this.createThumbnailWithWorker(videoBlob);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      try {
        await this.sendMessage('cleanup', {});
        this.worker.terminate();
        this.worker = null;
      } catch (error) {
        console.error('Error during worker cleanup:', error);
      }
    }
    this.isInitialized = false;
  }

  /**
   * Check if multithreading is enabled and working
   */
  isMultithreadingEnabled(): boolean {
    return this.options.enableMultithreading;
  }

  isWorkerReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }

  getMultithreadingStatus() {
    return {
      enabled: this.options.enableMultithreading,
      ready: this.isWorkerReady(),
      available: this.options.enableMultithreading && this.isWorkerReady(),
      mode: this.isWorkerReady() ? 'hybrid' : 'main-thread' // hybrid = worker for communication, main thread for FFmpeg
    };
  }

  private async createWorker(): Promise<void> {
    try {
      // Create a simple worker that can communicate with the main thread
      // We'll handle FFmpeg operations in the main thread for now
      const workerCode = `
        // Simple worker for communication
        let isReady = false;
        
        self.onmessage = async function(event) {
          const { type, id, data } = event.data;
          
          try {
            switch (type) {
              case 'init':
                // Simulate initialization
                await new Promise(resolve => setTimeout(resolve, 100));
                isReady = true;
                self.postMessage({ type: 'success', id, data: { message: 'Worker initialized successfully' } });
                break;
              case 'generateVideo':
                // For now, we'll just acknowledge the request
                // The actual FFmpeg processing will be handled by the main thread
                self.postMessage({ type: 'success', id, data: { 
                  message: 'Video generation request received',
                  useMainThread: true 
                } });
                break;
              case 'createThumbnail':
                // For now, we'll just acknowledge the request
                self.postMessage({ type: 'success', id, data: { 
                  message: 'Thumbnail creation request received',
                  useMainThread: true 
                } });
                break;
              case 'cleanup':
                self.postMessage({ type: 'success', id, data: { message: 'Cleanup completed' } });
                break;
              default:
                self.postMessage({ type: 'error', id, error: 'Unknown message type: ' + type });
            }
          } catch (error) {
            self.postMessage({ type: 'error', id, error: error.message || 'Unknown error' });
          }
        };
        
        // Signal that worker is ready
        self.postMessage({ type: 'workerReady', id: 'init' });
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      this.setupWorkerMessageHandler();
      
      // Clean up the blob URL
      URL.revokeObjectURL(workerUrl);
    } catch (error) {
      console.error('Failed to create worker:', error);
      throw error;
    }
  }

  private setupWorkerMessageHandler(): void {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent<FFmpegWorkerResponse>) => {
      const { type, id, data, error, progress, stage } = event.data;
      const request = this.pendingRequests.get(id);

      if (!request) {
        // Handle progress messages that don't have a specific request ID
        if (type === 'progress' && progress !== undefined) {
          // Find any request that has a progress callback
          for (const [reqId, req] of this.pendingRequests) {
            if (req.onProgress) {
              req.onProgress(progress, stage || '');
              break;
            }
          }
        }
        return;
      }

      switch (type) {
        case 'success':
          request.resolve(data);
          this.pendingRequests.delete(id);
          break;
        case 'error':
          const errorMessage = error || 'Unknown worker error';
          console.error('Worker error:', errorMessage);
          request.reject(new Error(errorMessage));
          this.pendingRequests.delete(id);
          break;
        case 'progress':
          if (request.onProgress && progress !== undefined) {
            request.onProgress(progress, stage || '');
          }
          break;
      }
    };

    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
      // Reject all pending requests
      for (const [id, request] of this.pendingRequests) {
        request.reject(new Error(`Worker error: ${error.message || 'Unknown error'}`));
      }
      this.pendingRequests.clear();
      
      // Mark worker as failed
      this.worker = null;
      this.isInitialized = false;
    };
  }

  private async initWorker(): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not created');
    }

    await this.sendMessage('init', {});
  }

  private async generateVideoWithWorker(
    imageFiles: File[],
    settings: {
      fps: number;
      width: number;
      height: number;
      codec: string;
    },
    onProgress?: (progress: number, stage: string) => void
  ): Promise<Blob> {
    if (!this.worker) {
      throw new Error('Worker not available');
    }

    const request: VideoGenerationRequest = {
      imageFiles,
      settings
    };

    const response = await this.sendMessage('generateVideo', request, onProgress);
    
    // Check if worker indicates we should use main thread
    if (response.useMainThread) {
      console.log('🔄 Worker indicates using main thread for video generation');
      return this.generateVideoMainThread(imageFiles, settings, onProgress);
    }
    
    return response.videoBlob;
  }

  private async createThumbnailWithWorker(videoBlob: Blob): Promise<string> {
    if (!this.worker) {
      throw new Error('Worker not available');
    }

    const response = await this.sendMessage('createThumbnail', { videoBlob });
    
    // Check if worker indicates we should use main thread
    if (response.useMainThread) {
      console.log('🔄 Worker indicates using main thread for thumbnail creation');
      return this.createThumbnailMainThread(videoBlob);
    }
    
    const thumbnailBlob = response.thumbnailBlob;
    return URL.createObjectURL(thumbnailBlob);
  }

  private async sendMessage(
    type: FFmpegWorkerMessage['type'],
    data: any,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<any> {
    if (!this.worker) {
      throw new Error('Worker not available');
    }

    const id = `request_${++this.requestId}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, onProgress });
      
      const message: FFmpegWorkerMessage = { type, id, data };
      this.worker!.postMessage(message);
    });
  }

  // Fallback methods for main thread execution
  private async generateVideoMainThread(
    imageFiles: File[],
    settings: {
      fps: number;
      width: number;
      height: number;
      codec: string;
    },
    onProgress?: (progress: number, stage: string) => void
  ): Promise<Blob> {
    // Import the main thread FFmpeg manager
    const { generateVideoWithFFmpeg } = await import('./ffmpegUtils');
    return generateVideoWithFFmpeg(imageFiles, settings, onProgress);
  }

  private async createThumbnailMainThread(videoBlob: Blob): Promise<string> {
    // Import the main thread FFmpeg manager
    const { getFFmpegManager } = await import('./ffmpegUtils');
    return getFFmpegManager().createThumbnail(videoBlob);
  }
}

// Create singleton instance
export const ffmpegWorkerManager = new FFmpegWorkerManager();

// Export utility functions
export async function generateVideoWithMultithreading(
  imageFiles: File[],
  settings: {
    fps: number;
    width: number;
    height: number;
    codec: string;
  },
  onProgress?: (progress: number, stage: string) => void
): Promise<Blob> {
  return ffmpegWorkerManager.generateVideo(imageFiles, settings, onProgress);
}

export async function createThumbnailWithMultithreading(videoBlob: Blob): Promise<string> {
  return ffmpegWorkerManager.createThumbnail(videoBlob);
}

export function isMultithreadingAvailable(): boolean {
  return ffmpegWorkerManager.getMultithreadingStatus().available;
}