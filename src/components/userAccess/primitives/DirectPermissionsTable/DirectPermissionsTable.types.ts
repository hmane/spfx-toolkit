// DirectPermissionsTable.types.ts
import type {
  IDirectListPermission,
  ListRef,
} from '../../../../utilities/userAccess';

export interface IDirectPermissionsTableProps {
  lists: IDirectListPermission[];
  onListClick?: (listRef: ListRef) => void;
  className?: string;
  emptyText?: string;
}
