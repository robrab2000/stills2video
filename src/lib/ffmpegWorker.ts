/**
 * FFmpeg Web Worker
 * Handles FFmpeg operations in a separate thread for better performance
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface FFmpegWorkerMessage {
  type: 'init' | 'generateVideo' | 'createThumbnail' | 'cleanup';
  id: string;
  data?: any;
}

export interface FFmpegWorkerResponse {
  type: 'success' | 'error' | 'progress';
  id: string;
  data?: any;
  error?: string;
  progress?: number;
  stage?: string;
}

export interface VideoGenerationRequest {
  imageFiles: File[];
  settings: {
    fps: number;
    width: number;
    height: number;
    codec: string;
  };
}

class FFmpegWorker {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;

  constructor() {
    this.setupMessageHandler();
  }

  private setupMessageHandler() {
    self.onmessage = async (event: MessageEvent<FFmpegWorkerMessage>) => {
      const { type, id, data } = event.data;

      try {
        switch (type) {
          case 'init':
            await this.handleInit(id);
            break;
          case 'generateVideo':
            await this.handleGenerateVideo(id, data as VideoGenerationRequest);
            break;
          case 'createThumbnail':
            await this.handleCreateThumbnail(id, data as { videoBlob: Blob });
            break;
          case 'cleanup':
            await this.handleCleanup(id);
            break;
          default:
            this.sendError(id, `Unknown message type: ${type}`);
        }
      } catch (error) {
        this.sendError(id, error instanceof Error ? error.message : 'Unknown error');
      }
    };
  }

  private async handleInit(id: string) {
    try {
      await this.loadFFmpeg();
      this.sendSuccess(id, { message: 'FFmpeg initialized successfully' });
    } catch (error) {
      this.sendError(id, `FFmpeg initialization failed: ${error}`);
    }
  }

  private async handleGenerateVideo(id: string, request: VideoGenerationRequest) {
    try {
      const { imageFiles, settings } = request;
      
      if (!this.ffmpeg || !this.isLoaded) {
        await this.loadFFmpeg();
      }

      if (!this.ffmpeg) {
        throw new Error('FFmpeg not loaded');
      }

      // Stage 1: Initialization (0-10%)
      this.sendProgress(id, 5, 'Initializing FFmpeg...');
      
      // Stage 2: Processing images (10-30%)
      this.sendProgress(id, 10, 'Processing images...');
      
      // Write image files to FFmpeg
      for (let i = 0; i < imageFiles.length; i++) {
        const imageData = await fetchFile(imageFiles[i]);
        await this.ffmpeg.writeFile(`image_${i.toString().padStart(4, '0')}.jpg`, imageData);
        
        // Update progress for image processing
        const imageProgress = 10 + (i / imageFiles.length) * 20;
        this.sendProgress(id, imageProgress, `Processing image ${i + 1}/${imageFiles.length}...`);
      }

      // Create input file list
      const inputList = imageFiles.map((_, i) => 
        `file 'image_${i.toString().padStart(4, '0')}.jpg'`
      ).join('\n');
      await this.ffmpeg.writeFile('input.txt', inputList);

      // Stage 3: Encoding preparation (30-40%)
      this.sendProgress(id, 30, 'Preparing video encoding...');

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

      // Add multithreading optimization flags
      const optimizedCommand = this.addMultithreadingFlags(baseCommand);

      console.log('FFmpeg command:', optimizedCommand.join(' '));

      // Stage 4: Video encoding (40-90%)
      this.sendProgress(id, 40, 'Encoding video...');
      
      // Execute FFmpeg command
      await this.ffmpeg.exec(optimizedCommand);
      
      // Simulate encoding progress (since FFmpeg doesn't provide real-time progress)
      for (let i = 40; i <= 90; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.sendProgress(id, i, 'Encoding video...');
      }

      // Stage 5: Finalizing (90-100%)
      this.sendProgress(id, 90, 'Finalizing video...');
      
      // Read the output file
      const data = await this.ffmpeg.readFile(`output.${outputFormat}`);
      
      // Clean up files
      await this.cleanupFiles(imageFiles.length, outputFormat);

      this.sendProgress(id, 100, 'Video generation complete!');
      
      // Send the video data
      this.sendSuccess(id, { 
        videoBlob: new Blob([data], { type: `video/${outputFormat}` }),
        format: outputFormat
      });
    } catch (error) {
      this.sendError(id, `Video generation failed: ${error}`);
    }
  }

  private async handleCreateThumbnail(id: string, request: { videoBlob: Blob }) {
    try {
      const { videoBlob } = request;
      
      if (!this.ffmpeg || !this.isLoaded) {
        await this.loadFFmpeg();
      }

      if (!this.ffmpeg) {
        throw new Error('FFmpeg not loaded');
      }

      const videoData = await fetchFile(videoBlob);
      await this.ffmpeg.writeFile('input_video.mp4', videoData);

      // Extract first frame
      await this.ffmpeg.exec([
        '-i', 'input_video.mp4',
        '-vframes', '1',
        '-f', 'image2',
        '-y',
        'thumbnail.jpg'
      ]);

      const thumbnailData = await this.ffmpeg.readFile('thumbnail.jpg');
      
      // Clean up
      try {
        await this.ffmpeg.deleteFile('input_video.mp4');
        await this.ffmpeg.deleteFile('thumbnail.jpg');
      } catch (e) {
        // Ignore cleanup errors
      }

      const thumbnailBlob = new Blob([thumbnailData], { type: 'image/jpeg' });
      this.sendSuccess(id, { thumbnailBlob });
    } catch (error) {
      this.sendError(id, `Thumbnail creation failed: ${error}`);
    }
  }

  private async handleCleanup(id: string) {
    try {
      if (this.ffmpeg) {
        // Clean up any remaining files
        await this.cleanupAllFiles();
      }
      this.sendSuccess(id, { message: 'Cleanup completed' });
    } catch (error) {
      this.sendError(id, `Cleanup failed: ${error}`);
    }
  }

  private async loadFFmpeg(): Promise<void> {
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
      console.log('FFmpeg loaded successfully in worker');
    } catch (error) {
      console.error('FFmpeg loading failed in worker:', error);
      this.ffmpeg = null;
      this.isLoaded = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private addMultithreadingFlags(command: string[]): string[] {
    // Get hardware concurrency for optimal thread count
    const hardwareConcurrency = navigator.hardwareConcurrency || 1;
    const optimalThreads = Math.min(hardwareConcurrency, 8);
    
    // Insert thread count flag before the output file
    const outputIndex = command.findIndex(arg => arg.endsWith('.mp4') || arg.endsWith('.webm'));
    
    if (outputIndex === -1) {
      return [...command, '-threads', optimalThreads.toString()];
    }
    
    return [
      ...command.slice(0, outputIndex),
      '-threads', optimalThreads.toString(),
      ...command.slice(outputIndex)
    ];
  }

  private async cleanupFiles(imageCount: number, outputFormat: string) {
    if (!this.ffmpeg) return;

    // Clean up image files
    for (let i = 0; i < imageCount; i++) {
      try {
        await this.ffmpeg.deleteFile(`image_${i.toString().padStart(4, '0')}.jpg`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Clean up other files
    try {
      await this.ffmpeg.deleteFile('input.txt');
      await this.ffmpeg.deleteFile(`output.${outputFormat}`);
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  private async cleanupAllFiles() {
    if (!this.ffmpeg) return;

    try {
      // List all files and clean them up
      const files = await this.ffmpeg.listDir('/');
      for (const file of files) {
        // Check if it's a file (not a directory)
        if (file && typeof file === 'object' && 'name' in file) {
          try {
            await this.ffmpeg.deleteFile(file.name);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  private sendSuccess(id: string, data: any) {
    const response: FFmpegWorkerResponse = {
      type: 'success',
      id,
      data
    };
    self.postMessage(response);
  }

  private sendError(id: string, error: string) {
    const response: FFmpegWorkerResponse = {
      type: 'error',
      id,
      error
    };
    self.postMessage(response);
  }

  private sendProgress(id: string, progress: number, stage: string) {
    const response: FFmpegWorkerResponse = {
      type: 'progress',
      id,
      progress,
      stage
    };
    self.postMessage(response);
  }
}

// Initialize the worker
new FFmpegWorker();