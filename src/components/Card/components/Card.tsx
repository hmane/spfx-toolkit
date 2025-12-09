import * as React from 'react';
import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  CardAction,
  CardContextType,
  CardEventData,
  CardProps,
  CardRegistration,
} from '../Card.types';
import { useMaximize } from '../hooks/useMaximize';
import { usePersistence } from '../hooks/usePersistence';
import { cardController } from '../services/CardController';
import { initializeCardAnimations } from '../utils/animations';
import { DEFAULT_ICONS, SIZE_CONFIG } from '../utils/constants';
import { MaximizedView } from './MaximizedView';

// Create Card Context
export const CardContext = React.createContext<CardContextType | undefined>(undefined);

// Custom hook to use Card context
export const useCardContext = (): CardContextType => {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('Card components must be used within a Card component');
  }
  return context;
};

export const Card: React.FC<CardProps> = memo(
  ({
    id,
    size = 'regular',
    defaultExpanded = false,
    allowExpand = true,
    allowMaximize = false,
    maximizeIcon = DEFAULT_ICONS.MAXIMIZE,
    restoreIcon = DEFAULT_ICONS.RESTORE,
    headerSize = 'regular',
    customHeaderColor,
    loading = false,
    loadingType = 'none',
    loadingMessage = 'Loading...',
    lazyLoad = false,
    persist = false,
    persistKey,
    highlightOnProgrammaticChange = true,
    highlightDuration = 600,
    highlightColor,
    animation = {},
    onExpand,
    onCollapse,
    onMaximize,
    onRestore,
    onDataLoaded,
    onContentLoad,
    onCardEvent,
    className = '',
    style,
    elevation = 2,
    disabled = false,
    theme,
    accessibility = {},
    children,
  }) => {
    // State management
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [hasContentLoaded, setHasContentLoaded] = useState(!lazyLoad || defaultExpanded);
    const [hasDataLoaded, setHasDataLoaded] = useState(false);
    const [isHighlighted, setIsHighlighted] = useState(false);

    // Refs
    const cardRef = useRef<HTMLDivElement>(null);
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const previousLoadingRef = useRef(loading);

    const {
      isMaximized,
      isAnimating: isMaximizeAnimating,
      maximize,
      restore,
    } = useMaximize(
      id,
      allowMaximize,
      { ...animation, disabled: false },
      () => {
        const eventData: CardEventData = {
          cardId: id,
          isExpanded: true,
          isMaximized: true,
          timestamp: Date.now(),
          source: 'user',
        };
        onMaximize?.(eventData);
        onCardEvent?.('maximize', eventData);
      },
      () => {
        const eventData: CardEventData = {
          cardId: id,
          isExpanded,
          isMaximized: false,
          timestamp: Date.now(),
          source: 'user',
        };
        onRestore?.(eventData);
        onCardEvent?.('restore', eventData);
      }
    );

    // Persistence hook
    const { saveCardState, loadCardState } = usePersistence(id, persist, persistKey);

    // Initialize animations on mount
    useEffect(() => {
      initializeCardAnimations();
    }, []);

    // Highlight function
    const highlightCard = useCallback(() => {
      if (!highlightOnProgrammaticChange) return;

      setIsHighlighted(true);

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      highlightTimeoutRef.current = setTimeout(() => {
        setIsHighlighted(false);
      }, highlightDuration);
    }, [highlightOnProgrammaticChange, highlightDuration]);

    // Expand/Collapse functions
    const expandFn = useCallback(
      (source: 'user' | 'programmatic' = 'programmatic') => {
        if (!isExpanded && allowExpand && !disabled) {
          setIsExpanded(true);
          if (lazyLoad && !hasContentLoaded) {
            setHasContentLoaded(true);
          }

          const eventData: CardEventData = {
            cardId: id,
            isExpanded: true,
            isMaximized,
            timestamp: Date.now(),
            source,
          };

          if (persist) {
            saveCardState({
              id,
              isExpanded: true,
              isMaximized,
              hasContentLoaded: hasContentLoaded || lazyLoad,
              lastUpdated: Date.now(),
            });
          }

          onExpand?.(eventData);
          onCardEvent?.('expand', eventData);
        }
      },
      [
        isExpanded,
        allowExpand,
        disabled,
        lazyLoad,
        hasContentLoaded,
        id,
        isMaximized,
        persist,
        saveCardState,
        onExpand,
        onCardEvent,
      ]
    );

    const collapseFn = useCallback(
      (source: 'user' | 'programmatic' = 'programmatic') => {
        if (isExpanded && allowExpand && !disabled && !isMaximized) {
          setIsExpanded(false);

          const eventData: CardEventData = {
            cardId: id,
            isExpanded: false,
            isMaximized,
            timestamp: Date.now(),
            source,
          };

          if (persist) {
            saveCardState({
              id,
              isExpanded: false,
              isMaximized,
              hasContentLoaded,
              lastUpdated: Date.now(),
            });
          }

          onCollapse?.(eventData);
          onCardEvent?.('collapse', eventData);
        }
      },
      [
        isExpanded,
        allowExpand,
        disabled,
        isMaximized,
        id,
        hasContentLoaded,
        persist,
        saveCardState,
        onCollapse,
        onCardEvent,
      ]
    );

    const toggleFn = useCallback(
      (source: 'user' | 'programmatic' = 'programmatic') => {
        if (isMaximized) return;

        if (isExpanded) {
          collapseFn(source);
        } else {
          expandFn(source);
        }
      },
      [isExpanded, isMaximized, expandFn, collapseFn]
    );

    const handleToggleExpand = useCallback(
      (source: 'user' | 'programmatic' = 'user') => {
        if (!allowExpand || disabled || isMaximized) return;
        toggleFn(source);
      },
      [allowExpand, disabled, isMaximized, toggleFn]
    );

    const maximizeFn = useCallback(
      (source: 'user' | 'programmatic' = 'programmatic') => {
        if (allowMaximize && !isMaximized && !isMaximizeAnimating) {
          if (!isExpanded) {
            setIsExpanded(true);
            if (lazyLoad && !hasContentLoaded) {
              setHasContentLoaded(true);
            }
          }

          setTimeout(() => {
            void maximize();
          }, 50);
        }
      },
      [
        allowMaximize,
        isMaximized,
        isMaximizeAnimating,
        maximize,
        isExpanded,
        lazyLoad,
        hasContentLoaded,
      ]
    );

    const restoreFn = useCallback(
      (source: 'user' | 'programmatic' = 'programmatic') => {
        if (allowMaximize && isMaximized && !isMaximizeAnimating) {
          void restore();
        }
      },
      [allowMaximize, isMaximized, isMaximizeAnimating, restore]
    );

    // Handle maximize/restore
    const handleToggleMaximize = useCallback(
      (source: 'user' | 'programmatic' = 'user') => {
        if (!allowMaximize || disabled) return;

        if (isMaximized) {
          restoreFn(source);
        } else {
          maximizeFn(source);
        }
      },
      [allowMaximize, disabled, isMaximized, maximizeFn, restoreFn]
    );

    // Handle action click
    const handleActionClick = useCallback(
      (action: CardAction, event: React.MouseEvent) => {
        event.stopPropagation();
        if (!action.disabled && !disabled) {
          action.onClick(id);
        }
      },
      [disabled, id]
    );

    // Handle content load callback
    const handleContentLoad = useCallback(() => {
      if (!hasContentLoaded) {
        setHasContentLoaded(true);
      }
      const eventData: CardEventData = {
        cardId: id,
        isExpanded,
        isMaximized,
        timestamp: Date.now(),
        source: 'user',
      };
      onContentLoad?.(eventData);
      onCardEvent?.('contentLoad', eventData);
    }, [id, isExpanded, isMaximized, hasContentLoaded, onContentLoad, onCardEvent]);


    // Register card with controller
    useEffect(() => {
      const registration: CardRegistration = {
        id,
        isExpanded,
        isMaximized,
        hasContentLoaded,
        toggleFn: (source = 'programmatic') => {
          console.log(`[Card] ${id}: toggleFn called with source: ${source}`);
          toggleFn(source);
        },
        expandFn: (source = 'programmatic') => {
          console.log(`[Card] ${id}: expandFn called with source: ${source}`);
          expandFn(source);
        },
        collapseFn: (source = 'programmatic') => {
          console.log(`[Card] ${id}: collapseFn called with source: ${source}`);
          collapseFn(source);
        },
        maximizeFn: allowMaximize ? maximizeFn : undefined,
        restoreFn: allowMaximize ? restoreFn : undefined,
        highlightFn: highlightCard,
      };

      cardController.registerCard(registration);

      return () => {
        cardController.unregisterCard(id);
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
      };
    }, [
      id,
      isExpanded,
      isMaximized,
      hasContentLoaded,
      toggleFn,
      expandFn,
      collapseFn,
      maximizeFn,
      restoreFn,
      highlightCard,
      allowMaximize,
    ]);

    // Load persisted state on mount
    useEffect(() => {
      if (persist) {
        const savedState = loadCardState();
        if (savedState) {
          setIsExpanded(savedState.isExpanded);
          setHasContentLoaded(savedState.hasContentLoaded);
        }
      }
    }, [persist, loadCardState]);

    // Handle loading state changes
    useEffect(() => {
      if (previousLoadingRef.current && !loading && !hasDataLoaded) {
        setHasDataLoaded(true);
        const eventData: CardEventData = {
          cardId: id,
          isExpanded,
          isMaximized,
          timestamp: Date.now(),
          source: 'user',
        };
        onDataLoaded?.(eventData);
        onCardEvent?.('contentLoad', eventData);
      }
      previousLoadingRef.current = loading;
    }, [loading, hasDataLoaded, onDataLoaded, onCardEvent, id, isExpanded, isMaximized]);

    // Handle content loading for lazy loading
    useEffect(() => {
      if (lazyLoad && isExpanded && !hasContentLoaded) {
        setHasContentLoaded(true);
        const eventData: CardEventData = {
          cardId: id,
          isExpanded,
          isMaximized,
          timestamp: Date.now(),
          source: 'user',
        };
        onContentLoad?.(eventData);
        onCardEvent?.('contentLoad', eventData);
      }
    }, [lazyLoad, isExpanded, hasContentLoaded, onContentLoad, onCardEvent, id, isMaximized]);

    // Determine effective expanded state (always expanded when maximized)
    const effectiveIsExpanded = isMaximized || isExpanded;

    // Memoized styles and classes
    const cardStyle = useMemo(() => {
      const sizeConfig = SIZE_CONFIG[size];

      return {
        ...sizeConfig,
        ...(theme?.backgroundColor && { backgroundColor: theme.backgroundColor }),
        ...(theme?.borderColor && { borderColor: theme.borderColor }),
        ...(theme?.textColor && { color: theme.textColor }),
        ...(highlightColor &&
          isHighlighted && {
            borderColor: highlightColor,
            boxShadow: `0 0 0 2px ${highlightColor}33`,
          }),
        ...style,
      };
    }, [size, theme, highlightColor, isHighlighted, style]);

    // FIXED: Removed redundant card variant from classes
    const cardClasses = useMemo(
      () =>
        [
          'spfx-card',
          `spfx-card-${size}`,
          `elevation-${elevation}`,
          disabled ? 'disabled' : '',
          isHighlighted ? 'highlight' : '',
          isMaximized ? 'maximized' : '',
          loading ? 'loading' : '',
          className,
        ]
          .filter(Boolean)
          .join(' '),
      [size, elevation, disabled, isHighlighted, isMaximized, loading, className]
    );

    // Memoized context value - FIXED: Remove variant prop
    const contextValue = useMemo(
      (): CardContextType => ({
        id,
        isExpanded: effectiveIsExpanded,
        isMaximized,
        allowExpand,
        allowMaximize,
        disabled,
        loading,
        loadingType,
        loadingMessage,
        variant: 'default', // FIXED: Always default since card variant is removed
        size,
        customHeaderColor,
        lazyLoad,
        hasContentLoaded,
        headerSize,
        maximizeIcon,
        restoreIcon,
        accessibility,
        onToggleExpand: () => handleToggleExpand('user'),
        onToggleMaximize: () => handleToggleMaximize('user'),
        onActionClick: handleActionClick,
        onContentLoad: handleContentLoad,
      }),
      [
        id,
        effectiveIsExpanded,
        isMaximized,
        allowExpand,
        allowMaximize,
        disabled,
        loading,
        loadingType,
        loadingMessage,
        size,
        customHeaderColor,
        lazyLoad,
        hasContentLoaded,
        headerSize,
        maximizeIcon,
        restoreIcon,
        accessibility,
        handleToggleExpand,
        handleToggleMaximize,
        handleActionClick,
        handleContentLoad,
      ]
    );

    // Card props with data attributes
    const cardProps = useMemo(
      () => ({
        className: cardClasses,
        style: cardStyle,
        ref: cardRef,
        'data-card-id': id,
        'data-card-expanded': effectiveIsExpanded,
        'data-card-maximized': isMaximized,
        ...(accessibility.region && {
          role: 'region',
          'aria-labelledby': accessibility.labelledBy || `card-header-${id}`,
          'aria-describedby': accessibility.describedBy,
        }),
      }),
      [cardClasses, cardStyle, id, effectiveIsExpanded, isMaximized, accessibility]
    );

    const cardContent = (
      <CardContext.Provider value={contextValue}>
        <div {...cardProps}>{children}</div>
      </CardContext.Provider>
    );

    // If maximized, render in maximized view - FIXED: Remove duplicate restore button
    if (isMaximized) {
      return (
        <MaximizedView
          cardId={id}
          onRestore={() => handleToggleMaximize('user')}
          closeOnEscape={true}
          closeOnBackdropClick={true}
        >
          {cardContent}
        </MaximizedView>
      );
    }

    return cardContent;
  }
);

