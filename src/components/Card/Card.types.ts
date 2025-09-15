import { ITooltipHostProps } from '@fluentui/react';
import { CSSProperties, MouseEvent, ReactNode } from 'react';

// ==================== Basic Types ====================

export type CardVariant = 'success' | 'error' | 'warning' | 'info' | 'default';
export type CardSize = 'compact' | 'regular' | 'large' | 'full-width';
export type HeaderSize = 'compact' | 'regular' | 'large';
export type LoadingType = 'none' | 'spinner' | 'skeleton' | 'shimmer' | 'overlay';

export type ContentPadding =
  | 'none' // 0px
  | 'compact' // 8px
  | 'comfortable' // 16px - default
  | 'spacious' // 24px
  | 'loose' // 32px
  | string // custom like "12px 20px"
  | {
      // granular control
      top?: string | number;
      right?: string | number;
      bottom?: string | number;
      left?: string | number;
    };

// ==================== Action Types ====================

export interface CardAction {
  id: string;
  label: string;
  icon?: string; // Fluent UI icon name
  onClick: (cardId?: string) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  tooltip?: string | ITooltipHostProps;
  hideOnMobile?: boolean;
  mobileIcon?: string;
  ariaLabel?: string;
  className?: string;
}

// ==================== Event Types ====================

export interface CardEventData {
  cardId: string;
  isExpanded: boolean;
  isMaximized?: boolean;
  timestamp: number;
  source: 'user' | 'programmatic';
  metadata?: Record<string, unknown>;
}

export type CardEventType =
  | 'expand'
  | 'collapse'
  | 'maximize'
  | 'restore'
  | 'contentLoad'
  | 'programmaticToggle';

// ==================== Animation Types ====================

export interface AnimationConfig {
  duration?: number; // milliseconds
  easing?: string; // CSS easing function
  disabled?: boolean;
}

export interface ScrollOptions {
  smooth?: boolean;
  block?: 'start' | 'center' | 'end' | 'nearest';
  inline?: 'start' | 'center' | 'end' | 'nearest';
  highlight?: boolean;
  offset?: number;
}

// ==================== State Types ====================

export interface CardState {
  id: string;
  isExpanded: boolean;
  isMaximized: boolean;
  hasContentLoaded: boolean;
  lastUpdated?: number;
}

export interface CardRegistration {
  id: string;
  isExpanded: boolean;
  isMaximized: boolean;
  hasContentLoaded: boolean;
  toggleFn: (source?: 'user' | 'programmatic') => void;
  expandFn: (source?: 'user' | 'programmatic') => void;
  collapseFn: (source?: 'user' | 'programmatic') => void;
  maximizeFn?: (source?: 'user' | 'programmatic') => void;
  restoreFn?: (source?: 'user' | 'programmatic') => void;
  scrollToFn?: (options?: ScrollOptions) => void;
  highlightFn?: () => void;
}

// ==================== Context Types ====================

export interface CardContextType {
  id: string;
  isExpanded: boolean;
  isMaximized: boolean;
  allowExpand: boolean;
  allowMaximize: boolean;
  disabled: boolean;
  loading: boolean;
  loadingType: LoadingType;
  variant: CardVariant;
  size: CardSize;
  customHeaderColor?: string;
  lazyLoad: boolean;
  hasContentLoaded: boolean;
  headerSize: HeaderSize;
  accessibility?: {
    expandButtonLabel?: string;
    collapseButtonLabel?: string;
    maximizeButtonLabel?: string;
    restoreButtonLabel?: string;
  };
  onToggleExpand: (source?: 'user' | 'programmatic') => void;
  onToggleMaximize: (source?: 'user' | 'programmatic') => void;
  onActionClick: (action: CardAction, event: MouseEvent) => void;
  onContentLoad: () => void;
}

// ==================== Component Props ====================

export interface CardProps {
  /** Unique identifier for the card */
  id: string;

  /** Card size variant */
  size?: CardSize;

  /** Whether the card is expanded by default */
  defaultExpanded?: boolean;

  /** Whether the card can be collapsed/expanded */
  allowExpand?: boolean;

  /** Whether the card can be maximized */
  allowMaximize?: boolean;

  /** Icon for maximize button */
  maximizeIcon?: string;

  /** Icon for restore button */
  restoreIcon?: string;

  // REMOVED: Card variant is redundant, only header variant is used
  // variant?: CardVariant;

  /** Header size - affects padding and font size */
  headerSize?: HeaderSize;

