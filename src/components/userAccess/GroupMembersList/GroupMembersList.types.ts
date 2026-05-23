export interface IGroupMembersListProps {
  groupRef: { id?: number; name?: string };
  className?: string;
  showSearch?: boolean;
  maxHeight?: number | string;
  onMemberClick?: (userId: number) => void;
  emptyText?: string;
}
