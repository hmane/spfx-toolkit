// UserAccessAdmin.types.ts
import { PermissionKind } from '@pnp/sp/security';
import type { UserAccessError } from '../../../utilities/userAccess';

export interface IUserAccessAdminProps {
  className?: string;
  title?: string;
  /** Permission required for the Manage Groups tab (and to broaden Browse/Compare beyond allowBrowse). Default ManageWeb. */
  managePermission?: PermissionKind;
  /**
   * Allow **non-admin** users to use the Browse and Compare tabs.
   * Default: `false`.
   *
   * ⚠️ **Security warning — read before enabling.**
   *
   * When `allowBrowse` is `true`, any user who can render this component can:
   * - Look up **any resolvable login** (e.g., a co-worker's email or claim)
   *   and enumerate the SharePoint groups that login belongs to.
   * - View the list-level permissions derived from those group memberships.
   *
   * The toolkit does **not** enforce any additional access checks beyond what
   * SharePoint itself provides.  SharePoint's own read restrictions on users,
   * groups, and role assignments are often permissive by default (site members
   * can read the Members group list, for example), so in practice this can
   * expose organisational membership data to non-privileged users.
   *
   * **Recommendation:** gate this prop behind your own admin check before
   * passing `true`.  For example:
   *
   * ```tsx
   * <UserAccessAdmin
   *   allowBrowse={currentUserIsAdmin}   // ← your own check
   *   managePermission={PermissionKind.ManageWeb}
   * />
   * ```
   *
   * Do **not** rely solely on this prop to restrict access to sensitive
   * membership or permission data.
   */
  allowBrowse?: boolean;
  onError?: (error: UserAccessError) => void;
}
