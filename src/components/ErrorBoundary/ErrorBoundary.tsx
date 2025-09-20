import { Icon } from '@fluentui/react/lib/Icon';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { Modal } from '@fluentui/react/lib/Modal';
import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react/lib/Stack';
import * as React from 'react';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface IErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  eventType?: string;
}

export interface IErrorDetails {
  errorMessage: string;
  stack?: string;
  componentStack?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  buildVersion?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  retryAttempt: number;
  spfxContext?: ISPFxContext;
}

export interface ISPFxContext {
  webAbsoluteUrl?: string;
  userId?: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory =
  | 'component'
  | 'network'
  | 'permission'
  | 'data'
  | 'performance'
  | 'security'
  | 'unknown';

export interface IErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: IErrorInfo | null;
  errorId: string;
  showDetails: boolean;
  retryCount: number;
  isRecovering: boolean;
}

export interface IErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<IErrorFallbackProps>;
  enableRetry?: boolean;
  maxRetries?: number;
  showDetailsButton?: boolean;
  onError?: (error: Error, errorInfo: IErrorInfo, errorDetails: IErrorDetails) => void;
  enableConsoleLogging?: boolean;
  logLevel?: 'minimal' | 'detailed' | 'verbose';
  userFriendlyMessages?: Partial<IUserFriendlyMessages>;
  theme?: 'light' | 'dark' | 'auto';
  isDevelopment?: boolean;
  buildVersion?: string;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  className?: string;
  errorContainerStyle?: React.CSSProperties;
}

export interface IUserFriendlyMessages {
  title: string;
  description: string;
  retryButtonText: string;
  detailsButtonText: string;
  closeButtonText: string;
  recoveringText: string;
}

export interface IErrorFallbackProps {
  error: Error;
  errorInfo: IErrorInfo;
  errorDetails: IErrorDetails;
  onRetry: () => void;
  onShowDetails: () => void;
  retryCount: number;
  maxRetries: number;
  enableRetry: boolean;
  showDetailsButton: boolean;
  userFriendlyMessages: IUserFriendlyMessages;
  theme: 'light' | 'dark';
  isRecovering: boolean;
}

// ============================================================================
// Error Classification Engine
// ============================================================================

class ErrorClassifier {
  static classifyError(error: Error): { severity: ErrorSeverity; category: ErrorCategory } {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    let severity: ErrorSeverity = 'medium';

    if (this.isCriticalError(error, message, stack)) {
      severity = 'critical';
    } else if (this.isHighSeverityError(error, message, stack)) {
      severity = 'high';
    } else if (this.isLowSeverityError(error, message, stack)) {
      severity = 'low';
    }

    const category = this.categorizeError(message, stack);

    return { severity, category };
  }

  private static isCriticalError(error: Error, message: string, stack: string): boolean {
    const criticalPatterns = [
      'security violation',
      'authentication failed',
      'access forbidden',
      'maximum call stack exceeded',
      'out of memory',
      'cannot read property of undefined',
      'cannot read property of null',
      'typeerror: cannot read',
    ];

    const criticalErrorTypes = ['SecurityError', 'ReferenceError', 'TypeError'];

    return (
      criticalPatterns.some(pattern => message.includes(pattern) || stack.includes(pattern)) ||
      criticalErrorTypes.includes(error.name)
    );
  }

  private static isHighSeverityError(error: Error, message: string, stack: string): boolean {
    const highSeverityPatterns = [
      'network error',
      'failed to fetch',
      'connection timeout',
      'cors error',
      'api error',
      'service unavailable',
      'internal server error',
      'sharepoint error',
      'list does not exist',
      'access denied',
      'permission denied',
    ];

    const highSeverityTypes = ['NetworkError', 'AbortError'];

    return (
      highSeverityPatterns.some(pattern => message.includes(pattern) || stack.includes(pattern)) ||
      highSeverityTypes.includes(error.name)
    );
  }

