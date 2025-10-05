import { Icon } from '@fluentui/react/lib/Icon';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { Modal } from '@fluentui/react/lib/Modal';
import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react/lib/Stack';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
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
  sessionId: string;
  buildVersion?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  retryAttempt: number;
  spfxContext?: ISPFxContext;
}

export interface ISPFxContext {
  webAbsoluteUrl?: string;
  siteAbsoluteUrl?: string;
  userId?: string;
  userDisplayName?: string;
  userEmail?: string;
  webTitle?: string;
  siteId?: string;
  webId?: string;
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
  isDevelopment?: boolean;
  buildVersion?: string;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  className?: string;
  errorContainerStyle?: React.CSSProperties;
  spfxContext?: any; // SPFx WebPartContext or ExtensionContext
}

export interface IUserFriendlyMessages {
  title: string;
  description: string;
  retryButtonText: string;
  detailsButtonText: string;
  closeButtonText: string;
  recoveringText: string;
  dismissButtonText: string;
  maxRetriesReached: string;
}

export interface IErrorFallbackProps {
  error: Error;
  errorInfo: IErrorInfo;
  errorDetails: IErrorDetails;
  onRetry: () => void;
  onShowDetails: () => void;
  onDismiss?: () => void;
  retryCount: number;
  maxRetries: number;
  enableRetry: boolean;
  showDetailsButton: boolean;
  userFriendlyMessages: IUserFriendlyMessages;
  isRecovering: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_CONFIG = {
  critical: {
    color: '#d13438',
    backgroundColor: '#fde7e9',
    borderColor: '#d13438',
    icon: 'StatusErrorFull',
  },
  high: {
    color: '#f7630c',
    backgroundColor: '#fef6f4',
    borderColor: '#f7630c',
    icon: 'Warning',
  },
  medium: {
    color: '#ffc83d',
    backgroundColor: '#fffcf5',
    borderColor: '#ffc83d',
    icon: 'Info',
  },
  low: {
    color: '#107c10',
    backgroundColor: '#f1faf1',
    borderColor: '#107c10',
    icon: 'Completed',
  },
} as const;

// ============================================================================
// Error Classification Engine
// ============================================================================

class ErrorClassifier {
  private static readonly CRITICAL_PATTERNS = [
    /security\s+violation/i,
    /authentication\s+failed/i,
    /access\s+forbidden/i,
    /maximum\s+call\s+stack/i,
    /out\s+of\s+memory/i,
    /cannot\s+read\s+propert(y|ies)\s+of\s+(undefined|null)/i,
  ];

  private static readonly CRITICAL_TYPES = new Set([
    'SecurityError',
    'ReferenceError',
    'TypeError',
  ]);

  private static readonly HIGH_SEVERITY_PATTERNS = [
    /network\s+error/i,
    /failed\s+to\s+fetch/i,
    /connection\s+timeout/i,
    /cors\s+error/i,
    /api\s+error/i,
    /service\s+unavailable/i,
    /internal\s+server\s+error/i,
    /sharepoint\s+error/i,
    /list\s+does\s+not\s+exist/i,
    /access\s+denied/i,
    /permission\s+denied/i,
  ];

  private static readonly HIGH_SEVERITY_TYPES = new Set(['NetworkError', 'AbortError']);

  private static readonly LOW_SEVERITY_PATTERNS = [
    /warning/i,
    /deprecated/i,
    /deprecation/i,
    /validation\s+warning/i,
  ];

  private static readonly CATEGORY_PATTERNS: Record<ErrorCategory, RegExp[]> = {
    component: [/react/i, /component/i, /render/i, /hook/i, /failed to render/i],
    network: [/fetch/i, /network/i, /cors/i, /xhr/i, /http/i, /failed to fetch/i],
    permission: [/permission/i, /access/i, /forbidden/i, /unauthorized/i, /denied/i],
    data: [/json/i, /parse/i, /invalid\s+data/i, /serializ/i],
    performance: [/timeout/i, /memory/i, /performance/i, /slow/i],
    security: [/security/i, /xss/i, /injection/i, /csrf/i],
    unknown: [],
  };

