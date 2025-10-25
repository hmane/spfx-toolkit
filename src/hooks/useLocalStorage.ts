import * as React from 'react';

export interface UseLocalStorageOptions {
  /**
   * Serialize value before storing (default: JSON.stringify)
   */
  serialize?: (value: any) => string;
  /**
   * Deserialize value when reading (default: JSON.parse)
   */
  deserialize?: (value: string) => any;
  /**
   * Custom error handler for storage operations
   */
  onError?: (error: Error, operation: 'read' | 'write') => void;
  /**
   * Sync with other tabs/windows using storage events
   */
  syncAcrossTabs?: boolean;
}

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  removeValue: () => void;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Enhanced useLocalStorage hook with error handling, cross-tab sync, and customization options
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = {}
): UseLocalStorageReturn<T> {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    onError,
    syncAcrossTabs = false,
  } = options;

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Check if localStorage is available (useful for SPFx scenarios)
  const isStorageAvailable = React.useMemo(() => {
    try {
      if (typeof window === 'undefined') return false;
      const testKey = '__localStorage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }, []);

  const [value, setValue] = React.useState<T>(initialValue);

  // Load initial value after mount to avoid state updates in the initializer
  React.useEffect(() => {
    if (!isStorageAvailable) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    try {
      const stored = window.localStorage.getItem(key);
      const result = stored ? deserialize(stored) : initialValue;
      if (!isCancelled) {
        setValue(result);
        setError(null);
      }
    } catch (err) {
      const storageError = err instanceof Error ? err : new Error('Failed to read from localStorage');
      if (!isCancelled) {
        setError(storageError);
        onError?.(storageError, 'read');
        setValue(initialValue);
      }
    } finally {
      if (!isCancelled) {
        setIsLoading(false);
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [key, deserialize, initialValue, isStorageAvailable, onError]);

  const updateValue = React.useCallback(
    (newValue: React.SetStateAction<T>) => {
      if (!isStorageAvailable) return;

      try {
        let valueToStore = initialValue;
        setValue(prev => {
          valueToStore =
            typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;
          return valueToStore;
        });
        window.localStorage.setItem(key, serialize(valueToStore));
        setError(null);
      } catch (err) {
        const storageError = err instanceof Error ? err : new Error('Failed to write to localStorage');
        setError(storageError);
        onError?.(storageError, 'write');
      }
    },
    [isStorageAvailable, key, serialize, onError, initialValue]
  );

  const removeValue = React.useCallback(() => {
    if (!isStorageAvailable) return;

    try {
      window.localStorage.removeItem(key);
      setValue(initialValue);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove from localStorage');
      setError(error);
      onError?.(error, 'write');
    }
  }, [key, initialValue, onError, isStorageAvailable]);

  // Sync across tabs/windows
  React.useEffect(() => {
    if (!syncAcrossTabs || !isStorageAvailable) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = deserialize(e.newValue);
          setValue(newValue);
          setError(null);
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Failed to sync from storage event');
          setError(error);
          onError?.(error, 'read');
        }
      } else if (e.key === key && e.newValue === null) {
        // Key was removed in another tab
        setValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue, deserialize, onError, syncAcrossTabs, isStorageAvailable]);

  return {
    value,
    setValue: updateValue,
    removeValue,
    isLoading,
    error,
  };
}
