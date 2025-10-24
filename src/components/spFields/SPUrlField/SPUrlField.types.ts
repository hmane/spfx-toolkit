/**
 * Type definitions for SPUrlField component
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps, ISPUrlFieldValue } from '../types';

/**
 * Props for SPUrlField component
 */
export interface ISPUrlFieldProps extends ISPFieldBaseProps<ISPUrlFieldValue> {
  /**
   * Show description field
   * @default true
   */
  showDescription?: boolean;

  /**
   * Description field label
   * @default 'Description'
   */
  descriptionLabel?: string;

  /**
   * URL field label
   * @default 'URL'
   */
  urlLabel?: string;

  /**
   * Validate URL format
   * @default true
   */
  validateUrl?: boolean;

  /**
   * Allow relative URLs
   * @default false
   */
  allowRelativeUrl?: boolean;

  /**
   * Show link icon/preview
   * @default true
   */
  showLinkIcon?: boolean;

  /**
   * Open in new window by default
   * @default true
   */
  openInNewWindow?: boolean;

  /**
   * URL placeholder text
   */
  urlPlaceholder?: string;

  /**
   * Description placeholder text
   */
  descriptionPlaceholder?: string;

  /**
   * Input styling mode
   * @default 'outlined'
   */
  stylingMode?: 'outlined' | 'underlined' | 'filled';
}
