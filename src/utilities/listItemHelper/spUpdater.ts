/**
 * Enhanced SharePoint field updater with value-based type detection
 *
 * This updater detects field types based on VALUE STRUCTURE, not field names.
 * This ensures correct formatting regardless of what the field is named.
 *
 * ## Two API Styles
 *
 * ### 1. Typed Setter Methods (Recommended)
 * Use explicit typed methods for better type safety and clarity:
 *
 * @example
 * ```typescript
 * const updater = createSPUpdater()
 *   .setText('Title', 'My Title')
 *   .setNumber('Priority', 1)
 *   .setDate('DueDate', new Date())
 *   .setUser('AssignedTo', userPrincipal)
 *   .setUserMulti('Reviewers', [user1, user2])
 *   .setLookup('Category', { Id: 1, Title: 'Category A' })
 *   .setLookupMulti('Tags', [{ Id: 1 }, { Id: 2 }])
 *   .setTaxonomy('Department', { Label: 'HR', TermGuid: '...' })
 *   .setChoice('Status', 'Active')
 *   .setMultiChoice('Features', ['Feature1', 'Feature2'])
 *   .setUrl('Website', { url: 'https://...', description: 'My Site' });
 *
 * const updates = updater.getUpdates();
 * ```
 *
 * ### 2. Auto-Detection with set()
 * For simple cases, use `set()` which auto-detects type from value structure:
 *
 * @example
 * ```typescript
 * const updater = createSPUpdater()
 *   .set('Title', 'My Title')                           // String detected
 *   .set('AssignedTo', { id: '1', email: 'user@...' })  // User detected (has email)
 *   .set('Category', { Id: 1, Title: 'Category A' })    // Lookup detected (has Id+Title)
 *   .set('DueDate', new Date());                        // Date detected
 * ```
 *
 * **Note**: For empty arrays, use typed methods (e.g., `setLookupMulti('Field', [])`)
 * since auto-detection cannot infer the type from an empty array.
 *
 * @packageDocumentation
 */

import { isEqual } from '@microsoft/sp-lodash-subset';
import { IListItemFormUpdateValue, IPrincipal } from '../../types';

/**
 * Supported SharePoint field types for explicit type specification
 */
export type SPUpdateFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'user'
  | 'userMulti'
  | 'lookup'
  | 'lookupMulti'
  | 'taxonomy'
  | 'taxonomyMulti'
  | 'choice'
  | 'multiChoice'
  | 'url'
  | 'location'
  | 'image';

interface FieldUpdate {
  fieldName: string;
  value: any;
  originalValue?: any;
  hasChanged: boolean;
  explicitType?: SPUpdateFieldType;
}

/**
 * Detect SharePoint field type from VALUE structure (not field name!)
 * This is the correct approach - infer type from what the value looks like.
 */
