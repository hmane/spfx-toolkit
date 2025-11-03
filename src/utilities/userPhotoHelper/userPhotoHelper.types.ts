/**
 * User Photo Helper Types
 * Utilities for fetching user photos and handling default images
 */

/**
 * Photo size options for SharePoint user photos
 */
export type PhotoSize = 'S' | 'M' | 'L';

/**
 * Pixel-based size mapping for photo sizes
 */
export type PixelPhotoSize = 32 | 48 | 72 | 100 | number;

/**
 * Result from getUserImage containing photo URL and fallback data
 */
export interface IUserImageResult {
  /**
   * Photo URL if user has a custom photo (undefined if default photo)
   */
  photoUrl: string | undefined;

  /**
   * Whether the user has a custom photo
   */
  hasCustomPhoto: boolean;

  /**
   * Auto-generated initials from display name
   */
  initials: string;

  /**
   * Calculated color for initials background
   */
  initialsColor: number;

  /**
   * Display name used for initials generation
   */
  displayName: string;
}

/**
 * Options for getUserImage function
 */
export interface IGetUserImageOptions {
  /**
   * SharePoint site URL for photo endpoint
   * @default SPContext.webAbsoluteUrl
   */
  siteUrl?: string;

  /**
   * Photo size - either 'S', 'M', 'L' or pixel size
   * S: <= 32px, M: <= 48px, L: > 48px
   * @default 'M'
   */
  size?: PhotoSize | PixelPhotoSize;

  /**
   * Display name for initials generation
   * If not provided, will be extracted from email
   * @default Extracted from email
   */
  displayName?: string;
}