  private static isLowSeverityError(error: Error, message: string, stack: string): boolean {
    const lowSeverityPatterns = [
      'warning',
      'deprecated',
      'deprecation',
      'rendering warning',
      'validation warning',
      'development warning',
    ];

    return lowSeverityPatterns.some(
      pattern => message.includes(pattern) || stack.includes(pattern)
    );
  }

  private static categorizeError(message: string, stack: string): ErrorCategory {
    if (message.includes('fetch') || message.includes('network') || message.includes('cors')) {
      return 'network';
    }

    if (
      message.includes('permission') ||
      message.includes('access') ||
      message.includes('forbidden')
    ) {
      return 'permission';
    }

    if (message.includes('json') || message.includes('parse') || message.includes('invalid data')) {
      return 'data';
    }

    if (
      message.includes('timeout') ||
      message.includes('memory') ||
      message.includes('performance')
    ) {
      return 'performance';
    }

    if (message.includes('security') || message.includes('xss') || message.includes('injection')) {
      return 'security';
    }

    if (stack.includes('react') || message.includes('component') || message.includes('render')) {
      return 'component';
    }

    return 'unknown';
  }
}

// ============================================================================
// SPFx Context Extractor
// ============================================================================

class SPFxContextExtractor {
  static extractContext(): ISPFxContext {
    const context: ISPFxContext = {};

    try {
      const spContext = (window as any)._spPageContextInfo;
      if (spContext) {
        context.webAbsoluteUrl = spContext.webAbsoluteUrl;
        context.userId = spContext.userId?.toString();
      }
    } catch (error) {
      // Fail silently
    }

    return context;
  }
}

// ============================================================================
// Default Error Fallback Component
// ============================================================================

const DefaultErrorFallback: React.FC<IErrorFallbackProps> = React.memo(
  ({
    error,
    errorDetails,
    onRetry,
    onShowDetails,
    retryCount,
    maxRetries,
    enableRetry,
    showDetailsButton,
    userFriendlyMessages,
    theme,
    isRecovering,
  }) => {
    const canRetry = enableRetry && retryCount < maxRetries;

    const getSeverityColor = (): string => {
      switch (errorDetails.severity) {
        case 'critical':
          return '#e53e3e';
        case 'high':
          return '#dd6b20';
        case 'medium':
          return '#d69e2e';
        case 'low':
          return '#38a169';
        default:
          return '#718096';
      }
    };

    const containerStyle: React.CSSProperties = {
      fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", sans-serif',
      borderRadius: '8px',
      position: 'relative',
      maxWidth: '600px',
      margin: '16px auto',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      background: theme === 'dark' ? '#2d3748' : '#ffffff',
      color: theme === 'dark' ? '#f7fafc' : '#2d3748',
    };

    return (
      <div style={containerStyle}>
        {/* Severity indicator stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: getSeverityColor(),
            borderRadius: '8px 8px 0 0',
          }}
        />

        <div style={{ padding: '24px' }}>
          {/* Recovery indicator */}
          {isRecovering && (
            <div
              style={{
                marginBottom: '16px',
                textAlign: 'center',
                fontSize: '14px',
                color: '#718096',
              }}
            >
              {userFriendlyMessages.recoveringText}
            </div>
          )}

          {/* Header with severity badge */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: getSeverityColor(),
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  marginRight: '8px',
                }}
              >
                {errorDetails.severity}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  color: theme === 'dark' ? '#f7fafc' : '#2d3748',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {errorDetails.category}
              </span>
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: '600',
              }}
            >
              {userFriendlyMessages.title}
            </h3>

            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: theme === 'dark' ? '#a0aec0' : '#718096',
                lineHeight: '1.5',
              }}
            >
              {userFriendlyMessages.description}
            </p>
          </div>

          {/* Error information */}
          <div
            style={{
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '6px',
              padding: '12px',
              margin: '16px 0',
              fontSize: '12px',
            }}
          >
            <div style={{ marginBottom: '8px', fontWeight: '600', color: getSeverityColor() }}>
              {error.name}: {errorDetails.category} Error
            </div>
            <div style={{ opacity: 0.8 }}>
              {errorDetails.timestamp.toLocaleString()} • Session:{' '}
              {errorDetails.sessionId?.slice(-8)}
              {errorDetails.retryAttempt > 0 && ` • Attempt: ${errorDetails.retryAttempt}`}
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: retryCount >= maxRetries ? '16px' : '0',
            }}
          >
            {canRetry && (
              <button
                onClick={onRetry}
                disabled={isRecovering}
                style={{
                  background: isRecovering ? '#a0aec0' : getSeverityColor(),
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isRecovering ? 'not-allowed' : 'pointer',
                  minWidth: '120px',
                  outline: 'none',
                }}
              >
                {isRecovering
                  ? 'Recovering...'
                  : `${userFriendlyMessages.retryButtonText}${
                      retryCount > 0 ? ` (${retryCount}/${maxRetries})` : ''
                    }`}
              </button>
            )}

            {showDetailsButton && (
              <button
                onClick={onShowDetails}
                style={{
                  background: 'transparent',
                  color: theme === 'dark' ? '#f7fafc' : '#2d3748',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px',
                  outline: 'none',
                }}
              >
                {userFriendlyMessages.detailsButtonText}
              </button>
            )}
          </div>

          {/* Max retries warning */}
          {retryCount >= maxRetries && (
            <div
              style={{
                padding: '12px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '13px',
                color: '#d97706',
              }}
            >
              Maximum retries reached. Please refresh the page if the issue persists.
            </div>
          )}
        </div>
      </div>
    );
  }
);

