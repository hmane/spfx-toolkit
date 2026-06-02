// src/utilities/userAccess/userAccessService.ts
import { SPContext } from '../context';
import '../context/pnpImports/core';
import '../context/pnpImports/lists';
import '../context/pnpImports/security';
import '../context/pnpImports/siteGroups';
import { PermissionKind } from '@pnp/sp/security';

import { getListsWithUniqueRoleAssignments } from './brokenInheritance';
import {
  brokenInheritanceKey,
  groupMembersKey,
  level1Key,
  level2Key,
  level3Key,
  siteGroupsKey,
} from './cacheKeys';
import { getCache, setCache, TTL, invalidatePrefix, clearAll } from './userAccessCache';
import { fromItems } from './bulkResult';
import { diffUserAccess } from './userAccessDiff';
import { UserAccessError } from './UserAccessError';
import type {
  IAccessDiff,
  IDirectListPermission,
  IItemPermission,
  IListPermission,
  IListWithUniqueRoles,
  ISiteGroup,
  ISiteUser,
  IUserAccessConfig,
  IUserAccessLevel1,
  ListRef,
  LoginInput,
  MatchedPrincipalKind,
  PermissionLevelLabel,
} from './types';

let serviceConfig: IUserAccessConfig = {};

function logger() {
  return SPContext.logger;
}

async function ensureSiteUser(login: LoginInput): Promise<ISiteUser> {
  const sp = SPContext.sp;
  try {
    const raw: any =
      login === 'current'
        ? await sp.web.currentUser()
        : await sp.web.ensureUser(login).then((r: any) => r.data);
    return {
      id: raw.Id,
      loginName: raw.LoginName,
      title: raw.Title,
      email: raw.Email,
      isHiddenInUI: raw.IsHiddenInUI,
    };
  } catch (err) {
    throw new UserAccessError('USER_NOT_FOUND', `Cannot resolve login: ${login}`, {
      login: String(login),
      cause: err,
    });
  }
}

async function getUserSiteGroupsRaw(userId: number): Promise<ISiteGroup[]> {
  // Use a high $top to avoid the SP default 100-row page limit.
  // A user could belong to a large number of groups on enterprise tenants.
  const raw: any[] = await (SPContext.sp.web.siteUsers
    .getById(userId) as any)
    .groups
    .top(5000)
    .select('Id', 'LoginName', 'Title', 'Description')();
  return raw.map((g: any) => ({
    id: g.Id,
    loginName: g.LoginName,
    title: g.Title,
    description: g.Description,
  }));
}

function derivePermissionLevel(
  roleNames: ReadonlyArray<string>
): PermissionLevelLabel {
  // Filter the noisy auto-applied level
  const filtered = roleNames.filter(n => n !== 'Limited Access');
  if (filtered.length === 0) return 'None';
  if (filtered.includes('Full Control')) return 'Owner';
  if (filtered.some(n => n === 'Edit' || n === 'Contribute')) return 'Member';
  if (filtered.includes('Read')) return 'Visitor';
  return 'Custom';
}

/**
 * Tests a single PermissionKind bit against a serialized mask.
 *
 * SharePoint encodes effective permissions as a 64-bit `BasePermissions` value
 * split across two 32-bit halves (`High`/`Low`). PermissionKind is 1-based:
 * kind `n` maps to bit `n - 1` in the 64-bit value.
 */
function hasMaskPermission(
  mask: { high: string; low: string },
  kind: PermissionKind
): boolean {
  // TS target is pre-ES2020; use BigInt() constructor form instead of literals.
  const SHIFT_32 = BigInt(32);
  const ONE = BigInt(1);
  const ZERO = BigInt(0);
  const m = (BigInt(mask.high) << SHIFT_32) | BigInt(mask.low);
  return (m & (ONE << BigInt(kind - 1))) !== ZERO;
}

/**
 * Derives a permission level label from a SharePoint base-permissions mask.
 *
 * Used as a fallback when no SharePoint role assignments matched the user
 * directly (e.g., access via an Entra ID security group, a sharing link, or
 * an app-only grant) but `getUserEffectivePermissions` still returns a
 * non-empty mask. The visible "Source" column in the UI will show no matched
 * assignments; this label communicates the actual effective level.
 */
