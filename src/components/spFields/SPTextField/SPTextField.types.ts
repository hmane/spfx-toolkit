/**
 * Type definitions for SPTextField component
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps, ISPFieldSharePointProps } from '../types';

/**
 * Text field display modes
 */
export enum SPTextFieldMode {
  /**
   * Single line text input
   */
  SingleLine = 'singleline',

  /**
   * Multi-line textarea
   */
  MultiLine = 'multiline',

  /**
   * Rich text editor (HTML content)
   */
  RichText = 'richtext',
}

/**
 * Props for SPTextField component
 */
export interface ISPTextFieldProps extends ISPFieldBaseProps<string>, ISPFieldSharePointProps {
  /**
   * Display mode for the text field
   * @default SPTextFieldMode.SingleLine
   */
  mode?: SPTextFieldMode;

  /**
   * Maximum character length
   */
  maxLength?: number;

  /**
   * Minimum character length
   */
  minLength?: number;

  /**
   * Number of rows for multiline mode
   * @default 4
   */
  rows?: number;

  /**
   * Whether to show character count
   * @default false
   */
  showCharacterCount?: boolean;

  /**
   * Custom validation pattern (regex)
   */
  pattern?: RegExp;

  /**
   * Custom validation message for pattern mismatch
   */
  patternMessage?: string;

  /**
   * Auto-focus the field on mount
   * @default false
   */
  autoFocus?: boolean;

  /**
   * Input type for single-line mode (text, email, tel, url, etc.)
   * @default 'text'
   */
  inputType?: 'text' | 'email' | 'tel' | 'url' | 'search' | 'password';

  /**
   * Enable spell check
   * @default true
   */
  spellCheck?: boolean;

  /**
   * Auto-complete attribute
   */
  autoComplete?: string;

  /**
   * Prefix icon name (DevExtreme icon)
   */
  prefixIcon?: string;

  /**
   * Suffix icon name (DevExtreme icon)
   */
  suffixIcon?: string;

  /**
   * Show clear button
   * @default false
   */
  showClearButton?: boolean;

  /**
   * Debounce delay for onChange in milliseconds
   * @default 300
   */
  debounceDelay?: number;

  /**
   * Custom CSS class for the input element
   */
  inputClassName?: string;

  /**
   * Mask for input (DevExtreme mask format)
   */
  mask?: string;

  /**
   * Mask placeholder character
   * @default '_'
   */
  maskChar?: string;

  /**
   * Input styling mode
   * @default 'outlined'
   */
  stylingMode?: 'outlined' | 'underlined' | 'filled';
}
