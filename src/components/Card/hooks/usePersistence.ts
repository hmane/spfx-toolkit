import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { CardState } from '../Card.types';
import { StorageService } from '../services/StorageService';
import { SPContext } from '../../../utilities/context';
/**
 * Hook for managing card persistence
 * Handles automatic saving and restoring of card states
 */
export const usePersistence = (cardId: string, enabled: boolean = false, persistKey?: string) => {
  const storageService = StorageService.getInstance();
  const enabledRef = useRef(enabled);
  const cardIdRef = useRef(cardId);
  const persistKeyRef = useRef(persistKey);

  // Update refs when props change
  useEffect(() => {
    enabledRef.current = enabled;
    cardIdRef.current = cardId;
    persistKeyRef.current = persistKey;
  }, [enabled, cardId, persistKey]);

  // Save card state
  const saveCardState = useCallback(
    (state: CardState) => {
      if (!enabledRef.current) return false;

      try {
        const key = persistKeyRef.current || 'default';
        const existingStates =
          storageService.loadData<Record<string, CardState>>(`card-states-${key}`, {}) || {};

        existingStates[cardIdRef.current] = {
          ...state,
          lastUpdated: Date.now(),
        };

        return storageService.saveData(`card-states-${key}`, existingStates);
      } catch (error) {
        SPContext.logger.error('SpfxCard: Failed to save card state', error, { cardId: cardIdRef.current });
        return false;
      }
    },
    [storageService]
  );

  // Load card state
  const loadCardState = useCallback((): CardState | null => {
    if (!enabledRef.current) return null;

    try {
      const key = persistKeyRef.current || 'default';
      const existingStates =
        storageService.loadData<Record<string, CardState>>(`card-states-${key}`, {}) || {};

      return existingStates[cardIdRef.current] || null;
    } catch (error) {
      SPContext.logger.error('SpfxCard: Failed to load card state', error, { cardId: cardIdRef.current });
      return null;
    }
  }, [storageService]);

  // Clear card state
  const clearCardState = useCallback(() => {
    if (!enabledRef.current) return false;

    try {
      const key = persistKeyRef.current || 'default';
      const existingStates =
        storageService.loadData<Record<string, CardState>>(`card-states-${key}`, {}) || {};

      delete existingStates[cardIdRef.current];

      return storageService.saveData(`card-states-${key}`, existingStates);
    } catch (error) {
      SPContext.logger.error('SpfxCard: Failed to clear card state', error, { cardId: cardIdRef.current });
      return false;
    }
  }, [storageService]);

  return {
    saveCardState,
    loadCardState,
    clearCardState,
    isEnabled: enabled,
  };
};

/**
 * Hook for managing accordion persistence
 */
export const useAccordionPersistence = (
  accordionId: string,
  enabled: boolean = false,
  persistKey?: string
) => {
  const storageService = StorageService.getInstance();
  const enabledRef = useRef(enabled);
  const accordionIdRef = useRef(accordionId);
  const persistKeyRef = useRef(persistKey);

  // Update refs when props change
  useEffect(() => {
    enabledRef.current = enabled;
    accordionIdRef.current = accordionId;
    persistKeyRef.current = persistKey;
  }, [enabled, accordionId, persistKey]);

  // Save accordion state
  const saveAccordionState = useCallback(
    (expandedCards: string[]) => {
      if (!enabledRef.current) return false;

      try {
        const key = persistKeyRef.current || accordionIdRef.current;
        return storageService.saveAccordionStates(key, expandedCards);
      } catch (error) {
        SPContext.logger.error('SpfxCard: Failed to save accordion state', error, { accordionId: accordionIdRef.current });
        return false;
      }
    },
    [storageService]
  );

  // Load accordion state
  const loadAccordionState = useCallback((): string[] => {
    if (!enabledRef.current) return [];

    try {
      const key = persistKeyRef.current || accordionIdRef.current;
      return storageService.loadAccordionStates(key);
    } catch (error) {
      SPContext.logger.error('SpfxCard: Failed to load accordion state', error, { accordionId: accordionIdRef.current });
      return [];
    }
  }, [storageService]);

  // Clear accordion state
  const clearAccordionState = useCallback(() => {
    if (!enabledRef.current) return false;

    try {
      const key = persistKeyRef.current || accordionIdRef.current;
      return storageService.removeAccordionStates(key);
    } catch (error) {
      SPContext.logger.error('SpfxCard: Failed to clear accordion state', error, { accordionId: accordionIdRef.current });
      return false;
    }
  }, [storageService]);

  return {
    saveAccordionState,
    loadAccordionState,
    clearAccordionState,
    isEnabled: enabled,
  };
};

/**
 * Hook for automatic persistence with debouncing
 */
