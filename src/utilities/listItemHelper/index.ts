// ========================================
// CORE EXPORTS - Main factory functions
// ========================================

// Primary extractor and updater factories
export { createSPExtractor } from './spExtractor';
export { createSPUpdater } from './spUpdater';

// ========================================
// CONVENIENCE FUNCTIONS - Ready-to-use utilities
// ========================================

import { createSPExtractor } from './spExtractor';
import { createSPUpdater } from './spUpdater';

/**
 * Extract a single field value from SharePoint item
 * Convenience function for one-off extractions
 */
export const extractField = <T = any>(
  item: any,
  fieldName: string,
  fieldType:
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'user'
    | 'lookup'
    | 'taxonomy'
    | 'choice'
    | 'url'
    | 'json' = 'string',
  defaultValue?: T
): T => {
  const extractor = createSPExtractor(item);

  switch (fieldType) {
    case 'string':
      return extractor.string(fieldName, defaultValue as string) as T;
    case 'number':
      return extractor.number(fieldName, defaultValue as number) as T;
    case 'boolean':
      return extractor.boolean(fieldName, defaultValue as boolean) as T;
    case 'date':
      return extractor.date(fieldName, defaultValue as Date) as T;
    case 'user':
      return extractor.user(fieldName) as T;
    case 'lookup':
      return extractor.lookup(fieldName) as T;
    case 'taxonomy':
      return extractor.taxonomy(fieldName) as T;
    case 'choice':
      return extractor.choice(fieldName, defaultValue as string) as T;
    case 'url':
      return extractor.url(fieldName) as T;
    case 'json':
      return extractor.json(fieldName) as T;
    default:
      return extractor.string(fieldName, defaultValue as string) as T;
  }
};

/**
 * Quick field update without creating updater instance
 * Useful for single field updates
 */
export const quickUpdate = (
  fieldName: string,
  value: any,
  originalValue?: any
): Record<string, any> => {
  const updater = createSPUpdater();
  return updater.set(fieldName, value, originalValue).getUpdates();
};

/**
 * Quick validation update for single field
 */
export const quickValidateUpdate = (fieldName: string, value: any, originalValue?: any) => {
  const updater = createSPUpdater();
  return updater.set(fieldName, value, originalValue).getValidateUpdates();
};

/**
 * Batch extract multiple fields from an item
 */
export const extractFields = (
  item: any,
  fieldMappings: Record<string, { type: string; defaultValue?: any }>
): Record<string, any> => {
  const extractor = createSPExtractor(item);
  const result: Record<string, any> = {};

  for (const [fieldName, config] of Object.entries(fieldMappings)) {
    result[fieldName] = extractField(item, fieldName, config.type as any, config.defaultValue);
  }

  return result;
};

/**
 * Transform SharePoint item to a clean object with specified field mappings
 */
export const transformItem = (
  item: any,
  fieldMappings: Record<string, string | { sourceField: string; type: string; defaultValue?: any }>
): Record<string, any> => {
  const extractor = createSPExtractor(item);
  const result: Record<string, any> = {};

  for (const [targetField, mapping] of Object.entries(fieldMappings)) {
    if (typeof mapping === 'string') {
      // Simple field mapping
      result[targetField] = extractor.string(mapping);
    } else {
      // Advanced mapping with type and default
      result[targetField] = extractField(
        item,
        mapping.sourceField,
        mapping.type as any,
        mapping.defaultValue
      );
    }
  }

  return result;
};

// ========================================
// ENHANCED UPDATE UTILITIES
// ========================================

/**
 * Create updates with change detection from original item
 * Compares new values against original item and only includes changed fields
 */
export const createUpdatesFromItem = (
  originalItem: any,
  newValues: Record<string, any>
): Record<string, any> => {
  const updater = createSPUpdater();

  for (const [fieldName, newValue] of Object.entries(newValues)) {
    const originalValue = originalItem?.[fieldName];
    updater.set(fieldName, newValue, originalValue);
  }

  return updater.getUpdates();
};

/**
 * Create validate updates with change detection from original item
 */
export const createValidateUpdatesFromItem = (
  originalItem: any,
  newValues: Record<string, any>
) => {
  const updater = createSPUpdater();

  for (const [fieldName, newValue] of Object.entries(newValues)) {
    const originalValue = originalItem?.[fieldName];
    updater.set(fieldName, newValue, originalValue);
  }

  return updater.getValidateUpdates();
};

/**
 * Compare two SharePoint items and get field differences
 */
