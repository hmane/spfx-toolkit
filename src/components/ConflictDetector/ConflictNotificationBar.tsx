import {
  MessageBar,
  MessageBarButton,
  MessageBarType,
  Spinner,
  SpinnerSize,
  Stack,
  Text,
} from '@fluentui/react';
import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { ConflictInfo, ConflictResolutionAction } from './types';

interface ConflictNotificationBarProps {
  conflictInfo: ConflictInfo | undefined;
  isChecking: boolean;
  error: string | undefined;
  customMessage?: string;
  showDismiss?: boolean;
  showActions?: boolean;
  position?: 'fixed-top' | 'fixed-bottom' | 'inline';
  onRefresh?: () => void | Promise<void>;
  onOverwrite?: () => void | Promise<void>;
  onDismiss?: () => void;
  onAction?: (action: ConflictResolutionAction) => void | Promise<void>;
}

export const ConflictNotificationBar: React.FC<ConflictNotificationBarProps> = ({
  conflictInfo,
  isChecking,
  error,
  customMessage,
  showDismiss = true,
  showActions = true,
  position = 'inline',
  onRefresh,
  onOverwrite,
  onDismiss,
  onAction,
}) => {
  // Don't render if no conflict, error, or checking state
  if (!conflictInfo?.hasConflict && !error && !isChecking) {
    return null;
  }

  const handleAction = useCallback(
    async (action: ConflictResolutionAction) => {
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
          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      } catch (actionError) {
        console.error('Error handling conflict action:', actionError);
      }
    },
    [onAction, onRefresh, onOverwrite, onDismiss]
  );

  const formatDateTime = useCallback((date: Date): string => {
    try {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (formatError) {
      console.error('Error formatting date:', formatError);
      return date.toString();
    }
  }, []);

  const positionStyles: React.CSSProperties = useMemo(() => {
    const baseStyles: React.CSSProperties = {
      zIndex: 1000,
    };

    switch (position) {
      case 'fixed-top':
        return {
          ...baseStyles,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
        };
      case 'fixed-bottom':
        return {
          ...baseStyles,
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
        };
      case 'inline':
      default:
        return {
          position: 'relative',
        };
    }
  }, [position]);

  // Error state
  if (error) {
    return (
      <div style={positionStyles}>
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={false}
          onDismiss={showDismiss ? onDismiss : undefined}
          dismissButtonAriaLabel='Close error message'
        >
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
            <Text>
              <strong>Conflict Detection Error:</strong> {error}
            </Text>
          </Stack>
        </MessageBar>
      </div>
    );
  }

  // Checking state
  if (isChecking) {
    return (
      <div style={positionStyles}>
        <MessageBar messageBarType={MessageBarType.info} isMultiline={false}>
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
            <Spinner size={SpinnerSize.xSmall} />
            <Text>Checking for conflicts...</Text>
          </Stack>
        </MessageBar>
      </div>
    );
  }

  // Conflict detected state
  if (conflictInfo?.hasConflict) {
    const conflictMessage = useMemo(() => {
      if (customMessage) {
        return customMessage;
      }

      try {
        return `This record was modified by ${conflictInfo.lastModifiedBy} on ${formatDateTime(
          conflictInfo.lastModified
        )}. Your changes might overwrite their updates.`;
      } catch (messageError) {
        console.error('Error creating conflict message:', messageError);
        return 'This record has been modified by another user. Your changes might overwrite their updates.';
      }
    }, [customMessage, conflictInfo.lastModifiedBy, conflictInfo.lastModified, formatDateTime]);

    const actionButtons = useMemo(() => {
      if (!showActions) {
        return undefined;
      }

      const buttons: React.ReactNode[] = [];

      // Add refresh action
      if (onRefresh || onAction) {
        buttons.push(
          <MessageBarButton
            key='refresh'
            onClick={() =>
              handleAction({
                type: 'refresh',
                message: 'User chose to refresh and reload the form',
              })
            }
          >
            Refresh & Reload
          </MessageBarButton>
        );
      }

      // Add overwrite action
      if (onOverwrite || onAction) {
        buttons.push(
          <MessageBarButton
            key='overwrite'
            onClick={() =>
              handleAction({
                type: 'overwrite',
                message: 'User chose to continue and overwrite changes',
              })
            }
          >
            Continue Anyway
          </MessageBarButton>
        );
      }

      return buttons.length > 0 ? <div>{buttons}</div> : undefined;
    }, [showActions, onRefresh, onAction, onOverwrite, handleAction]);

    return (
      <div style={positionStyles}>
        <MessageBar
          messageBarType={MessageBarType.warning}
          isMultiline={true}
          onDismiss={showDismiss ? onDismiss : undefined}
          dismissButtonAriaLabel='Dismiss conflict warning'
          actions={actionButtons}
        >
          <Stack tokens={{ childrenGap: 4 }}>
            <Text>
              <strong>Conflict Detected:</strong> {conflictMessage}
            </Text>
            {conflictInfo.originalModified && (
              <Text variant='small' styles={{ root: { color: '#666' } }}>
                Your editing session started: {formatDateTime(conflictInfo.originalModified)}
              </Text>
            )}
          </Stack>
        </MessageBar>
      </div>
    );
  }

  return null;
};

