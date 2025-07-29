import { VideoPreview, VideoSettings, UIState, Notification, AppError, AppWarning } from '../types';
import { FileService } from './fileService';
import { CodecService } from './codecService';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export class UIService {
  static createInitialUIState(): UIState {
    return {
      isGenerating: false,
      generationProgress: 0,
      showPreview: false,
      videoPreview: null,
      draggedIndex: null,
      collapsedPanels: {
        settings: false,
        images: false,
        generatedVideos: false
      },
      notifications: [],
      errors: [],
      warnings: []
    };
  }

  static validateVideoSettings(settings: VideoSettings): { isValid: boolean; errors: string[] } {
    return FileService.validateVideoSettings(settings);
  }

  static getRecommendedSettings(images: any[]): Partial<VideoSettings> {
    if (images.length === 0) {
      return {
        fps: 24,
        videoWidth: 1920,
        videoHeight: 1080,
        selectedCodec: CodecService.getRecommendedCodecForBrowser()
      };
    }

    // Calculate optimal dimensions based on image sizes
    const avgWidth = images.reduce((sum, img) => sum + (img.width || 1920), 0) / images.length;
    const avgHeight = images.reduce((sum, img) => sum + (img.height || 1080), 0) / images.length;

    // Round to nearest 16 for better encoding
    const optimalWidth = Math.round(avgWidth / 16) * 16;
    const optimalHeight = Math.round(avgHeight / 16) * 16;

    return {
      fps: 24,
      videoWidth: Math.max(480, Math.min(3840, optimalWidth)),
      videoHeight: Math.max(360, Math.min(2160, optimalHeight)),
      selectedCodec: CodecService.getRecommendedCodecForBrowser()
    };
  }

  static formatVideoInfo(video: VideoPreview): {
    name: string;
    size: string;
    timestamp: string;
    format: string;
    quality: string;
  } {
    return {
      name: video.name,
      size: FileService.formatFileSize(video.blob.size),
      timestamp: FileService.formatTimestamp(video.timestamp),
      format: video.extension.toUpperCase(),
      quality: CodecService.getCodecQuality(video.extension === 'mp4' ? 'h264' : 'vp8')
    };
  }

  static getProgressStage(progress: number): {
    stage: string;
    icon: string;
    description: string;
  } {
    if (progress < 10) {
      return {
        stage: "Initializing",
        icon: "⚙️",
        description: "Setting up video generation..."
      };
    } else if (progress < 30) {
      return {
        stage: "Processing Images",
        icon: "🖼️",
        description: "Loading and processing images..."
      };
    } else if (progress < 70) {
      return {
        stage: "Encoding Video",
        icon: "🎬",
        description: "Encoding video with selected codec..."
      };
    } else if (progress < 95) {
      return {
        stage: "Finalizing",
        icon: "✨",
        description: "Finalizing video and creating thumbnail..."
      };
    } else {
      return {
        stage: "Complete",
        icon: "✅",
        description: "Video generation complete!"
      };
    }
  }

  static generateToastMessage(
    type: ToastMessage['type'],
    message: string,
    duration: number = 5000
  ): ToastMessage {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      duration
    };
  }

  static getCodecDisplayInfo(mimeType: string): {
    name: string;
    description: string;
    quality: string;
    compatibility: string;
  } {
    const codecInfo = CodecService.getCodecInfo(mimeType, []);
    const quality = CodecService.getCodecQuality(mimeType);
    const compatibility = CodecService.getCodecCompatibility(mimeType);
    
    let compatibilityText = "Compatible with: ";
    const compatibleBrowsers = [];
    
    if (compatibility.chrome) compatibleBrowsers.push("Chrome");
    if (compatibility.firefox) compatibleBrowsers.push("Firefox");
    if (compatibility.safari) compatibleBrowsers.push("Safari");
    if (compatibility.edge) compatibleBrowsers.push("Edge");
    
    compatibilityText += compatibleBrowsers.join(", ");

    return {
      name: codecInfo?.name || "Unknown Codec",
      description: CodecService.getCodecDescription(mimeType),
      quality: quality.charAt(0).toUpperCase() + quality.slice(1),
      compatibility: compatibilityText
    };
  }

  static validateImageUpload(files: FileList): {
    validFiles: File[];
    errors: string[];
    warnings: string[];
  } {
    const validFiles: File[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    Array.from(files).forEach((file, index) => {
      const validation = FileService.validateImageFile(file);
      
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`);
      }

      // Add warnings for large files
      if (file.size > 5 * 1024 * 1024) { // 5MB
        warnings.push(`${file.name}: Large file size may slow down processing`);
      }
    });

    return { validFiles, errors, warnings };
  }

  static getPerformanceEstimate(
    imageCount: number,
    fps: number,
    width: number,
    height: number,
    codec: string
  ): {
    estimatedDuration: number;
    estimatedSize: string;
    processingTime: string;
  } {
    const estimatedDuration = imageCount / fps;
    const estimatedSizeBytes = FileService.estimateVideoSize(imageCount, fps, width, height, codec);
    const estimatedSize = FileService.formatFileSize(estimatedSizeBytes);
    
    // Rough estimate of processing time (seconds)
    const processingTimeSeconds = Math.max(5, imageCount * 0.1 + (width * height) / 1000000);
    const processingTime = FileService.formatDuration(processingTimeSeconds);

    return {
      estimatedDuration,
      estimatedSize,
      processingTime
    };
  }

  // Enhanced notification and error management
  static createNotification(
    type: Notification['type'],
    message: string,
    duration?: number
  ): Omit<Notification, 'id' | 'timestamp'> {
    return {
      type,
      message,
      duration
    };
  }

  static createError(
    type: AppError['type'],
    message: string,
    details?: string
  ): Omit<AppError, 'id' | 'timestamp'> {
    return {
      type,
      message,
      details,
      resolved: false
    };
  }

  static createWarning(
    type: AppWarning['type'],
    message: string,
    details?: string
  ): Omit<AppWarning, 'id' | 'timestamp'> {
    return {
      type,
      message,
      details,
      dismissed: false
    };
  }

  // UI state validation
  static validateUIState(uiState: Partial<UIState>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (uiState.generationProgress !== undefined && (uiState.generationProgress < 0 || uiState.generationProgress > 100)) {
      errors.push('Generation progress must be between 0 and 100');
    }

    if (uiState.draggedIndex !== undefined && uiState.draggedIndex !== null && uiState.draggedIndex < 0) {
      errors.push('Dragged index cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // UI state utilities
  static isPanelCollapsed(uiState: UIState, panelName: keyof UIState['collapsedPanels']): boolean {
    return uiState.collapsedPanels[panelName];
  }

  static togglePanel(uiState: UIState, panelName: keyof UIState['collapsedPanels']): Partial<UIState> {
    return {
      collapsedPanels: {
        ...uiState.collapsedPanels,
        [panelName]: !uiState.collapsedPanels[panelName]
      }
    };
  }

  static getActiveNotifications(uiState: UIState): Notification[] {
    return uiState.notifications.filter(n => !n.dismissed);
  }

  static getUnresolvedErrors(uiState: UIState): AppError[] {
    return uiState.errors.filter(e => !e.resolved);
  }

  static getActiveWarnings(uiState: UIState): AppWarning[] {
    return uiState.warnings.filter(w => !w.dismissed);
  }
}