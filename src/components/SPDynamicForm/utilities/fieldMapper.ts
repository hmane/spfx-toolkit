import { SPFieldType } from '../../spFields/types';
import { IFieldMetadata } from '../types/fieldMetadata';

/**
 * Maps SharePoint FieldTypeKind to SPFieldType enum
 */
export function mapSharePointFieldType(
  fieldTypeKind: number,
  typeAsString?: string
): SPFieldType {
  // Handle special cases first
  if (typeAsString) {
    const typeStr = typeAsString.toLowerCase();

    if (typeStr === 'taxonomyfieldtype' || typeStr === 'taxonomyfieldtypemulti') {
      return SPFieldType.TaxonomyFieldType;
    }

    if (typeStr === 'location') {
      return SPFieldType.Text; // Location fields can be treated as text for now
    }

    if (typeStr === 'thumbnail' || typeStr === 'image') {
      return SPFieldType.Text; // Image fields need special handling
    }
  }

  // Map standard field types
  switch (fieldTypeKind) {
    case 2: // Text
      return SPFieldType.Text;
    case 3: // Note (multiline)
      return SPFieldType.Note;
    case 4: // DateTime
      return SPFieldType.DateTime;
    case 6: // Choice
      return SPFieldType.Choice;
    case 7: // Lookup
      return SPFieldType.Lookup;
    case 8: // Boolean
      return SPFieldType.Boolean;
    case 9: // Number
      return SPFieldType.Number;
    case 10: // Currency
      return SPFieldType.Number; // Treat currency as number
    case 11: // URL
      return SPFieldType.URL;
    case 15: // MultiChoice
      return SPFieldType.MultiChoice;
    case 20: // User
      return SPFieldType.User;
    case 21: // Recurrence
      return SPFieldType.Text;
    case 23: // Computed
      return SPFieldType.Text;
    case 28: // Attachments
      return SPFieldType.Text;
    case 31: // Guid
      return SPFieldType.Text;
    default:
      return SPFieldType.Text; // Default fallback
  }
}

/**
 * Extracts field-specific configuration from SharePoint field object
 */
export function extractFieldConfig(field: any, fieldType: SPFieldType): any {
  const config: any = {};

  switch (fieldType) {
    case SPFieldType.Text:
    case SPFieldType.Note:
      config.maxLength = field.MaxLength;
      config.richText = field.RichText || false;
      config.allowMultiline = field.FieldTypeKind === 3;
      config.numberOfLines = field.NumberOfLines || (config.allowMultiline ? 6 : 1);
      config.appendOnly = field.AppendOnly || false;
      break;

    case SPFieldType.Choice:
    case SPFieldType.MultiChoice:
      config.choices = field.Choices || [];
      config.fillInChoice = field.FillInChoice || false;
      config.isMulti = fieldType === SPFieldType.MultiChoice;
      break;

    case SPFieldType.Number:
      config.minValue = field.MinimumValue;
      config.maxValue = field.MaximumValue;
      config.decimals = field.Decimals !== undefined ? field.Decimals : 2;
      config.showAsPercentage = field.ShowAsPercentage || false;
      break;

    case SPFieldType.DateTime:
      config.displayFormat = field.DisplayFormat; // 0 = DateOnly, 1 = DateTime
      config.friendlyDisplay = field.FriendlyDisplayFormat;
      break;

    case SPFieldType.User:
      config.allowMultiple = field.AllowMultipleValues || false;
      config.selectionMode = field.SelectionMode; // 0 = PeopleOnly, 1 = PeopleAndGroups
      break;

    case SPFieldType.Lookup:
      config.lookupListId = field.LookupList;
      config.lookupField = field.LookupField || 'Title';
      config.allowMultiple = field.AllowMultipleValues || false;
      break;

    case SPFieldType.TaxonomyFieldType:
      config.termSetId = field.TermSetId;
      config.anchorId = field.AnchorId;
      config.allowMultiple = field.AllowMultipleValues || false;
      break;

    case SPFieldType.URL:
      config.displayFormat = field.DisplayFormat; // 0 = Hyperlink, 1 = Picture
      break;

    case SPFieldType.Boolean:
      // No specific config needed
      break;

    default:
      // No specific config
      break;
  }

  return config;
}

/**
 * Builds complete field metadata from SharePoint field object
 */
export function buildFieldMetadata(field: any, order: number = 0): IFieldMetadata {
  const fieldType = mapSharePointFieldType(field.FieldTypeKind, field.TypeAsString);
  const fieldConfig = extractFieldConfig(field, fieldType);

  const metadata: IFieldMetadata = {
    internalName: field.InternalName || field.EntityPropertyName,
    displayName: field.Title,
    fieldType,
    required: field.Required || false,
    readOnly: field.ReadOnlyField || false,
    hidden: field.Hidden || false,
    description: field.Description || '',
    defaultValue: field.DefaultValue,
    group: field.Group || '_Default',
    order,
    fieldConfig,
    fieldId: field.Id,
    fieldTypeKind: field.FieldTypeKind,
    typeAsString: field.TypeAsString,
  };

  // Set lookup-specific properties
  if (fieldType === SPFieldType.Lookup && fieldConfig.lookupListId) {
    metadata.isLookup = true;
    metadata.lookupListId = fieldConfig.lookupListId;
  }

  return metadata;
}

/**
 * Filters fields based on mode and visibility rules
 */
export function filterFieldsByMode(
  fields: IFieldMetadata[],
  mode: 'new' | 'edit' | 'view',
  excludeFields: string[] = []
): IFieldMetadata[] {
  return fields.filter((field) => {
    // Exclude explicitly hidden fields
    if (excludeFields.includes(field.internalName)) {
      return false;
    }

    // Always exclude hidden fields
    if (field.hidden) {
      return false;
    }

    // Exclude system fields
    const systemFields = [
      'ContentType',
      'Edit',
      'LinkTitle',
      'LinkTitleNoMenu',
      'DocIcon',
      'ItemChildCount',
      'FolderChildCount',
      'AppAuthor',
      'AppEditor',
      '_UIVersionString',
      'Attachments',
      'FileLeafRef',
      'FileRef',
      'FileDirRef',
      'File_x0020_Type',
      '_ComplianceFlags',
      '_ComplianceTag',
      '_ComplianceTagWrittenTime',
      '_ComplianceTagUserId',
    ];

    if (systemFields.includes(field.internalName)) {
      return false;
    }

    // Mode-specific filtering
    if (mode === 'view') {
      // In view mode, show all non-hidden fields
      return true;
    }

    if (mode === 'new') {
      // In new mode, exclude read-only fields except those that might have defaults
      if (field.readOnly && !field.defaultValue) {
        return false;
      }
    }

    if (mode === 'edit') {
      // In edit mode, exclude non-editable fields
      if (field.readOnly) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts fields by order property
 */
export function sortFieldsByOrder(fields: IFieldMetadata[]): IFieldMetadata[] {
  return [...fields].sort((a, b) => a.order - b.order);
}
