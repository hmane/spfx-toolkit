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
 * Supported SharePoint field types for explicit type specification.
 *
 * `date` vs `dateOnly`:
 *   - `date` → DateTime column. Writes `Date` instance for `update()` (PnP
 *     serializes to ISO `…T…Z`) and locale date/time for `validateUpdateListItem`.
 *     Use for timestamps where time-of-day matters.
 *   - `dateOnly` → DateOnly column. Writes `YYYY-MM-DD` (no time, no TZ) for
 *     both paths. Prevents the ±1 day shift that ISO-with-Z causes when the
 *     SP regional setting isn't UTC. Use `setDateOnly()` for any column whose
 *     SharePoint configuration is "Date Only".
 */
export type SPUpdateFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'dateOnly'
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
      if (value === '') {
        return null;
      }
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

    case 'dateOnly':
      // Normalize to YYYY-MM-DD string so change detection is consistent
      // whether the caller passes a Date instance, a YYYY-MM-DD string, or
      // an ISO timestamp. Avoids spurious "changed" results when the
      // original is one shape and the new value is another.
      return formatAsDateOnly(value);

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
 * Format a value as `YYYY-MM-DD` using the *local* date components.
 *
 * Why local: date pickers (DevExtreme DateBox `type="date"`, Fluent DatePicker)
 * produce a `Date` at local midnight for the calendar day the user selected.
 * Using `toISOString()` would shift that day backward in negative timezones
 * (e.g. EST: `Date(2024-01-15T00:00 local)` → `2024-01-15T05:00Z` → SP stores
 * Jan 15 in UTC → displays as Jan 14 in EST views). Reading the local
 * components preserves the picked day exactly.
 *
 * If the caller passes a `YYYY-MM-DD` string, it is returned as-is.
 */
/**
 * Format a Date as `M/D/YYYY h:mm AM/PM` using *local* date/time components —
 * the format SharePoint's `validateUpdateListItem` accepts for DateTime
 * columns on US English (LocaleId 1033) sites.
 *
 * Why not ISO: SP's validateUpdateListItem date parser is locale-aware and
 * matches what a user would type in the form input. ISO with `Z` or `.000Z`
 * is rejected on many SPO tenants with the misleading error "You must
 * specify a valid date within the range of 1/1/1900 and 12/31/8900" — the
 * date is fine, the parser just refuses ISO formats.
 *
 * Source: SP MVP Phil Harding's documented format
 * (https://gist.github.com/phillipharding/30714d4ee245bfc0cba5699b6bb4193e).
 *
 * Locale caveat: this format works for US-English sites. For non-US sites
 * (DD/MM/YYYY locales etc.), consumers should pre-format the date as a
 * locale-appropriate string and pass it through `set(field, formattedString)`
 * instead of a `Date` instance — the formatter passes strings through as-is
 * for the validate path.
 */
function toSpDateTimeString(value: Date): string {
  if (!(value instanceof Date) || isNaN(value.getTime())) return '';
  const m = value.getMonth() + 1;
  const d = value.getDate();
  const y = value.getFullYear();
  let h = value.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const min = String(value.getMinutes()).padStart(2, '0');
  return `${m}/${d}/${y} ${h}:${min} ${ampm}`;
}

/**
 * Format a Date as `M/D/YYYY` using *local* date components — the format
 * SharePoint's `validateUpdateListItem` accepts for Date Only columns on
 * US English sites. Same locale caveat as `toSpDateTimeString`.
 */
function toSpDateString(value: Date): string {
  if (!(value instanceof Date) || isNaN(value.getTime())) return '';
  const m = value.getMonth() + 1;
  const d = value.getDate();
  const y = value.getFullYear();
  return `${m}/${d}/${y}`;
}

