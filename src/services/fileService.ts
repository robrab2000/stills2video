import { ImageFile } from '../types';
import { createImageFile } from '../lib/imageUtils';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export class FileService {
  static validateImageFile(file: File): FileValidationResult {
    const errors: string[] = [];
    
    // Check file type
    if (!file.type.startsWith("image/")) {
      errors.push("File must be an image");
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push("File size must be less than 10MB");
    }
    
    // Check if file is empty
    if (file.size === 0) {
      errors.push("File cannot be empty");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static createImageFile(file: File): ImageFile {
    return createImageFile(file);
  }

  static processFileList(files: FileList): { images: ImageFile[]; errors: string[] } {
    const newImages: ImageFile[] = [];
    const errors: string[] = [];
    
    Array.from(files).forEach((file, index) => {
      const validation = this.validateImageFile(file);
      
      if (validation.isValid) {
        try {
          newImages.push(this.createImageFile(file));
        } catch (error) {
          errors.push(`Failed to process ${file.name}: ${error}`);
        }
      } else {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`);
      }
    });

    return { images: newImages, errors };
  }

  static cleanupImageUrls(images: ImageFile[]): void {
    images.forEach(img => {
      try {
        URL.revokeObjectURL(img.url);
      } catch (error) {
        console.warn('Failed to cleanup image URL:', error);
      }
    });
  }

  static cleanupVideoUrls(videos: any[]): void {
    videos.forEach(video => {
      try {
        URL.revokeObjectURL(video.url);
        if (video.thumbnailUrl) {
          URL.revokeObjectURL(video.thumbnailUrl);
        }
      } catch (error) {
        console.warn('Failed to cleanup video URL:', error);
      }
    });
  }

  static downloadVideo(video: any): void {
    try {
      const a = document.createElement("a");
      a.href = video.url;
      a.download = video.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download video:', error);
      throw new Error('Failed to download video');
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    
    return `${minutes}m ${remainingSeconds}s`;
  }

  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  static generateUniqueFileName(originalName: string, extension: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    return `${originalName}-${timestamp}-${randomId}.${extension}`;
  }

  static validateVideoSettings(settings: any): FileValidationResult {
    const errors: string[] = [];
    
    if (settings.fps < 0.1 || settings.fps > 30) {
      errors.push("FPS must be between 0.1 and 30");
    }
    
    if (settings.videoWidth < 480 || settings.videoWidth > 3840) {
      errors.push("Video width must be between 480 and 3840");
    }
    
    if (settings.videoHeight < 360 || settings.videoHeight > 2160) {
      errors.push("Video height must be between 360 and 2160");
    }
    
    if (!settings.selectedCodec) {
      errors.push("Video codec must be selected");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static estimateVideoSize(
    imageCount: number,
    fps: number,
    width: number,
    height: number,
    codec: string
  ): number {
    // Rough estimation based on codec and resolution
    const duration = imageCount / fps;
    const pixelsPerFrame = width * height;
    
    let bytesPerPixel = 0.1; // Conservative estimate
    
    if (codec.includes('h264') || codec.includes('avc')) {
      bytesPerPixel = 0.05; // H.264 is more efficient
    } else if (codec.includes('vp9')) {
      bytesPerPixel = 0.06; // VP9 is also efficient
    } else if (codec.includes('vp8')) {
      bytesPerPixel = 0.08; // VP8 is less efficient
    }
    
    return Math.round(pixelsPerFrame * bytesPerPixel * fps * duration);
  }
}