/**
 * Type definitions for SPDateField component
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps, SPDateTimeFormat } from '../types';

/**
 * Props for SPDateField component
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
   * Input styling mode
   * @default 'outlined'
   */
  stylingMode?: 'outlined' | 'underlined' | 'filled';
}
