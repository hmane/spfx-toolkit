import './card.css';

import type { CardAction, CardProps } from './Card.types';
import {
  Card,
  SafeCard,
  CardContext,
  useCardContext,
  CardControllerComponent,
  withCardController,
  ActionButtons,
  Content,
  Footer,
  Header,
  SimpleHeader,
  IconHeader,
  BadgeHeader,
  SubtitleHeader,
  MaximizedView,
  CustomMaximizedView,
} from './components';
import {
  useCardController,
  useMaximize,
  usePersistence,
} from './hooks';
import {
  cardController,
  StorageService,
} from './services';
import {
  animationScheduler,
  initializeCardAnimations,
  VALIDATION,
} from './utils';
import Accordion, {
  ControlledAccordion,
  KeyboardAccordion,
  SearchableAccordion,
  useAccordion,
  type AccordionHandle,
} from './Accordion';

export * from './components';
export * from './hooks';
export * from './services';
export * from './utils';
export {
  Accordion,
  ControlledAccordion,
  KeyboardAccordion,
  SearchableAccordion,
  useAccordion,
};
export type { AccordionHandle };

export type {
  AccordionProps,
  ActionButtonsProps,
  CardAction,
  AnimationConfig,
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

// Note: CardVariant is deprecated but exported for backwards compatibility.
export type { CardVariant } from './Card.types';

export const CARD_VERSION = '1.0.3';

export const CARD_DEFAULTS = {
  size: 'regular' as const,
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

export const createCardConfig = (overrides?: Partial<CardProps>) => ({
  ...CARD_DEFAULTS,
  ...overrides,
});

export const isValidCardId = (id: string): boolean => VALIDATION.CARD_ID.test(id);

export const generateCardId = (prefix: string = 'card'): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}`;
};

export const checkBrowserSupport = (): {
  storage: boolean;
  animations: boolean;
  customProperties: boolean;
  intersectionObserver: boolean;
} => {
  const hasStorage = typeof Storage !== 'undefined';
  const hasAnimations = 'animate' in document.createElement('div');
  const hasCustomProperties =
    typeof CSS !== 'undefined' && CSS.supports && CSS.supports('--spfx-card-test', 'value');
  const hasIntersectionObserver = 'IntersectionObserver' in window;

  return {
    storage: hasStorage,
    animations: hasAnimations,
    customProperties: hasCustomProperties,
    intersectionObserver: hasIntersectionObserver,
  };
};

export const initializeCardSystem = (config?: {
  globalAnimation?: boolean;
  storagePrefix?: string;
  debugMode?: boolean;
}) => {
  const { globalAnimation = true, storagePrefix = 'spfx-cards', debugMode = false } = config || {};

  if (globalAnimation) {
    try {
      initializeCardAnimations();
    } catch (error) {
      console.warn('[SpfxCard] Animation initialization failed:', error);
    }
  }

  if (debugMode && typeof document !== 'undefined') {
    document.documentElement.classList.add('spfx-debug-animations');
  }

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

export const cleanupCardSystem = () => {
  try {
    animationScheduler.clear();
    cardController.cleanup();

    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('spfx-debug-animations');
    }

    console.log('[SpfxCard] System cleanup completed');
  } catch (error) {
    console.warn('[SpfxCard] Cleanup failed:', error);
  }
};

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

export const createHeaderProps = (
  actions: CardAction[],
  options?: {
    variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
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
 * @deprecated Prefer named imports instead of the bundled default export.
 */
const SpfxCard = Object.freeze({
  Card,
  SafeCard,
  CardContext,
  useCardContext,
  withCardController,
  CardControllerComponent,
  Header,
  SimpleHeader,
  IconHeader,
  BadgeHeader,
  SubtitleHeader,
  Content,
  Footer,
  ActionButtons,
  Accordion,
  MaximizedView,
  CustomMaximizedView,
  hooks: {
    useCardController,
    useMaximize,
    usePersistence,
  },
  services: {
    cardController,
    StorageService,
  },
  utils: {
    initializeCardSystem,
    cleanupCardSystem,
    createCardConfig,
    generateCardId,
    isValidCardId,
    checkBrowserSupport,
    getPerformanceMetrics,
    createHeaderProps,
  },
  VERSION: CARD_VERSION,
  DEFAULTS: CARD_DEFAULTS,
});

export default SpfxCard;
