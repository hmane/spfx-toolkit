/**
 * Utility functions for SPUserField component
 * Handles conversion between IPrincipal, ISPUserFieldValue, and PeoplePicker formats
 *
 * @packageDocumentation
 */

import { IPrincipal } from '../../../types';
import { ISPUserFieldValue } from '../types';
import { SPUserFieldValue } from './SPUserField.types';

/**
 * Check if a value is IPrincipal format
 */
export function isIPrincipal(value: any): value is IPrincipal {
  return (
    value &&
    typeof value === 'object' &&
    'id' in value &&
    (typeof value.id === 'string' || typeof value.id === 'number')
  );
}

/**
 * Check if a value is ISPUserFieldValue format
 */
export function isISPUserFieldValue(value: any): value is ISPUserFieldValue {
  return (
    value &&
    typeof value === 'object' &&
    'Id' in value &&
    typeof value.Id === 'number' &&
    'Title' in value
  );
}

/**
 * Convert IPrincipal to ISPUserFieldValue format
 */
export function principalToUserFieldValue(principal: IPrincipal): ISPUserFieldValue {
  // F-3: Safer ID conversion - handle NaN and string/number inputs correctly
  const parsedId = typeof principal.id === 'number' ? principal.id : parseInt(String(principal.id), 10);
  return {
    Id: Number.isNaN(parsedId) ? 0 : parsedId,
    EMail: principal.email,
    Title: principal.title || principal.email || principal.loginName || '',
    Name: principal.loginName || principal.value,
    Picture: principal.picture,
    Sip: principal.sip,
  };
}

/**
 * Convert ISPUserFieldValue to IPrincipal format
 */
export function userFieldValueToPrincipal(userValue: ISPUserFieldValue): IPrincipal {
  return {
    id: userValue.Id.toString(),
    email: userValue.EMail,
    title: userValue.Title,
    loginName: userValue.Name,
    value: userValue.Name,
    sip: userValue.Sip,
    picture: userValue.Picture,
  };
}

/**
 * Normalize SPUserFieldValue to IPrincipal format
 * Handles both IPrincipal and ISPUserFieldValue inputs
 */
export function normalizeToIPrincipal(value: SPUserFieldValue): IPrincipal {
  if (isIPrincipal(value)) {
    return value;
  }
  if (isISPUserFieldValue(value)) {
    return userFieldValueToPrincipal(value);
  }
  // Fallback - try to extract what we can
  return {
    id: (value as any).Id?.toString() || (value as any).id?.toString() || '0',
    email: (value as any).EMail || (value as any).email,
    title: (value as any).Title || (value as any).title,
    loginName: (value as any).Name || (value as any).loginName || (value as any).value,
    value: (value as any).Name || (value as any).loginName || (value as any).value,
  };
}

/**
 * Normalize SPUserFieldValue array to IPrincipal array
 */
export function normalizeToIPrincipalArray(values: SPUserFieldValue[]): IPrincipal[] {
  if (!values || !Array.isArray(values)) {
    return [];
  }
  return values.map(normalizeToIPrincipal);
}

/**
 * Convert IPrincipal to PeoplePicker format (for defaultSelectedUsers)
 */
export function principalToPeoplePickerFormat(principal: IPrincipal): string {
  // PeoplePicker expects email, loginName, or Title
  return principal.email || principal.loginName || principal.value || principal.title || '';
}

/**
 * Convert PeoplePicker item to IPrincipal
 */
export function peoplePickerItemToPrincipal(item: any): IPrincipal {
  // F-3: Safely extract ID - handle undefined, null, and numeric values
  const rawId = item.id ?? item.Id ?? '0';
  const id = String(rawId);
  return {
    id,
    email: item.secondaryText || item.EMail || item.email,
    title: item.text || item.Title || item.title || '',
    loginName: item.loginName || item.Name || item.name,
    value: item.loginName || item.Name || item.name,
    picture: item.imageUrl || item.Picture || item.picture,
    sip: item.sip || item.Sip,
    department: item.department || item.Department,
    jobTitle: item.jobTitle || item.JobTitle,
  };
}

/**
 * Convert PeoplePicker items array to IPrincipal array
 */
export function peoplePickerItemsToPrincipals(items: any[]): IPrincipal[] {
  if (!items || !Array.isArray(items)) {
    return [];
  }
  return items.map(peoplePickerItemToPrincipal);
}

/**
 * Get display identifier from SPUserFieldValue
 * Returns email, loginName, or title in order of preference
 */
export function getUserIdentifier(value: SPUserFieldValue | null | undefined): string {
  if (!value) {
    return '';
  }

  const principal = normalizeToIPrincipal(value);
  return principal.email || principal.loginName || principal.value || principal.title || '';
}

/**
 * Get display name from SPUserFieldValue
 */
export function getUserDisplayName(value: SPUserFieldValue | null | undefined): string {
  if (!value) {
    return '';
  }

  const principal = normalizeToIPrincipal(value);
  return principal.title || principal.email || principal.loginName || '';
}
