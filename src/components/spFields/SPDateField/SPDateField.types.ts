/**
 * Type definitions for SPDateField component
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps, SPDateTimeFormat } from '../types';

/**
 * Props for SPDateField component
 *
 * **Important: Date Serialization for SharePoint**
 *
 * This component returns JavaScript `Date` objects which always include a time component.
 * For date-only SharePoint fields (`SPDateTimeFormat.DateOnly`), you may need to handle
 * time zone considerations when saving to SharePoint:
 *
 * @example
 * ```typescript
 * // For date-only fields, when saving to SharePoint:
 * // Option 1: Strip time component (set to midnight UTC)
 * const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
 *
 * // Option 2: Use ISO date string (date portion only)
 * const isoDate = date.toISOString().split('T')[0]; // "2024-01-15"
 *
 * // Option 3: Let PnPjs handle serialization (recommended)
 * // PnPjs will properly serialize Date objects for SharePoint
 * await sp.web.lists.getByTitle('MyList').items.add({
 *   DueDate: date  // PnPjs handles the serialization
 * });
 * ```
 *
 * For DateTime fields (`SPDateTimeFormat.DateTime`), the full Date object including
 * time is sent to SharePoint and time zone handling follows SharePoint's regional settings.
 */
export interface ISPDateFieldProps extends ISPFieldBaseProps<Date> {
  /**
   * Date-time format (DateOnly or DateTime)
   * @default SPDateTimeFormat.DateOnly
   */
  dateTimeFormat?: SPDateTimeFormat;

  /**
   * Show time picker
   * @default false (auto-determined from dateTimeFormat)
   */
  showTimePicker?: boolean;

  /**
   * Minimum date allowed
   */
  minDate?: Date;

  /**
   * Maximum date allowed
   */
  maxDate?: Date;

  /**
   * Date display format string
   * @default 'MM/dd/yyyy' for date only, 'MM/dd/yyyy HH:mm' for datetime
   */
  displayFormat?: string;

  /**
   * Time display format (12-hour or 24-hour)
   * @default '12'
   */
  timeFormat?: '12' | '24';

  /**
   * First day of week (0 = Sunday, 1 = Monday, etc.)
   * @default 0
   */
  firstDayOfWeek?: number;

  /**
   * Show week numbers in calendar
   * @default false
   */
  showWeekNumbers?: boolean;

  /**
   * Show clear button
   * @default true
   */
  showClearButton?: boolean;

  /**
   * Show today button in calendar
   * @default true
   */
  showTodayButton?: boolean;

  /**
   * Interval between time values (in minutes)
   * @default 30
   */
  timeInterval?: number;

  /**
   * Custom date validation function
   */
  dateValidator?: (date: Date) => boolean;

  /**
   * Disabled dates (dates that cannot be selected)
   */
  disabledDates?: Date[] | ((date: Date) => boolean);

  /**
   * Show calendar icon
   * @default true
   */
  showCalendarIcon?: boolean;

  /**
   * Position of the calendar dropdown button
   * 'before' places it on the left side, 'after' places it on the right
   * @default 'after'
   */
  calendarButtonPosition?: 'before' | 'after';

  /**
   * Input styling mode
   * @default 'outlined'
   */
  stylingMode?: 'outlined' | 'underlined' | 'filled';
}
