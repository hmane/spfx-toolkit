/**
 * Type definitions for SPBooleanField component
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps } from '../types';

/**
 * Display types for boolean field
 */
export enum SPBooleanDisplayType {
  /**
   * Standard checkbox
   */
  Checkbox = 'checkbox',

  /**
   * Toggle switch
   */
  Toggle = 'toggle',
}

/**
 * Props for SPBooleanField component
 */
export interface ISPBooleanFieldProps extends Omit<ISPFieldBaseProps<boolean>, 'placeholder'> {
  /**
   * Display type
   * @default SPBooleanDisplayType.Checkbox
   */
  displayType?: SPBooleanDisplayType;

  /**
   * Text to display when checked
   * @default 'Yes'
   */
  checkedText?: string;

  /**
   * Text to display when unchecked
   * @default 'No'
   */
  uncheckedText?: string;

  /**
   * Show text labels
   * @default false
   */
  showText?: boolean;
}
