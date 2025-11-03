/**
 * User Photo Helper
 * Utilities for fetching SharePoint user photos and detecting default images
 */

import { SPComponentLoader } from '@microsoft/sp-loader';
import { PersonaInitialsColor } from '@fluentui/react/lib/Persona';
import { SPContext } from '../context';
import { IGetUserImageOptions, IUserImageResult, PhotoSize, PixelPhotoSize } from './userPhotoHelper.types';

/**
 * SharePoint default persona image MD5 hashes
 * These hashes identify the default "no photo" images returned by SharePoint
 */
const DEFAULT_PERSONA_IMG_HASHES = new Set([
  '7ad602295f8386b7615b582d87bcc294',
  '4a48f26592f4e1498d7a478a4c48609c',
  '6de6a017bc934f55835ac9b721d04b8b',
  'f8cb5c6ed63e440b90d962f8c4b2377b',
  '9a06a83c57864b16a5eef56e83dd5c67',
  'dc9713f1e28b6ec4d4acba8a50c45caa',
  '808be61398a910bc29b81f4920de8741',
  'b04cfcc81483e3d264508991c989a538',
]);

/**
 * SharePoint MD5 module ID for hash generation
 */
const MD5_MODULE_ID = '8494e7d7-6b99-47b2-a741-59873e42f16f';

/**
 * Load SharePoint component by ID
 * @param componentId - The SharePoint component ID
 * @returns The loaded component
 */
const loadSPComponentById = async (componentId: string): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    SPComponentLoader.loadComponentById(componentId)
      .then((component: any) => {
        resolve(component);
      })
      .catch(error => {
        reject(error);
      });
  });
};

/**
 * Fetch image and convert to base64
 * @param url - Image URL to fetch
 * @returns Base64 string (without data URI prefix) or undefined if failed
 */
const getImageBase64 = async (url: string): Promise<string | undefined> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return undefined;
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    SPContext.logger.warn('Failed to fetch image as base64', { url, error });
    return undefined;
  }
};

/**
 * Generate MD5 hash for a string using SharePoint's MD5 library
 * @param value - String to hash
 * @returns MD5 hash or original value if hashing fails
 */
const getMd5HashForUrl = async (value: string): Promise<string> => {
  try {
    const library: any = await loadSPComponentById(MD5_MODULE_ID);
    const md5Hash = library.Md5Hash;
    if (md5Hash) {
      const convertedHash: string = md5Hash(value);
      return convertedHash;
    }
  } catch (error) {
    SPContext.logger.warn('Failed to load MD5 library', { error });
  }
  return value;
};

/**
 * Fetch user photo and check if it's a default SharePoint image
 * @param siteUrl - SharePoint site URL
 * @param userIdentifier - User email or UPN
 * @param size - Photo size (S, M, or L)
 * @returns Photo data URI if custom photo exists, undefined if default photo
 */
export const getUserPhoto = async (
  siteUrl: string,
  userIdentifier: string,
  size: PhotoSize
): Promise<string | undefined> => {
  try {
    const personaImgUrl = `${siteUrl}/_layouts/15/userphoto.aspx?size=${size}&accountname=${encodeURIComponent(
      userIdentifier
    )}`;

    const base64 = await getImageBase64(personaImgUrl);
    if (!base64) {
      return undefined;
    }

    // Check if the photo is a default SharePoint image
    const hash = await getMd5HashForUrl(base64);
    if (DEFAULT_PERSONA_IMG_HASHES.has(hash) || DEFAULT_PERSONA_IMG_HASHES.has(base64)) {
      return undefined;
    }

    return `data:image/png;base64,${base64}`;
  } catch (error) {
    SPContext.logger.warn('Failed to get user photo', { userIdentifier, size, error });
    return undefined;
  }
};

/**
 * Get initials from display name
 * @param displayName - User's display name
 * @returns Initials (2 characters) or '?' if no name provided
 * @example
 * getInitials('John Doe') // 'JD'
 * getInitials('Alice') // 'AL'
 * getInitials('') // '?'
 */
export function getInitials(displayName: string): string {
  if (!displayName || displayName.trim().length === 0) {
    return '?';
  }

  const parts = displayName.trim().split(' ');

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();

  return `${firstInitial}${lastInitial}`;
}

/**
 * Generate a consistent color for initials based on display name
 * @param displayName - User's display name
 * @returns PersonaInitialsColor enum value
 * @example
 * getPersonaColor('John Doe') // PersonaInitialsColor.lightBlue
 */
