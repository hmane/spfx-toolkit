/**
 * User Access utilities and caching layer.
 * Provides functions for managing user access data, permissions, and site groups.
 */

// ========================================
// CACHE - Window-level TTL cache
// ========================================
export { getCache, setCache, invalidate, invalidatePrefix, clearAll, TTL } from './userAccessCache';

// ========================================
// CACHE KEYS - Key generation functions
// ========================================
export {
  level1Key,
  level2Key,
  level3Key,
  siteGroupsKey,
  groupMembersKey,
  brokenInheritanceKey,
} from './cacheKeys';

// ========================================
// TYPES - Type definitions
// ========================================
export type {
  LoginInput,
  ListRef,
  ISiteUser,
  ISiteGroup,
  IRoleDefinitionRef,
  IListWithUniqueRoles,
  PermissionLevelLabel,
  IDirectListPermission,
  IUserAccessLevel1,
  IListPermission,
  IItemPermission,
  IBulkResultItem,
  IBulkResult,
  IAccessDiffSection,
  IAccessDiff,
  IUserAccessConfig,
} from './types';

// ========================================
// UTILITIES
// ========================================
export { normalizeLoginForCacheKey } from './loginNormalization';
export { membershipReducer } from './membershipReducer';
export { diffUserAccess } from './userAccessDiff';
export { accessExportToCsv } from './userAccessExport';
export { emptyBulkResult, fromItems, mergeBulkResults, isFullSuccess, isFullFailure } from './bulkResult';

// ========================================
// ERROR HANDLING
// ========================================
export { UserAccessError } from './UserAccessError';
