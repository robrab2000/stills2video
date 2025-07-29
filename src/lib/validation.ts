import { VideoSettings, ImageFile } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRule<T> {
  validate: (value: T) => ValidationResult;
  message: string;
}

/**
 * Validates video settings
 */
export function validateVideoSettings(settings: VideoSettings): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // FPS validation
  if (typeof settings.fps !== 'number' || settings.fps < 0.1 || settings.fps > 60) {
    errors.push('FPS must be between 0.1 and 60');
  } else if (settings.fps < 1) {
    warnings.push('Very low FPS may result in choppy video');
  } else if (settings.fps > 30) {
    warnings.push('High FPS may result in large file sizes');
  }

  // Resolution validation
  if (typeof settings.videoWidth !== 'number' || settings.videoWidth < 480 || settings.videoWidth > 3840) {
    errors.push('Video width must be between 480 and 3840 pixels');
  }

  if (typeof settings.videoHeight !== 'number' || settings.videoHeight < 360 || settings.videoHeight > 2160) {
    errors.push('Video height must be between 360 and 2160 pixels');
  }

  // Aspect ratio validation
  if (settings.videoWidth && settings.videoHeight) {
    const aspectRatio = settings.videoWidth / settings.videoHeight;
    if (aspectRatio < 0.5 || aspectRatio > 3) {
      warnings.push('Unusual aspect ratio may affect video quality');
    }
  }

  // Codec validation
  if (!settings.selectedCodec || typeof settings.selectedCodec !== 'string') {
    errors.push('Video codec must be selected');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates image file
 */
export function validateImageFile(file: File): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // File type validation
  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
  }

  // File size validation
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    errors.push('File size must be less than 50MB');
  } else if (file.size > 10 * 1024 * 1024) { // 10MB
    warnings.push('Large file size may slow down processing');
  }

  // File name validation
  if (file.name.length > 255) {
    errors.push('File name too long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates image collection
 */
export function validateImageCollection(images: ImageFile[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Count validation
  if (images.length === 0) {
    errors.push('At least one image is required');
  } else if (images.length > 1000) {
    errors.push('Maximum 1000 images allowed');
  } else if (images.length > 100) {
    warnings.push('Large image sequence may take longer to process');
  }

  // Size validation
  const totalSize = images.reduce((sum, img) => sum + img.size, 0);
  const maxTotalSize = 500 * 1024 * 1024; // 500MB
  if (totalSize > maxTotalSize) {
    errors.push('Total file size must be less than 500MB');
  } else if (totalSize > 100 * 1024 * 1024) { // 100MB
    warnings.push('Large total size may affect performance');
  }

  // Dimension consistency check
  if (images.length > 1) {
    const firstImage = images[0];
    const inconsistentDimensions = images.some(img => 
      img.width !== firstImage.width || img.height !== firstImage.height
    );
    
    if (inconsistentDimensions) {
      warnings.push('Images have different dimensions - consider resizing for consistency');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates video generation parameters
 */
export function validateVideoGeneration(
  images: ImageFile[],
  settings: VideoSettings,
  selectedCodec: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate images
  const imageValidation = validateImageCollection(images);
  if (!imageValidation.isValid) {
    errors.push(...imageValidation.errors);
  }
  warnings.push(...imageValidation.warnings || []);

  // Validate settings
  const settingsValidation = validateVideoSettings(settings);
  if (!settingsValidation.isValid) {
    errors.push(...settingsValidation.errors);
  }
  warnings.push(...settingsValidation.warnings || []);

  // Validate codec
  if (!selectedCodec) {
    errors.push('Video codec must be selected');
  }

  // Performance warnings
  const totalPixels = images.length * settings.videoWidth * settings.videoHeight;
  if (totalPixels > 1000000000) { // 1 billion pixels
    warnings.push('Very high resolution sequence may cause performance issues');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates file upload
 */
export function validateFileUpload(files: FileList): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (files.length === 0) {
    errors.push('No files selected');
    return { isValid: false, errors, warnings };
  }

  // Check each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileValidation = validateImageFile(file);
    
    if (!fileValidation.isValid) {
      errors.push(`File "${file.name}": ${fileValidation.errors.join(', ')}`);
    }
    warnings.push(...fileValidation.warnings || []);
  }

  // Check for duplicates
  const fileNames = Array.from(files).map(f => f.name);
  const uniqueNames = new Set(fileNames);
  if (fileNames.length !== uniqueNames.size) {
    warnings.push('Duplicate file names detected');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates user preferences
 */
export function validateUserPreferences(preferences: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Theme validation
  if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
    errors.push('Invalid theme preference');
  }

  // Language validation
  if (preferences.language && typeof preferences.language !== 'string') {
    errors.push('Invalid language preference');
  }

  // Quality validation
  if (preferences.quality && !['low', 'medium', 'high'].includes(preferences.quality)) {
    errors.push('Invalid quality preference');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates performance settings
 */
export function validatePerformanceSettings(settings: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Memory limit validation
  if (settings.memoryLimit && (settings.memoryLimit < 100 || settings.memoryLimit > 2000)) {
    errors.push('Memory limit must be between 100MB and 2000MB');
  }

  // Thread count validation
  if (settings.threadCount && (settings.threadCount < 1 || settings.threadCount > 16)) {
    errors.push('Thread count must be between 1 and 16');
  }

  // Cache size validation
  if (settings.cacheSize && (settings.cacheSize < 50 || settings.cacheSize > 500)) {
    errors.push('Cache size must be between 50MB and 500MB');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates notification settings
 */
export function validateNotificationSettings(settings: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Duration validation
  if (settings.duration && (settings.duration < 1000 || settings.duration > 10000)) {
    errors.push('Notification duration must be between 1 and 10 seconds');
  }

  // Position validation
  if (settings.position && !['top', 'bottom', 'top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(settings.position)) {
    errors.push('Invalid notification position');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates export settings
 */
export function validateExportSettings(settings: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Format validation
  if (settings.format && !['mp4', 'webm', 'gif'].includes(settings.format)) {
    errors.push('Invalid export format');
  }

  // Quality validation
  if (settings.quality && (settings.quality < 1 || settings.quality > 100)) {
    errors.push('Quality must be between 1 and 100');
  }

  // Filename validation
  if (settings.filename && settings.filename.length > 255) {
    errors.push('Filename too long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates all settings at once
 */
export function validateAllSettings(settings: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each section
  const validations = [
    { name: 'Video Settings', validation: validateVideoSettings(settings.video || {}) },
    { name: 'User Preferences', validation: validateUserPreferences(settings.preferences || {}) },
    { name: 'Performance Settings', validation: validatePerformanceSettings(settings.performance || {}) },
    { name: 'Notification Settings', validation: validateNotificationSettings(settings.notifications || {}) },
    { name: 'Export Settings', validation: validateExportSettings(settings.export || {}) }
  ];

  validations.forEach(({ name, validation }) => {
    if (!validation.isValid) {
      errors.push(`${name}: ${validation.errors.join(', ')}`);
    }
    warnings.push(...validation.warnings || []);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}