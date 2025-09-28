// Core form components

import './spfxForm.css';

export { default as FormContainer } from './FormContainer/FormContainer';
export { default as FormDescription } from './FormDescription/FormDescription';
export { default as FormError } from './FormError/FormError';
export { default as FormItem } from './FormItem/FormItem';
export { default as FormLabel } from './FormLabel/FormLabel';
export { default as FormValue } from './FormValue/FormValue';

// DevExtreme controls
export {
  DevExtremeAutocomplete,
  DevExtremeCheckBox,
  DevExtremeDateBox,
  DevExtremeNumberBox,
  DevExtremeSelectBox,
  DevExtremeTagBox,
  DevExtremeTextBox,
  DevExtremeTextArea,
} from './DevExtremeControls';

// PnP Controls
export { PnPPeoplePicker } from './PnPControls';

// Re-export all types for convenience
export type { IFormContainerProps } from './FormContainer/FormContainer';
export type { IFormDescriptionProps } from './FormDescription/FormDescription';
export type { IFormErrorProps } from './FormError/FormError';
export type { IFormItemProps } from './FormItem/FormItem';
export type { IFormLabelProps } from './FormLabel/FormLabel';
export type { IFormValueProps } from './FormValue/FormValue';

export type {
  IDevExtremeAutocompleteProps,
  IDevExtremeCheckBoxProps,
  IDevExtremeDateBoxProps,
  IDevExtremeNumberBoxProps,
  IDevExtremeSelectBoxProps,
  IDevExtremeTagBoxProps,
  IDevExtremeTextBoxProps,
  IDevExtremeTextAreaProps,

} from './DevExtremeControls';

export type { IPnPPeoplePickerProps } from './PnPControls';
export type { IPnPModernTaxonomyPickerProps } from './PnPControls';
export { PnPModernTaxonomyPicker } from './PnPControls';

// New DevExtreme RadioGroup control
export { default as DevExtremeRadioGroup } from './DevExtremeControls/DevExtremeRadioGroup';
export type { IDevExtremeRadioGroupProps, IRadioOption } from './DevExtremeControls/DevExtremeRadioGroup';
