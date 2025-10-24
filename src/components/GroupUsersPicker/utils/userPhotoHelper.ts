/**
 * User Photo Helper Utility
 * Detects and filters out default SharePoint profile photos
 * Based on the same logic as UserPersona component
 */

import { SPComponentLoader } from '@microsoft/sp-loader';

// SharePoint default image hashes (same as UserPersona)
const DEFAULT_PERSONA_IMG_HASHES = new Set([
  '7ad602295f8386b7615b582d87bcc294',
  '4a48f26592f4e1498d7a478a4c48609c',
  '6de6a017bc934f55835ac9b721d04b8b',
  'f8cb5c6ed63e440b90d962f8c4b2377b',
  '9a06a83c57864b16a5eef56e83dd5c67',
  'dc9713f1e28b6ec4d4acba8a50c45caa',
]);

const MD5_MODULE_ID = '8494e7d7-6b99-47b2-a741-59873e42f16f';

/**
 * Load SP component by ID
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
 * Get image as base64
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
    return undefined;
  }
};

/**
 * Get MD5Hash for the image url
 */
const getMd5HashForUrl = async (url: string): Promise<string> => {
  const library: any = await loadSPComponentById(MD5_MODULE_ID);
  try {
    const md5Hash = library.Md5Hash;
    if (md5Hash) {
      const convertedHash: string = md5Hash(url);
      return convertedHash;
    }
  } catch {
    return url;
  }
  return url;
};

/**
 * Gets user photo, returns undefined if it's a default SharePoint photo
 * @param siteUrl - SharePoint site URL
 * @param loginName - User's login name or email
 * @param size - Photo size ('S', 'M', or 'L')
 * @returns Photo data URL or undefined if default/not found
 */
export const getUserPhotoIfNotDefault = async (
  siteUrl: string,
  loginName: string,
  size: 'S' | 'M' | 'L' = 'S'
): Promise<string | undefined> => {
  try {
    const personaImgUrl = `${siteUrl}/_layouts/15/userphoto.aspx?size=${size}&accountname=${encodeURIComponent(
      loginName
    )}`;
    const base64 = await getImageBase64(personaImgUrl);
    if (!base64) {
      return undefined;
    }

    const hash = await getMd5HashForUrl(base64);

    // Check if it's a default SharePoint photo
    if (DEFAULT_PERSONA_IMG_HASHES.has(hash) || DEFAULT_PERSONA_IMG_HASHES.has(base64)) {
      return undefined;
    }

    return `data:image/png;base64,${base64}`;
  } catch (error) {
    return undefined;
  }
};

/**
 * Batch fetch user photos for multiple users
 * Filters out default SharePoint photos
 * @param siteUrl - SharePoint site URL
 * @param users - Array of users with loginName
 * @param size - Photo size ('S', 'M', or 'L')
 * @returns Map of loginName to photo URL (only non-default photos)
 */
export const batchGetUserPhotos = async (
  siteUrl: string,
  users: Array<{ loginName: string }>,
  size: 'S' | 'M' | 'L' = 'S'
): Promise<Map<string, string>> => {
  const photoMap = new Map<string, string>();

  // Fetch photos in parallel
  const promises = users.map(async (user) => {
    const photo = await getUserPhotoIfNotDefault(siteUrl, user.loginName, size);
    if (photo) {
      photoMap.set(user.loginName, photo);
    }
  });

  await Promise.all(promises);
  return photoMap;
};

/**
 * Check if a photo URL is a default SharePoint photo
 * @param photoUrl - The photo URL to check
 * @returns True if it's a default photo, false otherwise
 */
export const isDefaultPhoto = async (photoUrl: string): Promise<boolean> => {
  try {
    const base64 = await getImageBase64(photoUrl);
    if (!base64) {
      return true;
    }

    const hash = await getMd5HashForUrl(base64);
    return DEFAULT_PERSONA_IMG_HASHES.has(hash) || DEFAULT_PERSONA_IMG_HASHES.has(base64);
  } catch (error) {
    return true;
  }
};
