import { SPFieldType } from '../../spFields/types';

/**
 * Metadata for a SharePoint field extracted from the list schema
 */
export interface IFieldMetadata {
  /** Internal name of the field */
  internalName: string;

  /** Display name/title of the field */
  displayName: string;

  /** Field type enum */
  fieldType: SPFieldType;

  /** Whether the field is required */
  required: boolean;

  /** Whether the field is read-only */
  readOnly: boolean;

  /** Whether the field is hidden */
  hidden: boolean;

  /** Field description */
  description: string;

  /** Default value for the field */
  defaultValue: any;

  /** ContentType group name */
  group: string;

  /** Field order from ContentType or list */
  order: number;

  /** Field-specific configuration based on type */
  fieldConfig: any;

  /** Whether this is a lookup field */
  isLookup?: boolean;

  /** Lookup list ID (for lookup fields) */
  lookupListId?: string;

  /** Number of items in the lookup list */
  lookupItemCount?: number;

  /** Recommended render mode based on item count */
  recommendedRenderMode?: 'dropdown' | 'autocomplete';

  /** SharePoint field ID */
  fieldId?: string;

  /** Original SharePoint field type kind */
  fieldTypeKind?: number;

  /** TypeAsString from SharePoint */
  typeAsString?: string;
}

/**
 * Section/group configuration for organizing form fields
 */
export interface ISectionMetadata {
  /** Unique section identifier */
  name: string;

  /** Display title */
  title: string;

  /** Fields in this section */
  fields: IFieldMetadata[];

  /** Whether section is expanded by default */
  defaultExpanded: boolean;

  /** Whether section can be collapsed */
  collapsible: boolean;

  /** Section description */
  description?: string;

  /** Original ContentType group name (if from CT) */
  originalGroup?: string;

  /** Compact padding for this section */
  compact?: boolean;
}

/**
 * Result of field loading and processing
 */
export interface IFormFieldsResult {
  /** All form fields */
  fields: IFieldMetadata[];

  /** Fields organized into sections */
  sections: ISectionMetadata[];

  /** Whether sections are used */
  useSections: boolean;

  /** Whether attachments are supported */
  supportsAttachments: boolean;

  /** List ID */
  listId: string;

  /** ContentType ID (if used) */
  contentTypeId?: string;
}
