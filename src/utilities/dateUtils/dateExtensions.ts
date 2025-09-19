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
    format(pattern: string): string;
    addDays(days: number): Date;
    addBusinessDays(days: number): Date;
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
 */
export const DateUtils = {
  /**
   * Format date using pattern (leverages DevExtreme when available)
   * Supports all DevExtreme format patterns:
   * - "MM dd, yyyy hh:mm a" -> "03 15, 2024 02:30 PM"
   * - "shortDate", "longDate", "shortTime", "longTime"
   * - Custom patterns with y, M, d, H, h, m, s, a, z tokens
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
   * Add days to date
   */
  addDays: (date: Date, days: number): Date => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return new Date();
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * Add business days to date (skips weekends)
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
   * Check if date is today
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
 * Apply date extensions to Date.prototype
 */
export const applyDateExtensions = (): void => {
  // Check if already applied
  if ((Date.prototype as any)._spfxDateExtensionsApplied) return;

  Date.prototype.format = function (pattern: string): string {
    return DateUtils.format(this, pattern);
  };

  Date.prototype.addDays = function (days: number): Date {
    return DateUtils.addDays(this, days);
  };

  Date.prototype.addBusinessDays = function (days: number): Date {
    return DateUtils.addBusinessDays(this, days);
  };

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