export const compareItems = (
  originalItem: any,
  newItem: any,
  fieldNames?: string[]
): {
  hasChanges: boolean;
  changedFields: string[];
  unchangedFields: string[];
  changes: Record<string, { from: any; to: any }>;
} => {
  const updater = createSPUpdater();
  const fieldsToCompare = fieldNames || [
    ...new Set([...Object.keys(originalItem || {}), ...Object.keys(newItem || {})]),
  ];

  // Add all fields to updater for comparison
  for (const fieldName of fieldsToCompare) {
    const originalValue = originalItem?.[fieldName];
    const newValue = newItem?.[fieldName];
    updater.set(fieldName, newValue, originalValue);
  }

  const summary = updater.getChangeSummary();

  // Build changes object
  const changes: Record<string, { from: any; to: any }> = {};
  for (const fieldName of summary.changedFields) {
    changes[fieldName] = {
      from: updater.getFieldOriginalValue(fieldName),
      to: updater.getFieldValue(fieldName),
    };
  }

  return {
    hasChanges: summary.hasChanges,
    changedFields: summary.changedFields,
    unchangedFields: summary.unchangedFields,
    changes,
  };
};

/**
 * Batch update multiple items with change detection
 */
export const batchUpdateItems = (
  updates: Array<{
    originalItem: any;
    newValues: Record<string, any>;
    itemId?: number;
  }>
): Array<{
  itemId?: number;
  updates: Record<string, any>;
  hasChanges: boolean;
  changedFields: string[];
}> => {
  return updates.map(({ originalItem, newValues, itemId }) => {
    const updater = createSPUpdater();

    for (const [fieldName, newValue] of Object.entries(newValues)) {
      const originalValue = originalItem?.[fieldName];
      updater.set(fieldName, newValue, originalValue);
    }

    return {
      itemId,
      updates: updater.getUpdates(),
      hasChanges: updater.hasChanges(),
      changedFields: updater.getChangedFields(),
    };
  });
};

// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * Validate if an item has required fields
 */
