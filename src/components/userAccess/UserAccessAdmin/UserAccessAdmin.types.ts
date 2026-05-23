// UserAccessAdmin.types.ts
import { PermissionKind } from '@pnp/sp/security';
import type { UserAccessError } from '../../../utilities/userAccess';

export interface IUserAccessAdminProps {
  className?: string;
  title?: string;
  /** Permission required for the Manage Groups tab (and to broaden Browse/Compare beyond allowBrowse). Default ManageWeb. */
  managePermission?: PermissionKind;
  /** Allow non-admin users to use Browse/Compare. Default false. */
  allowBrowse?: boolean;
  onError?: (error: UserAccessError) => void;
}