// ============================================================================
// Error Details Modal
// ============================================================================

interface IErrorDetailsModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  error: Error;
  errorInfo: IErrorInfo;
  errorDetails: IErrorDetails;
  isDevelopment: boolean;
}

const ErrorDetailsModal: React.FC<IErrorDetailsModalProps> = React.memo(
  ({ isOpen, onDismiss, error, errorInfo, errorDetails, isDevelopment }) => {
    const copyErrorDetails = React.useCallback(() => {
      const details = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        ...errorDetails,
      };
      navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    }, [error, errorInfo, errorDetails]);

    const getSeverityColor = (): string => {
      switch (errorDetails.severity) {
        case 'critical':
          return '#e53e3e';
        case 'high':
          return '#dd6b20';
        case 'medium':
          return '#d69e2e';
        case 'low':
          return '#38a169';
        default:
          return '#718096';
      }
    };

    if (!isOpen) return null;

    return (
      <Modal
        isOpen={isOpen}
        onDismiss={onDismiss}
        isBlocking={false}
        containerClassName='spfx-error-details-modal'
      >
        <div style={{ padding: 24, minWidth: 600, maxHeight: '85vh', overflow: 'auto' }}>
          <Stack tokens={{ childrenGap: 16 }}>
            <Stack horizontal horizontalAlign='space-between' verticalAlign='center'>
              <Text variant='xLarge' style={{ fontWeight: 600 }}>
                Error Details
              </Text>
              <DefaultButton iconProps={{ iconName: 'Cancel' }} onClick={onDismiss} />
            </Stack>

            {/* Error Classification */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <div
                style={{
                  background: '#f8f9fa',
                  padding: 12,
                  borderRadius: 6,
                  border: `2px solid ${getSeverityColor()}`,
                  textAlign: 'center',
                }}
              >
                <Text variant='medium' style={{ fontWeight: 600, color: getSeverityColor() }}>
                  {errorDetails.severity.toUpperCase()}
                </Text>
              </div>
              <div
                style={{
                  background: '#f8f9fa',
                  padding: 12,
                  borderRadius: 6,
                  border: '2px solid #718096',
                  textAlign: 'center',
                }}
              >
                <Text variant='medium' style={{ fontWeight: 600, color: '#718096' }}>
                  {errorDetails.category.toUpperCase()}
                </Text>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <Text variant='mediumPlus' style={{ fontWeight: 600, marginBottom: 8 }}>
                Basic Information
              </Text>
              <div
                style={{
                  background: '#f8f9fa',
                  padding: 12,
                  borderRadius: 6,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                <strong>Error:</strong> {error.name}
                <br />
                <strong>Message:</strong> {error.message}
                <br />
                <strong>Time:</strong> {errorDetails.timestamp.toISOString()}
                <br />
                <strong>Session:</strong> {errorDetails.sessionId}
                <br />
                {errorDetails.retryAttempt > 0 && (
                  <>
                    <strong>Retry:</strong> {errorDetails.retryAttempt}
                    <br />
                  </>
                )}
                {errorDetails.buildVersion && (
                  <>
                    <strong>Build:</strong> {errorDetails.buildVersion}
                    <br />
                  </>
                )}
              </div>
            </div>

            {/* SPFx Context */}
            {errorDetails.spfxContext && Object.keys(errorDetails.spfxContext).length > 0 && (
              <div>
                <Text variant='mediumPlus' style={{ fontWeight: 600, marginBottom: 8 }}>
                  SharePoint Context
                </Text>
                <div
                  style={{
                    background: '#f8f9fa',
                    padding: 12,
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    fontSize: 12,
                  }}
                >
                  {Object.entries(errorDetails.spfxContext).map(
                    ([key, value]) =>
                      value && (
                        <div key={key}>
                          <strong>{key}:</strong> {value}
                          <br />
                        </div>
                      )
                  )}
                </div>
              </div>
            )}

            {/* Stack Traces (Development only) */}
            {isDevelopment && error.stack && (
              <div>
                <Text variant='mediumPlus' style={{ fontWeight: 600, marginBottom: 8 }}>
                  Stack Trace
                </Text>
                <div
                  style={{
                    background: '#f8f9fa',
                    padding: 12,
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    fontSize: 10,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 200,
                    overflow: 'auto',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {error.stack}
                </div>
              </div>
            )}

            <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='end'>
              <DefaultButton
                text='Copy Details'
                onClick={copyErrorDetails}
                iconProps={{ iconName: 'Copy' }}
              />
              <PrimaryButton text='Close' onClick={onDismiss} />
            </Stack>
          </Stack>
        </div>
      </Modal>
    );
  }
);

// ============================================================================
// Main Error Boundary Component
// ============================================================================

export class ErrorBoundary extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  static defaultProps: Partial<IErrorBoundaryProps> = {
    enableRetry: true,
    maxRetries: 3,
    showDetailsButton: true,
    enableConsoleLogging: true,
    logLevel: 'detailed',
    theme: 'auto',
    isDevelopment: process.env.NODE_ENV === 'development',
    resetOnPropsChange: true,
    userFriendlyMessages: {
      title: 'Something went wrong',
      description:
        'An unexpected error occurred. You can try to refresh this section or contact support if the problem persists.',
      retryButtonText: 'Try Again',
      detailsButtonText: 'Show Details',
      closeButtonText: 'Close',
      recoveringText: 'Attempting to recover...',
    },
  };

  constructor(props: IErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      retryCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<IErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { severity, category } = ErrorClassifier.classifyError(error);

    const errorDetails: IErrorDetails = {
      errorMessage: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      buildVersion: this.props.buildVersion,
      severity,
      category,
      retryAttempt: this.state.retryCount,
      spfxContext: SPFxContextExtractor.extractContext(),
    };

    this.setState({
      errorInfo: {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'ErrorBoundary',
        eventType: 'componentDidCatch',
      },
    });

    this.logError(error, errorInfo, errorDetails);

    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorDetails);
    }
  }

  componentDidUpdate(prevProps: IErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, index) => prevProps.resetKeys?.[index] !== key)) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: React.ErrorInfo, errorDetails: IErrorDetails) => {
    const { enableConsoleLogging, logLevel } = this.props;

    if (enableConsoleLogging) {
      console.group(`🚨 Error Boundary - ${errorDetails.timestamp.toISOString()}`);
      console.error('Error:', error.message);
      console.error(`Severity: ${errorDetails.severity} | Category: ${errorDetails.category}`);

      if (logLevel === 'detailed' || logLevel === 'verbose') {
        console.error('Error Details:', errorDetails);
      }

      if (logLevel === 'verbose') {
        console.error('Component Stack:', errorInfo.componentStack);
        console.error('Stack Trace:', error.stack);
      }

      console.groupEnd();
    }
  };

  private getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('spfx-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      sessionStorage.setItem('spfx-session-id', sessionId);
    }
    return sessionId;
  };

  private getUserId = (): string | undefined => {
    try {
      const spContext = (window as any)._spPageContextInfo;
      return spContext?.userId?.toString();
    } catch {
      return undefined;
    }
  };

  private handleRetry = async () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState({ isRecovering: true });

      const delay = Math.min(1000 * (retryCount + 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));

      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
        retryCount: prevState.retryCount + 1,
        isRecovering: false,
      }));

      this.resetTimeoutId = window.setTimeout(() => {
        this.setState({ retryCount: 0 });
      }, 60000);
    }
  };

  private handleShowDetails = () => {
    this.setState({ showDetails: true });
  };

  private handleCloseDetails = () => {
    this.setState({ showDetails: false });
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
      isRecovering: false,
    });
  };

  private getTheme = (): 'light' | 'dark' => {
    const { theme } = this.props;

    if (theme === 'auto') {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    }

    return theme === 'dark' ? 'dark' : 'light';
  };

  render() {
    const { hasError, error, errorInfo, showDetails, retryCount, isRecovering } = this.state;
    const {
      children,
      fallbackComponent: FallbackComponent = DefaultErrorFallback,
      maxRetries = 3,
      enableRetry = true,
      showDetailsButton = true,
      userFriendlyMessages = {},
      isDevelopment = false,
      className = '',
      errorContainerStyle = {},
    } = this.props;

    const defaultMessages: IUserFriendlyMessages = {
      title: 'Something went wrong',
      description:
        'An unexpected error occurred. You can try to refresh this section or contact support if the problem persists.',
      retryButtonText: 'Try Again',
      detailsButtonText: 'Show Details',
      closeButtonText: 'Close',
      recoveringText: 'Attempting to recover...',
    };

    const mergedMessages: IUserFriendlyMessages = {
      ...defaultMessages,
      ...userFriendlyMessages,
    };

    if (hasError && error && errorInfo) {
      const { severity, category } = ErrorClassifier.classifyError(error);

      const errorDetails: IErrorDetails = {
        errorMessage: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId(),
        userId: this.getUserId(),
        buildVersion: this.props.buildVersion,
        severity,
        category,
        retryAttempt: retryCount,
        spfxContext: SPFxContextExtractor.extractContext(),
      };

      return (
        <div className={`spfx-error-boundary ${className}`} style={errorContainerStyle}>
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            errorDetails={errorDetails}
            onRetry={this.handleRetry}
            onShowDetails={this.handleShowDetails}
            retryCount={retryCount}
            maxRetries={maxRetries}
            enableRetry={enableRetry}
            showDetailsButton={showDetailsButton}
            userFriendlyMessages={mergedMessages}
            theme={this.getTheme()}
            isRecovering={isRecovering}
          />

          {showDetailsButton && (
            <ErrorDetailsModal
              isOpen={showDetails}
              onDismiss={this.handleCloseDetails}
              error={error}
              errorInfo={errorInfo}
              errorDetails={errorDetails}
              isDevelopment={isDevelopment}
            />
          )}
        </div>
      );
    }

    return children;
  }
}

// ============================================================================
// Hook-based Error Handler
// ============================================================================

export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return React.useMemo(
    () => ({
      captureError,
      resetError,
      hasError: !!error,
    }),
    [captureError, resetError, error]
  );
};

// ============================================================================
// Higher-Order Component wrapper
// ============================================================================

export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<IErrorBoundaryProps, 'children'>
) => {
  const WithErrorBoundaryComponent = React.memo((props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  ));

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithErrorBoundaryComponent;
};

export default ErrorBoundary;
