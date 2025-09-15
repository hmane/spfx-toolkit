import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CardControllerHook, CardState, ScrollOptions } from '../Card.types';
import { cardController } from '../services/CardController';

/**
 * Hook for accessing card controller functionality
 * Provides memoized methods and automatic cleanup
 */
export const useCardController = (): CardControllerHook => {
  const subscriptionsRef = useRef<Array<() => void>>([]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('[SpfxCard] Error during subscription cleanup:', error);
        }
      });
      subscriptionsRef.current = [];
    };
  }, []);

  // Memoized controller methods
  const expandAll = useCallback((highlight?: boolean) => {
    cardController.expandAll(highlight);
  }, []);

  const collapseAll = useCallback((highlight?: boolean) => {
    cardController.collapseAll(highlight);
  }, []);

  const toggleCard = useCallback((id: string, highlight?: boolean): boolean => {
    return cardController.toggleCard(id, highlight);
  }, []);

  const expandCard = useCallback((id: string, highlight?: boolean): boolean => {
    return cardController.expandCard(id, highlight);
  }, []);

  const collapseCard = useCallback((id: string, highlight?: boolean): boolean => {
    return cardController.collapseCard(id, highlight);
  }, []);

  const maximizeCard = useCallback((id: string): boolean => {
    return cardController.maximizeCard(id);
  }, []);

  const restoreCard = useCallback((id: string): boolean => {
    return cardController.restoreCard(id);
  }, []);

  const expandAndScrollTo = useCallback(
    async (id: string, options?: ScrollOptions): Promise<boolean> => {
      return cardController.expandAndScrollTo(id, options);
    },
    []
  );

  const getCardStates = useCallback((): CardState[] => {
    return cardController.getCardStates();
  }, []);

  const getCardState = useCallback((id: string): CardState | null => {
    return cardController.getCardState(id);
  }, []);

  const highlightCard = useCallback((id: string): boolean => {
    return cardController.highlightCard(id);
  }, []);

  const scrollToCard = useCallback(
    async (id: string, options?: ScrollOptions): Promise<boolean> => {
      return cardController.scrollToCard(id, options);
    },
    []
  );

  const toggleMaximize = useCallback((id: string): boolean => {
    return cardController.toggleMaximize(id);
  }, []);

  const isCardMaximized = useCallback((id: string): boolean => {
    return cardController.isCardMaximized(id);
  }, []);

  const batchOperation = useCallback(
    async (
      operations: Array<{
        cardId: string;
        action: 'expand' | 'collapse' | 'toggle' | 'maximize' | 'restore';
      }>,
      highlight?: boolean
    ): Promise<boolean[]> => {
      return cardController.batchOperation(operations, highlight);
    },
    []
  );

  const subscribe = useCallback(
    (cardId: string, callback: (action: string, data?: any) => void): (() => void) => {
      const unsubscribe = cardController.subscribe(cardId, callback);
      subscriptionsRef.current.push(unsubscribe);

      // Return unsubscribe function that also removes from our tracking
      return () => {
        const index = subscriptionsRef.current.indexOf(unsubscribe);
        if (index > -1) {
          subscriptionsRef.current.splice(index, 1);
        }
        unsubscribe();
      };
    },
    []
  );

  const subscribeGlobal = useCallback(
    (callback: (action: string, cardId: string, data?: any) => void): (() => void) => {
      const unsubscribe = cardController.subscribeGlobal(callback);
      subscriptionsRef.current.push(unsubscribe);

      // Return unsubscribe function that also removes from our tracking
      return () => {
        const index = subscriptionsRef.current.indexOf(unsubscribe);
        if (index > -1) {
          subscriptionsRef.current.splice(index, 1);
        }
        unsubscribe();
      };
    },
    []
  );

  const persistStates = useCallback(() => {
    cardController.persistStates();
  }, []);

  const restoreStates = useCallback(() => {
    cardController.restoreStates();
  }, []);

  const clearStoredStates = useCallback(() => {
    cardController.clearStoredStates();
  }, []);

  const getStats = useCallback(() => {
    return cardController.getStats();
  }, []);

  const getRegisteredCardIds = useCallback((): string[] => {
    return cardController.getRegisteredCardIds();
  }, []);

  const isCardRegistered = useCallback((id: string): boolean => {
    return cardController.isCardRegistered(id);
  }, []);

  // Return memoized hook object
  return useMemo(
    (): CardControllerHook => ({
      controller: cardController,
      expandAll,
      collapseAll,
      toggleCard,
      expandCard,
      collapseCard,
      maximizeCard,
      restoreCard,
      expandAndScrollTo,
      getCardStates,
      getCardState,
      highlightCard,
      scrollToCard,
      toggleMaximize,
      isCardMaximized,
      batchOperation,
      subscribe,
      subscribeGlobal,
      persistStates,
      restoreStates,
      clearStoredStates,
      getStats,
      getRegisteredCardIds,
      isCardRegistered,
    }),
    [
      expandAll,
      collapseAll,
      toggleCard,
      expandCard,
      collapseCard,
      maximizeCard,
      restoreCard,
      expandAndScrollTo,
      getCardStates,
      getCardState,
      highlightCard,
      scrollToCard,
      toggleMaximize,
      isCardMaximized,
      batchOperation,
      subscribe,
      subscribeGlobal,
      persistStates,
      restoreStates,
      clearStoredStates,
      getStats,
      getRegisteredCardIds,
      isCardRegistered,
    ]
  );
};

/**
 * Additional utility hooks
 */

/**
 * Hook for subscribing to specific card events
 */
export const useCardSubscription = (
  cardId: string,
  callback: (action: string, data?: any) => void
): void => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribe = cardController.subscribe(cardId, (action, data) => {
      callbackRef.current(action, data);
    });

    return unsubscribe;
  }, [cardId]);
};

/**
 * Hook for subscribing to global card events
 */
export const useGlobalCardSubscription = (
  callback: (action: string, cardId: string, data?: any) => void
): void => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribe = cardController.subscribeGlobal((action, cardId, data) => {
      callbackRef.current(action, cardId, data);
    });

    return unsubscribe;
  }, []);
};

/**
 * Hook for tracking card state
 */
export const useCardState = (cardId: string): CardState | null => {
  const [state, setState] = React.useState<CardState | null>(() =>
    cardController.getCardState(cardId)
  );

  useEffect(() => {
    // Initial state
    setState(cardController.getCardState(cardId));

    // Subscribe to changes
    const unsubscribe = cardController.subscribe(cardId, () => {
      setState(cardController.getCardState(cardId));
    });

    return unsubscribe;
  }, [cardId]);

  return state;
};

/**
 * Hook for tracking all card states
 */
export const useAllCardStates = (): CardState[] => {
  const [states, setStates] = React.useState<CardState[]>(() => cardController.getCardStates());

  useEffect(() => {
    // Initial states
    setStates(cardController.getCardStates());

    // Subscribe to global changes
    const unsubscribe = cardController.subscribeGlobal(() => {
      setStates(cardController.getCardStates());
    });

    return unsubscribe;
  }, []);

  return states;
};

/**
 * Hook for controller statistics
 */
export const useCardControllerStats = () => {
  const [stats, setStats] = React.useState(() => cardController.getStats());

  useEffect(() => {
    const updateStats = () => setStats(cardController.getStats());

    // Update stats on any card event
    const unsubscribe = cardController.subscribeGlobal(updateStats);

    // Also update periodically
    const interval = setInterval(updateStats, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return stats;
};
