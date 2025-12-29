import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { StepData, StepDescriptionStyles, StepperMode, StepStatus } from './types';
import { getMinimalStyles } from './WorkflowStepper.styles';

export interface MinimalStepItemProps {
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
  previousStepCompleted: boolean;
}

/**
 * Minimal variant step item - Ultra-clean horizontal dots connected by thin lines
 */
export const MinimalStepItem: React.FC<MinimalStepItemProps> = ({
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
  previousStepCompleted,
}) => {
  const theme = useTheme();
  const stepRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const styles = getMinimalStyles(theme);

  // Get dot style based on status
  const getDotStyle = (): string => {
    const statusStyles: Record<StepStatus, string> = {
      completed: styles.dotCompleted,
      current: styles.dotCurrent,
      pending: styles.dotPending,
      warning: styles.dotWarning,
      error: styles.dotError,
      blocked: styles.dotBlocked,
    };

    const baseStyle = statusStyles[step.status] || styles.dotPending;
    return isSelected
      ? mergeStyles(styles.dot, baseStyle, styles.dotSelected)
      : mergeStyles(styles.dot, baseStyle);
  };

  // Get connector style
  const getConnectorStyle = (): string => {
    // Show completed connector if current step is completed or previous step completed
    const isCompleted = step.status === 'completed' || previousStepCompleted;
    return isCompleted
      ? mergeStyles(styles.connector, styles.connectorCompleted)
      : styles.connector;
  };

  // Click handler
  const handleClick = useCallback(() => {
    if (isClickable) {
      if (stepRef.current) {
        stepRef.current.style.transform = 'scale(0.95)';
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

  // Tooltip handlers
  const handleMouseEnter = useCallback(() => {
    if (step.description1 || step.description2) {
      setShowTooltip(true);
    }
  }, [step.description1, step.description2]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Get ARIA attributes
  const getAriaLabel = () => {
    const position = `Step ${stepIndex + 1} of ${totalSteps}`;
    const status = step.status === 'current' ? 'currently active' : step.status;
    return `${position}: ${step.title}, status: ${status}`;
  };

  // Get tooltip content (only uses string descriptions, not React nodes)
  const getTooltipContent = (): string => {
    const parts: string[] = [step.title];
    if (step.description1 && typeof step.description1 === 'string') parts.push(step.description1);
    if (step.description2 && typeof step.description2 === 'string') parts.push(step.description2);
    return parts.join(' - ');
  };

  return (
    <div className={styles.stepWrapper}>
      {/* Connector line (not shown for first step) */}
      {!isFirst && (
        <div
          className={getConnectorStyle()}
          aria-hidden="true"
          style={{
            transitionDelay: `${(stepIndex - 1) * 0.1}s`,
          }}
        />
      )}

      {/* Step item */}
      <div
        ref={stepRef}
        className={styles.stepItem}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        role={isClickable ? 'button' : 'listitem'}
        aria-label={getAriaLabel()}
        aria-current={isSelected ? 'step' : undefined}
        aria-disabled={!isClickable}
        tabIndex={isClickable ? 0 : -1}
        data-step-id={step.id}
        data-step-status={step.status}
        data-testid={`minimal-step-${step.id}`}
        style={{
          cursor: isClickable ? 'pointer' : 'default',
        }}
      >
        {/* Tooltip */}
        {(step.description1 || step.description2) && (
          <div
            className={mergeStyles(
              styles.tooltip,
              showTooltip && styles.tooltipVisible
            )}
            role="tooltip"
            aria-hidden={!showTooltip}
          >
            {getTooltipContent()}
          </div>
        )}

        {/* Dot indicator */}
        <div className={getDotStyle()} aria-hidden="true" />

        {/* Label */}
        <div
          className={mergeStyles(
            styles.label,
            isSelected && styles.labelSelected
          )}
          title={step.title}
        >
          {step.title}
        </div>
      </div>
    </div>
  );
};

export default MinimalStepItem;
