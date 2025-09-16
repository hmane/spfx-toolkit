import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
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
}

export interface IErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: IErrorInfo | null;
  errorId: string;
  showDetails: boolean;
  retryCount: number;
}

export interface IErrorBoundaryProps {
  children: React.ReactNode;

  // Customization options - using any to handle React version compatibility
  fallbackComponent?: any;
  enableRetry?: boolean;
  maxRetries?: number;
  showDetailsButton?: boolean;
  isolateErrors?: boolean;

  // Logging and reporting
  onError?: (error: Error, errorInfo: IErrorInfo, errorDetails: IErrorDetails) => void;
  enableConsoleLogging?: boolean;
  enableRemoteLogging?: boolean;
  logLevel?: 'minimal' | 'detailed' | 'verbose';

  // User experience
  userFriendlyMessages?: Partial<IUserFriendlyMessages>;

  // Environment detection
  isDevelopment?: boolean;
  buildVersion?: string;

  // Recovery options
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;

  // Styling
  className?: string;
  errorContainerStyle?: React.CSSProperties;
}

export interface IUserFriendlyMessages {
  title: string;
  description: string;
  retryButtonText: string;
  detailsButtonText: string;
  closeButtonText: string;
}

export interface IErrorFallbackProps {
  error: Error;
  errorInfo: IErrorInfo;
  errorDetails: IErrorDetails;
  onRetry: () => void;
  onShowDetails: () => void;
  onClose?: () => void;
  retryCount: number;
  maxRetries: number;
  enableRetry: boolean;
  showDetailsButton: boolean;
  userFriendlyMessages: IUserFriendlyMessages;
}

// ============================================================================
// Default Error Fallback Component
// ============================================================================

