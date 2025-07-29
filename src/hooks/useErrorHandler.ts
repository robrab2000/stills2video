import { useCallback, useRef, useState } from 'react';
import { ErrorService, ErrorUtils } from '../services/errorService';
import { AppError, AppWarning } from '../types';

export interface ErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToast?: boolean;
  logError?: boolean;
}

export interface UseErrorHandlerReturn {
  // Error state
  errors: AppError[];
  warnings: AppWarning[];
  hasErrors: boolean;
  hasWarnings: boolean;
  
  // Error handling functions
  handleError: (error: Error, context: string, options?: ErrorHandlerOptions) => AppError;
  handleValidationError: (errors: string[], context: string, options?: ErrorHandlerOptions) => AppError;
  handleProcessingError: (error: Error, context: string, options?: ErrorHandlerOptions) => AppError;
  handleNetworkError: (error: Error, context: string, options?: ErrorHandlerOptions) => AppError;
  handleSystemError: (error: Error, context: string, options?: ErrorHandlerOptions) => AppError;
  handleFileError: (error: Error, fileName: string, operation: string, options?: ErrorHandlerOptions) => AppError;
  handleVideoGenerationError: (error: Error, settings: any, options?: ErrorHandlerOptions) => AppError;
  
  // Warning functions
  addWarning: (type: AppWarning['type'], message: string, details?: string, options?: ErrorHandlerOptions) => AppWarning;
  
  // Error management
  resolveError: (errorId: string) => void;
  dismissWarning: (warningId: string) => void;
  clearErrors: () => void;
  clearWarnings: () => void;
  
  // Retry functionality
  retryOperation: <T>(
    operation: () => Promise<T>,
    context: string,
    options?: ErrorHandlerOptions
  ) => Promise<T>;
  
  // Utility functions
  getErrorStats: () => ReturnType<typeof ErrorService.getErrorStats>;
  isRecoverable: (error: Error) => boolean;
  getUserFriendlyMessage: (error: Error) => string;
}

