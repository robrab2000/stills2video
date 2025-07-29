import { AppError, AppWarning } from '../types';
import { toast } from 'sonner';

export interface ErrorContext {
  operation: string;
  component?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
}

export interface ErrorDetails {
  type: AppError['type'];
  message: string;
  details?: string;
  context?: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

/**
 * Error Service for centralized error handling
 */
export class ErrorService {
  private static errorHistory: AppError[] = [];
  private static warningHistory: AppWarning[] = [];
  private static maxHistorySize = 100;

  /**
   * Handle validation errors
   */
  static handleValidationError(
    errors: string[],
    context: string,
    showToast: boolean = true
  ): AppError {
    const error: AppError = {
      id: this.generateErrorId(),
      type: 'validation',
      message: errors.join('; '),
      details: `Validation failed for: ${context}`,
      timestamp: Date.now(),
      resolved: false
    };

    this.logError(error);
    this.addToHistory(error);

    if (showToast) {
      toast.error(`Validation Error: ${error.message}`);
    }

    return error;
  }

  /**
   * Handle processing errors (video generation, file processing, etc.)
   */
  static handleProcessingError(
    error: Error,
    context: string,
    showToast: boolean = true
  ): AppError {
    const errorDetails = this.categorizeProcessingError(error);
    
    const appError: AppError = {
      id: this.generateErrorId(),
      type: 'processing',
      message: errorDetails.message,
      details: `${context}: ${error.message}`,
      timestamp: Date.now(),
      resolved: false
    };

    this.logError(appError);
    this.addToHistory(appError);

    if (showToast) {
      toast.error(`Processing Error: ${errorDetails.message}`);
    }

    return appError;
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(
    error: Error,
    context: string,
    showToast: boolean = true
  ): AppError {
    const appError: AppError = {
      id: this.generateErrorId(),
      type: 'network',
      message: 'Network connection error',
      details: `${context}: ${error.message}`,
      timestamp: Date.now(),
      resolved: false
    };

    this.logError(appError);
    this.addToHistory(appError);

    if (showToast) {
      toast.error('Network Error: Please check your connection and try again');
    }

    return appError;
  }

  /**
   * Handle system errors
   */
  static handleSystemError(
    error: Error,
    context: string,
    showToast: boolean = true
  ): AppError {
    const appError: AppError = {
      id: this.generateErrorId(),
      type: 'system',
      message: 'System error occurred',
      details: `${context}: ${error.message}`,
      timestamp: Date.now(),
      resolved: false
    };

    this.logError(appError);
    this.addToHistory(appError);

    if (showToast) {
      toast.error('System Error: Please refresh the page and try again');
    }

    return appError;
  }

  /**
   * Handle file-related errors
   */
  static handleFileError(
    error: Error,
    fileName: string,
    operation: string,
    showToast: boolean = true
  ): AppError {
    const appError: AppError = {
      id: this.generateErrorId(),
      type: 'processing',
      message: `File error: ${operation}`,
      details: `File: ${fileName}, Operation: ${operation}, Error: ${error.message}`,
      timestamp: Date.now(),
      resolved: false
    };

    this.logError(appError);
    this.addToHistory(appError);

    if (showToast) {
      toast.error(`File Error: Unable to ${operation} "${fileName}"`);
    }

    return appError;
  }

  /**
   * Handle video generation specific errors
   */
  static handleVideoGenerationError(
    error: Error,
    settings: any,
    showToast: boolean = true
  ): AppError {
    const errorDetails = this.categorizeVideoError(error);
    
    const appError: AppError = {
      id: this.generateErrorId(),
      type: 'processing',
      message: errorDetails.message,
      details: `Video Generation: ${error.message}, Settings: ${JSON.stringify(settings)}`,
      timestamp: Date.now(),
      resolved: false
    };

    this.logError(appError);
    this.addToHistory(appError);

    if (showToast) {
      toast.error(`Video Generation Error: ${errorDetails.message}`);
    }

    return appError;
  }

  /**
   * Add a warning
   */
  static addWarning(
    type: AppWarning['type'],
    message: string,
    details?: string,
    showToast: boolean = false
  ): AppWarning {
    const warning: AppWarning = {
      id: this.generateWarningId(),
      type,
      message,
      details,
      timestamp: Date.now(),
      dismissed: false
    };

    this.logWarning(warning);
    this.addWarningToHistory(warning);

    if (showToast) {
      toast.warning(message);
    }

    return warning;
  }

  /**
   * Resolve an error
   */
  static resolveError(errorId: string): void {
    const error = this.errorHistory.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      console.log(`Error resolved: ${errorId}`);
    }
  }

  /**
   * Dismiss a warning
   */
  static dismissWarning(warningId: string): void {
    const warning = this.warningHistory.find(w => w.id === warningId);
    if (warning) {
      warning.dismissed = true;
      console.log(`Warning dismissed: ${warningId}`);
    }
  }

  /**
   * Get all unresolved errors
   */
  static getUnresolvedErrors(): AppError[] {
    return this.errorHistory.filter(error => !error.resolved);
  }

