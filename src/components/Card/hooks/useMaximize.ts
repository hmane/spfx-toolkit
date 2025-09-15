import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimationConfig } from '../Card.types';
import { getAnimationDuration } from '../utils/animations';
import { Z_INDEX } from '../utils/constants';

export const useMaximize = (
  cardId: string,
  enabled: boolean = true,
  animation: AnimationConfig = {},
  onMaximize?: () => void,
  onRestore?: () => void
) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const originalStyleRef = useRef<{
    position: string;
    top: string;
    left: string;
    width: string;
    height: string;
    zIndex: string;
    transform: string;
  }>();
  const elementRef = useRef<HTMLElement>();
  const backdropRef = useRef<HTMLElement>();
  // FIXED: Add state tracking to prevent multiple calls
  const isMaximizingRef = useRef(false);

  const getCardElement = useCallback((): HTMLElement | null => {
    if (elementRef.current) return elementRef.current;

    const element = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
    if (element) {
      elementRef.current = element;
    }
    return element;
  }, [cardId]);

  const createBackdrop = useCallback((): HTMLElement => {
    if (backdropRef.current) return backdropRef.current;

    const backdrop = document.createElement('div');
    backdrop.className = 'spfx-card-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: ${Z_INDEX.BACKDROP};
      opacity: 0;
      transition: opacity ${getAnimationDuration(animation.duration || 300)}ms ease-out;
      backdrop-filter: blur(2px);
    `;

    document.body.appendChild(backdrop);
    backdropRef.current = backdrop;

    // Force reflow and fade in
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
    });

    return backdrop;
  }, [animation.duration]);

  const removeBackdrop = useCallback(() => {
    if (!backdropRef.current) return;

    const backdrop = backdropRef.current;
    backdrop.style.opacity = '0';

    setTimeout(() => {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
      backdropRef.current = undefined;
    }, getAnimationDuration(animation.duration || 300));
  }, [animation.duration]);

  // FIXED: Improved restore function
  const restore = useCallback(async () => {
    if (!enabled || !isMaximized || isAnimating || isMaximizingRef.current) return false;

    const element = getCardElement();
    if (!element || !originalStyleRef.current) {
      console.warn(`[SpfxCard] Card element or original styles not found: ${cardId}`);
      return false;
    }

    isMaximizingRef.current = true;
    setIsAnimating(true);

    try {
      const original = originalStyleRef.current;
      const duration = getAnimationDuration(animation.duration || 350);

      // Apply transition
      element.style.transition = `all ${duration}ms ${
        animation.easing || 'cubic-bezier(0.4, 0, 0.2, 1)'
      }`;

      // Animate back to original position
      element.style.top = original.top;
      element.style.left = original.left;
      element.style.width = original.width;
      element.style.height = original.height;
      element.style.borderRadius = '8px';

      // Wait for animation to complete
      await new Promise<void>(resolve => {
        setTimeout(() => {
          // Restore all original styles
          element.style.position = original.position;
          element.style.top = original.top;
          element.style.left = original.left;
          element.style.width = original.width;
          element.style.height = original.height;
          element.style.zIndex = original.zIndex;
          element.style.transform = original.transform;
          element.style.margin = '';
          element.style.transition = '';

          // Remove maximized class
          element.classList.remove('spfx-card-maximized');

          // Remove backdrop
          removeBackdrop();

          setIsMaximized(false);
          setIsAnimating(false);
          isMaximizingRef.current = false;
          onRestore?.();
          resolve();
        }, duration);
      });

      return true;
    } catch (error) {
      console.error('[SpfxCard] Error restoring card:', error);
      setIsAnimating(false);
      isMaximizingRef.current = false;
      return false;
    }
  }, [
    enabled,
    isMaximized,
    isAnimating,
    cardId,
    animation,
    onRestore,
    getCardElement,
    removeBackdrop,
  ]);

  // FIXED: Improved maximize function
  const maximize = useCallback(async () => {
    if (!enabled || isMaximized || isAnimating || isMaximizingRef.current) return false;

    const element = getCardElement();
    if (!element) {
      console.warn(`[SpfxCard] Card element not found: ${cardId}`);
      return false;
    }

    isMaximizingRef.current = true;
    setIsAnimating(true);

    try {
      // Store original styles
      const computedStyle = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      originalStyleRef.current = {
        position: element.style.position || computedStyle.position,
        top: element.style.top || `${rect.top}px`,
        left: element.style.left || `${rect.left}px`,
        width: element.style.width || `${rect.width}px`,
        height: element.style.height || `${rect.height}px`,
        zIndex: element.style.zIndex || computedStyle.zIndex,
        transform: element.style.transform || computedStyle.transform,
      };

      // Create backdrop first
      const backdrop = createBackdrop();
      const duration = getAnimationDuration(animation.duration || 350);

      // Set initial position (current position)
      element.style.position = 'fixed';
      element.style.top = `${rect.top}px`;
      element.style.left = `${rect.left}px`;
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
      element.style.zIndex = Z_INDEX.MAXIMIZED_CARD.toString();
      element.style.margin = '0';
      element.style.transition = `all ${duration}ms ${
        animation.easing || 'cubic-bezier(0.4, 0, 0.2, 1)'
      }`;

      // Add maximized class
      element.classList.add('spfx-card-maximized');

      // FIXED: Use requestAnimationFrame for smoother animation
      requestAnimationFrame(() => {
        // Animate to fullscreen
        element.style.top = '0';
        element.style.left = '0';
        element.style.width = '100vw';
        element.style.height = '100vh';
        element.style.borderRadius = '0';
      });

      // Handle backdrop click
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target === backdrop) {
          restore().catch(console.error);
        }
      };
      backdrop.addEventListener('click', handleBackdropClick);

      // Wait for animation to complete
      await new Promise<void>(resolve => {
        setTimeout(() => {
          setIsMaximized(true);
          setIsAnimating(false);
          isMaximizingRef.current = false;
          onMaximize?.();
          resolve();
        }, duration);
      });

      return true;
    } catch (error) {
      console.error('[SpfxCard] Error maximizing card:', error);
      setIsAnimating(false);
      isMaximizingRef.current = false;
      return false;
    }
  }, [
    enabled,
    isMaximized,
    isAnimating,
    cardId,
    animation,
    onMaximize,
    getCardElement,
    createBackdrop,
  ]);

  const toggle = useCallback(() => {
    return isMaximized ? restore() : maximize();
  }, [isMaximized, maximize, restore]);

  // Rest of the hook remains the same...
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isMaximized) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        restore().catch(console.error);
      }
    },
    [isMaximized, restore]
  );

  useEffect(() => {
    if (isMaximized) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMaximized, handleKeyDown]);

  useEffect(() => {
    return () => {
      if (isMaximized) {
        // Emergency cleanup
        const element = getCardElement();
        if (element && originalStyleRef.current) {
          const original = originalStyleRef.current;
          element.style.position = original.position;
          element.style.top = original.top;
          element.style.left = original.left;
          element.style.width = original.width;
          element.style.height = original.height;
          element.style.zIndex = original.zIndex;
          element.style.transform = original.transform;
          element.style.margin = '';
          element.style.transition = '';
          element.classList.remove('spfx-card-maximized');
        }

        if (backdropRef.current) {
          const backdrop = backdropRef.current;
          if (backdrop.parentNode) {
            backdrop.parentNode.removeChild(backdrop);
          }
        }

        document.body.style.overflow = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!isMaximized) return;

    const handleResize = () => {
      const element = getCardElement();
      if (element) {
        element.style.width = '100vw';
        element.style.height = '100vh';
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMaximized, getCardElement]);

  return {
    isMaximized,
    isAnimating,
    maximize,
    restore,
    toggle,
    canMaximize: enabled && !isAnimating && !isMaximizingRef.current,
    canRestore: enabled && isMaximized && !isAnimating && !isMaximizingRef.current,
  };
};

/**
 * Hook for managing maximize portal (alternative implementation)
 */
export const useMaximizePortal = (cardId: string, enabled: boolean = true) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Create portal container
  const createPortalContainer = useCallback(() => {
    if (portalContainer) return portalContainer;

    const container = document.createElement('div');
    container.className = 'spfx-card-maximize-portal';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: ${Z_INDEX.MAXIMIZED_CARD};
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    document.body.appendChild(container);
    setPortalContainer(container);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return container;
  }, [portalContainer]);

  // Remove portal container
  const removePortalContainer = useCallback(() => {
    if (portalContainer && portalContainer.parentNode) {
      portalContainer.parentNode.removeChild(portalContainer);
      setPortalContainer(null);
    }
    // Restore body scroll
    document.body.style.overflow = '';
  }, [portalContainer]);

  // Maximize using portal
  const maximize = useCallback(() => {
    if (!enabled || isMaximized) return false;

    createPortalContainer();
    setIsMaximized(true);
    return true;
  }, [enabled, isMaximized, createPortalContainer]);

  // Restore from portal
  const restore = useCallback(() => {
    if (!enabled || !isMaximized) return false;

    removePortalContainer();
    setIsMaximized(false);
    return true;
  }, [enabled, isMaximized, removePortalContainer]);

  // Toggle portal
  const toggle = useCallback(() => {
    return isMaximized ? restore() : maximize();
  }, [isMaximized, maximize, restore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (portalContainer) {
        removePortalContainer();
      }
    };
  }, []);

  return {
    isMaximized,
    maximize,
    restore,
    toggle,
    portalContainer,
  };
};
