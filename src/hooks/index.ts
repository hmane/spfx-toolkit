// Storage hooks
export { useLocalStorage } from './useLocalStorage';
export type { UseLocalStorageOptions, UseLocalStorageReturn } from './useLocalStorage';

// Viewport and responsive hooks
export { useViewport, useIsTouchDevice, useMediaQuery } from './useViewport';
export type {
  BreakpointKey,
  Breakpoints,
  Orientation,
  UseViewportOptions,
  ViewportInfo,
} from './useViewport';

// Re-export everything for convenience
export * from './useLocalStorage';
export * from './useViewport';
