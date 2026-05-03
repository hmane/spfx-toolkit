import * as React from 'react';
import { FieldValues, RegisterOptions, Control, UseFormReturn } from 'react-hook-form';
import { IFieldMetadata } from './types/fieldMetadata';
import type { createSPUpdater } from '../../utilities/listItemHelper';
import type { FieldMatcher } from './utilities/fieldOverrideMatcher';
import type { ValueOrFn, LabelTransform, IOverrideContext } from './utilities/resolveOverrideValue';

// Re-export the matcher / resolver primitives so consumers can `import { FieldMatcher }
// from 'spfx-toolkit/lib/components/SPDynamicForm'` without reaching into the utilities path.
export type { FieldMatcher } from './utilities/fieldOverrideMatcher';
export type { ValueOrFn, LabelTransform, IOverrideContext } from './utilities/resolveOverrideValue';

/**
 * Props for the SPDynamicForm component
 */
export interface ISPDynamicFormProps<T extends FieldValues = any> {
  // ===== REQUIRED =====

  /** List GUID or title */
  listId: string;

  /** Form mode */
  mode: 'new' | 'edit' | 'view';

  /** Form submission handler - receives complete form result */
  onSubmit: (result: IFormSubmitResult<T>) => void | Promise<void>;

  // ===== OPTIONAL - ITEM =====

  /** Item ID (required for edit/view modes) */
  itemId?: number;

  /** Specific ContentType ID to use */
  contentTypeId?: string;

  // ===== OPTIONAL - FIELD CONTROL =====

  /** Explicit field list (overrides auto-load) */
  fields?: string[];

  /** Fields to exclude from the form */
  excludeFields?: string[];

  /** Override configuration for specific fields */
  fieldOverrides?: IFieldOverride[];

  /** Custom field renderers */
  customFields?: ICustomFieldRenderer[];

  // ===== OPTIONAL - ORDERING =====

  /** Manual field order (internal names) */
  fieldOrder?: string[];

  /** Use ContentType field order (default: true) */
  useContentTypeOrder?: boolean;

  // ===== OPTIONAL - SECTIONS =====

  /** Manual section definitions */
  sections?: ISectionConfig[];

  /** Use ContentType groups for sections (default: true) */
  useContentTypeGroups?: boolean;

  /**
   * Custom content to inject between fields.
   * @deprecated Use `fieldExtensions` instead. Will be removed in v2.
   */
  customContent?: ICustomContent<T>[];

  /** Field visibility rules (conditional field display) */
  fieldVisibilityRules?: IFieldVisibilityRule[];

  /** Extensions render arbitrary UI alongside specific fields, optionally driven by async computation. */
  fieldExtensions?: IFieldExtension[];

  /** Compact mode - reduces spacing for smaller forms (default: false) */
  compact?: boolean;

  /** Custom spacing between fields in pixels (overrides compact) */
  fieldSpacing?: number;

  // ===== OPTIONAL - LOOKUP FIELD OPTIMIZATION =====

  /** Threshold for switching lookup fields to autocomplete (default: 5000) */
  lookupThreshold?: number;

  /** Per-field lookup configuration */
  lookupFieldConfig?: ILookupFieldConfig[];

  // ===== OPTIONAL - VALIDATION =====

  /** Custom form-level validation function */
  customValidation?: (data: T) => Promise<Record<string, string> | null> | Record<string, string> | null;

  /** Validation mode (default: 'onSubmit') */
  validationMode?: 'onSubmit' | 'onChange' | 'onBlur' | 'onTouched' | 'all';

  // ===== OPTIONAL - BUTTONS =====

  /** Custom button renderer */
  renderButtons?: (props: IFormButtonProps) => React.ReactElement;

  /** Show default Save/Cancel buttons (default: true) */
  showDefaultButtons?: boolean;

  /** Save button text (default: 'Save') */
  saveButtonText?: string;

  /** Cancel button text (default: 'Cancel') */
  cancelButtonText?: string;

  // ===== OPTIONAL - ATTACHMENTS =====

  /** Show attachments field (default: auto-detect) */
  showAttachments?: boolean;

  /** Attachment field position (default: 'bottom') */
  attachmentPosition?: 'top' | 'bottom' | 'section';

  /** Section name to place attachments (when position is 'section') */
  attachmentSectionName?: string;

  /** Maximum attachment size in MB */
  maxAttachmentSize?: number;

