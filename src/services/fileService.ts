import { ImageFile, VideoPreview, VideoSettings } from '../types';
import { validateImageFile, validateImageCollection, validateFileUpload } from '../lib/validation';
import { formatFileSize, formatTimestamp, generateId, getFileExtension, removeFileExtension } from '../lib/uiUtils';
import { estimateVideoSize, calculateVideoDuration } from '../lib/videoUtils';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export class FileService {
  static validateImageFile(file: File): FileValidationResult {
    const result = validateImageFile(file);
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings
    };
  }

  static processFileList(files: FileList): { images: ImageFile[]; errors: string[] } {
    const images: ImageFile[] = [];
    const errors: string[] = [];

    // Validate the entire file list first
    const uploadValidation = validateFileUpload(files);
    if (!uploadValidation.isValid) {
      errors.push(...uploadValidation.errors);
    }

    // Process each file
    Array.from(files).forEach((file) => {
      const validation = this.validateImageFile(file);
      
      if (validation.isValid) {
        const imageFile: ImageFile = {
          id: generateId(),
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          type: file.type
        };
        images.push(imageFile);
      } else {
        errors.push(`File "${file.name}": ${validation.errors.join(', ')}`);
      }
    });

    return { images, errors };
  }

  static downloadVideo(video: VideoPreview): void {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = video.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static formatTimestamp(timestamp: number): string {
    return formatTimestamp(timestamp);
  }

  static generateUniqueFileName(prefix: string, extension: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}_${randomId}.${extension}`;
  }

  static validateVideoSettings(settings: VideoSettings): FileValidationResult {
    const errors: string[] = [];

    if (settings.fps < 0.1 || settings.fps > 60) {
      errors.push('FPS must be between 0.1 and 60');
    }

    if (settings.videoWidth < 480 || settings.videoWidth > 3840) {
      errors.push('Video width must be between 480 and 3840');
    }

    if (settings.videoHeight < 360 || settings.videoHeight > 2160) {
      errors.push('Video height must be between 360 and 2160');
    }

    if (settings.videoWidth % 16 !== 0) {
      errors.push('Video width should be divisible by 16 for better compression');
    }

    if (settings.videoHeight % 16 !== 0) {
      errors.push('Video height should be divisible by 16 for better compression');
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
    codec: string = 'h264'
  ): number {
    return estimateVideoSize(imageCount, fps, width, height, codec);
  }

  static getVideoInfo(video: VideoPreview): {
    duration: number;
    size: string;
    format: string;
    quality: string;
  } {
    const extension = getFileExtension(video.name);
    const size = formatFileSize(video.blob.size);
    
    // Estimate duration based on file size and typical bitrates
    const estimatedDuration = this.estimateVideoDuration(video.blob.size, extension);
    
    return {
      duration: estimatedDuration,
      size,
      format: extension.toUpperCase(),
      quality: this.getVideoQuality(video.blob.size, extension)
    };
  }

  private static estimateVideoDuration(fileSize: number, format: string): number {
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

  static cleanupUrls(urls: string[]): void {
    urls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

  static getFileInfo(file: File): {
    name: string;
    size: string;
    type: string;
    extension: string;
    lastModified: string;
  } {
    return {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      extension: getFileExtension(file.name),
      lastModified: formatTimestamp(file.lastModified)
    };
  }

  static validateImageCollection(images: ImageFile[]): FileValidationResult {
    const result = validateImageCollection(images);
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings
    };
  }
}