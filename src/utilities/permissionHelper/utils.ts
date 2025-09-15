import { SPFI } from '@pnp/sp';
import { PermissionKind } from '@pnp/sp/security';
import { IPermissionMask, ISPGroup, ISPUser, SPPermissionLevel } from '../../types/permissionTypes';
import { PermissionHierarchy, PermissionLevelHierarchy } from './constants';

/**
 * Utility function to get all available SharePoint groups
 * @param sp - PnP.js SP instance
 * @returns Promise<string[]> - Array of group names
 */
export async function getAllSiteGroups(sp: SPFI): Promise<string[]> {
  try {
    const groups = await sp.web.siteGroups();
    return groups.map((group: ISPGroup) => group.Title);
  } catch (error) {
    console.error('Error retrieving site groups:', error);
    return [];
  }
}

/**
 * Utility function to check if a permission level requires specific permissions
 * @param permissionLevel - The permission level to check
 * @param requiredPermissions - Array of required permission kinds
 * @returns boolean - True if the permission level includes all required permissions
 */
export function permissionLevelIncludes(
  permissionLevel: SPPermissionLevel,
  requiredPermissions: PermissionKind[]
): boolean {
  const levelPermissions = PermissionHierarchy[permissionLevel] || [];
  return requiredPermissions.every(permission => levelPermissions.includes(permission));
}

/**
 * Utility function to get readable permission names from permission mask
 * @param permissionMask - SharePoint permission mask
 * @returns string[] - Array of readable permission names
 */
export function getPermissionNames(permissionMask: IPermissionMask): string[] {
  const permissions: string[] = [];

  // High-level permissions (stored in High part of mask)
  if ((permissionMask.High & 0x10000000) !== 0) permissions.push('Full Control');
  if ((permissionMask.High & 0x08000000) !== 0) permissions.push('Manage Web');
  if ((permissionMask.High & 0x04000000) !== 0) permissions.push('Manage Subwebs');
  if ((permissionMask.High & 0x02000000) !== 0) permissions.push('Manage Lists');
  if ((permissionMask.High & 0x01000000) !== 0) permissions.push('Manage Permissions');

  // Design permissions
  if ((permissionMask.Low & 0x80000000) !== 0) permissions.push('Add and Customize Pages');
  if ((permissionMask.Low & 0x40000000) !== 0) permissions.push('Apply Themes and Borders');

  // List item permissions
  if ((permissionMask.Low & 0x8) !== 0) permissions.push('Delete Items');
  if ((permissionMask.Low & 0x4) !== 0) permissions.push('Edit Items');
  if ((permissionMask.Low & 0x2) !== 0) permissions.push('Add Items');
  if ((permissionMask.Low & 0x1) !== 0) permissions.push('View Items');

  // Other permissions
  if ((permissionMask.Low & 0x100) !== 0) permissions.push('View Versions');
  if ((permissionMask.Low & 0x200) !== 0) permissions.push('Delete Versions');
  if ((permissionMask.Low & 0x10000) !== 0) permissions.push('View Pages');
  if ((permissionMask.Low & 0x10000000) !== 0) permissions.push('Open');

  return permissions.length > 0 ? permissions : ['Limited Access'];
}

/**
 * Utility function to validate if a user has sufficient permissions for an operation
 * @param currentPermissions - User's current permissions
 * @param requiredPermissions - Required permissions for the operation
 * @returns boolean - True if user has sufficient permissions
 */
export function hasRequiredPermissions(
  currentPermissions: string[],
  requiredPermissions: string[]
): boolean {
  // If user has Full Control, they can do anything
  if (currentPermissions.includes('Full Control')) {
    return true;
  }

  // Check if user has all required permissions
  return requiredPermissions.every(required =>
    currentPermissions.some(
      current =>
        current.toLowerCase().includes(required.toLowerCase()) ||
        required.toLowerCase().includes(current.toLowerCase())
    )
  );
}

/**
 * Utility function to get the highest permission level for a user
 * @param permissions - Array of permission names
 * @returns SPPermissionLevel - Highest permission level
 */
export function getHighestPermissionLevel(permissions: string[]): SPPermissionLevel {
  const normalizedPermissions = permissions.map(p => p.toLowerCase());

  for (const { level, keywords } of PermissionLevelHierarchy) {
    if (
      keywords.some(keyword =>
        normalizedPermissions.some(permission => permission.includes(keyword))
      )
    ) {
      return level;
    }
  }

  return SPPermissionLevel.LimitedAccess;
}

/**
 * Type guard to check if an object is a valid SharePoint user
 * @param obj - Object to check
 * @returns boolean - True if object is a valid SharePoint user
 */
export function isSPUser(obj: unknown): obj is ISPUser {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'Id' in obj &&
    'LoginName' in obj &&
    typeof (obj as ISPUser).Id === 'number' &&
    typeof (obj as ISPUser).LoginName === 'string'
  );
}

/**
 * Type guard to check if an object is a valid SharePoint group
 * @param obj - Object to check
 * @returns boolean - True if object is a valid SharePoint group
 */
export function isSPGroup(obj: unknown): obj is ISPGroup {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'Id' in obj &&
    'Title' in obj &&
    typeof (obj as ISPGroup).Id === 'number' &&
    typeof (obj as ISPGroup).Title === 'string'
  );
}

/**
 * Utility function to get error message from unknown error
 * @param error - Error object
 * @returns string - Error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Utility function to normalize group names for matching
 * @param groupName - Group name to normalize
 * @returns string - Normalized group name
 */
export function normalizeGroupName(groupName: string): string {
  return groupName.toLowerCase().replace(/\s+/g, '');
}

/**
 * Utility function to check if two group names match flexibly
 * @param groupName1 - First group name
 * @param groupName2 - Second group name
 * @returns boolean - True if they match
 */
export function isGroupNameMatch(groupName1: string, groupName2: string): boolean {
  const normalized1 = normalizeGroupName(groupName1);
  const normalized2 = normalizeGroupName(groupName2);

  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}
