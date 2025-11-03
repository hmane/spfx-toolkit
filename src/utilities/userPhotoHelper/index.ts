/**
 * User Photo Helper
 * Export utilities for fetching user photos and handling default images
 */

export {
  getUserImage,
  getUserPhoto,
  getUserPhotoIfNotDefault,
  batchGetUserPhotos,
  isDefaultPhoto,
  getInitials,
  getPersonaColor,
  pixelSizeToPhotoSize,
  getDisplayNameFromEmail,
} from './userPhotoHelper';
export type { IUserImageResult, IGetUserImageOptions, PhotoSize, PixelPhotoSize } from './userPhotoHelper.types';