  /** Allowed file types (extensions) */
  allowedFileTypes?: string[];

  // ===== OPTIONAL - UI =====

  /** Show loading state */
  loading?: boolean;

  /** Disable entire form */
  disabled?: boolean;

  /** Force read-only mode */
  readOnly?: boolean;

  /** Custom CSS class */
  className?: string;

  // ===== EVENTS =====

  /** Called before fields are loaded */
  onBeforeLoad?: () => Promise<void | boolean>;

  /** Called after fields and data are loaded */
  onAfterLoad?: (data: T, fields: IFieldMetadata[]) => void;

  /** Called before form submission (can cancel with false) */
  onBeforeSubmit?: (data: T, changes: Partial<T>) => Promise<void | boolean>;

  /** Called on error during load, validation, or submit */
  onError?: (error: Error, context: 'load' | 'validation' | 'submit') => void;

  /** Called when cancel button is clicked */
  onCancel?: () => void;

  /** Called when any field value changes */
  onFieldChange?: (fieldName: string, value: any, allValues: T) => void;

  // ===== CONTENT TYPE PICKER =====

  /**
   * Whitelist of content type IDs to offer in the picker. Default: all visible CTs.
   * If `contentTypeId` is also set, the picker is hidden and the form locks to that CT.
   */
  availableContentTypes?: string[];

  /** Fired when the user picks a different CT in the inline picker. */
  onContentTypeChange?: (contentTypeId: string) => void;

  /** Hide the CT picker even when multiple CTs are available (form falls back to default). */
  hideContentTypePicker?: boolean;

  // ===== ADVANCED =====

  /** Cache field metadata (default: true) */
  cacheFields?: boolean;

  /** Enable dirty checking and unsaved changes warning (default: false) */
  enableDirtyCheck?: boolean;

  /** Confirm before canceling if form has unsaved changes (default: false) */
  confirmOnCancel?: boolean;

  /** Custom confirmation message for unsaved changes */
  confirmMessage?: string;

  /** Scroll to first error on validation failure (default: true) */
  scrollToError?: boolean;

  /** Show help icon with field descriptions (default: true) */
  showFieldHelp?: boolean;

  /**
   * Final tweak point after field metadata is loaded (CT-resolved + grouped + ordered)
   * but before any rendering occurs. Return a new array (or mutate + return the same).
   * Useful for advanced consumers who need to alter `required`/`hidden`/`description`
   * for many fields at once based on external data.
   */
  onFieldLoadTransform?: (fields: IFieldMetadata[]) => IFieldMetadata[];

  /**
   * Logs every field's resolved override state via `SPContext.logger.info` on each
   * render pass. Off by default. Useful for diagnosing "why is field X disabled?".
   */
  debug?: boolean;

  /**
   * Called for every field on every render after override resolution. Same
   * information as `debug` exposes via the logger, but as a callback for
   * consumers who want to forward it elsewhere (telemetry, devtools, etc).
   */
  onResolvedField?: (resolved: IFieldMetadata, field: IFieldMetadata) => void;

  /**
   * Multi-item bulk edit. When set, the form loads N items, pre-fills shared values,
   * and applies dirty-field changes to every selected item via a batched save.
   */
  multiItem?: IMultiItemConfig;

  /**
   * Override `onSubmit` for multi-item mode. Required when `multiItem` is set.
   * Receives a `IMultiItemSubmitResult` — call `result.apply()` to perform the save.
   */
  onMultiItemSubmit?: (result: IMultiItemSubmitResult) => Promise<void> | void;
}

/**
 * Field override configuration.
 *
 * Selects one or more fields and overrides their presentation. Every prop
 * (label, disabled, hidden, etc.) accepts either a static value OR a function
 * that computes the value from the override context — function form requires
 * declaring `dependsOn` to keep watching narrow.
 */
export interface IFieldOverride {
  /**
   * Field selector. One of:
   *  - exact internal name (string) — `field: 'Status'`
   *  - RegExp matched against `internalName` first, then `displayName` —
   *    `field: /sub[-_ ]?type$/i`
   *  - predicate function — `field: (f) => f.fieldType === 'Lookup'`
   *
   * If both `field` and the deprecated `fieldName` are supplied, `field` wins
   * and a deprecation warning is logged.
   */
  field?: FieldMatcher;