  /** Custom background color for header (overrides variant) */
  customHeaderColor?: string;

  /** Loading state */
  loading?: boolean;

  /** Loading type */
  loadingType?: LoadingType;

  /** Loading message */
  loadingMessage?: string;

  /** Enable lazy loading - content loads only when expanded */
  lazyLoad?: boolean;

  /** Enable persistence of card state */
  persist?: boolean;

  /** Custom storage key for persistence */
  persistKey?: string;

  /** Highlight border on programmatic changes */
  highlightOnProgrammaticChange?: boolean;

  /** Duration of highlight effect in milliseconds */
  highlightDuration?: number;

  /** Custom highlight color */
  highlightColor?: string;

  /** Animation configuration */
  animation?: AnimationConfig;

  /** Callback when card is expanded */
  onExpand?: (data: CardEventData) => void;

  /** Callback when card is collapsed */
  onCollapse?: (data: CardEventData) => void;

  /** Callback when card is maximized */
  onMaximize?: (data: CardEventData) => void;

  /** Callback when card is restored */
  onRestore?: (data: CardEventData) => void;

  /** Callback when card data is loaded */
  onDataLoaded?: (data: CardEventData) => void;

  /** Callback when content is loaded for first time (lazy loading) */
  onContentLoad?: (data: CardEventData) => void;

  /** Global event listener for card events */
  onCardEvent?: (type: CardEventType, data: CardEventData) => void;

  /** Custom CSS class */
  className?: string;

  /** Custom styles */
  style?: CSSProperties;

  /** Card elevation/shadow level */
  elevation?: 1 | 2 | 3 | 4 | 5;

  /** Whether card is disabled */
  disabled?: boolean;

  /** Custom theme overrides */
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
  };

  /** Accessibility options */
  accessibility?: {
    expandButtonLabel?: string;
    collapseButtonLabel?: string;
    maximizeButtonLabel?: string;
    restoreButtonLabel?: string;
    loadingLabel?: string;
    region?: boolean;
    labelledBy?: string;
    describedBy?: string;
  };

  /** Performance options */
  performance?: {
    debounceToggle?: number;
    virtualizeContent?: boolean;
    preloadThreshold?: number;
    memoizeContent?: boolean;
  };

  /** Children components */
  children: ReactNode;
}

export interface HeaderProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  clickable?: boolean;
  showLoadingShimmer?: boolean;
  size?: HeaderSize;
  actions?: CardAction[];
  hideExpandButton?: boolean;
  hideMaximizeButton?: boolean;
  showTooltips?: boolean;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default'; // FIXED: Strict typing instead of string
}

export interface ActionButtonsProps {
  actions?: CardAction[];
  className?: string;
  style?: CSSProperties;
  hideExpandButton?: boolean;
  hideMaximizeButton?: boolean;
  position?: 'left' | 'right' | 'center';
  stackOnMobile?: boolean;
  showTooltips?: boolean;
}

export interface ContentProps {
  children: ReactNode | (() => ReactNode);
  className?: string;
  style?: CSSProperties;
  padding?: ContentPadding;
  loadingPlaceholder?: ReactNode;
  errorBoundary?: boolean;
}

export interface FooterProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  backgroundColor?: string;
  borderTop?: boolean;
  padding?: ContentPadding;
  textAlign?: 'left' | 'center' | 'right';
}

export interface MaximizedViewProps {
  cardId: string;
  children: ReactNode;
  onRestore: () => void;
  className?: string;
  style?: CSSProperties;
  backdrop?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  restoreIcon?: string;
}

export interface LoadingStateProps {
  type: LoadingType;
  message?: string;
  className?: string;
  style?: CSSProperties;
}

// ==================== Accordion Types ====================
export interface AccordionProps {
  /** Unique identifier for the accordion */
  id: string;

  /** Allow multiple cards to be expanded simultaneously */
  allowMultiple?: boolean;

  /** Cards that should be expanded by default */
  defaultExpanded?: string[];

  /** Remove spacing between cards */
  spacing?: 'none' | 'compact' | 'regular';

  /**
   * Visual connection between cards:
   * - 'default': Normal spacing with individual card shadows
   * - 'connected': Cards are visually connected with overlapping borders
   * - 'outlined': Cards are contained within a single border container
   */
  variant?: 'default' | 'connected' | 'outlined';

  /** Enable persistence of accordion state */
  persist?: boolean;

  /** Custom storage key for persistence */
  persistKey?: string;

