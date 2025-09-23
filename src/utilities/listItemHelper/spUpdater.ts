/**
 * Enhanced SharePoint field updater with change detection and improved type handling
 * File: spUpdater.ts
 */

import { isEqual } from '@microsoft/sp-lodash-subset';
import { IListItemFormUpdateValue, IPrincipal } from '../../types';

interface FieldUpdate {
  fieldName: string;
  value: any;
  originalValue?: any;
  hasChanged: boolean;
}

export function createSPUpdater() {
  const fieldUpdates: FieldUpdate[] = [];

  return {
    /**
     * Set a field value with optional change detection
     * @param fieldName - Internal field name
     * @param value - Value to set (string, number, boolean, Date, object, array)
     * @param originalValue - Optional original value for change detection
     */
    set: function (fieldName: string, value: any, originalValue?: any) {
      if (!fieldName) {
        throw new Error('Field name is required');
      }

      // Normalize the value based on SharePoint field type patterns
      const normalizedValue = normalizeValueByFieldType(fieldName, value);

      // Determine if the value has actually changed
      let hasChanged = true;
      if (originalValue !== undefined) {
        const normalizedOriginal = normalizeValueByFieldType(fieldName, originalValue);
        hasChanged = !isEqual(normalizedValue, normalizedOriginal);
      }

      // Find existing update for this field and replace it, or add new one
      const existingIndex = fieldUpdates.findIndex(update => update.fieldName === fieldName);
      const update: FieldUpdate = {
        fieldName,
        value: normalizedValue,
        originalValue,
        hasChanged,
      };

      if (existingIndex >= 0) {
        fieldUpdates[existingIndex] = update;
      } else {
        fieldUpdates.push(update);
      }

      return this; // Enable chaining
    },

    /**
     * Get updates for PnP.js direct methods (item.update(), items.add())
     * Only includes fields that have actually changed
     */
    getUpdates: function (includeUnchanged = false): Record<string, any> {
      const updates: Record<string, any> = {};
      const relevantUpdates = includeUnchanged
        ? fieldUpdates
        : fieldUpdates.filter(update => update.hasChanged);

      for (const update of relevantUpdates) {
        const { fieldName, value } = update;
        const formattedUpdate = formatValueForPnP(fieldName, value);
        Object.assign(updates, formattedUpdate);
      }

      return updates;
    },

    /**
     * Get updates for PnP.js validate methods
     * Only includes fields that have actually changed
     */
    getValidateUpdates: function (includeUnchanged = false): IListItemFormUpdateValue[] {
      const relevantUpdates = includeUnchanged
        ? fieldUpdates
        : fieldUpdates.filter(update => update.hasChanged);

      return relevantUpdates.map(update => {
        const { fieldName, value } = update;
        return {
          FieldName: fieldName,
          FieldValue: formatValueForValidate(value),
        };
      });
    },

    /**
     * Check if any fields have actually changed
     */
    hasChanges: function (): boolean {
      return fieldUpdates.some(update => update.hasChanged);
    },

    /**
     * Get list of field names that have changed
     */
    getChangedFields: function (): string[] {
      return fieldUpdates.filter(update => update.hasChanged).map(update => update.fieldName);
    },

    /**
     * Get list of field names that were set but unchanged
     */
    getUnchangedFields: function (): string[] {
      return fieldUpdates.filter(update => !update.hasChanged).map(update => update.fieldName);
    },

    /**
     * Get detailed change summary
     */
    getChangeSummary: function (): {
      totalFields: number;
      changedFields: string[];
      unchangedFields: string[];
      hasChanges: boolean;
    } {
      const changedFields = this.getChangedFields();
      const unchangedFields = this.getUnchangedFields();

      return {
        totalFields: fieldUpdates.length,
        changedFields,
        unchangedFields,
        hasChanges: changedFields.length > 0,
      };
    },

    /**
     * Clear all updates
     */
    clear: function () {
      fieldUpdates.length = 0;
      return this;
    },

    /**
     * Get count of pending updates (changed only by default)
     */
    count: function (includeUnchanged = false): number {
      return includeUnchanged
        ? fieldUpdates.length
        : fieldUpdates.filter(update => update.hasChanged).length;
    },

    /**
     * Check if a field has been set
     */
    hasField: function (fieldName: string): boolean {
      return fieldUpdates.some(update => update.fieldName === fieldName);
    },

    /**
     * Check if a specific field has changed
     */
    hasFieldChanged: function (fieldName: string): boolean {
      const update = fieldUpdates.find(update => update.fieldName === fieldName);
      return update ? update.hasChanged : false;
    },

    /**
     * Get the current value for a field
     */
    getFieldValue: function (fieldName: string): any {
      const update = fieldUpdates.find(update => update.fieldName === fieldName);
      return update ? update.value : undefined;
    },

    /**
     * Get the original value for a field
     */
    getFieldOriginalValue: function (fieldName: string): any {
      const update = fieldUpdates.find(update => update.fieldName === fieldName);
      return update ? update.originalValue : undefined;
    },
  };
}

