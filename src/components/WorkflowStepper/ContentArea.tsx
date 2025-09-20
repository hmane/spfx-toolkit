import * as React from 'react';
import { useMemo } from 'react';
import { useTheme, Icon } from '@fluentui/react';
import { ContentAreaProps } from './types';
import { getStepperStyles, getStepColors } from './WorkflowStepper.styles';
import { getStatusLabel, getStatusDescription } from './utils';

export const ContentArea: React.FC<ContentAreaProps> = ({ selectedStep, isVisible }) => {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      getStepperStyles(theme, {
        fullWidth: false,
        stepCount: 0,
        mode: 'fullSteps',
      }),
    [theme]
  );

  if (!isVisible || !selectedStep) {
    return null;
  }

  const getStatusIcon = (status: string): string => {
    const iconMap: Record<string, string> = {
      completed: 'CheckMark',
      current: 'Clock',
      pending: 'More',
      warning: 'Warning',
      error: 'ErrorBadge',
      blocked: 'Blocked2',
    };
    return iconMap[status] || 'Clock';
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      completed: '#107c10',
      current: theme.palette.themePrimary,
      pending: theme.palette.neutralSecondary,
      warning: '#ffb900',
      error: '#d13438',
      blocked: '#ff8c00',
    };
    return colorMap[status] || theme.palette.neutralSecondary;
  };

  const renderContent = () => {
    if (!selectedStep.content) {
      return (
        <div className={styles.contentBody}>
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: `linear-gradient(135deg, ${theme.palette.neutralLighterAlt} 0%, ${theme.palette.neutralLighter} 100%)`,
              borderRadius: '12px',
              border: `1px dashed ${theme.palette.neutralLight}`,
              margin: '20px 0',
            }}
          >
            <Icon
              iconName='Info'
              style={{
                fontSize: '32px',
                color: theme.palette.neutralTertiary,
                marginBottom: '16px',
              }}
            />
            <p
              style={{
                color: theme.palette.neutralSecondary,
                fontStyle: 'italic',
                fontSize: theme.fonts.medium.fontSize,
                margin: 0,
              }}
            >
              No additional information available for this step.
            </p>
          </div>
        </div>
      );
    }

    // Handle React node content
    if (React.isValidElement(selectedStep.content)) {
      return <div className={styles.contentBody}>{selectedStep.content}</div>;
    }

    // Handle string content
    if (typeof selectedStep.content === 'string') {
      return (
        <div
          className={styles.contentBody}
          dangerouslySetInnerHTML={{ __html: selectedStep.content }}
        />
      );
    }

    // Fallback for other content types
    return <div className={styles.contentBody}>{String(selectedStep.content)}</div>;
  };

  const renderStatusBadge = () => {
    const colors = getStepColors(theme);
    const colorConfig = colors[selectedStep.status];
    const statusLabel = getStatusLabel(selectedStep.status);
    const statusColor = getStatusColor(selectedStep.status);

    return (
      <div
        className={styles.statusBadge}
        style={{
          background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%)`,
          color: theme.palette.white,
          border: `1px solid ${statusColor}`,
        }}
      >
        <Icon
          iconName={getStatusIcon(selectedStep.status)}
          style={{
            fontSize: '12px',
            animation:
              selectedStep.status === 'current' ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}
        />
        {statusLabel}
      </div>
    );
  };

  const renderMetadata = () => {
    if (!selectedStep.description1 && !selectedStep.description2) {
      return null;
    }

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
          padding: '20px',
          background: `linear-gradient(135deg, ${theme.palette.neutralLighterAlt} 0%, ${theme.palette.neutralLighter} 100%)`,
          borderRadius: '12px',
          border: `1px solid ${theme.palette.neutralLight}`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        {selectedStep.description1 && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: theme.fonts.small.fontSize,
                fontWeight: 600,
                color: theme.palette.neutralSecondary,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <Icon
                iconName='Info'
                style={{
                  fontSize: '14px',
                  color: theme.palette.themePrimary,
                }}
              />
              Status Details
            </div>
            <div
              style={{
                fontSize: theme.fonts.medium.fontSize,
                color: theme.palette.neutralPrimary,
                fontWeight: 500,
                lineHeight: '1.5',
              }}
            >
              {selectedStep.description1}
            </div>
          </div>
        )}

        {selectedStep.description2 && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: theme.fonts.small.fontSize,
                fontWeight: 600,
                color: theme.palette.neutralSecondary,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <Icon
                iconName='FileText'
                style={{
                  fontSize: '14px',
                  color: theme.palette.themePrimary,
                }}
              />
              Additional Info
            </div>
            <div
              style={{
                fontSize: theme.fonts.medium.fontSize,
                color: theme.palette.neutralPrimary,
                fontWeight: 500,
                lineHeight: '1.5',
              }}
            >
              {selectedStep.description2}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProgressIndicator = () => {
    if (selectedStep.status !== 'current') return null;

    return (
      <div
        className={styles.progressIndicator}
        style={{
          marginBottom: '24px',
          padding: '16px 20px',
          background: `linear-gradient(135deg, ${theme.palette.themeLighterAlt} 0%, rgba(0, 120, 212, 0.08) 100%)`,
          border: `1px solid ${theme.palette.themeLight}`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0, 120, 212, 0.1)',
        }}
      >
        <Icon
          iconName='Clock'
          style={{
            color: theme.palette.themePrimary,
            fontSize: '18px',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: theme.fonts.medium.fontSize,
              color: theme.palette.themeDark,
              fontWeight: 600,
              marginBottom: '4px',
            }}
          >
            Step In Progress
          </div>
          <div
            style={{
              fontSize: theme.fonts.small.fontSize,
              color: theme.palette.themePrimary,
              fontWeight: 500,
            }}
          >
            This step is currently being processed
          </div>
        </div>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: theme.palette.themePrimary,
            animation: 'pulse 1s ease-in-out infinite',
          }}
        />
      </div>
    );
  };

  const renderErrorIndicator = () => {
    if (selectedStep.status !== 'error') return null;

    return (
      <div
        style={{
          marginBottom: '24px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #fff5f5 0%, rgba(209, 52, 56, 0.05) 100%)',
          border: '1px solid #ffebee',
          borderLeft: '4px solid #d13438',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Icon
          iconName='ErrorBadge'
          style={{
            color: '#d13438',
            fontSize: '18px',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: theme.fonts.medium.fontSize,
              color: '#d13438',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          >
            Error Detected
          </div>
          <div
            style={{
              fontSize: theme.fonts.small.fontSize,
              color: '#c62828',
              fontWeight: 500,
            }}
          >
            This step has encountered an error that needs attention
          </div>
        </div>
      </div>
    );
  };

  const renderWarningIndicator = () => {
    if (selectedStep.status !== 'warning') return null;

    return (
      <div
        style={{
          marginBottom: '24px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #fffbf0 0%, rgba(255, 185, 0, 0.05) 100%)',
          border: '1px solid #fff4e6',
          borderLeft: '4px solid #ffb900',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Icon
          iconName='Warning'
          style={{
            color: '#ffb900',
            fontSize: '18px',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: theme.fonts.medium.fontSize,
              color: '#f57c00',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          >
            Attention Required
          </div>
          <div
            style={{
              fontSize: theme.fonts.small.fontSize,
              color: '#ef6c00',
              fontWeight: 500,
            }}
          >
            This step needs your attention before proceeding
          </div>
        </div>
      </div>
    );
  };

  const renderCompletedIndicator = () => {
    if (selectedStep.status !== 'completed') return null;

    return (
      <div
        style={{
          marginBottom: '24px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #f3f8f3 0%, rgba(16, 124, 16, 0.05) 100%)',
          border: '1px solid #e8f5e8',
          borderLeft: '4px solid #107c10',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Icon
          iconName='CheckMark'
          style={{
            color: '#107c10',
            fontSize: '18px',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: theme.fonts.medium.fontSize,
              color: '#2e7d32',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          >
            Step Completed
          </div>
          <div
            style={{
              fontSize: theme.fonts.small.fontSize,
              color: '#388e3c',
              fontWeight: 500,
            }}
          >
            This step has been successfully completed
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={styles.contentArea}
      role='region'
      aria-label={`Content for ${selectedStep.title}`}
      aria-live='polite'
      data-testid={`content-area-${selectedStep.id}`}
    >
      {/* Enhanced header without underline */}
      <div className={styles.contentHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${getStatusColor(
                selectedStep.status
              )} 0%, ${getStatusColor(selectedStep.status)}dd 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <Icon
              iconName={getStatusIcon(selectedStep.status)}
              style={{
                fontSize: '24px',
                color: theme.palette.white,
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))',
              }}
            />
          </div>
          <h2 className={styles.contentTitle}>{selectedStep.title}</h2>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Status-specific indicators */}
      {renderProgressIndicator()}
      {renderErrorIndicator()}
      {renderWarningIndicator()}
      {renderCompletedIndicator()}

      {/* Enhanced metadata section */}
      {renderMetadata()}

      {/* Status description */}
      <div
        style={{
          marginBottom: '20px',
          padding: '12px 16px',
          fontSize: theme.fonts.medium.fontSize,
          color: theme.palette.neutralSecondary,
          fontStyle: 'italic',
          background: theme.palette.neutralLighterAlt,
          borderRadius: '8px',
          border: `1px solid ${theme.palette.neutralLight}`,
          lineHeight: '1.5',
        }}
      >
        <Icon
          iconName='Info'
          style={{
            marginRight: '8px',
            fontSize: '14px',
            color: theme.palette.themePrimary,
          }}
        />
        {getStatusDescription(selectedStep.status)}
      </div>

      {/* Main content */}
      {renderContent()}

      {/* Enhanced mobile summary */}
      <div className={styles.mobileSummary}>
        <Icon
          iconName={getStatusIcon(selectedStep.status)}
          style={{
            marginRight: '8px',
            fontSize: '16px',
          }}
        />
        <strong>Step Summary:</strong> {selectedStep.title} • {getStatusLabel(selectedStep.status)}
      </div>
    </div>
  );
};

export default ContentArea;