function detectFieldTypeFromValue(value: any): SPUpdateFieldType | 'unknown' | 'null' | 'emptyArray' {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return 'string';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (value instanceof Date) {
    return 'date';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'emptyArray';
    }

    const firstItem = value[0];
    if (typeof firstItem === 'string') {
      return 'multiChoice';
    }
    if (typeof firstItem === 'number') {
      // Array of IDs - could be user or lookup, check if all are numbers
      return 'lookupMulti'; // Default to lookup for ID arrays
    }
    if (typeof firstItem === 'object' && firstItem !== null) {
      // User multi - has email property
      if ('email' in firstItem || 'EMail' in firstItem || 'loginName' in firstItem) {
        return 'userMulti';
      }
      // Lookup multi - has Id/id and Title/title
      if (('Id' in firstItem || 'id' in firstItem) && ('Title' in firstItem || 'title' in firstItem)) {
        return 'lookupMulti';
      }
      // Taxonomy multi - has termId/TermGuid
      if ('termId' in firstItem || 'TermGuid' in firstItem || 'TermID' in firstItem) {
        return 'taxonomyMulti';
      }
    }
    return 'multiChoice'; // Default for unknown arrays
  }

  if (typeof value === 'object' && value !== null) {
    // User - has email/EMail property
    if ('email' in value || 'EMail' in value || 'loginName' in value) {
      return 'user';
    }

    // Lookup - has Id/id and Title/title (but NOT email, to distinguish from user)
    if (('Id' in value || 'id' in value) && ('Title' in value || 'title' in value)) {
      return 'lookup';
    }

    // Taxonomy - has termId/TermGuid/TermID
    if ('termId' in value || 'TermGuid' in value || 'TermID' in value) {
      return 'taxonomy';
    }

    // URL - has Url/url property
    if ('Url' in value || 'url' in value) {
      return 'url';
    }

    // Location - has latitude and longitude
    if ('latitude' in value && 'longitude' in value) {
      return 'location';
    }

    // Image - has fileName and serverUrl
    if ('fileName' in value && 'serverUrl' in value) {
      return 'image';
    }

    // Object with just 'id' - likely a lookup
    if ('id' in value && Object.keys(value).length <= 2) {
      return 'lookup';
    }
  }

  return 'unknown';
}

/**
 * Normalize values for consistent comparison and storage
 */
function normalizeValue(value: any, fieldType: SPUpdateFieldType | 'unknown' | 'null' | 'emptyArray'): any {
  if (value === null || value === undefined) {
    return null;
  }

  switch (fieldType) {
    case 'user':
    case 'lookup':
      if (typeof value === 'number') {
        return { id: value };
      }
      if (typeof value === 'object' && value !== null) {
        // Normalize ID to number if it's a string
        const id = value.Id || value.id;
        if (id !== undefined) {
          return {
            ...value,
            id: typeof id === 'string' ? parseInt(id, 10) : id,
          };
        }
      }
      return value;

    case 'userMulti':
    case 'lookupMulti':
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map(item => {
        if (typeof item === 'number') {
          return { id: item };
        }
        if (typeof item === 'object' && item !== null) {
          const id = item.Id || item.id;
          if (id !== undefined && typeof id === 'string') {
            return { ...item, id: parseInt(id, 10) };
          }
        }
        return item;
      });

    case 'taxonomy':
      if (typeof value === 'object' && value !== null) {
        return {
          label: value.label || value.Label,
          termId: value.termId || value.TermGuid || value.TermID,
          wssId: value.wssId || value.WssId || -1,
        };
      }
      return value;

    case 'taxonomyMulti':
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map(item => ({
        label: item.label || item.Label,
        termId: item.termId || item.TermGuid || item.TermID,
        wssId: item.wssId || item.WssId || -1,
      }));

    case 'choice':
    case 'string':
      return typeof value === 'string' ? value : String(value);

    case 'multiChoice':
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map(item => String(item));

    case 'boolean':
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        return lowerValue === 'true' || lowerValue === '1';
      }
      return Boolean(value);

    case 'number':
      if (typeof value === 'string') {
        const numValue = Number(value);
        return isNaN(numValue) ? 0 : numValue;
      }
      return typeof value === 'number' ? value : 0;

    case 'date':
      if (typeof value === 'string') {
        const dateValue = new Date(value);
        return isNaN(dateValue.getTime()) ? null : dateValue;
      }
      return value instanceof Date ? value : null;

    case 'url':
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
      return value;
  }
}

/**
 * Format value for PnP.js operations (item.update(), items.add())
 */