/**
 * Normalize values based on SharePoint field type patterns and conventions
 */
function normalizeValueByFieldType(fieldName: string, value: any): any {
  if (value === null || value === undefined) {
    return null;
  }

  // Detect field type from field name patterns
  const fieldType = detectFieldTypeFromName(fieldName);

  switch (fieldType) {
    case 'user':
    case 'lookup':
      // For user/lookup fields, ensure we have consistent object structure
      if (typeof value === 'number') {
        return { id: value };
      }
      if (typeof value === 'object' && value !== null) {
        // Normalize ID to number if it's a string
        if ('id' in value && typeof value.id === 'string') {
          return { ...value, id: parseInt(value.id, 10) };
        }
      }
      return value;

    case 'userMulti':
    case 'lookupMulti':
      // For multi-value fields, ensure array format and normalize IDs
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map(item => {
        if (typeof item === 'number') {
          return { id: item };
        }
        if (typeof item === 'object' && item !== null && 'id' in item) {
          if (typeof item.id === 'string') {
            return { ...item, id: parseInt(item.id, 10) };
          }
        }
        return item;
      });

    case 'taxonomy':
      // Ensure consistent taxonomy object structure
      if (typeof value === 'object' && value !== null) {
        return {
          label: value.label || value.Label,
          termId: value.termId || value.TermGuid || value.TermID,
          wssId: value.wssId || value.WssId || -1,
        };
      }
      return value;

    case 'taxonomyMulti':
      // Normalize taxonomy multi values
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map(item => ({
        label: item.label || item.Label,
        termId: item.termId || item.TermGuid || item.TermID,
        wssId: item.wssId || item.WssId || -1,
      }));

    case 'choice':
      // Ensure choice is a string
      return typeof value === 'string' ? value : String(value);

    case 'multiChoice':
      // Ensure multi-choice is an array of strings
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map(item => String(item));

    case 'boolean':
      // Normalize boolean values
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        return lowerValue === 'true' || lowerValue === '1';
      }
      return Boolean(value);

    case 'number':
    case 'currency':
      // Ensure numeric values
      if (typeof value === 'string') {
        const numValue = Number(value);
        return isNaN(numValue) ? 0 : numValue;
      }
      return typeof value === 'number' ? value : 0;

    case 'date':
      // Ensure Date objects
      if (typeof value === 'string') {
        const dateValue = new Date(value);
        return isNaN(dateValue.getTime()) ? null : dateValue;
      }
      return value instanceof Date ? value : null;

    case 'url':
      // Normalize URL objects
      if (typeof value === 'string') {
        return { url: value, description: '' };
      }
      if (typeof value === 'object' && value !== null) {
        return {
          url: value.url || value.Url || '',
          description: value.description || value.Description || '',
        };
      }
      return value;

    default:
      // Default handling - return as-is
      return value;
  }
}

