// ==================== Import All Dependencies ====================
import { ActionButtons } from './components/ActionButtons';
import {
  Card,
  CardContext,
  CardControllerComponent,
  SafeCard,
  useCardContext,
  withCardController,
} from './components/Card';
import { Content, Footer } from './components/Content';
import { ActionFooter, ProgressFooter, StatusFooter } from './components/Footer';
import {
  BadgeHeader,
  Header,
  IconHeader,
  SimpleHeader,
  SubtitleHeader,
  type EnhancedHeaderProps,
} from './components/Header';
import { CustomMaximizedView, MaximizedView } from './components/MaximizedView';

// Accordion Components
import Accordion, {
  ControlledAccordion,
  KeyboardAccordion,
  SearchableAccordion,
  useAccordion,
  type AccordionHandle,
} from './Accordion';

// Loading Components
import {
  CardLoading,
  ContentLoadingPlaceholder,
  CustomLoading,
  HeaderLoadingShimmer,
  LoadingDots,
  LoadingErrorBoundary,
  OverlayLoading,
  ProgressLoading,
  ShimmerLoading,
  SkeletonLoading,
  SpinnerLoading,
} from './components/LoadingStates';

// Services
import { cardController } from './services/CardController';
import { StorageService } from './services/StorageService';

// Hooks
import {
  useAllCardStates,
  useCardController,
  useCardControllerStats,
  useCardState,
  useCardSubscription,
  useGlobalCardSubscription,
} from './hooks/useCardController';

import {
  useAccordionPersistence,
  useAutoPersistence,
  useBulkPersistence,
  useCrossTabSync,
  usePersistence,
  useStorageCleanup,
  useStorageStats,
  useValidatedPersistence,
} from './hooks/usePersistence';

import { useMaximize, useMaximizePortal } from './hooks/useMaximize';

// Utilities
import {
  animateElement,
  animationScheduler,
  AnimationScheduler,
  createAnimationVariables,
  debounceAnimation,
  getAnimationClassName,
  getAnimationDuration,
  getAnimationStyle,
  getTransitionStyle,
  initializeCardAnimations,
  injectKeyframes,
  prefersReducedMotion,
  smoothHeightTransition,
} from './utils/animations';

import {
  A11Y,
  ANIMATION,
  BREAKPOINTS,
  DEFAULT_ICONS,
  ERROR_MESSAGES,
  LOADING_TEMPLATES,
  PADDING_CONFIG,
  PERFORMANCE,
  SIZE_CONFIG,
  STORAGE_KEYS,
  THEME_COLORS,
  VALIDATION,
  Z_INDEX,
} from './utils/constants';

// FIXED: Updated Types - Removed redundant CardVariant from CardProps
import type {
  AccordionProps,
  ActionButtonsProps,
  AnimationConfig,
  CardAction,
  CardContextType,
  CardController,
  CardControllerHook,
  CardError,
  CardEventData,
  CardEventType,
  CardProps,
  CardRegistration,
  CardSize,
  CardState,
  // REMOVED: CardVariant is no longer used in CardProps
  CardVariant,
  ContentPadding,
  ContentProps,
  FooterProps,
  HeaderProps,
  HeaderSize,
  LoadingStateProps,
  LoadingType,
  MaximizedViewProps,
  PersistedCardState,
  ScrollOptions,
  StorageConfig,
  WithCardControllerProps,
} from './Card.types';

// ==================== Re-Export All Components ====================
// Core Card Components
export { Card, CardContext, SafeCard, useCardContext };

// Header Components
  export { BadgeHeader, Header, IconHeader, SimpleHeader, SubtitleHeader, type EnhancedHeaderProps };

// Content and Layout Components
  export {
    ActionButtons, ActionFooter, Content,
    CustomMaximizedView,
    Footer, MaximizedView, ProgressFooter,
    StatusFooter
  };

// Accordion Components
  export {
    Accordion,
    ControlledAccordion,
    KeyboardAccordion,
    SearchableAccordion,
    useAccordion,
    type AccordionHandle
  };

// Loading Components
  export {
    CardLoading,
    ContentLoadingPlaceholder,
    CustomLoading,
    HeaderLoadingShimmer,
    LoadingDots,
    LoadingErrorBoundary,
    OverlayLoading,
    ProgressLoading,
    ShimmerLoading,
    SkeletonLoading,
    SpinnerLoading
  };

