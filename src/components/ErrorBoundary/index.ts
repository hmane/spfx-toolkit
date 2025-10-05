// Error Boundary Component Exports

export { default as ErrorBoundary, withErrorBoundary, useErrorHandler } from './ErrorBoundary';

// Export all types
export type {
  IErrorInfo,
  IErrorDetails,
  IErrorBoundaryState,
  IErrorBoundaryProps,
  IErrorFallbackProps,
  IUserFriendlyMessages,
  ISPFxContext,
  ErrorSeverity,
  ErrorCategory,
} from './ErrorBoundary';

// Export constants for error levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// Export predefined configurations
export const ERROR_BOUNDARY_CONFIGS = {
  // Minimal error boundary for small components
  MINIMAL: {
    enableRetry: false,
    showDetailsButton: false,
    maxRetries: 0,
    logLevel: 'minimal' as const,
    enableConsoleLogging: true,
    userFriendlyMessages: {
      title: 'Component Error',
      description: 'This component encountered an error and cannot be displayed.',
      retryButtonText: 'Retry',
      detailsButtonText: 'Details',
      closeButtonText: 'Close',
      dismissButtonText: 'Dismiss',
    },
  },

  // Standard configuration for most components
  STANDARD: {
    enableRetry: true,
    showDetailsButton: true,
    maxRetries: 3,
    logLevel: 'detailed' as const,
    enableConsoleLogging: true,
    resetOnPropsChange: true,
  },

  // Enhanced configuration for critical components
  ENHANCED: {
    enableRetry: true,
    showDetailsButton: true,
    maxRetries: 5,
    logLevel: 'verbose' as const,
    enableConsoleLogging: true,
    resetOnPropsChange: true,
  },

  // Development configuration with full debugging
  DEVELOPMENT: {
    enableRetry: true,
    showDetailsButton: true,
    maxRetries: 10,
    logLevel: 'verbose' as const,
    enableConsoleLogging: true,
    isDevelopment: true,
    resetOnPropsChange: true,
  },

  // Production configuration with minimal logging
  PRODUCTION: {
    enableRetry: true,
    showDetailsButton: false,
    maxRetries: 2,
    logLevel: 'minimal' as const,
    enableConsoleLogging: false,
    isDevelopment: false,
  },
} as const;
