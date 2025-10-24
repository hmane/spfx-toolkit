/**
 * SPField Suite - SharePoint Field Components
 *
 * A comprehensive collection of SharePoint field components for SPFx projects.
 * All components support react-hook-form integration and DevExtreme UI.
 *
 * @packageDocumentation
 */

// Export implemented field components
export { SPTextField } from './SPTextField';
export type { ISPTextFieldProps } from './SPTextField';
export { SPTextFieldMode } from './SPTextField';

export { SPChoiceField } from './SPChoiceField';
export type {
  ISPChoiceFieldProps,
  StaticChoicesDataSource,
} from './SPChoiceField';

export { SPUserField } from './SPUserField';
export type { ISPUserFieldProps } from './SPUserField';
export { SPUserFieldDisplayMode } from './SPUserField';

export { SPDateField } from './SPDateField';
export type { ISPDateFieldProps } from './SPDateField';

export { SPNumberField } from './SPNumberField';
export type { ISPNumberFieldProps } from './SPNumberField';

export { SPBooleanField } from './SPBooleanField';
export type { ISPBooleanFieldProps } from './SPBooleanField';
export { SPBooleanDisplayType } from './SPBooleanField';

export { SPUrlField } from './SPUrlField';
export type { ISPUrlFieldProps } from './SPUrlField';

export { SPLookupField, SPLookupDisplayMode } from './SPLookupField';
export type { ISPLookupFieldProps, ILookupDataSource } from './SPLookupField';

export { SPTaxonomyField } from './SPTaxonomyField';
export type { ISPTaxonomyFieldProps, ITaxonomyDataSource } from './SPTaxonomyField';

export { SPField } from './SPField';
export type {
  ISPFieldProps,
  ISmartFieldConfig,
  IManualFieldConfig,
  IFieldMetadata
} from './SPField';

// Note: Shared types like IChoiceFieldMetadata, IOtherOptionConfig, etc.
// are also exported from SPChoicePicker to avoid duplication

// Common types used across field components
export * from './types';
