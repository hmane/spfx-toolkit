/**
 * Cache key generators for the User Access module.
 *
 * These functions produce stable, deterministic cache keys for different
 * levels of access data and related queries.
 */
import { normalizeLoginForCacheKey } from './loginNormalization';
import type { ListRef } from './types';

/**
 * Generates a Level-1 cache key (site-level access snapshot).
 * Normalizes login to ensure consistent keys regardless of format.
 */
export function level1Key(login: string): string {
  return `l1:${normalizeLoginForCacheKey(login)}`;
}

/**
 * Helper to generate the list segment of a cache key.
 * Prioritizes id over title for stability.
 */
function listRefSegment(ref: ListRef): string {
  if (ref.id !== undefined) {
    if (ref.id === '') throw new Error('listRef: id must not be empty string');
    return `id=${ref.id}`;
  }
  if (ref.title) return `title=${ref.title}`;
  throw new Error('listRef: provide id or title');
}

/**
 * Generates a Level-2 cache key (list-level permissions for a user).
 * Includes normalized login and list reference (id or title).
 */
export function level2Key(login: string, listRef: ListRef): string {
  return `l2:${normalizeLoginForCacheKey(login)}:${listRefSegment(listRef)}`;
}

/**
 * Generates a Level-3 cache key (item-level permissions for a user).
 * Includes normalized login, list reference, and item ID.
 */
export function level3Key(
  login: string,
  listRef: ListRef,
  itemId: number
): string {
  return `l3:${normalizeLoginForCacheKey(login)}:${listRefSegment(listRef)}:item=${itemId}`;
}

/**
 * Constant cache key for site-level groups.
 * No user or list context; used for caching all groups on a site.
 */
export function siteGroupsKey(): string {
  return 'siteGroups';
}

/**
 * Generates a cache key for group members.
 * Prioritizes id over name for stability.
 */
export function groupMembersKey(ref: {
  id?: number;
  name?: string;
}): string {
  if (typeof ref.id === 'number') return `groupMembers:id=${ref.id}`;
  if (ref.name) return `groupMembers:name=${ref.name}`;
  throw new Error('groupRef: provide id or name');
}

/**
 * Constant cache key for lists with broken inheritance on a site.
 * No user or group context; site-level cache only.
 */
export function brokenInheritanceKey(): string {
  return 'brokenInheritance';
}
