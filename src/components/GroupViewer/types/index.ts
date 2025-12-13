import { ExtensionContext } from '@microsoft/sp-extension-base';
import { WebPartContext } from '@microsoft/sp-webpart-base';

// Union type for SPFx contexts
export type SPFxContext = WebPartContext | ExtensionContext;

export interface IGroupViewerProps {
  groupId?: number;
  groupName: string;
  size?: number;
  displayMode?: 'icon' | 'name' | 'iconAndName';
  iconName?: string;
  className?: string;
  onClick?: (groupName: string, groupId?: number) => void;
  bustCache?: boolean;
  onError?: (error: Error) => void;
  nestLevel?: number;
  maxNestLevel?: number;
}

export interface IGroupMember {
  Id: number;
  Title: string;
  Email: string;
  LoginName: string;
  PrincipalType: number;
  UserPrincipalName?: string;
}

export interface IGroupInfo {
  Id: number;
  Title: string;
  Description?: string;
  LoginName: string;
}

export const GroupViewerDefaultSettings = {
  size: 32,
  displayMode: 'iconAndName' as const,
  iconName: 'Group',
  nestLevel: 0,
  maxNestLevel: 2,
};

export enum SPPrincipalType {
  User = 1,
  DistributionList = 2,
  SecurityGroup = 4,
  SharePointGroup = 8,
  All = 15,
}

export const CACHE_CONSTANTS = {
  TTL_MS: 15 * 60 * 1000, // 15 minutes
  TOOLTIP_DELAY: 300,
};

// Utility class for persona-related operations
export class PersonaUtils {
  /**
   * Get best UPN for LivePersona from user object
   */
  static getBestUpn(user: IGroupMember): string | undefined {
    // Try email first (most reliable)
    if (user.Email && user.Email.includes('@')) {
      return user.Email.toLowerCase().trim();
    }

    // Try UserPrincipalName
    if (user.UserPrincipalName && user.UserPrincipalName.includes('@')) {
      return user.UserPrincipalName.toLowerCase().trim();
    }

    // Try LoginName if it looks like UPN
    if (user.LoginName && user.LoginName.includes('@') && !user.LoginName.startsWith('i:0#.f|')) {
      return user.LoginName.toLowerCase().trim();
    }

    // Extract from claims-based loginName (i:0#.f|membership|user@domain.com)
    if (user.LoginName && user.LoginName.includes('|')) {
      const parts = user.LoginName.split('|');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.includes('@')) {
        return lastPart.toLowerCase().trim();
      }
    }

    return undefined;
  }

  /**
   * Check if user can be displayed with LivePersona
   */
  static canShowLivePersona(user: IGroupMember): boolean {
    const upn = PersonaUtils.getBestUpn(user);
    return upn !== undefined && upn.includes('@');
  }

  /**
   * Get initials for fallback display
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

  /**
   * Get consistent persona color based on display name
   */
  static getPersonaColorIndex(displayName: string): number {
    const hash = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hash % 8; // 8 colors available
  }
}
