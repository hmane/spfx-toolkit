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

  /**
   * DevExtreme tooltip text shown on hover (applied to the URL input).
   */
  hint?: string;

  /**
   * DOM tab order for the URL input.
   */
  tabIndex?: number;

  /**
   * Fires when Enter is pressed inside the URL input. Common pattern for
   * submit-on-Enter. The event payload is DevExtreme's raw event object.
   */
  onEnterKey?: (e: any) => void;

  /**
   * Fires on any key down in the URL input. The event payload is DevExtreme's raw event object.
   */
  onKeyDown?: (e: any) => void;
}
