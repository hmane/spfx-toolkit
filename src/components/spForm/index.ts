// Core form components

import './spfxForm.css';

export { default as FormCharCount } from './FormCharCount/FormCharCount';
export { default as FormContainer } from './FormContainer/FormContainer';
export { default as FormDescription } from './FormDescription/FormDescription';
export { default as FormError } from './FormError/FormError';
export { default as FormItem } from './FormItem/FormItem';
export { default as FormLabel } from './FormLabel/FormLabel';
export { default as FormValue } from './FormValue/FormValue';
export { FormErrorSummary } from './FormErrorSummary';

// Form context
export { FormProvider, useFormContext, FormContext } from './context';

// Form utility hooks
export { useScrollToError, useZustandFormSync, useFormFieldError, useCharCount } from './hooks';

// DevExtreme controls
export {
  DevExtremeAutocomplete,
  DevExtremeCheckBox,
  DevExtremeDateBox,
  DevExtremeNumberBox,
  DevExtremeRadioGroup,
  DevExtremeSelectBox,
  DevExtremeSwitch,
  DevExtremeTagBox,
  DevExtremeTextArea,
  DevExtremeTextBox,
} from './DevExtremeControls';

// PnP Controls
export { PnPPeoplePicker } from './PnPControls';

// Custom Components
// Note: GroupUsersPicker is exported via './customComponents' for direct import
// Not exported here to avoid naming conflict with base component

// Re-export all types for convenience
export type { IFormCharCountProps } from './FormCharCount/FormCharCount';
export type { IFormContainerProps } from './FormContainer/FormContainer';
export type { IFormDescriptionProps } from './FormDescription/FormDescription';
export type { IFormErrorProps } from './FormError/FormError';
export type { IFormItemProps } from './FormItem/FormItem';
export type { IFormLabelProps } from './FormLabel/FormLabel';
export type { IFormValueProps } from './FormValue/FormValue';
export type { IFormErrorSummaryProps } from './FormErrorSummary';

// Context types
export type {
  IFormContextValue,
  IFormFieldMetadata,
  IFieldRegistry,
  IFormProviderProps,
  ICharCountData,
  ICharCountRegistry,
} from './context';

// Hook types
export type {
  IUseScrollToErrorOptions,
  IUseScrollToErrorReturn,
  IUseZustandFormSyncOptions,
  IUseFormFieldErrorReturn,
  IUseCharCountReturn,
} from './hooks';

export type {
  IDevExtremeAutocompleteProps,
  IDevExtremeCheckBoxProps,
  IDevExtremeDateBoxProps,
  IDevExtremeNumberBoxProps,
  IDevExtremeRadioGroupProps,
  IDevExtremeSelectBoxProps,
  IDevExtremeTagBoxProps,
  IDevExtremeTextAreaProps,
  IDevExtremeTextBoxProps,
  IRadioOption,
} from './DevExtremeControls';

export { PnPModernTaxonomyPicker } from './PnPControls';
export type { IPnPModernTaxonomyPickerProps, IPnPPeoplePickerProps } from './PnPControls';

// Custom Components types
export type { IGroupUser, IRHFGroupUsersPickerProps } from './customComponents';