  static classifyError(error: Error): { severity: ErrorSeverity; category: ErrorCategory } {
    const message = error.message;
    const stack = error.stack || '';
    const combinedText = `${message} ${stack}`;

    const severity = this.determineSeverity(error, combinedText);
    const category = this.determineCategory(combinedText);

    return { severity, category };
  }

  private static determineSeverity(error: Error, text: string): ErrorSeverity {
    if (
      this.CRITICAL_TYPES.has(error.name) ||
      this.CRITICAL_PATTERNS.some(pattern => pattern.test(text))
    ) {
      return 'critical';
    }

    if (
      this.HIGH_SEVERITY_TYPES.has(error.name) ||
      this.HIGH_SEVERITY_PATTERNS.some(pattern => pattern.test(text))
    ) {
      return 'high';
    }

    if (this.LOW_SEVERITY_PATTERNS.some(pattern => pattern.test(text))) {
      return 'low';
    }

    return 'medium';
  }

  private static determineCategory(text: string): ErrorCategory {
    // Check component category first as it's most specific for React errors
    if (this.CATEGORY_PATTERNS.component.some(pattern => pattern.test(text))) {
      return 'component';
    }

    if (this.CATEGORY_PATTERNS.permission.some(pattern => pattern.test(text))) {
      return 'permission';
    }

    if (this.CATEGORY_PATTERNS.security.some(pattern => pattern.test(text))) {
      return 'security';
    }

    if (this.CATEGORY_PATTERNS.network.some(pattern => pattern.test(text))) {
      return 'network';
    }

    if (this.CATEGORY_PATTERNS.data.some(pattern => pattern.test(text))) {
      return 'data';
    }

    if (this.CATEGORY_PATTERNS.performance.some(pattern => pattern.test(text))) {
      return 'performance';
    }

    return 'unknown';
  }

  static shouldRetry(category: ErrorCategory): boolean {
    const retriableCategories: ErrorCategory[] = ['network', 'performance', 'unknown'];
    return retriableCategories.includes(category);
  }
}

// ============================================================================
// SPFx Context Extractor
// ============================================================================

class SPFxContextExtractor {
  static extractContext(spfxContext?: any): ISPFxContext {
    const context: ISPFxContext = {};

    try {
      // Modern SPFx context
      if (spfxContext?.pageContext) {
        context.webAbsoluteUrl = spfxContext.pageContext.web?.absoluteUrl;
        context.siteAbsoluteUrl = spfxContext.pageContext.site?.absoluteUrl;
        context.userId = spfxContext.pageContext.user?.loginName;
        context.userDisplayName = spfxContext.pageContext.user?.displayName;
        context.userEmail = spfxContext.pageContext.user?.email;
        context.webTitle = spfxContext.pageContext.web?.title;
        context.siteId = spfxContext.pageContext.site?.id?.toString();
        context.webId = spfxContext.pageContext.web?.id?.toString();
      }
      // Fallback to classic SharePoint
      else {
        const spPageContext = (window as any)._spPageContextInfo;
        if (spPageContext) {
          context.webAbsoluteUrl = spPageContext.webAbsoluteUrl;
          context.siteAbsoluteUrl = spPageContext.siteAbsoluteUrl;
          context.userId = spPageContext.userId?.toString();
          context.webTitle = spPageContext.webTitle;
        }
      }
    } catch (error) {
      // Silent fail - context extraction is not critical
    }

    return context;
  }
}

// ============================================================================
// Session Management
// ============================================================================

class SessionManager {
  private static readonly SESSION_KEY = 'spfx-error-boundary-session';
  private static readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  static getSessionId(): string {
    try {
      const stored = sessionStorage.getItem(this.SESSION_KEY);
      if (stored) {
        const { id, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < this.SESSION_DURATION) {
          return id;
        }
      }
    } catch {
      // If parsing fails, create new session
    }

    return this.createNewSession();
  }

