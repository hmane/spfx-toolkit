import type { PermissionLevelLabel } from '../../../../utilities/userAccess';

export interface IPermissionLevelBadgeProps {
  level: PermissionLevelLabel;
  tooltip?: string;
  className?: string;
}
