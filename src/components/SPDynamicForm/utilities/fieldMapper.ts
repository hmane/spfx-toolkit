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
    if (typeAsString === 'OutcomeChoice') {
      return SPFieldType.Choice;
    }

    if (typeAsString === 'TaxonomyFieldType') {
      return SPFieldType.TaxonomyFieldType;
    }

    if (typeAsString === 'TaxonomyFieldTypeMulti') {
      return SPFieldType.TaxonomyFieldTypeMulti;
    }

    if (typeAsString === 'UserMulti') {
      return SPFieldType.UserMulti;
    }

    if (typeAsString === 'LookupMulti') {
      return SPFieldType.LookupMulti;
    }

    if (typeAsString === 'Currency') {
      return SPFieldType.Currency;
    }

    if (typeAsString === 'Integer') {
      return SPFieldType.Integer;
    }

    if (typeAsString === 'Counter') {
      return SPFieldType.Counter;
    }

    const typeStr = typeAsString.toLowerCase();

    if (typeStr === 'location') {
      return SPFieldType.Text; // Location fields can be treated as text for now
    }

    if (typeStr === 'thumbnail' || typeStr === 'image') {
      return SPFieldType.Image;
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
      return SPFieldType.Currency;
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

    case SPFieldType.Currency:
      config.minValue = field.MinimumValue;
      config.maxValue = field.MaximumValue;
      config.decimals = field.Decimals !== undefined ? field.Decimals : 2;
      config.currencyLocaleId = field.CurrencyLocaleId;
      config.currencySymbol = currencySymbolForLocale(field.CurrencyLocaleId);
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
    case SPFieldType.UserMulti:
      config.allowMultiple = field.AllowMultipleValues || false;
      config.selectionMode = field.SelectionMode; // 0 = PeopleOnly, 1 = PeopleAndGroups
      config.selectionGroup = field.SelectionGroup; // Group ID to limit selection
      config.presenceOnline = field.Presence || false;
      break;

    case SPFieldType.Lookup:
    case SPFieldType.LookupMulti:
      config.lookupListId = field.LookupList;
      config.lookupField = field.LookupField || 'Title';
      config.lookupWebId = field.LookupWebId; // For cross-site lookups
      config.allowMultiple = field.AllowMultipleValues || false;
      config.relationshipDeleteBehavior = field.RelationshipDeleteBehavior; // 0 = None, 1 = Cascade, 2 = Restrict
      config.unlimitedLength = field.UnlimitedLengthInDocumentLibrary || false;
      break;

    case SPFieldType.TaxonomyFieldType:
    case SPFieldType.TaxonomyFieldTypeMulti:
      config.termSetId = field.TermSetId;
      config.anchorId = field.AnchorId;
      config.allowMultiple = field.AllowMultipleValues || false;
      config.isPathRendered = field.IsPathRendered || false; // Show full path
      config.open = field.Open || false; // Allow fill-in values
      config.sspId = field.SspId; // Term store ID
      config.termStoreId = field.TermStoreId;
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
  if (
    (fieldType === SPFieldType.Lookup || fieldType === SPFieldType.LookupMulti) &&
    fieldConfig.lookupListId
  ) {
    metadata.isLookup = true;
    metadata.lookupListId = fieldConfig.lookupListId;
  }

  return metadata;
}

