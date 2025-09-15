// ==================== Storage Constants ====================
export const STORAGE_KEYS = {
  PREFIX: 'spfx-cards',
  CARD_STATES: 'card-states',
  ACCORDION_STATES: 'accordion-states',
  USER_PREFERENCES: 'user-preferences'
} as const;

// ==================== Animation Constants ====================
export const ANIMATION = {
  DURATION: {
    FAST: 200,
    NORMAL: 350,
    SLOW: 500
  },
  EASING: {
    EASE_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  }
} as const;

// ==================== Breakpoints (SharePoint Compatible) ====================
export const BREAKPOINTS = {
  SMALL: 480,
  MEDIUM: 768,
  LARGE: 1024,
  XLARGE: 1200,
  SHAREPOINT_SMALL: 640,  // SharePoint specific
  SHAREPOINT_MEDIUM: 1024 // SharePoint specific
} as const;

// ==================== Default Icons (Fluent UI) ====================
export const DEFAULT_ICONS = {
  EXPAND: 'ChevronDown',
  COLLAPSE: 'ChevronUp',
  MAXIMIZE: 'FullScreen',
  RESTORE: 'BackToWindow',
  CLOSE: 'Cancel',
  LOADING: 'ProgressRingDots',
  ERROR: 'ErrorBadge',
  SUCCESS: 'CheckMark',
  WARNING: 'Warning',
  INFO: 'Info'
} as const;

// ==================== Size Configurations ====================
export const SIZE_CONFIG = {
  compact: {
    headerPadding: '8px 12px',
    contentPadding: '8px 12px',
    footerPadding: '6px 12px',
    minHeight: '40px',
    fontSize: '14px'
  },
  regular: {
    headerPadding: '16px 20px',
    contentPadding: '16px 20px',
    footerPadding: '12px 20px',
    minHeight: '56px',
    fontSize: '16px'
  },
  large: {
    headerPadding: '24px 28px',
    contentPadding: '24px 28px',
    footerPadding: '16px 28px',
    minHeight: '72px',
    fontSize: '18px'
  },
  'full-width': {
    headerPadding: '20px 24px',
    contentPadding: '20px 24px',
    footerPadding: '16px 24px',
    minHeight: '60px',
    fontSize: '16px',
    width: '100%'
  }
} as const;

// ==================== Padding Configurations ====================
export const PADDING_CONFIG = {
  none: '0',
  compact: '8px',
  comfortable: '16px',
  spacious: '24px',
  loose: '32px'
} as const;

// ==================== Theme Colors (SharePoint Compatible) ====================
export const THEME_COLORS = {
  success: {
    background: 'var(--green, #107c10)',
    color: 'var(--white, #ffffff)',
    border: 'var(--greenDark, #0e6e0e)'
  },
  error: {
    background: 'var(--red, #d13438)',
    color: 'var(--white, #ffffff)',
    border: 'var(--redDark, #b52c31)'
  },
  warning: {
    background: 'var(--yellow, #ffb900)',
    color: 'var(--neutralPrimary, #323130)',
    border: 'var(--yellowDark, #e6a500)'
  },
  info: {
    background: 'var(--themePrimary, #0078d4)',
    color: 'var(--white, #ffffff)',
    border: 'var(--themeDark, #106ebe)'
  },
  default: {
    background: 'var(--neutralLighter, #f8f9fa)',
    color: 'var(--neutralPrimary, #323130)',
    border: 'var(--neutralLight, #edebe9)'
  }
} as const;

// ==================== Z-Index Management ====================
export const Z_INDEX = {
  BASE: 1,
  DROPDOWN: 1000,
  TOOLTIP: 1010,
  MODAL: 1020,
  MAXIMIZED_CARD: 1030,
  BACKDROP: 1025
} as const;

// ==================== Loading States ====================
export const LOADING_TEMPLATES = {
  skeleton: {
    headerHeight: '20px',
    lineHeight: '16px',
    lineCount: 3,
    spacing: '12px'
  },
  shimmer: {
    animationDuration: '1.5s',
    gradientColors: [
      'var(--neutralLighter, #f8f9fa)',
      'var(--neutralLight, #edebe9)',
      'var(--neutralLighter, #f8f9fa)'
    ]
  }
} as const;

// ==================== Accessibility ====================
export const A11Y = {
  ROLES: {
    REGION: 'region',
    BUTTON: 'button',
    TAB: 'tab',
    TABPANEL: 'tabpanel'
  },
  ARIA: {
    EXPANDED: 'aria-expanded',
    CONTROLS: 'aria-controls',
    LABELLEDBY: 'aria-labelledby',
    DESCRIBEDBY: 'aria-describedby',
    HIDDEN: 'aria-hidden'
  },
  KEYS: {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown'
  }
} as const;

// ==================== Performance Thresholds ====================
export const PERFORMANCE = {
  DEBOUNCE_DELAY: 200,
  THROTTLE_DELAY: 100,
  INTERSECTION_THRESHOLD: 0.1,
  VIRTUALIZATION_THRESHOLD: 50, // cards
  BATCH_SIZE: 10,
  ANIMATION_FRAME_BUDGET: 16 // milliseconds
} as const;

// ==================== Error Messages ====================
export const ERROR_MESSAGES = {
  CARD_NOT_FOUND: 'Card not found',
  INVALID_CARD_ID: 'Invalid card ID provided',
  CONTROLLER_NOT_INITIALIZED: 'Card controller not initialized',
  STORAGE_NOT_AVAILABLE: 'Local storage not available',
  INVALID_CONFIGURATION: 'Invalid configuration provided',
  ANIMATION_FAILED: 'Animation failed to execute',
  SCROLL_FAILED: 'Failed to scroll to card'
} as const;

// ==================== Validation Patterns ====================
export const VALIDATION = {
  CARD_ID: /^[a-zA-Z0-9\-_]+$/,
  STORAGE_KEY: /^[a-zA-Z0-9\-_.]+$/,
  CSS_UNIT: /^(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw)$/
} as const;
