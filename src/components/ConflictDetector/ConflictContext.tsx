import * as React from 'react';
import { createContext, ReactNode, useContext, useEffect, useRef, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { ConflictDetector } from './ConflictDetector';
import {
  ConflictDetectionOptions,
  ConflictDetectionState,
  DEFAULT_CONFLICT_OPTIONS,
  ConflictDetectionError,
} from './types';

interface ConflictContextValue {
  detector: ConflictDetector | undefined;
  checkForConflicts: () => Promise<void>;
  hasChangedSinceLastCheck: () => Promise<boolean>;
  updateSnapshot: () => Promise<void>;
  pausePolling: () => void;
  resumePolling: () => void;
  getState: () => ConflictDetectionState;
  isPollingActive: () => boolean;
}

interface ConflictProviderProps {
  sp: SPFI;
  listId: string;
  itemId: number;
  options?: Partial<ConflictDetectionOptions>;
  children: ReactNode;
  onStateChange?: (state: ConflictDetectionState) => void;
  enabled?: boolean;
}

const ConflictContext = createContext<ConflictContextValue | undefined>(undefined);

export const ConflictDetectionProvider: React.FC<ConflictProviderProps> = ({
  sp,
  listId,
  itemId,
  options = {},
  children,
  onStateChange,
  enabled = true,
}) => {
  const detectorRef = useRef<ConflictDetector | undefined>(undefined);
  const stateRef = useRef<ConflictDetectionState>({
    isChecking: false,
    hasConflict: false,
    conflictInfo: undefined,
    lastChecked: undefined,
    error: undefined,
  });
  const isMountedRef = useRef(true);

  const mergedOptions: ConflictDetectionOptions = {
    ...DEFAULT_CONFLICT_OPTIONS,
    ...options,
  };

  // Validate required props
  useEffect(() => {
    if (!sp) {
      throw new ConflictDetectionError('SP context is required', 'INVALID_SP_CONTEXT');
    }
    if (!listId?.trim()) {
      throw new ConflictDetectionError('ListId is required', 'INVALID_LIST_ID');
    }
    if (!itemId || itemId <= 0) {
      throw new ConflictDetectionError('Valid ItemId is required', 'INVALID_ITEM_ID');
    }
  }, [sp, listId, itemId]);

  const updateState = useCallback(
    (updates: Partial<ConflictDetectionState>) => {
      if (!isMountedRef.current) return;

      stateRef.current = { ...stateRef.current, ...updates };
      if (onStateChange) {
        try {
          onStateChange(stateRef.current);
        } catch (error) {
          console.error('Error in onStateChange callback:', error);
        }
      }
    },
    [onStateChange]
  );

  // Initialize detector
  useEffect(() => {
    const initializeDetector = async () => {
      if (!enabled || !listId?.trim() || !itemId || !sp) {
        console.warn('ConflictDetectionProvider: Required props missing or disabled');
        return;
      }

      try {
        // Dispose existing detector
        if (detectorRef.current) {
          detectorRef.current.dispose();
        }

        // Create new detector instance
        detectorRef.current = new ConflictDetector(sp, listId.trim(), itemId, mergedOptions);

        // Update state to checking
        updateState({ isChecking: true, error: undefined });

        const result = await detectorRef.current.initialize();

        if (!isMountedRef.current) return; // Check if component is still mounted

        if (result.success) {
          updateState({
            isChecking: false,
            hasConflict: false,
            conflictInfo: result.conflictInfo,
            lastChecked: new Date(),
            error: undefined,
          });
        } else {
          updateState({
            isChecking: false,
            hasConflict: false,
            conflictInfo: undefined,
            lastChecked: new Date(),
            error: result.error || 'Failed to initialize conflict detection',
          });
        }
      } catch (error) {
        console.error('ConflictDetectionProvider: Failed to initialize', error);
        if (isMountedRef.current) {
          updateState({
            isChecking: false,
            hasConflict: false,
            conflictInfo: undefined,
            lastChecked: new Date(),
            error: error instanceof Error ? error.message : 'Initialization failed',
          });
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    initializeDetector();

    // Cleanup function
    return () => {
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = undefined;
      }
    };
  }, [sp, listId, itemId, enabled, JSON.stringify(mergedOptions), updateState]);

  // Update options when they change
  useEffect(() => {
    if (detectorRef.current && enabled) {
      try {
        detectorRef.current.updateOptions(mergedOptions);
      } catch (error) {
        console.error('ConflictDetectionProvider: Failed to update options', error);
        updateState({
          error: error instanceof Error ? error.message : 'Failed to update options',
        });
      }
    }
  }, [JSON.stringify(mergedOptions), enabled, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = undefined;
      }
    };
  }, []);

  const checkForConflicts = useCallback(async (): Promise<void> => {
    if (!detectorRef.current) {
      console.warn('ConflictDetectionProvider: Detector not initialized');
      return;
    }

    updateState({ isChecking: true, error: undefined });

    try {
      const result = await detectorRef.current.checkForConflicts();

      if (!isMountedRef.current) return;

      if (result.success && result.conflictInfo) {
        updateState({
          isChecking: false,
          hasConflict: result.conflictInfo.hasConflict,
          conflictInfo: result.conflictInfo,
          lastChecked: new Date(),
          error: undefined,
        });
      } else {
        updateState({
          isChecking: false,
          error: result.error || 'Failed to check for conflicts',
        });
      }
    } catch (error) {
      console.error('ConflictDetectionProvider: Failed to check conflicts', error);
      if (isMountedRef.current) {
        updateState({
          isChecking: false,
          error: error instanceof Error ? error.message : 'Conflict check failed',
        });
      }
    }
  }, [updateState]);

  const hasChangedSinceLastCheck = useCallback(async (): Promise<boolean> => {
    if (!detectorRef.current) {
      console.warn('ConflictDetectionProvider: Detector not initialized');
      return false;
    }

    try {
      const result = await detectorRef.current.hasChangedSinceLastCheck();
      return result.success && result.conflictInfo ? result.conflictInfo.hasConflict : false;
    } catch (error) {
      console.error('ConflictDetectionProvider: Failed to check for changes', error);
      return false;
    }
  }, []);

  const updateSnapshot = useCallback(async (): Promise<void> => {
    if (!detectorRef.current) {
      console.warn('ConflictDetectionProvider: Detector not initialized');
      return;
    }

    try {
      const result = await detectorRef.current.updateSnapshot();

      if (!isMountedRef.current) return;

      if (result.success && result.conflictInfo) {
        updateState({
          hasConflict: false,
          conflictInfo: result.conflictInfo,
          lastChecked: new Date(),
          error: undefined,
        });
      } else {
        updateState({
          error: result.error || 'Failed to update snapshot',
        });
      }
    } catch (error) {
      console.error('ConflictDetectionProvider: Failed to update snapshot', error);
      if (isMountedRef.current) {
        updateState({
          error: error instanceof Error ? error.message : 'Snapshot update failed',
        });
      }
    }
  }, [updateState]);

  const pausePolling = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.pausePolling();
    }
  }, []);

  const resumePolling = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.resumePolling();
    }
  }, []);

  const getState = useCallback((): ConflictDetectionState => {
    return { ...stateRef.current };
  }, []);

  const isPollingActive = useCallback((): boolean => {
    return detectorRef.current?.isPollingActive() ?? false;
  }, []);

  const contextValue: ConflictContextValue = {
    detector: detectorRef.current,
    checkForConflicts,
    hasChangedSinceLastCheck,
    updateSnapshot,
    pausePolling,
    resumePolling,
    getState,
    isPollingActive,
  };

  return <ConflictContext.Provider value={contextValue}>{children}</ConflictContext.Provider>;
};

