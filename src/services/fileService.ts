import { ImageFile } from '../types';
import { createImageFile } from '../lib/imageUtils';

export class FileService {
  static validateImageFile(file: File): boolean {
    return file.type.startsWith("image/");
  }

  static createImageFile(file: File): ImageFile {
    return createImageFile(file);
  }

  static processFileList(files: FileList): ImageFile[] {
    const newImages: ImageFile[] = [];
    
    Array.from(files).forEach((file) => {
      if (this.validateImageFile(file)) {
        newImages.push(this.createImageFile(file));
      }
    });

    return newImages;
  }

  static cleanupImageUrls(images: ImageFile[]): void {
    images.forEach(img => URL.revokeObjectURL(img.url));
  }

  static cleanupVideoUrls(videos: any[]): void {
    videos.forEach(video => URL.revokeObjectURL(video.url));
  }

  static downloadVideo(video: any): void {
    const a = document.createElement("a");
    a.href = video.url;
    a.download = video.name;
    a.click();
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
}