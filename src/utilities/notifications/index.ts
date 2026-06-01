/**
 * Notification store public API.
 *
 * Imperative (non-React):
 *   import { notify, dismiss, dismissAll, notificationStore } from 'spfx-toolkit/lib/utilities/notifications';
 *
 * React hook:
 *   import { useNotifications } from 'spfx-toolkit/lib/utilities/notifications';
 *
 * Or via the utilities barrel:
 *   import { notify, useNotifications } from 'spfx-toolkit/lib/utilities';
 */

import * as React from 'react';
import {
  notificationStore,
  notify,
  dismiss,
  dismissAll,
} from './notificationStore';
import type { INotification, NotificationType } from './notificationStore';

export { notificationStore, notify, dismiss, dismissAll };
export type { INotification, NotificationType };

export type { NotificationStoreState } from './notificationStore';

// ---------------------------------------------------------------------------
// useNotifications — React hook
// ---------------------------------------------------------------------------

export interface UseNotificationsResult {
  notifications: INotification[];
  notify: typeof notify;
  dismiss: typeof dismiss;
  dismissAll: typeof dismissAll;
}

/**
 * Subscribe to the notification store and expose the full API in one hook.
 *
 * Re-renders only when the `notifications` array reference changes (i.e. when
 * a notification is added or removed). Uses the same React 17-compatible shim
 * approach as `components/debug/hooks.ts` and `components/SPDebugPanel/hooks/useDebugStore.ts`.
 */
export function useNotifications(): UseNotificationsResult {
  const subscribe = React.useCallback(
    (listener: () => void) => notificationStore.subscribe(listener),
    []
  );

  const getSnapshot = React.useCallback(
    () => notificationStore.getState().notifications,
    []
  );

  const [notifications, setNotifications] = React.useState(getSnapshot);
  const lastRef = React.useRef(notifications);
  lastRef.current = notifications;

  React.useEffect(() => {
    const check = (): void => {
      const next = getSnapshot();
      if (!Object.is(next, lastRef.current)) {
        lastRef.current = next;
        setNotifications(next);
      }
    };
    // Run once in case the store changed between render and the effect.
    check();
    return subscribe(check);
  }, [subscribe, getSnapshot]);

  return { notifications, notify, dismiss, dismissAll };
}
