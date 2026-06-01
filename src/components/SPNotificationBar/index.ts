/**
 * SPNotificationBar — transient toast notification component.
 *
 * Renders active notifications as stacked Fluent UI MessageBars. Subscribes to
 * the notification store automatically via `useNotifications`.
 *
 * Import via deep subpath for optimal tree-shaking:
 * ```ts
 * import { SPNotificationBar } from 'spfx-toolkit/lib/components/SPNotificationBar';
 * ```
 *
 * The imperative `notify`/`dismiss`/`dismissAll` API lives in the utilities:
 * ```ts
 * import { notify, dismiss, dismissAll } from 'spfx-toolkit/lib/utilities/notifications';
 * ```
 */

export { SPNotificationBar } from './SPNotificationBar';
export type { ISPNotificationBarProps } from './SPNotificationBar.types';