// Services
  export { cardController, StorageService };

// Hooks
  export {
    useAllCardStates,
    useCardController,
    useCardControllerStats,
    useCardState,
    useCardSubscription,
    useGlobalCardSubscription
  };

  export {
    useAccordionPersistence,
    useAutoPersistence,
    useBulkPersistence,
    useCrossTabSync,
    usePersistence,
    useStorageCleanup,
    useStorageStats,
    useValidatedPersistence
  };

  export { useMaximize, useMaximizePortal };

// Utilities
  export {
    animateElement,
    animationScheduler,
    AnimationScheduler,
    createAnimationVariables,
    debounceAnimation,
    getAnimationClassName,
    getAnimationDuration,
    getAnimationStyle,
    getTransitionStyle,
    initializeCardAnimations,
    injectKeyframes,
    prefersReducedMotion,
    smoothHeightTransition
  };

  export {
    A11Y,
    ANIMATION,
    BREAKPOINTS,
    DEFAULT_ICONS,
    ERROR_MESSAGES,
    LOADING_TEMPLATES,
    PADDING_CONFIG,
    PERFORMANCE,
    SIZE_CONFIG,
    STORAGE_KEYS,
    THEME_COLORS,
    VALIDATION,
    Z_INDEX
  };

// FIXED: Updated Types Export
  export type {
    AccordionProps,
    ActionButtonsProps,
    AnimationConfig,
    CardAction,
    CardContextType,
    CardController,
    CardControllerHook,
    CardError,
    CardEventData,
    CardEventType,
    CardProps,
    CardRegistration, // Still available for header usage
    CardSize,
    CardState, // FIXED: No longer includes variant prop
    CardVariant,
    ContentPadding,
    ContentProps,
    FooterProps,
    HeaderProps,
    HeaderSize,
    LoadingStateProps,
    LoadingType,
    MaximizedViewProps,
    PersistedCardState,
    ScrollOptions,
    StorageConfig,
    WithCardControllerProps
  };

// Class Component Support
  export { CardControllerComponent, withCardController };

// ==================== Constants for External Use ====================
export const CARD_VERSION = '1.0.3'; // Updated version for fixes

// FIXED: Updated defaults - removed variant from card defaults
export const CARD_DEFAULTS = {
  size: 'regular' as const,
  // REMOVED: variant: 'default' as const, // No longer needed for Card
  headerSize: 'regular' as const,
  loadingType: 'none' as const,
  contentPadding: 'comfortable' as const,
  elevation: 2 as const,
  allowExpand: true,
  allowMaximize: false,
  lazyLoad: false,
  persist: false,
  highlightOnProgrammaticChange: true,
  highlightDuration: 600,
  animation: {
    duration: 350,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    disabled: false,
  },
} as const;

// ==================== Utility Functions ====================

/**
 * FIXED: Create a card configuration object with defaults (removed variant)
 */
export const createCardConfig = (overrides?: Partial<CardProps>) => ({
  ...CARD_DEFAULTS,
  ...overrides,
});

/**
 * Validate card ID format
 */
export const isValidCardId = (id: string): boolean => {
  return VALIDATION.CARD_ID.test(id);
};

/**
 * Generate a unique card ID
 */
export const generateCardId = (prefix: string = 'card'): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Check if browser supports required features
 */
export const checkBrowserSupport = (): {
  storage: boolean;
  animations: boolean;
  customProperties: boolean;
  intersectionObserver: boolean;
} => {
  const hasStorage = typeof Storage !== 'undefined';
  const hasAnimations = 'animate' in document.createElement('div');
  const hasCustomProperties =
    typeof CSS !== 'undefined' && CSS.supports && CSS.supports('--test', 'value');
  const hasIntersectionObserver = 'IntersectionObserver' in window;

  return {
    storage: hasStorage,
    animations: hasAnimations,
    customProperties: hasCustomProperties,
    intersectionObserver: hasIntersectionObserver,
  };
};

/**
 * Initialize the card system with global configuration
 */