export const useAutoPersistence = <T>(
  key: string,
  data: T,
  enabled: boolean = false,
  debounceMs: number = 1000
) => {
  const storageService = StorageService.getInstance();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const previousDataRef = useRef<T>();

  useEffect(() => {
    if (!enabled) return;

    // Only save if data has changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return;
    }

    previousDataRef.current = data;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced save
    timeoutRef.current = setTimeout(() => {
      try {
        storageService.saveData(key, data);
      } catch (error) {
        SPContext.logger.error('SpfxCard: Auto-persistence failed', error, { key });
      }
    }, debounceMs);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, data, key, debounceMs, storageService]);

  // Load initial data
  const loadData = useCallback((): T | undefined => {
    if (!enabled) return undefined;

    try {
      return storageService.loadData<T>(key);
    } catch (error) {
      SPContext.logger.error('SpfxCard: Failed to load persisted data', error, { key });
      return undefined;
    }
  }, [enabled, key, storageService]);

  return { loadData };
};

/**
 * Hook for managing storage cleanup
 */
export const useStorageCleanup = (
  intervalMs: number = 60000, // 1 minute
  enabled: boolean = true
) => {
  const storageService = StorageService.getInstance();

  useEffect(() => {
    if (!enabled) return;

    const cleanup = () => {
      try {
        const cleanedCount = storageService.cleanup();
        if (cleanedCount > 0) {
          SPContext.logger.info('SpfxCard: Cleaned up expired storage items', { cleanedCount });
        }
      } catch (error) {
        SPContext.logger.error('SpfxCard: Storage cleanup failed', error);
      }
    };

    // Initial cleanup
    cleanup();

    // Set up interval
    const interval = setInterval(cleanup, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, intervalMs, storageService]);
};

/**
 * Hook for storage statistics and monitoring
 */
export const useStorageStats = (updateIntervalMs: number = 5000) => {
  const [stats, setStats] = React.useState(() => {
    const storageService = StorageService.getInstance();
    return storageService.getStats();
  });

  useEffect(() => {
    const storageService = StorageService.getInstance();

    const updateStats = () => {
      try {
        setStats(storageService.getStats());
      } catch (error) {
        SPContext.logger.error('SpfxCard: Failed to update storage stats', error);
      }
    };

    // Update stats periodically
    const interval = setInterval(updateStats, updateIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [updateIntervalMs]);

  return stats;
};

/**
 * Hook for bulk data operations
 */
export const useBulkPersistence = () => {
  const storageService = StorageService.getInstance();

  const exportAllData = useCallback(() => {
    try {
      return storageService.exportData();
    } catch (error) {
      SPContext.logger.error('SpfxCard: Failed to export data', error);
      return {};
    }
  }, [storageService]);

  const importAllData = useCallback(
    (data: Record<string, any>) => {
      try {
        return storageService.importData(data);
      } catch (error) {
        SPContext.logger.error('SpfxCard: Failed to import data', error);
        return false;
      }
    },
    [storageService]
  );

  const clearAllData = useCallback(() => {
    try {
      return storageService.clearAll();
    } catch (error) {
      SPContext.logger.error('SpfxCard: Failed to clear all data', error);
      return false;
    }
  }, [storageService]);

  return {
    exportAllData,
    importAllData,
    clearAllData,
  };
};

/**
 * Hook for cross-tab synchronization
 */
export const useCrossTabSync = (
  key: string,
  callback: (data: any) => void,
  enabled: boolean = true
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const handleStorageChange = (event: StorageEvent) => {
      // Only handle our storage keys
      if (!event.key?.includes('spfx-cards')) return;

      // Parse the changed data
      try {
        const newValue = event.newValue ? JSON.parse(event.newValue) : null;
        const oldValue = event.oldValue ? JSON.parse(event.oldValue) : null;

        // Call callback with change details
        callbackRef.current({
          key: event.key,
          newValue,
          oldValue,
          url: event.url,
        });
      } catch (error) {
        SPContext.logger.error('SpfxCard: Failed to parse storage change', error, { eventKey: event.key });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [enabled, key]);
};

/**
 * Hook for persistence with validation
 */
export const useValidatedPersistence = <T>(
  key: string,
  validator: (data: unknown) => data is T,
  defaultValue: T,
  enabled: boolean = true
) => {
  const storageService = StorageService.getInstance();

  const saveData = useCallback(
    (data: T) => {
      if (!enabled) return false;

      try {
        if (!validator(data)) {
          SPContext.logger.warn('SpfxCard: Data validation failed, not saving', { key });
          return false;
        }

        return storageService.saveData(key, data);
      } catch (error) {
        SPContext.logger.error('SpfxCard: Failed to save validated data', error, { key });
        return false;
      }
    },
    [enabled, key, validator, storageService]
  );

  const loadData = useCallback((): T => {
    if (!enabled) return defaultValue;

    try {
      const stored = storageService.loadData(key);

      if (stored && validator(stored)) {
        return stored;
      } else {
        SPContext.logger.warn('SpfxCard: Stored data validation failed, using default', { key });
        return defaultValue;
      }
    } catch (error) {
      SPContext.logger.error('SpfxCard: Failed to load validated data', error, { key });
      return defaultValue;
    }
  }, [enabled, key, validator, defaultValue, storageService]);

  const clearData = useCallback(() => {
    if (!enabled) return false;

    try {
      return storageService.removeData(key);
    } catch (error) {
      SPContext.logger.error('SpfxCard: Failed to clear validated data', error, { key });
      return false;
    }
  }, [enabled, key, storageService]);

  return {
    saveData,
    loadData,
    clearData,
  };
};
