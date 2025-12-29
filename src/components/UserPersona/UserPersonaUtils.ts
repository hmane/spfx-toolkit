/**
 * Utility functions for UserPersona component
 */

import { IProfileCache } from './types';

// Re-export shared utilities from userPhotoHelper
export {
  getInitials,
  getPersonaColor,
  pixelSizeToPhotoSize as getPhotoSize,
} from '../../utilities/userPhotoHelper';

/**
 * In-memory cache for user profiles
 * Key: userIdentifier (normalized)
 * Value: { profile, timestamp }
 */
const profileCache = new Map<string, IProfileCache>();

/**
 * Pending profile requests for deduplication
 */
const pendingProfileRequests = new Map<string, Promise<IProfileCache['profile'] | undefined>>();

/**
 * Cache timeout - 1 hour
 */
const CACHE_TIMEOUT = 60 * 60 * 1000;

/**
 * Get user profile from cache
 */
export function getCachedProfile(userIdentifier: string): IProfileCache | undefined {
  const cached = profileCache.get(userIdentifier.toLowerCase());

  if (!cached) {
    return undefined;
  }

  if (Date.now() - cached.timestamp > CACHE_TIMEOUT) {
    profileCache.delete(userIdentifier.toLowerCase());
    return undefined;
  }

  return cached;
}

/**
 * Cache user profile
 */
export function cacheProfile(userIdentifier: string, profile: IProfileCache['profile']): void {
  profileCache.set(userIdentifier.toLowerCase(), {
    profile,
    timestamp: Date.now(),
  });
}

/**
 * Get pending profile request if one exists
 */
export function getPendingProfileRequest(userIdentifier: string): Promise<IProfileCache['profile'] | undefined> | undefined {
  return pendingProfileRequests.get(userIdentifier.toLowerCase());
}

/**
 * Set pending profile request
 */
export function setPendingProfileRequest(userIdentifier: string, promise: Promise<IProfileCache['profile'] | undefined>): void {
  pendingProfileRequests.set(userIdentifier.toLowerCase(), promise);
}

/**
 * Clear pending profile request
 */
export function clearPendingProfileRequest(userIdentifier: string): void {
  pendingProfileRequests.delete(userIdentifier.toLowerCase());
}

/**
 * Clear profile cache
 */
export function clearProfileCache(): void {
  profileCache.clear();
}

/**
 * Get SharePoint user photo URL
 */
export function getUserPhotoUrl(
  siteUrl: string,
  userIdentifier: string,
  size: 'S' | 'M' | 'L' = 'M'
): string {
  const cleanIdentifier = userIdentifier.toLowerCase().trim();
  return `${siteUrl}/_layouts/15/userphoto.aspx?size=${size}&accountname=${encodeURIComponent(
    cleanIdentifier
  )}`;
}


/**
 * Normalize user identifier for lookups
 * Handles various formats: email, i:0#.f|membership|email, UPN, etc.
 */
export function normalizeUserIdentifier(userIdentifier: string): string {
  if (!userIdentifier) {
    return '';
  }

  if (userIdentifier.includes('@') && !userIdentifier.includes('|')) {
    return userIdentifier.toLowerCase().trim();
  }

  if (userIdentifier.includes('|')) {
    const parts = userIdentifier.split('|');
    const email = parts[parts.length - 1];
    if (email.includes('@')) {
      return email.toLowerCase().trim();
    }
  }

  return userIdentifier.toLowerCase().trim();
}


/**
 * Check if user identifier is valid
 */
export function isValidUserIdentifier(userIdentifier: string): boolean {
  if (!userIdentifier || userIdentifier.trim().length === 0) {
    return false;
  }

  const normalized = normalizeUserIdentifier(userIdentifier);
  return normalized.includes('@');
}

