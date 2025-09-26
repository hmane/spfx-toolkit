import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ExtensionContext } from '@microsoft/sp-extension-base';

// Union type for SPFx contexts
export type SPFxContext = WebPartContext | ExtensionContext;

// Enhanced permission principal with additional properties for better UX and LivePersona support
export interface IPermissionPrincipal {
  id: string;
  email?: string;
  displayName: string;
  permissionLevel: 'view' | 'edit';
  isGroup: boolean;
  loginName?: string;
  principalType?: number;
  canBeRemoved?: boolean;

  // Enhanced properties for better permission handling
  isLimitedAccess?: boolean;
  isSharingLink?: boolean;
  sharingLinkType?: 'anonymous' | 'organization' | 'specific';
  actualUsers?: IPermissionPrincipal[]; // For expanded group members
  inheritedFrom?: string; // Group name if permission is inherited

  // NEW: Enhanced properties for LivePersona integration
  userPrincipalName?: string; // Normalized UPN for LivePersona
  normalizedEmail?: string; // Cleaned email for LivePersona
  isValidForPersona?: boolean; // Whether this user can be displayed with LivePersona
}

// NEW: Sharing link information interface with enhanced detection
export interface ISharingLinkInfo {
  id: string;
  url?: string;
  description?: string;
  linkKind: number;
  hasPassword?: boolean;
  isExpired?: boolean;
  expirationDateTime?: string;
  scope: 'anonymous' | 'organization' | 'specificPeople';

  // NEW: Enhanced permission detection
  actualPermissionLevel?: 'view' | 'edit';
  roleDefinitionName?: string;
  allowsEdit?: boolean;
  allowsView?: boolean;
}

// NEW: SharePoint sharing information response
export interface ISPSharingInfo {
  sharingLinks?: Array<{
    linkKind: number;
    url?: string;
    description?: string;
    scope?: string;
    roleValue?: string;
    allowsAnonymousAccess?: boolean;
    isEditLink?: boolean;
    isReviewLink?: boolean;
    passwordProtected?: boolean;
    expiration?: string;
  }>;

  directUrl?: string;
  canShare?: boolean;
  hasSharingLinks?: boolean;

  // Permission level mapping
  permissionLevels?: Array<{
    name: string;
    roleTypeKind: number;
    hidden: boolean;
  }>;
}

// Enhanced interfaces for better permission management
export interface IEnhancedPermissionResult {
  principals: IPermissionPrincipal[];
  sharingLinks: ISharingLinkInfo[];
  hasUniquePermissions: boolean;
  totalUserCount: number;
  totalGroupCount: number;
  sharingLinkCount: number;
}

export interface ISPRoleAssignment {
  Member: ISPMember;
  RoleDefinitionBindings: ISPRoleDefinition[];
}

export interface ISPMember {
  Id: number;
  Title: string;
  LoginName: string;
  Email?: string;
  PrincipalType: number;
  UserPrincipalName?: string; // NEW: For better LivePersona support
}

export interface ISPRoleDefinition {
  Id: number;
  Name: string;
  Description: string;
  RoleTypeKind?: number; // NEW: For better permission level detection
}

export interface IActivityFeedItem {
  id: string;
  action: 'added' | 'removed' | 'modified';
  principalName: string;
  principalType: 'user' | 'group' | 'sharingLink';
  permissionLevel: 'view' | 'edit';
  modifiedBy: string;
  modifiedDate: Date;
  previousPermissionLevel?: 'view' | 'edit';
}

export interface IManageAccessComponentProps {
  spContext: SPFxContext;
  itemId: number;
  listId: string;
  permissionTypes: 'view' | 'edit' | 'both';
  onPermissionChanged: (
    operation: 'add' | 'remove',
    principals: IPermissionPrincipal[]
  ) => Promise<boolean>;
  siteUrl?: string;
  maxAvatars?: number;
  protectedPrincipals?: string[];
  onError?: (error: string) => void;

