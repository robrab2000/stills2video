import { ImageFile, VideoPreview, VideoSettings } from '../types';
import { validateVideoGeneration } from '../lib/validation';
import { calculateFrameDuration, estimateVideoSize, calculateVideoDuration, formatDuration, estimateProcessingTime, getVideoQualityScore } from '../lib/videoUtils';
import { formatFileSize, generateId } from '../lib/uiUtils';
import { calculateImageScaling } from '../lib/imageUtils';
import { ffmpegManager, generateVideoWithFFmpeg } from '../lib/ffmpegUtils';

export interface VideoGenerationResult {
  success: boolean;
  video?: VideoPreview;
  error?: string;
  warnings?: string[];
}

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

    // Check if FFmpeg is available and ready
    const ffmpegReady = await ffmpegManager.isReady();
    
    if (ffmpegReady) {
      try {
        // Use FFmpeg.wasm for video generation
        console.log("Using FFmpeg.wasm for video generation");
        
        // Extract File objects from ImageFile array
        const imageFiles = images.map(img => img.file);
        
        // Generate video using FFmpeg with progress callback
        const videoBlob = await generateVideoWithFFmpeg(imageFiles, {
          fps: settings.fps,
          width: settings.videoWidth,
          height: settings.videoHeight,
          codec: selectedCodec
        }, (progress, stage) => {
          console.log(`FFmpeg progress: ${progress}% - ${stage}`);
          onProgress?.(progress);
        });

        // Create video preview object
        const url = URL.createObjectURL(videoBlob);
        const selectedCodecInfo = videoCodecs.find((codec: any) => codec.mimeType === selectedCodec);
        const extension = selectedCodecInfo?.extension || (selectedCodec.includes("mp4") ? "mp4" : "webm");
        const videoId = generateId();
        const timestamp = Date.now();
        const videoName = `video_${timestamp}_${videoId}.${extension}`;
        
        // Create thumbnail using FFmpeg
        const thumbnailUrl = await this.createThumbnail(videoBlob);
        
        const video: VideoPreview = {
          url,
          blob: videoBlob,
          extension,
          id: videoId,
          timestamp,
          name: videoName,
          thumbnailUrl
        };
        
        return video;
      } catch (error) {
        console.error("FFmpeg video generation failed, falling back to MediaRecorder:", error);
        // Continue to MediaRecorder fallback
      }
    } else {
      console.log("FFmpeg not available, using MediaRecorder fallback");
    }
    
    // Fallback to MediaRecorder
    return await this.generateVideoWithMediaRecorder(images, settings, selectedCodec, videoCodecs, onProgress);
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
            const videoName = `video_${timestamp}_${videoId}.${supportedCodec.extension}`;
            
            // Create thumbnail
            const thumbnailUrl = await this.createThumbnail(videoBlob);
            
            const video: VideoPreview = {
              url,
              blob: videoBlob,
              extension: supportedCodec.extension,
              id: videoId,
              timestamp,
              name: videoName,
              thumbnailUrl
            };
            
            resolve(video);
          } catch (error) {
            reject(error);
          }
        };

        mediaRecorder.onerror = (event) => {
          reject(new Error(`MediaRecorder error: ${event}`));
        };

        // Start recording
        mediaRecorder.start();

        // Process frames
        this.processFrames(images, settings, ctx, canvas, onProgress)
          .then(() => {
            mediaRecorder.stop();
          })
          .catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  private static async processFrames(
    images: ImageFile[],
    settings: VideoSettings,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const frameDuration = calculateFrameDuration(settings.fps);
    const totalFrames = images.length;
    
    for (let i = 0; i < totalFrames; i++) {
      const image = images[i];
      
      // Load image
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate scaling
            const scaling = calculateImageScaling(
              img.width,
              img.height,
              canvas.width,
              canvas.height
            );
            
            // Draw image
            ctx.drawImage(
              img,
              scaling.offsetX,
              scaling.offsetY,
              scaling.scaledWidth,
              scaling.scaledHeight
            );
            
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${image.name}`));
        img.src = image.url;
      });
      
      // Update progress
      const progress = ((i + 1) / totalFrames) * 100;
      onProgress?.(progress);
      
      // Wait for frame duration
      await new Promise(resolve => setTimeout(resolve, frameDuration));
    }
  }

  static async createThumbnail(videoBlob: Blob): Promise<string> {
    try {
      // Create video element
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      
      // Create canvas for thumbnail
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context for thumbnail');
      }
      
      canvas.width = 320;
      canvas.height = 180;
      
      return new Promise((resolve, reject) => {
        video.onloadeddata = () => {
          try {
            // Seek to middle of video
            video.currentTime = video.duration / 2;
          } catch (error) {
            // If seeking fails, use first frame
            video.currentTime = 0;
          }
        };
        
        video.onseeked = () => {
          try {
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to blob URL
            canvas.toBlob((blob) => {
              if (blob) {
                const thumbnailUrl = URL.createObjectURL(blob);
                resolve(thumbnailUrl);
              } else {
                reject(new Error('Failed to create thumbnail blob'));
              }
            }, 'image/jpeg', 0.8);
          } catch (error) {
            reject(error);
          }
        };
        
        video.onerror = () => {
          reject(new Error('Failed to load video for thumbnail'));
        };
        
        // Set video source
        video.src = URL.createObjectURL(videoBlob);
      });
    } catch (error) {
      console.error('Failed to create thumbnail:', error);
      // Return a placeholder or default thumbnail
      return '';
    }
  }

  static estimateVideoDuration(imageCount: number, fps: number): number {
    return calculateVideoDuration(imageCount, fps);
  }

  static estimateVideoSize(
    imageCount: number,
    fps: number,
    width: number,
    height: number,
    codec: string
  ): number {
    return estimateVideoSize(imageCount, fps, width, height, codec);
  }

  static getVideoInfo(video: VideoPreview): {
    duration: number;
    size: string;
    format: string;
    quality: string;
  } {
    const size = formatFileSize(video.blob.size);
    const extension = video.name.split('.').pop() || 'unknown';
    
    // Estimate duration based on file size and typical bitrates
    const estimatedDuration = this.estimateVideoDurationFromSize(video.blob.size, extension);
    
    return {
      duration: estimatedDuration,
      size,
      format: extension.toUpperCase(),
      quality: this.getVideoQuality(video.blob.size, extension)
    };
  }

  static getVideoQualityScore(settings: VideoSettings): {
    score: number;
    level: 'low' | 'medium' | 'high';
    factors: string[];
  } {
    return getVideoQualityScore(settings);
  }

  static estimateProcessingTime(
    imageCount: number,
    width: number,
    height: number,
    fps: number,
    codec: string
  ): number {
    return estimateProcessingTime(imageCount, width, height, fps, codec);
  }

  private static estimateVideoDurationFromSize(fileSize: number, format: string): number {
    // Rough estimation based on typical bitrates
    let bitrate: number;
    
    switch (format.toLowerCase()) {
      case 'mp4':
        bitrate = 2000000; // 2 Mbps
        break;
      case 'webm':
        bitrate = 1500000; // 1.5 Mbps
        break;
      default:
        bitrate = 1000000; // 1 Mbps
    }
    
    return (fileSize * 8) / bitrate; // Convert bytes to bits, then divide by bitrate
  }

  private static getVideoQuality(fileSize: number, format: string): string {
    // Rough quality estimation based on file size
    const sizeInMB = fileSize / (1024 * 1024);
    
    if (sizeInMB > 50) return 'High';
    if (sizeInMB > 20) return 'Medium';
    return 'Low';
  }
}