/**
 * Detect SharePoint field type from field name patterns
 */
function detectFieldTypeFromName(fieldName: string): string {
  const lowerFieldName = fieldName.toLowerCase();

  // User/People fields
  if (
    lowerFieldName.includes('user') ||
    lowerFieldName.includes('people') ||
    lowerFieldName.includes('author') ||
    lowerFieldName.includes('editor') ||
    lowerFieldName.includes('assignedto') ||
    lowerFieldName.includes('createdby') ||
    lowerFieldName.includes('modifiedby')
  ) {
    return lowerFieldName.includes('multi') || lowerFieldName.endsWith('s') ? 'userMulti' : 'user';
  }

  // Lookup fields
  if (lowerFieldName.includes('lookup') || lowerFieldName.endsWith('id')) {
    return lowerFieldName.includes('multi') || lowerFieldName.endsWith('ids')
      ? 'lookupMulti'
      : 'lookup';
  }

  // Taxonomy fields
  if (
    lowerFieldName.includes('tax') ||
    lowerFieldName.includes('metadata') ||
    lowerFieldName.includes('term') ||
    lowerFieldName.includes('tag')
  ) {
    return lowerFieldName.includes('multi') || lowerFieldName.endsWith('s')
      ? 'taxonomyMulti'
      : 'taxonomy';
  }

  // Choice fields
  if (lowerFieldName.includes('choice') || lowerFieldName.includes('option')) {
    return lowerFieldName.includes('multi') ? 'multiChoice' : 'choice';
  }

  // Date fields
  if (
    lowerFieldName.includes('date') ||
    lowerFieldName.includes('time') ||
    lowerFieldName.includes('created') ||
    lowerFieldName.includes('modified')
  ) {
    return 'date';
  }

  // Boolean fields
  if (
    lowerFieldName.startsWith('is') ||
    lowerFieldName.startsWith('has') ||
    lowerFieldName.startsWith('can') ||
    lowerFieldName.includes('active') ||
    lowerFieldName.includes('enabled')
  ) {
    return 'boolean';
  }

  // Number/Currency fields
  if (
    lowerFieldName.includes('number') ||
    lowerFieldName.includes('count') ||
    lowerFieldName.includes('amount') ||
    lowerFieldName.includes('price') ||
    lowerFieldName.includes('cost') ||
    lowerFieldName.includes('currency')
  ) {
    return lowerFieldName.includes('currency') ||
      lowerFieldName.includes('price') ||
      lowerFieldName.includes('cost')
      ? 'currency'
      : 'number';
  }

  // URL fields
  if (
    lowerFieldName.includes('url') ||
    lowerFieldName.includes('link') ||
    lowerFieldName.includes('href')
  ) {
    return 'url';
  }

  // Default to string
  return 'string';
}

/**
 * Format JavaScript values for PnP.js operations
 */