// System fields are always dropped — they're not user-editable from a form
// regardless of mode or override. This list mirrors SP's "do not edit"
// surface and is intentionally absolute.
const SYSTEM_FIELDS: ReadonlyArray<string> = [
  'ID',
  'ContentTypeId',
  'ContentType',
  'GUID',
  'UniqueId',
  'owshiddenversion',
  '_ModerationStatus',
  '_Level',
  'Edit',
  'LinkTitle',
  'LinkTitleNoMenu',
  'LinkFilename',
  'LinkFilenameNoMenu',
  'LinkFilename2',
  'SelectTitle',
  'SelectFilename',
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
  'Last_x0020_Modified',
  'Created_x0020_Date',
  'FSObjType',
  'PermMask',
  'FileSystemObjectType',
  'File_x0020_Type',
  'HTML_x0020_File_x0020_Type',
  'Created_x0020_By',
  'Modified_x0020_By',
  '_CopySource',
  'WorkflowVersion',
  '_UIVersion',
  '_EditMenuTableStart',
  '_EditMenuTableEnd',
  'ServerUrl',
  'EncodedAbsUrl',
  'BaseName',
  'FileSizeDisplay',
  '_HasCopyDestinations',
  'ContentVersion',
  '_VirusStatus',
  'CheckedOutUserId',
  'CheckedOutTitle',
  'IsCheckedoutToLocal',
  'CheckoutUser',
  'SyncClientId',
  'VirusStatus',
  'ScopeId',
  'SMTotalSize',
  'SMLastModifiedDate',
  'SMTotalFileStreamSize',
  'SMTotalFileCount',
  'File_x0020_Size',
  'FileSize',
  'SortType',
  'ParentVersionString',
  'ParentLeafName',
  '_SourceUrl',
  '_SharedFileIndex',
  'NoExecute',
  'AccessPolicy',
  'ProgId',
  '_ComplianceFlags',
  '_ComplianceTag',
  '_ComplianceTagWrittenTime',
  '_ComplianceTagUserId',
  '_IsRecord',
  '_CommentCount',
  '_LikeCount',
  'PropertyBag',
  'BlobSequenceNumber',
  'DocumentConcurrencyNumber',
  'DocumentStreamHash',
  'ParentUniqueId',
  'StreamHash',
  'TriggerFlowInfo',
  'SourceVersion',
  'SourceName',
  'SourceVersionConvertedDocument',
  'SourceNameConvertedDocument',
  // SharePoint's hidden taxonomy join fields. SP exposes these in `/fields`
  // for any list with at least one taxonomy column, but they are NOT user-
  // editable and `TaxCatchAllLabel` was deprecated on items in modern SPO
  // (a `$select` referencing it returns 400 "property does not exist").
  // Always exclude — overrides cannot un-hide these.
  'TaxCatchAll',
  'TaxCatchAllLabel',
  // Deprecated SPO system field. Still appears in `/fields` on some lists
  // but rejected by `$select` on items.
  'MetaInfo',
];

function isInternalCompanionField(field: IFieldMetadata): boolean {
  const internalName = field.internalName || '';

  // Hidden note companion for managed-metadata/image tags fields. SharePoint
  // commonly names these `${visibleField}_0`; CT field links may mark them as
  // not hidden, so they need fetch-time exclusion.
  if (internalName.endsWith('_0')) return true;

  // Some hidden companion fields are exposed by a compact GUID-like internal
  // name rather than `${field}_0` (as seen on modern document libraries).
  if (/^[0-9a-f]{32}$/i.test(internalName)) return true;

  return false;
}

export function getEditableSchemaExclusionReason(
  field: IFieldMetadata,
  excludeFields: string[] = []
): string | null {
  if (excludeFields.includes(field.internalName)) return 'consumer-excluded';
  if (SYSTEM_FIELDS.includes(field.internalName)) return 'sharepoint-system-field';
  if (isInternalCompanionField(field)) return 'sharepoint-internal-companion-field';
  return null;
}

/**
 * Fetch-time absolute filter — drops system fields and consumer-excluded
 * fields. These exclusions cannot be reversed by a `fieldOverride`. Hidden
 * and readOnly handling moved to `filterFieldsByModeFlags` so an override
 * can flip those at render time.
 *
 * Audit context: previously `filterFieldsByMode` did all four filters at
 * fetch time. That meant `<SPDynamicForm fieldOverrides={[{ field: 'X',
 * hidden: false }]} />` could not un-hide an SP-hidden field — the field
 * was already gone before override resolution ran.
 */
export function filterToEditableSchema(
  fields: IFieldMetadata[],
  excludeFields: string[] = []
): IFieldMetadata[] {
  return fields.filter((field) => {
    return getEditableSchemaExclusionReason(field, excludeFields) === null;
  });
}