/**
 * Custom hook for comprehensive error handling
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [warnings, setWarnings] = useState<AppWarning[]>([]);
  const retryCountRef = useRef<Map<string, number>>(new Map());

  // Update errors and warnings from ErrorService
  const updateErrorState = useCallback(() => {
    setErrors(ErrorService.getUnresolvedErrors());
    setWarnings(ErrorService.getUndismissedWarnings());
  }, []);

  // Generic error handler
  const handleError = useCallback((
    error: Error,
    context: string,
    options: ErrorHandlerOptions = {}
  ): AppError => {
    const { showToast = true, logError = true } = options;
    
    const appError = ErrorService.handleProcessingError(error, context, showToast);
    
    if (logError) {
      console.error(`[${context}] Error:`, error);
    }
    
    updateErrorState();
    return appError;
  }, [updateErrorState]);

  // Validation error handler
  const handleValidationError = useCallback((
    errors: string[],
    context: string,
    options: ErrorHandlerOptions = {}
  ): AppError => {
    const { showToast = true } = options;
    
    const appError = ErrorService.handleValidationError(errors, context, showToast);
    updateErrorState();
    return appError;
  }, [updateErrorState]);

  // Processing error handler
  const handleProcessingError = useCallback((
    error: Error,
    context: string,
    options: ErrorHandlerOptions = {}
  ): AppError => {
    return handleError(error, context, options);
  }, [handleError]);

  // Network error handler
  const handleNetworkError = useCallback((
    error: Error,
    context: string,
    options: ErrorHandlerOptions = {}
  ): AppError => {
    const { showToast = true, logError = true } = options;
    
    const appError = ErrorService.handleNetworkError(error, context, showToast);
    
    if (logError) {
      console.error(`[${context}] Network Error:`, error);
    }
    
    updateErrorState();
    return appError;
  }, [updateErrorState]);

  // System error handler
  const handleSystemError = useCallback((
    error: Error,
    context: string,
    options: ErrorHandlerOptions = {}
  ): AppError => {
    const { showToast = true, logError = true } = options;
    
    const appError = ErrorService.handleSystemError(error, context, showToast);
    
    if (logError) {
      console.error(`[${context}] System Error:`, error);
    }
    
    updateErrorState();
    return appError;
  }, [updateErrorState]);

  // File error handler
  const handleFileError = useCallback((
    error: Error,
    fileName: string,
    operation: string,
    options: ErrorHandlerOptions = {}
  ): AppError => {
    const { showToast = true, logError = true } = options;
    
    const appError = ErrorService.handleFileError(error, fileName, operation, showToast);
    
    if (logError) {
      console.error(`[File Operation] Error processing "${fileName}":`, error);
    }
    
    updateErrorState();
    return appError;
  }, [updateErrorState]);

  // Video generation error handler
  const handleVideoGenerationError = useCallback((
    error: Error,
    settings: any,
    options: ErrorHandlerOptions = {}
  ): AppError => {
    const { showToast = true, logError = true } = options;
    
    const appError = ErrorService.handleVideoGenerationError(error, settings, showToast);
    
    if (logError) {
      console.error('[Video Generation] Error:', error, 'Settings:', settings);
    }
    
    updateErrorState();
    return appError;
  }, [updateErrorState]);

  // Warning handler
  const addWarning = useCallback((
    type: AppWarning['type'],
    message: string,
    details?: string,
    options: ErrorHandlerOptions = {}
  ): AppWarning => {
    const { showToast = false } = options;
    
    const warning = ErrorService.addWarning(type, message, details, showToast);
    updateErrorState();
    return warning;
  }, [updateErrorState]);

  // Error resolution
  const resolveError = useCallback((errorId: string) => {
    ErrorService.resolveError(errorId);
    updateErrorState();
  }, [updateErrorState]);

  // Warning dismissal
  const dismissWarning = useCallback((warningId: string) => {
    ErrorService.dismissWarning(warningId);
    updateErrorState();
  }, [updateErrorState]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    ErrorService.clearErrorHistory();
    updateErrorState();
  }, [updateErrorState]);

  // Clear all warnings
  const clearWarnings = useCallback(() => {
    ErrorService.clearWarningHistory();
    updateErrorState();
  }, [updateErrorState]);

  // Retry operation with exponential backoff
  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string,
    options: ErrorHandlerOptions = {}
  ): Promise<T> => {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    const operationKey = `${context}_${operation.toString()}`;
    const currentRetries = retryCountRef.current.get(operationKey) || 0;

    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error && ErrorUtils.shouldRetry(error, currentRetries) && currentRetries < maxRetries) {
        const nextRetryCount = currentRetries + 1;
        retryCountRef.current.set(operationKey, nextRetryCount);
        
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, currentRetries);
        
        console.warn(`[${context}] Retry ${nextRetryCount}/${maxRetries} in ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return retryOperation(operation, context, options);
      } else {
        // Max retries reached or error is not retryable
        retryCountRef.current.delete(operationKey);
        throw error;
      }
    }
  }, []);

  // Utility functions
  const getErrorStats = useCallback(() => {
    return ErrorService.getErrorStats();
  }, []);

  const isRecoverable = useCallback((error: Error) => {
    return ErrorUtils.isRecoverable(error);
  }, []);

  const getUserFriendlyMessage = useCallback((error: Error) => {
    return ErrorUtils.getUserFriendlyMessage(error);
  }, []);

  return {
    // Error state
    errors,
    warnings,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    
    // Error handling functions
    handleError,
    handleValidationError,
    handleProcessingError,
    handleNetworkError,
    handleSystemError,
    handleFileError,
    handleVideoGenerationError,
    
    // Warning functions
    addWarning,
    
    // Error management
    resolveError,
    dismissWarning,
    clearErrors,
    clearWarnings,
    
    // Retry functionality
    retryOperation,
    
    // Utility functions
    getErrorStats,
    isRecoverable,
    getUserFriendlyMessage,
  };
}

/**
 * Hook for handling async operations with error handling
 */
export function useAsyncErrorHandler() {
  const errorHandler = useErrorHandler();
  const [isLoading, setIsLoading] = useState(false);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    setIsLoading(true);
    
    try {
      const result = await errorHandler.retryOperation(operation, context, options);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        errorHandler.handleError(error, context, options);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [errorHandler]);

  return {
    ...errorHandler,
    isLoading,
    executeWithErrorHandling,
  };
}

/**
 * Hook for form validation with error handling
 */
export function useFormErrorHandler() {
  const errorHandler = useErrorHandler();

  const validateForm = useCallback((
    validationFn: () => { isValid: boolean; errors: string[] },
    context: string,
    options: ErrorHandlerOptions = {}
  ): boolean => {
    const result = validationFn();
    
    if (!result.isValid) {
      errorHandler.handleValidationError(result.errors, context, options);
      return false;
    }
    
    return true;
  }, [errorHandler]);

  return {
    ...errorHandler,
    validateForm,
  };
}