const DefaultErrorFallback: React.FC<IErrorFallbackProps> = ({
  error,
  errorDetails,
  onRetry,
  onShowDetails,
  retryCount,
  maxRetries,
  enableRetry,
  showDetailsButton,
  userFriendlyMessages,
}) => {
  const canRetry = enableRetry && retryCount < maxRetries;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #dc2626',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        maxWidth: '700px',
        margin: '16px auto',
        overflow: 'hidden',
        color: '#374151',
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", sans-serif',
      }}
    >
      <div style={{ padding: '32px' }}>
        {/* Error Icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Icon
            iconName='ErrorBadge'
            style={{
              fontSize: '48px',
              color: '#dc2626',
              display: 'block',
              margin: '0 auto',
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            lineHeight: '1.3',
          }}
        >
          {userFriendlyMessages.title}
        </div>

        {/* Description */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '16px',
            color: '#6b7280',
            lineHeight: '1.5',
            maxWidth: '500px',
            margin: '0 auto 24px auto',
          }}
        >
          {userFriendlyMessages.description}
        </div>

        {/* Error Information Card */}
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            margin: '16px 0 24px 0',
            fontSize: '14px',
          }}
        >
          <div style={{ color: '#991b1b', fontWeight: '600', marginBottom: '12px' }}>
            Error Details:
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ color: '#991b1b' }}>
              <strong>Type:</strong> {error.name}
            </div>
            <div style={{ color: '#991b1b' }}>
              <strong>Message:</strong> {error.message}
            </div>
            <div style={{ color: '#991b1b' }}>
              <strong>Time:</strong> {errorDetails.timestamp.toLocaleString()}
            </div>
            <div style={{ color: '#991b1b' }}>
              <strong>Session:</strong> {errorDetails.sessionId}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: retryCount >= maxRetries ? '16px' : '0',
          }}
        >
          {canRetry && (
            <button
              onClick={onRetry}
              style={{
                background: '#0ea5e9',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                minWidth: '140px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s ease',
                outline: 'none',
              }}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#0284c7';
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#0ea5e9';
              }}
              onFocus={e => {
                (e.target as HTMLButtonElement).style.outline = '2px solid #0ea5e9';
                (e.target as HTMLButtonElement).style.outlineOffset = '2px';
              }}
              onBlur={e => {
                (e.target as HTMLButtonElement).style.outline = 'none';
              }}
            >
              <Icon iconName='Refresh' style={{ fontSize: '14px' }} />
              {`${userFriendlyMessages.retryButtonText}${
                retryCount > 0 ? ` (${retryCount}/${maxRetries})` : ''
              }`}
            </button>
          )}

          {showDetailsButton && (
            <button
              onClick={onShowDetails}
              style={{
                background: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                minWidth: '140px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#f9fafb';
                (e.target as HTMLButtonElement).style.borderColor = '#9ca3af';
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#ffffff';
                (e.target as HTMLButtonElement).style.borderColor = '#d1d5db';
              }}
              onFocus={e => {
                (e.target as HTMLButtonElement).style.outline = '2px solid #0ea5e9';
                (e.target as HTMLButtonElement).style.outlineOffset = '2px';
              }}
              onBlur={e => {
                (e.target as HTMLButtonElement).style.outline = 'none';
              }}
            >
              <Icon iconName='Info' style={{ fontSize: '14px' }} />
              {userFriendlyMessages.detailsButtonText}
            </button>
          )}
        </div>

        {/* Max Retries Warning */}
        {retryCount >= maxRetries && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fed7aa',
              borderRadius: '6px',
              padding: '12px',
              textAlign: 'center',
              fontSize: '14px',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Icon iconName='Warning' style={{ fontSize: '16px', color: '#f59e0b' }} />
            Maximum retry attempts reached. Please refresh the page or contact support if the issue
            persists.
          </div>
        )}
      </div>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .error-boundary-container {
            margin: 8px !important;
            border-radius: 6px !important;
            max-width: calc(100% - 16px) !important;
          }

          .error-buttons {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .error-button {
            width: 100% !important;
            margin-bottom: 8px !important;
          }
        }

        @media (max-width: 480px) {
          .error-boundary-container {
            margin: 4px !important;
            border-radius: 4px !important;
          }

          .error-boundary-padding {
            padding: 20px 12px !important;
          }
        }
      `}</style>
    </div>
  );
};

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

const ErrorDetailsModal: React.FC<IErrorDetailsModalProps> = ({
  isOpen,
  onDismiss,
  error,
  errorInfo,
  errorDetails,
  isDevelopment,
}) => {
  const copyErrorDetails = React.useCallback(() => {
    const details = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      ...errorDetails,
    };

    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
  }, [error, errorInfo, errorDetails]);

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onDismiss}
      isBlocking={false}
      containerClassName='spfx-error-details-modal'
    >
      <div style={{ padding: 24, minWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
        <Stack tokens={{ childrenGap: 16 }}>
          <Stack horizontal horizontalAlign='space-between' verticalAlign='center'>
            <Text variant='xLarge'>Error Details</Text>
            <DefaultButton iconProps={{ iconName: 'Cancel' }} onClick={onDismiss} />
          </Stack>

          <Stack tokens={{ childrenGap: 12 }}>
            <div>
              <Text variant='mediumPlus' styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>
                Basic Information
              </Text>
              <div
                style={{
                  background: '#f8f9fa',
                  padding: 12,
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                <strong>Error:</strong> {error.name}
                <br />
                <strong>Message:</strong> {error.message}
                <br />
                <strong>Time:</strong> {errorDetails.timestamp.toISOString()}
                <br />
                <strong>URL:</strong> {errorDetails.url}
                <br />
                <strong>User Agent:</strong> {errorDetails.userAgent}
                <br />
                <strong>Session ID:</strong> {errorDetails.sessionId}
                <br />
                {errorDetails.buildVersion && (
                  <>
                    <strong>Build:</strong> {errorDetails.buildVersion}
                    <br />
                  </>
                )}
                {errorDetails.userId && (
                  <>
                    <strong>User ID:</strong> {errorDetails.userId}
                    <br />
                  </>
                )}
              </div>
            </div>

            {isDevelopment && error.stack && (
              <div>
                <Text variant='mediumPlus' styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>
                  Stack Trace
                </Text>
                <div
                  style={{
                    background: '#f8f9fa',
                    padding: 12,
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  {error.stack}
                </div>
              </div>
            )}

            {isDevelopment && errorInfo.componentStack && (
              <div>
                <Text variant='mediumPlus' styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>
                  Component Stack
                </Text>
                <div
                  style={{
                    background: '#f8f9fa',
                    padding: 12,
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  {errorInfo.componentStack}
                </div>
              </div>
            )}
          </Stack>

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
};

// ============================================================================
// Main Error Boundary Component
// ============================================================================

export class ErrorBoundary extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  static defaultProps: Partial<IErrorBoundaryProps> = {
    enableRetry: true,
    maxRetries: 3,
    showDetailsButton: true,
    isolateErrors: true,
    enableConsoleLogging: true,
    enableRemoteLogging: false,
    logLevel: 'detailed',
    isDevelopment: process.env.NODE_ENV === 'development',
    resetOnPropsChange: true,
    userFriendlyMessages: {
      title: 'Something went wrong',
      description:
        'An unexpected error occurred. You can try to refresh this section or contact support if the problem persists.',
      retryButtonText: 'Try Again',
      detailsButtonText: 'Show Details',
      closeButtonText: 'Close',
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
    };
  }

  static getDerivedStateFromError(error: Error): Partial<IErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
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
    const { enableConsoleLogging, enableRemoteLogging, logLevel } = this.props;

    if (enableConsoleLogging) {
      console.group(`🚨 React Error Boundary - ${errorDetails.timestamp.toISOString()}`);
      console.error('Error:', error);

      if (logLevel === 'detailed' || logLevel === 'verbose') {
        console.error('Error Info:', errorInfo);
        console.error('Error Details:', errorDetails);
      }

      if (logLevel === 'verbose') {
        console.error('Component Stack:', errorInfo.componentStack);
        console.error('Stack Trace:', error.stack);
      }

      console.groupEnd();
    }

    if (enableRemoteLogging) {
      // Implement your remote logging here
      this.sendErrorToRemoteService(error, errorInfo, errorDetails);
    }
  };

  private sendErrorToRemoteService = async (
    error: Error,
    errorInfo: React.ErrorInfo,
    errorDetails: IErrorDetails
  ) => {
    try {
      // Example implementation - replace with your actual logging service
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          errorInfo,
          errorDetails,
        }),
      });
    } catch (loggingError) {
      console.error('Failed to send error to remote service:', loggingError);
    }
  };

  private getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('spfx-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('spfx-session-id', sessionId);
    }
    return sessionId;
  };

  private getUserId = (): string | undefined => {
    // Try to get user ID from SharePoint context
    try {
      const spContext = (window as any)._spPageContextInfo;
      return spContext?.userId?.toString() || spContext?.userLoginName;
    } catch {
      return undefined;
    }
  };

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
        retryCount: prevState.retryCount + 1,
      }));

      // Auto-reset retry count after successful recovery
      this.resetTimeoutId = window.setTimeout(() => {
        this.setState({ retryCount: 0 });
      }, 30000); // Reset after 30 seconds
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
    });
  };

  render() {
    const { hasError, error, errorInfo, showDetails, retryCount } = this.state;
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

    // Merge user messages with defaults
    const defaultMessages: IUserFriendlyMessages = {
      title: 'Something went wrong',
      description:
        'An unexpected error occurred. You can try to refresh this section or contact support if the problem persists.',
      retryButtonText: 'Try Again',
      detailsButtonText: 'Show Details',
      closeButtonText: 'Close',
    };

    const mergedMessages: IUserFriendlyMessages = {
      ...defaultMessages,
      ...userFriendlyMessages,
    };

    if (hasError && error && errorInfo) {
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
// Hook-based Error Boundary (for functional components)
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

  return {
    captureError,
    resetError,
    hasError: !!error,
  };
};

// ============================================================================
// Higher-Order Component wrapper
// ============================================================================

export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<IErrorBoundaryProps, 'children'>
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithErrorBoundaryComponent;
};

export default ErrorBoundary;
