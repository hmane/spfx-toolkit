/**
 * Utility functions for UserPersona component
 */

import { PersonaInitialsColor } from '@fluentui/react';
import { IProfileCache } from './types';

/**
 * In-memory cache for user profiles
 * Key: userIdentifier (normalized)
 * Value: { profile, timestamp }
 */
const profileCache = new Map<string, IProfileCache>();

/**
 * Cache timeout - 1 hour
 */
const CACHE_TIMEOUT = 60 * 60 * 1000;

/**
 * Get user profile from cache
 */
export function getCachedProfile(userIdentifier: string): IProfileCache | null {
  const cached = profileCache.get(userIdentifier.toLowerCase());

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.timestamp > CACHE_TIMEOUT) {
    profileCache.delete(userIdentifier.toLowerCase());
    return null;
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
 * Check if user identifier is valid
 */
export function isValidUserIdentifier(userIdentifier: string): boolean {
  if (!userIdentifier || userIdentifier.trim().length === 0) {
    return false;
  }

  const normalized = normalizeUserIdentifier(userIdentifier);
  return normalized.includes('@');
}

