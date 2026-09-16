import { ImageFile, VideoSettings, VideoPreview } from '../types';
import { validateVideoGeneration } from '../lib/validation';
import { generateId } from '../lib/uiUtils';
import { fitExportDimensions } from '../lib/exportDimensions';
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

const isDev = process.env.NODE_ENV === 'development';

async function safeThumbnail(
  create: () => Promise<string>
): Promise<string | undefined> {
  try {
    return await create();
  } catch (error) {
    console.warn('Thumbnail creation failed; continuing without thumbnail:', error);
    return undefined;
  }
}

export class VideoService {
  static async generateVideo(
    images: ImageFile[],
    settings: VideoSettings,
    selectedCodec: string,
    videoCodecs: any[],
    onProgress?: (progress: number) => void
  ): Promise<VideoPreview> {
    const fitted = fitExportDimensions(settings.videoWidth, settings.videoHeight);
    const encodeSettings: VideoSettings = {
      ...settings,
      videoWidth: fitted.width,
      videoHeight: fitted.height,
    };

    // Validate inputs using the new validation utility
    const validation = validateVideoGeneration(images, encodeSettings, selectedCodec);
    if (!validation.isValid) {
      throw new Error(`Video generation validation failed: ${validation.errors.join(', ')}`);
    }

    if (images.length === 0) {
      throw new Error("No images provided");
    }

    // Check if multithreading is available and enabled
    const useMultithreading = shouldEnableFFmpegMultithreading() && isMultithreadingAvailable();
    
    if (isDev) console.log('🎬 Video generation started:', {
      imageCount: images.length,
      settings: {
        fps: encodeSettings.fps,
        width: encodeSettings.videoWidth,
        height: encodeSettings.videoHeight,
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
        if (isDev) console.log("🚀 Using multithreaded FFmpeg processing");
        
        const imageFiles = images.map(img => img.file);
        
        const videoBlob = await generateVideoWithMultithreading(imageFiles, {
          fps: encodeSettings.fps,
          width: encodeSettings.videoWidth,
          height: encodeSettings.videoHeight,
          codec: selectedCodec
        }, (progress, stage) => {
          if (isDev) console.log(`🚀 Multithreaded FFmpeg progress: ${progress}% - ${stage}`);
          onProgress?.(progress);
        });

        if (isDev) console.log("✅ Multithreaded video generation completed successfully");

        const url = URL.createObjectURL(videoBlob);
        const selectedCodecInfo = videoCodecs.find((codec: any) => codec.mimeType === selectedCodec);
        const extension = selectedCodecInfo?.extension || (selectedCodec.includes("mp4") ? "mp4" : "webm");
        const videoId = generateId();
        const timestamp = Date.now();
        const videoName = `video_${timestamp}_${videoId}.${extension}`;
        
        const thumbnailUrl = await safeThumbnail(() => createThumbnailWithMultithreading(videoBlob));
        
        return {
          id: videoId,
          name: videoName,
          url,
          thumbnailUrl,
          blob: videoBlob,
          extension,
          size: videoBlob.size,
          duration: images.length / encodeSettings.fps,
          format: extension,
          codec: selectedCodec,
          timestamp,
          settings: {
            fps: encodeSettings.fps,
            videoWidth: encodeSettings.videoWidth,
            videoHeight: encodeSettings.videoHeight,
            selectedCodec: selectedCodec
          }
        };
      } catch (error) {
        console.error('❌ Multithreaded FFmpeg failed, falling back to main thread:', error);
        return this.generateVideoWithMainThread(images, encodeSettings, selectedCodec, videoCodecs, onProgress);
      }
    } else {
      if (isDev) console.log("🔄 Using main thread FFmpeg processing");
      return this.generateVideoWithMainThread(images, encodeSettings, selectedCodec, videoCodecs, onProgress);
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
    
    if (isDev) console.log('🔄 Main thread processing:', {
      ffmpegReady,
      multithreadingEnabled: ffmpegManager.isMultithreadingEnabled(),
      optimalThreads: ffmpegManager.getOptimalThreadCount()
    });
    
    if (ffmpegReady) {
      try {
        // Use FFmpeg.wasm for video generation
        if (isDev) console.log("🔄 Using main thread FFmpeg.wasm for video generation");
        
        // Extract File objects from ImageFile array
        const imageFiles = images.map(img => img.file);
        
        // Generate video using FFmpeg with progress callback
        const videoBlob = await generateVideoWithFFmpeg(imageFiles, {
          fps: settings.fps,
          width: settings.videoWidth,
          height: settings.videoHeight,
          codec: selectedCodec
        }, (progress, stage) => {
          if (isDev) console.log(`🔄 Main thread FFmpeg progress: ${progress}% - ${stage}`);
          onProgress?.(progress);
        });

        if (isDev) console.log("✅ Main thread video generation completed successfully");

        // Create video preview object
        const url = URL.createObjectURL(videoBlob);
        const selectedCodecInfo = videoCodecs.find((codec: any) => codec.mimeType === selectedCodec);
        const extension = selectedCodecInfo?.extension || (selectedCodec.includes("mp4") ? "mp4" : "webm");
        const videoId = generateId();
        const timestamp = Date.now();
        const videoName = `video_${timestamp}_${videoId}.${extension}`;
        
        // Create thumbnail using FFmpeg
        if (isDev) console.log("🖼️ Creating thumbnail with main thread FFmpeg...");
        const thumbnailUrl = await safeThumbnail(() => this.createThumbnail(videoBlob));
        if (isDev && thumbnailUrl) console.log("✅ Thumbnail created successfully");
        
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
      if (isDev) console.log('⚠️ FFmpeg not available, using MediaRecorder fallback');
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

            // Create thumbnail (optional — don't fail the export if it breaks)
            const thumbnailUrl = await safeThumbnail(() => this.createThumbnail(videoBlob));

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
            
            // Load and draw image from local File handle (one at a time)
            const img = new Image();
            const objectUrl = URL.createObjectURL(image.file);
            img.onload = () => {
              URL.revokeObjectURL(objectUrl);
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

            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error(`Failed to load image: ${image.name}`));
            };
            
            img.src = objectUrl;
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
    if (isDev) console.log("🖼️ Starting thumbnail creation...");
    
    try {
      // Try FFmpeg first
      const ffmpegManager = getFFmpegManager();
      const ffmpegReady = await ffmpegManager.isReady();
      if (ffmpegReady) {
        if (isDev) console.log("🖼️ Using FFmpeg for thumbnail creation...");
        const thumbnailUrl = await ffmpegManager.createThumbnail(videoBlob);
        if (thumbnailUrl) {
          if (isDev) console.log("✅ FFmpeg thumbnail creation successful");
          return thumbnailUrl;
        }
      }
    } catch (error) {
      console.error('❌ FFmpeg thumbnail creation failed:', error);
    }

    // Fallback: create thumbnail from video element
    if (isDev) console.log("🖼️ Using fallback video element thumbnail creation...");
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
            if (isDev) console.log("✅ Fallback thumbnail creation successful");
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