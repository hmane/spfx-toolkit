/**
 * Simple SharePoint field updater - auto-detects field types from JavaScript values
 * File: spUpdater.ts
 */

import { IListItemFormUpdateValue, IPrincipal } from '../../types';

export function createSPUpdater() {
  const fieldUpdates: Array<{ fieldName: string; value: any }> = [];

  return {
    /**
     * Set a field value - auto-detects SharePoint field type from JavaScript value
     * @param fieldName - Internal field name
     * @param value - Value to set (string, number, boolean, Date, object, array)
     */
    set: function (fieldName: string, value: any) {
      if (!fieldName) {
        throw new Error('Field name is required');
      }

      // Store the update
      fieldUpdates.push({
        fieldName,
        value,
      });

      return this; // Enable chaining
    },

    /**
     * Get updates for PnP.js direct methods (item.update(), items.add())
     * Uses proper PnP.js formatting for each field type
     */
    getUpdates: function (): Record<string, any> {
      const updates: Record<string, any> = {};

      for (const update of fieldUpdates) {
        const { fieldName, value } = update;

        if (value === null || value === undefined) {
          updates[fieldName] = null;
        } else if (typeof value === 'string') {
          // Single line text, multiple lines text, choice
          updates[fieldName] = value;
        } else if (typeof value === 'number') {
          // Number, currency
          updates[fieldName] = value;
        } else if (typeof value === 'boolean') {
          // Yes/No field
          updates[fieldName] = value;
        } else if (value instanceof Date) {
          // Date and Time
          updates[fieldName] = value;
        } else if (Array.isArray(value)) {
          // Handle array types based on PnP.js documentation
          if (value.length === 0) {
            // Empty arrays - different handling for different field types
            if (fieldName.includes('User') || fieldName.includes('People')) {
              updates[`${fieldName}Id`] = [];
            } else if (fieldName.includes('Lookup')) {
              updates[`${fieldName}Id`] = [];
            } else {
              updates[fieldName] = [];
            }
          } else if (
            value.every(
              item => typeof item === 'object' && item !== null && ('email' in item || 'id' in item)
            )
          ) {
            // Array of IPrincipal or objects with id (User multi or Lookup multi)
            if (value.every(item => 'email' in item)) {
              // IPrincipal objects - extract IDs
              updates[`${fieldName}Id`] = value.map((person: IPrincipal) =>
                parseInt(person.id, 10)
              );
            } else {
              // Objects with id property (lookup multi)
              updates[`${fieldName}Id`] = value.map(item =>
                typeof item.id === 'string' ? parseInt(item.id, 10) : item.id
              );
            }
          } else if (value.every(item => typeof item === 'number')) {
            // Array of numbers (lookup multi with just IDs)
            updates[`${fieldName}Id`] = value;
          } else if (
            value.every(
              item =>
                typeof item === 'object' && item !== null && 'label' in item && 'termId' in item
            )
          ) {
            // Multi-value taxonomy - need to update hidden field
            // Based on PnP.js docs: serialize as "-1;#{field label}|{field id}" joined by ";#"
            const hiddenFieldName = `${fieldName}_0`; // Hidden field pattern
            const serializedValue = value
              .map(item => `-1;#${item.label}|${item.termId}`)
              .join(';#');
            updates[hiddenFieldName] = serializedValue;

            // Also update the main field for some SharePoint versions
            updates[fieldName] = value.map(item => ({
              Label: item.label,
              TermGuid: item.termId,
              WssId: -1,
            }));
          } else {
            // Multi-choice - just use the array directly (newer PnP.js)
            updates[fieldName] = value;
          }
        } else if (typeof value === 'object' && value !== null) {
          // Handle object types
          if ('email' in value && 'id' in value) {
            // IPrincipal object - Person/Group single
            updates[`${fieldName}Id`] = parseInt((value as IPrincipal).id, 10);
          } else if ('id' in value) {
            // Simple object with id (lookup single)
            updates[`${fieldName}Id`] =
              typeof value.id === 'string' ? parseInt(value.id, 10) : value.id;
          } else if ('label' in value && 'termId' in value) {
            // Single taxonomy field - based on PnP.js docs
            updates[fieldName] = {
              Label: value.label,
              TermGuid: value.termId,
              WssId: -1,
            };
          } else if ('url' in value) {
            // Hyperlink field - based on PnP.js docs (no __metadata needed in newer versions)
            updates[fieldName] = {
              Description: value.description || '',
              Url: value.url,
            };
          } else if ('latitude' in value && 'longitude' in value) {
            // Location field coordinates - based on PnP.js docs
            updates[fieldName] = JSON.stringify({
              Coordinates: {
                Latitude: value.latitude,
                Longitude: value.longitude,
              },
            });
          } else if ('fileName' in value && 'serverUrl' in value) {
            // Picture field - based on PnP.js docs
            updates[fieldName] = JSON.stringify({
              fileName: value.fileName,
              serverUrl: value.serverUrl,
              serverRelativeUrl: value.serverRelativeUrl || value.serverUrl,
            });
          } else {
            // Generic object - pass as-is
            updates[fieldName] = value;
          }
        } else {
          // Fallback
          updates[fieldName] = value;
        }
      }

      return updates;
    },

    /**
     * Get updates for PnP.js validate methods (addValidateUpdateItemUsingPath, validateUpdateListItem)
     * Returns array of field/value pairs formatted as strings for validate methods
     */
    getValidateUpdates: function (): IListItemFormUpdateValue[] {
      return fieldUpdates.map(update => {
        const { fieldName, value } = update;

        return {
          FieldName: fieldName,
          FieldValue: formatValueForValidate(value),
        };
      });
    },

    /**
     * Clear all updates
     */
    clear: function () {
      fieldUpdates.length = 0;
      return this;
    },

    /**
     * Get count of pending updates
     */
    count: function (): number {
      return fieldUpdates.length;
    },

    /**
     * Check if a field has been set
     */
    hasField: function (fieldName: string): boolean {
      return fieldUpdates.some(update => update.fieldName === fieldName);
    },
  };
}

