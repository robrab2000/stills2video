import React from 'react';
import { AppError, AppWarning } from '../../types';

interface ErrorDisplayProps {
  errors?: AppError[];
  warnings?: AppWarning[];
  onResolveError?: (errorId: string) => void;
  onDismissWarning?: (warningId: string) => void;
  onClearAll?: () => void;
  showClearAll?: boolean;
  maxDisplay?: number;
  className?: string;
}

interface ErrorItemProps {
  error: AppError;
  onResolve: (errorId: string) => void;
}

interface WarningItemProps {
  warning: AppWarning;
  onDismiss: (warningId: string) => void;
}

/**
 * Individual error item component
 */
function ErrorItem({ error, onResolve }: ErrorItemProps) {
  const getErrorIcon = (type: AppError['type']) => {
    switch (type) {
      case 'validation':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'network':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  const getErrorTypeLabel = (type: AppError['type']) => {
    switch (type) {
      case 'validation':
        return 'Validation Error';
      case 'processing':
        return 'Processing Error';
      case 'network':
        return 'Network Error';
      case 'system':
        return 'System Error';
      default:
        return 'Error';
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getErrorIcon(error.type)}
        </div>
        
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-red-800">
              {getErrorTypeLabel(error.type)}
            </h3>
            <span className="text-xs text-red-600">
              {new Date(error.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <p className="mt-1 text-sm text-red-700">
            {error.message}
          </p>
          
          {error.details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                Show Details
              </summary>
              <p className="mt-1 text-xs text-red-600 bg-red-100 p-2 rounded">
                {error.details}
              </p>
            </details>
          )}
          
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => onResolve(error.id)}
              className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Resolve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual warning item component
 */
function WarningItem({ warning, onDismiss }: WarningItemProps) {
  const getWarningIcon = (type: AppWarning['type']) => {
    switch (type) {
      case 'performance':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'compatibility':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'quality':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  const getWarningTypeLabel = (type: AppWarning['type']) => {
    switch (type) {
      case 'performance':
        return 'Performance Warning';
      case 'compatibility':
        return 'Compatibility Warning';
      case 'quality':
        return 'Quality Warning';
      default:
        return 'Warning';
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getWarningIcon(warning.type)}
        </div>
        
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-yellow-800">
              {getWarningTypeLabel(warning.type)}
            </h3>
            <span className="text-xs text-yellow-600">
              {new Date(warning.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <p className="mt-1 text-sm text-yellow-700">
            {warning.message}
          </p>
          
          {warning.details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-yellow-600 hover:text-yellow-800">
                Show Details
              </summary>
              <p className="mt-1 text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
                {warning.details}
              </p>
            </details>
          )}
          
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => onDismiss(warning.id)}
              className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm font-medium hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Error Display Component
 */
export function ErrorDisplay({
  errors = [],
  warnings = [],
  onResolveError,
  onDismissWarning,
  onClearAll,
  showClearAll = true,
  maxDisplay = 5,
  className = ''
}: ErrorDisplayProps) {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const hasAnyIssues = hasErrors || hasWarnings;

  if (!hasAnyIssues) {
    return null;
  }

  const displayErrors = errors.slice(0, maxDisplay);
  const displayWarnings = warnings.slice(0, maxDisplay);
  const hiddenErrors = errors.length - displayErrors.length;
  const hiddenWarnings = warnings.length - displayWarnings.length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Errors Section */}
      {hasErrors && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-red-800">
              Errors ({errors.length})
            </h2>
            {showClearAll && onClearAll && (
              <button
                onClick={onClearAll}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {displayErrors.map((error) => (
              <ErrorItem
                key={error.id}
                error={error}
                onResolve={onResolveError || (() => {})}
              />
            ))}
            
            {hiddenErrors > 0 && (
              <div className="text-sm text-red-600 text-center py-2">
                +{hiddenErrors} more error{hiddenErrors !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {hasWarnings && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-yellow-800">
              Warnings ({warnings.length})
            </h2>
            {showClearAll && onClearAll && (
              <button
                onClick={onClearAll}
                className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {displayWarnings.map((warning) => (
              <WarningItem
                key={warning.id}
                warning={warning}
                onDismiss={onDismissWarning || (() => {})}
              />
            ))}
            
            {hiddenWarnings > 0 && (
              <div className="text-sm text-yellow-600 text-center py-2">
                +{hiddenWarnings} more warning{hiddenWarnings !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Error Display for inline use
 */
export function CompactErrorDisplay({
  errors = [],
  warnings = [],
  onResolveError,
  onDismissWarning,
  className = ''
}: ErrorDisplayProps) {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    return null;
  }

  return (
    <div className={`text-sm ${className}`}>
      {hasErrors && (
        <div className="flex items-center text-red-600 mb-1">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>{errors.length} error{errors.length !== 1 ? 's' : ''}</span>
        </div>
      )}
      
      {hasWarnings && (
        <div className="flex items-center text-yellow-600">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}