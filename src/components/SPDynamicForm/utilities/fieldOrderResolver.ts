import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { IFieldMetadata } from '../types/fieldMetadata';
import { buildFieldMetadata } from './fieldMapper';

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
    const contentType = await list.contentTypes.getById(contentTypeId)();
    const fields = await list.contentTypes.getById(contentTypeId).fields();

    SPContext.logger.info(
      `Loaded ${fields.length} fields from ContentType "${contentType.Name}"`
    );

    // Build field metadata with order from FieldLinks
    const fieldMetadata: IFieldMetadata[] = [];
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const metadata = buildFieldMetadata(field, i);
      fieldMetadata.push(metadata);
    }

    const duration = timer();
    SPContext.logger.success(
      `Loaded ${fieldMetadata.length} fields from ContentType in ${duration}ms`
    );

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

    // Build field metadata (order by Title alphabetically)
    const fieldMetadata = fields
      .map((field, index) => buildFieldMetadata(field, index))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Reassign order after sorting
    fieldMetadata.forEach((field, index) => {
      field.order = index;
    });

    const duration = timer();
    SPContext.logger.success(`Loaded ${fieldMetadata.length} fields from list in ${duration}ms`);

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