export const initializeCardSystem = (config?: {
  globalAnimation?: boolean;
  storagePrefix?: string;
  debugMode?: boolean;
}) => {
  const { globalAnimation = true, storagePrefix = 'spfx-cards', debugMode = false } = config || {};

  // Initialize animations if enabled
  if (globalAnimation) {
    try {
      initializeCardAnimations();
    } catch (error) {
      console.warn('[SpfxCard] Animation initialization failed:', error);
    }
  }

  // Set global debug mode
  if (debugMode && typeof document !== 'undefined') {
    document.documentElement.classList.add('spfx-debug-animations');
  }

  // Log system status
  const support = checkBrowserSupport();
  if (debugMode) {
    console.log('[SpfxCard] System initialized with config:', config);
    console.log('[SpfxCard] Browser support:', support);
  }

  return {
    version: CARD_VERSION,
    support,
    config: {
      globalAnimation,
      storagePrefix,
      debugMode,
    },
  };
};

/**
 * Cleanup card system resources
 */
export const cleanupCardSystem = () => {
  try {
    // Clear animation scheduler
    animationScheduler.clear();

    // Cleanup card controller
    cardController.cleanup();

    // Remove debug classes
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('spfx-debug-animations');
    }

    console.log('[SpfxCard] System cleanup completed');
  } catch (error) {
    console.warn('[SpfxCard] Cleanup failed:', error);
  }
};

// ==================== Performance Monitoring ====================
export const getPerformanceMetrics = () => {
  try {
    const stats = cardController.getStats();
    const storageService = StorageService.getInstance();
    const storageStats = storageService.getStats();

    return {
      cards: stats,
      storage: storageStats,
      timestamp: Date.now(),
      memory:
        typeof performance !== 'undefined' && (performance as any).memory
          ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
            }
          : null,
    };
  } catch (error) {
    console.warn('[SpfxCard] Performance metrics failed:', error);
    return {
      cards: {},
      storage: {},
      timestamp: Date.now(),
      memory: null,
    };
  }
};

/**
 * FIXED: Simple helper to create header props with actions (supports variant)
 */
export const createHeaderProps = (
  actions: CardAction[],
  options?: {
    variant?: 'success' | 'error' | 'warning' | 'info' | 'default'; // FIXED: Strict typing
    size?: 'compact' | 'regular' | 'large';
    hideExpandButton?: boolean;
    hideMaximizeButton?: boolean;
  }
) => {
  const { variant, size, hideExpandButton, hideMaximizeButton } = options || {};

  return {
    variant,
    size,
    actions,
    hideExpandButton,
    hideMaximizeButton,
  };
};

/**
 * Get version information
 */
export const getVersionInfo = () => ({
  version: CARD_VERSION,
  buildDate: new Date().toISOString(),
  dependencies: {
    react: '>=16.8.0',
    fluentui: '>=8.0.0',
  },
  features: [
    'Card expand/collapse',
    'Card maximize/restore',
    'Accordion support',
    'Multiple loading states',
    'Persistence with localStorage',
    'Responsive design',
    'Accessibility support',
    'SharePoint theming',
    'TypeScript support',
    'Class component support',
    'Performance optimizations',
    'Animation system',
    'Error boundaries',
    'Enhanced header variants',
    'Proper content padding',
    'Fixed footer visibility',
    'Improved maximized view',
    'Fixed focus management', // NEW
    'Enhanced accordion variants', // NEW
  ],
  browser: checkBrowserSupport(),
  fixes: [
    'Removed redundant card variant property',
    'Fixed maximize animation timing',
    'Removed duplicate restore button',
    'Hide header buttons in maximized view',
    'Fixed annoying header focus outline',
    'Fixed accordion allowMultiple functionality',
    'Enhanced accordion variant visual differences',
  ],
});

// ==================== Default Export ====================
const SpfxCard = {
  // Core Components
  Card,
  SafeCard,

  // Header Components
  Header,
  SimpleHeader,
  IconHeader,
  BadgeHeader,
  SubtitleHeader,

  // Content and Layout
  Content,
  Footer,
  ActionButtons,
  Accordion,

  // Specialized Components
  MaximizedView,
  CustomMaximizedView,

  // Hooks
  useCardController,
  useMaximize,
  usePersistence,

  // Services
  cardController,

  // Utilities
  initializeCardSystem,
  cleanupCardSystem,
  createCardConfig,
  generateCardId,
  isValidCardId,
  checkBrowserSupport,
  getPerformanceMetrics,
  getVersionInfo,
  createHeaderProps,

  // Constants
  VERSION: CARD_VERSION,
  DEFAULTS: CARD_DEFAULTS,
};

export default SpfxCard;
