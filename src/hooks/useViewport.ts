import * as React from 'react';

export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type Breakpoints = {
  xs: number; // < xs = mobile
  sm: number;
  md: number;
  lg: number;
  xl: number; // >= xl
};

export type Orientation = 'portrait' | 'landscape';

export interface UseViewportOptions {
  /**
   * Custom breakpoints (merged with defaults)
   */
  breakpoints?: Partial<Breakpoints>;
  /**
   * Debounce resize events (ms)
   */
  debounceMs?: number;
  /**
   * Initial values for SSR
   */
  initialValues?: {
    width: number;
    height: number;
  };
}

/**
 * Default breakpoints matching common design systems
 * xs: 0–639, sm: 640–767, md: 768–1023, lg: 1024–1279, xl: 1280+
 */
const DEFAULT_BREAKPOINTS: Breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

function pickBreakpoint(width: number, bp: Breakpoints): BreakpointKey {
  if (width < bp.sm) return 'xs';
  if (width < bp.md) return 'sm';
  if (width < bp.lg) return 'md';
  if (width < bp.xl) return 'lg';
  return 'xl';
}

export type ViewportInfo = {
  width: number;
  height: number;
  breakpoint: BreakpointKey;
  orientation: Orientation;
  aspectRatio: number;
  // convenience flags
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  // range helpers
  up: (b: BreakpointKey) => boolean;
  down: (b: BreakpointKey) => boolean;
  between: (min: BreakpointKey, max: BreakpointKey) => boolean;
  // utility functions
  isPortrait: boolean;
  isLandscape: boolean;
  isSmallScreen: boolean; // xs or sm
  isLargeScreen: boolean; // lg or xl
};

/**
 * Enhanced viewport hook with device detection, orientation, and performance optimizations
 * - SSR-safe with configurable initial values
 * - Debounced resize events for better performance
 * - Device type detection (mobile/tablet/desktop)
 * - Orientation and aspect ratio information
 */
export function useViewport(options: UseViewportOptions = {}): ViewportInfo {
  const {
    breakpoints: customBreakpoints,
    debounceMs = 16, // ~60fps
    initialValues = { width: 1024, height: 768 },
  } = options;

  const bp = React.useMemo<Breakpoints>(
    () => ({ ...DEFAULT_BREAKPOINTS, ...customBreakpoints }),
    [customBreakpoints]
  );

  const getViewportSize = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return initialValues;
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }, [initialValues]);

  const [{ width, height }, setSize] = React.useState(() => getViewportSize());

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout>;

    let rafId = 0;

    const handleResize = () => {
      // Clear previous timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Debounce the resize handler
      timeoutId = setTimeout(() => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setSize(getViewportSize());
        });
      }, debounceMs);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Initial size check in case of layout shifts after mount
    handleResize();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [getViewportSize, debounceMs]);

  const computedInfo = React.useMemo((): ViewportInfo => {
    const breakpoint = pickBreakpoint(width, bp);
    const orientation: Orientation = height > width ? 'portrait' : 'landscape';
    const aspectRatio = width / height;

    const order: BreakpointKey[] = ['xs', 'sm', 'md', 'lg', 'xl'];
    const indexOf = (k: BreakpointKey) => order.indexOf(k);
    const bIndex = indexOf(breakpoint);

    const up = (k: BreakpointKey) => bIndex >= indexOf(k);
    const down = (k: BreakpointKey) => bIndex <= indexOf(k);
    const between = (min: BreakpointKey, max: BreakpointKey) =>
      bIndex >= indexOf(min) && bIndex <= indexOf(max);

    // Device type detection
    const isMobile = breakpoint === 'xs';
    const isTablet = breakpoint === 'sm' || breakpoint === 'md';
    const isDesktop = breakpoint === 'lg' || breakpoint === 'xl';

    return {
      width,
      height,
      breakpoint,
      orientation,
      aspectRatio,
      isXs: breakpoint === 'xs',
      isSm: breakpoint === 'sm',
      isMd: breakpoint === 'md',
      isLg: breakpoint === 'lg',
      isXl: breakpoint === 'xl',
      isMobile,
      isTablet,
      isDesktop,
      up,
      down,
      between,
      isPortrait: orientation === 'portrait',
      isLandscape: orientation === 'landscape',
      isSmallScreen: breakpoint === 'xs' || breakpoint === 'sm',
      isLargeScreen: breakpoint === 'lg' || breakpoint === 'xl',
    };
  }, [width, height, bp]);

  return computedInfo;
}

/**
 * Hook for detecting if the device is likely a touch device
 */
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTouchDevice = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(hasTouch);
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
}

/**
 * Hook for media queries with SSR support
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = React.useState(defaultValue);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Use the newer addEventListener if available, fallback to addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Legacy support
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
}
