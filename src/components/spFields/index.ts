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

// SPLookupField and SPTaxonomyField are NOT exported from this barrel
// to prevent their PnP control CSS from being bundled when not used.
// Import them directly from their subfolders:
//   import { SPLookupField } from 'spfx-toolkit/lib/components/spFields/SPLookupField';
//   import { SPTaxonomyField } from 'spfx-toolkit/lib/components/spFields/SPTaxonomyField';

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
