import { SPFI } from '@pnp/sp';
import '@pnp/sp/items';
import '@pnp/sp/lists';
import '@pnp/sp/security';
import { PermissionKind } from '@pnp/sp/security';
import '@pnp/sp/site-groups';
import '@pnp/sp/site-users';
import '@pnp/sp/webs';

import { SPContext } from '../context';
import {
  ICachedPermission,
  IItemPermissions,
  IPermissionHelperConfig,
  IPermissionResult,
  ISPGroup,
  ISPItemWithPermissions,
  ISPRoleAssignment,
  ISPUser,
  IUserPermissions,
  SPPermissionLevel,
} from '../../types/permissionTypes';

import { DefaultGroupMappings, DefaultPermissionMappings } from './constants';

import { getErrorMessage, getPermissionNames, isGroupNameMatch } from './utils';
import { LRUCache } from './LRUCache';

// =============================================================================
// WINDOW-LEVEL CACHES
// Uses window object to share cache across ALL bundles/modules.
// This prevents duplicate API calls even when code is bundled separately.
// =============================================================================

const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PERM_CACHE_KEY = '__spfx_toolkit_permission_helper_cache__';

interface IPermissionWindowCache {
  currentUser?: { data: ISPUser; timestamp: number };
  currentUserPending?: Promise<ISPUser>;
  userGroups: Map<number, { data: ISPGroup[]; timestamp: number }>;
  userGroupsPending: Map<number, Promise<ISPGroup[]>>;
  effectivePerms: Map<string, { data: any; timestamp: number }>;
  effectivePermsPending: Map<string, Promise<any>>;
}

function getPermissionWindowCache(): IPermissionWindowCache {
  const win = window as any;
  if (!win[PERM_CACHE_KEY]) {
    win[PERM_CACHE_KEY] = {
      userGroups: new Map(),
      userGroupsPending: new Map(),
      effectivePerms: new Map(),
      effectivePermsPending: new Map(),
    };
  }
  return win[PERM_CACHE_KEY];
}

/**
 * Permission Helper Utility for SharePoint
 * Provides easy-to-use methods for checking permissions and roles using string-based group names
 *
 * Uses LRU (Least Recently Used) cache with configurable size limit to prevent unbounded memory growth.
 */
export class PermissionHelper {
  private readonly sp: SPFI;
  private readonly config: Required<IPermissionHelperConfig>;
  private readonly cache: LRUCache<string, ICachedPermission>;
  private currentUserCache?: ISPUser;

  constructor(sp: SPFI, config: IPermissionHelperConfig = {}) {
    this.sp = sp;
    this.config = {
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes default
      customGroupMappings: {},
      permissionLevelMappings: {},
      cacheSize: 100, // Default cache size
      ...config,
    };

    // Initialize LRU cache with configured size
    this.cache = new LRUCache<string, ICachedPermission>(this.config.cacheSize || 100);
  }

