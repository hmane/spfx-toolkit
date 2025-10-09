import { Icon } from '@fluentui/react/lib/Icon';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ContentArea } from './ContentArea';
import { StepItem } from './StepItem';
import { StepData, WorkflowStepperProps } from './types';
import {
  findAutoSelectStep,
  getFirstClickableStepId,
  getLastClickableStepId,
  getNextClickableStepId,
  getPrevClickableStepId,
  getStepById,
  isStepClickable,
  validateStepIds,
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Validate step IDs on mount
  useEffect(() => {
    if (!validateStepIds(steps)) {
      console.warn(
        'WorkflowStepper: Duplicate step IDs detected. Each step must have a unique ID.'
      );
    }
  }, [steps]);

  // Enhanced scroll hint detection with performance optimization
  const checkScrollHints = useCallback(() => {
    if (!showScrollHint || !stepsWrapperRef.current) return;

    const wrapper = stepsWrapperRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = wrapper;

    // Add tolerance for rounding errors
    const tolerance = 3;

    // Check if horizontal scrolling is actually possible
    const hasHorizontalScroll = scrollWidth > clientWidth + tolerance;

    if (!hasHorizontalScroll) {
      setShowLeftScrollHint(false);
      setShowRightScrollHint(false);
      return;
    }

    // Show hints based on scroll position
    const canScrollLeft = scrollLeft > tolerance;
    const canScrollRight = scrollLeft + clientWidth < scrollWidth - tolerance;

    setShowLeftScrollHint(canScrollLeft);
    setShowRightScrollHint(canScrollRight);
  }, [showScrollHint]);

  // Set up scroll hint detection with better performance
  useEffect(() => {
    if (!showScrollHint) return;

    const wrapper = stepsWrapperRef.current;
    if (!wrapper) return;

    // Debounced check function
    let timeoutId: NodeJS.Timeout;
    const checkScrollDelayed = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        requestAnimationFrame(checkScrollHints);
      }, 100);
    };

    // Initial check
    checkScrollDelayed();

    // Event listeners
    wrapper.addEventListener('scroll', checkScrollHints, { passive: true });
    window.addEventListener('resize', checkScrollDelayed);

    // ResizeObserver for better detection
    let resizeObserver: ResizeObserver | null = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(checkScrollDelayed);
      resizeObserver.observe(wrapper);
    }

    return () => {
      clearTimeout(timeoutId);
      wrapper.removeEventListener('scroll', checkScrollHints);
      window.removeEventListener('resize', checkScrollDelayed);
      resizeObserver?.disconnect();
    };
  }, [checkScrollHints, showScrollHint, steps.length]);

  // Check scroll hints when steps change
  useEffect(() => {
    if (!showScrollHint) return;

    const timer = setTimeout(() => {
      checkScrollHints();
    }, 150);

    return () => clearTimeout(timer);
  }, [steps, checkScrollHints, showScrollHint]);

  // Determine selected step with auto-selection logic
  const selectedStep = useMemo(() => {
    if (selectedStepId) {
      return getStepById(steps, selectedStepId);
    }

    if (internalSelectedStepId) {
      return getStepById(steps, internalSelectedStepId);
    }

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
        fullWidth: false,
        stepCount: steps.length,
        minStepWidth,
        mode,
      }),
    [theme, steps.length, minStepWidth, mode]
  );

  // Enhanced step click handler with loading state
  const handleStepClick = useCallback(
    async (step: StepData) => {
      if (!isStepClickable(step, mode) || isLoading) return;

      setIsLoading(true);

      try {
        // Update internal state
        setInternalSelectedStepId(step.id);

        // Enhanced announcement for screen readers
        const statusText = step.status === 'current' ? 'currently active' : step.status;
        setAnnounceText(`Navigated to step: ${step.title}, status: ${statusText}`);

        // Call external handler if provided
        if (onStepClick) {
          await Promise.resolve(onStepClick(step));
        }
      } catch (error) {
        console.error('Error handling step click:', error);
        setAnnounceText(`Error navigating to step: ${step.title}`);
      } finally {
        setIsLoading(false);
      }
    },
    [mode, onStepClick, isLoading]
  );

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!selectedStep || isLoading) return;

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
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (isStepClickable(selectedStep, mode)) {
            handleStepClick(selectedStep);
          }
          return;
      }

      if (targetStepId) {
        const targetStep = getStepById(steps, targetStepId);
        if (targetStep) {
          handleStepClick(targetStep);
        }
      }
    },
    [selectedStep, steps, mode, handleStepClick, isLoading]
  );

  // Enhanced step rendering with icons
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
          fullWidth={false}
        />
      );
    });
  };

  // Enhanced scroll handlers with smooth animation
  const handleScrollLeft = useCallback(() => {
    if (!stepsWrapperRef.current || isLoading) return;

    const wrapper = stepsWrapperRef.current;
    const scrollAmount = minStepWidth || 180;

    wrapper.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth',
    });

    // Update scroll hints after animation
    setTimeout(checkScrollHints, 400);
  }, [minStepWidth, checkScrollHints, isLoading]);

  const handleScrollRight = useCallback(() => {
    if (!stepsWrapperRef.current || isLoading) return;

    const wrapper = stepsWrapperRef.current;
    const scrollAmount = minStepWidth || 180;

    wrapper.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });

    // Update scroll hints after animation
    setTimeout(checkScrollHints, 400);
  }, [minStepWidth, checkScrollHints, isLoading]);

  // Enhanced scroll hints with better accessibility
  const renderScrollHints = () => {
    if (!showScrollHint) return null;

    return (
      <>
        {showLeftScrollHint && (
          <button
            className={mergeStyles(styles.scrollHintLeft, 'scroll-arrow')}
            onClick={handleScrollLeft}
            disabled={isLoading}
            aria-label='Scroll left to see previous steps'
            type='button'
            onFocus={e => {
              e.currentTarget.style.outline = `3px solid ${theme.palette.themePrimary}60`;
            }}
            onBlur={e => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <Icon iconName='ChevronLeft' className={styles.scrollIcon} aria-hidden='true' />
          </button>
        )}
        {showRightScrollHint && (
          <button
            className={mergeStyles(styles.scrollHintRight, 'scroll-arrow scroll-arrow-right')}
            onClick={handleScrollRight}
            disabled={isLoading}
            aria-label='Scroll right to see more steps'
            type='button'
            onFocus={e => {
              e.currentTarget.style.outline = `3px solid ${theme.palette.themePrimary}60`;
            }}
            onBlur={e => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <Icon iconName='ChevronRight' className={styles.scrollIcon} aria-hidden='true' />
          </button>
        )}
      </>
    );
  };

  const containerClasses = mergeStyles(styles.container, className);

  const getAriaLabel = () => {
    const totalSteps = steps.length;
    const currentStepIndex = selectedStep ? steps.findIndex(s => s.id === selectedStep.id) + 1 : 0;

    return `Interactive workflow stepper with ${totalSteps} steps. ${
      currentStepIndex > 0
        ? `Currently viewing step ${currentStepIndex} of ${totalSteps}: ${selectedStep?.title}`
        : 'No step selected'
    }. Use arrow keys to navigate, Enter to select.`;
  };

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onKeyDown={handleKeyDown}
      role='application'
      aria-label={getAriaLabel()}
      data-testid='workflow-stepper'
    >
      {/* Enhanced screen reader announcements */}
      <div className={styles.srOnly} aria-live='polite' aria-atomic='true' role='status'>
        {announceText}
      </div>

      {/* Loading overlay for better UX */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(2px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
          }}
          aria-hidden='true'
        >
          <Icon
            iconName='ProgressRingDots'
            style={{
              fontSize: '32px',
              color: theme.palette.themePrimary,
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}

      {/* Enhanced stepper container */}
      <div
        className={styles.stepperContainer}
        data-standalone={mode !== 'fullSteps' ? 'true' : 'false'}
      >
        {/* Scrollable steps container */}
        <div
          ref={stepsWrapperRef}
          className={styles.stepsWrapper}
          role='region'
          aria-label='Workflow steps'
          data-has-content={mode === 'fullSteps' ? 'true' : 'false'}
          data-standalone={mode !== 'fullSteps' ? 'true' : 'false'}
        >
          <div
            className={styles.stepsContainer}
            role='tablist'
            aria-label='Workflow step navigation'
            aria-orientation='horizontal'
          >
            {renderSteps()}
          </div>
        </div>

        {/* Enhanced scroll hints */}
        {renderScrollHints()}
      </div>

      {/* Enhanced content area - ONLY shows step content */}
      {mode === 'fullSteps' && <ContentArea selectedStep={selectedStep} isVisible={true} />}
    </div>
  );
};

export default WorkflowStepper;
