import { SPFI } from '@pnp/sp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ConflictDetector } from './ConflictDetector';
import {
  ConflictDetectionError,
  ConflictDetectionOptions,
  ConflictDetectionState,
  DEFAULT_CONFLICT_OPTIONS,
  PreSaveCheckResult,
  UseConflictDetectionProps,
  UseConflictDetectionReturn,
} from './types';

export const useConflictDetection = ({
  sp,
  listId,
  itemId,
  options = {},
  enabled = true,
}: UseConflictDetectionProps & { sp: SPFI }): UseConflictDetectionReturn => {
  const [state, setState] = useState<ConflictDetectionState>({
    isChecking: false,
    hasConflict: false,
    conflictInfo: undefined,
    lastChecked: undefined,
    error: undefined,
  });

  const detectorRef = useRef<ConflictDetector | undefined>(undefined);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  const mergedOptions: ConflictDetectionOptions = {
    ...DEFAULT_CONFLICT_OPTIONS,
    ...options,
  };

  // Safe state update that checks if component is still mounted
  const updateState = useCallback((updates: Partial<ConflictDetectionState>) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const initialize = useCallback(async (): Promise<boolean> => {
    if (!enabled || !listId || !itemId || !sp) {
      return false;
    }

    try {
      // Dispose existing detector if any
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }

      // Create new detector
      detectorRef.current = new ConflictDetector(sp, listId, itemId, mergedOptions);

      updateState({ isChecking: true, error: undefined });

      const result = await detectorRef.current.initialize();

      if (result.success) {
        updateState({
          isChecking: false,
          hasConflict: false,
          conflictInfo: result.conflictInfo,
          lastChecked: new Date(),
          error: undefined,
        });
        isInitializedRef.current = true;
        return true;
      } else {
        updateState({
          isChecking: false,
          error: result.error || 'Failed to initialize conflict detection',
        });
        isInitializedRef.current = false;
        return false;
      }
    } catch (error) {
      console.error('useConflictDetection: Initialize failed', error);
      updateState({
        isChecking: false,
        error: error instanceof Error ? error.message : 'Initialize failed',
      });
      isInitializedRef.current = false;
      return false;
    }
  }, [sp, listId, itemId, enabled, JSON.stringify(mergedOptions), updateState]);

  const checkForConflicts = useCallback(async (): Promise<boolean> => {
    if (!detectorRef.current || !isInitializedRef.current) {
      console.warn('useConflictDetection: Not initialized. Call initialize() first.');
      return false;
    }

    updateState({ isChecking: true, error: undefined });

    try {
      const result = await detectorRef.current.checkForConflicts();

      if (result.success && result.conflictInfo) {
        updateState({
          isChecking: false,
          hasConflict: result.conflictInfo.hasConflict,
          conflictInfo: result.conflictInfo,
          lastChecked: new Date(),
          error: undefined,
        });

        return result.conflictInfo.hasConflict;
      } else {
        updateState({
          isChecking: false,
          error: result.error || 'Failed to check for conflicts',
        });
        return false;
      }
    } catch (error) {
      console.error('useConflictDetection: Check failed', error);
      updateState({
        isChecking: false,
        error: error instanceof Error ? error.message : 'Conflict check failed',
      });
      return false;
    }
  }, [updateState]);

  const hasChangedSinceLastCheck = useCallback(async (): Promise<boolean> => {
    if (!detectorRef.current || !isInitializedRef.current) {
      console.warn('useConflictDetection: Not initialized. Call initialize() first.');
      return false;
    }

    try {
      const result = await detectorRef.current.hasChangedSinceLastCheck();

      if (result.success && result.conflictInfo) {
        // Don't update main state for soft checks, just return the result
        return result.conflictInfo.hasConflict;
      }

      return false;
    } catch (error) {
      console.error('useConflictDetection: hasChangedSinceLastCheck failed', error);
      return false;
    }
  }, []);

  const updateSnapshot = useCallback(
    async (saveResponseData?: any): Promise<boolean> => {
      if (!detectorRef.current || !isInitializedRef.current) {
        console.warn('useConflictDetection: Not initialized.');
        return false;
      }

      try {
        const result = await detectorRef.current.updateSnapshot(saveResponseData);

        if (result.success && result.conflictInfo) {
          updateState({
            hasConflict: false,
            conflictInfo: result.conflictInfo,
            lastChecked: new Date(),
            error: undefined,
          });
          return true;
        } else {
          updateState({
            error: result.error || 'Failed to update snapshot',
          });
          return false;
        }
      } catch (error) {
        console.error('useConflictDetection: Update snapshot failed', error);
        updateState({
          error: error instanceof Error ? error.message : 'Update snapshot failed',
        });
        return false;
      }
    },
    [updateState]
  );

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

  const dispose = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.dispose();
      detectorRef.current = undefined;
    }
    isInitializedRef.current = false;

    if (isMountedRef.current) {
      setState({
        isChecking: false,
        hasConflict: false,
        conflictInfo: undefined,
        lastChecked: undefined,
        error: undefined,
      });
    }
  }, []);

  const getDetector = useCallback((): ConflictDetector | undefined => {
    return detectorRef.current;
  }, []);

  const refreshState = useCallback((): ConflictDetectionState => {
    return { ...state };
  }, [state]);

  // Auto-initialize when parameters change
  useEffect(() => {
    if (enabled && listId && itemId && sp) {
      initialize().catch(error => {
        console.error('Auto-initialization failed:', error);
      });
    }

    return () => {
      dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, itemId, enabled, sp]);

  // Update options when they change
  useEffect(() => {
    if (detectorRef.current && isInitializedRef.current) {
      try {
        detectorRef.current.updateOptions(mergedOptions);
      } catch (error) {
        console.error('Failed to update options:', error);
        updateState({
          error: error instanceof Error ? error.message : 'Failed to update options',
        });
      }
    }
  }, [JSON.stringify(mergedOptions), updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      dispose();
    };
  }, [dispose]);

  return {
    // State
    isChecking: state.isChecking,
    hasConflict: state.hasConflict,
    conflictInfo: state.conflictInfo,
    lastChecked: state.lastChecked,
    error: state.error,
    isPollingActive: detectorRef.current?.isPollingActive() ?? false,

    // Actions
    checkForConflicts,
    hasChangedSinceLastCheck,
    updateSnapshot,
    initialize,
    dispose,
    pausePolling,
    resumePolling,

    // Utilities
    getDetector,
    refreshState,
  };
};

