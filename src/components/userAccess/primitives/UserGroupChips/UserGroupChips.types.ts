import type { ISiteGroup } from '../../../../utilities/userAccess';

export interface IUserGroupChipsProps {
  groups: ISiteGroup[];
  onChipClick?: (group: ISiteGroup) => void;
  className?: string;
  emptyText?: string;
}