  /**
   * @deprecated Use `field` instead. Kept for backward compatibility — accepts
   * an exact internal name and is treated as `field: fieldName`. Will be
   * removed in v2.
   */
  fieldName?: string;

  /** Static replacement, or `(currentLabel, ctx) => string | undefined` (return undefined to keep). */
  label?: LabelTransform;
  description?: LabelTransform;
  placeholder?: LabelTransform;

  /** Static or `(ctx) => boolean | undefined` — undefined falls back to the field's default. */
  required?: ValueOrFn<boolean>;
  disabled?: ValueOrFn<boolean>;
  hidden?: ValueOrFn<boolean>;
  readOnly?: ValueOrFn<boolean>;

  /** Static or `(ctx) => unknown`. */
  defaultValue?: ValueOrFn<unknown>;

  /**
   * Field internal names whose changes should re-evaluate this override's
   * function-form props. Defaults to `[]` — the matched field is always watched
   * implicitly. List every cross-field name your function-form props read.
   * (Same compat semantics as `IFieldVisibilityRule.dependsOn`.)
   */
  dependsOn?: string[];

  /** RHF validation rules. */
  validationRules?: RegisterOptions;

  /** Full per-field render takeover. */
  render?: (props: IFieldRenderProps) => React.ReactNode;

  /**
   * Lookup display preference. Default: `'auto'` (size-driven via SPLookupField).
   * `'autocomplete'` retained from the existing public API.
   */
  lookupRenderMode?: 'auto' | 'dropdown' | 'autocomplete';
}

/**
 * Custom field renderer configuration.
 * @deprecated Use `IFieldOverride.render` instead. Will be removed in v2.
 */
export interface ICustomFieldRenderer {
  /** Field selector — same semantics as `IFieldOverride.field`. */
  field?: FieldMatcher;

  /** @deprecated Use `field` instead. */
  fieldName?: string;

  /** Custom render function */
  render: (props: IFieldRenderProps) => React.ReactNode;
}

/**
 * Runtime state passed to a field extension's `render` function.
 */
export interface IFieldExtensionProps<TComputed = unknown> {
  /** Current value of the host field. */
  value: unknown;
  /** Result of `compute` (if defined and resolved). */
  computed?: TComputed;
  /** True while `compute` is in flight. */
  isLoading: boolean;
  /** Last error thrown by `compute`, if any. */
  error?: Error;
  /**
   * Watched form values — populated with the host field plus everything in
   * `dependsOn`. Reading other fields here is allowed but won't be reactive.
   */
  formValues: Record<string, unknown>;
  /** Field metadata for the host field. */
  field: IFieldMetadata;
  /** Form mode at render time. */
  mode: 'new' | 'edit' | 'view';
}

/**
 * A field extension renders arbitrary UI alongside a host field, optionally
 * driven by an async `compute`. Replaces `customContent` for value-driven
 * cases (taxonomy lookup → fetch headcount → show below the field, etc.).
 */
export interface IFieldExtension<TComputed = unknown> {
  /** Internal name of the host field. The extension renders adjacent to it. */
  field: string;

  /**
   * Additional field internal names whose values should re-trigger `compute`
   * and the render. The host field is always watched implicitly. Listing
   * external dependencies here is what makes "show SLA after Priority + DueDate"
   * work without watching the entire form.
   */
  dependsOn?: string[];

  /** Where to render relative to the host field. Default: 'after'. */
  position?: 'before' | 'after';

  /**
   * Optional async computation. Receives `{ value, formValues, field, mode }`.
   * Runs when the host value or any `dependsOn` changes (debounced per type
   * unless overridden). Stale results are discarded when a newer compute
   * finishes first. Throw to render error state.
   */
  compute?: (ctx: {
    value: unknown;
    formValues: Record<string, unknown>;
    field: IFieldMetadata;
    mode: 'new' | 'edit' | 'view';
  }) => Promise<TComputed> | TComputed;

  /** Render the extension UI. */
  render: (props: IFieldExtensionProps<TComputed>) => React.ReactNode;

  /**
   * Custom debounce in ms. If unset:
   *  - Text/Note/Number/URL/Currency: 300ms
   *  - all other types: 0 (immediate)
   */
  debounceMs?: number;
}

/**
 * Props passed to custom field renderers
 */
export interface IFieldRenderProps<T extends FieldValues = any> {
  /** Field metadata */
  field: IFieldMetadata;

  /** Form control from react-hook-form */
  control: Control<T>;