/**
 * Render-time pass — applied AFTER `applyFieldOverrides`. Reads the
 * override-resolved `hidden` / `readOnly` flags so consumer overrides can
 * un-hide or un-readOnly fields the SP schema marks otherwise.
 */
export function filterFieldsByModeFlags(
  fields: IFieldMetadata[],
  mode: 'new' | 'edit' | 'view'
): IFieldMetadata[] {
  return fields.filter((field) => {
    if (field.hidden) return false;
    if (mode === 'view') return true;
    if (mode === 'new') {
      // New mode: drop readOnly fields that have no default (nothing to set).
      // Keep readOnly with defaults so CT-defaults surface in the form.
      if (field.readOnly && !field.defaultValue) return false;
    }
    if (mode === 'edit') {
      // Edit mode: drop readOnly fields. A consumer override of
      // `readOnly: false` makes the field editable here.
      if (field.readOnly) return false;
    }
    return true;
  });
}

/**
 * Legacy combined filter. Kept for callers that still want the
 * fetch-time behavior. Internally composes the new split — system fields
 * + excludeFields, then mode/hidden flags.
 *
 * @deprecated Prefer `filterToEditableSchema` at fetch time and
 * `filterFieldsByModeFlags` at render time so consumer overrides on
 * `hidden` / `readOnly` can take effect.
 */
export function filterFieldsByMode(
  fields: IFieldMetadata[],
  mode: 'new' | 'edit' | 'view',
  excludeFields: string[] = []
): IFieldMetadata[] {
  return filterFieldsByModeFlags(
    filterToEditableSchema(fields, excludeFields),
    mode
  );
}

/**
 * Sorts fields by order property
 */
export function sortFieldsByOrder(fields: IFieldMetadata[]): IFieldMetadata[] {
  return [...fields].sort((a, b) => a.order - b.order);
}

/**
 * Apply a content-type FieldLink onto already-built field metadata.
 *
 * SharePoint's semantics: within a content type, the FieldLink wins for
 * `Hidden` and `Required` (and can override the field's display name).
 * The previous implementation OR-merged these flags, which could only
 * escalate them — a CT-fieldLink could not flip a site-required column
 * to optional within that CT, even though SP allows that configuration.
 *
 * Lives in `fieldMapper.ts` (alongside `buildFieldMetadata`) so it has no
 * SPFx-context transitive imports and can be unit-tested in isolation.
 */
export function applyFieldLinkToMetadata(
  metadata: IFieldMetadata,
  fieldLink: { Hidden?: boolean; Required?: boolean; DisplayName?: string }
): IFieldMetadata {
  if (typeof fieldLink.Hidden === 'boolean') metadata.hidden = fieldLink.Hidden;
  if (typeof fieldLink.Required === 'boolean') metadata.required = fieldLink.Required;

  const ctDisplayName = fieldLink.DisplayName;
  if (ctDisplayName && ctDisplayName.trim() && ctDisplayName !== metadata.displayName) {
    metadata.displayName = ctDisplayName;
  }
  return metadata;
}

/**
 * Maps SharePoint CurrencyLocaleId to a currency symbol. The list is not
 * exhaustive but covers the common locales SharePoint Online tenants use.
 * Falls back to '$' when the locale is unknown — matching the pre-existing
 * default behaviour for unknown currencies.
 */
const CURRENCY_SYMBOLS: Record<number, string> = {
  1033: '$',   // en-US
  2057: '£',   // en-GB
  3081: '$',   // en-AU
  3084: '$',   // fr-CA
  4105: '$',   // en-CA
  1031: '€',   // de-DE
  1036: '€',   // fr-FR
  1040: '€',   // it-IT
  1041: '¥',   // ja-JP
  2052: '¥',   // zh-CN
  1043: '€',   // nl-NL
  1053: 'kr',  // sv-SE
  1049: '₽',   // ru-RU
  1081: '₹',   // hi-IN
  1078: 'R',   // af-ZA
  1054: '฿',   // th-TH
};

function currencySymbolForLocale(localeId: number | undefined): string {
  if (typeof localeId !== 'number') return '$';
  return CURRENCY_SYMBOLS[localeId] || '$';
}
