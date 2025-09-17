import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ExtensionContext } from '@microsoft/sp-extension-base';

// Union type for SPFx contexts
export type SPFxContext = WebPartContext | ExtensionContext;

export interface IPermissionPrincipal {
  id: string;
  email?: string;
  displayName: string;
  permissionLevel: 'view' | 'edit';
  isGroup: boolean;
  loginName?: string;
  principalType?: number;
  canBeRemoved?: boolean;
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
  principalType: 'user' | 'group';
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
};
