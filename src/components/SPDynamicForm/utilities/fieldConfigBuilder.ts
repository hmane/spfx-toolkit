import { RegisterOptions } from 'react-hook-form';
import { IFieldMetadata } from '../types/fieldMetadata';
import { IFieldOverride } from '../SPDynamicForm.types';
import { SPFieldType } from '../../spFields/types';

/**
 * Builds validation rules for a field based on its metadata
 */
export function buildValidationRules(
  field: IFieldMetadata,
  override?: IFieldOverride
): RegisterOptions {
  const rules: RegisterOptions = {};

  // Apply override rules first
  if (override?.validationRules) {
    Object.assign(rules, override.validationRules);
  }

  // Required validation
  const isRequired = override?.required !== undefined ? override.required : field.required;
  if (isRequired && !rules.required) {
    rules.required = `${field.displayName} is required`;
  }

  // Field-type specific validation
  switch (field.fieldType) {
    case SPFieldType.Text:
      if (field.fieldConfig.maxLength && !rules.maxLength) {
        rules.maxLength = {
          value: field.fieldConfig.maxLength,
          message: `${field.displayName} cannot exceed ${field.fieldConfig.maxLength} characters`,
        };
      }
      break;

    case SPFieldType.Note:
      if (field.fieldConfig.maxLength && !rules.maxLength) {
        rules.maxLength = {
          value: field.fieldConfig.maxLength,
          message: `${field.displayName} cannot exceed ${field.fieldConfig.maxLength} characters`,
        };
      }
      break;

    case SPFieldType.Number:
      if (field.fieldConfig.minValue !== undefined && !rules.min) {
        rules.min = {
          value: field.fieldConfig.minValue,
          message: `${field.displayName} must be at least ${field.fieldConfig.minValue}`,
        };
      }
      if (field.fieldConfig.maxValue !== undefined && !rules.max) {
        rules.max = {
          value: field.fieldConfig.maxValue,
          message: `${field.displayName} cannot exceed ${field.fieldConfig.maxValue}`,
        };
      }
      break;

    case SPFieldType.URL:
      if (!rules.validate && !override?.validationRules?.validate) {
        rules.validate = (value: any) => {
          if (!value || !value.Url) {
            return true;
          }
          try {
            new URL(value.Url);
            return true;
          } catch {
            return `${field.displayName} must be a valid URL`;
          }
        };
      }
      break;

    default:
      break;
  }

  return rules;
}

/**
 * Applies field overrides to metadata
 */
export function applyFieldOverrides(
  fields: IFieldMetadata[],
  overrides?: IFieldOverride[]
): IFieldMetadata[] {
  if (!overrides || overrides.length === 0) {
    return fields;
  }

  const overrideMap = new Map(overrides.map((o) => [o.fieldName, o]));

  return fields.map((field) => {
    const override = overrideMap.get(field.internalName);
    if (!override) {
      return field;
    }

    const updated = { ...field };

    if (override.label !== undefined) {
      updated.displayName = override.label;
    }
    if (override.description !== undefined) {
      updated.description = override.description;
    }
    if (override.required !== undefined) {
      updated.required = override.required;
    }
    if (override.disabled !== undefined) {
      updated.readOnly = override.disabled;
    }
    if (override.hidden !== undefined) {
      updated.hidden = override.hidden;
    }
    if (override.defaultValue !== undefined) {
      updated.defaultValue = override.defaultValue;
    }

    if (override.lookupRenderMode && updated.isLookup) {
      updated.recommendedRenderMode = override.lookupRenderMode;
    }

    return updated;
  });
}

/**
 * Builds props for SPField components based on metadata
 */
export function buildFieldProps(
  field: IFieldMetadata,
  mode: 'new' | 'edit' | 'view',
  control: any,
  listId: string,
  override?: IFieldOverride
): any {
  const props: any = {
    name: field.internalName,
    control,
    label: override?.label || field.displayName,
    description: override?.description || field.description,
    required: override?.required !== undefined ? override.required : field.required,
    disabled: override?.disabled || false,
    readOnly: mode === 'view' || field.readOnly,
    rules: buildValidationRules(field, override),
  };

  switch (field.fieldType) {
    case SPFieldType.Text:
    case SPFieldType.Note:
      props.maxLength = field.fieldConfig.maxLength;
      // Note: mode and numberOfLines are set in SPDynamicFormField based on field type
      break;

    case SPFieldType.Number:
      props.min = field.fieldConfig.minValue;
      props.max = field.fieldConfig.maxValue;
      props.decimals = field.fieldConfig.decimals;
      props.showAsPercentage = field.fieldConfig.showAsPercentage;
      break;

    case SPFieldType.Choice:
    case SPFieldType.MultiChoice:
      props.choices = field.fieldConfig.choices;
      props.allowMultiple = field.fieldConfig.isMulti;
      // Note: allowFillIn/fillInChoice is handled via otherConfig in SPChoiceField
      break;

    case SPFieldType.DateTime:
      // Note: dateTimeFormat is set in SPDynamicFormField based on displayFormat
      break;

    case SPFieldType.User:
    case SPFieldType.UserMulti:
      // Use columnName/listId pattern for auto-loading field configuration
      props.columnName = field.internalName;
      props.listId = listId;
      // UserMulti fields need allowMultiple flag
      if (field.fieldType === SPFieldType.UserMulti) {
        props.allowMultiple = true;
      }
      break;

    case SPFieldType.Lookup:
    case SPFieldType.LookupMulti:
      // Create proper dataSource object for SPLookupField
      props.dataSource = {
        listNameOrId: field.fieldConfig.lookupListId || '',
        displayField: field.fieldConfig.lookupField || 'Title',
      };
      // LookupMulti or allowMultiple config
      props.allowMultiple = field.fieldType === SPFieldType.LookupMulti || field.fieldConfig.allowMultiple;
      // Set display mode based on item count if available
      if (field.lookupItemCount && field.lookupItemCount > 100) {
        props.displayMode = 'searchable';
      }
      break;

    case SPFieldType.TaxonomyFieldType:
    case SPFieldType.TaxonomyFieldTypeMulti:
      // Use columnName/listId pattern for auto-loading field configuration
      props.columnName = field.internalName;
      props.listId = listId;
      // TaxonomyFieldTypeMulti needs allowMultiple flag
      if (field.fieldType === SPFieldType.TaxonomyFieldTypeMulti) {
        props.allowMultiple = true;
      }
      break;

    default:
      break;
  }

  return props;
}