function derivePermissionLevelFromMask(
  mask: { high: string; low: string }
): PermissionLevelLabel {
  if (Number(mask.high) === 0 && Number(mask.low) === 0) return 'None';
  if (hasMaskPermission(mask, PermissionKind.ManageWeb)) return 'Owner';
  if (hasMaskPermission(mask, PermissionKind.EditListItems)) return 'Member';
  if (hasMaskPermission(mask, PermissionKind.ViewListItems)) return 'Visitor';
  return 'Custom';
}

interface IRawRoleAssignment {
  Member: {
    Id: number;
    /** 1=User, 4=SecurityGroup/Entra, 8=SharePointGroup */
    PrincipalType: number;
    Title: string;
    LoginName?: string;
  };
  RoleDefinitionBindings: Array<{ Id: number; Name: string; Hidden?: boolean }>;
}

/**
 * Returns true when a role-assignment member matches a well-known "Everyone"
 * or "Everyone except external users" claim, regardless of tenant configuration.
 *
 * SharePoint represents these as synthetic security-principal entries whose
 * LoginName contains one of the following patterns (tenant-specific prefix
 * varies, so we match on the claim-value suffix only):
 *   - `spo-grid-all-users/<tenantId>` (Everyone)
 *   - `c:0(.s|true`  (Everyone – federated claim form)
 *   - `c:0-.f|rolemanager|spo-grid-all-users` (Everyone – role-manager form)
 *   - `c:0!.s|windows`  (NT AUTHORITY\authenticated users)
 * We also match on a normalised Title for robustness.
 */
function isEveryoneClaim(member: IRawRoleAssignment['Member']): boolean {
  const login = (member.LoginName ?? '').toLowerCase();
  const title = member.Title.toLowerCase();
  if (title === 'everyone' || title === 'everyone except external users') return true;
  if (login.includes('spo-grid-all-users')) return true;
  // Federated claim forms: c:0(.s|true, c:0-.f|rolemanager|...
  if (login.startsWith('c:0(') || login.startsWith('c:0-') || login.startsWith('c:0!')) return true;
  return false;
}

async function fetchListRoleAssignments(
  listId: string
): Promise<IRawRoleAssignment[]> {
  return (await (SPContext.sp.web.lists
    .getById(listId) as any)
    .roleAssignments
    .expand('Member', 'RoleDefinitionBindings')
    .select(
      'Member/Id',
      'Member/PrincipalType',
      'Member/Title',
      'Member/LoginName',
      'RoleDefinitionBindings/Id',
      'RoleDefinitionBindings/Name',
      'RoleDefinitionBindings/Hidden'
    )()) as IRawRoleAssignment[];
}

interface IMatchedAssignment {
  raw: IRawRoleAssignment;
  principalKind: MatchedPrincipalKind;
  membershipUnverified: boolean;
}

/**
 * Matches role assignments against a user and their SP groups, and also
 * surfaces Entra security-group and "Everyone"/"Everyone except external users"
 * claim principals as unverified candidate sources.
 *
 * Returns all assignments that are plausibly relevant:
 *  - PrincipalType 1 (User): confirmed match when Id equals the user's Id.
 *  - PrincipalType 8 (SP group): confirmed match when the group is in groupIds.
 *  - PrincipalType 4 (Entra/AD security group): included as `membershipUnverified`
 *    — the toolkit cannot enumerate Entra group membership via this API.
 *  - "Everyone" / "Everyone except external users" claims (any PrincipalType):
 *    always included as `membershipUnverified` because they apply to all users.
 *
 * Permission-level derivation is NOT affected; only the source list is enriched.
 */