function formatAsDateOnly(value: Date | string): string {
  if (typeof value === 'string') {
    // If it's already YYYY-MM-DD shape, trust it; otherwise parse + format.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return '';
    return formatAsDateOnly(parsed);
  }
  if (!(value instanceof Date) || isNaN(value.getTime())) return '';
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolve `${field}Id` suffix for user/lookup writes without double-suffixing
 * when the caller already passed the `Id`-suffixed internal name.
 */
function withIdSuffix(fieldName: string): string {
  return fieldName.endsWith('Id') ? fieldName : `${fieldName}Id`;
}

function buildLocationPayload(value: any): string {
  return JSON.stringify({
    Coordinates: {
      Latitude: value.latitude ?? value.Latitude,
      Longitude: value.longitude ?? value.Longitude,
    },
  });
}

function buildImagePayload(fieldName: string, value: any): string {
  return JSON.stringify({
    type: value.type || 'thumbnail',
    fileName: value.fileName,
    fieldName: value.fieldName || fieldName,
    serverUrl: value.serverUrl,
    serverRelativeUrl: value.serverRelativeUrl,
    id: value.id,
  });
}

function formatLookupMultiForValidate(value: any): string {
  if (!Array.isArray(value) || value.length === 0) return '';
  const pairs = value
    .map((item) => {
      if (typeof item === 'number') {
        const id = String(item);
        return `${id};#${id}`;
      }
      const id = (item as any).id ?? (item as any).Id;
      if (id === undefined || id === null || id === '') return '';
      const label =
        (item as any).title ??
        (item as any).Title ??
        (item as any).value ??
        (item as any).Value ??
        id;
      return `${String(id)};#${String(label)}`;
    })
    .filter((s) => s !== '');
  if (pairs.length === 0) return '';

  // SharePoint's multi-lookup text form is ID/value pairs joined by `;#`,
  // e.g. `1;#Title 1;#2;#Title 2`. For numeric-only inputs we use the ID as
  // the value placeholder (`1;#1`) so SharePoint does not parse `1;#2` as
  // one lookup pair with ID=1 and value/title=2.
  return pairs.join(';#');
}

/**
 * Extract the integer user/lookup id from a value that may be:
 *   - a number (the id itself)
 *   - an object with `id` / `Id` (string or number)
 * Throws when the id cannot be resolved — silently writing `undefined` to
 * `${field}Id` produces a partial save with no error, which is harder to
 * diagnose than a fail-fast.
 */
function requireNumericId(fieldName: string, value: any, kind: 'user' | 'lookup'): number {
  const raw =
    typeof value === 'number'
      ? value
      : value && typeof value === 'object'
        ? (value as any).id ?? (value as any).Id
        : undefined;
  if (raw === undefined || raw === null || raw === '') {
    throw new Error(
      `spUpdater: cannot build ${kind} write for "${fieldName}" — value is missing 'id' / 'Id'. ` +
        `Got: ${JSON.stringify(value)}`
    );
  }
  const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
  if (typeof n !== 'number' || isNaN(n)) {
    throw new Error(
      `spUpdater: ${kind} id for "${fieldName}" is not a valid number. Got: ${JSON.stringify(raw)}`
    );
  }
  return n;
}

/**
 * Format value for the PnP `update()` / `items.add()` path with the caller's
 * explicit field type as the authoritative signal. Used when the consumer
 * called a typed setter (setUser, setUserMulti, setLookup, setTaxonomy, …).
 *
 * Why this exists separately from value-shape detection: a user object that
 * lacks `email`/`loginName` (e.g. just `{Id, Title}` from a lookup-shaped
 * source) gets misclassified as a lookup by structure detection — silently
 * producing the wrong wire format. The typed setter is the source of truth.
 */
function formatByExplicitTypeForPnP(
  fieldName: string,
  value: any,
  explicitType: SPUpdateFieldType
): Record<string, any> {
  const updates: Record<string, any> = {};

  // Null/undefined clears the field. The "empty" wire shape depends on the
  // field type:
  //   - user / lookup single → null assigned to `${field}Id`
  //   - user / lookup multi → [] assigned to `${field}Id`
  //   - multi-value collections (multiChoice, taxonomyMulti) → [] on the
  //     bare field name. SP also accepts null but `[]` is the canonical
  //     "no values" form.
  //   - everything else (single-value: text, number, boolean, date,
  //     dateOnly, choice, taxonomy, url, location, image) → null on the
  //     bare field name.
  if (value === null || value === undefined) {
    if (explicitType === 'lookup' || explicitType === 'user') {
      updates[withIdSuffix(fieldName)] = null;
    } else if (explicitType === 'lookupMulti' || explicitType === 'userMulti') {
      updates[withIdSuffix(fieldName)] = [];
    } else if (explicitType === 'multiChoice' || explicitType === 'taxonomyMulti') {
      updates[fieldName] = [];
    } else {
      updates[fieldName] = null;
    }
    return updates;
  }

  switch (explicitType) {
    case 'string':
    case 'choice':
      updates[fieldName] = typeof value === 'string' ? value : String(value);
      return updates;

    case 'number': {
      const n =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number(value)
            : NaN;
      updates[fieldName] = isNaN(n) ? null : n;
      return updates;
    }

    case 'boolean':
      updates[fieldName] = typeof value === 'boolean' ? value : Boolean(value);
      return updates;

    case 'date':
      // DateTime: Date instance passes through; PnP serializes to ISO via JSON.
      // String inputs are parsed back to Date so PnP's serializer handles them.
      if (value instanceof Date) {
        updates[fieldName] = value;
      } else if (typeof value === 'string') {
        const d = new Date(value);
        updates[fieldName] = isNaN(d.getTime()) ? null : d;
      } else {
        updates[fieldName] = null;
      }
      return updates;

    case 'dateOnly':
      // DateOnly: write YYYY-MM-DD string — SP stores the exact calendar day
      // regardless of regional timezone. No `Date` / `Z` here on purpose.
      updates[fieldName] = formatAsDateOnly(value);
      return updates;

    case 'multiChoice':
      if (!Array.isArray(value)) {
        updates[fieldName] = [];
      } else {
        updates[fieldName] = value.map((v) => String(v));
      }
      return updates;

    case 'user':
      updates[withIdSuffix(fieldName)] = requireNumericId(fieldName, value, 'user');
      return updates;

    case 'userMulti':
      if (!Array.isArray(value)) {
        updates[withIdSuffix(fieldName)] = [];
      } else {
        updates[withIdSuffix(fieldName)] = value.map((p) =>
          requireNumericId(fieldName, p, 'user')
        );
      }
      return updates;

    case 'lookup':
      updates[withIdSuffix(fieldName)] = requireNumericId(fieldName, value, 'lookup');
      return updates;

    case 'lookupMulti':
      if (!Array.isArray(value)) {
        updates[withIdSuffix(fieldName)] = [];
      } else {
        updates[withIdSuffix(fieldName)] = value.map((item) =>
          requireNumericId(fieldName, item, 'lookup')
        );
      }
      return updates;

    case 'taxonomy':
      updates[fieldName] = {
        Label: (value as any).label || (value as any).Label,
        TermGuid: (value as any).termId || (value as any).TermGuid || (value as any).TermID,
        WssId: (value as any).wssId ?? (value as any).WssId ?? -1,
      };
      return updates;

    case 'taxonomyMulti':
      // See the note above the existing taxonomy-multi branch: we deliberately
      // do NOT write the hidden `${field}_0` Note field. Use the validate path
      // for multi-taxonomy on libraries / fields with non-conventional hidden
      // field names.
      if (!Array.isArray(value)) {
        updates[fieldName] = [];
      } else {
        updates[fieldName] = value.map((item) => ({
          Label: item.label || item.Label,
          TermGuid: item.termId || item.TermGuid || item.TermID,
          WssId: item.wssId ?? item.WssId ?? -1,
        }));
      }
      return updates;

    case 'url':
      if (typeof value === 'string') {
        updates[fieldName] = { Url: value, Description: '' };
      } else {
        updates[fieldName] = {
          Url: (value as any).url || (value as any).Url || '',
          Description: (value as any).description || (value as any).Description || '',
        };
      }
      return updates;

    case 'location':
      // Modern SharePoint geolocation columns are stored as a JSON string.
      // PnP's documented update path reads the existing JSON, changes
      // `Coordinates`, then writes the stringified value back.
      updates[fieldName] = buildLocationPayload(value);
      return updates;

    case 'image':
      // Modern SP Image columns accept a JSON-stringified payload.
      updates[fieldName] = buildImagePayload(fieldName, value);
      return updates;

    default:
      updates[fieldName] = value;
      return updates;
  }
}

/**
 * Format value for PnP.js operations (item.update(), items.add())
 */
export function formatValueForPnP(
  fieldName: string,
  value: any,
  explicitType?: SPUpdateFieldType
): Record<string, any> {
  // Typed setters (setUser, setUserMulti, setLookup, …) take precedence over
  // value-shape detection. Without this, a user object lacking `email` /
  // `loginName` would silently misroute through the lookup branch — that was
  // the source of `;#1;#2;#` showing up for user-multi fields.
  if (explicitType) {
    return formatByExplicitTypeForPnP(fieldName, value, explicitType);
  }

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
      //
      // We deliberately do NOT write `${fieldName}_0` (the hidden Note field).
      // Per the official PnPjs docs, that convention only works on regular
      // *list* items via `update()` — it fails on document libraries (file
      // items), and the `_0` field can be named differently when the column
      // is inherited from a content type or provisioned with custom names.
      // For taxonomy fields, prefer `validateUpdateListItem()` (the autoSave
      // 'auto' / 'validate' path), which handles the hidden Note field
      // server-side regardless of list type. Callers using `update()`
      // directly with multi-taxonomy on a regular list will still get a
      // partial save (visible field updated, TaxCatchAll join may not
      // refresh until next save) but no longer hit "_0 does not exist"
      // errors on libraries.
      if ('termId' in firstItem || 'TermGuid' in firstItem || 'label' in firstItem) {
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
    if (
      ('latitude' in value && 'longitude' in value) ||
      ('Latitude' in value && 'Longitude' in value)
    ) {
      updates[fieldName] = buildLocationPayload(value);
      return updates;
    }

    // Image field
    if ('fileName' in value && 'serverUrl' in value) {
      updates[fieldName] = buildImagePayload(fieldName, value);
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
 * Resolve the people-picker entry shape that SharePoint's
 * `validateUpdateListItem` expects for user/group fields.
 *
 * For regular users, SharePoint accepts the membership claim built from the
 * email / UPN, with `IsResolved: false` so the server resolves the principal
 * during validation. `loginName` is treated as an email/UPN or an already
 * claims-formatted login, never as a person's display name.
 */
function buildUserValidateEntry(person: IPrincipal): { Key: string; IsResolved: boolean } {
  const key = toValidateUserKey(
    person.email || (person as any).EMail || person.loginName || person.value
  );
  if (!key) {
    throw new Error(
      `spUpdater: cannot build user field write — IPrincipal is missing a valid email/UPN or claims login in ` +
        `'email' / 'EMail' / 'loginName' / 'value'. ` +
        `SP validateUpdateListItem requires a people-picker Key such as ` +
        `'i:0#.f|membership|user@contoso.com'. Got: ${JSON.stringify({
          id: person.id,
          email: person.email,
          EMail: (person as any).EMail,
          loginName: person.loginName,
          value: person.value,
          title: person.title,
        })}`
    );
  }
  return { Key: key, IsResolved: false };
}

function toValidateUserKey(identifier: string | undefined): string | null {
  const value = (identifier || '').trim();
  if (!value) return null;
  if (value.includes('|')) return value;
  if (value.includes('@')) return `i:0#.f|membership|${value}`;
  return null;
}

/**
 * Format value for the `validateUpdateListItem` path with the caller's
 * explicit field type as the authoritative signal. Same rationale as
 * `formatByExplicitTypeForPnP`: typed setters override value-shape detection
 * so user-multi values without `email`/`loginName` don't silently misroute
 * through the lookup branch as `;#1;#2;#`.
 *
 * SharePoint wire formats reference:
 *   - text/note/choice  → plain string
 *   - number            → number as string
 *   - boolean           → '1' / '0'
 *   - date (DateTime)   → locale date/time (`6/23/2018 10:15 PM`)
 *   - dateOnly          → `YYYY-MM-DD` (no time, no TZ)
 *   - multiChoice       → `;#a;#b;#c;#`
 *   - user single/multi → `JSON.stringify([{Key: '<membership claim>', IsResolved: false}, …])`
 *   - lookup single     → numeric id as string
 *   - lookup multi      → `1;#Title 1;#2;#Title 2`
 *   - taxonomy single   → `Label|WssId|TermGuid;`
 *   - taxonomy multi    → `L1|WssId|G1;L2|WssId|G2;`
 *   - url               → `url, description`
 */
function formatByExplicitTypeForValidate(value: any, explicitType: SPUpdateFieldType): string {
  // Per-type empty/clear FieldValue. The consumer reset the value to null or
  // undefined → emit the SP-expected "empty" form so SP actually clears the
  // column instead of leaving it untouched.
  if (value === null || value === undefined) {
    // Empty string is the universal "clear this field" FieldValue on the
    // validate path for every SP field type — text/note/number/boolean/
    // date/dateOnly/choice/multiChoice/user/userMulti/lookup/lookupMulti/
    // taxonomy/taxonomyMulti/url. Specific non-empty forms ('0' for Boolean,
    // '[]' for user JSON arrays) would set explicit values rather than clear.
    return '';
  }

  switch (explicitType) {
    case 'string':
    case 'choice':
      return typeof value === 'string' ? value : String(value);

    case 'number':
      return typeof value === 'number' ? value.toString() : String(Number(value));

    case 'boolean':
      // Canonical `validateUpdateListItem` FieldValue for Yes/No columns is
      // numeric '1' / '0' per Phil Harding's documented format
      // (https://gist.github.com/phillipharding/30714d4ee245bfc0cba5699b6bb4193e).
      // 'Yes'/'No' works on some tenants but '1'/'0' is the canonical form.
      return value ? '1' : '0';

    case 'date':
      // DateTime: ISO without the `.000` millisecond suffix. The full
      // `toISOString()` form is rejected on some SPO tenants by
      // `validateUpdateListItem` with the generic "must specify a valid date"
      // error — see `toSpDateTimeString`. Both forms are valid ISO 8601.
      if (value instanceof Date) return toSpDateTimeString(value);
      if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? '' : toSpDateTimeString(d);
      }
      return '';

    case 'dateOnly': {
      // SP `validateUpdateListItem` for Date Only columns expects `M/D/YYYY`
      // locale format (US English), per the same source as DateTime above.
      // The PnP `update()` path keeps `YYYY-MM-DD` because Edm.DateTime
      // accepts ISO date — only the validate parser is locale-strict.
      if (value instanceof Date) return toSpDateString(value);
      if (typeof value === 'string') {
        // Already M/D/YYYY locale form → pass through.
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) return value;
        // YYYY-MM-DD → convert lexically (TZ-safe). Routing through `new Date`
        // would interpret the string as UTC midnight and the local-component
        // formatter would then shift the day by ±1 in non-UTC environments.
        const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (iso) return `${parseInt(iso[2], 10)}/${parseInt(iso[3], 10)}/${iso[1]}`;
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? '' : toSpDateString(parsed);
      }
      return '';
    }

    case 'multiChoice':
      // Canonical FieldValue format is `<choice1>;#<choice2>` — choices joined
      // by `;#` with NO leading or trailing marker. The leading-marker form
      // `;#A;#B;#` parses as an empty initial choice on SP, silently dropping
      // or corrupting values.
      if (!Array.isArray(value) || value.length === 0) return '';
      return value.map((v) => String(v)).join(';#');

    case 'user':
      // Single user is still wrapped in an array of one entry — SP's
      // validateUpdateListItem expects the same `[{Key}]` shape for both.
      return JSON.stringify([buildUserValidateEntry(value as IPrincipal)]);

    case 'userMulti':
      // Empty string is the safest validateUpdateListItem clear value for
      // people fields. Non-empty values must use the JSON `[{Key}]` form.
      if (!Array.isArray(value) || value.length === 0) return '';
      return JSON.stringify(
        value.map((p: IPrincipal) => buildUserValidateEntry(p))
      );

    case 'lookup': {
      const id =
        typeof value === 'number'
          ? value
          : value && ((value as any).id ?? (value as any).Id);
      if (id === undefined || id === null || id === '') return '';
      return String(id);
    }

    case 'lookupMulti': {
      return formatLookupMultiForValidate(value);
    }

    case 'taxonomy': {
      // Canonical FieldValue per Phil Harding's gist:
      // `Label|WssId|TermGuid;` — three pipe-separated parts (label, WssId
      // placeholder, term GUID), terminated by `;`. WssId is `-1` when
      // unknown (SP resolves the actual id server-side); pass an explicit
      // WssId if you already have one from a prior read. Without the WssId
      // placeholder the parser silently fails to persist on many tenants.
      const label = (value as any).label || (value as any).Label;
      const termId = (value as any).termId || (value as any).TermGuid || (value as any).TermID;
      const wssId = (value as any).wssId ?? (value as any).WssId ?? -1;
      return `${label}|${wssId}|${termId};`;
    }

    case 'taxonomyMulti':
      // Canonical FieldValue per Phil Harding's gist: each entry is
      // `Label|WssId|TermGuid;` (terminated by `;`), entries concatenated.
      // Result: `L1|-1|G1;L2|-1|G2;`.
      if (!Array.isArray(value) || value.length === 0) return '';
      return value
        .map((item) => {
          const label = item.label || item.Label;
          const termId = item.termId || item.TermGuid || item.TermID;
          const wssId = item.wssId ?? item.WssId ?? -1;
          return `${label}|${wssId}|${termId};`;
        })
        .join('');

    case 'url': {
      const url =
        typeof value === 'string' ? value : (value as any).url || (value as any).Url || '';
      const desc =
        typeof value === 'string' ? '' : (value as any).description || (value as any).Description || '';
      return desc ? `${url}, ${desc}` : url;
    }

    case 'location':
    case 'image':
      // No standardized validateUpdateListItem wire format for these; emit
      // JSON so SP at least receives structured data. If your tenant
      // rejects these, use the PnP `update()` path via getUpdates().
      return JSON.stringify(value);

    default:
      return typeof value === 'string' ? value : JSON.stringify(value);
  }
}

/**
 * Format JavaScript values to SharePoint string format for validate methods
 */
function formatValueForValidate(value: any, explicitType?: SPUpdateFieldType): string {
  // Typed setters (setUserMulti, setLookupMulti, …) take precedence over
  // value-shape detection. Without this, a user-multi value lacking
  // `email`/`loginName` silently misroutes through the lookup branch and
  // emits `;#1;#2;#` instead of the required `[{Key}]` JSON.
  if (explicitType) {
    return formatByExplicitTypeForValidate(value, explicitType);
  }

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
    // Canonical FieldValue for Yes/No columns per Phil Harding's documented
    // format is numeric '1' / '0'.
    return value ? '1' : '0';
  }

  if (value instanceof Date) {
    // ISO without the `.000` millisecond suffix — see `toSpDateTimeString`.
    // Some SPO tenants reject `…T…:…:….000Z` from `validateUpdateListItem`
    // with the generic "must specify a valid date" error. Both forms are
    // valid ISO 8601; the stripped form is universally accepted.
    return toSpDateTimeString(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '';
    }

    const firstItem = value[0];

    if (typeof firstItem === 'string') {
      // SP MultiChoice canonical FieldValue: `<choice1>;#<choice2>` — joined
      // by `;#` with NO leading/trailing marker. The leading-marker variant
      // `;#A;#B;#` parses as an empty initial choice on SP.
      return value.join(';#');
    }

    if (typeof firstItem === 'number') {
      return formatLookupMultiForValidate(value);
    }

    if (typeof firstItem === 'object' && firstItem !== null) {
      // User multi
      if ('email' in firstItem || 'EMail' in firstItem || 'value' in firstItem || 'loginName' in firstItem) {
        const persons = value.map((person: IPrincipal) => buildUserValidateEntry(person));
        return JSON.stringify(persons);
      }

      // Lookup multi (object form: `{ Id, Title }[]`) — ID/value pairs.
      if ('id' in firstItem || 'Id' in firstItem) {
        return formatLookupMultiForValidate(value);
      }

      // Taxonomy multi — `Label|WssId|TermGuid;` entries concatenated.
      // WssId is `-1` placeholder when unknown.
      if ('termId' in firstItem || 'TermGuid' in firstItem) {
        return value.map(item => {
          const label = item.label || item.Label;
          const termId = item.termId || item.TermGuid || item.TermID;
          const wssId = item.wssId ?? item.WssId ?? -1;
          return `${label}|${wssId}|${termId};`;
        }).join('');
      }
    }

    return JSON.stringify(value);
  }

  if (typeof value === 'object' && value !== null) {
    // User single
    if ('email' in value || 'EMail' in value || 'value' in value || 'loginName' in value) {
      return JSON.stringify([buildUserValidateEntry(value as IPrincipal)]);
    }

    // Lookup single
    if ('id' in value || 'Id' in value) {
      return (value.id || value.Id).toString();
    }

    // Taxonomy single — `Label|WssId|TermGuid;` per Phil Harding's gist.
    // WssId is `-1` placeholder when unknown.
    if ('termId' in value || 'TermGuid' in value) {
      const label = value.label || value.Label;
      const termId = value.termId || value.TermGuid || value.TermID;
      const wssId = value.wssId ?? value.WssId ?? -1;
      return `${label}|${wssId}|${termId};`;
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
      let originalValueProvided = false;
      let type: SPUpdateFieldType | undefined = explicitType;

      if (typeof originalValueOrType === 'string' && isValidFieldType(originalValueOrType)) {
        // Third param is explicit type
        type = originalValueOrType as SPUpdateFieldType;
      } else {
        // Third param is original value
        originalValue = originalValueOrType;
        originalValueProvided = arguments.length >= 3;
      }

      // Detect type from value if not explicitly provided
      const detectedType = type || detectFieldTypeFromValue(value);

      // Normalize the value
      const normalizedValue = normalizeValue(value, detectedType);

      // Determine if the value has actually changed
      let hasChanged = true;
      if (originalValueProvided) {
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
    setText: function (fieldName: string, value: string | null | undefined, originalValue?: string | null | undefined) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'string')
        : this.set(fieldName, value, 'string');
    },

    /**
     * Set a number field value
     * @example updater.setNumber('Amount', 100)
     */
    setNumber: function (fieldName: string, value: number | null | undefined, originalValue?: number | null | undefined) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'number')
        : this.set(fieldName, value, 'number');
    },

    /**
     * Set a boolean/Yes-No field value
     * @example updater.setBoolean('IsActive', true)
     */
    setBoolean: function (fieldName: string, value: boolean | null | undefined, originalValue?: boolean | null | undefined) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'boolean')
        : this.set(fieldName, value, 'boolean');
    },

    /**
     * Set a DateTime field value (time-of-day matters).
     *
     * Wire format:
     *   - `getUpdates()` → passes the `Date` instance; PnP serializes to ISO
     *     `…T…Z` via `JSON.stringify`.
     *   - `getValidateUpdates()` → locale date/time string, e.g.
     *     `6/23/2018 10:15 PM` for US-English sites.
     *
     * For **Date Only** columns, use {@link setDateOnly} instead — it avoids
     * the ±1 day shift that ISO-with-Z causes in non-UTC tenants.
     *
     * @example updater.setDate('CreatedTimestamp', new Date())
     */
    setDate: function (fieldName: string, value: Date | null | undefined, originalValue?: Date | null | undefined) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'date')
        : this.set(fieldName, value, 'date');
    },

    /**
     * Set a Date Only field value (no time component).
     *
     * Wire format (both paths): `YYYY-MM-DD` using the date's **local**
     * calendar components. Date pickers (DevExtreme DateBox `type="date"`,
     * Fluent DatePicker) produce a `Date` at local midnight for the picked
     * day; reading local components preserves that day exactly regardless of
     * the SP regional timezone. Avoids the day-shift bug where a US user
     * picks "Jan 15" and SP stores/displays "Jan 14" because of UTC
     * normalization.
     *
     * Accepts a `Date` instance or a `YYYY-MM-DD` string.
     *
     * @example updater.setDateOnly('DueDate', new Date('2024-01-15'))
     * @example updater.setDateOnly('DueDate', '2024-01-15')
     */
    setDateOnly: function (
      fieldName: string,
      value: Date | string | null | undefined,
      originalValue?: Date | string | null | undefined
    ) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'dateOnly')
        : this.set(fieldName, value, 'dateOnly');
    },

    /**
     * Set a choice field value
     * @example updater.setChoice('Status', 'Active')
     */
    setChoice: function (fieldName: string, value: string | null | undefined, originalValue?: string | null | undefined) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'choice')
        : this.set(fieldName, value, 'choice');
    },

    /**
     * Set a multi-choice field value
     * @example updater.setMultiChoice('Categories', ['Cat1', 'Cat2'])
     */
    setMultiChoice: function (fieldName: string, value: string[] | null | undefined, originalValue?: string[] | null | undefined) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'multiChoice')
        : this.set(fieldName, value, 'multiChoice');
    },

    /**
     * Set a single user/person field value
     * @example updater.setUser('AssignedTo', { id: '1', email: 'user@contoso.com', title: 'John Doe' })
     */
    setUser: function (fieldName: string, value: IPrincipal | null | undefined, originalValue?: IPrincipal | null | undefined) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'user')
        : this.set(fieldName, value, 'user');
    },

    /**
     * Set a multi-user/person field value
     * @example updater.setUserMulti('TeamMembers', [{ id: '1', email: 'user1@...' }, { id: '2', email: 'user2@...' }])
     */
    setUserMulti: function (fieldName: string, value: IPrincipal[] | null | undefined, originalValue?: IPrincipal[] | null | undefined) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'userMulti')
        : this.set(fieldName, value, 'userMulti');
    },

    /**
     * Set a single lookup field value
     * @example updater.setLookup('Category', { Id: 1, Title: 'Category A' })
     */
    setLookup: function (fieldName: string, value: { Id: number; Title?: string } | null | undefined, originalValue?: { Id: number; Title?: string } | null | undefined) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'lookup')
        : this.set(fieldName, value, 'lookup');
    },

    /**
     * Set a multi-lookup field value
     * @example updater.setLookupMulti('Tags', [{ Id: 1, Title: 'Tag1' }, { Id: 2, Title: 'Tag2' }])
     */
    setLookupMulti: function (fieldName: string, value: Array<{ Id: number; Title?: string }> | null | undefined, originalValue?: Array<{ Id: number; Title?: string }> | null | undefined) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'lookupMulti')
        : this.set(fieldName, value, 'lookupMulti');
    },

    /**
     * Set a single taxonomy/managed metadata field value.
     *
     * Save behavior:
     *   - `getUpdates()` (PnP `update()` path) → emits `{ FieldName: { Label,
     *     TermGuid, WssId } }`. Works on regular list items.
     *   - `getValidateUpdates()` (`validateUpdateListItem`) → emits
     *     `{ FieldName, FieldValue: 'Label|-1|TermGuid;' }`. **Required for
     *     document libraries (file items)** — `update()` does not work for
     *     taxonomy on libraries.
     *
     * @example updater.setTaxonomy('Department', { Label: 'Engineering', TermGuid: 'guid-here' })
     */
    setTaxonomy: function (
      fieldName: string,
      value: { Label: string; TermGuid: string; WssId?: number } | null | undefined,
      originalValue?: { Label: string; TermGuid: string; WssId?: number } | null | undefined
    ) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'taxonomy')
        : this.set(fieldName, value, 'taxonomy');
    },

    /**
     * Set a multi-taxonomy/managed metadata field value.
     *
     * Save behavior:
     *   - `getUpdates()` (PnP `update()` path) → emits ONLY the visible
     *     field as an array of `{ Label, TermGuid, WssId }`. The hidden
     *     `${fieldName}_0` Note field is **not** written, because the `_0`
     *     convention fails on document libraries and on fields with
     *     non-conventional hidden field names. Direct `update()` callers
     *     get a partial save (visible field updated, TaxCatchAll join may
     *     not refresh).
     *   - `getValidateUpdates()` (`validateUpdateListItem`) → emits
     *     `{ FieldName, FieldValue: 'L1|-1|g1;L2|-1|g2;' }`. **Recommended path
     *     for taxonomy multi.** Handles the hidden Note field server-side
     *     regardless of list type. SPDynamicForm's autoSave routes here by
     *     default via `VALIDATE_PREFERRED_TYPES`.
     *
     * @example updater.setTaxonomyMulti('Keywords', [{ Label: 'Term1', TermGuid: 'guid1' }, { Label: 'Term2', TermGuid: 'guid2' }])
     */
    setTaxonomyMulti: function (
      fieldName: string,
      value: Array<{ Label: string; TermGuid: string; WssId?: number }> | null | undefined,
      originalValue?: Array<{ Label: string; TermGuid: string; WssId?: number }> | null | undefined
    ) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'taxonomyMulti')
        : this.set(fieldName, value, 'taxonomyMulti');
    },

    /**
     * Set a URL/hyperlink field value
     * @example updater.setUrl('Website', { url: 'https://example.com', description: 'Example Site' })
     */
    setUrl: function (
      fieldName: string,
      value: { url: string; description?: string } | null | undefined,
      originalValue?: { url: string; description?: string } | null | undefined
    ) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'url')
        : this.set(fieldName, value, 'url');
    },

    /**
     * Set a geolocation field value.
     * @example updater.setLocation('Office', { latitude: 47.672082, longitude: -122.1409983 })
     */
    setLocation: function (
      fieldName: string,
      value: { latitude: number; longitude: number } | { Latitude: number; Longitude: number } | null | undefined,
      originalValue?: { latitude: number; longitude: number } | { Latitude: number; Longitude: number } | null | undefined
    ) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'location')
        : this.set(fieldName, value, 'location');
    },

    /**
     * Set a modern SharePoint image column value.
     * @example updater.setImage('Thumbnail', { fileName: 'a.png', serverUrl: 'https://tenant.sharepoint.com', serverRelativeUrl: '/sites/demo/SiteAssets/a.png' })
     */
    setImage: function (
      fieldName: string,
      value: {
        fileName: string;
        serverUrl: string;
        serverRelativeUrl: string;
        id?: string;
        type?: string;
        fieldName?: string;
      } | null | undefined,
      originalValue?: {
        fileName: string;
        serverUrl: string;
        serverRelativeUrl: string;
        id?: string;
        type?: string;
        fieldName?: string;
      } | null | undefined
    ) {
      return arguments.length >= 3
        ? this.set(fieldName, value, originalValue, 'image')
        : this.set(fieldName, value, 'image');
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
        FieldValue: formatValueForValidate(update.value, update.explicitType),
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
    'string', 'number', 'boolean', 'date', 'dateOnly', 'user', 'userMulti',
    'lookup', 'lookupMulti', 'taxonomy', 'taxonomyMulti',
    'choice', 'multiChoice', 'url', 'location', 'image'
  ];
  return validTypes.includes(value as SPUpdateFieldType);
}
