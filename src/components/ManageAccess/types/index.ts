import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ExtensionContext } from '@microsoft/sp-extension-base';

// Union type for SPFx contexts
export type SPFxContext = WebPartContext | ExtensionContext;

// Enhanced permission principal interface
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
  actualUsers?: IPermissionPrincipal[];
  inheritedFrom?: string;

  // Properties for LivePersona integration
  userPrincipalName?: string;
  normalizedEmail?: string;
  isValidForPersona?: boolean;
}

// SharePoint role assignment interfaces
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
  UserPrincipalName?: string;
}

export interface ISPRoleDefinition {
  Id: number;
  Name: string;
  Description: string;
  RoleTypeKind?: number;
}

// SharePoint sharing information
export interface ISPSharingInfo {
  permissionsInformation?: {
    links?: {
      results?: Array<{
        linkDetails?: {
          IsActive?: boolean;
          IsEditLink?: boolean;
          LinkKind?: number;
          Scope?: number;
        };
        linkMembers?: {
          results?: Array<{
            id: number;
            name: string;
            email: string;
            loginName: string;
            principalType: number;
            userPrincipalName?: string;
            isExternal?: boolean;
          }>;
        };
      }>;
    };
    principals?: {
      results?: any[];
    };
  };
  sharingLinks?: any[];
}

// Component props and state
export interface IManageAccessComponentProps {
  itemId: number;
  listId: string;
  permissionTypes?: 'view' | 'edit' | 'both';
  maxAvatars?: number;
  protectedPrincipals?: string[];
  enabled?: boolean; // NEW PROP
  onPermissionChanged: (
    operation: 'add' | 'remove',
    principals: IPermissionPrincipal[]
  ) => Promise<boolean>;
  onError?: (error: string) => void;
}

export interface IManageAccessComponentState {
  isLoading: boolean;
  showManageAccessPanel: boolean;
  permissions: IPermissionPrincipal[];
  currentUserPermissions: string[];
  canManagePermissions: boolean;
  inlineMessage: string;
  showInlineMessage: boolean;
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
  enabled: true,
};

// SharePoint role definition IDs
export enum SPRoleType {
  None = 0,
  Guest = 1,
  Reader = 2,
  Contributor = 3,
  WebDesigner = 4,
  Administrator = 5,
}

export const ROLE_DEFINITION_IDS = {
  LIMITED_ACCESS: 1073741825,
  READ: 1073741826,
  CONTRIBUTE: 1073741827,
  DESIGN: 1073741828,
  FULL_CONTROL: 1073741829,
  EDIT: 1073741830,
};

// Utility class for persona operations (shared with GroupViewer pattern)
export class PersonaUtils {
  /**
   * Normalize email/UPN for LivePersona compatibility
   */
  static normalizeUpn(user: IPermissionPrincipal): string {
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
  }

  /**
   * Check if user can be displayed with LivePersona
   */
  static canUsePersona(user: IPermissionPrincipal): boolean {
    const normalizedUpn = PersonaUtils.normalizeUpn(user);
    return normalizedUpn.includes('@') && !normalizedUpn.includes('Unknown User');
  }

  /**
   * Get fallback initials for users without LivePersona
   */
  static getInitials(displayName: string): string {
    if (!displayName) return '?';

    const words = displayName.split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }
}
