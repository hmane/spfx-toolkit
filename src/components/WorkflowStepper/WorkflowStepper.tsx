import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mergeStyles, useTheme, Icon } from '@fluentui/react';
import { ContentArea } from './ContentArea';
import { StepItem } from './StepItem';
import { StepData, WorkflowStepperProps } from './types';
import {
  calculateCompletionPercentage,
  findAutoSelectStep,
  getNextClickableStepId,
  getPrevClickableStepId,
  getFirstClickableStepId,
  getLastClickableStepId,
  getStepById,
  isStepClickable,
  validateStepIds,
  getStepStatistics,
} from './utils';
import { getStepperStyles } from './WorkflowStepper.styles';

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  steps,
  mode = 'fullSteps',
  selectedStepId,
  onStepClick,
  minStepWidth,
  descriptionStyles,
  className,
  showScrollHint = true,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const stepsWrapperRef = useRef<HTMLDivElement>(null);
  const [internalSelectedStepId, setInternalSelectedStepId] = useState<string | null>(null);
  const [announceText, setAnnounceText] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showLeftScrollHint, setShowLeftScrollHint] = useState<boolean>(false);
  const [showRightScrollHint, setShowRightScrollHint] = useState<boolean>(false);

  // Validate step IDs on mount
  useEffect(() => {
    if (!validateStepIds(steps)) {
      console.warn(
        'WorkflowStepper: Duplicate step IDs detected. Each step must have a unique ID.'
      );
    }
  }, [steps]);

  // ENHANCED: More robust bidirectional scroll hint detection
  const checkScrollHints = useCallback(() => {
    if (!showScrollHint || !stepsWrapperRef.current) return;

    const wrapper = stepsWrapperRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = wrapper;

    // Add small tolerance for rounding errors
    const tolerance = 2;

    // Check if horizontal scrolling is actually possible
    const hasHorizontalScroll = scrollWidth > clientWidth + tolerance;

    if (!hasHorizontalScroll) {
      // No scrolling needed, hide both hints
      setShowLeftScrollHint(false);
      setShowRightScrollHint(false);
      return;
    }

    // Show left hint if user can scroll left (not at the very beginning)
    const canScrollLeft = scrollLeft > tolerance;

    // Show right hint if user can scroll right (not at the very end)
    const canScrollRight = scrollLeft + clientWidth < scrollWidth - tolerance;

    setShowLeftScrollHint(canScrollLeft);
    setShowRightScrollHint(canScrollRight);

    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Scroll Debug:', {
        scrollLeft,
        scrollWidth,
        clientWidth,
        hasHorizontalScroll,
        canScrollLeft,
        canScrollRight,
      });
    }
  }, [showScrollHint]);

  // Set up scroll hint detection
  useEffect(() => {
    if (!showScrollHint) return;

    const wrapper = stepsWrapperRef.current;
    if (!wrapper) return;

    // Function to check scroll after DOM changes
    const checkScrollDelayed = () => {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        setTimeout(checkScrollHints, 50); // Small delay to ensure rendering is complete
      });
    };

    // Initial check after component mounts
    checkScrollDelayed();

    // Add scroll listener
    wrapper.addEventListener('scroll', checkScrollHints, { passive: true });

    // Add resize listener to window
    const handleResize = () => {
      checkScrollDelayed();
    };
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver if available for more precise detection
    let resizeObserver: ResizeObserver | null = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        checkScrollDelayed();
      });
      resizeObserver.observe(wrapper);
    }

    return () => {
      wrapper.removeEventListener('scroll', checkScrollHints);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [checkScrollHints, showScrollHint, steps.length]);

  useEffect(() => {
    if (!showScrollHint) return;

    // Delay check to allow for DOM updates after steps change
    const timer = setTimeout(() => {
      checkScrollHints();
    }, 100);

    return () => clearTimeout(timer);
  }, [steps, checkScrollHints, showScrollHint]);

  // Determine which step should be selected
  const selectedStep = useMemo(() => {
    // If controlled selection is provided, use it
    if (selectedStepId) {
      return getStepById(steps, selectedStepId);
    }

    // If internal selection exists, use it
    if (internalSelectedStepId) {
      return getStepById(steps, internalSelectedStepId);
    }

    // Auto-select the first current step or last completed step
    return findAutoSelectStep(steps);
  }, [steps, selectedStepId, internalSelectedStepId]);

  // Update internal selection when controlled selection changes
  useEffect(() => {
    if (selectedStepId) {
      setInternalSelectedStepId(selectedStepId);
    }
  }, [selectedStepId]);

  // Auto-select step on initial load
  useEffect(() => {
    if (!isInitialized) {
      if (!selectedStepId && !internalSelectedStepId) {
        const autoStep = findAutoSelectStep(steps);
        if (autoStep) {
          setInternalSelectedStepId(autoStep.id);
        }
      }
      setIsInitialized(true);
    }
  }, [steps, selectedStepId, internalSelectedStepId, isInitialized]);

  const styles = useMemo(
    () =>
      getStepperStyles(theme, {
        fullWidth: false, // No longer needed with wrapper approach
        stepCount: steps.length,
        minStepWidth,
        mode,
      }),
    [theme, steps.length, minStepWidth, mode]
  );

  const stepStatistics = useMemo(() => getStepStatistics(steps), [steps]);

  const handleStepClick = useCallback(
    (step: StepData) => {
      if (!isStepClickable(step, mode)) return;

      // Update internal state
      setInternalSelectedStepId(step.id);

      // Announce to screen readers
      setAnnounceText(`Selected step: ${step.title}`);

      // Call external handler if provided
      if (onStepClick) {
        onStepClick(step);
      }
    },
    [mode, onStepClick]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!selectedStep) return;

      let targetStepId: string | null = null;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          targetStepId = getNextClickableStepId(steps, selectedStep.id, mode);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          targetStepId = getPrevClickableStepId(steps, selectedStep.id, mode);
          break;
        case 'Home':
          event.preventDefault();
          targetStepId = getFirstClickableStepId(steps, mode);
          break;
        case 'End':
          event.preventDefault();
          targetStepId = getLastClickableStepId(steps, mode);
          break;
      }

      if (targetStepId) {
        const targetStep = getStepById(steps, targetStepId);
        if (targetStep) {
          handleStepClick(targetStep);
        }
      }
    },
    [selectedStep, steps, mode, handleStepClick]
  );

  const completionPercentage = useMemo(() => calculateCompletionPercentage(steps), [steps]);

  const renderSteps = () => {
    return steps.map((step, index) => {
      const isSelected = selectedStep?.id === step.id;
      const clickable = isStepClickable(step, mode);

      return (
        <StepItem
          key={step.id}
          step={step}
          isSelected={isSelected}
          isClickable={clickable}
          onStepClick={handleStepClick}
          isLast={index === steps.length - 1}
          isFirst={index === 0}
          totalSteps={steps.length}
          stepIndex={index}
          minWidth={minStepWidth}
          descriptionStyles={descriptionStyles}
          mode={mode}
          fullWidth={false} // Always false now with wrapper approach
        />
      );
    });
  };

  const handleScrollLeft = useCallback(() => {
    if (!stepsWrapperRef.current) return;

    const wrapper = stepsWrapperRef.current;
    const scrollAmount = minStepWidth || 160; // Scroll by one step width

    wrapper.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth',
    });

    // Update scroll hints after animation
    setTimeout(checkScrollHints, 300);
  }, [minStepWidth, checkScrollHints]);

  const handleScrollRight = useCallback(() => {
    if (!stepsWrapperRef.current) return;

    const wrapper = stepsWrapperRef.current;
    const scrollAmount = minStepWidth || 160; // Scroll by one step width

    wrapper.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });

    // Update scroll hints after animation
    setTimeout(checkScrollHints, 300);
  }, [minStepWidth, checkScrollHints]);

  // NEW: Enhanced scroll hints with click functionality
  const renderScrollHints = () => {
    if (!showScrollHint) return null;

    return (
      <>
        {showLeftScrollHint && (
          <button
            className={styles.scrollHintLeft}
            onClick={handleScrollLeft}
            aria-label='Scroll left to see previous steps'
            type='button'
            style={{
              // Make it clearly clickable
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              padding: 0,
              outline: 'none',
            }}
            onFocus={e => {
              e.currentTarget.style.outline = `2px solid ${theme.palette.themePrimary}`;
            }}
            onBlur={e => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <Icon
              iconName='ChevronLeft'
              className={styles.scrollIcon}
              style={{
                fontSize: '16px',
                color: theme.palette.themePrimary,
              }}
            />
          </button>
        )}
        {showRightScrollHint && (
          <button
            className={styles.scrollHintRight}
            onClick={handleScrollRight}
            aria-label='Scroll right to see more steps'
            type='button'
            style={{
              // Make it clearly clickable
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              padding: 0,
              outline: 'none',
            }}
            onFocus={e => {
              e.currentTarget.style.outline = `2px solid ${theme.palette.themePrimary}`;
            }}
            onBlur={e => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <Icon
              iconName='ChevronRight'
              className={styles.scrollIcon}
              style={{
                fontSize: '16px',
                color: theme.palette.themePrimary,
              }}
            />
          </button>
        )}
      </>
    );
  };

  const containerClasses = mergeStyles(styles.container, className);

  const getAriaLabel = () => {
    const totalSteps = steps.length;
    const currentStepIndex = selectedStep ? steps.findIndex(s => s.id === selectedStep.id) + 1 : 0;

    return `Workflow stepper with ${totalSteps} steps. ${completionPercentage}% complete. ${
      currentStepIndex > 0
        ? `Currently on step ${currentStepIndex}: ${selectedStep?.title}`
        : 'No step selected'
    }`;
  };

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onKeyDown={handleKeyDown}
      role='application'
      aria-label={getAriaLabel()}
    >
      {/* Screen reader announcements */}
      <div className={styles.srOnly} aria-live='polite' aria-atomic='true'>
        {announceText}
      </div>

      {/* WRAPPER WITH RELATIVE POSITIONING FOR ARROWS */}
      <div className={styles.stepperContainer} style={{ position: 'relative' }}>
        {/* SCROLLABLE CONTAINER - NO ARROWS INSIDE HERE */}
        <div
          ref={stepsWrapperRef}
          className={styles.stepsWrapper}
          role='region'
          aria-label='Workflow progress'
          data-has-content={mode === 'fullSteps' ? 'true' : 'false'}
          data-standalone={mode !== 'fullSteps' ? 'true' : 'false'}
        >
          <div className={styles.stepsContainer} role='tablist' aria-label='Workflow steps'>
            {renderSteps()}
          </div>
        </div>

        {/* FIXED ARROWS - POSITIONED RELATIVE TO WRAPPER */}
        {renderScrollHints()}
      </div>

      {/* Content area */}
      {mode === 'fullSteps' && <ContentArea selectedStep={selectedStep} isVisible={true} />}

      {/* Progress indicator for screen readers */}
      <div className={styles.srOnly} aria-live='polite'>
        Workflow progress: {completionPercentage}% complete.
        {stepStatistics.completed} of {stepStatistics.total} steps completed.
        {stepStatistics.current > 0 && ` ${stepStatistics.current} step in progress.`}
        {stepStatistics.error > 0 && ` ${stepStatistics.error} steps have errors.`}
        {stepStatistics.warning > 0 && ` ${stepStatistics.warning} steps need attention.`}
        {stepStatistics.blocked > 0 && ` ${stepStatistics.blocked} steps are blocked.`}
      </div>
    </div>
  );
};

export default WorkflowStepper;