  private static createNewSession(): string {
    const sessionId = `eb_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    try {
      sessionStorage.setItem(
        this.SESSION_KEY,
        JSON.stringify({
          id: sessionId,
          timestamp: Date.now(),
        })
      );
    } catch {
      // If sessionStorage fails, just return the ID
    }
    return sessionId;
  }

  static clearSession(): void {
    try {
      sessionStorage.removeItem(this.SESSION_KEY);
    } catch {
      // Silent fail
    }
  }
}

// ============================================================================
// Default Error Fallback Component
// ============================================================================

const DEFAULT_CONTAINER_STYLE: React.CSSProperties = {
  fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", sans-serif',
  borderRadius: '8px',
  position: 'relative',
  maxWidth: '600px',
  margin: '24px auto',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  border: '1px solid #e1e4e8',
  backgroundColor: '#ffffff',
  color: '#323130',
  overflow: 'hidden',
};

const DefaultErrorFallback: React.FC<IErrorFallbackProps> = React.memo(
  ({
    error,
    errorDetails,
    onRetry,
    onShowDetails,
    onDismiss,
    retryCount,
    maxRetries,
    enableRetry,
    showDetailsButton,
    userFriendlyMessages,
    isRecovering,
  }) => {
    const severityConfig = SEVERITY_CONFIG[errorDetails.severity];
    const canRetry =
      enableRetry && retryCount < maxRetries && ErrorClassifier.shouldRetry(errorDetails.category);
    const maxRetriesReached = retryCount >= maxRetries;

    const headerRef = React.useRef<HTMLDivElement>(null);

    // Focus management - announce error to screen readers
    React.useEffect(() => {
      console.log('DefaultErrorFallback rendered', { error, errorDetails });
      if (headerRef.current) {
        headerRef.current.focus();
      }
    }, [error, errorDetails]);

    console.log('Rendering error fallback UI');

    return (
      <div style={DEFAULT_CONTAINER_STYLE} role='alert' aria-live='assertive'>
        {/* Severity indicator stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: severityConfig.borderColor,
          }}
        />

        <div style={{ padding: '24px' }}>
          {/* Recovery indicator */}
          {isRecovering && (
            <div
              style={{
                marginBottom: '16px',
                textAlign: 'center',
              }}
              role='status'
              aria-live='polite'
            >
              <Spinner
                size={SpinnerSize.medium}
                label={userFriendlyMessages.recoveringText}
                ariaLive='polite'
                labelPosition='right'
              />
            </div>
          )}

          {/* Header with severity badge */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Icon
                iconName={severityConfig.icon}
                style={{
                  fontSize: '48px',
                  color: severityConfig.color,
                }}
                aria-hidden='true'
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: severityConfig.backgroundColor,
                  color: severityConfig.color,
                  padding: '6px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginRight: '8px',
                  border: `1px solid ${severityConfig.borderColor}`,
                }}
              >
                {errorDetails.severity}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#f3f2f1',
                  color: '#323130',
                  padding: '6px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: '1px solid #e1e4e8',
                }}
              >
                {errorDetails.category}
              </span>
            </div>

            <h3
              ref={headerRef}
              tabIndex={-1}
              style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: 600,
                color: '#323130',
                outline: 'none',
              }}
            >
              {userFriendlyMessages.title}
            </h3>

            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: '#605e5c',
                lineHeight: '1.5',
              }}
            >
              {userFriendlyMessages.description}
            </p>
          </div>

          {/* Error information */}
          <div
            style={{
              backgroundColor: '#faf9f8',
              border: '1px solid #e1e4e8',
              borderRadius: '4px',
              padding: '12px',
              margin: '16px 0',
              fontSize: '12px',
              color: '#605e5c',
            }}
          >
            <div style={{ marginBottom: '4px', fontWeight: 600, color: '#323130' }}>
              {error.name}
            </div>
            <div style={{ marginBottom: '4px' }}>{errorDetails.timestamp.toLocaleString()}</div>
            {errorDetails.retryAttempt > 0 && <div>Retry attempt: {errorDetails.retryAttempt}</div>}
          </div>

          {/* Max retries warning */}
          {maxRetriesReached && (
            <MessageBar
              messageBarType={MessageBarType.severeWarning}
              isMultiline={false}
              styles={{ root: { marginBottom: '16px' } }}
            >
              {userFriendlyMessages.maxRetriesReached}
            </MessageBar>
          )}

          {/* Action buttons */}
          <Stack
            horizontal
            tokens={{ childrenGap: 8 }}
            horizontalAlign='center'
            wrap
            styles={{ root: { marginTop: '16px' } }}
          >
            {canRetry && (
              <PrimaryButton
                text={`${userFriendlyMessages.retryButtonText}${
                  retryCount > 0 ? ` (${retryCount}/${maxRetries})` : ''
                }`}
                onClick={onRetry}
                disabled={isRecovering}
                iconProps={{ iconName: 'Refresh' }}
                ariaLabel={`${userFriendlyMessages.retryButtonText}. Attempt ${
                  retryCount + 1
                } of ${maxRetries}`}
              />
            )}

            {showDetailsButton && (
              <DefaultButton
                text={userFriendlyMessages.detailsButtonText}
                onClick={onShowDetails}
                iconProps={{ iconName: 'Info' }}
                disabled={isRecovering}
              />
            )}

            {onDismiss && !canRetry && (
              <DefaultButton
                text={userFriendlyMessages.dismissButtonText}
                onClick={onDismiss}
                iconProps={{ iconName: 'Cancel' }}
              />
            )}
          </Stack>
        </div>
      </div>
    );
  }
);

DefaultErrorFallback.displayName = 'DefaultErrorFallback';

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
    const [copied, setCopied] = React.useState(false);
    const modalRef = React.useRef<HTMLDivElement>(null);

    const copyErrorDetails = React.useCallback(() => {
      const details = {
        error: {
          name: error.name,
          message: error.message,
          stack: isDevelopment ? error.stack : '[Hidden in production]',
        },
        details: errorDetails,
        componentStack: isDevelopment ? errorInfo.componentStack : '[Hidden in production]',
      };

      navigator.clipboard
        .writeText(JSON.stringify(details, null, 2))
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          // Fallback for older browsers
          const textarea = document.createElement('textarea');
          textarea.value = JSON.stringify(details, null, 2);
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
    }, [error, errorInfo, errorDetails, isDevelopment]);

    const severityConfig = SEVERITY_CONFIG[errorDetails.severity];

    // Handle ESC key
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && isOpen) {
          onDismiss();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onDismiss]);

    if (!isOpen) return null;

    return (
      <Modal
        isOpen={isOpen}
        onDismiss={onDismiss}
        isBlocking={false}
        containerClassName='spfx-error-details-modal'
      >
        <div
          ref={modalRef}
          style={{ padding: 24, minWidth: 600, maxWidth: 800, maxHeight: '85vh', overflow: 'auto' }}
        >
          <Stack tokens={{ childrenGap: 16 }}>
            <Stack horizontal horizontalAlign='space-between' verticalAlign='center'>
              <Text variant='xLarge' style={{ fontWeight: 600 }}>
                Error Details
              </Text>
              <DefaultButton
                iconProps={{ iconName: 'Cancel' }}
                onClick={onDismiss}
                ariaLabel='Close error details'
              />
            </Stack>

            {/* Error Classification */}
            <Stack horizontal tokens={{ childrenGap: 12 }}>
              <div
                style={{
                  backgroundColor: severityConfig.backgroundColor,
                  padding: 12,
                  borderRadius: 4,
                  border: `2px solid ${severityConfig.borderColor}`,
                  flex: 1,
                  textAlign: 'center',
                }}
              >
                <Text
                  variant='medium'
                  style={{ fontWeight: 600, color: severityConfig.color, display: 'block' }}
                >
                  {errorDetails.severity.toUpperCase()}
                </Text>
                <Text variant='small' style={{ color: severityConfig.color }}>
                  Severity
                </Text>
              </div>
              <div
                style={{
                  backgroundColor: '#f3f2f1',
                  padding: 12,
                  borderRadius: 4,
                  border: '2px solid #e1e4e8',
                  flex: 1,
                  textAlign: 'center',
                }}
              >
                <Text
                  variant='medium'
                  style={{ fontWeight: 600, color: '#323130', display: 'block' }}
                >
                  {errorDetails.category.toUpperCase()}
                </Text>
                <Text variant='small' style={{ color: '#605e5c' }}>
                  Category
                </Text>
              </div>
            </Stack>

            {/* Basic Information */}
            <div>
              <Text
                variant='mediumPlus'
                style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}
              >
                Basic Information
              </Text>
              <div
                style={{
                  backgroundColor: '#faf9f8',
                  padding: 12,
                  borderRadius: 4,
                  fontFamily: '"Consolas", "Courier New", monospace',
                  fontSize: 12,
                  lineHeight: 1.6,
                  border: '1px solid #e1e4e8',
                }}
              >
                <strong>Error Type:</strong> {error.name}
                <br />
                <strong>Message:</strong> {error.message}
                <br />
                <strong>Timestamp:</strong> {errorDetails.timestamp.toISOString()}
                <br />
                <strong>Session ID:</strong> {errorDetails.sessionId}
                <br />
                <strong>URL:</strong> {errorDetails.url}
                <br />
                {errorDetails.retryAttempt > 0 && (
                  <>
                    <strong>Retry Attempt:</strong> {errorDetails.retryAttempt}
                    <br />
                  </>
                )}
                {errorDetails.buildVersion && (
                  <>
                    <strong>Build Version:</strong> {errorDetails.buildVersion}
                    <br />
                  </>
                )}
              </div>
            </div>

            {/* SPFx Context */}
            {errorDetails.spfxContext && Object.keys(errorDetails.spfxContext).length > 0 && (
              <div>
                <Text
                  variant='mediumPlus'
                  style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}
                >
                  SharePoint Context
                </Text>
                <div
                  style={{
                    backgroundColor: '#faf9f8',
                    padding: 12,
                    borderRadius: 4,
                    fontFamily: '"Consolas", "Courier New", monospace',
                    fontSize: 12,
                    lineHeight: 1.6,
                    border: '1px solid #e1e4e8',
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
                <Text
                  variant='mediumPlus'
                  style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}
                >
                  Stack Trace
                </Text>
                <div
                  style={{
                    backgroundColor: '#faf9f8',
                    padding: 12,
                    borderRadius: 4,
                    fontFamily: '"Consolas", "Courier New", monospace',
                    fontSize: 11,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 200,
                    overflow: 'auto',
                    border: '1px solid #e1e4e8',
                    wordBreak: 'break-all',
                  }}
                >
                  {error.stack}
                </div>
              </div>
            )}

            <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign='end'>
              <DefaultButton
                text={copied ? 'Copied!' : 'Copy Details'}
                onClick={copyErrorDetails}
                iconProps={{ iconName: copied ? 'Completed' : 'Copy' }}
                disabled={copied}
              />
              <PrimaryButton text='Close' onClick={onDismiss} />
            </Stack>
          </Stack>
        </div>
      </Modal>
    );
  }
);

ErrorDetailsModal.displayName = 'ErrorDetailsModal';

// ============================================================================
// Main Error Boundary Component
// ============================================================================

export class ErrorBoundary extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
  private resetTimeoutId: number | undefined;

  static defaultProps: Partial<IErrorBoundaryProps> = {
    enableRetry: true,
    maxRetries: 3,
    showDetailsButton: true,
    enableConsoleLogging: true,
    logLevel: 'detailed',
    isDevelopment: process.env.NODE_ENV === 'development',
    resetOnPropsChange: true,
    userFriendlyMessages: {
      title: 'Something went wrong',
      description:
        'An unexpected error occurred. You can try again or contact support if the problem persists.',
      retryButtonText: 'Try Again',
      detailsButtonText: 'Show Details',
      closeButtonText: 'Close',
      recoveringText: 'Attempting to recover...',
      dismissButtonText: 'Dismiss',
      maxRetriesReached:
        'Maximum retry attempts reached. Please refresh the page or contact support.',
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
      errorId: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { severity, category } = ErrorClassifier.classifyError(error);

    const errorDetails: IErrorDetails = {
      errorMessage: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: SessionManager.getSessionId(),
      userId: this.getUserId(),
      buildVersion: this.props.buildVersion,
      severity,
      category,
      retryAttempt: this.state.retryCount,
      spfxContext: SPFxContextExtractor.extractContext(this.props.spfxContext),
    };

    // Set errorInfo in state - this is critical for rendering
    this.setState(
      {
        errorInfo: {
          componentStack: errorInfo.componentStack,
          errorBoundary: 'ErrorBoundary',
          eventType: 'componentDidCatch',
        },
      },
      () => {
        // After state is set, log and call onError
        this.logError(error, errorInfo, errorDetails);

        if (this.props.onError) {
          this.props.onError(error, errorInfo, errorDetails);
        }
      }
    );
  }

  componentDidUpdate(prevProps: IErrorBoundaryProps): void {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId !== undefined) {
      window.clearTimeout(this.resetTimeoutId);
    }
  }

  private logError = (
    error: Error,
    errorInfo: React.ErrorInfo,
    errorDetails: IErrorDetails
  ): void => {
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

  private getUserId = (): string | undefined => {
    try {
      // Try SPFx context first
      if (this.props.spfxContext?.pageContext?.user) {
        return this.props.spfxContext.pageContext.user.loginName;
      }
      // Fallback to classic SharePoint
      const spContext = (window as any)._spPageContextInfo;
      return spContext?.userId?.toString();
    } catch {
      return undefined;
    }
  };

  private handleRetry = async (): Promise<void> => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState({ isRecovering: true });

      // Exponential backoff: 1s, 2s, 3s...
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

      // Reset retry count after 60 seconds of successful operation
      if (this.resetTimeoutId !== undefined) {
        window.clearTimeout(this.resetTimeoutId);
      }
      this.resetTimeoutId = window.setTimeout(() => {
        this.setState({ retryCount: 0 });
      }, 60000);
    }
  };

  private handleShowDetails = (): void => {
    this.setState({ showDetails: true });
  };

  private handleCloseDetails = (): void => {
    this.setState({ showDetails: false });
  };

  private handleDismiss = (): void => {
    this.resetErrorBoundary();
  };

  private resetErrorBoundary = (): void => {
    if (this.resetTimeoutId !== undefined) {
      window.clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
      isRecovering: false,
    });
  };

  render(): React.ReactNode {
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

    console.log('ErrorBoundary render()', { hasError, error: error?.message, errorInfo });

    if (!hasError) {
      return children;
    }

    if (!error || !errorInfo) {
      // Shouldn't happen, but handle gracefully
      console.error('Error boundary in invalid state - has error but missing error or errorInfo');
      return children;
    }

    console.log('ErrorBoundary: Rendering fallback component');

    const defaultMessages: IUserFriendlyMessages = {
      title: 'Something went wrong',
      description:
        'An unexpected error occurred. You can try again or contact support if the problem persists.',
      retryButtonText: 'Try Again',
      detailsButtonText: 'Show Details',
      closeButtonText: 'Close',
      recoveringText: 'Attempting to recover...',
      dismissButtonText: 'Dismiss',
      maxRetriesReached:
        'Maximum retry attempts reached. Please refresh the page or contact support.',
    };

    const mergedMessages: IUserFriendlyMessages = {
      ...defaultMessages,
      ...userFriendlyMessages,
    };

    const { severity, category } = ErrorClassifier.classifyError(error);

    const errorDetails: IErrorDetails = {
      errorMessage: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: SessionManager.getSessionId(),
      userId: this.getUserId(),
      buildVersion: this.props.buildVersion,
      severity,
      category,
      retryAttempt: retryCount,
      spfxContext: SPFxContextExtractor.extractContext(this.props.spfxContext),
    };

    console.log('ErrorBoundary: Creating fallback element', { FallbackComponent, errorDetails });

    return (
      <div className={`spfx-error-boundary ${className}`} style={errorContainerStyle}>
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          errorDetails={errorDetails}
          onRetry={this.handleRetry}
          onShowDetails={this.handleShowDetails}
          onDismiss={this.handleDismiss}
          retryCount={retryCount}
          maxRetries={maxRetries}
          enableRetry={enableRetry}
          showDetailsButton={showDetailsButton}
          userFriendlyMessages={mergedMessages}
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
}

// ============================================================================
// Hook-based Error Handler
// ============================================================================

export const useErrorHandler = (): {
  captureError: (error: Error) => void;
  resetError: () => void;
  hasError: boolean;
} => {
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

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<IErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WithErrorBoundaryComponent: React.ComponentType<P> = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithErrorBoundaryComponent;
}

export default ErrorBoundary;
