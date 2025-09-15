import {
  DefaultButton,
  Dialog,
  DialogFooter,
  DialogType,
  Icon,
  MessageBar,
  MessageBarType,
  PrimaryButton,
  Separator,
  Spinner,
  SpinnerSize,
  Stack,
  Text,
} from '@fluentui/react';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConflictInfo, ConflictResolutionAction } from './types';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  conflictInfo: ConflictInfo | undefined;
  isProcessing?: boolean;
  customTitle?: string;
  customMessage?: string;
  showOverwriteOption?: boolean;
  showRefreshOption?: boolean;
  showCancelOption?: boolean;
  blockingMode?: boolean;
  maxWidth?: string;
  onResolve: (action: ConflictResolutionAction) => void | Promise<void>;
  onDismiss: () => void;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  isOpen,
  conflictInfo,
  isProcessing = false,
  customTitle,
  customMessage,
  showOverwriteOption = true,
  showRefreshOption = true,
  showCancelOption = true,
  blockingMode = false,
  maxWidth = '600px',
  onResolve,
  onDismiss,
}) => {
  const [selectedAction, setSelectedAction] = useState<
    ConflictResolutionAction['type'] | undefined
  >(undefined);
  const [processingAction, setProcessingAction] = useState<
    ConflictResolutionAction['type'] | undefined
  >(undefined);

  // Reset selected action when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAction(undefined);
      setProcessingAction(undefined);
    }
  }, [isOpen]);

  // Don't render if no conflict info
  if (!conflictInfo?.hasConflict) {
    return null;
  }

  const formatDateTime = useCallback((date: Date): string => {
    try {
      return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toString();
    }
  }, []);

  const handleResolve = useCallback(
    async (actionType: ConflictResolutionAction['type']) => {
      let message = '';

      switch (actionType) {
        case 'refresh':
          message = 'User chose to refresh and reload the current data';
          break;
        case 'overwrite':
          message = 'User chose to continue and overwrite the existing changes';
          break;
        case 'cancel':
          message = 'User cancelled the operation';
          break;
        default:
          message = `User selected action: ${actionType}`;
      }

      const action: ConflictResolutionAction = {
        type: actionType,
        message,
      };

      setSelectedAction(actionType);
      setProcessingAction(actionType);

      try {
        await onResolve(action);
      } catch (error) {
        console.error('Error in conflict resolution:', error);
        // Reset processing state on error
        setProcessingAction(undefined);
      }
    },
    [onResolve]
  );

  const handleDismiss = useCallback(() => {
    if (!blockingMode && !isProcessing) {
      onDismiss();
    }
  }, [blockingMode, isProcessing, onDismiss]);

  const title = useMemo(() => customTitle || 'Conflict Detected', [customTitle]);

  const message = useMemo(() => {
    if (customMessage) {
      return customMessage;
    }

    try {
      return `This record has been modified by another user while you were editing it.
        You can refresh to see the latest changes, or continue to overwrite them with your changes.`;
    } catch (error) {
      console.error('Error creating dialog message:', error);
      return 'This record has been modified by another user while you were editing it.';
    }
  }, [customMessage]);

  const dialogContentProps = useMemo(
    () => ({
      type: DialogType.normal,
      title: title,
      styles: {
        innerContent: {
          minWidth: '500px',
          maxWidth,
        },
      },
    }),
    [title, maxWidth]
  );

  const conflictDetails = useMemo(() => {
    if (!conflictInfo) return undefined;

    return (
      <Stack tokens={{ childrenGap: 12 }}>
        <Text variant='mediumPlus' styles={{ root: { fontWeight: 600 } }}>
          Conflict Details:
        </Text>

        <Stack tokens={{ childrenGap: 8 }}>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <Text variant='small' styles={{ root: { fontWeight: 600, minWidth: '120px' } }}>
              Modified by:
            </Text>
            <Text variant='small'>{conflictInfo.lastModifiedBy}</Text>
          </Stack>

          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <Text variant='small' styles={{ root: { fontWeight: 600, minWidth: '120px' } }}>
              Modified on:
            </Text>
            <Text variant='small'>{formatDateTime(conflictInfo.lastModified)}</Text>
          </Stack>

          {conflictInfo.originalModified && (
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <Text variant='small' styles={{ root: { fontWeight: 600, minWidth: '120px' } }}>
                You started editing:
              </Text>
              <Text variant='small'>{formatDateTime(conflictInfo.originalModified)}</Text>
            </Stack>
          )}
        </Stack>
      </Stack>
    );
  }, [conflictInfo, formatDateTime]);

  const processingIndicator = useMemo(() => {
    if (!isProcessing && !processingAction) return undefined;

    const actionText = processingAction
      ? `Processing ${processingAction}...`
      : 'Processing your request...';

    return (
      <MessageBar messageBarType={MessageBarType.info}>
        <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
          <Spinner size={SpinnerSize.small} />
          <Text>{actionText}</Text>
        </Stack>
      </MessageBar>
    );
  }, [isProcessing, processingAction]);

  const warningMessage = useMemo(() => {
    if (selectedAction !== 'overwrite' || isProcessing || processingAction) return undefined;

    return (
      <MessageBar messageBarType={MessageBarType.warning}>
        <Text>
          <strong>Warning:</strong> Continuing will overwrite changes made by{' '}
          {conflictInfo?.lastModifiedBy || 'another user'}. This action cannot be undone.
        </Text>
      </MessageBar>
    );
  }, [selectedAction, isProcessing, processingAction, conflictInfo?.lastModifiedBy]);

  const actionButtons = useMemo(() => {
    const isButtonDisabled = isProcessing || processingAction !== undefined;

    return (
      <Stack horizontal tokens={{ childrenGap: 8 }}>
        {/* Refresh button */}
        {showRefreshOption && (
          <PrimaryButton
            onClick={() => handleResolve('refresh')}
            disabled={isButtonDisabled}
            iconProps={{ iconName: 'Refresh' }}
          >
            Refresh & Reload
          </PrimaryButton>
        )}

        {/* Overwrite button */}
        {showOverwriteOption && (
          <DefaultButton
            onClick={() => handleResolve('overwrite')}
            disabled={isButtonDisabled}
            iconProps={{ iconName: 'Warning' }}
            styles={{
              root: {
                borderColor: '#ff8c00',
              },
              rootHovered: {
                borderColor: '#ff8c00',
                backgroundColor: '#fff4e6',
              },
            }}
          >
            Continue Anyway
          </DefaultButton>
        )}

        {/* Cancel button */}
        {showCancelOption && (
          <DefaultButton onClick={() => handleResolve('cancel')} disabled={isButtonDisabled}>
            Cancel
          </DefaultButton>
        )}
      </Stack>
    );
  }, [
    showRefreshOption,
    showOverwriteOption,
    showCancelOption,
    isProcessing,
    processingAction,
    handleResolve,
  ]);

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={handleDismiss}
      dialogContentProps={dialogContentProps}
      modalProps={{
        isBlocking: blockingMode || isProcessing,
        dragOptions: undefined,
      }}
    >
      <Stack tokens={{ childrenGap: 16 }}>
        {/* Warning icon and message */}
        <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign='start'>
          <Icon
            iconName='Warning'
            styles={{
              root: {
                fontSize: 24,
                color: '#ff8c00',
                marginTop: 2,
              },
            }}
          />
          <Stack tokens={{ childrenGap: 8 }} styles={{ root: { flex: 1 } }}>
            <Text variant='medium'>{message}</Text>
          </Stack>
        </Stack>

        <Separator />

        {/* Conflict details */}
        {conflictDetails}

        {/* Processing indicator */}
        {processingIndicator}

        {/* Action warning */}
        {warningMessage}
      </Stack>

      <DialogFooter>{actionButtons}</DialogFooter>
    </Dialog>
  );
};

