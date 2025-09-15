import { AnimationConfig } from '../Card.types';
import { ANIMATION } from './constants';

/**
 * Animation utilities for Card components
 * Pure CSS-based animations with performance optimizations
 */

export interface AnimationOptions {
  duration?: number;
  easing?: string;
  delay?: number;
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

/**
 * Create CSS animation keyframes for card expansion
 */
export const createExpansionKeyframes = (maxHeight: number = 500): string => {
  return `
    @keyframes cardExpand {
      from {
        max-height: 0;
        opacity: 0;
        transform: scaleY(0.95);
      }
      to {
        max-height: ${maxHeight}px;
        opacity: 1;
        transform: scaleY(1);
      }
    }
  `;
};

/**
 * Create CSS animation keyframes for card collapse
 */
export const createCollapseKeyframes = (): string => {
  return `
    @keyframes cardCollapse {
      from {
        max-height: var(--card-content-height, 500px);
        opacity: 1;
        transform: scaleY(1);
      }
      to {
        max-height: 0;
        opacity: 0;
        transform: scaleY(0.95);
      }
    }
  `;
};

/**
 * Create CSS animation keyframes for card maximize
 */
export const createMaximizeKeyframes = (): string => {
  return `
    @keyframes cardMaximize {
      from {
        transform: scale(1);
        border-radius: var(--card-border-radius, 8px);
      }
      to {
        transform: scale(1);
        border-radius: 0;
      }
    }
  `;
};

/**
 * Create CSS animation keyframes for card restore
 */
export const createRestoreKeyframes = (): string => {
  return `
    @keyframes cardRestore {
      from {
        transform: scale(1);
        border-radius: 0;
      }
      to {
        transform: scale(1);
        border-radius: var(--card-border-radius, 8px);
      }
    }
  `;
};

/**
 * Create CSS animation keyframes for highlight effect
 */
export const createHighlightKeyframes = (): string => {
  return `
    @keyframes cardHighlight {
      0% {
        box-shadow: 0 0 0 0 var(--highlight-color, rgba(0, 120, 212, 0.4));
        transform: scale(1);
      }
      50% {
        box-shadow: 0 0 0 4px var(--highlight-color, rgba(0, 120, 212, 0.2));
        transform: scale(1.02);
      }
      100% {
        box-shadow: 0 0 0 2px var(--highlight-color, rgba(0, 120, 212, 0.1));
        transform: scale(1);
      }
    }
  `;
};

/**
 * Create shimmer animation for loading states
 */
export const createShimmerKeyframes = (): string => {
  return `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `;
};

/**
 * Create fade-in animation keyframes
 */
export const createFadeInKeyframes = (): string => {
  return `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
};

/**
 * Create fade-out animation keyframes
 */
export const createFadeOutKeyframes = (): string => {
  return `
    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-10px);
      }
    }
  `;
};

/**
 * Generate animation CSS properties
 */
export const getAnimationStyle = (
  animationName: string,
  config: AnimationConfig = {}
): React.CSSProperties => {
  const {
    duration = ANIMATION.DURATION.NORMAL,
    easing = ANIMATION.EASING.EASE_OUT,
    disabled = false,
  } = config;

  if (disabled) {
    return {};
  }

  return {
    animation: `${animationName} ${duration}ms ${easing}`,
    willChange: 'transform, opacity, max-height',
  };
};

/**
 * Apply animation to element with cleanup
 */
export const animateElement = (
  element: HTMLElement,
  animationName: string,
  options: AnimationOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!element) {
      reject(new Error('Element not found'));
      return;
    }

    const {
      duration = ANIMATION.DURATION.NORMAL,
      easing = ANIMATION.EASING.EASE_OUT,
      delay = 0,
      fillMode = 'both',
    } = options;

    // Set animation properties
    element.style.animation = `${animationName} ${duration}ms ${easing} ${delay}ms ${fillMode}`;

    const cleanup = () => {
      element.style.animation = '';
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      element.removeEventListener('animationend', handleAnimationEnd);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      element.removeEventListener('animationcancel', handleAnimationCancel);
    };

    const handleAnimationEnd = () => {
      cleanup();
      resolve();
    };

    const handleAnimationCancel = () => {
      cleanup();
      reject(new Error('Animation was cancelled'));
    };

    // Add event listeners
    element.addEventListener('animationend', handleAnimationEnd, { once: true });
    element.addEventListener('animationcancel', handleAnimationCancel, { once: true });

    // Fallback timeout
    setTimeout(() => {
      if (element.style.animation) {
        cleanup();
        resolve();
      }
    }, duration + delay + 100);
  });
};

/**
 * Create transition styles for smooth property changes
 */
export const getTransitionStyle = (
  properties: string[],
  duration: number = ANIMATION.DURATION.NORMAL,
  easing: string = ANIMATION.EASING.EASE_OUT
): React.CSSProperties => {
  return {
    transition: properties.map(prop => `${prop} ${duration}ms ${easing}`).join(', '),
    willChange: properties.join(', '),
  };
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get appropriate animation duration based on user preferences
 */
export const getAnimationDuration = (duration: number): number => {
  return prefersReducedMotion() ? Math.min(duration, 100) : duration;
};

/**
 * Create a CSS class name for animation
 */
export const getAnimationClassName = (
  baseClass: string,
  animationType:
    | 'expand'
    | 'collapse'
    | 'maximize'
    | 'restore'
    | 'highlight'
    | 'fade-in'
    | 'fade-out',
  isActive: boolean = false
): string => {
  const suffix = isActive ? `-${animationType}-active` : `-${animationType}`;
  return `${baseClass}${suffix}`;
};

/**
 * Inject keyframes into document head
 */
export const injectKeyframes = (keyframes: string, id: string): void => {
  // Check if already injected
  if (document.getElementById(id)) {
    return;
  }

  const style = document.createElement('style');
  style.id = id;
  style.textContent = keyframes;
  document.head.appendChild(style);
};

/**
 * Initialize all card animations
 */
export const initializeCardAnimations = (): void => {
  const keyframes = [
    { id: 'card-expand-keyframes', content: createExpansionKeyframes() },
    { id: 'card-collapse-keyframes', content: createCollapseKeyframes() },
    { id: 'card-maximize-keyframes', content: createMaximizeKeyframes() },
    { id: 'card-restore-keyframes', content: createRestoreKeyframes() },
    { id: 'card-highlight-keyframes', content: createHighlightKeyframes() },
    { id: 'card-shimmer-keyframes', content: createShimmerKeyframes() },
    { id: 'card-fade-in-keyframes', content: createFadeInKeyframes() },
    { id: 'card-fade-out-keyframes', content: createFadeOutKeyframes() },
  ];

  keyframes.forEach(({ id, content }) => {
    injectKeyframes(content, id);
  });
};

/**
 * Performance-optimized animation frame scheduler
 */
export class AnimationScheduler {
  private queue: Array<() => void> = [];
  private isRunning = false;

  public schedule(callback: () => void): void {
    this.queue.push(callback);
    if (!this.isRunning) {
      this.process();
    }
  }

  private process(): void {
    this.isRunning = true;

    const processFrame = () => {
      const start = performance.now();

      // Process callbacks within frame budget (16ms)
      while (this.queue.length > 0 && performance.now() - start < 14) {
        const callback = this.queue.shift();
        if (callback) {
          try {
            callback();
          } catch (error) {
            console.error('[SpfxCard] Animation callback error:', error);
          }
        }
      }

      // Continue processing if queue not empty
      if (this.queue.length > 0) {
        requestAnimationFrame(processFrame);
      } else {
        this.isRunning = false;
      }
    };

    requestAnimationFrame(processFrame);
  }

  public clear(): void {
    this.queue.length = 0;
    this.isRunning = false;
  }
}

// Global animation scheduler instance
export const animationScheduler = new AnimationScheduler();

/**
 * Debounced animation function
 */
export const debounceAnimation = (
  fn: () => void,
  delay: number = ANIMATION.DURATION.FAST
): (() => void) => {
let timeoutId: ReturnType<typeof setTimeout>;


  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      animationScheduler.schedule(fn);
    }, delay);
  };
};

/**
 * Create CSS variables for dynamic animation properties
 */
export const createAnimationVariables = (
  element: HTMLElement,
  variables: Record<string, string>
): void => {
  Object.entries(variables).forEach(([property, value]) => {
    element.style.setProperty(`--${property}`, value);
  });
};

/**
 * Smooth height transition helper
 */
export const smoothHeightTransition = (
  element: HTMLElement,
  targetHeight: number | 'auto',
  duration: number = ANIMATION.DURATION.NORMAL
): Promise<void> => {
  return new Promise(resolve => {
    const startHeight = element.offsetHeight;
    const endHeight = targetHeight === 'auto' ? element.scrollHeight : targetHeight;

    element.style.height = `${startHeight}px`;
    element.style.transition = `height ${duration}ms ${ANIMATION.EASING.EASE_OUT}`;

    // Force reflow
    void element.offsetHeight;

    element.style.height = `${endHeight}px`;

    const handleTransitionEnd = () => {
      if (targetHeight === 'auto') {
        element.style.height = 'auto';
      }
      element.style.transition = '';
      element.removeEventListener('transitionend', handleTransitionEnd);
      resolve();
    };

    element.addEventListener('transitionend', handleTransitionEnd, { once: true });

    // Fallback
    setTimeout(() => {
      if (element.style.transition) {
        handleTransitionEnd();
      }
    }, duration + 50);
  });
};
