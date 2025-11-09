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
      if (field.fieldConfig.allowMultiline) {
        props.multiline = true;
        props.numberOfLines = field.fieldConfig.numberOfLines || 6;
      }
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
      props.allowFillIn = field.fieldConfig.fillInChoice;
      props.isMulti = field.fieldConfig.isMulti;
      break;

    case SPFieldType.DateTime:
      props.dateOnly = field.fieldConfig.displayFormat === 0;
      break;

    case SPFieldType.User:
      props.allowMultiple = field.fieldConfig.allowMultiple;
      props.principalTypes = field.fieldConfig.selectionMode === 0 ? ['User'] : ['User', 'Group'];
      break;

    case SPFieldType.Lookup:
      props.listId = field.fieldConfig.lookupListId;
      props.lookupField = field.fieldConfig.lookupField || 'Title';
      props.isMulti = field.fieldConfig.allowMultiple;
      break;

    case SPFieldType.TaxonomyFieldType:
      props.termSetId = field.fieldConfig.termSetId;
      props.allowMultiple = field.fieldConfig.allowMultiple;
      break;

    default:
      break;
  }

  return props;
}
