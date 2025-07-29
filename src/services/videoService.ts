import { ImageFile, VideoSettings, VideoPreview } from '../types';
import { validateVideoGeneration } from '../lib/validation';
import { generateId } from '../lib/uiUtils';
import { 
  getFFmpegManager, 
  generateVideoWithFFmpeg,
  shouldEnableFFmpegMultithreading,
  isMultithreadingAvailable 
} from '../lib/ffmpegUtils';
import { 
  ffmpegWorkerManager,
  generateVideoWithMultithreading,
  createThumbnailWithMultithreading 
} from '../lib/ffmpegWorkerManager';

export class VideoService {
  static async generateVideo(
    images: ImageFile[],
    settings: VideoSettings,
    selectedCodec: string,
    videoCodecs: any[],
    onProgress?: (progress: number) => void
  ): Promise<VideoPreview> {
    // Validate inputs using the new validation utility
    const validation = validateVideoGeneration(images, settings, selectedCodec);
    if (!validation.isValid) {
      throw new Error(`Video generation validation failed: ${validation.errors.join(', ')}`);
    }

    if (images.length === 0) {
      throw new Error("No images provided");
    }

    // Check if multithreading is available and enabled
    const useMultithreading = shouldEnableFFmpegMultithreading() && isMultithreadingAvailable();
    
    console.log('🎬 Video generation started:', {
      imageCount: images.length,
      settings: {
        fps: settings.fps,
        width: settings.videoWidth,
        height: settings.videoHeight,
        codec: selectedCodec
      },
      multithreading: {
        enabled: shouldEnableFFmpegMultithreading(),
        available: isMultithreadingAvailable(),
        willUse: useMultithreading
      }
    });
    
    if (useMultithreading) {
      try {
        // Use multithreaded FFmpeg processing
        console.log("🚀 Using multithreaded FFmpeg processing");
        
        // Extract File objects from ImageFile array
        const imageFiles = images.map(img => img.file);
        
        // Generate video using multithreaded FFmpeg with progress callback
        const videoBlob = await generateVideoWithMultithreading(imageFiles, {
          fps: settings.fps,
          width: settings.videoWidth,
          height: settings.videoHeight,
          codec: selectedCodec
        }, (progress, stage) => {
          console.log(`🚀 Multithreaded FFmpeg progress: ${progress}% - ${stage}`);
          onProgress?.(progress);
        });

        console.log("✅ Multithreaded video generation completed successfully");

        // Create video preview object
        const url = URL.createObjectURL(videoBlob);
        const selectedCodecInfo = videoCodecs.find((codec: any) => codec.mimeType === selectedCodec);
        const extension = selectedCodecInfo?.extension || (selectedCodec.includes("mp4") ? "mp4" : "webm");
        const videoId = generateId();
        const timestamp = Date.now();
        const videoName = `video_${timestamp}_${videoId}.${extension}`;
        
        // Create thumbnail using multithreaded FFmpeg
        console.log("🖼️ Creating thumbnail with multithreaded FFmpeg...");
        const thumbnailUrl = await createThumbnailWithMultithreading(videoBlob);
        console.log("✅ Thumbnail created successfully");
        
        return {
          id: videoId,
          name: videoName,
          url,
          thumbnailUrl,
          blob: videoBlob,
          extension,
          size: videoBlob.size,
          duration: images.length / settings.fps,
          format: extension,
          codec: selectedCodec,
          timestamp,
          settings: {
            fps: settings.fps,
            videoWidth: settings.videoWidth,
            videoHeight: settings.videoHeight,
            selectedCodec: selectedCodec
          }
        };
      } catch (error) {
        console.error('❌ Multithreaded FFmpeg failed, falling back to main thread:', error);
        // Fall back to main thread processing
        return this.generateVideoWithMainThread(images, settings, selectedCodec, videoCodecs, onProgress);
      }
    } else {
      // Use main thread FFmpeg processing
      console.log("🔄 Using main thread FFmpeg processing");
      return this.generateVideoWithMainThread(images, settings, selectedCodec, videoCodecs, onProgress);
    }
  }

