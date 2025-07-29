import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorService, ErrorUtils } from '../../services/errorService';
import { 
  validateVideoSettingsWithZod, 
  validateImageFileWithZod, 
  validateVideoGenerationWithZod,
  videoSettingsSchema,
  imageFileSchema,
  safeParse,
  validatePartial
} from '../../lib/validation';
import { VideoSettings, ImageFile } from '../../types';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Phase 5: Error Handling & Validation', () => {
  beforeEach(() => {
    // Clear error history before each test
    ErrorService.clearErrorHistory();
    ErrorService.clearWarningHistory();
    vi.clearAllMocks();
  });

  describe('ErrorService', () => {
    it('should handle validation errors correctly', () => {
      const errors = ['FPS must be between 0.1 and 60', 'Video width must be at least 480 pixels'];
      const context = 'video-settings';
      
      const result = ErrorService.handleValidationError(errors, context, false);
      
      expect(result.type).toBe('validation');
      expect(result.message).toBe(errors.join('; '));
      expect(result.details).toBe(`Validation failed for: ${context}`);
      expect(result.resolved).toBe(false);
    });

    it('should handle processing errors correctly', () => {
      const error = new Error('Canvas rendering failed');
      const context = 'video-generation';
      
      const result = ErrorService.handleProcessingError(error, context, false);
      
      expect(result.type).toBe('processing');
      expect(result.message).toBe('Processing failed');
      expect(result.details).toBe(`${context}: ${error.message}`);
      expect(result.resolved).toBe(false);
    });

    it('should handle network errors correctly', () => {
      const error = new Error('Network timeout');
      const context = 'file-upload';
      
      const result = ErrorService.handleNetworkError(error, context, false);
      
      expect(result.type).toBe('network');
      expect(result.message).toBe('Network connection error');
      expect(result.details).toBe(`${context}: ${error.message}`);
      expect(result.resolved).toBe(false);
    });

    it('should handle file errors correctly', () => {
      const error = new Error('File too large');
      const fileName = 'test.jpg';
      const operation = 'upload';
      
      const result = ErrorService.handleFileError(error, fileName, operation, false);
      
      expect(result.type).toBe('processing');
      expect(result.message).toBe('File error: upload');
      expect(result.details).toBe(`File: ${fileName}, Operation: ${operation}, Error: ${error.message}`);
      expect(result.resolved).toBe(false);
    });

    it('should add warnings correctly', () => {
      const type = 'performance' as const;
      const message = 'Large file size may slow down processing';
      const details = 'File size exceeds 10MB';
      
      const result = ErrorService.addWarning(type, message, details, false);
      
      expect(result.type).toBe(type);
      expect(result.message).toBe(message);
      expect(result.details).toBe(details);
      expect(result.dismissed).toBe(false);
    });

    it('should resolve errors correctly', () => {
      const error = ErrorService.handleValidationError(['Test error'], 'test', false);
      
      ErrorService.resolveError(error.id);
      
      const unresolvedErrors = ErrorService.getUnresolvedErrors();
      expect(unresolvedErrors).toHaveLength(0);
    });

    it('should dismiss warnings correctly', () => {
      const warning = ErrorService.addWarning('performance', 'Test warning', undefined, false);
      
      ErrorService.dismissWarning(warning.id);
      
      const undismissedWarnings = ErrorService.getUndismissedWarnings();
      expect(undismissedWarnings).toHaveLength(0);
    });

    it('should provide error statistics', () => {
      ErrorService.handleValidationError(['Error 1'], 'test1', false);
      ErrorService.handleProcessingError(new Error('Error 2'), 'test2', false);
      ErrorService.resolveError(ErrorService.getUnresolvedErrors()[0].id);
      
      const stats = ErrorService.getErrorStats();
      
      expect(stats.total).toBe(2);
      expect(stats.resolved).toBe(1);
      expect(stats.unresolved).toBe(1);
      expect(stats.byType.validation).toBe(1);
      expect(stats.byType.processing).toBe(1);
    });
  });

  describe('Zod Validation Schemas', () => {
    describe('videoSettingsSchema', () => {
      it('should validate correct video settings', () => {
        const validSettings: VideoSettings = {
          fps: 30,
          videoWidth: 1920,
          videoHeight: 1080,
          selectedCodec: 'video/mp4',
          quality: 'high'
        };
        
        const result = validateVideoSettingsWithZod(validSettings);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid FPS values', () => {
        const invalidSettings = {
          fps: 100, // Too high
          videoWidth: 1920,
          videoHeight: 1080,
          selectedCodec: 'video/mp4'
        };
        
        const result = validateVideoSettingsWithZod(invalidSettings);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(err => err.includes('FPS must be at most 60'))).toBe(true);
      });

      it('should reject invalid resolution values', () => {
        const invalidSettings = {
          fps: 30,
          videoWidth: 100, // Too low
          videoHeight: 1080,
          selectedCodec: 'video/mp4'
        };
        
        const result = validateVideoSettingsWithZod(invalidSettings);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(err => err.includes('Video width must be at least 480 pixels'))).toBe(true);
      });

      it('should reject missing codec', () => {
        const invalidSettings = {
          fps: 30,
          videoWidth: 1920,
          videoHeight: 1080,
          selectedCodec: '' // Empty string
        };
        
        const result = validateVideoSettingsWithZod(invalidSettings);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(err => err.includes('Video codec must be selected'))).toBe(true);
      });
    });

    describe('imageFileSchema', () => {
      it('should validate correct image file', () => {
        const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const validImageFile = {
          id: 'test-id',
          file: mockFile,
          url: 'blob:http://localhost:3000/test',
          name: 'test.jpg',
          size: 1024,
          lastModified: Date.now(),
          type: 'image/jpeg'
        };
        
        const result = validateImageFileWithZod(validImageFile);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid file type', () => {
        const mockFile = new File([''], 'test.txt', { type: 'text/plain' });
        const invalidImageFile = {
          id: 'test-id',
          file: mockFile,
          url: 'blob:http://localhost:3000/test',
          name: 'test.txt',
          size: 1024,
          lastModified: Date.now(),
          type: 'text/plain' // Not an image
        };
        
        const result = validateImageFileWithZod(invalidImageFile);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(err => err.includes('File must be an image'))).toBe(true);
      });

      it('should reject invalid URL', () => {
        const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const invalidImageFile = {
          id: 'test-id',
          file: mockFile,
          url: 'invalid-url', // Invalid URL
          name: 'test.jpg',
          size: 1024,
          lastModified: Date.now(),
          type: 'image/jpeg'
        };
        
        const result = validateImageFileWithZod(invalidImageFile);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(err => err.includes('Invalid URL'))).toBe(true);
      });
    });

    describe('validateVideoGenerationWithZod', () => {
      it('should validate correct video generation parameters', () => {
        const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const images: ImageFile[] = [{
          id: 'test-id',
          file: mockFile,
          url: 'blob:http://localhost:3000/test',
          name: 'test.jpg',
          size: 1024,
          lastModified: Date.now(),
          type: 'image/jpeg'
        }];
        
        const settings: VideoSettings = {
          fps: 30,
          videoWidth: 1920,
          videoHeight: 1080,
          selectedCodec: 'video/mp4'
        };
        
        const result = validateVideoGenerationWithZod(images, settings, 'video/mp4');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty images array', () => {
        const settings: VideoSettings = {
          fps: 30,
          videoWidth: 1920,
          videoHeight: 1080,
          selectedCodec: 'video/mp4'
        };
        
        const result = validateVideoGenerationWithZod([], settings, 'video/mp4');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('At least one image is required');
      });

      it('should reject too many images', () => {
        const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const images = Array.from({ length: 1001 }, (_, i) => ({
          id: `test-${i}`,
          file: mockFile,
          url: `blob:http://localhost:3000/test-${i}`,
          name: `test-${i}.jpg`,
          size: 1024,
          lastModified: Date.now(),
          type: 'image/jpeg'
        }));
        
        const settings: VideoSettings = {
          fps: 30,
          videoWidth: 1920,
          videoHeight: 1080,
          selectedCodec: 'video/mp4'
        };
        
        const result = validateVideoGenerationWithZod(images, settings, 'video/mp4');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 1000 images allowed');
      });

      it('should detect duplicate image IDs', () => {
        const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const images: ImageFile[] = [
          {
            id: 'duplicate-id',
            file: mockFile,
            url: 'blob:http://localhost:3000/test1',
            name: 'test1.jpg',
            size: 1024,
            lastModified: Date.now(),
            type: 'image/jpeg'
          },
          {
            id: 'duplicate-id', // Duplicate ID
            file: mockFile,
            url: 'blob:http://localhost:3000/test2',
            name: 'test2.jpg',
            size: 1024,
            lastModified: Date.now(),
            type: 'image/jpeg'
          }
        ];
        
        const settings: VideoSettings = {
          fps: 30,
          videoWidth: 1920,
          videoHeight: 1080,
          selectedCodec: 'video/mp4'
        };
        
        const result = validateVideoGenerationWithZod(images, settings, 'video/mp4');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Duplicate image IDs detected');
      });
    });

    describe('safeParse utility', () => {
      it('should return success for valid data', () => {
        const validSettings = {
          fps: 30,
          videoWidth: 1920,
          videoHeight: 1080,
          selectedCodec: 'video/mp4'
        };
        
        const result = safeParse(videoSettingsSchema, validSettings);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validSettings);
        }
      });

      it('should return errors for invalid data', () => {
        const invalidSettings = {
          fps: 100, // Too high
          videoWidth: 1920,
          videoHeight: 1080,
          selectedCodec: 'video/mp4'
        };
        
        const result = safeParse(videoSettingsSchema, invalidSettings);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.some(err => err.includes('FPS must be at most 60'))).toBe(true);
        }
      });
    });

    describe('validatePartial utility', () => {
      it('should validate partial data correctly', () => {
        const partialSettings = {
          fps: 30,
          // Missing other required fields
        };
        
        const result = validatePartial(videoSettingsSchema, partialSettings);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid partial data', () => {
        const invalidPartialSettings = {
          fps: 100, // Invalid FPS
          videoWidth: 1920
        };
        
        const result = validatePartial(videoSettingsSchema, invalidPartialSettings);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(err => err.includes('FPS must be at most 60'))).toBe(true);
      });
    });
  });

  describe('Error Categorization', () => {
    it('should categorize memory errors correctly', () => {
      const error = new Error('Out of memory');
      const result = ErrorService['categorizeProcessingError'](error);
      
      expect(result.message).toBe('Insufficient memory for processing');
      expect(result.severity).toBe('high');
      expect(result.recoverable).toBe(true);
    });

    it('should categorize timeout errors correctly', () => {
      const error = new Error('Operation timed out');
      const result = ErrorService['categorizeProcessingError'](error);
      
      expect(result.message).toBe('Processing timed out');
      expect(result.severity).toBe('medium');
      expect(result.recoverable).toBe(true);
    });

    it('should categorize video codec errors correctly', () => {
      const error = new Error('Unsupported codec');
      const result = ErrorService['categorizeVideoError'](error);
      
      expect(result.message).toBe('Video codec not supported');
      expect(result.severity).toBe('medium');
      expect(result.recoverable).toBe(true);
    });
  });

  describe('Error Utilities', () => {
    it('should check if error is recoverable', () => {
      const recoverableError = new Error('Network timeout');
      const fatalError = new Error('Fatal system error');
      
      expect(ErrorUtils.isRecoverable(recoverableError)).toBe(true);
      expect(ErrorUtils.isRecoverable(fatalError)).toBe(false);
    });

    it('should provide user-friendly error messages', () => {
      const networkError = new Error('Network error');
      const permissionError = new Error('Permission denied');
      const quotaError = new Error('Quota exceeded');
      const timeoutError = new Error('Timeout');
      const unknownError = new Error('Unknown error');
      
      expect(ErrorUtils.getUserFriendlyMessage(networkError)).toContain('internet connection');
      expect(ErrorUtils.getUserFriendlyMessage(permissionError)).toContain('Permission denied');
      expect(ErrorUtils.getUserFriendlyMessage(quotaError)).toContain('Storage quota');
      expect(ErrorUtils.getUserFriendlyMessage(timeoutError)).toContain('timed out');
      expect(ErrorUtils.getUserFriendlyMessage(unknownError)).toContain('unexpected error');
    });

    it('should format errors for display', () => {
      const error = {
        id: 'test-id',
        type: 'validation' as const,
        message: 'Invalid settings',
        details: 'FPS must be between 0.1 and 60',
        timestamp: Date.now(),
        resolved: false
      };
      
      const formatted = ErrorUtils.formatErrorForDisplay(error);
      expect(formatted).toBe('Invalid settings (FPS must be between 0.1 and 60)');
    });

    it('should determine if error should be retried', () => {
      const retryableError = new Error('Network timeout');
      const nonRetryableError = new Error('Validation failed');
      
      expect(ErrorUtils.shouldRetry(retryableError, 0)).toBe(true);
      expect(ErrorUtils.shouldRetry(retryableError, 3)).toBe(false); // Max retries reached
      expect(ErrorUtils.shouldRetry(nonRetryableError, 0)).toBe(false);
    });
  });
});