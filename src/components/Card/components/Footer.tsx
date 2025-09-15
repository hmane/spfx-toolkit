import * as React from 'react';
import { memo, useMemo } from 'react';
import { FooterProps, ContentPadding } from '../Card.types';
import { PADDING_CONFIG } from '../utils/constants';

/**
 * Helper function to convert padding value to CSS string
 */
const getPaddingValue = (padding: ContentPadding): string => {
  if (typeof padding === 'string') {
    return PADDING_CONFIG[padding as keyof typeof PADDING_CONFIG] || padding;
  }

  if (typeof padding === 'object') {
    const { top = 0, right = 0, bottom = 0, left = 0 } = padding;
    return `${top}px ${right}px ${bottom}px ${left}px`;
  }

  return PADDING_CONFIG.comfortable; // Default
};

/**
 * Card Footer component
 */
export const Footer = memo<FooterProps>(({
  children,
  className = '',
  style,
  backgroundColor,
  borderTop = true,
  padding = 'comfortable',
  textAlign = 'left'
}) => {
  // Memoized footer classes
  const footerClasses = useMemo(() => [
    'spfx-card-footer',
    typeof padding === 'string' ? `padding-${padding}` : 'padding-custom',
    `text-${textAlign}`,
    !borderTop ? 'no-border' : '',
    className
  ].filter(Boolean).join(' '), [padding, textAlign, borderTop, className]);

  // Memoized footer styles
  const footerStyle = useMemo(() => ({
    ...(backgroundColor && { backgroundColor }),
    ...(typeof padding === 'object' && { padding: getPaddingValue(padding) }),
    ...style
  }), [backgroundColor, padding, style]);

  return (
    <div className={footerClasses} style={footerStyle}>
      {children}
    </div>
  );
});

Footer.displayName = 'CardFooter';

/**
 * Footer with action buttons
 */
export const ActionFooter = memo<FooterProps & {
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
}>(({
  children,
  primaryAction,
  secondaryActions = [],
  className = '',
  style,
  backgroundColor = 'var(--neutralLighter, #f8f9fa)',
  borderTop = true,
  padding = 'comfortable',
  textAlign = 'left'
}) => {
  const footerContent = useMemo(() => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      flexWrap: 'wrap'
    }}>
      {/* Left content */}
      <div style={{ flex: 1, textAlign, minWidth: 0 }}>
        {children}
      </div>

      {/* Right actions */}
      {(primaryAction || secondaryActions.length > 0) && (
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexShrink: 0
        }}>
          {/* Secondary actions */}
          {secondaryActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--neutralTertiary, #a19f9d)',
                backgroundColor: 'transparent',
                color: 'var(--neutralPrimary, #323130)',
                borderRadius: '4px',
                cursor: action.disabled ? 'not-allowed' : 'pointer',
                opacity: action.disabled ? 0.5 : 1,
                fontSize: '14px',
                fontWeight: 400,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!action.disabled) {
                  e.currentTarget.style.backgroundColor = 'var(--neutralLight, #edebe9)';
                }
              }}
              onMouseOut={(e) => {
                if (!action.disabled) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {action.label}
            </button>
          ))}

          {/* Primary action */}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'var(--themePrimary, #0078d4)',
                color: 'var(--white, #ffffff)',
                borderRadius: '4px',
                cursor: (primaryAction.disabled || primaryAction.loading) ? 'not-allowed' : 'pointer',
                opacity: (primaryAction.disabled || primaryAction.loading) ? 0.5 : 1,
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseOver={(e) => {
                if (!primaryAction.disabled && !primaryAction.loading) {
                  e.currentTarget.style.backgroundColor = 'var(--themeDark, #106ebe)';
                }
              }}
              onMouseOut={(e) => {
                if (!primaryAction.disabled && !primaryAction.loading) {
                  e.currentTarget.style.backgroundColor = 'var(--themePrimary, #0078d4)';
                }
              }}
            >
              {primaryAction.loading ? (
                <>
                  <span style={{ opacity: 0 }}>{primaryAction.label}</span>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                </>
              ) : (
                primaryAction.label
              )}
            </button>
          )}
        </div>
      )}
    </div>
  ), [children, primaryAction, secondaryActions, textAlign]);

  return (
    <Footer
      className={`spfx-action-footer ${className}`}
      style={style}
      backgroundColor={backgroundColor}
      borderTop={borderTop}
      padding={padding}
    >
      {footerContent}
    </Footer>
  );
});