  /**
   * Get all undismissed warnings
   */
  static getUndismissedWarnings(): AppWarning[] {
    return this.warningHistory.filter(warning => !warning.dismissed);
  }

  /**
   * Clear error history
   */
  static clearErrorHistory(): void {
    this.errorHistory = [];
    console.log('Error history cleared');
  }

  /**
   * Clear warning history
   */
  static clearWarningHistory(): void {
    this.warningHistory = [];
    console.log('Warning history cleared');
  }

  /**
   * Get error statistics
   */
  static getErrorStats() {
    const totalErrors = this.errorHistory.length;
    const resolvedErrors = this.errorHistory.filter(e => e.resolved).length;
    const unresolvedErrors = totalErrors - resolvedErrors;
    
    const errorTypes = this.errorHistory.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalErrors,
      resolved: resolvedErrors,
      unresolved: unresolvedErrors,
      byType: errorTypes
    };
  }

  /**
   * Private methods
   */
  private static generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateWarningId(): string {
    return `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static logError(error: AppError): void {
    console.error('ErrorService - Error:', {
      id: error.id,
      type: error.type,
      message: error.message,
      details: error.details,
      timestamp: new Date(error.timestamp).toISOString()
    });

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement error tracking service (e.g., Sentry)
      this.sendToErrorTracking(error);
    }
  }

  private static logWarning(warning: AppWarning): void {
    console.warn('ErrorService - Warning:', {
      id: warning.id,
      type: warning.type,
      message: warning.message,
      details: warning.details,
      timestamp: new Date(warning.timestamp).toISOString()
    });
  }

  private static addToHistory(error: AppError): void {
    this.errorHistory.unshift(error);
    
    // Keep history size manageable
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  private static addWarningToHistory(warning: AppWarning): void {
    this.warningHistory.unshift(warning);
    
    // Keep history size manageable
    if (this.warningHistory.length > this.maxHistorySize) {
      this.warningHistory = this.warningHistory.slice(0, this.maxHistorySize);
    }
  }

  private static categorizeProcessingError(error: Error): ErrorDetails {
    const message = error.message.toLowerCase();
    
    if (message.includes('memory') || message.includes('out of memory')) {
      return {
        type: 'processing',
        message: 'Insufficient memory for processing',
        severity: 'high',
        recoverable: true
      };
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: 'processing',
        message: 'Processing timed out',
        severity: 'medium',
        recoverable: true
      };
    }
    
    if (message.includes('format') || message.includes('unsupported')) {
      return {
        type: 'processing',
        message: 'Unsupported file format',
        severity: 'medium',
        recoverable: true
      };
    }
    
    return {
      type: 'processing',
      message: 'Processing failed',
      severity: 'medium',
      recoverable: true
    };
  }

  private static categorizeVideoError(error: Error): ErrorDetails {
    const message = error.message.toLowerCase();
    
    if (message.includes('codec') || message.includes('encoder')) {
      return {
        type: 'processing',
        message: 'Video codec not supported',
        severity: 'medium',
        recoverable: true
      };
    }
    
    if (message.includes('canvas') || message.includes('drawing')) {
      return {
        type: 'processing',
        message: 'Canvas rendering error',
        severity: 'high',
        recoverable: true
      };
    }
    
    if (message.includes('blob') || message.includes('stream')) {
      return {
        type: 'processing',
        message: 'Video stream creation failed',
        severity: 'high',
        recoverable: true
      };
    }
    
    return {
      type: 'processing',
      message: 'Video generation failed',
      severity: 'medium',
      recoverable: true
    };
  }

  private static sendToErrorTracking(error: AppError): void {
    // TODO: Implement error tracking service integration
    // Example: Sentry, LogRocket, etc.
    console.log('Sending error to tracking service:', error);
  }
}

/**
 * Error utility functions
 */
export const ErrorUtils = {
  /**
   * Check if error is recoverable
   */
  isRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();
    return !message.includes('fatal') && !message.includes('critical');
  },

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('network')) {
      return 'Please check your internet connection and try again';
    }
    
    if (message.includes('permission')) {
      return 'Permission denied. Please check your browser settings';
    }
    
    if (message.includes('quota')) {
      return 'Storage quota exceeded. Please free up some space';
    }
    
    if (message.includes('timeout')) {
      return 'Operation timed out. Please try again';
    }
    
    return 'An unexpected error occurred. Please try again';
  },

  /**
   * Format error for display
   */
  formatErrorForDisplay(error: AppError): string {
    return `${error.message}${error.details ? ` (${error.details})` : ''}`;
  },

  /**
   * Check if error should be retried
   */
  shouldRetry(error: Error, retryCount: number = 0): boolean {
    const maxRetries = 3;
    const message = error.message.toLowerCase();
    
    // Don't retry on certain errors
    if (message.includes('validation') || message.includes('permission')) {
      return false;
    }
    
    return retryCount < maxRetries;
  }
};