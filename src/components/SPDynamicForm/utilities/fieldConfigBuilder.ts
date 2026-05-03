import { RegisterOptions } from 'react-hook-form';
import { IFieldMetadata } from '../types/fieldMetadata';
import { IFieldOverride } from '../SPDynamicForm.types';
import { SPFieldType } from '../../spFields/types';
import { fieldMatches, effectiveMatcher, FieldMatcher } from './fieldOverrideMatcher';
import { resolveOverrideValue, resolveLabelTransform, IOverrideContext } from './resolveOverrideValue';

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

  // Required validation — static-only; function form is already resolved into
  // field.required by applyFieldOverrides before this is called.
  const isRequired = typeof override?.required === 'boolean' ? override.required : field.required;
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
 * Applies field overrides to metadata.
 *
 * Pre-Phase-2 this took only `(fields, overrides)` and applied static `label`,
 * `required`, etc. by exact `fieldName` match. Phase 2 widens this to:
 *   - matcher-based selection (`field: string | RegExp | function`)
 *   - value-or-function props (so function-form `disabled`, `hidden`, etc. evaluate
 *     against the current form-state context)
 *
 * MUST be called per-render from the form (not just once at field-load time)
 * so function-form props see fresh `formValues` from the watched subset.
 *
 * The legacy two-arg signature `applyFieldOverrides(fields, overrides)` is still
 * supported for backward compatibility; without a context, function-form props
 * cannot be evaluated and are skipped (their default applies).
 */
export function applyFieldOverrides(
  fields: IFieldMetadata[],
  overrides?: IFieldOverride[],
  ctx?: IOverrideContext
): IFieldMetadata[] {
  if (!overrides || overrides.length === 0) {
    return fields;
  }

  return fields.map((field) => {
    // Pre-build a lightweight ctx for THIS field if the caller didn't supply one.
    const fieldCtx: IOverrideContext = ctx
      ? { ...ctx, field }
      : { field, formValues: {}, mode: 'edit' };

    // Find every override whose matcher selects this field; later ones win prop-by-prop.
    const matched = overrides.filter((o) => {
      const m = effectiveMatcher(o);
      return m !== null && fieldMatches(m, field);
    });
    if (matched.length === 0) return field;

    const updated = { ...field };

    matched.forEach((override) => {
      const resolvedLabel = resolveLabelTransform(override.label, updated.displayName, fieldCtx);
      if (resolvedLabel !== updated.displayName) {
        updated.displayName = resolvedLabel;
      }

      const resolvedDesc = resolveLabelTransform(override.description, updated.description ?? '', fieldCtx);
      if (resolvedDesc !== (updated.description ?? '')) {
        updated.description = resolvedDesc;
      }

      const resolvedRequired = resolveOverrideValue<boolean>(override.required, fieldCtx);
      if (resolvedRequired !== undefined) updated.required = resolvedRequired;

      const resolvedHidden = resolveOverrideValue<boolean>(override.hidden, fieldCtx);
      if (resolvedHidden !== undefined) updated.hidden = resolvedHidden;

      const resolvedReadOnly = resolveOverrideValue<boolean>(override.readOnly, fieldCtx);
      if (resolvedReadOnly !== undefined) updated.readOnly = resolvedReadOnly;

      // Resolved `disabled` is stored on the metadata (`__resolvedDisabled`) so
      // `buildFieldProps` picks it up regardless of whether the override was a
      // static boolean or a function. Without this, function-form `disabled`
      // overrides would silently no-op (buildFieldProps only checked `typeof === 'boolean'`).
      const resolvedDisabled = resolveOverrideValue<boolean>(override.disabled, fieldCtx);
      if (resolvedDisabled !== undefined) {
        (updated as any).__resolvedDisabled = resolvedDisabled;
      }

      const resolvedDefault = resolveOverrideValue<unknown>(override.defaultValue, fieldCtx);
      if (resolvedDefault !== undefined) updated.defaultValue = resolvedDefault;

      // Lookup render mode: 'auto' is the natural default — pass through. Otherwise
      // record on metadata so getLookupRenderMode picks it up.
      if (override.lookupRenderMode && updated.isLookup) {
        updated.recommendedRenderMode = override.lookupRenderMode;
      }
    });

    return updated;
  });
}

/**
 * Computes the union of field internal names that should drive reactive
 * re-evaluation across the whole form: each rule/override/extension's matched
 * field plus their explicit `dependsOn` lists. The form `useWatch`es exactly
 * this set in narrow mode (when no rule omits `dependsOn`).
 */
export function collectWatchedFieldNames(args: {
  fields: IFieldMetadata[];
  overrides?: IFieldOverride[];
  visibilityRules?: Array<{ field?: FieldMatcher; fieldName?: string; dependsOn?: string[] }>;
  extensions?: Array<{ field: string; dependsOn?: string[] }>;
}): string[] {
  const names = new Set<string>();

  const addMatched = (matcher: FieldMatcher | null | undefined) => {
    if (!matcher) return;
    if (typeof matcher === 'string') {
      names.add(matcher);
      return;
    }
    args.fields.forEach((f) => {
      if (fieldMatches(matcher as FieldMatcher, f)) names.add(f.internalName);
    });
  };

  (args.overrides || []).forEach((o) => {
    addMatched(effectiveMatcher(o));
    (o.dependsOn || []).forEach((n) => names.add(n));
  });

  (args.visibilityRules || []).forEach((r) => {
    addMatched(effectiveMatcher(r));
    (r.dependsOn || []).forEach((n) => names.add(n));
  });

  (args.extensions || []).forEach((e) => {
    if (e.field) names.add(e.field);
    (e.dependsOn || []).forEach((n) => names.add(n));
  });

  return Array.from(names);
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
    // label: prefer the override's static value when it's a string; function form
    // is already resolved into field.displayName by applyFieldOverrides.
    label: typeof override?.label === 'string' ? override.label : field.displayName,
    // description: same gating as label
    description: typeof override?.description === 'string' ? override.description : field.description,
    // required: static-only — the function form is already resolved into field.required
    // by applyFieldOverrides before buildFieldProps is called.
    required: typeof override?.required === 'boolean' ? override.required : field.required,
    // disabled: static boolean override OR false. Function form is pre-resolved by
    // applyFieldOverrides (into field metadata) for per-render evaluation.
    // Prefer the resolved-disabled stamp left by applyFieldOverrides (handles both
    // static boolean AND function form). Fall back to the raw override if it's a
    // static boolean (legacy callers), then default to `false`.
    disabled:
      typeof (field as any).__resolvedDisabled === 'boolean'
        ? (field as any).__resolvedDisabled
        : typeof override?.disabled === 'boolean'
        ? override.disabled
        : false,
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
      // Enable "Other" option if field allows fill-in choices
      if (field.fieldConfig.fillInChoice) {
        props.otherConfig = {
          enableOtherOption: true,
          otherOptionText: 'Other',
        };
      }
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
