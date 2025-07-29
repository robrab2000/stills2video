import { z } from 'zod';
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

// Zod Schemas for Runtime Validation

/**
 * Video Settings Schema
 */
export const videoSettingsSchema = z.object({
  fps: z.number().min(0.1, 'FPS must be at least 0.1').max(60, 'FPS must be at most 60'),
  videoWidth: z.number().min(480, 'Video width must be at least 480 pixels').max(3840, 'Video width must be at most 3840 pixels'),
  videoHeight: z.number().min(360, 'Video height must be at least 360 pixels').max(2160, 'Video height must be at most 2160 pixels'),
  selectedCodec: z.string().min(1, 'Video codec must be selected'),
  quality: z.enum(['high', 'medium', 'low']).optional(),
  bitrate: z.number().positive().optional(),
});

/**
 * Image File Schema
 */
export const imageFileSchema = z.object({
  id: z.string(),
  file: z.union([
    z.instanceof(File),
    z.object({
      name: z.string(),
      type: z.string(),
      size: z.number(),
      lastModified: z.number(),
    })
  ]),
  url: z.string().url(),
  name: z.string().max(255, 'File name too long'),
  size: z.number().positive(),
  lastModified: z.number(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  type: z.string().startsWith('image/', 'File must be an image'),
});

/**
 * Video Codec Schema
 */
export const videoCodecSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  extension: z.string(),
  supported: z.boolean(),
  quality: z.enum(['high', 'medium', 'low']).optional(),
  compatibility: z.object({
    chrome: z.boolean(),
    firefox: z.boolean(),
    safari: z.boolean(),
    edge: z.boolean(),
  }).optional(),
});

/**
 * Video Preview Schema
 */
export const videoPreviewSchema = z.object({
  url: z.string().url(),
  blob: z.union([
    z.instanceof(Blob),
    z.object({
      size: z.number(),
      type: z.string(),
    })
  ]),
  extension: z.string(),
  id: z.string(),
  timestamp: z.number(),
  name: z.string(),
  thumbnailUrl: z.string().url().optional(),
  size: z.number().positive().optional(),
  duration: z.number().positive().optional(),
  settings: videoSettingsSchema.optional(),
});

/**
 * User Preferences Schema
 */
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().optional(),
  quality: z.enum(['low', 'medium', 'high']).optional(),
  autoSave: z.boolean().optional(),
  defaultSettings: videoSettingsSchema.optional(),
});

/**
 * Performance Settings Schema
 */
export const performanceSettingsSchema = z.object({
  memoryLimit: z.number().min(100, 'Memory limit must be at least 100MB').max(2000, 'Memory limit must be at most 2000MB').optional(),
  threadCount: z.number().int().min(1, 'Thread count must be at least 1').max(16, 'Thread count must be at most 16').optional(),
  cacheSize: z.number().min(50, 'Cache size must be at least 50MB').max(500, 'Cache size must be at most 500MB').optional(),
});

/**
 * Notification Settings Schema
 */
export const notificationSettingsSchema = z.object({
  duration: z.number().min(1000, 'Notification duration must be at least 1 second').max(10000, 'Notification duration must be at most 10 seconds').optional(),
  position: z.enum(['top', 'bottom', 'top-right', 'top-left', 'bottom-right', 'bottom-left']).optional(),
});

/**
 * Export Settings Schema
 */
export const exportSettingsSchema = z.object({
  format: z.enum(['mp4', 'webm', 'gif']).optional(),
  quality: z.number().min(1, 'Quality must be at least 1').max(100, 'Quality must be at most 100').optional(),
  filename: z.string().max(255, 'Filename too long').optional(),
});

/**
 * Complete App Settings Schema
 */
export const appSettingsSchema = z.object({
  video: videoSettingsSchema,
  preferences: userPreferencesSchema.optional(),
  performance: performanceSettingsSchema.optional(),
  notifications: notificationSettingsSchema.optional(),
  export: exportSettingsSchema.optional(),
});

// Validation Functions with Zod Integration

/**
 * Validates video settings using Zod schema
 */
export function validateVideoSettingsWithZod(settings: unknown): ValidationResult {
  try {
    videoSettingsSchema.parse(settings);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors };
    }
    return { isValid: false, errors: ['Invalid video settings format'] };
  }
}

/**
 * Validates image file using Zod schema
 */
export function validateImageFileWithZod(file: unknown): ValidationResult {
  try {
    imageFileSchema.parse(file);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors };
    }
    return { isValid: false, errors: ['Invalid image file format'] };
  }
}

/**
 * Validates video generation parameters with enhanced Zod validation
 */
