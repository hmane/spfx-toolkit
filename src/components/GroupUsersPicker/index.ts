/**
 * GroupUsersPicker Component Exports
 */

export { GroupUsersPicker } from './GroupUsersPicker';
export type {
  IGroupUser,
  IGroupUsersPickerProps,
  IRHFGroupUsersPickerProps,
} from './GroupUsersPicker.types';
export { DefaultGroupUsersPickerProps } from './GroupUsersPicker.types';

// Export hooks
export { useGroupUsers } from './hooks/useGroupUsers';
export type { IUseGroupUsersResult } from './hooks/useGroupUsers';

// Export utilities
export { ensureUsers, ensureUsersWithCallback } from './utils/ensureUserHelper';
export { fetchAllGroupUsersRecursive, isSharePointGroup, isUser } from './utils/groupUserFetcher';

// Re-export user photo utilities from utilities/userPhotoHelper (centralized location)
export { getUserPhotoIfNotDefault, batchGetUserPhotos, isDefaultPhoto } from '../../utilities/userPhotoHelper';