// Enhanced notification component with additional features
interface ConflictNotificationProps extends ConflictNotificationBarProps {
  autoHide?: boolean;
  autoHideDelay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ConflictNotification: React.FC<ConflictNotificationProps> = ({
  autoHide = false,
  autoHideDelay = 5000,
  className,
  style,
  position = 'fixed-top',
  onDismiss,
  ...props
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  // Auto-hide functionality
  React.useEffect(() => {
    if (autoHide && (props.conflictInfo?.hasConflict || props.error)) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          onDismiss();
        }
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, props.conflictInfo?.hasConflict, props.error, onDismiss]);

  // Reset visibility when new conflicts appear
  React.useEffect(() => {
    if (props.conflictInfo?.hasConflict || props.error || props.isChecking) {
      setIsVisible(true);
    }
  }, [props.conflictInfo?.hasConflict, props.error, props.isChecking]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={className} style={style}>
      <ConflictNotificationBar {...props} position={position} onDismiss={handleDismiss} />
    </div>
  );
};

// Hook to manage notification state
export const useConflictNotification = () => {
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [dismissCount, setDismissCount] = React.useState(0);

  const resetDismissed = useCallback(() => {
    setIsDismissed(false);
  }, []);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    setDismissCount(prev => prev + 1);
  }, []);

  // Auto-reset dismissed state when conflicts change
  const handleConflictChange = useCallback(
    (hasConflict: boolean) => {
      if (hasConflict && isDismissed) {
        setIsDismissed(false);
      }
    },
    [isDismissed]
  );

  return {
    isDismissed,
    dismissCount,
    resetDismissed,
    dismiss,
    handleConflictChange,
  };
};

// Lightweight notification for simple scenarios
interface SimpleConflictNotificationProps {
  hasConflict: boolean;
  conflictMessage?: string;
  onRefresh?: () => void;
  onDismiss?: () => void;
}

export const SimpleConflictNotification: React.FC<SimpleConflictNotificationProps> = ({
  hasConflict,
  conflictMessage = 'This record has been modified by another user.',
  onRefresh,
  onDismiss,
}) => {
  if (!hasConflict) {
    return null;
  }

  return (
    <ConflictNotificationBar
      conflictInfo={{
        hasConflict: true,
        originalVersion: '',
        currentVersion: '',
        lastModifiedBy: 'Unknown',
        lastModified: new Date(),
        originalModified: new Date(),
        itemId: 0,
        listId: '',
      }}
      isChecking={false}
      error={undefined}
      customMessage={conflictMessage}
      onRefresh={onRefresh}
      onDismiss={onDismiss}
      showActions={!!onRefresh}
    />
  );
};

// Toast-style notification component
interface ConflictToastProps {
  conflictInfo: ConflictInfo | undefined;
  onDismiss?: () => void;
  duration?: number;
}

export const ConflictToast: React.FC<ConflictToastProps> = ({
  conflictInfo,
  onDismiss,
  duration = 8000,
}) => {
  return (
    <ConflictNotification
      conflictInfo={conflictInfo}
      isChecking={false}
      error={undefined}
      position='fixed-top'
      autoHide={true}
      autoHideDelay={duration}
      onDismiss={onDismiss}
      showActions={false}
      style={{
        maxWidth: '500px',
        margin: '10px auto',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    />
  );
};
