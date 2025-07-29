import { ImageFile, VideoPreview, VideoSettings } from '../types';
import { calculateImageScaling } from '../lib/imageUtils';
import { CodecService } from './codecService';
import { FileService } from './fileService';
import { generateVideoWithFFmpeg, ffmpegManager } from '../lib/ffmpegUtils';

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
    // Validate inputs
    const validation = this.validateVideoGenerationInputs(images, settings, selectedCodec, videoCodecs);
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
        const videoId = Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now();
        const videoName = FileService.generateUniqueFileName('video', extension);
        
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

  private static validateVideoGenerationInputs(
    images: ImageFile[],
    settings: VideoSettings,
    selectedCodec: string,
    videoCodecs: any[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    console.log('🔍 Validating video generation inputs:', {
      imagesCount: images.length,
      selectedCodec,
      videoCodecsCount: videoCodecs.length,
      availableCodecs: videoCodecs.map(c => ({ name: c.name, mimeType: c.mimeType, supported: c.supported }))
    });

    // Validate images
    if (images.length === 0) {
      errors.push("At least one image is required");
    }

    if (images.length > 1000) {
      errors.push("Maximum 1000 images allowed");
    }

    // Validate settings
    const settingsValidation = FileService.validateVideoSettings(settings);
    if (!settingsValidation.isValid) {
      errors.push(...settingsValidation.errors);
    }

    // Validate codec
    const codecValidation = CodecService.validateCodec(selectedCodec, videoCodecs);
    if (!codecValidation.isValid) {
      errors.push(...codecValidation.errors);
    }

    console.log('✅ Validation result:', { isValid: errors.length === 0, errors });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static async generateVideoWithMediaRecorder(
    images: ImageFile[],
    settings: VideoSettings,
    selectedCodec: string,
    videoCodecs: any[],
    onProgress?: (progress: number) => void
  ): Promise<VideoPreview> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = settings.videoWidth;
    canvas.height = settings.videoHeight;

    const stream = canvas.captureStream(30);
    
    // Enhanced codec selection with better fallback
    let mimeType = selectedCodec;
    let codecToUse = videoCodecs.find((codec: any) => codec.mimeType === selectedCodec);
    
    if (!mimeType || !MediaRecorder.isTypeSupported(mimeType)) {
      console.log("Selected codec not supported, looking for fallback...");
      
      // Try to get the best available codec
      const bestCodec = CodecService.getBestCodec(videoCodecs);
      if (bestCodec) {
        mimeType = bestCodec.mimeType;
        codecToUse = bestCodec;
        console.log("Using best available codec:", bestCodec.name);
      } else {
        // Try H.264 even if not reported as supported (browser workaround)
        const userAgent = navigator.userAgent.toLowerCase();
        const isChrome = userAgent.includes('chrome') && !userAgent.includes('edge');
        const isEdge = userAgent.includes('edge');
        
        if (isChrome || isEdge) {
          console.log("Trying H.264 despite MediaRecorder report...");
          mimeType = "video/mp4;codecs=h264";
          codecToUse = { name: "H.264 (MP4)", mimeType, extension: "mp4", supported: true };
        } else {
          // Final fallback
          mimeType = "video/webm;codecs=vp8";
          codecToUse = { name: "VP8 (WebM)", mimeType, extension: "webm", supported: true };
          console.log("Using VP8 fallback codec");
        }
      }
    }
    
    console.log("Final selected codec:", mimeType);
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
    });

    return new Promise((resolve, reject) => {
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const extension = codecToUse?.extension || (mimeType.includes("mp4") ? "mp4" : "webm");
          const videoId = Math.random().toString(36).substr(2, 9);
          const timestamp = Date.now();
          const videoName = FileService.generateUniqueFileName('video', extension);
          
          const thumbnailUrl = await this.createThumbnail(blob);
          
          const video: VideoPreview = {
            url,
            blob,
            extension,
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

      mediaRecorder.onerror = (error) => {
        console.error("MediaRecorder error:", error);
        reject(error);
      };

      mediaRecorder.start();

      this.processFrames(images, settings, ctx, canvas, onProgress)
        .then(() => {
          setTimeout(() => {
            mediaRecorder.stop();
          }, 100);
        })
        .catch(reject);
    });
  }

  private static async processFrames(
    images: ImageFile[],
    settings: VideoSettings,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const frameDuration = 1000 / settings.fps;

    // Initial progress update
    onProgress?.(10);

    for (let i = 0; i < images.length; i++) {
      const img = new window.Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          const scaling = calculateImageScaling(
            img.width,
            img.height,
            canvas.width,
            canvas.height
          );
          
          ctx.drawImage(
            img, 
            scaling.offsetX, 
            scaling.offsetY, 
            scaling.scaledWidth, 
            scaling.scaledHeight
          );
          resolve();
        };
        img.src = images[i].url;
      });

      // Update progress based on frame processing
      const progress = 10 + ((i + 1) / images.length) * 80; // 10-90% for frame processing
      onProgress?.(progress);

      await new Promise(resolve => setTimeout(resolve, frameDuration));
    }

    // Final progress update
    onProgress?.(100);
  }

  static async createThumbnail(videoBlob: Blob): Promise<string> {
    try {
      // Try FFmpeg first for better thumbnail quality
      const ffmpegReady = await ffmpegManager.isReady();
      if (ffmpegReady) {
        return await ffmpegManager.createThumbnail(videoBlob);
      }
    } catch (error) {
      console.log("FFmpeg thumbnail failed, using fallback method:", error);
    }
    
    // Fallback to canvas method
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.crossOrigin = 'anonymous';
      
      video.onloadeddata = () => {
        video.currentTime = 0;
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 80;
        const ctx = canvas.getContext('2d')!;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnailUrl);
        
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        resolve('');
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(videoBlob);
    });
  }

  static estimateVideoDuration(imageCount: number, fps: number): number {
    return imageCount / fps;
  }

  static estimateVideoSize(
    imageCount: number,
    fps: number,
    width: number,
    height: number,
    codec: string
  ): number {
    return FileService.estimateVideoSize(imageCount, fps, width, height, codec);
  }

  static getVideoInfo(video: VideoPreview): {
    duration: number;
    size: string;
    format: string;
    quality: string;
  } {
    const duration = this.estimateVideoDuration(video.blob.size / 1024, 30); // Rough estimate
    const size = FileService.formatFileSize(video.blob.size);
    const format = video.extension.toUpperCase();
    const quality = CodecService.getCodecQuality(video.extension === 'mp4' ? 'h264' : 'vp8');

    return {
      duration,
      size,
      format,
      quality
    };
  }
}