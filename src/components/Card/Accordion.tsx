import * as React from 'react';
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { AccordionProps } from './Card.types';
import { useCardController } from './hooks/useCardController';
import { useAccordionPersistence } from './hooks/usePersistence';

/**
 * Helper function to get border radius for connected accordion cards
 */
const getBorderRadius = (variant: string, isFirst: boolean, isLast: boolean): string => {
  if (variant !== 'connected') return '8px';

  if (isFirst && isLast) return '8px';
  if (isFirst) return '8px 8px 0 0';
  if (isLast) return '0 0 8px 8px';
  return '0';
};

/**
 * Accordion API interface for external control
 */
export interface AccordionHandle {
  expandCard: (cardId: string) => void;
  collapseCard: (cardId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  getExpandedCards: () => string[];
  isCardExpanded: (cardId: string) => boolean;
}

export const Accordion = React.forwardRef<AccordionHandle, AccordionProps>(
  (
    {
      id,
      allowMultiple = false,
      defaultExpanded = [],
      spacing = 'none',
      variant = 'connected',
      persist = false,
      persistKey,
      onCardChange,
      className = '',
      style,
      children,
    },
    ref
  ) => {
    const [expandedCards, setExpandedCards] = useState<string[]>(defaultExpanded);
    const accordionRef = useRef<HTMLDivElement>(null);
    const cardController = useCardController();
    const isInitializedRef = useRef(false);
    const preventRecursionRef = useRef(false); // COMPLETE FIX: Prevent infinite loops

    // Persistence hook
    const { saveAccordionState, loadAccordionState } = useAccordionPersistence(
      id,
      persist,
      persistKey
    );

    // Load persisted state on mount
    useEffect(() => {
      if (persist) {
        const savedState = loadAccordionState();
        if (savedState.length > 0) {
          setExpandedCards(savedState);
        }
      }
      isInitializedRef.current = true;
    }, [persist, loadAccordionState]);

    // Extract card IDs from children
    const cardIds = useMemo(() => {
      const ids: string[] = [];
      Children.forEach(children, child => {
        if (isValidElement(child) && child.props.id) {
          ids.push(child.props.id);
        }
      });
      return ids;
    }, [children]);

    // COMPLETE FIX: Handle card expansion/collapse with proper single-expand logic
    const handleCardToggle = useCallback(
      (cardId: string, isExpanded: boolean) => {
        if (preventRecursionRef.current) return;

        console.log(
          `[Accordion] ${id}: Card ${cardId} toggle - isExpanded: ${isExpanded}, allowMultiple: ${allowMultiple}`
        );

        setExpandedCards(prev => {
          let newExpanded: string[];

          if (isExpanded) {
            // Card is being expanded
            if (allowMultiple) {
              // Allow multiple expanded cards
              newExpanded = prev.includes(cardId) ? prev : [...prev, cardId];
              console.log(`[Accordion] ${id}: Multi-mode - adding ${cardId}`);
            } else {
              // COMPLETE FIX: Single expand mode - close all others IMMEDIATELY
              newExpanded = [cardId];
              console.log(`[Accordion] ${id}: Single-mode - only ${cardId} should be open`);

              // COMPLETE FIX: Immediately close other cards via controller
              preventRecursionRef.current = true;

              prev.forEach(prevCardId => {
                if (prevCardId !== cardId) {
                  console.log(`[Accordion] ${id}: Closing ${prevCardId} to allow ${cardId}`);

                  // Force close the other card immediately
                  setTimeout(() => {
                    const cardState = cardController.getCardState(prevCardId);
                    if (cardState?.isExpanded) {
                      cardController.collapseCard(prevCardId, false);
                    }
                  }, 0);
                }
              });

              // Reset recursion prevention after a short delay
              setTimeout(() => {
                preventRecursionRef.current = false;
              }, 100);
            }
          } else {
            // Card is being collapsed
            newExpanded = prev.filter(cardIdToFilter => cardIdToFilter !== cardId);
            console.log(`[Accordion] ${id}: Collapsing ${cardId}`);
          }

          console.log(`[Accordion] ${id}: New expanded cards:`, newExpanded);

          // Save state if persistence is enabled
          if (persist) {
            saveAccordionState(newExpanded);
          }

          // Notify parent component
          onCardChange?.(newExpanded);

          return newExpanded;
        });
      },
      [allowMultiple, cardController, persist, saveAccordionState, onCardChange, id]
    );

    // COMPLETE FIX: Subscribe to card controller events with proper cleanup
    useEffect(() => {
      if (!isInitializedRef.current) return;

      const unsubscribeCallbacks: (() => void)[] = [];

      cardIds.forEach(cardId => {
        const unsubscribe = cardController.subscribe(cardId, action => {
          if (preventRecursionRef.current) return;

          console.log(`[Accordion] ${id}: Received ${action} for ${cardId}`);

          if (action === 'expand') {
            handleCardToggle(cardId, true);
          } else if (action === 'collapse') {
            handleCardToggle(cardId, false);
          }
        });
        unsubscribeCallbacks.push(unsubscribe);
      });

      return () => {
        unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
      };
    }, [cardIds, cardController, handleCardToggle, id]);

    // COMPLETE FIX: Ensure card states match accordion state
    useEffect(() => {
      if (!isInitializedRef.current || preventRecursionRef.current) return;

      console.log(`[Accordion] ${id}: Syncing card states. Expanded:`, expandedCards);

      cardIds.forEach(cardId => {
        const shouldBeExpanded = expandedCards.includes(cardId);
        const currentState = cardController.getCardState(cardId);

        if (currentState && currentState.isExpanded !== shouldBeExpanded) {
          console.log(
            `[Accordion] ${id}: Syncing ${cardId} to ${shouldBeExpanded ? 'expanded' : 'collapsed'}`
          );

          // Prevent recursion during sync
          preventRecursionRef.current = true;

          setTimeout(() => {
            if (shouldBeExpanded) {
              cardController.expandCard(cardId, false);
            } else {
              cardController.collapseCard(cardId, false);
            }

            // Reset recursion prevention
            setTimeout(() => {
              preventRecursionRef.current = false;
            }, 50);
          }, 10);
        }
      });
    }, [expandedCards, cardIds, cardController, id]);

    // ... (keep existing memoized styles and processing logic)

    // Memoized accordion classes
    const accordionClasses = useMemo(
      () =>
        [
          'spfx-accordion',
          `spfx-accordion-${variant}`,
          `spfx-accordion-spacing-${spacing}`,
          allowMultiple ? 'allow-multiple' : 'single-expand',
          className,
        ]
          .filter(Boolean)
          .join(' '),
      [variant, spacing, allowMultiple, className]
    );

    // Process children to add accordion-specific props
    const processedChildren = useMemo(() => {
      if (!children) return null;

      return Children.map(children, (child, index) => {
        if (!isValidElement(child) || !child.props.id) {
          return child;
        }

        const cardId = child.props.id;
        const isExpanded = expandedCards.includes(cardId);
        const isFirst = index === 0;
        const isLast = index === Children.count(children) - 1;

        // COMPLETE FIX: Enhanced accordion props with proper event handling
        const accordionProps = {
          defaultExpanded: isExpanded,
          className: `${child.props.className || ''} spfx-accordion-card ${
            isFirst ? 'first' : ''
          } ${isLast ? 'last' : ''}`.trim(),
          style: {
            ...child.props.style,
            ...(spacing === 'none' && {
              marginBottom: isLast ? 0 : -1,
              borderRadius: getBorderRadius(variant, isFirst, isLast),
            }),
          },
          'data-accordion-id': id,
          'data-accordion-position': index,
          'data-accordion-expanded': isExpanded,
          'data-allow-multiple': allowMultiple,
          // COMPLETE FIX: Override card's expand/collapse handlers
          onExpand: (data: any) => {
            console.log(`[Accordion] ${id}: Card ${cardId} onExpand triggered`);
            handleCardToggle(cardId, true);
            child.props.onExpand?.(data);
          },
          onCollapse: (data: any) => {
            console.log(`[Accordion] ${id}: Card ${cardId} onCollapse triggered`);
            handleCardToggle(cardId, false);
            child.props.onCollapse?.(data);
          },
        };

        return cloneElement(child, accordionProps);
      });
    }, [children, expandedCards, spacing, variant, id, allowMultiple, handleCardToggle]);

    // ... (keep existing API and return logic)

    return (
      <div
        ref={accordionRef}
        className={accordionClasses}
        style={style}
        data-accordion-id={id}
        data-allow-multiple={allowMultiple}
        data-expanded-count={expandedCards.length}
        data-total-count={cardIds.length}
        role='tablist'
        aria-orientation='vertical'
      >
        {processedChildren}
      </div>
    );
  }
);

Accordion.displayName = 'FixedAccordion';

/**
 * Hook for controlling accordion externally
 */
export const useAccordion = (accordionId: string) => {
  const accordionRef = useRef<AccordionHandle>();

  useEffect(() => {
    const accordionElement = document.querySelector(
      `[data-accordion-id="${accordionId}"]`
    ) as HTMLDivElement & { accordionApi?: AccordionHandle };

    if (accordionElement && accordionElement.accordionApi) {
      accordionRef.current = accordionElement.accordionApi;
    }
  }, [accordionId]);

  return useMemo(
    () => ({
      expandCard: (cardId: string) => {
        accordionRef.current?.expandCard(cardId);
      },
      collapseCard: (cardId: string) => {
        accordionRef.current?.collapseCard(cardId);
      },
      expandAll: () => {
        accordionRef.current?.expandAll();
      },
      collapseAll: () => {
        accordionRef.current?.collapseAll();
      },
    }),
    []
  );
};

/**
 * Controlled Accordion component for external state management
 */
export const ControlledAccordion: React.FC<
  AccordionProps & {
    expandedCards: string[];
    onExpandedCardsChange: (expandedCards: string[]) => void;
  }
> = ({
  id,
  allowMultiple = false,
  expandedCards,
  onExpandedCardsChange,
  spacing = 'none',
  variant = 'connected',
  persist = false,
  persistKey,
  onCardChange,
  className = '',
  style,
  children,
}) => {
  const cardController = useCardController();

  // Persistence hook
  const { saveAccordionState } = useAccordionPersistence(id, persist, persistKey);

  // Extract card IDs from children
  const cardIds = useMemo(() => {
    const ids: string[] = [];
    if (children) {
      Children.forEach(children, child => {
        if (isValidElement(child) && child.props.id) {
          ids.push(child.props.id);
        }
      });
    }
    return ids;
  }, [children]);

  // Handle card expansion/collapse
  const handleCardToggle = useCallback(
    (cardId: string, isExpanded: boolean) => {
      let newExpanded: string[];

      if (isExpanded) {
        // Card is being expanded
        if (allowMultiple) {
          // Allow multiple expanded cards
          newExpanded = expandedCards.includes(cardId) ? expandedCards : [...expandedCards, cardId];
        } else {
          // Only allow one expanded card
          newExpanded = [cardId];

          // Collapse other cards
          expandedCards.forEach(prevCardId => {
            if (prevCardId !== cardId) {
              cardController.collapseCard(prevCardId, false);
            }
          });
        }
      } else {
        // Card is being collapsed
        newExpanded = expandedCards.filter(id => id !== cardId);
      }

      // Update external state
      onExpandedCardsChange(newExpanded);

      // Save state if persistence is enabled
      if (persist) {
        saveAccordionState(newExpanded);
      }

      // Notify parent component
      onCardChange?.(newExpanded);
    },
    [
      allowMultiple,
      expandedCards,
      onExpandedCardsChange,
      cardController,
      persist,
      saveAccordionState,
      onCardChange,
    ]
  );

  // Subscribe to card controller events
  useEffect(() => {
    const unsubscribeCallbacks: (() => void)[] = [];

    cardIds.forEach(cardId => {
      const unsubscribe = cardController.subscribe(cardId, action => {
        if (action === 'expand') {
          handleCardToggle(cardId, true);
        } else if (action === 'collapse') {
          handleCardToggle(cardId, false);
        }
      });
      unsubscribeCallbacks.push(unsubscribe);
    });

    return () => {
      unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    };
  }, [cardIds, cardController, handleCardToggle]);

  // Process children similar to regular accordion
  const processedChildren = useMemo(() => {
    if (!children) return null;

    return Children.map(children, (child, index) => {
      if (!isValidElement(child) || !child.props.id) {
        return child;
      }

      const cardId = child.props.id;
      const isExpanded = expandedCards.includes(cardId);
      const isFirst = index === 0;
      const isLast = index === Children.count(children) - 1;

      const accordionProps = {
        defaultExpanded: isExpanded,
        className: `${child.props.className || ''} spfx-accordion-card ${isFirst ? 'first' : ''} ${
          isLast ? 'last' : ''
        }`.trim(),
        style: {
          ...child.props.style,
          ...(spacing === 'none' && {
            marginBottom: isLast ? 0 : -1,
            borderRadius: getBorderRadius(variant, isFirst, isLast),
          }),
        },
        'data-accordion-id': id,
        'data-accordion-position': index,
        'data-accordion-expanded': isExpanded,
      };

      return cloneElement(child, accordionProps);
    });
  }, [children, expandedCards, spacing, variant, id]);

  const accordionClasses = useMemo(
    () =>
      [
        'spfx-accordion',
        `spfx-accordion-${variant}`,
        `spfx-accordion-spacing-${spacing}`,
        allowMultiple ? 'allow-multiple' : 'single-expand',
        'controlled',
        className,
      ]
        .filter(Boolean)
        .join(' '),
    [variant, spacing, allowMultiple, className]
  );

  return (
    <div
      className={accordionClasses}
      style={style}
      data-accordion-id={id}
      data-allow-multiple={allowMultiple}
      role='tablist'
      aria-orientation='vertical'
    >
      {processedChildren}
    </div>
  );
};

/**
 * Accordion with built-in search/filter functionality
 */
export const SearchableAccordion: React.FC<
  AccordionProps & {
    searchable?: boolean;
    searchPlaceholder?: string;
    filterFunction?: (child: React.ReactElement, searchTerm: string) => boolean;
    noResultsMessage?: string;
  }
> = ({
  id,
  allowMultiple = false,
  defaultExpanded = [],
  spacing = 'none',
  variant = 'connected',
  persist = false,
  persistKey,
  onCardChange,
  className = '',
  style,
  children,
  searchable = true,
  searchPlaceholder = 'Search cards...',
  filterFunction,
  noResultsMessage = 'No cards match your search.',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Default filter function
  const defaultFilterFunction = useCallback((child: React.ReactElement, term: string): boolean => {
    if (!term) return true;

    const searchContent = [
      child.props.children, // Look in children
      child.props.title, // Look in title prop
      child.props['data-search-terms'], // Custom search terms
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchContent.includes(term.toLowerCase());
  }, []);

  const effectiveFilterFunction = filterFunction || defaultFilterFunction;

  // Filter children based on search term
  const filteredChildren = useMemo(() => {
    if (!searchTerm || !children) return children;

    const filtered = Children.toArray(children).filter(child => {
      if (isValidElement(child)) {
        return effectiveFilterFunction(child, searchTerm);
      }
      return false;
    });

    return filtered.length > 0 ? filtered : null;
  }, [children, searchTerm, effectiveFilterFunction]);

  const hasFilteredResults = useMemo(() => {
    return filteredChildren && Children.count(filteredChildren) > 0;
  }, [filteredChildren]);

  const searchInput = searchable && (
    <div className='spfx-accordion-search' style={{ marginBottom: '16px' }}>
      <div style={{ position: 'relative' }}>
        <i
          className='ms-Icon ms-Icon--Search'
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--neutralSecondary, #605e5c)',
            fontSize: '16px',
          }}
        />
        <input
          type='text'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            width: '100%',
            padding: '8px 12px 8px 36px',
            border: '1px solid var(--neutralTertiary, #a19f9d)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--white, #ffffff)',
            boxSizing: 'border-box',
          }}
          aria-label='Search cards'
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '2px',
            }}
            aria-label='Clear search'
          >
            <i className='ms-Icon ms-Icon--Clear' style={{ fontSize: '12px' }} />
          </button>
        )}
      </div>
    </div>
  );

  const noResults = searchTerm && !hasFilteredResults && (
    <div
      className='spfx-accordion-no-results'
      style={{
        padding: '20px',
        textAlign: 'center',
        color: 'var(--neutralSecondary, #605e5c)',
        backgroundColor: 'var(--neutralLighter, #f8f9fa)',
        borderRadius: '8px',
        border: '1px solid var(--neutralLight, #edebe9)',
      }}
    >
      {noResultsMessage}
    </div>
  );

  return (
    <div className={`spfx-searchable-accordion ${className}`} style={style}>
      {searchInput}
      {noResults}
      {hasFilteredResults && (
        <Accordion
          id={id}
          allowMultiple={allowMultiple}
          defaultExpanded={defaultExpanded}
          spacing={spacing}
          variant={variant}
          persist={persist}
          persistKey={persistKey}
          onCardChange={onCardChange}
        >
          {filteredChildren}
        </Accordion>
      )}
    </div>
  );
};

/**
 * Accordion with keyboard navigation enhancements
 */
export const KeyboardAccordion: React.FC<AccordionProps> = props => {
  const accordionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!accordionRef.current?.contains(event.target as Node)) return;

      const cards = accordionRef.current.querySelectorAll('.spfx-accordion-card');
      const currentIndex = Array.from(cards).findIndex(card => card.contains(event.target as Node));

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (currentIndex > 0) {
            (cards[currentIndex - 1].querySelector('[role="button"]') as HTMLElement)?.focus();
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (currentIndex < cards.length - 1) {
            (cards[currentIndex + 1].querySelector('[role="button"]') as HTMLElement)?.focus();
          }
          break;
        case 'Home':
          event.preventDefault();
          (cards[0].querySelector('[role="button"]') as HTMLElement)?.focus();
          break;
        case 'End':
          event.preventDefault();
          (cards[cards.length - 1].querySelector('[role="button"]') as HTMLElement)?.focus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={accordionRef}>
      <Accordion {...props} />
    </div>
  );
};

export default Accordion;