  /**
   * Check if current user has specific permission level on a list
   * @param listName - Title of the SharePoint list
   * @param permissionLevel - Required permission level
   * @returns Promise<IPermissionResult>
   */
  public async userHasPermissionOnList(
    listName: string,
    permissionLevel: SPPermissionLevel
  ): Promise<IPermissionResult> {
    try {
      const cacheKey = `list_permission_${listName}_${permissionLevel}`;
      const cached = this.getCachedData<IPermissionResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const list = this.sp.web.lists.getByTitle(listName);
      const permissionKind = this.mapPermissionLevel(permissionLevel);
      const userPermissions = await list.currentUserHasPermissions(permissionKind);

      const result: IPermissionResult = {
        hasPermission: userPermissions,
        permissionLevel: permissionLevel,
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      SPContext.logger.warn('PermissionHelper: List permission check failed', {
        listName,
        permissionLevel,
        error: errorMessage,
      });
      return {
        hasPermission: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if current user has specific permission level on a list item
   * @param listName - Title of the SharePoint list
   * @param itemId - ID of the list item
   * @param permissionLevel - Required permission level
   * @returns Promise<IPermissionResult>
   */
  public async userHasPermissionOnItem(
    listName: string,
    itemId: number,
    permissionLevel: SPPermissionLevel
  ): Promise<IPermissionResult> {
    try {
      const cacheKey = `item_permission_${listName}_${itemId}_${permissionLevel}`;
      const cached = this.getCachedData<IPermissionResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const item = this.sp.web.lists.getByTitle(listName).items.getById(itemId);
      const permissionKind = this.mapPermissionLevel(permissionLevel);
      const userPermissions = await item.currentUserHasPermissions(permissionKind);

      const result: IPermissionResult = {
        hasPermission: userPermissions,
        permissionLevel: permissionLevel,
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      SPContext.logger.warn('PermissionHelper: Item permission check failed', {
        listName,
        itemId,
        permissionLevel,
        error: errorMessage,
      });
      return {
        hasPermission: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if current user belongs to a specific SharePoint group
   * @param groupName - SharePoint group name (as string)
   * @returns Promise<IPermissionResult>
   */
  public async userHasRole(groupName: string): Promise<IPermissionResult> {
    try {
      const cacheKey = `user_role_${groupName}`;
      const cached = this.getCachedData<IPermissionResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const currentUser = await this.getCurrentUser();
      const userGroups = await this.getUserGroups(currentUser.Id);

      // Map role to actual group name if needed
      const actualGroupName = this.mapRoleToGroupName(groupName);
      const hasRole = userGroups.some(
        group =>
          group.Title === actualGroupName ||
          group.Title.includes(actualGroupName) ||
          isGroupNameMatch(group.Title, actualGroupName)
      );

      const result: IPermissionResult = {
        hasPermission: hasRole,
        roles: userGroups.map(g => g.Title),
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      SPContext.logger.warn('PermissionHelper: Role check failed', {
        groupName,
        error: errorMessage,
      });
      return {
        hasPermission: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if current user has any of the specified group names
   * @param groupNames - Array of SharePoint group names to check
   * @returns Promise<IPermissionResult>
   */
  public async userHasAnyRole(groupNames: string[]): Promise<IPermissionResult> {
    try {
      const cacheKey = `user_any_roles_${groupNames.join('_')}`;
      const cached = this.getCachedData<IPermissionResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const currentUser = await this.getCurrentUser();
      const userGroups = await this.getUserGroups(currentUser.Id);
      const userGroupNames = userGroups.map(g => g.Title);

      const matchedRoles: string[] = [];

      for (const groupName of groupNames) {
        const actualGroupName = this.mapRoleToGroupName(groupName);
        const hasRole = userGroupNames.some(
          userGroupName =>
            userGroupName === actualGroupName ||
            userGroupName.includes(actualGroupName) ||
            isGroupNameMatch(userGroupName, actualGroupName)
        );

        if (hasRole) {
          matchedRoles.push(groupName);
        }
      }

      const result: IPermissionResult = {
        hasPermission: matchedRoles.length > 0,
        roles: matchedRoles,
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      SPContext.logger.warn('PermissionHelper: Any role check failed', {
        groupNames,
        error: errorMessage,
      });
      return {
        hasPermission: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if current user has all of the specified group names
   * @param groupNames - Array of SharePoint group names that user must have all of
   * @returns Promise<IPermissionResult>
   */
  public async userHasAllRoles(groupNames: string[]): Promise<IPermissionResult> {
    try {
      const cacheKey = `user_all_roles_${groupNames.join('_')}`;
      const cached = this.getCachedData<IPermissionResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const currentUser = await this.getCurrentUser();
      const userGroups = await this.getUserGroups(currentUser.Id);
      const userGroupNames = userGroups.map(g => g.Title);

      const matchedRoles: string[] = [];

      for (const groupName of groupNames) {
        const actualGroupName = this.mapRoleToGroupName(groupName);
        const hasRole = userGroupNames.some(
          userGroupName =>
            userGroupName === actualGroupName ||
            userGroupName.includes(actualGroupName) ||
            isGroupNameMatch(userGroupName, actualGroupName)
        );

        if (hasRole) {
          matchedRoles.push(groupName);
        }
      }

      const hasAllRoles = matchedRoles.length === groupNames.length;

      const result: IPermissionResult = {
        hasPermission: hasAllRoles,
        roles: matchedRoles,
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return {
        hasPermission: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get comprehensive permission information for current user
   * @param listName - Optional list name to check list-specific permissions
   * @returns Promise<IUserPermissions>
   */
  public async getCurrentUserPermissions(listName?: string): Promise<IUserPermissions> {
    try {
      const cacheKey = `user_permissions_${listName || 'web'}`;
      const cached = this.getCachedData<IUserPermissions>(cacheKey);
      if (cached) {
        return cached;
      }

      const currentUser = await this.getCurrentUser();
      const userGroups = await this.getUserGroups(currentUser.Id);

      // Use window-level caching for effective permissions
      const windowCache = getPermissionWindowCache();
      const effectivePermsKey = listName || 'web';
      let permissionLevels: string[] = [];

      // Check window cache first
      const windowCached = windowCache.effectivePerms.get(effectivePermsKey);
      if (windowCached && Date.now() - windowCached.timestamp < CACHE_TIMEOUT) {
        SPContext.logger.info('[PermissionHelper] getCurrentUserPermissions - WINDOW CACHE HIT', effectivePermsKey);
        permissionLevels = getPermissionNames(windowCached.data);
      } else {
        // Check for pending request
        let pending = windowCache.effectivePermsPending.get(effectivePermsKey);
        if (!pending) {
          // Make new request
          SPContext.logger.info('[PermissionHelper] getCurrentUserPermissions - MAKING NEW API CALL', effectivePermsKey);
          pending = (async () => {
            try {
              let perms;
              if (listName) {
                const list = this.sp.web.lists.getByTitle(listName);
                perms = await list.getCurrentUserEffectivePermissions();
              } else {
                perms = await this.sp.web.getCurrentUserEffectivePermissions();
              }
              windowCache.effectivePerms.set(effectivePermsKey, { data: perms, timestamp: Date.now() });
              return perms;
            } finally {
              windowCache.effectivePermsPending.delete(effectivePermsKey);
            }
          })();
          windowCache.effectivePermsPending.set(effectivePermsKey, pending);
        } else {
          SPContext.logger.info('[PermissionHelper] getCurrentUserPermissions - WAITING FOR PENDING', effectivePermsKey);
        }
        const perms = await pending;
        permissionLevels = getPermissionNames(perms);
      }

      const result: IUserPermissions = {
        userId: currentUser.Id,
        loginName: currentUser.LoginName,
        email: currentUser.Email,
        displayName: currentUser.Title,
        groups: userGroups.map(g => g.Title),
        permissionLevels,
        directPermissions: true, // Would need additional logic to determine this accurately
        inheritedPermissions: true, // Would need additional logic to determine this accurately
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Error getting user permissions: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get item-level permission information
   * @param listName - Title of the SharePoint list
   * @param itemId - ID of the list item
   * @returns Promise<IItemPermissions>
   */
  public async getItemPermissions(listName: string, itemId: number): Promise<IItemPermissions> {
    try {
      const cacheKey = `item_permissions_${listName}_${itemId}`;
      const cached = this.getCachedData<IItemPermissions>(cacheKey);
      if (cached) {
        return cached;
      }

      const item = this.sp.web.lists.getByTitle(listName).items.getById(itemId);

      // Check if item has unique permissions - need to select this property
      const itemWithPermissions = (await item.select(
        'HasUniqueRoleAssignments'
      )()) as ISPItemWithPermissions;
      const hasUniquePermissions = itemWithPermissions.HasUniqueRoleAssignments;

      // Get role assignments
      const roleAssignments = (await item.roleAssignments.expand(
        'Member',
        'RoleDefinitionBindings'
      )()) as ISPRoleAssignment[];

      const userPermissions: IUserPermissions[] = [];
      const groupPermissions: Array<{ groupName: string; permissionLevels: string[] }> = [];

      for (const assignment of roleAssignments) {
        const member = assignment.Member;
        const permissionLevels = assignment.RoleDefinitionBindings.map(role => role.Name);

        if (member.PrincipalType === 1) {
          // User
          userPermissions.push({
            userId: member.Id,
            loginName: member.LoginName || '',
            email: member.Email,
            displayName: member.Title,
            groups: [], // Would need additional call to get user groups
            permissionLevels,
            directPermissions: true,
            inheritedPermissions: !hasUniquePermissions,
          });
        } else if (member.PrincipalType === 8) {
          // Group
          groupPermissions.push({
            groupName: member.Title,
            permissionLevels,
          });
        }
      }

      const result: IItemPermissions = {
        itemId,
        hasUniquePermissions,
        userPermissions,
        groupPermissions,
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Error getting item permissions: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Check if current user has specific permission kind on a list
   * @param listName - Title of the SharePoint list
   * @param permissionKind - Specific PermissionKind to check
   * @returns Promise<IPermissionResult>
   */
  public async userHasSpecificPermission(
    listName: string,
    permissionKind: PermissionKind
  ): Promise<IPermissionResult> {
    try {
      const cacheKey = `specific_permission_${listName}_${PermissionKind[permissionKind]}`;
      const cached = this.getCachedData<IPermissionResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const list = this.sp.web.lists.getByTitle(listName);
      const hasPermission = await list.currentUserHasPermissions(permissionKind);

      const result: IPermissionResult = {
        hasPermission,
        permissionLevel: PermissionKind[permissionKind],
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return {
        hasPermission: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check multiple permission levels at once
   * @param listName - Title of the SharePoint list
   * @param permissionLevels - Array of permission levels to check
   * @returns Promise<Record<string, boolean>>
   */
  public async checkMultiplePermissions(
    listName: string,
    permissionLevels: SPPermissionLevel[]
  ): Promise<Record<string, boolean>> {
    try {
      const results: Record<string, boolean> = {};
      const list = this.sp.web.lists.getByTitle(listName);

      // Check all permissions in parallel for better performance
      const permissionChecks = permissionLevels.map(async level => {
        try {
          const permissionKind = this.mapPermissionLevel(level);
          const hasPermission = await list.currentUserHasPermissions(permissionKind);
          return { level, hasPermission };
        } catch (error) {
          return { level, hasPermission: false };
        }
      });

      const permissionResults = await Promise.all(permissionChecks);

      // Build results object
      for (const { level, hasPermission } of permissionResults) {
        results[level] = hasPermission;
      }

      return results;
    } catch (error) {
      // Return false for all requested permissions on error
      const errorResults: Record<string, boolean> = {};
      for (const level of permissionLevels) {
        errorResults[level] = false;
      }

      return errorResults;
    }
  }

  /**
   * Clear the entire permission cache
   *
   * Removes all cached permission checks and user group memberships.
   * Use after significant permission changes that affect multiple lists/items.
   *
   * @example
   * ```typescript
   * // After bulk permission changes
   * await updateMultiplePermissions();
   * permissionHelper.clearCache();
   * ```
   */
  public clearCache(): void {
    this.cache.clear();
    this.currentUserCache = undefined;
  }

  /**
   * Invalidate cache entries for a specific list
   *
   * Removes all cached permission checks related to the specified list.
   * Use after permission changes on a specific list.
   *
   * @param listName - Title of the SharePoint list
   * @returns Number of cache entries removed
   *
   * @example
   * ```typescript
   * // After modifying list permissions
   * await updateListPermissions('Tasks');
   * const removed = permissionHelper.invalidateList('Tasks');
   * console.log(`Cleared ${removed} cache entries for Tasks list`);
   * ```
   */
  public invalidateList(listName: string): number {
    const prefix = `list_permission_${listName}_`;
    const itemPrefix = `item_permission_${listName}_`;

    return this.cache.deleteWhere(([key]) => {
      return typeof key === 'string' && (key.startsWith(prefix) || key.startsWith(itemPrefix));
    });
  }

  /**
   * Invalidate cache entry for a specific list item
   *
   * Removes cached permission checks for the specified item.
   * Use after permission changes on a specific item.
   *
   * @param listName - Title of the SharePoint list
   * @param itemId - ID of the list item
   * @returns True if a cache entry was removed, false otherwise
   *
   * @example
   * ```typescript
   * // After modifying item permissions
   * await updateItemPermissions('Tasks', 10);
   * const removed = permissionHelper.invalidateItem('Tasks', 10);
   * ```
   */
  public invalidateItem(listName: string, itemId: number): boolean {
    const prefix = `item_permission_${listName}_${itemId}_`;
    let removed = false;

    this.cache.deleteWhere(([key]) => {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        removed = true;
        return true;
      }
      return false;
    });

    return removed;
  }

  /**
   * Invalidate user role cache
   *
   * Removes cached user group memberships and role checks.
   * Use after user group membership changes.
   *
   * @param userId - Optional user ID. If not provided, clears current user's cache.
   * @returns Number of cache entries removed
   *
   * @example
   * ```typescript
   * // After adding user to a group
   * await addUserToGroup(userId, 'Owners');
   * const removed = permissionHelper.invalidateUserRoles(userId);
   * ```
   */
  public invalidateUserRoles(userId?: number): number {
    const prefix = userId !== undefined ? `user_role_` : `user_role_`;
    const groupPrefix = userId !== undefined ? `user_groups_${userId}` : `user_groups_`;

    const removed = this.cache.deleteWhere(([key]) => {
      if (typeof key !== 'string') return false;
      if (userId === undefined) {
        return key.startsWith(prefix) || key.startsWith(groupPrefix);
      }
      return key === `user_groups_${userId}` || key.startsWith(prefix);
    });

    // Also clear current user cache if no specific user provided
    if (userId === undefined) {
      this.currentUserCache = undefined;
    }

    return removed;
  }

  /**
   * Get cache statistics
   *
   * Returns information about cache usage for monitoring and debugging.
   *
   * @returns Cache statistics object
   *
   * @example
   * ```typescript
   * const stats = permissionHelper.getCacheStats();
   * console.log(`Cache: ${stats.size}/${stats.capacity} (${stats.utilizationPercent.toFixed(1)}%)`);
   * if (stats.isFull) {
   *   console.warn('Cache is full - oldest entries are being evicted');
   * }
   * ```
   */
  public getCacheStats(): {
    size: number;
    capacity: number;
    utilizationPercent: number;
    isFull: boolean;
    cachingEnabled: boolean;
    timeout: number;
  } {
    const lruStats = this.cache.getStats();

    return {
      ...lruStats,
      cachingEnabled: this.config.enableCaching,
      timeout: this.config.cacheTimeout,
    };
  }

  // Private helper methods

  private async getCurrentUser(): Promise<ISPUser> {
    // Check instance cache first
    if (this.currentUserCache) {
      return this.currentUserCache;
    }

    // Check window-level cache (shared across all bundles)
    const windowCache = getPermissionWindowCache();
    if (windowCache.currentUser && Date.now() - windowCache.currentUser.timestamp < CACHE_TIMEOUT) {
      SPContext.logger.info('[PermissionHelper] getCurrentUser - WINDOW CACHE HIT');
      this.currentUserCache = windowCache.currentUser.data;
      return this.currentUserCache;
    }

    // Check if there's a pending request (deduplication)
    if (windowCache.currentUserPending) {
      SPContext.logger.info('[PermissionHelper] getCurrentUser - WAITING FOR PENDING');
      const result = await windowCache.currentUserPending;
      this.currentUserCache = result;
      return result;
    }

    // Make new request with deduplication
    SPContext.logger.info('[PermissionHelper] getCurrentUser - MAKING NEW API CALL');
    windowCache.currentUserPending = (async () => {
      try {
        const user = await this.sp.web.currentUser();
        windowCache.currentUser = { data: user, timestamp: Date.now() };
        return user;
      } finally {
        windowCache.currentUserPending = undefined;
      }
    })();

    this.currentUserCache = await windowCache.currentUserPending;
    return this.currentUserCache;
  }

  private async getUserGroups(userId: number): Promise<ISPGroup[]> {
    // Check instance cache first
    const cacheKey = `user_groups_${userId}`;
    const cached = this.getCachedData<ISPGroup[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check window-level cache (shared across all bundles)
    const windowCache = getPermissionWindowCache();
    const windowCached = windowCache.userGroups.get(userId);
    if (windowCached && Date.now() - windowCached.timestamp < CACHE_TIMEOUT) {
      SPContext.logger.info('[PermissionHelper] getUserGroups - WINDOW CACHE HIT', userId);
      this.setCachedData(cacheKey, windowCached.data);
      return windowCached.data;
    }

    // Check if there's a pending request (deduplication)
    const pending = windowCache.userGroupsPending.get(userId);
    if (pending) {
      SPContext.logger.info('[PermissionHelper] getUserGroups - WAITING FOR PENDING', userId);
      const result = await pending;
      this.setCachedData(cacheKey, result);
      return result;
    }

    // Make new request with deduplication
    SPContext.logger.info('[PermissionHelper] getUserGroups - MAKING NEW API CALL', userId);
    const request = (async () => {
      try {
        const groups = await this.sp.web.siteUsers.getById(userId).groups();
        windowCache.userGroups.set(userId, { data: groups, timestamp: Date.now() });
        return groups;
      } finally {
        windowCache.userGroupsPending.delete(userId);
      }
    })();

    windowCache.userGroupsPending.set(userId, request);
    const groups = await request;
    this.setCachedData(cacheKey, groups);
    return groups;
  }

  private mapPermissionLevel(level: SPPermissionLevel): PermissionKind {
    // Check custom mappings first
    const customMapping = this.config.permissionLevelMappings[level];
    if (customMapping !== undefined) {
      return customMapping;
    }

    // Use default mapping
    return DefaultPermissionMappings[level] || PermissionKind.ViewListItems;
  }

  private mapRoleToGroupName(groupName: string): string {
    // Check custom mappings first
    const customMapping = this.config.customGroupMappings[groupName];
    if (customMapping) {
      return customMapping;
    }

    // Use default mapping
    return DefaultGroupMappings[groupName] || groupName;
  }

  private getCachedData<T>(key: string): T | null {
    if (!this.config.enableCaching) {
      return null;
    }

    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }

    return null;
  }

  private setCachedData(key: string, data: unknown): void {
    if (!this.config.enableCaching) {
      return;
    }

    const timeout = this.config.cacheTimeout;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + timeout,
    });
  }
}