/**
 * Format JavaScript values to SharePoint string format for validate methods
 * Based on validateUpdateListItem field data type fingerprints
 */
function formatValueForValidate(value: any): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Handle different JavaScript types
  if (typeof value === 'string') {
    // Text field (single line and note)
    return value;
  }

  if (typeof value === 'number') {
    // Number field - convert to string
    return value.toString();
  }

  if (typeof value === 'boolean') {
    // Yes/No field - 1 for true, 0 for false
    return value ? '1' : '0';
  }

  if (value instanceof Date) {
    // Dates should be in specific formats for validateUpdateListItem
    // DateTime: '6/23/2018 10:15 PM', Date: '6/23/2018'
    return value.toLocaleString('en-US');
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '';
    }

    // Check if it's array of IPrincipal objects (Person/Group multi)
    if (
      value.every(
        item => typeof item === 'object' && item !== null && 'email' in item && 'value' in item
      )
    ) {
      // Person or group - use JSON.stringify with Key as login name
      const persons = value.map((person: IPrincipal) => ({ Key: person.value || person.email }));
      return JSON.stringify(persons);
    }

    // Check if it's array of objects with id property (lookup multi)
    if (value.every(item => typeof item === 'object' && item !== null && 'id' in item)) {
      // Multi lookup field - format: [3, 4, 5].map(id => `${id};#`).join(';#')
      return value.map(item => `${item.id};#`).join(';#');
    }

    // Check if it's array of numbers (lookup multi with just IDs)
    if (value.every(item => typeof item === 'number')) {
      // Multi lookup field - format: [3, 4, 5].map(id => `${id};#`).join(';#')
      return value.map(id => `${id};#`).join(';#');
    }

    // Check if it's array of taxonomy objects
    if (
      value.every(
        item => typeof item === 'object' && item !== null && 'label' in item && 'termId' in item
      )
    ) {
      // Multi managed metadata - format: 'Department 2|220a3627-4cd3-453d-ac54-34e71483bb8a;Department 3|700a1bc3-3ef6-41ba-8a10-d3054f58db4b;'
      return value.map(item => `${item.label}|${item.termId};`).join('');
    }

    // Array of strings (multi-choice) - format: 'Choice 1;#Choice 2'
    return value.join(';#');
  }

  if (typeof value === 'object' && value !== null) {
    // Handle object types
    if ('email' in value && 'value' in value) {
      // IPrincipal object - Person or group single
      // Format: JSON.stringify([{ Key: LoginName }])
      return JSON.stringify([{ Key: (value as IPrincipal).value || (value as IPrincipal).email }]);
    }

    if ('id' in value) {
      // Lookup field single - Item ID as string
      return value.id.toString();
    }

    if ('label' in value && 'termId' in value) {
      // Single managed metadata - format: 'Department 2|220a3627-4cd3-453d-ac54-34e71483bb8a;'
      return `${value.label}|${value.termId};`;
    }

    if ('url' in value) {
      // Hyperlink or picture - format: 'https://arvosys.com, ARVO Systems'
      return `${value.url}${value.description ? ', ' + value.description : ''}`;
    }

    // Generic object - stringify
    return JSON.stringify(value);
  }

  // Fallback
  return String(value);
}
