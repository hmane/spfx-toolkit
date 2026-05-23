export type LoginInput = string | 'current';
export type ListRef = { id?: string; title?: string };

export interface ISiteUser {
  id: number;
  loginName: string;
  title: string;
  email?: string;
  isHiddenInUI?: boolean;
  deleted?: boolean;
}

export interface ISiteGroup {
  id: number;
  loginName: string;
  title: string;
  description?: string;
  ownerTitle?: string;
}

export interface IRoleDefinitionRef {
  id: number;
  name: string;
}

export interface IListWithUniqueRoles {
  id: string;
  title: string;
  hidden: boolean;
}

export type PermissionLevelLabel =
  | 'Owner'
  | 'Member'
  | 'Visitor'
  | 'Custom'
  | 'None';

export interface IDirectListPermission {
  list: IListWithUniqueRoles;
  /** "Direct" if granted to the user themselves, otherwise the group title that conveyed it. */
  source: 'Direct' | { viaGroupId: number; viaGroupTitle: string };
  roleDefinitions: IRoleDefinitionRef[];
  /** Derived label for badge display. */
  permissionLevel: PermissionLevelLabel;
}

export interface IUserAccessLevel1 {
  user: ISiteUser;
  siteGroups: ISiteGroup[];
  directListPermissions: IDirectListPermission[];
}

export interface IListPermission {
  list: IListWithUniqueRoles;
  permissionLevel: PermissionLevelLabel;
  /** Permission mask bits derived from the role definitions, as decimal strings. */
  permissionMask: { high: string; low: string };
  /** Matched role assignments (direct + via groups) that contributed. */
  matchedAssignments: Array<{
    principal: { type: 'user' | 'group'; id: number; title: string };
    roleDefinitions: IRoleDefinitionRef[];
  }>;
}

export interface IItemPermission extends IListPermission {
  itemId: number;
}

export interface IBulkResultItem {
  groupId: number;
  success: boolean;
  error?: string;
  /** True when the operation was a no-op because server state already matched intent. */
  idempotent?: boolean;
}

export interface IBulkResult {
  succeeded: number[];
  failed: Array<{ groupId: number; error: string }>;
  items: IBulkResultItem[];
}

export interface IAccessDiffSection {
  groups: ISiteGroup[];
  directListPermissions: IDirectListPermission[];
}

export interface IAccessDiff {
  userA: ISiteUser;
  userB: ISiteUser;
  common: IAccessDiffSection;
  onlyA: IAccessDiffSection;
  onlyB: IAccessDiffSection;
}

export interface IUserAccessConfig {
  /** Default false. When true, Level-1 scan and `listsWithBrokenInheritance` include hidden lists. */
  includeHiddenLists?: boolean;
}