ActionFooter.displayName = 'ActionCardFooter';

/**
 * Footer with status indicators
 */
export const StatusFooter = memo<FooterProps & {
  status?: {
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    icon?: string;
  };
  timestamp?: {
    label: string;
    value: string | Date;
    format?: 'relative' | 'absolute';
  };
}>(({
  children,
  status,
  timestamp,
  className = '',
  style,
  backgroundColor = 'var(--neutralLighter, #f8f9fa)',
  borderTop = true,
  padding = 'compact',
  textAlign = 'left'
}) => {
  // Status colors
  const statusColors = useMemo(() => ({
    success: 'var(--green, #107c10)',
    warning: 'var(--yellow, #ffb900)',
    error: 'var(--red, #d13438)',
    info: 'var(--themePrimary, #0078d4)'
  }), []);

  // Format timestamp
  const formattedTimestamp = useMemo(() => {
    if (!timestamp) return null;

    const date = timestamp.value instanceof Date ? timestamp.value : new Date(timestamp.value);

    if (timestamp.format === 'relative') {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    }

    return date.toLocaleString();
  }, [timestamp]);

  const footerContent = useMemo(() => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      fontSize: '12px',
      color: 'var(--neutralSecondary, #605e5c)'
    }}>
      {/* Left side - custom content and status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flex: 1,
        minWidth: 0
      }}>
        {children && (
          <div style={{ textAlign, minWidth: 0 }}>
            {children}
          </div>
        )}

        {status && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: statusColors[status.type],
            flexShrink: 0
          }}>
            {status.icon && (
              <i className={`ms-Icon ms-Icon--${status.icon}`} />
            )}
            <span>{status.message}</span>
          </div>
        )}
      </div>

      {/* Right side - timestamp */}
      {timestamp && (
        <div style={{
          textAlign: 'right',
          flexShrink: 0
        }}>
          <span>{timestamp.label}: </span>
          <span>{formattedTimestamp}</span>
        </div>
      )}
    </div>
  ), [children, status, timestamp, statusColors, formattedTimestamp, textAlign]);

  return (
    <Footer
      className={`spfx-status-footer ${className}`}
      style={style}
      backgroundColor={backgroundColor}
      borderTop={borderTop}
      padding={padding}
    >
      {footerContent}
    </Footer>
  );
});

StatusFooter.displayName = 'StatusCardFooter';

/**
 * Progress footer with progress bar
 */
export const ProgressFooter = memo<FooterProps & {
  progress: {
    current: number;
    total: number;
    label?: string;
    showPercentage?: boolean;
  };
}>(({
  children,
  progress,
  className = '',
  style,
  backgroundColor = 'var(--neutralLighter, #f8f9fa)',
  borderTop = true,
  padding = 'comfortable',
  textAlign = 'left'
}) => {
  const percentage = useMemo(() => {
    return Math.min(100, Math.max(0, (progress.current / progress.total) * 100));
  }, [progress.current, progress.total]);

  const footerContent = useMemo(() => (
    <div>
      {/* Header with label and percentage */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        fontSize: '12px',
        color: 'var(--neutralSecondary, #605e5c)'
      }}>
        <span>{progress.label || 'Progress'}</span>
        {progress.showPercentage !== false && (
          <span>{Math.round(percentage)}%</span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: 'var(--neutralLight, #edebe9)',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: children ? '12px' : '0'
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: 'var(--themePrimary, #0078d4)',
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Additional content */}
      {children && (
        <div style={{ textAlign }}>
          {children}
        </div>
      )}
    </div>
  ), [progress, percentage, children, textAlign]);

  return (
    <Footer
      className={`spfx-progress-footer ${className}`}
      style={style}
      backgroundColor={backgroundColor}
      borderTop={borderTop}
      padding={padding}
    >
      {footerContent}
    </Footer>
  );
});

ProgressFooter.displayName = 'ProgressCardFooter';

/**
 * Expandable footer for additional details
 */
