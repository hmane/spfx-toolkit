import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { IFieldMetadata } from '../types/fieldMetadata';
import { applyFieldLinkToMetadata, buildFieldMetadata } from './fieldMapper';

export { applyFieldLinkToMetadata } from './fieldMapper';

function findDuplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
      return;
    }
    seen.add(value);
  });
  return Array.from(duplicates);
}

function summarizeRawFieldsForDebug(fields: any[]): Array<Record<string, unknown>> {
  return fields.map((field) => ({
    internalName: field.InternalName || field.EntityPropertyName,
    entityPropertyName: field.EntityPropertyName,
    title: field.Title,
    typeAsString: field.TypeAsString,
    fieldTypeKind: field.FieldTypeKind,
    hidden: field.Hidden,
    readOnly: field.ReadOnlyField,
    required: field.Required,
    group: field.Group,
    id: field.Id,
  }));
}

function summarizeFieldLinksForDebug(fieldLinks: any[]): Array<Record<string, unknown>> {
  return fieldLinks.map((fieldLink, index) => ({
    index,
    name: fieldLink.Name,
    fieldInternalName: fieldLink.FieldInternalName,
    displayName: fieldLink.DisplayName,
    hidden: fieldLink.Hidden,
    required: fieldLink.Required,
    id: fieldLink.Id,
  }));
}

/**
 * Loads fields from SharePoint list with ContentType ordering
 */
export async function loadFieldsFromContentType(
  listId: string,
  contentTypeId: string
): Promise<IFieldMetadata[]> {
  const timer = SPContext.logger.startTimer('loadFieldsFromContentType');

  try {
    const list = getListByNameOrId(SPContext.sp, listId);

    // Get ContentType fields with order
    const contentTypeRef = list.contentTypes.getById(contentTypeId);
    const contentType = await contentTypeRef();
    const [fields, fieldLinks] = await Promise.all([contentTypeRef.fields(), contentTypeRef.fieldLinks()]);

    SPContext.logger.info(
      `Loaded ${fields.length} fields from ContentType "${contentType.Name}"`
    );
    SPContext.logger.debug('SPDynamicForm: raw content type schema loaded', {
      listId,
      contentTypeId,
      contentTypeRaw: contentType,
      fieldsRaw: fields,
      fieldLinksRaw: fieldLinks,
    });
    SPContext.logger.debug('SPDynamicForm: content type schema diagnostics', {
      listId,
      contentTypeId,
      contentTypeName: contentType.Name,
      rawFieldCount: fields.length,
      fieldLinkCount: fieldLinks.length,
      duplicateFieldInternalNames: findDuplicateValues(
        fields.map((field: any) => field.InternalName || field.EntityPropertyName).filter(Boolean)
      ),
      rawFieldSummary: summarizeRawFieldsForDebug(fields),
      fieldLinkSummary: summarizeFieldLinksForDebug(fieldLinks),
    });

    const metadataByInternalName = new Map<string, IFieldMetadata>();
    fields.forEach((field, index) => {
      const metadata = buildFieldMetadata(field, index);
      metadataByInternalName.set(metadata.internalName, metadata);
    });

    const fieldMetadata: IFieldMetadata[] = [];

    fieldLinks.forEach((fieldLink: any, index) => {
      const fieldInternalName = fieldLink.FieldInternalName || fieldLink.Name;
      if (!fieldInternalName) {
        return;
      }

      const metadata = metadataByInternalName.get(fieldInternalName);
      if (!metadata) {
        return;
      }

      metadata.order = index;
      applyFieldLinkToMetadata(metadata, fieldLink);

      fieldMetadata.push(metadata);
      metadataByInternalName.delete(fieldInternalName);
    });

    metadataByInternalName.forEach((metadata) => {
      metadata.order = fieldMetadata.length;
      fieldMetadata.push(metadata);
    });
    SPContext.logger.debug('SPDynamicForm: content type field-link reconciliation', {
      listId,
      contentTypeId,
      fieldLinksWithoutFields: fieldLinks
        .map((fieldLink: any) => fieldLink.FieldInternalName || fieldLink.Name)
        .filter((fieldInternalName: string | undefined) =>
          !!fieldInternalName && !fieldMetadata.some((field) => field.internalName === fieldInternalName)
        ),
      fieldsNotInFieldLinks: fields
        .map((field: any) => field.InternalName || field.EntityPropertyName)
        .filter((fieldInternalName: string | undefined) =>
          !!fieldInternalName &&
          !fieldLinks.some((fieldLink: any) =>
            (fieldLink.FieldInternalName || fieldLink.Name) === fieldInternalName
          )
        ),
      hiddenFieldNames: fieldMetadata.filter((field) => field.hidden).map((field) => field.internalName),
      readOnlyFieldNames: fieldMetadata.filter((field) => field.readOnly).map((field) => field.internalName),
      requiredFieldNames: fieldMetadata.filter((field) => field.required).map((field) => field.internalName),
    });

    const duration = timer();
    SPContext.logger.success(
      `Loaded ${fieldMetadata.length} fields from ContentType in ${duration}ms`
    );
    SPContext.logger.debug('SPDynamicForm: content type field metadata resolved', {
      listId,
      contentTypeId,
      fieldCount: fieldMetadata.length,
      fields: fieldMetadata,
    });

    return fieldMetadata;
  } catch (error) {
    const duration = timer();
    SPContext.logger.error(
      `Failed to load fields from ContentType "${contentTypeId}"`,
      error,
      { duration }
    );
    throw error;
  }
}