  private static async generateVideoWithMainThread(
    images: ImageFile[],
    settings: VideoSettings,
    selectedCodec: string,
    videoCodecs: any[],
    onProgress?: (progress: number) => void
  ): Promise<VideoPreview> {
    // Check if FFmpeg is available and ready
    const ffmpegManager = getFFmpegManager();
    const ffmpegReady = await ffmpegManager.isReady();
    
    console.log('🔄 Main thread processing:', {
      ffmpegReady,
      multithreadingEnabled: ffmpegManager.isMultithreadingEnabled(),
      optimalThreads: ffmpegManager.getOptimalThreadCount()
    });
    
    if (ffmpegReady) {
      try {
        // Use FFmpeg.wasm for video generation
        console.log("🔄 Using main thread FFmpeg.wasm for video generation");
        
        // Extract File objects from ImageFile array
        const imageFiles = images.map(img => img.file);
        
        // Generate video using FFmpeg with progress callback
        const videoBlob = await generateVideoWithFFmpeg(imageFiles, {
          fps: settings.fps,
          width: settings.videoWidth,
          height: settings.videoHeight,
          codec: selectedCodec
        }, (progress, stage) => {
          console.log(`🔄 Main thread FFmpeg progress: ${progress}% - ${stage}`);
          onProgress?.(progress);
        });

        console.log("✅ Main thread video generation completed successfully");

        // Create video preview object
        const url = URL.createObjectURL(videoBlob);
        const selectedCodecInfo = videoCodecs.find((codec: any) => codec.mimeType === selectedCodec);
        const extension = selectedCodecInfo?.extension || (selectedCodec.includes("mp4") ? "mp4" : "webm");
        const videoId = generateId();
        const timestamp = Date.now();
        const videoName = `video_${timestamp}_${videoId}.${extension}`;
        
        // Create thumbnail using FFmpeg
        console.log("🖼️ Creating thumbnail with main thread FFmpeg...");
        const thumbnailUrl = await this.createThumbnail(videoBlob);
        console.log("✅ Thumbnail created successfully");
        
        return {
          id: videoId,
          name: videoName,
          url,
          thumbnailUrl,
          blob: videoBlob,
          extension,
          size: videoBlob.size,
          duration: images.length / settings.fps,
          format: extension,
          codec: selectedCodec,
          timestamp,
          settings: {
            fps: settings.fps,
            videoWidth: settings.videoWidth,
            videoHeight: settings.videoHeight,
            selectedCodec: selectedCodec
          }
        };
      } catch (error) {
        console.error('❌ FFmpeg processing failed, falling back to MediaRecorder:', error);
        // Fall back to MediaRecorder
        return this.generateVideoWithMediaRecorder(images, settings, selectedCodec, videoCodecs, onProgress);
      }
    } else {
      console.log('⚠️ FFmpeg not available, using MediaRecorder fallback');
      // Fall back to MediaRecorder
      return this.generateVideoWithMediaRecorder(images, settings, selectedCodec, videoCodecs, onProgress);
    }
  }

