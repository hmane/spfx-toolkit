import { Icon } from '@fluentui/react/lib/Icon';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { StepData, StepDescriptionStyles, StepperMode, StepStatus } from './types';
import { getTimelineStyles } from './WorkflowStepper.styles';

export interface TimelineStepItemProps {
  step: StepData;
  isSelected: boolean;
  isClickable: boolean;
  onStepClick: (step: StepData) => void;
  isLast: boolean;
  isFirst: boolean;
  totalSteps: number;
  stepIndex: number;
  descriptionStyles?: StepDescriptionStyles;
  mode: StepperMode;
}

/**
 * Timeline variant step item - Vertical layout with animated progress line and circular nodes
 */
export const TimelineStepItem: React.FC<TimelineStepItemProps> = ({
  step,
  isSelected,
  isClickable,
  onStepClick,
  isLast,
  isFirst,
  totalSteps,
  stepIndex,
  descriptionStyles,
  mode,
}) => {
  const theme = useTheme();
  const stepRef = useRef<HTMLDivElement>(null);
  const styles = getTimelineStyles(theme);

  // Get status icon
  const getStatusIcon = (status: StepStatus): string => {
    const iconMap: Record<StepStatus, string> = {
      completed: 'CheckMark',
      current: 'LocationDot',
      pending: 'CircleRing',
      warning: 'Warning',
      error: 'ErrorBadge',
      blocked: 'Blocked2',
    };
    return iconMap[status] || 'CircleRing';
  };

  // Get node style based on status
  const getNodeStyle = (): string => {
    const statusStyles: Record<StepStatus, string> = {
      completed: styles.nodeCompleted,
      current: styles.nodeCurrent,
      pending: styles.nodePending,
      warning: styles.nodeWarning,
      error: styles.nodeError,
      blocked: styles.nodeBlocked,
    };

    const baseStyle = statusStyles[step.status] || styles.nodePending;
    return isSelected
      ? mergeStyles(styles.node, baseStyle, styles.nodeSelected)
      : mergeStyles(styles.node, baseStyle);
  };

  // Click handler
  const handleClick = useCallback(() => {
    if (isClickable) {
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

  // Get ARIA attributes
  const getAriaLabel = () => {
    const position = `Step ${stepIndex + 1} of ${totalSteps}`;
    const status = step.status === 'current' ? 'currently active' : step.status;
    return `${position}: ${step.title}, status: ${status}`;
  };

  // Calculate progress line height for completed steps
  const shouldShowProgressLine = step.status === 'completed' && !isLast;

  return (
    <div
      ref={stepRef}
      className={styles.stepItem}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : 'listitem'}
      aria-label={getAriaLabel()}
      aria-current={isSelected ? 'step' : undefined}
      aria-disabled={!isClickable}
      tabIndex={isClickable ? 0 : -1}
      data-step-id={step.id}
      data-step-status={step.status}
      data-testid={`timeline-step-${step.id}`}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        animationDelay: `${stepIndex * 0.1}s`,
      }}
    >
      {/* Timeline node */}
      <div className={getNodeStyle()}>
        <Icon
          iconName={getStatusIcon(step.status)}
          style={{ fontSize: '12px' }}
          aria-hidden="true"
        />
      </div>

      {/* Progress line overlay for completed steps */}
      {shouldShowProgressLine && (
        <div
          className={styles.progressLine}
          style={{
            height: 'calc(100% + 8px)',
            animationDelay: `${stepIndex * 0.15}s`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Step content */}
      <div className={styles.content}>
        <div
          className={mergeStyles(
            styles.title,
            isSelected && styles.titleSelected
          )}
          title={step.title}
        >
          {step.title}
        </div>

        {step.description1 && (
          <div
            className={styles.description}
            style={descriptionStyles?.description1}
          >
            {step.description1}
          </div>
        )}

        {step.description2 && (
          <div
            className={styles.description}
            style={{
              opacity: 0.7,
              marginTop: '4px',
              ...descriptionStyles?.description2,
            }}
          >
            {step.description2}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineStepItem;
