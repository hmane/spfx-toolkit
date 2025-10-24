/**
 * Common types and interfaces for SPField components
 *
 * @packageDocumentation
 */

import { Control, RegisterOptions, FieldValues } from 'react-hook-form';

/**
 * Base props shared by all SPField components
 *
 * @template T - The value type for the field
 */
export interface ISPFieldBaseProps<T> {
  // Field metadata
  /**
   * Display label for the field
   */
  label?: string;

  /**
   * Help text displayed below the field
   */
  description?: string;

  /**
   * Mark field as required
   */
  required?: boolean;

  /**
   * Disable field input
   */
  disabled?: boolean;

  /**
   * Make field read-only (displays value but not editable)
   */
  readOnly?: boolean;

  // React Hook Form integration
  /**
   * Field name for form registration (required when using with react-hook-form)
   */
  name?: string;

  /**
   * React Hook Form control object
   */
  control?: Control<any>;

  /**
   * Validation rules for react-hook-form
   */
  rules?: RegisterOptions;

  // Standalone mode (without form)
  /**
   * Controlled value (for standalone usage without forms)
   */
  value?: T;

  /**
   * Initial value (for uncontrolled standalone usage)
   */
  defaultValue?: T;

  /**
   * Change handler for standalone mode
   */
  onChange?: (value: T) => void;

  // Styling
  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Field width (number in pixels or string like '100%')
   */
  width?: number | string;

  // Events
  /**
   * Blur event handler
   */
  onBlur?: () => void;

  /**
   * Focus event handler
   */
  onFocus?: () => void;

  /**
   * Error message to display (overrides form validation)
   */
  errorMessage?: string;

  /**
   * Placeholder text
   */
  placeholder?: string;
}

/**
 * SharePoint-specific props for field components that integrate with SharePoint
 */
export interface ISPFieldSharePointProps {
  /**
   * SharePoint list GUID or title
   */
  listId?: string;

  /**
   * Internal SharePoint field name
   */
  fieldName?: string;

  /**
   * Web URL for cross-site field access
   */
  webUrl?: string;

  /**
   * Show SharePoint field type icon
   */
  showFieldIcon?: boolean;

  /**
   * Render in display-only mode (like SharePoint's display form)
   */
  renderDisplayMode?: boolean;
}

/**
 * Display types for choice fields
 */
export enum SPChoiceDisplayType {
  Dropdown = 'dropdown',
  RadioButtons = 'radio',
  Checkboxes = 'checkboxes',
}

/**
 * SharePoint field types
 */
export enum SPFieldType {
  Text = 'Text',
  Note = 'Note',
  Choice = 'Choice',
  MultiChoice = 'MultiChoice',
  Number = 'Number',
  Currency = 'Currency',
  DateTime = 'DateTime',
  Boolean = 'Boolean',
  User = 'User',
  UserMulti = 'UserMulti',
  Lookup = 'Lookup',
  LookupMulti = 'LookupMulti',
  URL = 'URL',
  TaxonomyFieldType = 'TaxonomyFieldType',
  TaxonomyFieldTypeMulti = 'TaxonomyFieldTypeMulti',
  Calculated = 'Calculated',
  Computed = 'Computed',
  Attachments = 'Attachments',
  Guid = 'Guid',
  Integer = 'Integer',
  Counter = 'Counter',
}

/**
 * Date-time display format options
 */
export enum SPDateTimeFormat {
  DateOnly = 'DateOnly',
  DateTime = 'DateTime',
}

/**
 * Number format options
 */
export interface ISPNumberFormat {
  /**
   * Number of decimal places (-1 for automatic)
   */
  decimals?: number;

  /**
   * Show as percentage
   */
  percentage?: boolean;

  /**
   * Currency locale (e.g., 'en-US', 'de-DE')
   */
  currencyLocale?: string;

  /**
   * Currency code (e.g., 'USD', 'EUR')
   */
  currencyCode?: string;

  /**
   * Thousands separator
   */
  useGrouping?: boolean;
}

/**
 * URL field value structure
 */
export interface ISPUrlFieldValue {
  /**
   * The URL
   */
  Url: string;

  /**
   * Display text/description
   */
  Description?: string;
}

/**
 * User/Group field value
 */
export interface ISPUserFieldValue {
  /**
   * User ID
   */
  Id: number;

  /**
   * User email
   */
  EMail?: string;

  /**
   * User title/display name
   */
  Title: string;

  /**
   * User login name
   */
  Name?: string;

  /**
   * User picture URL
   */
  Picture?: string;

  /**
   * User SIP address
   */
  Sip?: string;
}

/**
 * Lookup field value
 */
export interface ISPLookupFieldValue {
  /**
   * Lookup item ID
   */
  Id: number;

  /**
   * Lookup item title/display value
   */
  Title: string;
}

/**
 * Taxonomy/Managed Metadata field value
 */
export interface ISPTaxonomyFieldValue {
  /**
   * Term GUID
   */
  TermGuid: string;

  /**
   * Term label
   */
  Label: string;

  /**
   * Term path (e.g., "ParentTerm|ChildTerm")
   */
  Path?: string;

  /**
   * WssId (internal ID)
   */
  WssId?: number;
}

/**
 * Validation result
 */
export interface ISPFieldValidationResult {
  /**
   * Whether validation passed
   */
  valid: boolean;

  /**
   * Error message if validation failed
   */
  errorMessage?: string;
}

/**
 * Field visibility condition
 */
export interface ISPFieldVisibilityCondition {
  /**
   * Field name to watch
   */
  dependsOn: string;

  /**
   * Condition function
   */
  condition: (value: any) => boolean;
}
