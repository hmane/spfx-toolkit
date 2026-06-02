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
  /**
   * How this assignment was resolved.  Mirrors the same field on
   * `IListPermission.matchedAssignments`.  Absent for confirmed direct/SP-group
   * matches (`'user'` / `'spGroup'`).
   */
  principalKind?: MatchedPrincipalKind;
  /**
   * True when membership in the source principal could not be verified via the
   * SharePoint API (e.g. Entra/AD security group, "Everyone" claim).  The UI
   * should visually distinguish these entries and explain that the attribution
   * is unconfirmed.
   */
  membershipUnverified?: true;
}

export interface IUserAccessLevel1 {
  user: ISiteUser;
  siteGroups: ISiteGroup[];
  directListPermissions: IDirectListPermission[];
}

/**
 * Describes how a matched role-assignment principal was resolved.
 *
 * - `'user'`  — directly matched the queried user (PrincipalType 1).
 * - `'spGroup'` — matched a SharePoint group the user belongs to (PrincipalType 8).
 * - `'securityGroupOrClaim'` — a security group (PrincipalType 4), "Everyone",
 *   "Everyone except external users", or a similar claim principal.  Membership
 *   cannot be verified via this API, so the assignment is surfaced as a
 *   **candidate** source.  The UI should explain that membership is unconfirmed.
 */
export type MatchedPrincipalKind = 'user' | 'spGroup' | 'securityGroupOrClaim';

export interface IListPermission {
  list: IListWithUniqueRoles;
  permissionLevel: PermissionLevelLabel;
  /** Permission mask bits derived from the role definitions, as decimal strings. */
  permissionMask: { high: string; low: string };
  /** Matched role assignments (direct + via groups) that contributed. */
  matchedAssignments: Array<{
    principal: { type: 'user' | 'group'; id: number; title: string };
    roleDefinitions: IRoleDefinitionRef[];
    /**
     * How this assignment was resolved.
     *
     * Present when the assignment is not a confirmed direct/SP-group match.
     * `'securityGroupOrClaim'` means the principal is an Entra security group,
     * "Everyone", "Everyone except external users", or another claim whose
     * membership the toolkit cannot enumerate.  The assignment is included as a
     * candidate source — the user **may** have access via this principal.
     *
     * Absent (or `'user'` / `'spGroup'`) for confirmed matches.
     */
    principalKind?: MatchedPrincipalKind;
    /**
     * True when membership in this principal could not be verified via the
     * SharePoint API.  Consumers should treat this assignment as a candidate
     * source rather than a confirmed grant.
     */
    membershipUnverified?: true;
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
