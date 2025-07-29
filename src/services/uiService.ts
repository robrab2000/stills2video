import { UIState, VideoPreview, VideoSettings } from '../types';
import { formatFileSize, formatTimestamp, formatDuration } from '../lib/uiUtils';
import { validateImageFile, validateFileUpload } from '../lib/validation';
import { estimateVideoSize, calculateVideoDuration } from '../lib/videoUtils';
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
        generatedVideos: false,
        images: false
      },
      notifications: [],
      errors: [],
      warnings: []
    };
  }

  static validateVideoSettings(settings: any): { isValid: boolean; errors: string[] } {
    // This method is no longer used as validation is handled by FileService
    return { isValid: true, errors: [] };
  }

  static getRecommendedSettings(images: any[]): Partial<VideoSettings> {
    if (images.length === 0) {
      return {
        fps: 24,
        videoWidth: 1920,
        videoHeight: 1080
      };
    }

    // Calculate average dimensions
    let totalWidth = 0;
    let totalHeight = 0;
    let validImages = 0;

    images.forEach(img => {
      if (img.width && img.height) {
        totalWidth += img.width;
        totalHeight += img.height;
        validImages++;
      }
    });

    if (validImages === 0) {
      return {
        fps: 24,
        videoWidth: 1920,
        videoHeight: 1080
      };
    }

    const avgWidth = totalWidth / validImages;
    const avgHeight = totalHeight / validImages;

    // Round to nearest 16 for better encoding
    const width = Math.round(avgWidth / 16) * 16;
    const height = Math.round(avgHeight / 16) * 16;

    return {
      fps: images.length < 30 ? 15 : 24,
      videoWidth: Math.max(480, Math.min(1920, width)),
      videoHeight: Math.max(360, Math.min(1080, height))
    };
  }

  static getVideoInfo(video: VideoPreview) {
    return {
      name: video.name,
      size: formatFileSize(video.blob.size),
      timestamp: formatTimestamp(video.timestamp),
      format: video.extension.toUpperCase(),
      quality: CodecService.getCodecQuality(video.extension === 'mp4' ? 'h264' : 'vp8')
    };
  }

  static getProgressStage(progress: number): {
    stage: string;
    icon: string;
    description: string;
  } {
    if (progress === 0) {
      return {
        stage: 'Preparing',
        icon: '⚙️',
        description: 'Initializing video generation...'
      };
    } else if (progress < 25) {
      return {
        stage: 'Loading',
        icon: '📁',
        description: 'Loading images and preparing frames...'
      };
    } else if (progress < 50) {
      return {
        stage: 'Processing',
        icon: '🎬',
        description: 'Processing video frames...'
      };
    } else if (progress < 75) {
      return {
        stage: 'Encoding',
        icon: '🎥',
        description: 'Encoding video with selected codec...'
      };
    } else if (progress < 100) {
      return {
        stage: 'Finalizing',
        icon: '✨',
        description: 'Finalizing video and creating thumbnail...'
      };
    } else {
      return {
        stage: 'Complete',
        icon: '✅',
        description: 'Video generation completed!'
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
    if (mimeType.includes('h264') || mimeType.includes('avc')) {
      return {
        name: 'H.264',
        description: 'High efficiency video coding, excellent compatibility',
        quality: 'High',
        compatibility: 'Excellent'
      };
    } else if (mimeType.includes('vp9')) {
      return {
        name: 'VP9',
        description: 'Open source video codec, good compression',
        quality: 'High',
        compatibility: 'Good'
      };
    } else if (mimeType.includes('vp8')) {
      return {
        name: 'VP8',
        description: 'Open source video codec, wide support',
        quality: 'Medium',
        compatibility: 'Good'
      };
    } else {
      return {
        name: 'Unknown',
        description: 'Unknown codec format',
        quality: 'Unknown',
        compatibility: 'Unknown'
      };
    }
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
      const validation = validateImageFile(file);
      
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
    const estimatedDuration = calculateVideoDuration(imageCount, fps);
    const estimatedSizeBytes = estimateVideoSize(imageCount, fps, width, height, codec);
    const estimatedSize = formatFileSize(estimatedSizeBytes);
    
    // Rough estimate of processing time (seconds)
    const processingTimeSeconds = Math.max(5, imageCount * 0.1 + (width * height) / 1000000);
    const processingTime = formatDuration(processingTimeSeconds);

    return {
      estimatedDuration,
      estimatedSize,
      processingTime
    };
  }

  static createNotification(
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    duration: number = 5000
  ) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now(),
      duration,
      isVisible: true
    };
  }

  static createError(
    type: 'validation' | 'processing' | 'system',
    message: string,
    details?: string
  ) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      details,
      timestamp: Date.now(),
      isResolved: false
    };
  }

  static createWarning(
    type: 'performance' | 'quality' | 'compatibility',
    message: string,
    recommendations?: string[]
  ) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      recommendations,
      timestamp: Date.now(),
      isDismissed: false
    };
  }

  static validateUIState(state: UIState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (state.generationProgress < 0 || state.generationProgress > 100) {
      errors.push('Generation progress must be between 0 and 100');
    }

    if (state.isGenerating && state.generationProgress === 0) {
      errors.push('Generation in progress but progress is 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static isPanelCollapsed(state: UIState, panel: keyof UIState['collapsedPanels']): boolean {
    return state.collapsedPanels[panel];
  }

  static togglePanel(state: UIState, panel: keyof UIState['collapsedPanels']): UIState {
    return {
      ...state,
      collapsedPanels: {
        ...state.collapsedPanels,
        [panel]: !state.collapsedPanels[panel]
      }
    };
  }

  static getActiveNotifications(state: UIState) {
    return state.notifications.filter(n => !n.dismissed);
  }

  static getUnresolvedErrors(state: UIState) {
    return state.errors.filter(e => !e.resolved);
  }

  static getActiveWarnings(state: UIState) {
    return state.warnings.filter(w => !w.dismissed);
  }
}