export function getPersonaColor(displayName: string): PersonaInitialsColor {
  const colors = [
    PersonaInitialsColor.lightBlue,
    PersonaInitialsColor.lightGreen,
    PersonaInitialsColor.lightPink,
    PersonaInitialsColor.magenta,
    PersonaInitialsColor.orange,
    PersonaInitialsColor.teal,
    PersonaInitialsColor.violet,
    PersonaInitialsColor.warmGray,
    PersonaInitialsColor.cyan,
    PersonaInitialsColor.rust,
    PersonaInitialsColor.burgundy,
    PersonaInitialsColor.coolGray,
  ];

  const hash = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Convert pixel size to photo size category
 * @param pixelSize - Size in pixels
 * @returns PhotoSize category (S, M, or L)
 */
export function pixelSizeToPhotoSize(pixelSize: number): PhotoSize {
  if (pixelSize <= 32) {
    return 'S';
  } else if (pixelSize <= 48) {
    return 'M';
  } else {
    return 'L';
  }
}

/**
 * Extract display name from email address
 * @param email - Email address
 * @returns Display name extracted from email local part
 * @example
 * getDisplayNameFromEmail('john.doe@company.com') // 'John Doe'
 * getDisplayNameFromEmail('alice_smith@company.com') // 'Alice Smith'
 */
export function getDisplayNameFromEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return email || 'Unknown User';
  }

  const localPart = email.split('@')[0];

  // Replace common separators with spaces
  const nameParts = localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());

  return nameParts.join(' ');
}

/**
 * Get user image with automatic fallback to initials
 *
 * This function attempts to fetch the user's SharePoint profile photo.
 * If the user has no custom photo (SharePoint returns a default image),
 * it returns undefined for photoUrl along with auto-generated initials.
 *
 * @param userEmail - User's email address or UPN
 * @param options - Configuration options
 * @returns User image result with photo URL (if available) and initials fallback
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await getUserImage('john.doe@company.com');
 * if (result.hasCustomPhoto) {
 *   console.log('Photo URL:', result.photoUrl);
 * } else {
 *   console.log('Use initials:', result.initials, 'with color:', result.initialsColor);
 * }
 *
 * // With custom options
 * const result = await getUserImage('john.doe@company.com', {
 *   size: 'L',
 *   displayName: 'John Doe',
 *   siteUrl: 'https://tenant.sharepoint.com/sites/mysite'
 * });
 *
 * // Use in Persona component
 * const result = await getUserImage('john.doe@company.com', { size: 72 });
 * <Persona
 *   imageUrl={result.photoUrl}
 *   imageInitials={!result.hasCustomPhoto ? result.initials : undefined}
 *   initialsColor={result.initialsColor}
 * />
 * ```
 */
export async function getUserImage(
  userEmail: string,
  options?: IGetUserImageOptions
): Promise<IUserImageResult> {
  // Extract options with defaults
  const {
    siteUrl = SPContext.webAbsoluteUrl,
    size = 'M',
    displayName: providedDisplayName,
  } = options || {};

  // Determine photo size
  const photoSize: PhotoSize = typeof size === 'string' ? size : pixelSizeToPhotoSize(size);

  // Determine display name for initials
  const displayName = providedDisplayName || getDisplayNameFromEmail(userEmail);

  // Generate fallback data
  const initials = getInitials(displayName);
  const initialsColor = getPersonaColor(displayName);

  // Validate user email
  if (!userEmail || !userEmail.trim() || !userEmail.includes('@')) {
    SPContext.logger.warn('Invalid user email provided to getUserImage', { userEmail });
    return {
      photoUrl: undefined,
      hasCustomPhoto: false,
      initials,
      initialsColor,
      displayName,
    };
  }

  try {
    // Fetch user photo
    const photoUrl = await getUserPhoto(siteUrl, userEmail.trim(), photoSize);

    return {
      photoUrl,
      hasCustomPhoto: !!photoUrl,
      initials,
      initialsColor,
      displayName,
    };
  } catch (error) {
    SPContext.logger.error('Failed to get user image', error, { userEmail, photoSize });

    // Return fallback data on error
    return {
      photoUrl: undefined,
      hasCustomPhoto: false,
      initials,
      initialsColor,
      displayName,
    };
  }
}