export const ExpandableFooter = memo<FooterProps & {
  summary: React.ReactNode;
  details: React.ReactNode;
  defaultExpanded?: boolean;
}>(({
  children,
  summary,
  details,
  defaultExpanded = false,
  className = '',
  style,
  backgroundColor = 'var(--neutralLighter, #f8f9fa)',
  borderTop = true,
  padding = 'comfortable',
  textAlign = 'left'
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const handleToggle = React.useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  const footerContent = useMemo(() => (
    <div>
      {/* Main footer content */}
      {children && (
        <div style={{ textAlign, marginBottom: '8px' }}>
          {children}
        </div>
      )}

      {/* Expandable section trigger */}
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          padding: '8px 0',
          border: 'none',
          backgroundColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontSize: '12px',
          color: 'var(--neutralSecondary, #605e5c)',
          transition: 'color 0.2s ease'
        }}
        aria-expanded={isExpanded}
        aria-controls="expandable-footer-details"
      >
        <span>{summary}</span>
        <i
          className="ms-Icon ms-Icon--ChevronDown"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            fontSize: '10px'
          }}
        />
      </button>

      {/* Expandable details */}
      <div
        id="expandable-footer-details"
        style={{
          maxHeight: isExpanded ? '500px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.3s ease',
          opacity: isExpanded ? 1 : 0
        }}
      >
        <div style={{
          paddingTop: '8px',
          borderTop: '1px solid var(--neutralLight, #edebe9)',
          fontSize: '12px',
          color: 'var(--neutralSecondary, #605e5c)'
        }}>
          {details}
        </div>
      </div>
    </div>
  ), [children, summary, details, isExpanded, textAlign, handleToggle, handleKeyDown]);

  return (
    <Footer
      className={`spfx-expandable-footer ${className}`}
      style={style}
      backgroundColor={backgroundColor}
      borderTop={borderTop}
      padding={padding}
    >
      {footerContent}
    </Footer>
  );
});

ExpandableFooter.displayName = 'ExpandableCardFooter';

/**
 * Footer with multiple columns
 */
export const MultiColumnFooter = memo<FooterProps & {
  columns: Array<{
    content: React.ReactNode;
    width?: string;
    align?: 'left' | 'center' | 'right';
  }>;
}>(({
  children,
  columns,
  className = '',
  style,
  backgroundColor = 'var(--neutralLighter, #f8f9fa)',
  borderTop = true,
  padding = 'comfortable'
}) => {
  const footerContent = useMemo(() => (
    <div>
      {children && (
        <div style={{ marginBottom: '12px' }}>
          {children}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: columns.map(col => col.width || '1fr').join(' '),
        gap: '16px',
        alignItems: 'center'
      }}>
        {columns.map((column, index) => (
          <div
            key={index}
            style={{
              textAlign: column.align || 'left',
              fontSize: '12px',
              color: 'var(--neutralSecondary, #605e5c)'
            }}
          >
            {column.content}
          </div>
        ))}
      </div>
    </div>
  ), [children, columns]);

  return (
    <Footer
      className={`spfx-multi-column-footer ${className}`}
      style={style}
      backgroundColor={backgroundColor}
      borderTop={borderTop}
      padding={padding}
    >
      {footerContent}
    </Footer>
  );
});

MultiColumnFooter.displayName = 'MultiColumnCardFooter';

/**
 * Inject required CSS animations for footer components
 */
const injectFooterStyles = () => {
  const styleId = 'spfx-footer-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Footer responsive styles */
    @media (max-width: 768px) {
      .spfx-action-footer > div {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }

      .spfx-action-footer > div > div:last-child {
        justify-content: center;
      }

      .spfx-multi-column-footer > div > div:last-child {
        grid-template-columns: 1fr;
        gap: 8px;
        text-align: center;
      }
    }

    /* Hover effects */
    .spfx-expandable-footer button:hover {
      color: var(--themePrimary, #0078d4) !important;
    }

    /* Focus styles */
    .spfx-expandable-footer button:focus {
      // outline: 2px solid var(--themePrimary, #0078d4);
      // outline-offset: 2px;
      outline: none;
    }

    /* High contrast mode */
    @media (forced-colors: active) {
      .spfx-card-footer {
        border-top: 1px solid ButtonBorder;
        background: ButtonFace;
        color: ButtonText;
      }

      .spfx-action-footer button {
        border: 1px solid ButtonBorder !important;
        background: ButtonFace !important;
        color: ButtonText !important;
      }

      .spfx-action-footer button:hover {
        background: Highlight !important;
        color: HighlightText !important;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .spfx-expandable-footer button i,
      .spfx-expandable-footer > div > div:last-child,
      .spfx-progress-footer > div > div:nth-child(2) > div {
        transition: none !important;
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
};

// Initialize styles when module loads
if (typeof document !== 'undefined') {
  injectFooterStyles();
}
