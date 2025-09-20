import * as React from 'react';
import { useCallback, useRef } from 'react';
import { useTheme, Icon } from '@fluentui/react';
import { StepData, StepDescriptionStyles, StepperMode } from './types';
import { getStepperStyles, getStepItemStyles } from './WorkflowStepper.styles';

export interface StepItemProps {
  step: StepData;
  isSelected: boolean;
  isClickable: boolean;
  onStepClick: (step: StepData) => void;
  isLast: boolean;
  isFirst: boolean;
  totalSteps: number;
  stepIndex: number;
  minWidth?: number;
  descriptionStyles?: StepDescriptionStyles;
  mode: StepperMode;
  fullWidth?: boolean;
}

export const StepItem: React.FC<StepItemProps> = ({
  step,
  isSelected,
  isClickable,
  onStepClick,
  isLast,
  isFirst,
  totalSteps,
  stepIndex,
  minWidth,
  descriptionStyles,
  mode,
  fullWidth = true,
}) => {
  const theme = useTheme();
  const stepRef = useRef<HTMLDivElement>(null);

  const styles = getStepperStyles(theme, {
    fullWidth,
    stepCount: totalSteps,
    minStepWidth: minWidth,
    mode,
  });

  const stepContentStyles = getStepItemStyles(theme, step.status, isSelected, isClickable, mode);

  // Enhanced click handler with haptic feedback simulation
  const handleClick = useCallback(() => {
    if (isClickable) {
      // Add a subtle animation feedback
      if (stepRef.current) {
        stepRef.current.style.transform = 'scale(0.98)';
        setTimeout(() => {
          if (stepRef.current) {
            stepRef.current.style.transform = '';
          }
        }, 100);
      }
      onStepClick(step);
    }
  }, [isClickable, onStepClick, step]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        handleClick();
      }
    },
    [isClickable, handleClick]
  );

  // Get status icon based on step status
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

  // Get enhanced description styles
  const getDefaultDescriptionStyles = () => {
    return {
      description1: {
        fontSize: mode === 'compact' ? theme.fonts.small.fontSize : theme.fonts.medium.fontSize,
        fontWeight: 500,
        ...descriptionStyles?.description1,
      },
      description2: {
        fontSize: theme.fonts.small.fontSize,
        fontWeight: 400,
        opacity: 0.9,
        ...descriptionStyles?.description2,
      },
    };
  };

  const defaultStyles = getDefaultDescriptionStyles();

  // Get the appropriate content style based on step position
  const getStepContentClass = () => {
    const baseClass = styles.stepContent;

    if (totalSteps === 1) {
      return `${baseClass} ${styles.stepContentSingle}`;
    }

    if (isFirst) {
      return `${baseClass} ${styles.stepContentFirst}`;
    }

    if (isLast) {
      return `${baseClass} ${styles.stepContentLast}`;
    }

    return `${baseClass} ${styles.stepContentMiddle}`;
  };

  // Enhanced step text rendering without icons
  const renderStepText = () => {
    return (
      <div className={styles.stepText}>
        <div className={styles.stepTitle} title={step.title}>
          {step.title}
        </div>

        {step.description1 && (
          <div
            className={styles.stepDescription1}
            style={defaultStyles.description1}
            title={step.description1}
          >
            {step.description1}
          </div>
        )}

        {step.description2 && (
          <div
            className={styles.stepDescription2}
            style={defaultStyles.description2}
            title={step.description2}
          >
            {step.description2}
          </div>
        )}
      </div>
    );
  };

  // Remove step number badge for cleaner look
  const renderStepNumber = () => {
    return null; // Removed as requested
  };

  // Render status indicator badge - only for selected steps
  const renderStatusBadge = () => {
    if (mode === 'compact' || !isSelected) return null;

    const statusLabels: Record<string, string> = {
      completed: 'Done',
      current: 'Active',
      pending: 'Waiting',
      warning: 'Attention',
      error: 'Error',
      blocked: 'Blocked',
    };

    const statusColors: Record<string, string> = {
      completed: '#107c10',
      current: theme.palette.themePrimary,
      pending: theme.palette.neutralSecondary,
      warning: '#ffb900',
      error: '#d13438',
      blocked: '#ff8c00',
    };

    return (
      <div
        style={{
          position: 'absolute',
          top: '-6px',
          right: '16px',
          background: statusColors[step.status] || theme.palette.neutralSecondary,
          color: theme.palette.white,
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
          zIndex: 2,
          animation: step.status === 'current' ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      >
        {statusLabels[step.status] || 'Unknown'}
      </div>
    );
  };

  // Remove progress indicator - no more lines
  const renderProgressIndicator = () => {
    return null; // Removed as requested
  };

  // Get appropriate ARIA labels for accessibility
  const getAriaLabel = () => {
    const position = `Step ${stepIndex + 1} of ${totalSteps}`;
    const status = step.status === 'current' ? 'currently active' : step.status;
    const clickable = isClickable ? 'selectable' : 'not selectable';

    return `${position}: ${step.title}, status: ${status}, ${clickable}`;
  };

  const getAriaDescription = () => {
    const descriptions = [];
    if (step.description1) descriptions.push(step.description1);
    if (step.description2) descriptions.push(step.description2);
    return descriptions.join(', ');
  };

  return (
    <div
      ref={stepRef}
      className={styles.stepItem}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : 'listitem'}
      aria-label={getAriaLabel()}
      aria-description={getAriaDescription()}
      aria-current={isSelected ? 'step' : undefined}
      aria-disabled={!isClickable}
      tabIndex={isClickable ? 0 : -1}
      data-step-id={step.id}
      data-step-status={step.status}
      data-step-index={stepIndex}
      data-is-first={isFirst}
      data-is-last={isLast}
      data-testid={`workflow-step-${step.id}`}
      style={{
        minWidth: minWidth ? `${minWidth}px` : undefined,
        cursor: isClickable ? 'pointer' : 'not-allowed',
      }}
    >
      {/* Main step content */}
      <div className={`${getStepContentClass()} ${stepContentStyles}`}>
        {renderStepText()}
        {renderProgressIndicator()}
      </div>

      {/* Remove focus ring for cleaner selected state */}
    </div>
  );
};

export default StepItem;
