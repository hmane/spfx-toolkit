import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { useNotifications } from '../../utilities/notifications';
import type { INotification, NotificationType } from '../../utilities/notifications';
import type { ISPNotificationBarProps } from './SPNotificationBar.types';
import './SPNotificationBar.css';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const TYPE_MAP: Record<NotificationType, MessageBarType> = {
  success: MessageBarType.success,
  error: MessageBarType.error,
  warning: MessageBarType.warning,
  info: MessageBarType.info,
};

function notificationToMessageBarType(type: NotificationType): MessageBarType {
  return TYPE_MAP[type] ?? MessageBarType.info;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEFAULT_MAX_VISIBLE = 5;

/**
 * SPNotificationBar — renders active toast notifications as stacked Fluent UI
 * MessageBars. Subscribes to the notification store via `useNotifications`.
 *
 * Usage:
 * ```tsx
 * import { SPNotificationBar, notify } from 'spfx-toolkit/lib/components/SPNotificationBar';
 *
 * // In your web part render:
 * <SPNotificationBar position="top" maxVisible={5} />
 *
 * // Anywhere in your code:
 * notify({ type: 'success', message: 'Item saved.' });
 * notify({ type: 'error', message: 'Failed to load data.', duration: 0 });
 * ```
 */
export const SPNotificationBar: React.FC<ISPNotificationBarProps> = ({
  position = 'top',
  maxVisible = DEFAULT_MAX_VISIBLE,
  className,
}) => {
  const { notifications, dismiss } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  // Show only the most recent `maxVisible` notifications.
  const visible: INotification[] =
    notifications.length > maxVisible
      ? notifications.slice(notifications.length - maxVisible)
      : notifications;

  const containerClass = [
    'spNotificationBar',
    position === 'bottom' ? 'spNotificationBar--bottom' : 'spNotificationBar--top',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass} role="region" aria-live="polite" aria-label="Notifications">
      {visible.map((n) => (
        <MessageBar
          key={n.id}
          messageBarType={notificationToMessageBarType(n.type)}
          isMultiline={false}
          onDismiss={() => dismiss(n.id)}
          dismissButtonAriaLabel="Dismiss notification"
        >
          {n.message}
        </MessageBar>
      ))}
    </div>
  );
};
