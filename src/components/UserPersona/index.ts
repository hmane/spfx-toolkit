/**
 * UserPersona Component - Reusable user persona with photo loading and LivePersona integration
 */

export { UserPersona } from './UserPersona';
export type {
  IUserPersonaProps,
  IUserPersonaState,
  UserPersonaSize,
  UserPersonaDisplayMode,
  IPhotoCache,
} from './types';
export { DefaultUserPersonaProps } from './types';
export {
  getCachedPhotoUrl,
  cachePhotoUrl,
  clearPhotoCache,
  getUserPhotoUrl,
  loadUserPhoto,
  getInitials,
  getPersonaColor,
  normalizeUserIdentifier,
  getPhotoSize,
  isValidForPhotoLoad,
} from './UserPersonaUtils';