  private static async generateVideoWithMediaRecorder(
    images: ImageFile[],
    settings: VideoSettings,
    selectedCodec: string,
    videoCodecs: any[],
    onProgress?: (progress: number) => void
  ): Promise<VideoPreview> {
    return new Promise((resolve, reject) => {
      try {
        // Create canvas for video generation
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = settings.videoWidth;
        canvas.height = settings.videoHeight;

        // Find supported codec
        const supportedCodec = videoCodecs.find(codec => codec.supported);
        if (!supportedCodec) {
          reject(new Error('No supported video codec found'));
          return;
        }

        // Create MediaRecorder
        const stream = canvas.captureStream(settings.fps);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: supportedCodec.mimeType
        });

        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          try {
            const videoBlob = new Blob(chunks, { type: supportedCodec.mimeType });
            const url = URL.createObjectURL(videoBlob);
            const videoId = generateId();
            const timestamp = Date.now();
            const extension = supportedCodec.extension;
            const videoName = `video_${timestamp}_${videoId}.${extension}`;

            // Create thumbnail
            const thumbnailUrl = await this.createThumbnail(videoBlob);

            resolve({
              id: videoId,
              name: videoName,
              url,
              thumbnailUrl,
              blob: videoBlob,
              extension,
              size: videoBlob.size,
              duration: images.length / settings.fps,
              format: extension,
              codec: supportedCodec.mimeType,
              timestamp,
              settings: {
                fps: settings.fps,
                videoWidth: settings.videoWidth,
                videoHeight: settings.videoHeight,
                selectedCodec: selectedCodec
              }
            });
          } catch (error) {
            reject(error);
          }
        };

        mediaRecorder.onerror = (event) => {
          reject(new Error(`MediaRecorder error: ${event}`));
        };

        // Start recording
        mediaRecorder.start();

        // Draw images to canvas
        let currentImageIndex = 0;
        const frameInterval = 1000 / settings.fps;
        let lastFrameTime = 0;

        const drawNextFrame = (currentTime: number) => {
          if (currentImageIndex >= images.length) {
            mediaRecorder.stop();
            return;
          }

          if (currentTime - lastFrameTime >= frameInterval) {
            const image = images[currentImageIndex];
            
            // Load and draw image
            const img = new Image();
            img.onload = () => {
              // Clear canvas
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // Calculate scaling to fit image in canvas
              const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height
              );
              
              const scaledWidth = img.width * scale;
              const scaledHeight = img.height * scale;
              const x = (canvas.width - scaledWidth) / 2;
              const y = (canvas.height - scaledHeight) / 2;
              
              // Draw image
              ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
              
              currentImageIndex++;
              lastFrameTime = currentTime;
              
              // Update progress
              const progress = (currentImageIndex / images.length) * 100;
              onProgress?.(progress);
              
              // Schedule next frame
              requestAnimationFrame(drawNextFrame);
            };
            
            img.src = image.url;
          } else {
            // Schedule next frame
            requestAnimationFrame(drawNextFrame);
          }
        };

        // Start drawing frames
        requestAnimationFrame(drawNextFrame);
      } catch (error) {
        reject(error);
      }
    });
  }

  private static async createThumbnail(videoBlob: Blob): Promise<string> {
    console.log("🖼️ Starting thumbnail creation...");
    
    try {
      // Try FFmpeg first
      const ffmpegManager = getFFmpegManager();
      const ffmpegReady = await ffmpegManager.isReady();
      if (ffmpegReady) {
        console.log("🖼️ Using FFmpeg for thumbnail creation...");
        const thumbnailUrl = await ffmpegManager.createThumbnail(videoBlob);
        if (thumbnailUrl) {
          console.log("✅ FFmpeg thumbnail creation successful");
          return thumbnailUrl;
        }
      }
    } catch (error) {
      console.error('❌ FFmpeg thumbnail creation failed:', error);
    }

    // Fallback: create thumbnail from video element
    console.log("🖼️ Using fallback video element thumbnail creation...");
    try {
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
            console.log("✅ Fallback thumbnail creation successful");
            resolve(thumbnailUrl);
          } catch (error) {
            clearTimeout(timeout);
            console.error('❌ Fallback thumbnail creation failed:', error);
            reject(error);
          }
        };
        
        video.onerror = () => {
          clearTimeout(timeout);
          console.error('❌ Video loading failed for thumbnail');
          reject(new Error('Failed to load video for thumbnail'));
        };
        
        // Set video source
        video.src = URL.createObjectURL(videoBlob);
        video.load();
      });
    } catch (error) {
      console.error('❌ All thumbnail creation methods failed:', error);
      return '';
    }
  }

  /**
   * Get performance information about the current system
   */
  static getPerformanceInfo(): {
    multithreadingEnabled: boolean;
    optimalThreadCount: number;
    ffmpegReady: boolean;
  } {
    return {
      multithreadingEnabled: isMultithreadingAvailable(),
      optimalThreadCount: getFFmpegManager().getOptimalThreadCount(),
      ffmpegReady: getFFmpegManager().isFFmpegLoaded()
    };
  }

  /**
   * Clean up resources
   */
  static async cleanup(): Promise<void> {
    try {
      await ffmpegWorkerManager.cleanup();
    } catch (error) {
      console.error('Error during video service cleanup:', error);
    }
  }
}