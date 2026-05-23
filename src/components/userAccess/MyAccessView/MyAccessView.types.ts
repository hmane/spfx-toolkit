import type { UserAccessError } from '../../../utilities/userAccess';

export interface IMyAccessViewProps {
  className?: string;
  title?: string;
  showRefresh?: boolean;
  onError?: (error: UserAccessError) => void;
}
