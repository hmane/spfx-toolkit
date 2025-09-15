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

  const renderContent = () => {
    if (!selectedStep.content) {
      return (
        <div className={styles.contentBody}>
          <p
            style={{
              color: theme.palette.neutralSecondary,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '20px 0',
            }}
          >
            No additional information available for this step.
          </p>
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

  const getStatusIcon = (status: string): string => {
    const iconMap: Record<string, string> = {
      completed: 'CheckMark',
      current: 'Clock',
      pending: 'Clock',
      warning: 'Warning',
      error: 'ErrorBadge',
      blocked: 'Blocked2',
    };
    return iconMap[status] || 'Clock';
  };

  const renderStatusBadge = () => {
    const colors = getStepColors(theme);
    const colorConfig = colors[selectedStep.status];
    const statusLabel = getStatusLabel(selectedStep.status);

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '16px',
          fontSize: theme.fonts.small.fontSize,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          backgroundColor: colorConfig.background,
          color: colorConfig.text,
          border: `1px solid ${colorConfig.border}`,
        }}
      >
        <Icon iconName={getStatusIcon(selectedStep.status)} style={{ fontSize: '12px' }} />
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: theme.palette.neutralLighterAlt,
          borderRadius: '6px',
          border: `1px solid ${theme.palette.neutralLight}`,
        }}
      >
        {selectedStep.description1 && (
          <div>
            <div
              style={{
                fontSize: theme.fonts.small.fontSize,
                fontWeight: 600,
                color: theme.palette.neutralSecondary,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <Icon iconName='Info' style={{ marginRight: '6px' }} />
              Status
            </div>
            <div
              style={{
                fontSize: theme.fonts.medium.fontSize,
                color: theme.palette.neutralPrimary,
                fontWeight: 400,
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
                fontSize: theme.fonts.small.fontSize,
                fontWeight: 600,
                color: theme.palette.neutralSecondary,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <Icon iconName='FileText' style={{ marginRight: '6px' }} />
              Details
            </div>
            <div
              style={{
                fontSize: theme.fonts.medium.fontSize,
                color: theme.palette.neutralPrimary,
                fontWeight: 400,
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
        style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: theme.palette.themeLighterAlt,
          border: `1px solid ${theme.palette.themeLight}`,
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Icon
          iconName='Clock'
          style={{
            color: theme.palette.themePrimary,
            fontSize: '16px',
          }}
        />
        <span
          style={{
            fontSize: theme.fonts.small.fontSize,
            color: theme.palette.themeDark,
            fontWeight: 500,
          }}
        >
          This step is currently in progress
        </span>
      </div>
    );
  };

  return (
    <div
      className={styles.contentArea}
      role='region'
      aria-label={`Content for ${selectedStep.title}`}
      aria-live='polite'
    >
      <div className={styles.contentHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <Icon
            iconName={getStatusIcon(selectedStep.status)}
            style={{
              fontSize: '24px',
              color: theme.palette.themePrimary,
            }}
          />
          <h2 className={styles.contentTitle}>{selectedStep.title}</h2>
        </div>
        {renderStatusBadge()}
      </div>

      {renderMetadata()}

      <div
        style={{
          marginBottom: '16px',
          fontSize: theme.fonts.small.fontSize,
          color: theme.palette.neutralSecondary,
          fontStyle: 'italic',
          padding: '8px 0',
        }}
      >
        {getStatusDescription(selectedStep.status)}
      </div>

      {renderProgressIndicator()}

      {renderContent()}

      {/* Mobile-friendly summary */}
      <div className={styles.mobileSummary}>
        <strong>Step Details:</strong> {selectedStep.title} • {getStatusLabel(selectedStep.status)}
      </div>
    </div>
  );
};

export default ContentArea;
