import { PermissionKind } from '@pnp/sp/security';
import { SPPermissionLevel } from '../../types/permissionTypes';

/**
 * Standard SharePoint group names
 * These are the default groups available in all SharePoint sites
 */
export const CommonGroupNames = {
  Owners: 'Owners',
  Members: 'Members',
  Visitors: 'Visitors',
} as const;

/**
 * Constants for common SharePoint permission operations
 */
export const PermissionOperations = {
  CREATE_ITEMS: [PermissionKind.AddListItems],
  EDIT_ITEMS: [PermissionKind.EditListItems],
  DELETE_ITEMS: [PermissionKind.DeleteListItems],
  VIEW_ITEMS: [PermissionKind.ViewListItems],
  APPROVE_ITEMS: [PermissionKind.ApproveItems],
  MANAGE_LIST: [PermissionKind.ManageLists],
  MANAGE_PERMISSIONS: [PermissionKind.ManagePermissions],
  FULL_CONTROL: [PermissionKind.FullMask],
} as const;

/**
 * Permission hierarchy mapping for each SharePoint permission level
 */
export const PermissionHierarchy: Record<SPPermissionLevel, PermissionKind[]> = {
  [SPPermissionLevel.FullControl]: [
    PermissionKind.FullMask,
    PermissionKind.ManageWeb,
    PermissionKind.ManageSubwebs,
    PermissionKind.ManageLists,
    PermissionKind.ManagePermissions,
    PermissionKind.AddAndCustomizePages,
    PermissionKind.ApplyThemeAndBorder,
    PermissionKind.ApplyStyleSheets,
    PermissionKind.CreateGroups,
    PermissionKind.BrowseDirectories,
    PermissionKind.CreateSSCSite,
    PermissionKind.ViewUsageData,
    PermissionKind.ManagePersonalViews,
    PermissionKind.DeleteListItems,
    PermissionKind.EditListItems,
    PermissionKind.AddListItems,
    PermissionKind.ViewListItems,
    PermissionKind.ApproveItems,
    PermissionKind.OpenItems,
    PermissionKind.ViewVersions,
    PermissionKind.DeleteVersions,
    PermissionKind.CancelCheckout,
    PermissionKind.ViewFormPages,
    PermissionKind.Open,
    PermissionKind.ViewPages,
    PermissionKind.UseRemoteAPIs,
    PermissionKind.UseClientIntegration,
    PermissionKind.CreateAlerts,
    PermissionKind.EditMyUserInfo,
  ],
  [SPPermissionLevel.Design]: [
    PermissionKind.AddAndCustomizePages,
    PermissionKind.ApplyThemeAndBorder,
    PermissionKind.ApplyStyleSheets,
    PermissionKind.BrowseDirectories,
    PermissionKind.ManagePersonalViews,
    PermissionKind.DeleteListItems,
    PermissionKind.EditListItems,
    PermissionKind.AddListItems,
    PermissionKind.ViewListItems,
    PermissionKind.ApproveItems,
    PermissionKind.OpenItems,
    PermissionKind.ViewVersions,
    PermissionKind.DeleteVersions,
    PermissionKind.CancelCheckout,
    PermissionKind.ViewFormPages,
    PermissionKind.Open,
    PermissionKind.ViewPages,
    PermissionKind.UseRemoteAPIs,
    PermissionKind.UseClientIntegration,
    PermissionKind.CreateAlerts,
    PermissionKind.EditMyUserInfo,
  ],
  [SPPermissionLevel.Edit]: [
    PermissionKind.ManagePersonalViews,
    PermissionKind.DeleteListItems,
    PermissionKind.EditListItems,
    PermissionKind.AddListItems,
    PermissionKind.ViewListItems,
    PermissionKind.ApproveItems,
    PermissionKind.OpenItems,
    PermissionKind.ViewVersions,
    PermissionKind.DeleteVersions,
    PermissionKind.CancelCheckout,
    PermissionKind.ViewFormPages,
    PermissionKind.Open,
    PermissionKind.ViewPages,
    PermissionKind.UseRemoteAPIs,
    PermissionKind.UseClientIntegration,
    PermissionKind.CreateAlerts,
    PermissionKind.EditMyUserInfo,
  ],
  [SPPermissionLevel.Contribute]: [
    PermissionKind.ManagePersonalViews,
    PermissionKind.EditListItems,
    PermissionKind.AddListItems,
    PermissionKind.ViewListItems,
    PermissionKind.OpenItems,
    PermissionKind.ViewVersions,
    PermissionKind.ViewFormPages,
    PermissionKind.Open,
    PermissionKind.ViewPages,
    PermissionKind.UseRemoteAPIs,
    PermissionKind.UseClientIntegration,
    PermissionKind.CreateAlerts,
    PermissionKind.EditMyUserInfo,
  ],
  [SPPermissionLevel.Read]: [
    PermissionKind.ViewListItems,
    PermissionKind.OpenItems,
    PermissionKind.ViewVersions,
    PermissionKind.ViewFormPages,
    PermissionKind.Open,
    PermissionKind.ViewPages,
    PermissionKind.UseRemoteAPIs,
    PermissionKind.UseClientIntegration,
    PermissionKind.CreateAlerts,
    PermissionKind.EditMyUserInfo,
  ],
  [SPPermissionLevel.LimitedAccess]: [PermissionKind.Open],
  [SPPermissionLevel.ViewOnly]: [
    PermissionKind.ViewListItems,
    PermissionKind.OpenItems,
    PermissionKind.ViewVersions,
    PermissionKind.ViewFormPages,
    PermissionKind.Open,
    PermissionKind.ViewPages,
  ],
  [SPPermissionLevel.RestrictedRead]: [
    PermissionKind.ViewListItems,
    PermissionKind.OpenItems,
    PermissionKind.ViewFormPages,
    PermissionKind.Open,
    PermissionKind.ViewPages,
  ],
};

/**
 * Default permission level mappings to PermissionKind
 */
export const DefaultPermissionMappings: Record<SPPermissionLevel, PermissionKind> = {
  [SPPermissionLevel.FullControl]: PermissionKind.FullMask,
  [SPPermissionLevel.Design]: PermissionKind.AddAndCustomizePages,
  [SPPermissionLevel.Edit]: PermissionKind.EditListItems,
  [SPPermissionLevel.Contribute]: PermissionKind.AddListItems,
  [SPPermissionLevel.Read]: PermissionKind.ViewListItems,
  [SPPermissionLevel.LimitedAccess]: PermissionKind.Open,
  [SPPermissionLevel.ViewOnly]: PermissionKind.ViewPages,
  [SPPermissionLevel.RestrictedRead]: PermissionKind.ViewListItems,
};

/**
 * Default group name mappings
 */
export const DefaultGroupMappings: Record<string, string> = {
  Owners: 'Owners',
  Members: 'Members',
  Visitors: 'Visitors',
};

/**
 * Permission level hierarchy for determining highest permission
 */
export const PermissionLevelHierarchy = [
  { level: SPPermissionLevel.FullControl, keywords: ['full control', 'manage web'] },
  { level: SPPermissionLevel.Design, keywords: ['design', 'add and customize', 'apply theme'] },
  { level: SPPermissionLevel.Edit, keywords: ['edit items', 'delete items', 'approve'] },
  { level: SPPermissionLevel.Contribute, keywords: ['add items', 'edit items'] },
  { level: SPPermissionLevel.Read, keywords: ['view items', 'view pages'] },
  { level: SPPermissionLevel.ViewOnly, keywords: ['view'] },
  { level: SPPermissionLevel.LimitedAccess, keywords: ['open'] },
];
