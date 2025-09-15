import { PermissionKind } from '@pnp/sp/security';

/**
 * Standard SharePoint permission levels
 */
export enum SPPermissionLevel {
  FullControl = 'Full Control',
  Design = 'Design',
  Edit = 'Edit',
  Contribute = 'Contribute',
  Read = 'Read',
  LimitedAccess = 'Limited Access',
  ViewOnly = 'View Only',
  RestrictedRead = 'Restricted Read',
}

/**
 * Permission check result interface
 */
export interface IPermissionResult {
  hasPermission: boolean;
  permissionLevel?: string;
  roles?: string[];
  error?: string;
}

/**
 * User permission information
 */
export interface IUserPermissions {
  userId: number;
  loginName: string;
  email?: string;
  displayName?: string;
  groups: string[];
  permissionLevels: string[];
  directPermissions: boolean;
  inheritedPermissions: boolean;
}

/**
 * Item-level permission information
 */
export interface IItemPermissions {
  itemId: number;
  hasUniquePermissions: boolean;
  userPermissions: IUserPermissions[];
  groupPermissions: Array<{
    groupName: string;
    permissionLevels: string[];
  }>;
}

/**
 * Configuration for permission helper
 */
export interface IPermissionHelperConfig {
  enableCaching?: boolean;
  cacheTimeout?: number; // in milliseconds
  customGroupMappings?: Record<string, string>; // Map custom group names to standard roles
  permissionLevelMappings?: Record<string, PermissionKind>; // Map custom permission levels
}

/**
 * Permission mask interface for SharePoint
 */
export interface IPermissionMask {
  High: number;
  Low: number;
}

/**
 * Cached permission data
 */
export interface ICachedPermission {
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

/**
 * SharePoint user interface
 */
export interface ISPUser {
  Id: number;
  LoginName: string;
  Email?: string;
  Title?: string;
}

/**
 * SharePoint group interface
 */
export interface ISPGroup {
  Id: number;
  Title: string;
  Description?: string;
}

/**
 * SharePoint role assignment interface
 */
export interface ISPRoleAssignment {
  Member: {
    Id: number;
    Title: string;
    LoginName?: string;
    Email?: string;
    PrincipalType: number;
  };
  RoleDefinitionBindings: Array<{
    Id: number;
    Name: string;
    Description?: string;
  }>;
}

/**
 * SharePoint Item with HasUniqueRoleAssignments property
 */
export interface ISPItemWithPermissions {
  Id: number;
  HasUniqueRoleAssignments: boolean;
}

/**
 * Batch permission check request for lists
 */
export interface IBatchListRequest {
  listName: string;
  permission: SPPermissionLevel;
  key?: string;
}

/**
 * Batch permission check request for items
 */
export interface IBatchItemRequest {
  listName: string;
  itemId: number;
  permission: SPPermissionLevel;
  key?: string;
}

/**
 * Predefined permission error codes
 */
export const PermissionErrorCodes = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  LIST_NOT_FOUND: 'LIST_NOT_FOUND',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_PERMISSION_LEVEL: 'INVALID_PERMISSION_LEVEL',
  CACHE_ERROR: 'CACHE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Type for permission error codes
 */
export type PermissionErrorCode = (typeof PermissionErrorCodes)[keyof typeof PermissionErrorCodes];