// Custom hook to use the conflict context
export const useConflictContext = (): ConflictContextValue => {
  const context = useContext(ConflictContext);
  if (!context) {
    throw new ConflictDetectionError(
      'useConflictContext must be used within a ConflictDetectionProvider',
      'CONTEXT_NOT_FOUND'
    );
  }
  return context;
};

// HOC for class components
export interface WithConflictDetectionProps {
  conflictDetection: ConflictContextValue;
}

export const withConflictDetection = <P extends object>(
  Component: React.ComponentType<P & WithConflictDetectionProps>
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = props => {
    const conflictDetection = useConflictContext();

    return <Component {...props} conflictDetection={conflictDetection} />;
  };

  WrappedComponent.displayName = `withConflictDetection(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
};

// Specialized provider for forms
export interface ConflictDetectionFormProviderProps extends ConflictProviderProps {
  onConflictDetected?: (hasConflict: boolean, conflictInfo: any) => void;
  autoCheckInterval?: number;
}

export const ConflictDetectionFormProvider: React.FC<ConflictDetectionFormProviderProps> = ({
  onConflictDetected,
  autoCheckInterval = 30000,
  options = {},
  ...props
}) => {
  const formOptions: Partial<ConflictDetectionOptions> = {
    ...options,
    checkOnSave: true,
    checkInterval: autoCheckInterval,
    showNotification: true,
  };

  const handleStateChange = useCallback(
    (state: ConflictDetectionState) => {
      if (onConflictDetected && state.conflictInfo) {
        try {
          onConflictDetected(state.hasConflict, state.conflictInfo);
        } catch (error) {
          console.error('Error in onConflictDetected callback:', error);
        }
      }

      // Call original callback if provided
      if (props.onStateChange) {
        props.onStateChange(state);
      }
    },
    [onConflictDetected, props.onStateChange]
  );

  return (
    <ConflictDetectionProvider {...props} options={formOptions} onStateChange={handleStateChange} />
  );
};
