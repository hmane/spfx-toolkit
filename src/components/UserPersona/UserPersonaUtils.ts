/**
 * Utility functions for UserPersona component
 */

import { PersonaInitialsColor } from '@fluentui/react';
import { IPhotoCache } from './types';

/**
 * In-memory cache for user photos
 * Key: userIdentifier (email or loginName)
 * Value: { url, timestamp, failed }
 */
const photoCache = new Map<string, IPhotoCache>();

/**
 * Cache timeout - 15 minutes
 */
const CACHE_TIMEOUT = 15 * 60 * 1000;

/**
 * Get user photo URL from cache
 */
export function getCachedPhotoUrl(userIdentifier: string): IPhotoCache | null {
  const cached = photoCache.get(userIdentifier.toLowerCase());

  if (!cached) {
    return null;
  }

  // Check if cache is still valid
  if (Date.now() - cached.timestamp > CACHE_TIMEOUT) {
    photoCache.delete(userIdentifier.toLowerCase());
    return null;
  }

  return cached;
}

/**
 * Cache user photo URL
 */
export function cachePhotoUrl(userIdentifier: string, url: string | null, failed: boolean): void {
  photoCache.set(userIdentifier.toLowerCase(), {
    url,
    timestamp: Date.now(),
    failed,
  });
}

/**
 * Clear photo cache
 */
export function clearPhotoCache(): void {
  photoCache.clear();
}

/**
 * Get SharePoint user photo URL
 * Based on: https://github.com/pnp/sp-dev-fx-webparts/blob/main/samples/react-my-sites/src/Utils/Utils.ts
 */
export function getUserPhotoUrl(
  siteUrl: string,
  userIdentifier: string,
  size: 'S' | 'M' | 'L' = 'M'
): string {
  // Clean the user identifier
  const cleanIdentifier = userIdentifier.toLowerCase().trim();

  // Construct photo URL
  const photoUrl = `${siteUrl}/_layouts/15/userphoto.aspx?size=${size}&accountname=${encodeURIComponent(
    cleanIdentifier
  )}`;

  return photoUrl;
}

/**
 * Load user photo and return URL if successful
 * Returns null if photo fails to load or is a default placeholder
 */
export async function loadUserPhoto(
  siteUrl: string,
  userIdentifier: string,
  size: 'S' | 'M' | 'L' = 'M'
): Promise<string | null> {
  // Check cache first
  const cached = getCachedPhotoUrl(userIdentifier);
  if (cached !== null) {
    return cached.url;
  }

  const photoUrl = getUserPhotoUrl(siteUrl, userIdentifier, size);

  return new Promise((resolve) => {
    const img = new Image();
    let timeoutId: number;

    img.onload = () => {
      clearTimeout(timeoutId);

      // Check if this is a default placeholder image
      // SharePoint default user images are typically very small (1x1, 10x10)
      const isDefaultPlaceholder =
        (img.width === 1 && img.height === 1) ||
        (img.width <= 10 && img.height <= 10) ||
        (img.naturalWidth === 1 && img.naturalHeight === 1) ||
        (img.naturalWidth <= 10 && img.naturalHeight <= 10);

      if (isDefaultPlaceholder) {
        // This is a default image - cache as failed
        cachePhotoUrl(userIdentifier, null, true);
        resolve(null);
      } else {
        // Valid photo - cache the URL
        cachePhotoUrl(userIdentifier, photoUrl, false);
        resolve(photoUrl);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      // Photo failed to load - cache as failed
      cachePhotoUrl(userIdentifier, null, true);
      resolve(null);
    };

    // Set timeout to prevent hanging
    timeoutId = window.setTimeout(() => {
      img.src = '';
      cachePhotoUrl(userIdentifier, null, true);
      resolve(null);
    }, 5000);

    img.src = photoUrl;
  });
}

/**
 * Get initials from display name
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
 * Get persona color based on display name
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
 * Normalize user identifier for photo loading
 * Handles various formats: email, i:0#.f|membership|email, UPN, etc.
 */
export function normalizeUserIdentifier(userIdentifier: string): string {
  if (!userIdentifier) {
    return '';
  }

  // If it's already an email, return it
  if (userIdentifier.includes('@') && !userIdentifier.includes('|')) {
    return userIdentifier.toLowerCase().trim();
  }

  // Handle SharePoint login formats like "i:0#.f|membership|email@domain.com"
  if (userIdentifier.includes('|')) {
    const parts = userIdentifier.split('|');
    const email = parts[parts.length - 1];
    if (email.includes('@')) {
      return email.toLowerCase().trim();
    }
  }

  // Return as-is if we can't parse it
  return userIdentifier.toLowerCase().trim();
}

/**
 * Get photo size based on persona size
 */
export function getPhotoSize(personaSize: number): 'S' | 'M' | 'L' {
  if (personaSize <= 32) {
    return 'S';
  } else if (personaSize <= 48) {
    return 'M';
  } else {
    return 'L';
  }
}

/**
 * Check if user identifier is valid for photo loading
 */
export function isValidForPhotoLoad(userIdentifier: string): boolean {
  if (!userIdentifier || userIdentifier.trim().length === 0) {
    return false;
  }

  const normalized = normalizeUserIdentifier(userIdentifier);

  // Must have @ symbol (email format)
  return normalized.includes('@');
}
