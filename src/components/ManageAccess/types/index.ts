import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ExtensionContext } from '@microsoft/sp-extension-base';

// Union type for SPFx contexts
export type SPFxContext = WebPartContext | ExtensionContext;

// Enhanced permission principal with additional properties for better UX
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
}

// Sharing link information interface
export interface ISharingLinkInfo {
  id: string;
  url: string;
  description: string;
  linkKind: number;
  hasPassword: boolean;
  isExpired: boolean;
  expirationDateTime?: string;
  scope: 'anonymous' | 'organization' | 'specificPeople';
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
}

export interface ISPRoleDefinition {
  Id: number;
  Name: string;
  Description: string;
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
