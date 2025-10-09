// ========================================
// Lightweight Date Extensions for SPFx Toolkit
// src/utilities/dateUtils/dateExtensions.ts
// ========================================

/**
 * Lightweight date extension methods leveraging DevExtreme
 * Compatible with SPFx 1.21.1 and ES5 target
 */

// ========================================
// TYPE DECLARATIONS
// ========================================

declare global {
  interface Date {
    /**
     * Format date using DevExtreme pattern or custom tokens
     * @param pattern - Format pattern string (e.g., 'MM/dd/yyyy', 'shortDate', 'yyyy-MM-dd HH:mm:ss')
     * @returns Formatted date string
     * @example
     * ```typescript
     * new Date().format('MM/dd/yyyy'); // '03/15/2024'
     * new Date().format('MMMM dd, yyyy'); // 'March 15, 2024'
     * new Date().format('shortDate'); // Uses DevExtreme predefined format
     * ```
     */
    format(pattern: string): string;

    /**
     * Add specified number of days to the date
     * @param days - Number of days to add (can be negative)
     * @returns New Date object with days added
     * @example
     * ```typescript
     * new Date().addDays(7); // Date 7 days from now
     * new Date().addDays(-3); // Date 3 days ago
     * ```
     */
    addDays(days: number): Date;

    /**
     * Add business days to the date (skips weekends)
     * @param days - Number of business days to add (can be negative)
     * @returns New Date object with business days added
     * @example
     * ```typescript
     * new Date().addBusinessDays(5); // Date 5 business days from now
     * new Date().addBusinessDays(-2); // Date 2 business days ago
     * ```
     */
    addBusinessDays(days: number): Date;

    /**
     * Check if the date is today
     * @returns True if the date is today, false otherwise
     * @example
     * ```typescript
     * new Date().isToday(); // true
     * new Date('2024-01-01').isToday(); // false (unless today is Jan 1, 2024)
     * ```
     */
    isToday(): boolean;
  }
}

// ========================================
// DEVEXTREME INTEGRATION
// ========================================

// Import DevExtreme localization utilities
let dxLocalization: any = null;

try {
  // Import DevExtreme localization
  const localization = require('devextreme/localization');
  dxLocalization = localization;
} catch (e) {
  // DevExtreme not available - fall back to custom implementation
  console.warn('DevExtreme not available, using fallback date utilities');
}

// ========================================
// CORE DATE UTILITIES
// ========================================

/**
 * Date utility functions that can be used without extending Date.prototype
 * Provides comprehensive date manipulation and formatting capabilities
 * leveraging DevExtreme when available with intelligent fallbacks
 */