// Higher-order hook for pre-save conflict checking
export const usePreSaveConflictCheck = (
  sp: SPFI,
  listId: string,
  itemId: number,
  options: Partial<ConflictDetectionOptions> = {}
) => {
  // Validate required parameters
  if (!sp) {
    throw new ConflictDetectionError('SP context is required', 'INVALID_SP_CONTEXT');
  }

  const conflictDetection = useConflictDetection({
    sp,
    listId,
    itemId,
    options: { ...options, checkOnSave: true },
  });

  const checkBeforeSave = useCallback(async (): Promise<PreSaveCheckResult> => {
    try {
      const hasConflict = await conflictDetection.checkForConflicts();

      // If blocking is enabled and there's a conflict, don't allow save
      const canSave = options.blockSave ? !hasConflict : true;

      return {
        canSave,
        hasConflict,
        conflictInfo: conflictDetection.conflictInfo,
      };
    } catch (error) {
      console.error('Error in checkBeforeSave:', error);
      return {
        canSave: !options.blockSave, // If error and not blocking, allow save
        hasConflict: false,
        conflictInfo: undefined,
      };
    }
  }, [conflictDetection, options.blockSave]);

  return {
    ...conflictDetection,
    checkBeforeSave,
  };
};

// Lightweight hook for simple conflict monitoring
export const useConflictMonitor = (
  sp: SPFI,
  listId: string,
  itemId: number,
  intervalMs = 30000
) => {
  const { hasConflict, conflictInfo, error, initialize } = useConflictDetection({
    sp,
    listId,
    itemId,
    options: {
      checkInterval: intervalMs,
      showNotification: false,
      blockSave: false,
      logConflicts: false,
    },
  });

  // Auto-initialize on mount
  useEffect(() => {
    initialize().catch(error => {
      console.error('Conflict monitor initialization failed:', error);
    });
  }, [initialize]);

  return {
    hasConflict,
    conflictInfo,
    error,
    isMonitoring: !error,
  };
};

// Hook for form integration with validation
export const useFormConflictDetection = (
  sp: SPFI,
  listId: string,
  itemId: number,
  options: Partial<ConflictDetectionOptions> = {}
) => {
  const detection = useConflictDetection({
    sp,
    listId,
    itemId,
    options: {
      ...options,
      checkOnSave: true,
      showNotification: true,
    },
  });

  const validateBeforeSave = useCallback(async (): Promise<{
    isValid: boolean;
    message?: string;
  }> => {
    try {
      const hasConflict = await detection.checkForConflicts();

      if (hasConflict && options.blockSave) {
        return {
          isValid: false,
          message: 'Cannot save due to conflicts. Please refresh and try again.',
        };
      }

      if (hasConflict) {
        return {
          isValid: true,
          message: 'Warning: This record has been modified by another user.',
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: !options.blockSave,
        message: 'Unable to check for conflicts. Please try again.',
      };
    }
  }, [detection, options.blockSave]);

  const handleSuccessfulSave = useCallback(
    async (saveResponse?: any) => {
      // Note: updateSnapshot will fetch fresh data from SharePoint
      // saveResponse parameter is kept for future extensibility
      await detection.updateSnapshot();
    },
    [detection]
  );

  return {
    ...detection,
    validateBeforeSave,
    handleSuccessfulSave,
  };
};