/**
 * Loads fields from SharePoint list (without ContentType)
 */
export async function loadFieldsFromList(listId: string): Promise<IFieldMetadata[]> {
  const timer = SPContext.logger.startTimer('loadFieldsFromList');

  try {
    const list = getListByNameOrId(SPContext.sp, listId);

    // Get all fields (filter hidden in a separate step)
    const fields = await list.fields();

    SPContext.logger.info(`Loaded ${fields.length} fields from list`);
    SPContext.logger.debug('SPDynamicForm: raw list fields loaded', {
      listId,
      fieldsRaw: fields,
    });
    SPContext.logger.debug('SPDynamicForm: list field schema diagnostics', {
      listId,
      rawFieldCount: fields.length,
      duplicateFieldInternalNames: findDuplicateValues(
        fields.map((field: any) => field.InternalName || field.EntityPropertyName).filter(Boolean)
      ),
      rawFieldSummary: summarizeRawFieldsForDebug(fields),
    });

    // Preserve SharePoint's returned order instead of imposing an alphabetical fallback.
    const fieldMetadata = fields.map((field, index) => buildFieldMetadata(field, index));

    const duration = timer();
    SPContext.logger.success(`Loaded ${fieldMetadata.length} fields from list in ${duration}ms`);
    SPContext.logger.debug('SPDynamicForm: list field metadata resolved', {
      listId,
      fieldCount: fieldMetadata.length,
      fields: fieldMetadata,
    });

    return fieldMetadata;
  } catch (error) {
    const duration = timer();
    SPContext.logger.error(`Failed to load fields from list "${listId}"`, error, { duration });
    throw error;
  }
}

/**
 * Resolves field order based on configuration
 */
export async function resolveFieldOrder(
  listId: string,
  contentTypeId?: string,
  useContentTypeOrder: boolean = true,
  manualFieldOrder?: string[]
): Promise<IFieldMetadata[]> {
  let fields: IFieldMetadata[];

  // Try to load from ContentType first (if enabled)
  if (useContentTypeOrder && contentTypeId) {
    try {
      fields = await loadFieldsFromContentType(listId, contentTypeId);
    } catch (error) {
      SPContext.logger.warn(
        'Failed to load fields from ContentType, falling back to list fields',
        error
      );
      fields = await loadFieldsFromList(listId);
    }
  } else {
    fields = await loadFieldsFromList(listId);
  }

  // Apply manual field order if provided
  if (manualFieldOrder && manualFieldOrder.length > 0) {
    fields = applyManualFieldOrder(fields, manualFieldOrder);
  }

  return fields;
}

/**
 * Applies manual field ordering
 */
export function applyManualFieldOrder(
  fields: IFieldMetadata[],
  fieldOrder: string[]
): IFieldMetadata[] {
  const fieldMap = new Map(fields.map((f) => [f.internalName, f]));
  const orderedFields: IFieldMetadata[] = [];
  const remainingFields: IFieldMetadata[] = [];

  // First, add fields in the specified order
  fieldOrder.forEach((internalName, index) => {
    const field = fieldMap.get(internalName);
    if (field) {
      field.order = index;
      orderedFields.push(field);
      fieldMap.delete(internalName);
    }
  });

  // Then, add any remaining fields
  fieldMap.forEach((field) => {
    field.order = orderedFields.length + remainingFields.length;
    remainingFields.push(field);
  });

  const result = [...orderedFields, ...remainingFields];

  SPContext.logger.info(
    `Applied manual field order: ${orderedFields.length} ordered, ${remainingFields.length} remaining`
  );

  return result;
}

/**
 * Filters fields to only include specified fields
 */
export function filterToSpecifiedFields(
  fields: IFieldMetadata[],
  specifiedFields: string[]
): IFieldMetadata[] {
  if (!specifiedFields || specifiedFields.length === 0) {
    return fields;
  }

  const fieldMap = new Map(fields.map((f) => [f.internalName, f]));
  const result: IFieldMetadata[] = [];

  specifiedFields.forEach((internalName, index) => {
    const field = fieldMap.get(internalName);
    if (field) {
      field.order = index;
      result.push(field);
    } else {
      SPContext.logger.warn(`Specified field "${internalName}" not found in list schema`);
    }
  });

  SPContext.logger.info(`Filtered to ${result.length} specified fields`);

  return result;
}