// Hook for managing dialog state
export const useConflictResolutionDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const openDialog = useCallback(() => {
    setIsOpen(true);
    setIsProcessing(false);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setIsProcessing(false);
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);

  return {
    isOpen,
    isProcessing,
    openDialog,
    closeDialog,
    setProcessing,
  };
};

// Enhanced dialog with additional features
interface EnhancedConflictResolutionDialogProps extends ConflictResolutionDialogProps {
  autoOpen?: boolean;
  confirmationRequired?: boolean;
  onBeforeResolve?: (action: ConflictResolutionAction) => boolean | Promise<boolean>;
}

export const EnhancedConflictResolutionDialog: React.FC<EnhancedConflictResolutionDialogProps> = ({
  autoOpen = false,
  confirmationRequired = false,
  onBeforeResolve,
  onResolve,
  conflictInfo,
  isOpen,
  ...props
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<ConflictResolutionAction | undefined>(
    undefined
  );

  // Auto-open when conflict is detected
  useEffect(() => {
    if (autoOpen && conflictInfo?.hasConflict && !internalOpen) {
      setInternalOpen(true);
    }
  }, [autoOpen, conflictInfo?.hasConflict, internalOpen]);

  const handleResolve = useCallback(
    async (action: ConflictResolutionAction) => {
      try {
        // Pre-resolve validation
        if (onBeforeResolve) {
          const canProceed = await onBeforeResolve(action);
          if (!canProceed) {
            return;
          }
        }

        // Confirmation for destructive actions
        if (confirmationRequired && action.type === 'overwrite') {
          setPendingAction(action);
          setShowConfirmation(true);
          return;
        }

        await onResolve(action);

        if (autoOpen) {
          setInternalOpen(false);
        }
      } catch (error) {
        console.error('Error in enhanced conflict resolution:', error);
      }
    },
    [onBeforeResolve, confirmationRequired, onResolve, autoOpen]
  );

  const handleConfirmation = useCallback(
    async (confirmed: boolean) => {
      setShowConfirmation(false);

      if (confirmed && pendingAction) {
        await onResolve(pendingAction);
        if (autoOpen) {
          setInternalOpen(false);
        }
      }

      setPendingAction(undefined);
    },
    [pendingAction, onResolve, autoOpen]
  );

  const handleDismiss = useCallback(() => {
    if (autoOpen) {
      setInternalOpen(false);
    } else {
      props.onDismiss();
    }
  }, [autoOpen, props]);

  const dialogIsOpen = autoOpen ? internalOpen : isOpen;

  return (
    <>
      <ConflictResolutionDialog
        {...props}
        isOpen={dialogIsOpen}
        conflictInfo={conflictInfo}
        onResolve={handleResolve}
        onDismiss={handleDismiss}
      />

      {/* Confirmation dialog */}
      <Dialog
        hidden={!showConfirmation}
        onDismiss={() => handleConfirmation(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Confirm Overwrite',
        }}
        modalProps={{
          isBlocking: true,
        }}
      >
        <Text>
          Are you sure you want to overwrite the changes made by{' '}
          {conflictInfo?.lastModifiedBy || 'another user'}? This action cannot be undone.
        </Text>
        <DialogFooter>
          <PrimaryButton onClick={() => handleConfirmation(true)}>Yes, Overwrite</PrimaryButton>
          <DefaultButton onClick={() => handleConfirmation(false)}>Cancel</DefaultButton>
        </DialogFooter>
      </Dialog>
    </>
  );
};

// Combined notification and dialog component
interface ConflictHandlerProps {
  conflictInfo: ConflictInfo | undefined;
  isChecking: boolean;
  error: string | undefined;
  showDialog?: boolean;
  showNotification?: boolean;
  dialogProps?: Partial<ConflictResolutionDialogProps>;
  onRefresh?: () => void | Promise<void>;
  onOverwrite?: () => void | Promise<void>;
  onDismiss?: () => void;
  onAction?: (action: ConflictResolutionAction) => void | Promise<void>;
}

export const ConflictHandler: React.FC<ConflictHandlerProps> = ({
  conflictInfo,
  isChecking,
  error,
  showDialog = false,
  showNotification = true,
  dialogProps = {},
  onRefresh,
  onOverwrite,
  onDismiss,
  onAction,
}) => {
  const { isOpen, isProcessing, openDialog, closeDialog, setProcessing } =
    useConflictResolutionDialog();

  useEffect(() => {
    if (conflictInfo?.hasConflict && showDialog && !isOpen) {
      openDialog();
    }
  }, [conflictInfo?.hasConflict, showDialog, isOpen, openDialog]);

  const handleAction = useCallback(
    async (action: ConflictResolutionAction) => {
      setProcessing(true);

      try {
        if (onAction) {
          await onAction(action);
        }

        // Execute specific handlers
        switch (action.type) {
          case 'refresh':
            if (onRefresh) {
              await onRefresh();
            }
            break;
          case 'overwrite':
            if (onOverwrite) {
              await onOverwrite();
            }
            break;
          case 'cancel':
            if (onDismiss) {
              onDismiss();
            }
            break;
        }
      } catch (error) {
        console.error('Error handling conflict action:', error);
      } finally {
        setProcessing(false);
        if (showDialog) {
          closeDialog();
        }
      }
    },
    [onAction, onRefresh, onOverwrite, onDismiss, setProcessing, showDialog, closeDialog]
  );

  // Only import the notification component when needed to avoid circular dependencies
  const NotificationComponent = React.lazy(() =>
    import(/* webpackChunkName: 'conflict-notification-bar' */ './ConflictNotificationBar').then(module => ({
      default: module.ConflictNotificationBar,
    }))
  );

  return (
    <>
      {/* Notification Bar */}
      {showNotification && (
        <React.Suspense fallback={<div>Loading...</div>}>
          <NotificationComponent
            conflictInfo={conflictInfo}
            isChecking={isChecking}
            error={error}
            onRefresh={onRefresh}
            onOverwrite={onOverwrite}
            onDismiss={onDismiss}
            onAction={onAction}
          />
        </React.Suspense>
      )}

      {/* Resolution Dialog */}
      {showDialog && (
        <ConflictResolutionDialog
          {...dialogProps}
          isOpen={isOpen}
          conflictInfo={conflictInfo}
          isProcessing={isProcessing}
          onResolve={handleAction}
          onDismiss={closeDialog}
        />
      )}
    </>
  );
};
