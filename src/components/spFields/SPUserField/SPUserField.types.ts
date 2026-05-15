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
   * Override to show error state (red border) even when no internal validation error
   * Use this when validation happens outside react-hook-form (e.g., in Zod superRefine)
   * @optional
   */
  hasError?: boolean;

  /**
   * SharePoint column/field name to auto-load configuration from
   * When provided, the component will read column metadata to get allowMultiple and allowGroups settings
   * @optional
   */
  columnName?: string;

  /**
   * List ID or name where the column exists (required when using columnName)
   * @optional
   */
  listId?: string;

  /**
   * Allow multiple user selection
   * Optional if columnName is provided - will auto-load from SharePoint column metadata
   * @default false
   */
  allowMultiple?: boolean;

  /**
   * Allow group selection
   * Optional if columnName is provided - will auto-load from SharePoint column metadata
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
   * @deprecated Compatibility-only. Presence is not rendered by SPUserField's
   * current PeoplePicker or persona display modes.
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
   * @deprecated Compatibility-only. Job title is not available from all value
   * shapes and is not rendered by the current display modes.
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
   * @deprecated Compatibility-only. Custom PeoplePicker filtering is not wired
   * in the current implementation.
   */
  customFilter?: string;

  /**
   * Web URL for cross-site user lookup
   */
  webUrl?: string;
}
