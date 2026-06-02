/**
 * Notification store — vanilla zustand store for transient toast notifications.
 *
 * Works in React and non-React code. The store is a module-level singleton,
 * matching the pattern established by `utilities/debug/SPDebugStore`.
 *
 * Public API:
 *   notify(input)   — add a notification, returns its id
 *   dismiss(id)     — remove a notification and clear its timer
 *   dismissAll()    — remove all notifications
 *   useNotifications() — React hook (in index.ts)
 *
 * Auto-dismiss timers are `unref()`'d (when available) so Node.js test runs
 * do not hang — the same guard used in `components/SPDebugPanel/clipboard.ts`.
 */

import { createStore } from 'zustand/vanilla';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface INotification {
  id: string;
  type: NotificationType;
  message: string;
  /** Effective duration in ms. 0 = sticky (no auto-dismiss). */
  duration: number;
  createdAt: number;
}

export interface NotificationStoreState {
  notifications: INotification[];

  // Actions
  addNotification: (notification: INotification) => void;
  removeNotification: (id: string) => void;
  removeAllNotifications: () => void;
}

// ---------------------------------------------------------------------------
// Default durations per type
// ---------------------------------------------------------------------------

const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 0, // sticky — never auto-dismissed
};

// ---------------------------------------------------------------------------
// ID generation — simple incrementing counter (deterministic for tests)
// ---------------------------------------------------------------------------

let _counter = 0;

function nextId(): string {
  _counter += 1;
  return 'notif_' + _counter;
}

// ---------------------------------------------------------------------------
// Timer registry — maps notification id → active NodeJS.Timeout / number
// ---------------------------------------------------------------------------

const _timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

function clearTimer(id: string): void {
  const t = _timers.get(id);
  if (t !== undefined) {
    clearTimeout(t);
    _timers.delete(id);
  }
}

// ---------------------------------------------------------------------------
// Vanilla zustand store
// ---------------------------------------------------------------------------

export const notificationStore = createStore<NotificationStoreState>((set) => ({
  notifications: [],

  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  removeAllNotifications: () => set({ notifications: [] }),
}));

// ---------------------------------------------------------------------------
// Public imperative API
// ---------------------------------------------------------------------------

/**
 * Add a notification and schedule auto-dismiss when `duration` > 0.
 *
 * Returns the generated notification id.
 */
export function notify(input: {
  type: NotificationType;
  message: string;
  duration?: number;
}): string {
  const id = nextId();
  const duration =
    input.duration !== undefined ? input.duration : DEFAULT_DURATIONS[input.type];

  const notification: INotification = {
    id,
    type: input.type,
    message: input.message,
    duration,
    createdAt: Date.now(),
  };

  notificationStore.getState().addNotification(notification);

  if (duration > 0) {
    const timer = setTimeout(() => {
      _timers.delete(id);
      notificationStore.getState().removeNotification(id);
    }, duration);

    // Prevent the timer from keeping the Node.js event loop alive in tests.
    // Mirror the guard from `src/components/SPDebugPanel/clipboard.ts`.
    if (timer && typeof (timer as { unref?: () => void }).unref === 'function') {
      (timer as { unref: () => void }).unref();
    }

    _timers.set(id, timer);
  }

  return id;
}

/**
 * Dismiss a specific notification by id. Also clears any pending auto-dismiss
 * timer so it does not fire after manual removal.
 */
export function dismiss(id: string): void {
  clearTimer(id);
  notificationStore.getState().removeNotification(id);
}

/**
 * Dismiss all active notifications and clear all pending auto-dismiss timers.
 */
export function dismissAll(): void {
  // Snapshot current ids before clearing.
  const ids = notificationStore.getState().notifications.map((n) => n.id);
  ids.forEach(clearTimer);
  notificationStore.getState().removeAllNotifications();
}
