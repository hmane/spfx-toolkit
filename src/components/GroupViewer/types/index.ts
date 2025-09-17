import { ExtensionContext } from '@microsoft/sp-extension-base';
import { WebPartContext } from '@microsoft/sp-webpart-base';

// Union type for SPFx contexts
export type SPFxContext = WebPartContext | ExtensionContext;

export interface IGroupViewerProps {
  spContext: SPFxContext;
  groupId?: number;
  groupName: string;
  size?: number;
  displayMode?: 'icon' | 'name' | 'iconAndName';
  iconName?: string;
  className?: string;
  onClick?: (groupName: string, groupId?: number) => void;
}

export interface IGroupMember {
  Id: number;
  Title: string;
  Email: string;
  LoginName: string;
  PrincipalType: number;
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
};
