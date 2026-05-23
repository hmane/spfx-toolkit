import type {
  IAccessDiff,
  IAccessDiffSection,
  IDirectListPermission,
  ISiteGroup,
  IUserAccessLevel1,
} from './types';

/**
 * Partitions two arrays into common, onlyA, and onlyB based on a key function.
 * Generic function that works with any type T.
 *
 * @param a First array
 * @param b Second array
 * @param keyOf Function to extract unique key from each item
 * @returns Object with common, onlyA, and onlyB arrays
 */
function partitionByKey<T>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>,
  keyOf: (item: T) => string
): { common: T[]; onlyA: T[]; onlyB: T[] } {
  const aMap = new Map(a.map((x) => [keyOf(x), x]));
  const bMap = new Map(b.map((x) => [keyOf(x), x]));
  const common: T[] = [];
  const onlyA: T[] = [];
  const onlyB: T[] = [];

  for (const [k, v] of aMap) {
    if (bMap.has(k)) {
      common.push(v);
    } else {
      onlyA.push(v);
    }
  }

  for (const [k, v] of bMap) {
    if (!aMap.has(k)) {
      onlyB.push(v);
    }
  }

  return { common, onlyA, onlyB };
}

/**
 * Extracts a unique key for a site group based on its id.
 * @param g Site group
 * @returns Unique key string
 */
function groupKey(g: ISiteGroup): string {
  return `g:${g.id}`;
}

/**
 * Extracts a unique key for a direct list permission based on listId, source identity, and permission level.
 * Two permissions are considered "the same" if they grant the same list access via the same source
 * (Direct or via the same group) at the same level.
 *
 * @param d Direct list permission
 * @returns Unique key string encoding list.id, source identity, and permission level
 */
function dlpKey(d: IDirectListPermission): string {
  const sourceKey = d.source === 'Direct' ? 'direct' : `via:${d.source.viaGroupId}`;
  return `l:${d.list.id}|s:${sourceKey}|lvl:${d.permissionLevel}`;
}

/**
 * Compares two users' access levels and partitions their groups and direct list permissions
 * into common, onlyA, and onlyB sections.
 *
 * Groups are considered "the same" if they have the same id.
 * Direct list permissions are considered "the same" if they target the same list,
 * grant permission via the same source (Direct or same group), and have the same permission level.
 *
 * @param a First user access level
 * @param b Second user access level
 * @returns Access diff with common, onlyA, and onlyB sections
 */
export function diffUserAccess(a: IUserAccessLevel1, b: IUserAccessLevel1): IAccessDiff {
  const groups = partitionByKey(a.siteGroups, b.siteGroups, groupKey);
  const dlp = partitionByKey(a.directListPermissions, b.directListPermissions, dlpKey);

  return {
    userA: a.user,
    userB: b.user,
    common: {
      groups: groups.common,
      directListPermissions: dlp.common,
    },
    onlyA: {
      groups: groups.onlyA,
      directListPermissions: dlp.onlyA,
    },
    onlyB: {
      groups: groups.onlyB,
      directListPermissions: dlp.onlyB,
    },
  };
}