export const DateUtils = {
  /**
   * Format date using DevExtreme pattern or custom tokens
   *
   * When DevExtreme is available, supports all DevExtreme format patterns including:
   * - Predefined formats: 'shortDate', 'longDate', 'shortTime', 'longTime', 'shortDateTime', 'longDateTime'
   * - Custom patterns with tokens: y, M, d, H, h, m, s, a, z
   *
   * When DevExtreme is not available, uses custom lightweight formatting with these tokens:
   * - yyyy/yy: Full/short year (2024/24)
   * - MMMM/MMM/MM/M: Full/short/padded/unpadded month (March/Mar/03/3)
   * - dd/d: Padded/unpadded day (15/15)
   * - HH/H: Padded/unpadded 24-hour (14/14)
   * - hh/h: Padded/unpadded 12-hour (02/2)
   * - mm/m: Padded/unpadded minutes (05/5)
   * - ss/s: Padded/unpadded seconds (09/9)
   * - a/A: AM/PM indicator
   * - z: Timezone offset (UTC+05:30)
   *
   * @param date - Date object to format
   * @param pattern - Format pattern string
   * @returns Formatted date string or empty string if date is invalid
   *
   * @example DevExtreme Predefined Formats
   * ```typescript
   * const date = new Date('2024-03-15T14:30:45');
   * DateUtils.format(date, 'shortDate'); // '3/15/2024' (DevExtreme)
   * DateUtils.format(date, 'longDate'); // 'Friday, March 15, 2024' (DevExtreme)
   * DateUtils.format(date, 'shortTime'); // '2:30 PM' (DevExtreme)
   * DateUtils.format(date, 'longTime'); // '2:30:45 PM' (DevExtreme)
   * ```
   *
   * @example Custom Pattern Formatting
   * ```typescript
   * const date = new Date('2024-03-15T14:30:45');
   * DateUtils.format(date, 'MM/dd/yyyy'); // '03/15/2024'
   * DateUtils.format(date, 'MMMM dd, yyyy'); // 'March 15, 2024'
   * DateUtils.format(date, 'yyyy-MM-dd HH:mm:ss'); // '2024-03-15 14:30:45'
   * DateUtils.format(date, 'MMM d, yyyy h:mm a'); // 'Mar 15, 2024 2:30 PM'
   * ```
   *
   * @example SharePoint Date Field Formatting
   * ```typescript
   * // Format SharePoint date fields for display
   * const listItem = await sp.web.lists.getByTitle('Tasks').items.getById(1)();
   * const dueDate = new Date(listItem.DueDate);
   * const formattedDate = DateUtils.format(dueDate, 'MMM d, yyyy');
   * ```
   */
  format: (date: Date, pattern: string): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';

    // Use DevExtreme formatting if available
    if (dxLocalization && dxLocalization.formatDate) {
      try {
        return dxLocalization.formatDate(date, pattern);
      } catch (e) {
        // DevExtreme format failed, try predefined formats
        try {
          switch (pattern) {
            case 'shortDate':
              return dxLocalization.formatDate(date, 'shortDate');
            case 'longDate':
              return dxLocalization.formatDate(date, 'longDate');
            case 'shortTime':
              return dxLocalization.formatDate(date, 'shortTime');
            case 'longTime':
              return dxLocalization.formatDate(date, 'longTime');
            case 'shortDateTime':
              return (
                dxLocalization.formatDate(date, 'shortDate') +
                ' ' +
                dxLocalization.formatDate(date, 'shortTime')
              );
            case 'longDateTime':
              return (
                dxLocalization.formatDate(date, 'longDate') +
                ' ' +
                dxLocalization.formatDate(date, 'longTime')
              );
            default:
              // Fall through to custom formatting
              break;
          }
        } catch (e2) {
          // Fall back to custom formatting
        }
      }
    }

    // Custom lightweight formatting fallback
    const tokens: { [key: string]: string } = {
      yyyy: date.getFullYear().toString(),
      yy: date.getFullYear().toString().slice(-2),
      MM: (date.getMonth() + 1).toString().padStart(2, '0'),
      MMM: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
        date.getMonth()
      ],
      MMMM: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ][date.getMonth()],
      M: (date.getMonth() + 1).toString(),
      dd: date.getDate().toString().padStart(2, '0'),
      d: date.getDate().toString(),
      HH: date.getHours().toString().padStart(2, '0'),
      H: date.getHours().toString(),
      hh: (date.getHours() % 12 || 12).toString().padStart(2, '0'),
      h: (date.getHours() % 12 || 12).toString(),
      mm: date.getMinutes().toString().padStart(2, '0'),
      m: date.getMinutes().toString(),
      ss: date.getSeconds().toString().padStart(2, '0'),
      s: date.getSeconds().toString(),
      a: date.getHours() >= 12 ? 'PM' : 'AM',
      A: date.getHours() >= 12 ? 'PM' : 'AM',
      z:
        'UTC' +
        (date.getTimezoneOffset() <= 0 ? '+' : '-') +
        Math.abs(Math.floor(date.getTimezoneOffset() / 60))
          .toString()
          .padStart(2, '0') +
        Math.abs(date.getTimezoneOffset() % 60)
          .toString()
          .padStart(2, '0'),
    };

    return pattern.replace(
      /yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|hh|h|mm|m|ss|s|a|A|z/g,
      match => tokens[match] || match
    );
  },

  /**
   * Add specified number of days to a date
   *
   * Creates a new Date object with the specified number of days added.
   * Does not modify the original date object.
   *
   * @param date - Source date to add days to
   * @param days - Number of days to add (can be negative to subtract days)
   * @returns New Date object with days added
   *
   * @example Basic Usage
   * ```typescript
   * const today = new Date('2024-03-15');
   * const nextWeek = DateUtils.addDays(today, 7); // 2024-03-22
   * const lastWeek = DateUtils.addDays(today, -7); // 2024-03-08
   * ```
   *
   * @example SharePoint Due Date Calculation
   * ```typescript
   * // Set task due date to 30 days from creation
   * const createdDate = new Date();
   * const dueDate = DateUtils.addDays(createdDate, 30);
   *
   * await sp.web.lists.getByTitle('Tasks').items.add({
   *   Title: 'My Task',
   *   DueDate: dueDate.toISOString()
   * });
   * ```
   */
  addDays: (date: Date, days: number): Date => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return new Date();
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * Add business days to a date (excludes weekends)
   *
   * Adds the specified number of business days to a date, automatically
   * skipping Saturdays and Sundays. Creates a new Date object without
   * modifying the original.
   *
   * @param date - Source date to add business days to
   * @param days - Number of business days to add (can be negative)
   * @returns New Date object with business days added
   *
   * @example Basic Business Day Calculation
   * ```typescript
   * // If today is Friday, March 15, 2024
   * const friday = new Date('2024-03-15'); // Friday
   * const nextBusinessDay = DateUtils.addBusinessDays(friday, 1); // Monday, March 18
   * const fiveBusinessDays = DateUtils.addBusinessDays(friday, 5); // Friday, March 22
   * ```
   *
   * @example SharePoint Workflow Due Dates
   * ```typescript
   * // Set approval due date to 5 business days from request
   * const requestDate = new Date();
   * const approvalDue = DateUtils.addBusinessDays(requestDate, 5);
   *
   * await sp.web.lists.getByTitle('Approvals').items.add({
   *   Title: 'Document Approval',
   *   RequestDate: requestDate.toISOString(),
   *   DueDate: approvalDue.toISOString()
   * });
   * ```
   *
   * @example Backward Business Day Calculation
   * ```typescript
   * // Find when work should have started to finish today
   * const completionDate = new Date();
   * const startDate = DateUtils.addBusinessDays(completionDate, -10);
   * ```
   */
  addBusinessDays: (date: Date, days: number): Date => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return new Date();

    let result = new Date(date);
    let remainingDays = Math.abs(days);
    const direction = days >= 0 ? 1 : -1;

    while (remainingDays > 0) {
      result.setDate(result.getDate() + direction);

      // Skip weekends (Saturday = 6, Sunday = 0)
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        remainingDays--;
      }
    }

    return result;
  },

  /**
   * Check if a date represents today
   *
   * Compares the date portion only (ignoring time) to determine
   * if the given date is the same as today's date.
   *
   * @param date - Date to check
   * @returns True if the date is today, false otherwise
   *
   * @example Basic Today Check
   * ```typescript
   * const now = new Date(); // Current date and time
   * const today = DateUtils.isToday(now); // true
   *
   * const yesterday = new Date();
   * yesterday.setDate(yesterday.getDate() - 1);
   * const isYesterdayToday = DateUtils.isToday(yesterday); // false
   * ```
   *
   * @example SharePoint List Item Filtering
   * ```typescript
   * // Filter tasks created today
   * const items = await sp.web.lists.getByTitle('Tasks').items
   *   .select('Title', 'Created')();
   *
   * const todaysTasks = items.filter(item =>
   *   DateUtils.isToday(new Date(item.Created))
   * );
   * ```
   *
   * @example Conditional UI Display
   * ```typescript
   * // Show special indicator for today's items
   * const isToday = DateUtils.isToday(new Date(listItem.Modified));
   * const className = isToday ? 'modified-today' : 'modified-other';
   * ```
   */
  isToday: (date: Date): boolean => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  },
};