function formatValueForPnP(fieldName: string, value: any): Record<string, any> {
  const updates: Record<string, any> = {};

  if (value === null || value === undefined) {
    updates[fieldName] = null;
    return updates;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    updates[fieldName] = value;
    return updates;
  }

  if (value instanceof Date) {
    updates[fieldName] = value;
    return updates;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      // Handle empty arrays based on field type
      const fieldType = detectFieldTypeFromName(fieldName);
      if (fieldType.includes('user') || fieldType.includes('lookup')) {
        updates[`${fieldName}Id`] = [];
      } else {
        updates[fieldName] = [];
      }
      return updates;
    }

    // Check array content type
    const firstItem = value[0];

    if (typeof firstItem === 'object' && firstItem !== null) {
      if ('email' in firstItem || 'id' in firstItem) {
        // User or lookup multi
        if ('email' in firstItem) {
          // User multi - extract IDs
          updates[`${fieldName}Id`] = value.map((person: IPrincipal) => parseInt(person.id, 10));
        } else {
          // Lookup multi - extract IDs
          updates[`${fieldName}Id`] = value.map(item =>
            typeof item.id === 'string' ? parseInt(item.id, 10) : item.id
          );
        }
      } else if ('label' in firstItem && 'termId' in firstItem) {
        // Taxonomy multi
        const hiddenFieldName = `${fieldName}_0`;
        const serializedValue = value.map(item => `-1;#${item.label}|${item.termId}`).join(';#');
        updates[hiddenFieldName] = serializedValue;
        updates[fieldName] = value.map(item => ({
          Label: item.label,
          TermGuid: item.termId,
          WssId: item.wssId || -1,
        }));
      }
    } else if (typeof firstItem === 'number') {
      // Array of IDs
      updates[`${fieldName}Id`] = value;
    } else {
      // Multi-choice or other string arrays
      updates[fieldName] = value;
    }

    return updates;
  }

  if (typeof value === 'object' && value !== null) {
    if ('email' in value && 'id' in value) {
      // User single
      updates[`${fieldName}Id`] = parseInt((value as IPrincipal).id, 10);
    } else if ('id' in value) {
      // Lookup single
      updates[`${fieldName}Id`] = typeof value.id === 'string' ? parseInt(value.id, 10) : value.id;
    } else if ('label' in value && 'termId' in value) {
      // Taxonomy single
      updates[fieldName] = {
        Label: value.label,
        TermGuid: value.termId,
        WssId: value.wssId || -1,
      };
    } else if ('url' in value) {
      // URL field
      updates[fieldName] = {
        Description: value.description || '',
        Url: value.url,
      };
    } else if ('latitude' in value && 'longitude' in value) {
      // Location field
      updates[fieldName] = JSON.stringify({
        Coordinates: {
          Latitude: value.latitude,
          Longitude: value.longitude,
        },
      });
    } else if ('fileName' in value && 'serverUrl' in value) {
      // Image field
      updates[fieldName] = JSON.stringify({
        fileName: value.fileName,
        serverUrl: value.serverUrl,
        serverRelativeUrl: value.serverRelativeUrl || value.serverUrl,
      });
    } else {
      // Generic object
      updates[fieldName] = value;
    }

    return updates;
  }

  // Fallback
  updates[fieldName] = value;
  return updates;
}

/**
 * Format JavaScript values to SharePoint string format for validate methods
 */
function formatValueForValidate(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  if (value instanceof Date) {
    return value.toLocaleString('en-US');
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '';
    }

    const firstItem = value[0];

    if (typeof firstItem === 'object' && firstItem !== null) {
      if ('email' in firstItem && 'value' in firstItem) {
        // User multi
        const persons = value.map((person: IPrincipal) => ({ Key: person.value || person.email }));
        return JSON.stringify(persons);
      } else if ('id' in firstItem) {
        // Lookup multi
        return value.map(item => `${item.id};#`).join(';#');
      } else if ('label' in firstItem && 'termId' in firstItem) {
        // Taxonomy multi
        return value.map(item => `${item.label}|${item.termId};`).join('');
      }
    } else if (typeof firstItem === 'number') {
      // ID array
      return value.map(id => `${id};#`).join(';#');
    } else {
      // String array (multi-choice)
      return value.join(';#');
    }
  }

  if (typeof value === 'object' && value !== null) {
    if ('email' in value && 'value' in value) {
      // User single
      return JSON.stringify([{ Key: (value as IPrincipal).value || (value as IPrincipal).email }]);
    } else if ('id' in value) {
      // Lookup single
      return value.id.toString();
    } else if ('label' in value && 'termId' in value) {
      // Taxonomy single
      return `${value.label}|${value.termId};`;
    } else if ('url' in value) {
      // URL field
      return `${value.url}${value.description ? ', ' + value.description : ''}`;
    } else {
      // Generic object
      return JSON.stringify(value);
    }
  }

  return String(value);
}
