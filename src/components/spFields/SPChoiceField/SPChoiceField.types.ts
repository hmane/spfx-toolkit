/**
 * Type definitions for SPChoiceField component
 * Enhanced from SPChoicePicker with react-hook-form integration
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps, SPChoiceDisplayType } from '../types';

// Re-export for convenience
export { SPChoiceDisplayType };

/**
 * Data source from a SharePoint list field
 */
export interface ListFieldDataSource {
  type: 'list';
  /**
   * List name or GUID
   */
  listNameOrId: string;
  /**
   * Internal name of the choice field
   */
  fieldInternalName: string;
}

/**
 * Data source from a SharePoint site column
 */
export interface SiteColumnDataSource {
  type: 'siteColumn';
  /**
   * Site column name (internal name)
   */
  siteColumnName: string;
}

/**
 * Data source from a static choices array
 */
export interface StaticChoicesDataSource {
  type: 'static';
  /**
   * Array of choice strings
   */
  choices: string[];
  /**
   * Whether to allow multiple selections
   * @default false
   */
  allowMultiple?: boolean;
}

/**
 * Union type for data source configuration
 */
export type SPChoiceFieldDataSource =
  | ListFieldDataSource
  | SiteColumnDataSource
  | StaticChoicesDataSource;

/**
 * Configuration for "Other" option behavior
 */
export interface IOtherOptionConfig {
  /**
   * Text to use for the "Other" option
   * This will be matched against field choices to detect "Other" option
   * @default "Other"
   */
  otherOptionText?: string;

  /**
   * Force enable "Other" option even if not in field choices/fill-in
   * When true, will inject otherOptionText into the choices array
   * @default false (auto-detect from SharePoint field)
   */
  enableOtherOption?: boolean;

  /**
   * Placeholder text for the custom value textbox
   * @default "Enter custom value..."
   */
  otherTextboxPlaceholder?: string;

  /**
   * Validation rules for custom "Other" value
   */
  otherValidation?: {
    /**
     * Whether custom value is required when "Other" is selected
     * @default true
     */
    required?: boolean;

    /**
     * Minimum length for custom value
     */
    minLength?: number;

    /**
     * Maximum length for custom value
     */
    maxLength?: number;

    /**
     * Regex pattern for custom value validation
     */
    pattern?: RegExp;

    /**
     * Custom error message for validation failures
     */
    errorMessage?: string;

    /**
     * Custom validator function
     * @param value - The custom text value
     * @returns Error message if invalid, undefined if valid
     */
    customValidator?: (value: string) => string | undefined;
  };
}

/**
 * Props for SPChoiceField component
 */
export interface ISPChoiceFieldProps
  extends Omit<ISPFieldBaseProps<string | string[]>, 'showClearButton'> {
  /**
   * Show clear button in the dropdown
   * @default true
   */
  showClearButton?: boolean;
  /**
   * Data source - SharePoint field or static choices
   */
  dataSource?: SPChoiceFieldDataSource;

  /**
   * Static choices array (alternative to dataSource)
   * Use this for simple choice fields without SharePoint integration
   */
  choices?: string[];

  /**
   * Display type for the choice field
   * @default SPChoiceDisplayType.Dropdown
   */
  displayType?: SPChoiceDisplayType;

  /**
   * Allow multiple selections
   * @default false (auto-detected from SharePoint field if using dataSource)
   */
  allowMultiple?: boolean;

  /**
   * Configuration for "Other" option behavior
   */
  otherConfig?: IOtherOptionConfig;

  /**
   * Use cached field schema (spCached) or always fresh (spPessimistic)
   * @default false (uses spPessimistic for fresh data)
   */
  useCache?: boolean;

  /**
   * Maximum number of displayed tags (for TagBox in multi-select mode)
   * @default 3
   */
  maxDisplayedTags?: number;

  /**
   * Show multi-tag only (collapse tags when multiple selected)
   * @default false
   */
  showMultiTagOnly?: boolean;

  /**
   * Sort choices alphabetically
   * @default false
   */
  sortChoices?: boolean;

  /**
   * Custom render function for choice items
   */
  renderItem?: (item: string) => React.ReactNode;

  /**
   * Custom render function for selected value display (single-select dropdown only).
   * Note: For multi-select (TagBox), use renderItem for tag customization instead,
   * as DevExtreme's fieldRender receives individual items, not all selected values.
   */
  renderValue?: (value: string) => React.ReactNode;
}

/**
 * SharePoint Choice Field metadata loaded from field schema
 */
export interface IChoiceFieldMetadata {
  /**
   * Field display name
   */
  displayName: string;

  /**
   * Field internal name
   */
  internalName: string;

  /**
   * Available choices
   */
  choices: string[];

  /**
   * Whether field allows multiple selections
   */
  isMultiChoice: boolean;

  /**
   * Whether field allows fill-in choices (SharePoint "Fill-in" option)
   */
  allowFillIn: boolean;

  /**
   * Field description/help text
   */
  description?: string;

  /**
   * Whether field is required in SharePoint
   */
  required: boolean;

  /**
   * Default value from SharePoint field
   */
  defaultValue?: string | string[];
}

/**
 * Internal state for managing "Other" option selection
 */
export interface IOtherOptionState {
  /**
   * Whether "Other" option is currently selected
   */
  isOtherSelected: boolean;

  /**
   * Custom text value entered in the textbox
   */
  customValue: string;

  /**
   * Validation error for custom value
   */
  customValueError?: string;
}

/**
 * Default props for SPChoiceField
 */
export const DefaultSPChoiceFieldProps: Partial<ISPChoiceFieldProps> = {
  placeholder: 'Select...',
  disabled: false,
  required: false,
  showClearButton: true,
  useCache: false,
  displayType: SPChoiceDisplayType.Dropdown,
  allowMultiple: false,
  maxDisplayedTags: 3,
  showMultiTagOnly: false,
  sortChoices: false,
  otherConfig: {
    otherOptionText: 'Other',
    enableOtherOption: false,
    otherTextboxPlaceholder: 'Enter custom value...',
    otherValidation: {
      required: true,
    },
  },
};
