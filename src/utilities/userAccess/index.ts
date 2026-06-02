// src/utilities/userAccess/index.ts
export { userAccessService, matchAssignments } from './userAccessService';
export { UserAccessError } from './UserAccessError';
export type { UserAccessErrorCode } from './UserAccessError';
export { diffUserAccess } from './userAccessDiff';
export { accessExportToCsv } from './userAccessExport';
export type { IExportResult } from './userAccessExport';
export {
  emptyBulkResult,
  fromItems,
  mergeBulkResults,
  isFullSuccess,
  isFullFailure,
} from './bulkResult';
export {
  initMembershipState,
  membershipReducer,
  selectPendingAdds,
  selectPendingRemoves,
  selectIsDirty,
} from './membershipReducer';
export type { IMembershipState, MembershipAction } from './membershipReducer';
export {
  level1Key,
  level2Key,
  level3Key,
  siteGroupsKey,
  groupMembersKey,
  brokenInheritanceKey,
} from './cacheKeys';
export { normalizeLoginForCacheKey } from './loginNormalization';
export { getListsWithUniqueRoleAssignments } from './brokenInheritance';
export {
  getCache,
  setCache,
  invalidate,
  invalidatePrefix,
  clearAll,
  TTL,
} from './userAccessCache';
export type {
  IAccessDiff,
  IAccessDiffSection,
  IBulkResult,
  IBulkResultItem,
  IDirectListPermission,
  IItemPermission,
  IListPermission,
  IListWithUniqueRoles,
  IRoleDefinitionRef,
  ISiteGroup,
  ISiteUser,
  IUserAccessConfig,
  IUserAccessLevel1,
  ListRef,
  LoginInput,
  MatchedPrincipalKind,
  PermissionLevelLabel,
} from './types';