  /** Callback when card states change */
  onCardChange?: (expandedCards: string[]) => void;

  /** Custom CSS class */
  className?: string;

  /** Custom styles */
  style?: CSSProperties;

  /** Children - should be Card components */
  children: ReactNode;
}

// ==================== Controller Types ====================

export interface CardController {
  // Basic operations
  expandAll(highlight?: boolean): void;
  collapseAll(highlight?: boolean): void;
  toggleCard(id: string, highlight?: boolean): boolean;
  expandCard(id: string, highlight?: boolean): boolean;
  collapseCard(id: string, highlight?: boolean): boolean;

  // Maximize operations
  maximizeCard(id: string): boolean;
  restoreCard(id: string): boolean;
  toggleMaximize(id: string): boolean;
  isCardMaximized(id: string): boolean;

  // Scroll operations
  scrollToCard(id: string, options?: ScrollOptions): Promise<boolean>;
  expandAndScrollTo(id: string, options?: ScrollOptions): Promise<boolean>;

  // State management
  getCardStates(): CardState[];
  getCardState(id: string): CardState | null;
  highlightCard(id: string): boolean;

  // Persistence
  persistStates(): void;
  restoreStates(): void;
  clearStoredStates(): void;

  // Subscriptions
  subscribe(cardId: string, callback: (action: string, data?: unknown) => void): () => void;
  subscribeGlobal(callback: (action: string, cardId: string, data?: unknown) => void): () => void;

  // Batch operations
  batchOperation(
    operations: Array<{
      cardId: string;
      action: 'expand' | 'collapse' | 'toggle' | 'maximize' | 'restore';
    }>,
    highlight?: boolean
  ): Promise<boolean[]>;

  // Registration (internal use)
  registerCard(registration: CardRegistration): void;
  unregisterCard(id: string): void;
  updateCardState(id: string, state: Partial<CardState>): void;
}

// ==================== Storage Types ====================

export interface StorageConfig {
  prefix?: string;
  namespace?: string;
  expiration?: number; // milliseconds
}

export interface PersistedCardState {
  cardStates: Record<string, CardState>;
  timestamp: number;
  version: string;
}

// ==================== Utility Types ====================

export interface CardControllerHook {
  controller: CardController;
  // Convenience methods
  expandAll: (highlight?: boolean) => void;
  collapseAll: (highlight?: boolean) => void;
  toggleCard: (id: string, highlight?: boolean) => boolean;
  expandCard: (id: string, highlight?: boolean) => boolean;
  collapseCard: (id: string, highlight?: boolean) => boolean;
  maximizeCard: (id: string) => boolean;
  restoreCard: (id: string) => boolean;
  expandAndScrollTo: (id: string, options?: ScrollOptions) => Promise<boolean>;
  scrollToCard: (id: string, options?: ScrollOptions) => Promise<boolean>;
  toggleMaximize: (id: string) => boolean;
  isCardMaximized: (id: string) => boolean;
  batchOperation: (
    operations: Array<{
      cardId: string;
      action: 'expand' | 'collapse' | 'toggle' | 'maximize' | 'restore';
    }>,
    highlight?: boolean
  ) => Promise<boolean[]>;
  getCardStates: () => CardState[];
  getCardState: (id: string) => CardState | null;
  highlightCard: (id: string) => boolean;
  subscribe: (cardId: string, callback: (action: string, data?: unknown) => void) => () => void;
  subscribeGlobal: (
    callback: (action: string, cardId: string, data?: unknown) => void
  ) => () => void;
  persistStates: () => void;
  restoreStates: () => void;
  clearStoredStates: () => void;
  getStats: () => unknown;
  getRegisteredCardIds: () => string[];
  isCardRegistered: (id: string) => boolean;
}

// ==================== Error Types ====================

export interface CardError extends Error {
  cardId?: string;
  operation?: string;
  timestamp: number;
}

// ==================== Component Base Classes ====================

export interface WithCardControllerProps {
  cardController: CardController;
}

// ==================== Constants ====================

export const CARD_CONSTANTS = {
  DEFAULT_ANIMATION_DURATION: 350,
  DEFAULT_HIGHLIGHT_DURATION: 600,
  DEFAULT_DEBOUNCE_DELAY: 200,
  STORAGE_VERSION: '1.0.0',
  MAX_STORAGE_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  Z_INDEX: {
    MAXIMIZED: 1000,
    BACKDROP: 999,
  },
} as const;
