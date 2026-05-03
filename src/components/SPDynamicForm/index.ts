export { SPDynamicForm } from './SPDynamicForm';
export type {
  ISPDynamicFormProps,
  SPDynamicFormHandle,
  IFieldOverride,
  ICustomFieldRenderer,
  IFieldRenderProps,
  ISectionConfig,
  ICustomContent,
  IFieldVisibilityRule,
  ILookupFieldConfig,
  IFormSubmitResult,
  IFormButtonProps,
  // Phase 2 — fieldExtensions + matcher/resolver primitives
  IFieldExtension,
  IFieldExtensionProps,
  FieldMatcher,
  ValueOrFn,
  LabelTransform,
  IOverrideContext,
  // Phase 3 — multi-item bulk edit
  IMultiItemConfig,
  IMultiItemSubmitResult,
  IMultiItemSubmitOutcome,
} from './SPDynamicForm.types';
export type {
  IFieldMetadata as IDynamicFormFieldMetadata,
  ISectionMetadata,
  IFormFieldsResult,
} from './types/fieldMetadata';