function formatValueForPnP(
  fieldName: string,
  value: any,
  explicitType?: SPUpdateFieldType
): Record<string, any> {
  const updates: Record<string, any> = {};

  if (value === null || value === undefined) {
    updates[fieldName] = null;
    return updates;
  }

  // Handle primitive types
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    updates[fieldName] = value;
    return updates;
  }

  if (value instanceof Date) {
    updates[fieldName] = value;
    return updates;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      // For empty arrays, we need explicit type to know the correct field name
      if (explicitType === 'userMulti' || explicitType === 'lookupMulti') {
        // Check if fieldName already ends with 'Id'
        const updateFieldName = fieldName.endsWith('Id') ? fieldName : `${fieldName}Id`;
        updates[updateFieldName] = [];
      } else {
        updates[fieldName] = [];
      }
      return updates;
    }

    const firstItem = value[0];

    // String array (multi-choice)
    if (typeof firstItem === 'string') {
      updates[fieldName] = value;
      return updates;
    }

    // Number array (IDs)
    if (typeof firstItem === 'number') {
      const updateFieldName = fieldName.endsWith('Id') ? fieldName : `${fieldName}Id`;
      updates[updateFieldName] = value;
      return updates;
    }

    if (typeof firstItem === 'object' && firstItem !== null) {
      // User multi - has email
      if ('email' in firstItem || 'EMail' in firstItem || 'loginName' in firstItem) {
        const updateFieldName = fieldName.endsWith('Id') ? fieldName : `${fieldName}Id`;
        updates[updateFieldName] = value.map((person: IPrincipal) => {
          const id = person.id || (person as any).Id;
          return typeof id === 'string' ? parseInt(id, 10) : id;
        });
        return updates;
      }

      // Lookup multi - has Id/id and Title/title
      if (('Id' in firstItem || 'id' in firstItem) && ('Title' in firstItem || 'title' in firstItem)) {
        const updateFieldName = fieldName.endsWith('Id') ? fieldName : `${fieldName}Id`;
        updates[updateFieldName] = value.map(item => {
          const id = item.Id || item.id;
          return typeof id === 'string' ? parseInt(id, 10) : id;
        });
        return updates;
      }

      // Taxonomy multi
      if ('termId' in firstItem || 'TermGuid' in firstItem || 'label' in firstItem) {
        const hiddenFieldName = `${fieldName}_0`;
        const serializedValue = value.map(item => {
          const label = item.label || item.Label;
          const termId = item.termId || item.TermGuid || item.TermID;
          return `-1;#${label}|${termId}`;
        }).join(';#');
        updates[hiddenFieldName] = serializedValue;
        updates[fieldName] = value.map(item => ({
          Label: item.label || item.Label,
          TermGuid: item.termId || item.TermGuid || item.TermID,
          WssId: item.wssId || item.WssId || -1,
        }));
        return updates;
      }
    }

    // Fallback for unknown arrays
    updates[fieldName] = value;
    return updates;
  }

  // Handle objects
  if (typeof value === 'object' && value !== null) {
    // User single - has email
    if ('email' in value || 'EMail' in value || 'loginName' in value) {
      const updateFieldName = fieldName.endsWith('Id') ? fieldName : `${fieldName}Id`;
      const id = (value as IPrincipal).id || (value as any).Id;
      updates[updateFieldName] = typeof id === 'string' ? parseInt(id, 10) : id;
      return updates;
    }

    // Lookup single - has Id/id and Title/title
    if (('Id' in value || 'id' in value) && ('Title' in value || 'title' in value)) {
      const updateFieldName = fieldName.endsWith('Id') ? fieldName : `${fieldName}Id`;
      const id = value.Id || value.id;
      updates[updateFieldName] = typeof id === 'string' ? parseInt(id, 10) : id;
      return updates;
    }

    // Taxonomy single
    if ('termId' in value || 'TermGuid' in value) {
      updates[fieldName] = {
        Label: value.label || value.Label,
        TermGuid: value.termId || value.TermGuid || value.TermID,
        WssId: value.wssId || value.WssId || -1,
      };
      return updates;
    }

    // URL field
    if ('url' in value || 'Url' in value) {
      updates[fieldName] = {
        Description: value.description || value.Description || '',
        Url: value.url || value.Url,
      };
      return updates;
    }

    // Location field
    if ('latitude' in value && 'longitude' in value) {
      updates[fieldName] = JSON.stringify({
        Coordinates: {
          Latitude: value.latitude,
          Longitude: value.longitude,
        },
      });
      return updates;
    }

    // Image field
    if ('fileName' in value && 'serverUrl' in value) {
      updates[fieldName] = JSON.stringify({
        fileName: value.fileName,
        serverUrl: value.serverUrl,
        serverRelativeUrl: value.serverRelativeUrl || value.serverUrl,
      });
      return updates;
    }

    // Object with just id - treat as lookup
    if ('id' in value && Object.keys(value).length <= 2) {
      const updateFieldName = fieldName.endsWith('Id') ? fieldName : `${fieldName}Id`;
      const id = value.id;
      updates[updateFieldName] = typeof id === 'string' ? parseInt(id, 10) : id;
      return updates;
    }

    // Generic object
    updates[fieldName] = value;
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

    if (typeof firstItem === 'string') {
      return value.join(';#');
    }

    if (typeof firstItem === 'number') {
      return value.map(id => `${id};#`).join(';#');
    }

    if (typeof firstItem === 'object' && firstItem !== null) {
      // User multi
      if ('email' in firstItem || 'value' in firstItem) {
        const persons = value.map((person: IPrincipal) => ({
          Key: person.value || person.loginName || person.email,
        }));
        return JSON.stringify(persons);
      }

      // Lookup multi
      if ('id' in firstItem || 'Id' in firstItem) {
        return value.map(item => `${item.id || item.Id};#`).join(';#');
      }

      // Taxonomy multi
      if ('termId' in firstItem || 'TermGuid' in firstItem) {
        return value.map(item => {
          const label = item.label || item.Label;
          const termId = item.termId || item.TermGuid || item.TermID;
          return `${label}|${termId};`;
        }).join('');
      }
    }

    return JSON.stringify(value);
  }

  if (typeof value === 'object' && value !== null) {
    // User single
    if ('email' in value || 'value' in value || 'loginName' in value) {
      const person = value as IPrincipal;
      return JSON.stringify([{ Key: person.value || person.loginName || person.email }]);
    }

    // Lookup single
    if ('id' in value || 'Id' in value) {
      return (value.id || value.Id).toString();
    }

    // Taxonomy single
    if ('termId' in value || 'TermGuid' in value) {
      const label = value.label || value.Label;
      const termId = value.termId || value.TermGuid || value.TermID;
      return `${label}|${termId};`;
    }

    // URL field
    if ('url' in value || 'Url' in value) {
      const url = value.url || value.Url;
      const desc = value.description || value.Description;
      return desc ? `${url}, ${desc}` : url;
    }

    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Creates a SharePoint field updater with value-based type detection
 *
 * @example
 * ```typescript
 * const updater = createSPUpdater()
 *   .set('Title', 'My Title')
 *   .set('AssignedTo', { id: '1', email: 'user@contoso.com' })
 *   .set('Category', { Id: 1, Title: 'Category A' })
 *   .set('Tags', [], 'lookupMulti'); // Explicit type for empty array
 *
 * const updates = updater.getUpdates();
 * await list.items.getById(1).update(updates);
 * ```
 */
export function createSPUpdater() {
  const fieldUpdates: FieldUpdate[] = [];

  return {
    /**
     * Set a field value with optional change detection and explicit type
     *
     * @param fieldName - Internal field name
     * @param value - Value to set (type is auto-detected from value structure)
     * @param originalValueOrType - Original value for change detection, OR explicit field type
     * @param explicitType - Explicit field type (required for empty arrays)
     *
     * @example
     * ```typescript
     * // Auto-detected types
     * updater.set('Title', 'My Title');
     * updater.set('AssignedTo', { id: '1', email: 'user@...' });
     *
     * // With change detection
     * updater.set('Title', 'New Title', 'Old Title');
     *
     * // Explicit type for empty arrays
     * updater.set('Tags', [], 'lookupMulti');
     * updater.set('Choices', [], 'multiChoice');
     * ```
     */
    set: function (
      fieldName: string,
      value: any,
      originalValueOrType?: any | SPUpdateFieldType,
      explicitType?: SPUpdateFieldType
    ) {
      if (!fieldName) {
        throw new Error('Field name is required');
      }

      // Determine if third param is original value or explicit type
      let originalValue: any | undefined;
      let type: SPUpdateFieldType | undefined = explicitType;

      if (typeof originalValueOrType === 'string' && isValidFieldType(originalValueOrType)) {
        // Third param is explicit type
        type = originalValueOrType as SPUpdateFieldType;
      } else {
        // Third param is original value
        originalValue = originalValueOrType;
      }

      // Detect type from value if not explicitly provided
      const detectedType = type || detectFieldTypeFromValue(value);

      // Normalize the value
      const normalizedValue = normalizeValue(value, detectedType);

      // Determine if the value has actually changed
      let hasChanged = true;
      if (originalValue !== undefined) {
        const normalizedOriginal = normalizeValue(originalValue, detectedType);
        hasChanged = !isEqual(normalizedValue, normalizedOriginal);
      }

      // Find existing update for this field and replace it, or add new one
      const existingIndex = fieldUpdates.findIndex(update => update.fieldName === fieldName);
      const update: FieldUpdate = {
        fieldName,
        value: normalizedValue,
        originalValue,
        hasChanged,
        explicitType: type,
      };

      if (existingIndex >= 0) {
        fieldUpdates[existingIndex] = update;
      } else {
        fieldUpdates.push(update);
      }

      return this; // Enable chaining
    },

    // ============================================================
    // TYPED SETTER METHODS
    // These provide better type safety and clearer intent
    // ============================================================

    /**
     * Set a text/string field value
     * @example updater.setText('Title', 'My Title')
     */
    setText: function (fieldName: string, value: string | null, originalValue?: string | null) {
      return this.set(fieldName, value, originalValue, 'string');
    },

    /**
     * Set a number field value
     * @example updater.setNumber('Amount', 100)
     */
    setNumber: function (fieldName: string, value: number | null, originalValue?: number | null) {
      return this.set(fieldName, value, originalValue, 'number');
    },

    /**
     * Set a boolean/Yes-No field value
     * @example updater.setBoolean('IsActive', true)
     */
    setBoolean: function (fieldName: string, value: boolean | null, originalValue?: boolean | null) {
      return this.set(fieldName, value, originalValue, 'boolean');
    },

    /**
     * Set a date field value
     * @example updater.setDate('DueDate', new Date())
     */
    setDate: function (fieldName: string, value: Date | null, originalValue?: Date | null) {
      return this.set(fieldName, value, originalValue, 'date');
    },

    /**
     * Set a choice field value
     * @example updater.setChoice('Status', 'Active')
     */
    setChoice: function (fieldName: string, value: string | null, originalValue?: string | null) {
      return this.set(fieldName, value, originalValue, 'choice');
    },

    /**
     * Set a multi-choice field value
     * @example updater.setMultiChoice('Categories', ['Cat1', 'Cat2'])
     */
    setMultiChoice: function (fieldName: string, value: string[], originalValue?: string[]) {
      return this.set(fieldName, value, originalValue, 'multiChoice');
    },

    /**
     * Set a single user/person field value
     * @example updater.setUser('AssignedTo', { id: '1', email: 'user@contoso.com', title: 'John Doe' })
     */
    setUser: function (fieldName: string, value: IPrincipal | null, originalValue?: IPrincipal | null) {
      return this.set(fieldName, value, originalValue, 'user');
    },

    /**
     * Set a multi-user/person field value
     * @example updater.setUserMulti('TeamMembers', [{ id: '1', email: 'user1@...' }, { id: '2', email: 'user2@...' }])
     */
    setUserMulti: function (fieldName: string, value: IPrincipal[], originalValue?: IPrincipal[]) {
      return this.set(fieldName, value, originalValue, 'userMulti');
    },

    /**
     * Set a single lookup field value
     * @example updater.setLookup('Category', { Id: 1, Title: 'Category A' })
     */
    setLookup: function (fieldName: string, value: { Id: number; Title?: string } | null, originalValue?: { Id: number; Title?: string } | null) {
      return this.set(fieldName, value, originalValue, 'lookup');
    },

    /**
     * Set a multi-lookup field value
     * @example updater.setLookupMulti('Tags', [{ Id: 1, Title: 'Tag1' }, { Id: 2, Title: 'Tag2' }])
     */
    setLookupMulti: function (fieldName: string, value: Array<{ Id: number; Title?: string }>, originalValue?: Array<{ Id: number; Title?: string }>) {
      return this.set(fieldName, value, originalValue, 'lookupMulti');
    },

    /**
     * Set a single taxonomy/managed metadata field value
     * @example updater.setTaxonomy('Department', { Label: 'Engineering', TermGuid: 'guid-here' })
     */
    setTaxonomy: function (
      fieldName: string,
      value: { Label: string; TermGuid: string; WssId?: number } | null,
      originalValue?: { Label: string; TermGuid: string; WssId?: number } | null
    ) {
      return this.set(fieldName, value, originalValue, 'taxonomy');
    },

    /**
     * Set a multi-taxonomy/managed metadata field value
     * @example updater.setTaxonomyMulti('Keywords', [{ Label: 'Term1', TermGuid: 'guid1' }, { Label: 'Term2', TermGuid: 'guid2' }])
     */
    setTaxonomyMulti: function (
      fieldName: string,
      value: Array<{ Label: string; TermGuid: string; WssId?: number }>,
      originalValue?: Array<{ Label: string; TermGuid: string; WssId?: number }>
    ) {
      return this.set(fieldName, value, originalValue, 'taxonomyMulti');
    },

    /**
     * Set a URL/hyperlink field value
     * @example updater.setUrl('Website', { url: 'https://example.com', description: 'Example Site' })
     */
    setUrl: function (
      fieldName: string,
      value: { url: string; description?: string } | null,
      originalValue?: { url: string; description?: string } | null
    ) {
      return this.set(fieldName, value, originalValue, 'url');
    },

    /**
     * Get updates for PnP.js direct methods (item.update(), items.add())
     * Only includes fields that have actually changed by default
     */
    getUpdates: function (includeUnchanged = false): Record<string, any> {
      const updates: Record<string, any> = {};
      const relevantUpdates = includeUnchanged
        ? fieldUpdates
        : fieldUpdates.filter(update => update.hasChanged);

      for (const update of relevantUpdates) {
        const { fieldName, value, explicitType } = update;
        const formattedUpdate = formatValueForPnP(fieldName, value, explicitType);
        Object.assign(updates, formattedUpdate);
      }

      return updates;
    },

    /**
     * Get updates for PnP.js validate methods
     * Only includes fields that have actually changed by default
     */
    getValidateUpdates: function (includeUnchanged = false): IListItemFormUpdateValue[] {
      const relevantUpdates = includeUnchanged
        ? fieldUpdates
        : fieldUpdates.filter(update => update.hasChanged);

      return relevantUpdates.map(update => ({
        FieldName: update.fieldName,
        FieldValue: formatValueForValidate(update.value),
      }));
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
 * Helper to check if a string is a valid field type
 */
function isValidFieldType(value: string): value is SPUpdateFieldType {
  const validTypes: SPUpdateFieldType[] = [
    'string', 'number', 'boolean', 'date', 'user', 'userMulti',
    'lookup', 'lookupMulti', 'taxonomy', 'taxonomyMulti',
    'choice', 'multiChoice', 'url', 'location', 'image'
  ];
  return validTypes.includes(value as SPUpdateFieldType);
}