// ========================================
// PROTOTYPE EXTENSIONS
// ========================================

/**
 * Apply date extensions to Date.prototype to enable method chaining
 *
 * This function extends the native Date prototype with additional methods
 * for common date manipulation and formatting tasks. It includes safety
 * checks to prevent multiple applications of the same extensions.
 *
 * @remarks
 * Extensions are automatically applied when importing from 'spfx-toolkit/lib/utilities/dateUtils'
 * Manual calling is only needed if extensions were not auto-applied or need to be reapplied.
 *
 * @example Automatic Extension Application
 * ```typescript
 * // Extensions are auto-applied on import
 * import 'spfx-toolkit/lib/utilities/dateUtils';
 *
 * // Now you can use extension methods
 * const formatted = new Date().format('MM/dd/yyyy'); // '03/15/2024'
 * const tomorrow = new Date().addDays(1);
 * const nextBusinessDay = new Date().addBusinessDays(1);
 * const isToday = new Date().isToday(); // true
 * ```
 *
 * @example Manual Extension Application (rarely needed)
 * ```typescript
 * import { applyDateExtensions } from 'spfx-toolkit/lib/utilities/dateUtils';
 * applyDateExtensions();
 *
 * // Extensions are now available
 * const date = new Date().addDays(7);
 * ```
 *
 * @example SharePoint Date Field Processing
 * ```typescript
 * // Process SharePoint date fields with extensions
 * import 'spfx-toolkit/lib/utilities/dateUtils';
 *
 * const items = await sp.web.lists.getByTitle('Events').items();
 * const processedItems = items.map(item => ({
 *   ...item,
 *   EventDateFormatted: new Date(item.EventDate).format('MMMM dd, yyyy'),
 *   IsEventToday: new Date(item.EventDate).isToday(),
 *   DaysUntilEvent: Math.ceil((new Date(item.EventDate) - new Date()) / (1000 * 60 * 60 * 24))
 * }));
 * ```
 */
export const applyDateExtensions = (): void => {
  // Check if already applied
  if ((Date.prototype as any)._spfxDateExtensionsApplied) return;

  /**
   * Format date using pattern
   * @see DateUtils.format for detailed documentation
   */
  Date.prototype.format = function (pattern: string): string {
    return DateUtils.format(this, pattern);
  };

  /**
   * Add days to date
   * @see DateUtils.addDays for detailed documentation
   */
  Date.prototype.addDays = function (days: number): Date {
    return DateUtils.addDays(this, days);
  };

  /**
   * Add business days to date (skips weekends)
   * @see DateUtils.addBusinessDays for detailed documentation
   */
  Date.prototype.addBusinessDays = function (days: number): Date {
    return DateUtils.addBusinessDays(this, days);
  };

  /**
   * Check if date is today
   * @see DateUtils.isToday for detailed documentation
   */
  Date.prototype.isToday = function (): boolean {
    return DateUtils.isToday(this);
  };

  // Mark as applied
  (Date.prototype as any)._spfxDateExtensionsApplied = true;
};

// ========================================
// EXPORTS
// ========================================

export default {
  DateUtils,
  applyDateExtensions,
};

// Type exports
export type DateExtensionMethod = keyof typeof DateUtils;
