/**
 * UserPersona Component - Reusable user persona with automatic profile fetching
 */

export { UserPersona } from './UserPersona';
export type {
  IUserPersonaProps,
  IUserProfile,
  IProfileCache,
  UserPersonaSize,
  UserPersonaDisplayMode,
} from './types';
export { DefaultUserPersonaProps } from './types';
export {
  getCachedProfile,
  cacheProfile,
  clearProfileCache,
  getUserPhotoUrl,
  getInitials,
  getPersonaColor,
  normalizeUserIdentifier,
  getPhotoSize,
  isValidUserIdentifier,
} from './UserPersonaUtils';
