import * as React from 'react';
import { useCallback, useRef } from 'react';
import { useTheme } from '@fluentui/react';
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

  const handleClick = useCallback(() => {
    if (isClickable) {
      onStepClick(step);
    }
  }, [isClickable, onStepClick, step]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onStepClick(step);
      }
    },
    [isClickable, onStepClick, step]
  );

  const getDefaultDescriptionStyles = () => {
    return {
      description1: {
        fontSize: mode === 'compact' ? theme.fonts.xSmall.fontSize : theme.fonts.small.fontSize,
        fontWeight: 400,
        ...descriptionStyles?.description1,
      },
      description2: {
        fontSize: theme.fonts.xSmall.fontSize,
        fontWeight: 300,
        opacity: 0.8,
        ...descriptionStyles?.description2,
      },
    };
  };

  const defaultStyles = getDefaultDescriptionStyles();

  // Get the appropriate content style based on step position
  const getStepContentClass = () => {
    const baseClass = styles.stepContent;

    // Single step (only one step in the entire workflow)
    if (totalSteps === 1) {
      return `${baseClass} ${styles.stepContentSingle}`;
    }

    // First step (no arrow at beginning)
    if (isFirst) {
      return `${baseClass} ${styles.stepContentFirst}`;
    }

    // Last step (keep arrow at end)
    if (isLast) {
      return `${baseClass} ${styles.stepContentLast}`;
    }

    // Regular middle steps (arrows on both sides)
    return `${baseClass} ${styles.stepContentMiddle}`;
  };

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

  return (
    <div
      ref={stepRef}
      className={styles.stepItem}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : 'presentation'}
      aria-label={isClickable ? `Step: ${step.title}` : `Step: ${step.title} (not clickable)`}
      aria-current={isSelected ? 'step' : undefined}
      aria-disabled={!isClickable}
      tabIndex={isClickable ? 0 : -1}
      data-step-id={step.id}
      data-step-status={step.status}
      data-step-index={stepIndex}
      data-is-first={isFirst}
      data-is-last={isLast}
      style={{
        minWidth: minWidth ? `${minWidth}px` : undefined,
        cursor: isClickable ? 'pointer' : 'not-allowed',
      }}
    >
      <div className={`${getStepContentClass()} ${stepContentStyles}`}>{renderStepText()}</div>
    </div>
  );
};

export default StepItem;
