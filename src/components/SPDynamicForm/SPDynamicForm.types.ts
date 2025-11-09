import * as React from 'react';
import { FieldValues, RegisterOptions, Control, UseFormReturn } from 'react-hook-form';
import { IFieldMetadata } from './types/fieldMetadata';
import type { createSPUpdater } from '../../utilities/listItemHelper';

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

  /** Custom content to inject between fields */
  customContent?: ICustomContent<T>[];

  /** Field visibility rules (conditional field display) */
  fieldVisibilityRules?: IFieldVisibilityRule[];

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
}

/**
 * Field override configuration
 */
export interface IFieldOverride {
  /** Internal name of the field to override */
  fieldName: string;

  /** Override display label */
  label?: string;

  /** Override description */
  description?: string;

  /** Override required flag */
  required?: boolean;

  /** Override disabled flag */
  disabled?: boolean;

  /** Hide the field */
  hidden?: boolean;

  /** Override default value */
  defaultValue?: any;

  /** Custom validation rules */
  validationRules?: RegisterOptions;

  /** Custom field renderer */
  render?: (props: IFieldRenderProps) => React.ReactElement;

  /** Override lookup render mode (for lookup fields) */
  lookupRenderMode?: 'dropdown' | 'autocomplete';
}

/**
 * Custom field renderer configuration
 */
export interface ICustomFieldRenderer {
  /** Internal name of the field */
  fieldName: string;

  /** Custom render function */
  render: (props: IFieldRenderProps) => React.ReactElement;
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
  /** Field internal name */
  fieldName: string;

  /** Show field when condition returns true */
  showWhen: (formValues: any) => boolean;
}

/**
 * Lookup field configuration
 */
export interface ILookupFieldConfig {
  /** Field internal name */
  fieldName: string;

  /** Override threshold for this field */
  threshold?: number;

  /** Force specific render mode */
  renderMode?: 'dropdown' | 'autocomplete';

  /** Fields to search in autocomplete mode */
  searchFields?: string[];

  /** Cache lookup results */
  cacheResults?: boolean;
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
