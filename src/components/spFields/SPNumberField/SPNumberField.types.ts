/**
 * Type definitions for SPNumberField component
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps, ISPNumberFormat } from '../types';

/**
 * Props for SPNumberField component
 */
export interface ISPNumberFieldProps extends ISPFieldBaseProps<number> {
  /**
   * Minimum value
   */
  min?: number;

  /**
   * Maximum value
   */
  max?: number;

  /**
   * Step increment
   * @default 1
   */
  step?: number;

  /**
   * Number formatting options
   */
  format?: ISPNumberFormat;

  /**
   * Show spinner buttons
   * @default true
   */
  showSpinButtons?: boolean;

  /**
   * Show clear button
   * @default false
   */
  showClearButton?: boolean;

  /**
   * Input styling mode
   * @default 'outlined'
   */
  stylingMode?: 'outlined' | 'underlined' | 'filled';

  /**
   * Value change mode
   * @default 'onChange' - fires on every keystroke
   * 'onBlur' - fires only when field loses focus
   */
  valueChangeMode?: 'onChange' | 'onBlur';
}
