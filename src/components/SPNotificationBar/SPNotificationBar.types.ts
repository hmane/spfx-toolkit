/**
 * Props for the SPNotificationBar component.
 */
export interface ISPNotificationBarProps {
  /**
   * Where to position the notification stack.
   *
   * - `'top'` (default) — fixed to the top of its nearest positioned ancestor.
   * - `'bottom'` — fixed to the bottom of its nearest positioned ancestor.
   *
   * @default 'top'
   */
  position?: 'top' | 'bottom';

  /**
   * Maximum number of notifications to display at once.
   * When there are more than `maxVisible` active notifications, only the most
   * recent `maxVisible` are shown. Older ones remain in the store and are
   * not lost — they will appear once newer ones are dismissed.
   *
   * @default 5
   */
  maxVisible?: number;

  /**
   * Optional CSS class name applied to the outermost container element.
   * Useful for consuming components that need to adjust positioning within
   * their own layout.
   */
  className?: string;
}
