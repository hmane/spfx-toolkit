import { Icon } from '@fluentui/react/lib/Icon';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import * as React from 'react';
import { useCallback, useRef } from 'react';
import { StepData, StepDescriptionStyles, StepperMode, StepStatus } from './types';
import { getCardsStyles } from './WorkflowStepper.styles';

export interface CardStepItemProps {
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
 * Cards variant step item - Elevated card design with hover lift effects
 */
export const CardStepItem: React.FC<CardStepItemProps> = ({
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
  const cardRef = useRef<HTMLDivElement>(null);
  const styles = getCardsStyles(theme);

  // Get status icon
  const getStatusIcon = (status: StepStatus): string => {
    const iconMap: Record<StepStatus, string> = {
      completed: 'CheckMark',
      current: 'Play',
      pending: 'Clock',
      warning: 'Warning',
      error: 'ErrorBadge',
      blocked: 'Blocked2',
    };
    return iconMap[status] || 'Clock';
  };

  // Get status label
  const getStatusLabel = (status: StepStatus): string => {
    const labelMap: Record<StepStatus, string> = {
      completed: 'Done',
      current: 'Active',
      pending: 'Pending',
      warning: 'Attention',
      error: 'Error',
      blocked: 'Blocked',
    };
    return labelMap[status] || 'Unknown';
  };

  // Get card style based on status
  const getCardStyle = (): string => {
    const statusStyles: Record<StepStatus, string> = {
      completed: styles.cardCompleted,
      current: styles.cardCurrent,
      pending: styles.cardPending,
      warning: styles.cardWarning,
      error: styles.cardError,
      blocked: styles.cardBlocked,
    };

    const baseStyle = statusStyles[step.status] || styles.cardPending;
    return isSelected
      ? mergeStyles(styles.card, baseStyle, styles.cardSelected)
      : mergeStyles(styles.card, baseStyle);
  };

  // Get icon container style based on status
  const getIconStyle = (): string => {
    const statusStyles: Record<StepStatus, string> = {
      completed: styles.cardIconCompleted,
      current: styles.cardIconCurrent,
      pending: styles.cardIconPending,
      warning: styles.cardIconWarning,
      error: styles.cardIconError,
      blocked: styles.cardIconBlocked,
    };

    const baseStyle = statusStyles[step.status] || styles.cardIconPending;
    return mergeStyles(styles.cardIcon, baseStyle);
  };

  // Get badge style based on status
  const getBadgeStyle = (): string => {
    const statusStyles: Record<StepStatus, string> = {
      completed: styles.badgeCompleted,
      current: styles.badgeCurrent,
      pending: styles.badgePending,
      warning: styles.badgeWarning,
      error: styles.badgeError,
      blocked: styles.badgeBlocked,
    };

    const baseStyle = statusStyles[step.status] || styles.badgePending;
    return mergeStyles(styles.statusBadge, baseStyle);
  };

  // Click handler
  const handleClick = useCallback(() => {
    if (isClickable) {
      if (cardRef.current) {
        cardRef.current.style.transform = 'scale(0.98)';
        setTimeout(() => {
          if (cardRef.current) {
            cardRef.current.style.transform = '';
          }
        }, 150);
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

  return (
    <div
      ref={cardRef}
      className={getCardStyle()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : 'listitem'}
      aria-label={getAriaLabel()}
      aria-current={isSelected ? 'step' : undefined}
      aria-disabled={!isClickable}
      tabIndex={isClickable ? 0 : -1}
      data-step-id={step.id}
      data-step-status={step.status}
      data-testid={`card-step-${step.id}`}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        animationDelay: `${stepIndex * 0.08}s`,
      }}
    >
      {/* Card Header */}
      <div className={styles.cardHeader}>
        {/* Icon */}
        <div className={getIconStyle()}>
          <Icon
            iconName={getStatusIcon(step.status)}
            aria-hidden="true"
          />
        </div>

        {/* Status Badge */}
        <div className={getBadgeStyle()}>
          {getStatusLabel(step.status)}
        </div>
      </div>

      {/* Card Title */}
      <div className={styles.cardTitle} title={step.title}>
        {step.title}
      </div>

      {/* Card Descriptions */}
      {(step.description1 || step.description2) && (
        <div className={styles.cardDescription}>
          {step.description1 && (
            <div style={descriptionStyles?.description1}>
              {step.description1}
            </div>
          )}
          {step.description2 && (
            <div
              style={{
                marginTop: '4px',
                opacity: 0.8,
                ...descriptionStyles?.description2,
              }}
            >
              {step.description2}
            </div>
          )}
        </div>
      )}

      {/* Card Footer */}
      <div className={styles.cardFooter}>
        <div className={styles.stepNumber}>
          <Icon iconName="NumberSymbol" style={{ fontSize: '10px' }} aria-hidden="true" />
          <span>Step {stepIndex + 1}</span>
        </div>
        <div>
          {stepIndex + 1} of {totalSteps}
        </div>
      </div>
    </div>
  );
};

export default CardStepItem;
