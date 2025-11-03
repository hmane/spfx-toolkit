/**
 * Type definitions for SPUserField component
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps, ISPUserFieldValue } from '../types';
import { IPrincipal } from '../../../types';

/**
 * Display modes for user field
 */
export enum SPUserFieldDisplayMode {
  /**
   * PeoplePicker with search
   */
  PeoplePicker = 'peoplepicker',

  /**
   * Compact display with UserPersona
   */
  Compact = 'compact',

  /**
   * List display for multiple users
   */
  List = 'list',
}

/**
 * Value type for SPUserField - supports both IPrincipal (recommended) and legacy ISPUserFieldValue
 */
export type SPUserFieldValue = IPrincipal | ISPUserFieldValue;

/**
 * Props for SPUserField component
 */
export interface ISPUserFieldProps extends ISPFieldBaseProps<SPUserFieldValue | SPUserFieldValue[]> {
  /**
   * Allow multiple user selection
   * @default false
   */
  allowMultiple?: boolean;

  /**
   * Allow group selection
   * @default false
   */
  allowGroups?: boolean;

  /**
   * Limit selection to specific SharePoint group(s)
   */
  limitToGroup?: string | string[];

  /**
   * Display mode for the field
   * @default SPUserFieldDisplayMode.PeoplePicker
   */
  displayMode?: SPUserFieldDisplayMode;

  /**
   * Maximum number of selections (for multi-select)
   */
  maxSelections?: number;

  /**
   * Minimum number of selections (for multi-select)
   */
  minSelections?: number;

  /**
   * Show presence indicator (online/offline/busy)
   * @default false
   */
  showPresence?: boolean;

  /**
   * Show user photo
   * @default true
   */
  showPhoto?: boolean;

  /**
   * Show user email
   * @default false
   */
  showEmail?: boolean;

  /**
   * Show user job title
   * @default false
   */
  showJobTitle?: boolean;

  /**
   * Resolve delay in milliseconds (debounce search)
   * @default 300
   */
  resolveDelay?: number;

  /**
   * Suggestion limit for search results
   * @default 5
   */
  suggestionLimit?: number;

  /**
   * Custom filter for user search
   */
  customFilter?: string;

  /**
   * Web URL for cross-site user lookup
   */
  webUrl?: string;
}