export function matchAssignments(
  assignments: ReadonlyArray<IRawRoleAssignment>,
  user: ISiteUser,
  groupIds: Set<number>
): IMatchedAssignment[] {
  const results: IMatchedAssignment[] = [];

  for (const a of assignments) {
    const m = a.Member;

    if (m.PrincipalType === 1) {
      if (m.Id === user.id) {
        results.push({ raw: a, principalKind: 'user', membershipUnverified: false });
      }
      continue;
    }

    if (m.PrincipalType === 8) {
      if (groupIds.has(m.Id)) {
        results.push({ raw: a, principalKind: 'spGroup', membershipUnverified: false });
      }
      continue;
    }

    // Everyone / Everyone except external users — applies to all users
    if (isEveryoneClaim(m)) {
      logger().info(
        'userAccess.matchAssignments: surfacing Everyone/claim principal (membership unverified)',
        { principalId: m.Id, principalType: m.PrincipalType, title: m.Title, loginName: m.LoginName }
      );
      results.push({ raw: a, principalKind: 'securityGroupOrClaim', membershipUnverified: true });
      continue;
    }

    // Entra/AD security group (PrincipalType 4) — cannot verify membership
    if (m.PrincipalType === 4) {
      logger().info(
        'userAccess.matchAssignments: surfacing security group as unverified candidate source',
        { principalId: m.Id, principalType: m.PrincipalType, title: m.Title, loginName: m.LoginName }
      );
      results.push({ raw: a, principalKind: 'securityGroupOrClaim', membershipUnverified: true });
      continue;
    }
  }

  return results;
}

/**
 * Surgically invalidates cache entries affected by a group-membership change
 * for a single user.
 *
 * Invalidates:
 *  - Level-1/2/3 entries for both the raw login passed to the public API AND
 *    the canonical SharePoint LoginName resolved from it (since callers may
 *    pass email, claims, or 'current' for the same identity)
 *  - 'current' aliases for the same three levels (the affected user may be
 *    cached under the 'current' sentinel)
 *  - The ENTIRE `groupMembers:` prefix. `useGroupMembers` accepts either
 *    `{ id }` or `{ name }`, producing two different cache keys for the same
 *    group. Resolving id→title from the (possibly-stale) site-groups cache to
 *    invalidate both forms surgically risks missing entries; clearing the
 *    whole `groupMembers:` namespace is correct and simple. The over-
 *    invalidation cost is one cache miss per group-members lookup after a
 *    rare admin bulk edit — acceptable.
 *
 * Does NOT invalidate:
 *  - `siteGroupsKey()` — the list of groups on the site does not change when
 *    membership changes; that cache stays valid.
 *  - L1/L2/L3 caches for *other* users (untouched, including other admins
 *    who happen to be browsing).
 */
function invalidateAfterMembershipChange(
  rawLogin: LoginInput,
  canonicalLoginName: string,
  _affectedGroupIds: ReadonlyArray<number>
): void {
  const keysToInvalidate = new Set<string>();
  const rawForKey = rawLogin === 'current' ? 'current' : rawLogin;
  keysToInvalidate.add(rawForKey);
  keysToInvalidate.add(canonicalLoginName);
  keysToInvalidate.add('current');

  for (const key of keysToInvalidate) {
    invalidatePrefix(level1Key(key));
    // L2/L3 keys share a common prefix `l2:<login>:` and `l3:<login>:`.
    // Construct a representative key, then strip the listRef segment.
    invalidatePrefix(level2Key(key, { id: '__prefix__' }).split(':id=')[0]);
    invalidatePrefix(level3Key(key, { id: '__prefix__' }, 0).split(':id=')[0]);
  }

  // Clear the entire groupMembers namespace — covers both id-keyed and
  // name-keyed entries for the affected (and any other cached) group.
  invalidatePrefix('groupMembers:');
}

export function buildDirectListPermission(
  list: IListWithUniqueRoles,
  matched: IMatchedAssignment,
  _user: ISiteUser
): IDirectListPermission {
  const m = matched.raw.Member;
  const roles = matched.raw.RoleDefinitionBindings.filter(r => !r.Hidden);
  const isDirect = matched.principalKind === 'user';
  return {
    list,
    source: isDirect
      ? 'Direct'
      : { viaGroupId: m.Id, viaGroupTitle: m.Title },
    roleDefinitions: roles.map(r => ({ id: r.Id, name: r.Name })),
    permissionLevel: derivePermissionLevel(roles.map(r => r.Name)),
    principalKind: matched.principalKind,
    ...(matched.membershipUnverified ? { membershipUnverified: true as const } : {}),
  };
}

