/**
 * Type definitions for SPField (smart) component
 *
 * @packageDocumentation
 */

import { Control, RegisterOptions } from 'react-hook-form';
import { SPFieldType } from '../types';

/**
 * Smart field configuration - loads field metadata from SharePoint
 */
export interface ISmartFieldConfig {
  /**
   * List name or GUID
   */
  listNameOrId: string;

  /**
   * Field internal name
   */
  fieldInternalName: string;

  /**
   * Web URL for cross-site fields
   */
  webUrl?: string;

  /**
   * Use cached field metadata
   * @default true
   */
  useCache?: boolean;
}

/**
 * Manual field configuration - specify field type explicitly
 */
export interface IManualFieldConfig {
  /**
   * Field type
   */
  fieldType: SPFieldType;

  /**
   * Field display name
   */
  displayName?: string;

  /**
   * Field description/help text
   */
  description?: string;

  /**
   * Whether field is required
   */
  required?: boolean;

  /**
   * Additional field-specific configuration
   */
  fieldConfig?: any;
}

/**
 * Props for SPField component
 */
export interface ISPFieldProps {
  /**
   * Field configuration - either smart (loads from SharePoint) or manual
   */
  config: ISmartFieldConfig | IManualFieldConfig;

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

  /**
   * Controlled value (for standalone usage)
   */
  value?: any;

  /**
   * Initial value
   */
  defaultValue?: any;

  /**
   * Change handler for standalone mode
   */
  onChange?: (value: any) => void;

  /**
   * Blur event handler
   */
  onBlur?: () => void;

  /**
   * Focus event handler
   */
  onFocus?: () => void;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Field width
   */
  width?: number | string;

  /**
   * Disable field input
   */
  disabled?: boolean;

  /**
   * Make field read-only
   */
  readOnly?: boolean;

  /**
   * Override field label
   */
  label?: string;

  /**
   * Override placeholder
   */
  placeholder?: string;

  /**
   * Custom error message
   */
  errorMessage?: string;
}

/**
 * Field metadata loaded from SharePoint
 */
export interface IFieldMetadata {
  /**
   * Field internal name
   */
  internalName: string;

  /**
   * Field display name/title
   */
  displayName: string;

  /**
   * Field type
   */
  fieldType: SPFieldType;

  /**
   * Field description
   */
  description?: string;

  /**
   * Whether field is required
   */
  required: boolean;

  /**
   * Default value
   */
  defaultValue?: any;

  /**
   * Additional field-specific metadata
   */
  metadata: any;
}

/**
 * Check if config is smart (loads from SharePoint)
 */
export function isSmartConfig(config: ISmartFieldConfig | IManualFieldConfig): config is ISmartFieldConfig {
  return 'listNameOrId' in config && 'fieldInternalName' in config;
}
