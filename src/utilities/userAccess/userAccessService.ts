// src/utilities/userAccess/userAccessService.ts
import { SPContext } from '../context';
import '@pnp/sp/items';
import '@pnp/sp/lists';
import '@pnp/sp/security';
import '@pnp/sp/site-groups';
import '@pnp/sp/site-users';
import '@pnp/sp/webs';

import { getListsWithUniqueRoleAssignments } from './brokenInheritance';
import {
  level1Key,
  level2Key,
  level3Key,
} from './cacheKeys';
import { getCache, setCache, TTL } from './userAccessCache';
import { UserAccessError } from './UserAccessError';
import type {
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
  const raw: any[] = await (SPContext.sp.web.siteUsers
    .getById(userId) as any)
    .groups
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

interface IRawRoleAssignment {
  Member: {
    Id: number;
    PrincipalType: number; // 1=User, 8=SharePointGroup
    Title: string;
    LoginName?: string;
  };
  RoleDefinitionBindings: Array<{ Id: number; Name: string; Hidden?: boolean }>;
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

function matchAssignments(
  assignments: ReadonlyArray<IRawRoleAssignment>,
  user: ISiteUser,
  groupIds: Set<number>
): IRawRoleAssignment[] {
  return assignments.filter(a => {
    const m = a.Member;
    if (m.PrincipalType === 1) return m.Id === user.id;
    if (m.PrincipalType === 8) return groupIds.has(m.Id);
    return false;
  });
}

function buildDirectListPermission(
  list: IListWithUniqueRoles,
  matched: IRawRoleAssignment,
  user: ISiteUser
): IDirectListPermission {
  const isDirect = matched.Member.PrincipalType === 1 && matched.Member.Id === user.id;
  const roles = matched.RoleDefinitionBindings.filter(r => !r.Hidden);
  return {
    list,
    source: isDirect
      ? 'Direct'
      : { viaGroupId: matched.Member.Id, viaGroupTitle: matched.Member.Title },
    roleDefinitions: roles.map(r => ({ id: r.Id, name: r.Name })),
    permissionLevel: derivePermissionLevel(roles.map(r => r.Name)),
  };
}

// =========================================================================
// Public surface
// =========================================================================

export const userAccessService = {
  configure(cfg: IUserAccessConfig): void {
    serviceConfig = { ...serviceConfig, ...cfg };
  },

  async getUserAccessLevel1(login: LoginInput): Promise<IUserAccessLevel1> {
    const cacheKey = level1Key(login === 'current' ? 'current' : login);
    const cached = getCache<IUserAccessLevel1>(cacheKey);
    if (cached) return cached;

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
      const settled = await Promise.all(promises);

      for (const { list, asg } of settled) {
        const matched = matchAssignments(asg, user, groupIdSet);
        for (const m of matched) {
          directListPermissions.push(buildDirectListPermission(list, m, user));
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
    const allRoles = matched.flatMap(m =>
      m.RoleDefinitionBindings.filter(r => !r.Hidden)
    );
    const permissionLevel = derivePermissionLevel(allRoles.map(r => r.Name));

    // Mask comparison
    const perms: any = await (list as any).getUserEffectivePermissions(user.loginName);

    const result: IListPermission = {
      list: listInfo,
      permissionLevel,
      permissionMask: { high: String(perms.High), low: String(perms.Low) },
      matchedAssignments: matched.map(m => ({
        principal: {
          type: m.Member.PrincipalType === 1 ? 'user' : 'group',
          id: m.Member.Id,
          title: m.Member.Title,
        },
        roleDefinitions: m.RoleDefinitionBindings.filter(r => !r.Hidden).map(r => ({
          id: r.Id,
          name: r.Name,
        })),
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
      matchedAssignments = matched.map(m => ({
        principal: {
          type: m.Member.PrincipalType === 1 ? 'user' : 'group',
          id: m.Member.Id,
          title: m.Member.Title,
        },
        roleDefinitions: m.RoleDefinitionBindings.filter(r => !r.Hidden).map(r => ({
          id: r.Id,
          name: r.Name,
        })),
      }));
    } catch (err) {
      // Item likely inherits — role assignments lookup is best-effort.
      logger().warn(
        'userAccess.getEffectiveItemPermission: role assignments walk failed (best-effort)',
        { itemId, err }
      );
    }

    const allRoles = matchedAssignments.flatMap(m => m.roleDefinitions);
    let permissionLevel = derivePermissionLevel(allRoles.map(r => r.name));

    if (matchedAssignments.length === 0) {
      // Item inherits from list; derive level from the list-level effective perms.
      try {
        const listLevel = await userAccessService.getEffectiveListPermission(login, listRef);
        permissionLevel = listLevel.permissionLevel;
      } catch (err) {
        logger().warn(
          'userAccess.getEffectiveItemPermission: could not derive inherited level from list',
          { itemId, listRef, err }
        );
      }
    }

    const result: IItemPermission = {
      list: listInfo,
      itemId,
      permissionLevel,
      permissionMask: { high: String(perms.High), low: String(perms.Low) },
      matchedAssignments,
    };
    setCache(cacheKey, result, TTL.level3);
    return result;
  },
};