export const validateRequiredFields = (
  item: any,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } => {
  if (!item) {
    return { isValid: false, missingFields: requiredFields };
  }

  const extractor = createSPExtractor(item);
  const missingFields = extractor.missingFields(...requiredFields);

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Check if field values are empty/null
 */
export const validateFieldValues = (
  item: any,
  fieldNames: string[]
): { isValid: boolean; emptyFields: string[] } => {
  const extractor = createSPExtractor(item);
  const emptyFields: string[] = [];

  for (const fieldName of fieldNames) {
    const value = extractor.raw[fieldName];
    if (value === null || value === undefined || value === '') {
      emptyFields.push(fieldName);
    }
  }

  return {
    isValid: emptyFields.length === 0,
    emptyFields,
  };
};

/**
 * Validate updates before applying them
 */
export const validateUpdates = (
  updates: Record<string, any>,
  rules?: {
    required?: string[];
    notEmpty?: string[];
    customValidators?: Record<string, (value: any) => boolean | string>;
  }
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rules?.required) {
    for (const fieldName of rules.required) {
      if (
        !(fieldName in updates) ||
        updates[fieldName] === null ||
        updates[fieldName] === undefined
      ) {
        errors.push(`Required field '${fieldName}' is missing or null`);
      }
    }
  }

  if (rules?.notEmpty) {
    for (const fieldName of rules.notEmpty) {
      const value = updates[fieldName];
      if (value === '' || (Array.isArray(value) && value.length === 0)) {
        errors.push(`Field '${fieldName}' cannot be empty`);
      }
    }
  }

  if (rules?.customValidators) {
    for (const [fieldName, validator] of Object.entries(rules.customValidators)) {
      if (fieldName in updates) {
        const result = validator(updates[fieldName]);
        if (typeof result === 'string') {
          errors.push(`Field '${fieldName}': ${result}`);
        } else if (result === false) {
          errors.push(`Field '${fieldName}' failed validation`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ========================================
// FIELD TYPE DETECTION
// ========================================

/**
 * Detect the probable SharePoint field type from a value
 */
export const detectFieldType = (value: any): string => {
  if (value === null || value === undefined) return 'unknown';

  if (typeof value === 'string') return 'text';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'datetime';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'array';

    const firstItem = value[0];
    if (typeof firstItem === 'string') return 'choice_multi';
    if (firstItem && typeof firstItem === 'object') {
      if ('email' in firstItem) return 'user_multi';
      if ('id' in firstItem && 'title' in firstItem) return 'lookup_multi';
      if ('label' in firstItem && 'termId' in firstItem) return 'taxonomy_multi';
    }
    return 'array';
  }

  if (typeof value === 'object') {
    if ('email' in value && 'id' in value) return 'user';
    if ('id' in value && 'title' in value) return 'lookup';
    if ('label' in value && 'termId' in value) return 'taxonomy';
    if ('url' in value) return 'url';
    if ('latitude' in value && 'longitude' in value) return 'location';
    if ('fileName' in value) return 'image';
    return 'object';
  }

  return 'unknown';
};

// ========================================
// MIGRATION UTILITIES
// ========================================

/**
 * Convert items from one field structure to another
 * Useful for list migrations or field renames
 */
export const migrateFields = (
  items: any[],
  fieldMigrationMap: Record<string, string | { newField: string; transform?: (value: any) => any }>
): any[] => {
  return items.map(item => {
    const result = { ...item };

    for (const [oldField, mapping] of Object.entries(fieldMigrationMap)) {
      const value = item[oldField];

      if (typeof mapping === 'string') {
        // Simple rename
        result[mapping] = value;
        delete result[oldField];
      } else {
        // Rename with transformation
        const transformedValue = mapping.transform ? mapping.transform(value) : value;
        result[mapping.newField] = transformedValue;
        delete result[oldField];
      }
    }

    return result;
  });
};

/**
 * Migrate items with change detection and update generation
 */
export const migrateItemsWithUpdates = (
  items: any[],
  fieldMigrationMap: Record<string, string | { newField: string; transform?: (value: any) => any }>,
  generateUpdates = true
): Array<{
  originalItem: any;
  migratedItem: any;
  updates?: Record<string, any>;
  hasChanges?: boolean;
  changedFields?: string[];
}> => {
  return items.map(item => {
    const migratedItem = migrateFields([item], fieldMigrationMap)[0];

    let updates, hasChanges, changedFields;

    if (generateUpdates) {
      const comparison = compareItems(item, migratedItem);
      updates = createUpdatesFromItem(item, migratedItem);
      hasChanges = comparison.hasChanges;
      changedFields = comparison.changedFields;
    }

    return {
      originalItem: item,
      migratedItem,
      updates,
      hasChanges,
      changedFields,
    };
  });
};

// ========================================
// CONSTANTS AND UTILITIES
// ========================================

export const FIELD_TYPE_CONSTANTS = {
  // SharePoint internal field types
  FIELD_TYPES: {
    TEXT: 'Text',
    NOTE: 'Note',
    NUMBER: 'Number',
    CURRENCY: 'Currency',
    DATETIME: 'DateTime',
    BOOLEAN: 'Boolean',
    CHOICE: 'Choice',
    MULTICHOICE: 'MultiChoice',
    LOOKUP: 'Lookup',
    USER: 'User',
    URL: 'URL',
    TAXONOMY: 'TaxonomyFieldType',
    LOCATION: 'Location',
    IMAGE: 'Thumbnail',
  },

  // Common field patterns
  PATTERNS: {
    ID_FIELDS: /Id$/,
    STRING_ID_FIELDS: /StringId$/,
    TITLE_FIELDS: /Title$/,
    NAME_FIELDS: /Name$/,
    DATE_FIELDS: /(Date|Time|Created|Modified)$/i,
    USER_FIELDS: /(Author|Editor|AssignedTo|CreatedBy|ModifiedBy)$/i,
  },
} as const;

/**
 * Common field mappings for standard SharePoint lists
 */
export const COMMON_FIELD_MAPPINGS = {
  BASIC_ITEM: {
    id: { sourceField: 'ID', type: 'number' },
    title: { sourceField: 'Title', type: 'string' },
    created: { sourceField: 'Created', type: 'date' },
    modified: { sourceField: 'Modified', type: 'date' },
    author: { sourceField: 'Author', type: 'user' },
    editor: { sourceField: 'Editor', type: 'user' },
  },

  DOCUMENT_LIBRARY: {
    id: { sourceField: 'ID', type: 'number' },
    name: { sourceField: 'FileLeafRef', type: 'string' },
    title: { sourceField: 'Title', type: 'string' },
    size: { sourceField: 'File_x0020_Size', type: 'number' },
    created: { sourceField: 'Created', type: 'date' },
    modified: { sourceField: 'Modified', type: 'date' },
  },
} as const;

// ========================================
// PERFORMANCE UTILITIES
// ========================================

/**
 * Check if an update operation is worth performing
 * Returns false if no actual changes would be made
 */
export const shouldPerformUpdate = (
  originalItem: any,
  newValues: Record<string, any>,
  options?: {
    ignoreFields?: string[];
    requiredFields?: string[];
  }
): {
  shouldUpdate: boolean;
  reason: string;
  changedFields: string[];
} => {
  const updater = createSPUpdater();
  const fieldsToCheck = Object.keys(newValues).filter(
    field => !options?.ignoreFields?.includes(field)
  );

  for (const fieldName of fieldsToCheck) {
    const originalValue = originalItem?.[fieldName];
    const newValue = newValues[fieldName];
    updater.set(fieldName, newValue, originalValue);
  }

  const hasChanges = updater.hasChanges();
  const changedFields = updater.getChangedFields();

  if (!hasChanges) {
    return {
      shouldUpdate: false,
      reason: 'No field changes detected',
      changedFields: [],
    };
  }

  if (options?.requiredFields?.length) {
    const hasRequiredChanges = options.requiredFields.some(field => changedFields.includes(field));

    if (!hasRequiredChanges) {
      return {
        shouldUpdate: false,
        reason: 'No changes in required fields',
        changedFields,
      };
    }
  }

  return {
    shouldUpdate: true,
    reason: `${changedFields.length} field(s) changed: ${changedFields.join(', ')}`,
    changedFields,
  };
};

/**
 * Optimize batch operations by filtering out items with no changes
 */
export const optimizeBatchUpdates = <
  T extends { originalItem: any; newValues: Record<string, any> }
>(
  items: T[],
  options?: {
    ignoreFields?: string[];
    requiredFields?: string[];
  }
): {
  itemsToUpdate: (T & { updates: Record<string, any>; changedFields: string[] })[];
  itemsSkipped: (T & { reason: string })[];
  summary: {
    total: number;
    toUpdate: number;
    skipped: number;
    totalChangedFields: number;
  };
} => {
  const itemsToUpdate: (T & { updates: Record<string, any>; changedFields: string[] })[] = [];
  const itemsSkipped: (T & { reason: string })[] = [];

  for (const item of items) {
    const shouldUpdate = shouldPerformUpdate(item.originalItem, item.newValues, options);

    if (shouldUpdate.shouldUpdate) {
      const updates = createUpdatesFromItem(item.originalItem, item.newValues);
      itemsToUpdate.push({
        ...item,
        updates,
        changedFields: shouldUpdate.changedFields,
      });
    } else {
      itemsSkipped.push({
        ...item,
        reason: shouldUpdate.reason,
      });
    }
  }

  return {
    itemsToUpdate,
    itemsSkipped,
    summary: {
      total: items.length,
      toUpdate: itemsToUpdate.length,
      skipped: itemsSkipped.length,
      totalChangedFields: itemsToUpdate.reduce((sum, item) => sum + item.changedFields.length, 0),
    },
  };
};

// ========================================
// DEBUGGING UTILITIES
// ========================================

/**
 * Debug utility to inspect field changes
 */
export const debugFieldChanges = (
  originalItem: any,
  newValues: Record<string, any>,
  options?: {
    includeUnchanged?: boolean;
    fieldNames?: string[];
  }
): {
  summary: string;
  details: Array<{
    fieldName: string;
    hasChanged: boolean;
    originalValue: any;
    newValue: any;
    normalizedOriginal: any;
    normalizedNew: any;
  }>;
} => {
  const updater = createSPUpdater();
  const fieldNames = options?.fieldNames || Object.keys(newValues);

  const details = fieldNames.map(fieldName => {
    const originalValue = originalItem?.[fieldName];
    const newValue = newValues[fieldName];

    updater.clear();
    updater.set(fieldName, newValue, originalValue);

    return {
      fieldName,
      hasChanged: updater.hasFieldChanged(fieldName),
      originalValue,
      newValue,
      normalizedOriginal: updater.getFieldOriginalValue(fieldName),
      normalizedNew: updater.getFieldValue(fieldName),
    };
  });

  const changed = details.filter(d => d.hasChanged);
  const unchanged = details.filter(d => !d.hasChanged);

  const summary = `Field Changes Debug:
  Total fields: ${details.length}
  Changed: ${changed.length} (${changed.map(d => d.fieldName).join(', ')})
  Unchanged: ${unchanged.length} (${unchanged.map(d => d.fieldName).join(', ')})`;

  return {
    summary,
    details: options?.includeUnchanged ? details : changed,
  };
};

// ========================================
// BACKWARD COMPATIBILITY
// ========================================

// Keep the original simple exports for existing code
/** @deprecated Use named exports for better tree-shaking */
export * from './spExtractor';
/** @deprecated Use named exports for better tree-shaking */
export * from './spUpdater';
