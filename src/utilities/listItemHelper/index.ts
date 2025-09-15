// ========================================
// CORE EXPORTS - Main factory functions
// ========================================

// Primary extractor and updater factories
export { createSPExtractor } from './spExtractor';
export { createSPUpdater } from './spUpdater';

// ========================================
// TYPE EXPORTS - For better TypeScript support
// ========================================

// Re-export relevant types for convenience
export type {
  IPrincipal,
  SPImage,
  SPLocation,
  SPLookup,
  SPTaxonomy,
  SPUrl,
  IListItemFormUpdateValue,
} from '../../types';

// ========================================
// CONVENIENCE FUNCTIONS - Ready-to-use utilities
// ========================================

import { createSPExtractor } from './spExtractor';
import { createSPUpdater } from './spUpdater';
import type { IPrincipal, SPLookup, SPTaxonomy } from '../../types';

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
export const quickUpdate = (fieldName: string, value: any): Record<string, any> => {
  const updater = createSPUpdater();
  return updater.set(fieldName, value).getUpdates();
};

/**
 * Quick validation update for single field
 */
export const quickValidateUpdate = (fieldName: string, value: any) => {
  const updater = createSPUpdater();
  return updater.set(fieldName, value).getValidateUpdates();
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
// BACKWARD COMPATIBILITY
// ========================================

// Keep the original simple exports for existing code
/** @deprecated Use named exports for better tree-shaking */
export * from './spExtractor';
/** @deprecated Use named exports for better tree-shaking */
export * from './spUpdater';