// =========================================================================
// Public surface
// =========================================================================

export const userAccessService = {
  configure(cfg: IUserAccessConfig): void {
    serviceConfig = { ...serviceConfig, ...cfg };
    // Config may change which lists are included; clear caches so subsequent
    // reads reflect the new config rather than stale results.
    clearAll();
  },

  async getUserAccessLevel1(
    login: LoginInput,
    opts: { bypassCache?: boolean } = {}
  ): Promise<IUserAccessLevel1> {
    const cacheKey = level1Key(login === 'current' ? 'current' : login);
    if (!opts.bypassCache) {
      const cached = getCache<IUserAccessLevel1>(cacheKey);
      if (cached) return cached;
    }

    const user = await ensureSiteUser(login);
    if (user.isHiddenInUI) {
      throw new UserAccessError('USER_NOT_FOUND', 'User hidden / deleted', {
        login: String(login),
      });
    }

    const [siteGroups, brokenLists] = await Promise.all([
      getUserSiteGroupsRaw(user.id),
      getListsWithUniqueRoleAssignments(serviceConfig),
    ]);
    const groupIdSet = new Set(siteGroups.map(g => g.id));

    // PnP batch: fetch role assignments for every broken-inheritance list in one round trip.
    const directListPermissions: IDirectListPermission[] = [];
    if (brokenLists.length > 0) {
      const [spBatch, execute] = SPContext.sp.batched();
      const promises = brokenLists.map(list =>
        ((spBatch.web.lists
          .getById(list.id) as any)
          .roleAssignments
          .expand('Member', 'RoleDefinitionBindings')
          .select(
            'Member/Id',
            'Member/PrincipalType',
            'Member/Title',
            'Member/LoginName',
            'RoleDefinitionBindings/Id',
            'RoleDefinitionBindings/Name',
            'RoleDefinitionBindings/Hidden'
          )() as Promise<IRawRoleAssignment[]>).then((asg: IRawRoleAssignment[]) => ({ list, asg }))
      );
      await execute();
      // Best-effort per list: a single inaccessible/problematic list must not
      // fail the entire Level-1 view. Log and skip rejected lists.
      const settled = await Promise.allSettled(promises);

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const { list, asg } = result.value;
          const matched = matchAssignments(asg, user, groupIdSet);
          for (const m of matched) {
            directListPermissions.push(buildDirectListPermission(list, m, user));
          }
        } else {
          logger().warn(
            'userAccess.getUserAccessLevel1: skipping list (role-assignment fetch failed)',
            { error: result.reason }
          );
        }
      }
    }

    const result: IUserAccessLevel1 = {
      user,
      siteGroups,
      directListPermissions,
    };
    setCache(cacheKey, result, TTL.level1);
    logger().info('userAccess.getUserAccessLevel1', {
      login,
      groupCount: siteGroups.length,
      directPermsCount: directListPermissions.length,
    });
    return result;
  },

  async getEffectiveListPermission(
    login: LoginInput,
    listRef: ListRef
  ): Promise<IListPermission> {
    if (!listRef.id && !listRef.title) {
      throw new UserAccessError('LIST_NOT_FOUND', 'listRef requires id or title');
    }
    const cacheKey = level2Key(login === 'current' ? 'current' : login, listRef);
    const cached = getCache<IListPermission>(cacheKey);
    if (cached) return cached;

    const user = await ensureSiteUser(login);
    const list = listRef.id
      ? SPContext.sp.web.lists.getById(listRef.id)
      : SPContext.sp.web.lists.getByTitle(listRef.title!);

    let listInfo: IListWithUniqueRoles;
    try {
      const info: any = await (list as any).select('Id', 'Title', 'Hidden')();
      listInfo = { id: info.Id, title: info.Title, hidden: info.Hidden };
    } catch (err) {
      throw new UserAccessError('LIST_NOT_FOUND', 'List not found', {
        listRef,
        cause: err,
      });
    }

    const userGroups = await getUserSiteGroupsRaw(user.id);
    const groupIds = new Set(userGroups.map(g => g.id));

    const assignments = await fetchListRoleAssignments(listInfo.id);
    const matched = matchAssignments(assignments, user, groupIds);
    // Only confirmed matches (user/spGroup) are used to derive the role-based
    // permission level. Unverified sources (security groups, Everyone claims)
    // are included in matchedAssignments for UI display but must not inflate the
    // derived level — the effective-permissions mask handles the fallback.
    const confirmedMatched = matched.filter(m => !m.membershipUnverified);
    const allRoles = confirmedMatched.flatMap(m =>
      m.raw.RoleDefinitionBindings.filter(r => !r.Hidden)
    );
    const roleBasedLevel = derivePermissionLevel(allRoles.map(r => r.Name));

    // Mask comparison
    const perms: any = await (list as any).getUserEffectivePermissions(user.loginName);
    const permissionMask = { high: String(perms.High), low: String(perms.Low) };

    // If no SharePoint role assignments matched but the effective-permissions
    // mask is non-zero, derive the level from the mask. This covers access
    // routed through invisible sources (Entra groups, sharing links, app-only).
    // See spec §3 "What the toolkit can and cannot explain".
    const permissionLevel: PermissionLevelLabel =
      roleBasedLevel === 'None'
        ? derivePermissionLevelFromMask(permissionMask)
        : roleBasedLevel;

    const result: IListPermission = {
      list: listInfo,
      permissionLevel,
      permissionMask,
      matchedAssignments: matched.map(ma => ({
        principal: {
          type: ma.raw.Member.PrincipalType === 1 ? 'user' : 'group',
          id: ma.raw.Member.Id,
          title: ma.raw.Member.Title,
        },
        roleDefinitions: ma.raw.RoleDefinitionBindings.filter(r => !r.Hidden).map(r => ({
          id: r.Id,
          name: r.Name,
        })),
        principalKind: ma.principalKind,
        ...(ma.membershipUnverified ? { membershipUnverified: true as const } : {}),
      })),
    };
    setCache(cacheKey, result, TTL.level2);
    return result;
  },

  async getEffectiveItemPermission(
    login: LoginInput,
    listRef: ListRef,
    itemId: number
  ): Promise<IItemPermission> {
    if (typeof itemId !== 'number' || isNaN(itemId)) {
      throw new UserAccessError('ITEM_NOT_FOUND', 'itemId must be a number', {
        itemId,
        listRef,
      });
    }
    const cacheKey = level3Key(
      login === 'current' ? 'current' : login,
      listRef,
      itemId
    );
    const cached = getCache<IItemPermission>(cacheKey);
    if (cached) return cached;

    const user = await ensureSiteUser(login);
    const list = listRef.id
      ? SPContext.sp.web.lists.getById(listRef.id)
      : SPContext.sp.web.lists.getByTitle(listRef.title!);

    let listInfo: IListWithUniqueRoles;
    try {
      const info: any = await (list as any).select('Id', 'Title', 'Hidden')();
      listInfo = { id: info.Id, title: info.Title, hidden: info.Hidden };
    } catch (err) {
      throw new UserAccessError('LIST_NOT_FOUND', 'List not found', {
        listRef,
        cause: err,
      });
    }

    let perms: any;
    try {
      perms = await (list as any).items.getById(itemId).getUserEffectivePermissions(user.loginName);
    } catch (err) {
      throw new UserAccessError('ITEM_NOT_FOUND', 'Item not found or no access', {
        itemId,
        listRef,
        cause: err,
      });
    }

    // Walk role assignments on the item (only meaningful if item has unique perms)
    const item = (list as any).items.getById(itemId);
    let matchedAssignments: IListPermission['matchedAssignments'] = [];
    try {
      const userGroups = await getUserSiteGroupsRaw(user.id);
      const groupIds = new Set(userGroups.map(g => g.id));
      const raw = (await item.roleAssignments
        .expand('Member', 'RoleDefinitionBindings')
        .select(
          'Member/Id',
          'Member/PrincipalType',
          'Member/Title',
          'Member/LoginName',
          'RoleDefinitionBindings/Id',
          'RoleDefinitionBindings/Name',
          'RoleDefinitionBindings/Hidden'
        )()) as IRawRoleAssignment[];
      const matched = matchAssignments(raw, user, groupIds);
      matchedAssignments = matched.map(ma => ({
        principal: {
          type: ma.raw.Member.PrincipalType === 1 ? 'user' : 'group',
          id: ma.raw.Member.Id,
          title: ma.raw.Member.Title,
        },
        roleDefinitions: ma.raw.RoleDefinitionBindings.filter(r => !r.Hidden).map(r => ({
          id: r.Id,
          name: r.Name,
        })),
        principalKind: ma.principalKind,
        ...(ma.membershipUnverified ? { membershipUnverified: true as const } : {}),
      }));
    } catch (err) {
      // Item likely inherits — role assignments lookup is best-effort.
      logger().warn(
        'userAccess.getEffectiveItemPermission: role assignments walk failed (best-effort)',
        { itemId, err }
      );
    }

    // Only use confirmed assignments for permission-level derivation; unverified
    // sources (security groups, Everyone claims) must not inflate the level.
    const allRoles = matchedAssignments
      .filter(m => !m.membershipUnverified)
      .flatMap(m => m.roleDefinitions);
    let permissionLevel: PermissionLevelLabel = derivePermissionLevel(allRoles.map(r => r.name));
    const permissionMask = { high: String(perms.High), low: String(perms.Low) };

    if (matchedAssignments.length === 0) {
      // No item-level role assignments matched. Try the list-level (covers the
      // common case of an item inheriting from its parent list). If that also
      // returns 'None' but the item's effective-permissions mask is non-zero,
      // fall back to mask-derived level (Entra group / sharing link / app-only).
      try {
        const listLevel = await userAccessService.getEffectiveListPermission(login, listRef);
        permissionLevel = listLevel.permissionLevel;
      } catch (err) {
        logger().warn(
          'userAccess.getEffectiveItemPermission: could not derive inherited level from list',
          { itemId, listRef, err }
        );
      }
      if (permissionLevel === 'None') {
        permissionLevel = derivePermissionLevelFromMask(permissionMask);
      }
    }

    const result: IItemPermission = {
      list: listInfo,
      itemId,
      permissionLevel,
      permissionMask,
      matchedAssignments,
    };
    setCache(cacheKey, result, TTL.level3);
    return result;
  },

  async getAllSiteGroups(): Promise<ISiteGroup[]> {
    const key = siteGroupsKey();
    const cached = getCache<ISiteGroup[]>(key);
    if (cached) return cached;
    const raw: any[] = await (SPContext.sp.web.siteGroups as any).select(
      'Id', 'LoginName', 'Title', 'Description', 'OwnerTitle'
    )();
    const result = raw.map<ISiteGroup>(g => ({
      id: g.Id,
      loginName: g.LoginName,
      title: g.Title,
      description: g.Description,
      ownerTitle: g.OwnerTitle,
    }));
    setCache(key, result, TTL.siteGroups);
    return result;
  },

  async addUserToGroups(
    login: LoginInput,
    groupIds: ReadonlyArray<number>
  ): Promise<import('./types').IBulkResult> {
    // Deduplicate to avoid double-calls (especially harmful for remove).
    const uniqueIds = Array.from(new Set(groupIds));
    if (uniqueIds.length === 0) return { succeeded: [], failed: [], items: [] };
    const user = await ensureSiteUser(login);

    const [spBatch, execute] = SPContext.sp.batched();
    const items: Array<{ groupId: number; success: boolean; error?: string }> = [];
    const promises = uniqueIds.map(gid =>
      (spBatch.web.siteGroups
        .getById(gid) as any).users.add(user.loginName)
        .then(
          () => items.push({ groupId: gid, success: true }),
          (err: unknown) =>
            items.push({
              groupId: gid,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            })
        )
    );

    // execute() can throw at the batch level (network, CSRF, throttle). Per-op
    // rejection handlers don't fire in that case, so synthesize a failure entry
    // for any groupId not already represented in items[] before returning.
    // IMPORTANT: await the per-op promises INSIDE the try block, immediately
    // after execute(), using Promise.allSettled (purely defensive — the .then/.catch
    // handlers already push into items[]).  The catch block must NOT await them
    // because on batch failure PnP leaves them permanently unsettled → hang.
    try {
      await execute();
      await Promise.allSettled(promises);
    } catch (batchErr) {
      const msg = batchErr instanceof Error ? batchErr.message : String(batchErr);
      const seen = new Set(items.map(i => i.groupId));
      for (const gid of uniqueIds) {
        if (!seen.has(gid)) items.push({ groupId: gid, success: false, error: msg });
      }
    }

    invalidateAfterMembershipChange(login, user.loginName, uniqueIds);
    return fromItems(items);
  },

  async removeUserFromGroups(
    login: LoginInput,
    groupIds: ReadonlyArray<number>
  ): Promise<import('./types').IBulkResult> {
    // Deduplicate to avoid double-calls (especially harmful for remove).
    const uniqueIds = Array.from(new Set(groupIds));
    if (uniqueIds.length === 0) return { succeeded: [], failed: [], items: [] };
    const user = await ensureSiteUser(login);

    const [spBatch, execute] = SPContext.sp.batched();
    const items: Array<{ groupId: number; success: boolean; error?: string }> = [];
    const promises = uniqueIds.map(gid =>
      (spBatch.web.siteGroups
        .getById(gid) as any).users.removeByLoginName(user.loginName)
        .then(
          () => items.push({ groupId: gid, success: true }),
          (err: unknown) =>
            items.push({
              groupId: gid,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            })
        )
    );

    // execute() can throw at the batch level (network, CSRF, throttle). Per-op
    // rejection handlers don't fire in that case, so synthesize a failure entry
    // for any groupId not already represented in items[] before returning.
    // IMPORTANT: await the per-op promises INSIDE the try block, immediately
    // after execute(), using Promise.allSettled (purely defensive — the .then/.catch
    // handlers already push into items[]).  The catch block must NOT await them
    // because on batch failure PnP leaves them permanently unsettled → hang.
    try {
      await execute();
      await Promise.allSettled(promises);
    } catch (batchErr) {
      const msg = batchErr instanceof Error ? batchErr.message : String(batchErr);
      const seen = new Set(items.map(i => i.groupId));
      for (const gid of uniqueIds) {
        if (!seen.has(gid)) items.push({ groupId: gid, success: false, error: msg });
      }
    }

    invalidateAfterMembershipChange(login, user.loginName, uniqueIds);
    return fromItems(items);
  },

  async diffUserAccess(
    loginA: LoginInput,
    loginB: LoginInput
  ): Promise<IAccessDiff> {
    const [a, b] = await Promise.all([
      userAccessService.getUserAccessLevel1(loginA),
      userAccessService.getUserAccessLevel1(loginB),
    ]);
    return diffUserAccess(a, b);
  },

  async listsWithBrokenInheritance(): Promise<IListWithUniqueRoles[]> {
    const key = brokenInheritanceKey();
    const cached = getCache<IListWithUniqueRoles[]>(key);
    if (cached) return cached;
    const result = await getListsWithUniqueRoleAssignments(serviceConfig);
    setCache(key, result, TTL.brokenInheritance);
    return result;
  },

  async getGroupMembers(ref: { id?: number; name?: string }): Promise<ISiteUser[]> {
    const key = groupMembersKey(ref);
    const cached = getCache<ISiteUser[]>(key);
    if (cached) return cached;
    const group = ref.id
      ? (SPContext.sp.web.siteGroups.getById(ref.id) as any)
      : (SPContext.sp.web.siteGroups.getByName(ref.name!) as any);
    // Use a high $top to avoid the SP default 100-row page limit.
    // Large SharePoint groups (e.g. "All Company") can have thousands of members.
    const raw: any[] = await group.users
      .top(5000)
      .select('Id', 'LoginName', 'Title', 'Email', 'IsHiddenInUI')();
    const result = raw.map<ISiteUser>(u => ({
      id: u.Id,
      loginName: u.LoginName,
      title: u.Title,
      email: u.Email,
      isHiddenInUI: u.IsHiddenInUI,
    }));
    setCache(key, result, TTL.groupMembers);
    return result;
  },
};