  /** Current field value */
  value: any;

  /** Field error message (if any) */
  error?: string;

  /** Whether the field has an error */
  hasError: boolean;

  /** Form mode */
  mode: 'new' | 'edit' | 'view';

  /** Whether the field is disabled */
  disabled: boolean;

  /** Whether the field is read-only */
  readOnly: boolean;

  /** Update field value programmatically */
  onChange: (value: any) => void;

  /** Full form instance for advanced scenarios */
  form: UseFormReturn<T>;

  /**
   * Fully-resolved presentation values for this field after `fieldOverrides`
   * have been applied. Use these (instead of computing them yourself) when
   * implementing a custom `render` so labels/required/disabled match what the
   * standard renderer would have shown.
   */
  resolved?: {
    label: string;
    description?: string;
    placeholder?: string;
    required: boolean;
    disabled: boolean;
    readOnly: boolean;
    hidden: boolean;
    defaultValue: unknown;
  };

  /**
   * The override-resolution context (field, formValues, mode, user, contentTypeId).
   * Useful for conditional logic inside a custom `render`.
   */
  ctx?: IOverrideContext;
}

/**
 * Section configuration
 */
export interface ISectionConfig {
  /** Unique section identifier */
  name: string;

  /** Section display title */
  title: string;

  /** Field internal names in this section */
  fields: string[];

  /** Default expanded state (default: true) */
  defaultExpanded?: boolean;

  /** Whether section can be collapsed (default: true) */
  collapsible?: boolean;

  /** Section description */
  description?: string;

  /** Compact padding for this section (default: false) */
  compact?: boolean;
}

/**
 * Custom content configuration
 */
export interface ICustomContent<T extends FieldValues = any> {
  /** Position to inject content (field index, 'before:FieldName', 'after:FieldName') */
  position: number | `before:${string}` | `after:${string}`;

  /** Content renderer with access to form state */
  render: (formValues: T) => React.ReactElement;

  /** Optional: Only show if condition is true */
  showWhen?: (formValues: T) => boolean;
}

/**
 * Field conditional visibility configuration
 */
export interface IFieldVisibilityRule {
  /**
   * Field selector for the host field whose visibility this rule controls.
   * Same semantics as `IFieldOverride.field` (`string | RegExp | function`).
   */
  field?: FieldMatcher;

  /** @deprecated Use `field`. Kept for backward compatibility. */
  fieldName?: string;

  /**
   * Show field when condition returns true. Receives an object containing the
   * watched form values. In **compatibility mode** (when at least one rule on
   * the form omits `dependsOn`) this object holds ALL form values; in **narrow
   * mode** (when every rule declares `dependsOn`) it holds only the host field
   * plus everything listed in `dependsOn`.
   */
  showWhen: (formValues: Record<string, unknown>) => boolean;

  /**
   * Field internal names whose changes should re-evaluate this rule. Optional.
   *
   * - **Omitted on any rule** → the form falls back to whole-form watching for
   *   ALL rules (v1 behaviour) and logs a one-time deprecation warning. Existing
   *   apps keep working without changes.
   * - **Provided on every rule** → narrow watching is enabled, re-rendering only
   *   when the listed fields change. Recommended for performance on large forms.
   *
   * Always include every field your `showWhen` predicate reads (other than the
   * host `fieldName`, which is included automatically).
   */
  dependsOn?: string[];
}

/**
 * Lookup field configuration
 */
export interface ILookupFieldConfig {
  /** Field selector — same semantics as `IFieldOverride.field`. */
  field?: FieldMatcher;

  /** @deprecated Use `field` instead. */
  fieldName?: string;

  /** Override threshold for this field */
  threshold?: number;

  /** Force specific render mode */
  renderMode?: 'auto' | 'dropdown' | 'autocomplete';

  /** Fields to search in autocomplete mode */
  searchFields?: string[];

  /** Cache lookup results */
  cacheResults?: boolean;
}

/**
 * Imperative handle for SPDynamicForm. Use with `React.useRef<SPDynamicFormHandle>(null)` and
 * `<SPDynamicForm ref={ref} ... />` to programmatically interact with the form from a parent.
 */