export function validateVideoGenerationWithZod(
  images: unknown,
  settings: unknown,
  selectedCodec: unknown
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate images array
  try {
    const imagesArray = z.array(imageFileSchema).parse(images);
    
    if (imagesArray.length === 0) {
      errors.push('At least one image is required');
    } else if (imagesArray.length > 1000) {
      errors.push('Maximum 1000 images allowed');
    } else if (imagesArray.length > 100) {
      warnings.push('Large image sequence may take longer to process');
    }

    // Check for duplicate IDs
    const ids = imagesArray.map(img => img.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      errors.push('Duplicate image IDs detected');
    }

    // Check total file size
    const totalSize = imagesArray.reduce((sum, img) => sum + img.size, 0);
    const maxTotalSize = 500 * 1024 * 1024; // 500MB
    if (totalSize > maxTotalSize) {
      errors.push('Total file size must be less than 500MB');
    } else if (totalSize > 100 * 1024 * 1024) { // 100MB
      warnings.push('Large total size may affect performance');
    }

  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      errors.push(...zodError.issues.map(err => `Images: ${err.message}`));
    } else {
      errors.push('Invalid images format');
    }
  }

  // Validate settings
  try {
    const validatedSettings = videoSettingsSchema.parse(settings);
    
    // Additional business logic validation
    if (validatedSettings.videoWidth && validatedSettings.videoHeight) {
      const aspectRatio = validatedSettings.videoWidth / validatedSettings.videoHeight;
      if (aspectRatio < 0.5 || aspectRatio > 3) {
        warnings.push('Unusual aspect ratio may affect video quality');
      }
    }

    if (validatedSettings.fps < 1) {
      warnings.push('Very low FPS may result in choppy video');
    } else if (validatedSettings.fps > 30) {
      warnings.push('High FPS may result in large file sizes');
    }

  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      errors.push(...zodError.issues.map(err => `Settings: ${err.message}`));
    } else {
      errors.push('Invalid settings format');
    }
  }

  // Validate codec
  try {
    z.string().min(1, 'Video codec must be selected').parse(selectedCodec);
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      errors.push(...zodError.issues.map(err => `Codec: ${err.message}`));
    } else {
      errors.push('Invalid codec format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates file upload with enhanced validation
 */
export function validateFileUploadWithZod(files: unknown): ValidationResult {
  try {
    const fileList = z.instanceof(FileList).parse(files);
    
    if (fileList.length === 0) {
      return { isValid: false, errors: ['No files selected'] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check each file
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          errors.push(`File "${file.name}": Must be an image file`);
          continue;
        }

        // Validate file size
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          errors.push(`File "${file.name}": Size must be less than 50MB`);
          continue;
        } else if (file.size > 10 * 1024 * 1024) { // 10MB
          warnings.push(`File "${file.name}": Large file size may slow down processing`);
        }

        // Validate file name
        if (file.name.length > 255) {
          errors.push(`File "${file.name}": Name too long`);
          continue;
        }

      } catch (fileError) {
        errors.push(`File "${file.name}": Invalid file format`);
      }
    }

    // Check for duplicates
    const fileNames = Array.from(fileList).map(f => f.name);
    const uniqueNames = new Set(fileNames);
    if (fileNames.length !== uniqueNames.size) {
      warnings.push('Duplicate file names detected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    return { isValid: false, errors: ['Invalid file list format'] };
  }
}

/**
 * Validates all settings at once with Zod
 */
export function validateAllSettingsWithZod(settings: unknown): ValidationResult {
  try {
    appSettingsSchema.parse(settings);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors };
    }
    return { isValid: false, errors: ['Invalid settings format'] };
  }
}

// Legacy validation functions (kept for backward compatibility)

/**
 * Validates video settings
 */
export function validateVideoSettings(settings: VideoSettings): ValidationResult {
  return validateVideoSettingsWithZod(settings);
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
  return validateVideoGenerationWithZod(images, settings, selectedCodec);
}

/**
 * Validates file upload
 */
export function validateFileUpload(files: FileList): ValidationResult {
  return validateFileUploadWithZod(files);
}

/**
 * Validates user preferences
 */
export function validateUserPreferences(preferences: any): ValidationResult {
  try {
    userPreferencesSchema.parse(preferences);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors };
    }
    return { isValid: false, errors: ['Invalid preferences format'] };
  }
}

/**
 * Validates performance settings
 */
export function validatePerformanceSettings(settings: any): ValidationResult {
  try {
    performanceSettingsSchema.parse(settings);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors };
    }
    return { isValid: false, errors: ['Invalid performance settings format'] };
  }
}

/**
 * Validates notification settings
 */
export function validateNotificationSettings(settings: any): ValidationResult {
  try {
    notificationSettingsSchema.parse(settings);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors };
    }
    return { isValid: false, errors: ['Invalid notification settings format'] };
  }
}

/**
 * Validates export settings
 */
export function validateExportSettings(settings: any): ValidationResult {
  try {
    exportSettingsSchema.parse(settings);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors };
    }
    return { isValid: false, errors: ['Invalid export settings format'] };
  }
}

/**
 * Validates all settings at once
 */
export function validateAllSettings(settings: any): ValidationResult {
  return validateAllSettingsWithZod(settings);
}

// Utility functions for working with Zod schemas

/**
 * Safe parse with error handling
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Partial validation - only validates provided fields
 */
export function validatePartial<T>(schema: z.ZodSchema<T>, data: Partial<T>): ValidationResult {
  try {
    schema.partial().parse(data);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues)) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors };
    }
    return { isValid: false, errors: ['Invalid data format'] };
  }
}