  // Enhanced options
  showSharingLinks?: boolean; // Whether to show sharing links in the UI
  expandGroupMembers?: boolean; // Whether to expand group members
  filterLimitedAccess?: boolean; // Whether to filter out Limited Access groups
}

export interface IManageAccessComponentState {
  isLoading: boolean;
  showManageAccessPanel: boolean;
  showActivityFeed: boolean;
  permissions: IPermissionPrincipal[];
  currentUserPermissions: string[];
  canManagePermissions: boolean;
  inlineMessage: string;
  showInlineMessage: boolean;

  // Enhanced state
  sharingLinks?: ISharingLinkInfo[];
  expandedGroups?: Set<string>; // Track which groups are expanded
}

export interface IPermissionLevelOption {
  key: 'view' | 'edit';
  text: string;
  iconName: string;
}

export const PermissionLevelOptions: IPermissionLevelOption[] = [
  {
    key: 'view',
    text: 'Can view',
    iconName: 'View',
  },
  {
    key: 'edit',
    text: 'Can edit',
    iconName: 'Edit',
  },
];

export const DefaultProps = {
  maxAvatars: 5,
  protectedPrincipals: [],
  siteUrl: '',
  showSharingLinks: true,
  expandGroupMembers: false, // Default to false to match SharePoint OOB behavior
  filterLimitedAccess: true,
};

// NEW: Utility functions for LivePersona integration
export const PersonaUtils = {
  /**
   * Normalize email/UPN for LivePersona compatibility
   */
  normalizeUpn: (user: IPermissionPrincipal): string => {
    // Try email first (most reliable for LivePersona)
    if (user.email && user.email.includes('@')) {
      return user.email.toLowerCase().trim();
    }

    // Try userPrincipalName
    if (user.userPrincipalName && user.userPrincipalName.includes('@')) {
      return user.userPrincipalName.toLowerCase().trim();
    }

    // Try loginName if it looks like UPN
    if (user.loginName && user.loginName.includes('@') && !user.loginName.startsWith('i:0#.f|')) {
      return user.loginName.toLowerCase().trim();
    }

    // Extract from claims-based loginName (i:0#.f|membership|user@domain.com)
    if (user.loginName && user.loginName.includes('|')) {
      const parts = user.loginName.split('|');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.includes('@')) {
        return lastPart.toLowerCase().trim();
      }
    }

    // Fallback to displayName if it looks like an email
    if (user.displayName && user.displayName.includes('@')) {
      return user.displayName.toLowerCase().trim();
    }

    // Return displayName as final fallback
    return user.displayName || user.id || 'Unknown User';
  },

  /**
   * Check if user can be displayed with LivePersona
   */
  canUsePersona: (user: IPermissionPrincipal): boolean => {
    const normalizedUpn = PersonaUtils.normalizeUpn(user);
    return normalizedUpn.includes('@') && !normalizedUpn.includes('Unknown User');
  },

  /**
   * Get fallback initials for users without LivePersona
   */
  getInitials: (displayName: string): string => {
    if (!displayName) return '?';

    const words = displayName.split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  },
};

// Utility type guards
export const isEnhancedPermissionPrincipal = (
  principal: IPermissionPrincipal
): principal is Required<IPermissionPrincipal> => {
  return principal.hasOwnProperty('isSharingLink') && principal.hasOwnProperty('isLimitedAccess');
};

// Permission filtering options
export interface IPermissionFilterOptions {
  showUsers: boolean;
  showGroups: boolean;
  showSharingLinks: boolean;
  showInheritedPermissions: boolean;
  hideSystemGroups: boolean;
}

export const DefaultFilterOptions: IPermissionFilterOptions = {
  showUsers: true,
  showGroups: true,
  showSharingLinks: true,
  showInheritedPermissions: false,
  hideSystemGroups: true,
};
