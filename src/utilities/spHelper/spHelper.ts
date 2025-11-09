/**
 * SharePoint Helper Utility
 * Provides helper functions for working with SharePoint lists and items
 *
 * @packageDocumentation
 */

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';

/**
 * Checks if a string is a valid GUID (Globally Unique Identifier)
 *
 * @param value - The string to test
 * @returns True if the string is a valid GUID, false otherwise
 *
 * @example
 * ```typescript
 * isGuid('a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6'); // true
 * isGuid('{a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6}'); // true (SharePoint format)
 * isGuid('MyList'); // false
 * ```
 */
export function isGuid(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // Remove curly braces if present (SharePoint format: {GUID})
  const cleanValue = value.replace(/[{}]/g, '');

  // GUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // Also supports format without hyphens: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const guidPatternNoHyphens = /^[0-9a-f]{32}$/i;

  return guidPattern.test(cleanValue) || guidPatternNoHyphens.test(cleanValue);
}

/**
 * Gets a SharePoint list by GUID or title
 * Automatically detects if the provided identifier is a GUID or title
 *
 * @param sp - PnP SP instance
 * @param listNameOrId - List title or GUID
 * @returns IList instance
 *
 * @example
 * ```typescript
 * // Using title
 * const list = getListByNameOrId(SPContext.sp, 'MyList');
 *
 * // Using GUID
 * const list = getListByNameOrId(SPContext.sp, 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6');
 *
 * // Using GUID with curly braces (SharePoint format)
 * const list = getListByNameOrId(SPContext.sp, '{a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6}');
 * ```
 */
export function getListByNameOrId(sp: SPFI, listNameOrId: string) {
  if (isGuid(listNameOrId)) {
    // Remove curly braces if present (SharePoint format: {GUID})
    const cleanGuid = listNameOrId.replace(/[{}]/g, '');
    return sp.web.lists.getById(cleanGuid);
  } else {
    return sp.web.lists.getByTitle(listNameOrId);
  }
}

/**
 * Normalizes a GUID to include hyphens if missing
 *
 * @param guid - GUID with or without hyphens
 * @returns GUID with hyphens in standard format
 *
 * @example
 * ```typescript
 * normalizeGuid('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6');
 * // Returns: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6'
 * ```
 */
export function normalizeGuid(guid: string): string {
  if (!guid) return guid;

  // Remove existing hyphens
  const cleaned = guid.replace(/-/g, '');

  // Validate length
  if (cleaned.length !== 32) {
    return guid; // Return original if invalid
  }

  // Add hyphens in standard positions
  return `${cleaned.substring(0, 8)}-${cleaned.substring(8, 12)}-${cleaned.substring(12, 16)}-${cleaned.substring(16, 20)}-${cleaned.substring(20, 32)}`;
}