export interface SPDynamicFormHandle {
  /** Programmatically trigger submit. Resolves after the configured `onSubmit` returns. */
  submit: () => Promise<void>;
  /** Reset all fields to their default values (or to a provided values object). */
  reset: (values?: Record<string, unknown>) => void;
  /** Scroll the form so the named field is in view; focus it if `focus=true`. */
  scrollToField: (name: string, options?: { focus?: boolean }) => void;
  /** Set a single field's value (RHF `setValue` under the hood). */
  setFieldValue: (
    name: string,
    value: unknown,
    opts?: { shouldDirty?: boolean; shouldValidate?: boolean }
  ) => void;
  /** Read the current form values. */
  getFormValues: () => Record<string, unknown>;
}

/**
 * Per-item outcome from a multi-item bulk save.
 */
export interface IMultiItemSubmitOutcome {
  itemId: number;
  success: boolean;
  /** Error message string (BatchBuilder's IOperationResult.error is `string`, not Error). */
  error?: string;
}

/**
 * Result handed to the consumer's `onMultiItemSubmit` handler.
 */
export interface IMultiItemSubmitResult {
  itemIds: number[];
  /** PnP-shaped updates that will be applied to every selected item. */
  updates: Record<string, unknown>;
  /** Internal names of the dirty fields (what the user changed). */
  changedFieldNames: string[];
  /** Execute the bulk save via BatchBuilder. Resolves with per-item outcomes. */
  apply: () => Promise<IMultiItemSubmitOutcome[]>;
}

/**
 * Multi-item bulk edit configuration. Setting `itemIds` puts the form into
 * multi-item mode: it loads N items, pre-fills shared values, and applies
 * dirty-field changes to every selected item via a batched save.
 */
export interface IMultiItemConfig {
  /** Item IDs to edit in bulk. */
  itemIds: number[];
  /**
   * Behavior when reconciling pre-fill values across items:
   *  - 'shared': show value if all items share it; empty otherwise (default)
   *  - 'first':  always show the first item's value
   */
  reconcileMode?: 'shared' | 'first';
  /** Show a "Will update N items: …" preview line above the save button. Default: false. */
  showSavePreview?: boolean;
  /** Render the per-field revert (↺) button for dirty fields. Default: true. */
  showRevertControls?: boolean;
  /** Visually highlight dirty rows. Default: true. */
  highlightDirty?: boolean;
}

/**
 * Form submission result
 */
export interface IFormSubmitResult<T extends FieldValues = any> {
  // ===== FORM DATA =====

  /** Complete form data */
  formData: T;

  /** Only changed fields (for edit mode) */
  changes: Partial<T>;

  /** Whether form validation passed */
  isValid: boolean;

  // ===== SP UPDATER =====

  /** SPUpdater instance with changes */
  updater: ReturnType<typeof createSPUpdater>;

  /** Ready-to-use updates object for item.update() */
  updates: any;

  // ===== ATTACHMENTS =====

  /** Attachment operations */
  attachments: {
    /** New files to upload */
    filesToAdd: File[];

    /** File names to delete */
    filesToDelete: string[];

    /**
     * Helper to upload attachments after creating/updating an item.
     * For new items: call this after creating the item with the new itemId.
     * For edit mode: can also use to upload/delete attachments.
     *
     * @param targetItemId - The item ID to upload attachments to (required for new items)
     * @returns Promise with upload results
     *
     * @example
     * ```typescript
     * // For new items:
     * const handleSubmit = async (result: IFormSubmitResult) => {
     *   // 1. Create the item
     *   const newItem = await list.items.add(result.updates);
     *
     *   // 2. Upload attachments
     *   await result.attachments.uploadAll(newItem.Id);
     * };
     * ```
     */
    uploadAll: (targetItemId?: number) => Promise<{
      uploaded: string[];
      deleted: string[];
      errors: Array<{ fileName: string; error: string }>;
    }>;
  };

  // ===== METADATA =====

  /** Form mode */
  mode: 'new' | 'edit' | 'view';

  /** Item ID (for edit/view) */
  itemId?: number;

  /** List ID */
  listId: string;

  /** Whether any changes were detected */
  hasChanges: boolean;
}

/**
 * Props passed to custom button renderer
 */
export interface IFormButtonProps {
  /** Save button click handler */
  onSave: () => Promise<void>;

  /** Cancel button click handler */
  onCancel: () => void;

  /** Whether form is currently submitting */
  isSubmitting: boolean;

  /** Whether form is valid */
  isValid: boolean;

  /** Whether form has unsaved changes */
  isDirty: boolean;

  /** Whether form is disabled */
  disabled: boolean;
}