Card.displayName = 'SpfxCard';

/**
 * Error boundary specifically for cards
 */
class CardErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[SpfxCard] Card Error Boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='spfx-card spfx-card-error'>
          <div className='spfx-card-header error'>
            <div className='spfx-card-header-content'>
              <i className='ms-Icon ms-Icon--ErrorBadge' style={{ marginRight: '8px' }} />
              Card Error
            </div>
          </div>
          <div className='spfx-card-content expanded'>
            <div className='spfx-card-body'>
              <p>Something went wrong while loading this card.</p>
              {this.state.error && (
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--neutralSecondary, #605e5c)',
                    marginBottom: '16px',
                  }}
                >
                  {this.state.error.message}
                </p>
              )}
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--themePrimary, #0078d4)',
                  backgroundColor: 'var(--themePrimary, #0078d4)',
                  color: 'var(--white, #ffffff)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Card with built-in error boundary
 */
export const SafeCard: React.FC<
  CardProps & {
    errorFallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }
> = ({ errorFallback, onError, ...cardProps }) => {
  return (
    <CardErrorBoundary fallback={errorFallback} onError={onError}>
      <Card {...cardProps} />
    </CardErrorBoundary>
  );
};

/**
 * HOC for class components to access card controller
 */
export interface WithCardControllerProps {
  cardController: typeof cardController;
}

export function withCardController<P extends WithCardControllerProps>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<Omit<P, keyof WithCardControllerProps>> {
  const ComponentWithCardController = (props: Omit<P, keyof WithCardControllerProps>) => {
    return <WrappedComponent {...(props as P)} cardController={cardController} />;
  };

  ComponentWithCardController.displayName = `withCardController(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return ComponentWithCardController;
}

/**
 * Base class component with card controller access
 */
export abstract class CardControllerComponent extends React.Component {
  protected cardController = cardController;
  private unsubscribers: (() => void)[] = [];

  /**
   * Subscribe to card events
   */
  protected subscribeToCard(
    cardId: string,
    callback: (action: string, data?: unknown) => void
  ): void {
    const unsubscribe = this.cardController.subscribe(cardId, callback);
    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Subscribe to all card events
   */
  protected subscribeToAllCards(
    callback: (action: string, cardId: string, data?: unknown) => void
  ): void {
    const unsubscribe = this.cardController.subscribeGlobal(callback);
    this.unsubscribers.push(unsubscribe);
  }

  componentWillUnmount(): void {
    // Clean up subscriptions
    this.unsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('[SpfxCard] Error during subscription cleanup:', error);
      }
    });
    this.unsubscribers = [];
  }
}

export default Card;
