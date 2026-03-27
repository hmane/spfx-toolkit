import { Icon } from '@fluentui/react/lib/Icon';
import { Link } from '@fluentui/react/lib/Link';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { SPContext } from '../../utilities/context';
import { GroupViewer } from '../GroupViewer';
import { UserPersona } from '../UserPersona';
import './ManageAccessComponent.css';
import { ManageAccessPanel } from './ManageAccessPanel';
import {
  DefaultProps,
  IManageAccessComponentProps,
  IPermissionPrincipal,
  PersonaUtils,
} from './types';

// =============================================================================
// GLOBAL CACHE for ManageAccess GetSharingInformation API
// Uses window-level caching to deduplicate API calls across component instances.
// =============================================================================

const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MANAGE_ACCESS_CACHE_KEY = '__spfx_toolkit_manage_access_cache__';

interface IManageAccessCache {
  sharingInfo: Map<string, { data: any; timestamp: number }>;
  sharingInfoPending: Map<string, Promise<any>>;
}

function getManageAccessCacheKey(listId: string, itemId: number): string {
  return `sharing_${listId}_${itemId}`;
}

// Get ManageAccess-specific cache for sharing info
function getManageAccessCache(): IManageAccessCache {
  const win = window as any;
  if (!win[MANAGE_ACCESS_CACHE_KEY]) {
    win[MANAGE_ACCESS_CACHE_KEY] = {
      sharingInfo: new Map(),
      sharingInfoPending: new Map(),
    };
  }
  return win[MANAGE_ACCESS_CACHE_KEY];
}

function invalidateSharingInfoCache(listId: string, itemId: number): void {
  const cache = getManageAccessCache();
  const key = getManageAccessCacheKey(listId, itemId);
  cache.sharingInfo.delete(key);
  cache.sharingInfoPending.delete(key);
}

// NOTE: We no longer call getCurrentUserEffectivePermissions to avoid EffectiveBasePermissions spam.
// Instead, we determine canManagePermissions from the GetSharingInformation response by checking
// if the current user has role >= Edit (role 3 or 9) on the item.

/**
 * Result from getEnhancedItemPermissions including user's manage capability
 */
interface IPermissionsResult {
  permissions: IPermissionPrincipal[];
  canManage: boolean;
}

/**
 * Sharing information response from GetSharingInformation API
 */
interface ISharingInfoResponse {
  permissionsInformation?: {
    links?: {
      results?: Array<{
        linkDetails?: {
          IsEditLink?: boolean;
          LinkKind?: number;
          Scope?: number;
          Url?: string;
          ShareLinkUrl?: string;
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
      results?: Array<{
        principal: {
          id: number;
          name: string;
          loginName: string;
          email: string | null;
          principalType: number;
          userPrincipalName: string | null;
          isActive: boolean;
          isExternal: boolean;
        };
        role: number; // 1=View, 3=Edit/FullControl, 9=Edit
        isInherited: boolean;
        members?: { results?: any[] };
      }>;
    };
    siteAdmins?: {
      results?: Array<any>;
    };
  };
}

/**
 * Convert GetSharingInformation role numbers to permission levels
 * Role values: 1=View, 2=Review, 3=FullControl, 9=Edit
 */
function roleToPermissionLevel(role: number): 'view' | 'edit' {
  // 3 = Full Control (Owner), 9 = Edit (Contribute), 1 = View (Reader)
  return role === 1 ? 'view' : 'edit';
}

function getSharingLinkPresentation(linkDetails?: {
  LinkKind?: number;
  Scope?: number;
}): {
  type: 'anonymous' | 'organization' | 'specific';
  label: string;
  iconName: string;
} | null {
  const linkKind = linkDetails?.LinkKind;
  const scope = linkDetails?.Scope;

  if (linkKind === 4 || linkKind === 5 || scope === 0) {
    return {
      type: 'anonymous',
      label: 'Anyone with the link',
      iconName: 'Globe',
    };
  }

  if (linkKind === 2 || linkKind === 3 || scope === 1) {
    return null;
  }

  if (linkKind === 1) {
    return {
      type: 'specific',
      label: 'People with existing access',
      iconName: 'Link',
    };
  }

  return {
    type: 'specific',
    label: 'Specific people',
    iconName: 'Link',
  };
}

/**
 * Fetch sharing information using SharePoint's native GetSharingInformation API
 * This is the same API SharePoint uses in its Manage Access panel
 */
async function getSharedSharingInfo(listId: string, itemId: number): Promise<ISharingInfoResponse | null> {
  const cache = getManageAccessCache();
  const key = getManageAccessCacheKey(listId, itemId);

  // Return cached data if valid
  const cached = cache.sharingInfo.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
    return cached.data;
  }

  // Wait for pending request if one exists
  const pending = cache.sharingInfoPending.get(key);
  if (pending) {
    return pending;
  }

  // Create pending promise BEFORE any async operation
  const request = (async () => {
    try {
      const webUrl = SPContext.webAbsoluteUrl;
      // Use GetSharingInformation API - same as SharePoint's native Manage Access panel
      const encodedListId = encodeURIComponent(`'${listId}'`);
      const apiUrl = `${webUrl}/_api/web/Lists(@a1)/items(${itemId})/GetSharingInformation?@a1=${encodedListId}&$Expand=permissionsInformation`;

      // Get request digest for POST request
      const contextInfo = await SPContext.sp.web.getContextInfo();
      const requestDigest = String(contextInfo.FormDigestValue);

      const fetchResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': requestDigest,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          request: {
            maxPrincipalsToReturn: 100,
            maxLinkMembersToReturn: 100,
          },
        }),
      });

      if (!fetchResponse.ok) {
        throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
      }

      const result = await fetchResponse.json();
      const data = result.d || result;

      cache.sharingInfo.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      SPContext.logger.error('ManageAccess: GetSharingInformation failed', error, { listId, itemId });
      return null;
    } finally {
      cache.sharingInfoPending.delete(key);
    }
  })();

  // Set pending SYNCHRONOUSLY before returning
  cache.sharingInfoPending.set(key, request);
  return request;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ManageAccessComponent: React.FC<IManageAccessComponentProps> = props => {
  const {
    itemId,
    listId,
    permissionTypes,
    onPermissionChanged,
    maxAvatars = DefaultProps.maxAvatars,
    protectedPrincipals = DefaultProps.protectedPrincipals,
    onError,
    enabled,
  } = props;

  const [isLoading, setIsLoading] = React.useState(true);
  const [showManageAccessPanel, setShowManageAccessPanel] = React.useState(false);
  const [permissions, setPermissions] = React.useState<IPermissionPrincipal[]>([]);
  const [canManagePermissions, setCanManagePermissions] = React.useState(false);
  const [inlineMessage, setInlineMessage] = React.useState('');
  const [showInlineMessage, setShowInlineMessage] = React.useState(false);

  const inlineMessageTimeoutRef = React.useRef<number | null>(null);
  // Guard against duplicate permission loading
  const hasLoadedRef = React.useRef<boolean>(false);
  const loadingRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    return () => {
      if (inlineMessageTimeoutRef.current) {
        clearTimeout(inlineMessageTimeoutRef.current);
      }
    };
  }, []);

  const getEnhancedItemPermissions = React.useCallback(async (): Promise<IPermissionsResult> => {
    try {
      // Use SharePoint's native GetSharingInformation API - same as the Manage Access panel
      const sharingInfo = await getSharedSharingInfo(listId, itemId);

      if (!sharingInfo) {
        return { permissions: [], canManage: false };
      }

      const permissionsList: IPermissionPrincipal[] = [];
      const processedPrincipals = new Set<string>();

      // Get current user info for permission checking
      const currentUserLoginName = SPContext.currentUser?.loginName?.toLowerCase() || '';
      const currentUserEmail = SPContext.currentUser?.email?.toLowerCase() || '';
      const currentUserValue = SPContext.currentUser?.value?.toLowerCase() || '';
      const currentUserId = SPContext.currentUser?.id;
      let currentUserCanManage = false;

      // Track groups with edit permissions to check user membership later
      const groupsWithEditAccess: number[] = [];

      const isCurrentUser = (principal: {
        id?: number | string;
        loginName?: string | null;
        email?: string | null;
        userPrincipalName?: string | null;
      }): boolean => {
        const principalId = principal.id !== undefined ? String(principal.id) : '';
        const principalLogin = principal.loginName?.toLowerCase() || '';
        const principalEmail = principal.email?.toLowerCase() || '';
        const principalUpn = principal.userPrincipalName?.toLowerCase() || '';

        return !!(
          (currentUserId && principalId === String(currentUserId)) ||
          (currentUserLoginName && principalLogin === currentUserLoginName) ||
          (currentUserValue && principalLogin === currentUserValue) ||
          (currentUserEmail && (principalEmail === currentUserEmail || principalUpn === currentUserEmail))
        );
      };

      // Process principals from GetSharingInformation response
      const principals = sharingInfo.permissionsInformation?.principals?.results || [];

      for (const principalInfo of principals) {
        const { principal, role, isInherited } = principalInfo;

        if (!principal) {
          continue;
        }

        // PrincipalType: 1=User, 8=SecurityGroup
        const isGroup = principal.principalType === 8;
        const hasEditRole = role === 3 || role === 9; // 3=FullControl, 9=Edit

        // Check if this is the current user directly
        if (!isGroup && isCurrentUser(principal)) {
          if (hasEditRole) {
            currentUserCanManage = true;
          }
        }

        // Track groups with edit access for membership check
        if (isGroup && hasEditRole) {
          groupsWithEditAccess.push(principal.id);
        }

        // Skip if already processed
        const principalKey = `${principal.id}`;
        if (processedPrincipals.has(principalKey)) {
          continue;
        }

        // Convert role number to permission level
        const permissionLevel = roleToPermissionLevel(role);
        const canBeRemoved = !protectedPrincipals?.includes(principal.id.toString());

        const permissionPrincipal: IPermissionPrincipal = {
          id: principal.id.toString(),
          displayName: principal.name,
          email: principal.email || undefined,
          loginName: principal.loginName,
          permissionLevel,
          isGroup,
          principalType: principal.principalType,
          canBeRemoved,
          userPrincipalName: principal.userPrincipalName || undefined,
          normalizedEmail: principal.email ? principal.email.toLowerCase().trim() : undefined,
          isValidForPersona: !!(principal.email || principal.userPrincipalName),
          inheritedFrom: isInherited ? 'Inherited' : undefined,
        };

        permissionsList.push(permissionPrincipal);
        processedPrincipals.add(principalKey);
      }

      const sharingLinks = sharingInfo.permissionsInformation?.links?.results || [];
      sharingLinks.forEach((sharingLink, index) => {
        const linkDetails = sharingLink.linkDetails;
        if (!linkDetails) {
          return;
        }

        const presentation = getSharingLinkPresentation(linkDetails);
        if (!presentation) {
          return;
        }

        const linkUrl = linkDetails.Url || linkDetails.ShareLinkUrl || '';
        const canEdit = !!linkDetails.IsEditLink;
        const linkKey = `link_${presentation.type}_${canEdit ? 'edit' : 'view'}`;
        if (processedPrincipals.has(linkKey)) {
          return;
        }

        const linkMembers = sharingLink.linkMembers?.results || [];

        permissionsList.push({
          id: linkKey,
          displayName: presentation.label,
          permissionLevel: canEdit ? 'edit' : 'view',
          isGroup: false,
          canBeRemoved: false,
          isSharingLink: true,
          sharingLinkType: presentation.type,
          sharingLinkKind: linkDetails.LinkKind,
          sharingLinkUrl: linkUrl || undefined,
          sharingLinkMembersCount: linkMembers.length,
          sharingLinkIconName: presentation.iconName,
        });
        processedPrincipals.add(linkKey);
      });

      // If user doesn't have direct edit access, check if they're in a group with edit access
      if (!currentUserCanManage && groupsWithEditAccess.length > 0 && currentUserId) {
        try {
          // Get current user's group memberships
          const userGroups = await SPContext.sp.web.siteUsers.getById(Number(currentUserId)).groups();
          const userGroupIds = new Set(userGroups.map((g: { Id: number }) => g.Id));

          // Check if user is member of any group with edit access
          currentUserCanManage = groupsWithEditAccess.some(groupId => userGroupIds.has(groupId));
        } catch (groupError) {
          // If we can't get groups, fall back to no manage permissions
          SPContext.logger.warn('ManageAccess: Could not check group membership', groupError);
        }
      }

      if (!currentUserCanManage) {
        const siteAdmins = sharingInfo.permissionsInformation?.siteAdmins?.results || [];
        currentUserCanManage = siteAdmins.some((siteAdmin: any) =>
          isCurrentUser({
            id: siteAdmin?.id ?? siteAdmin?.Id,
            loginName: siteAdmin?.loginName ?? siteAdmin?.LoginName,
            email: siteAdmin?.email ?? siteAdmin?.Email,
            userPrincipalName: siteAdmin?.userPrincipalName ?? siteAdmin?.UserPrincipalName,
          })
        );
      }

      SPContext.logger.info('ManageAccess permissions loaded', {
        totalCount: permissionsList.length,
        groups: permissionsList.filter(p => p.isGroup).length,
        canManage: currentUserCanManage,
      });

      return { permissions: permissionsList, canManage: currentUserCanManage };
    } catch (error) {
      SPContext.logger.error('ManageAccess failed to get permissions', error);
      throw error;
    }
  }, [
    itemId,
    listId,
    protectedPrincipals,
  ]);

  const filterAndProcessPermissions = React.useCallback(
    async (permissionsList: IPermissionPrincipal[]): Promise<IPermissionPrincipal[]> => {
      const processedPermissions = permissionsList.map(permission => {
        if (!permission.isGroup && !permission.isValidForPersona) {
          const normalizedUpn = PersonaUtils.normalizeUpn(permission);
          return {
            ...permission,
            normalizedEmail: normalizedUpn,
            isValidForPersona: PersonaUtils.canUsePersona(permission),
          };
        }
        return permission;
      });

      return processedPermissions.sort((a, b) => {
        if (a.isGroup !== b.isGroup) {
          return a.isGroup ? 1 : -1;
        }

        if (!a.isGroup && !b.isGroup) {
          if (!a.inheritedFrom && b.inheritedFrom) return -1;
          if (a.inheritedFrom && !b.inheritedFrom) return 1;
        }

        return a.displayName.localeCompare(b.displayName);
      });
    },
    []
  );

  // NOTE: getCurrentUserPermissions and checkManagePermissions were removed.
  // We now determine canManage directly from the GetSharingInformation response
  // to avoid making additional EffectiveBasePermissions API calls.

  const loadPermissions = React.useCallback(async (): Promise<void> => {
    // Guard: Skip if already loading
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setIsLoading(true);

      await SPContext.performance.track('ManageAccess.loadPermissions', async () => {
        // GetSharingInformation returns both permissions and canManage in one call
        // No need for separate EffectiveBasePermissions API call
        const result = await getEnhancedItemPermissions();

        setPermissions(await filterAndProcessPermissions(result.permissions));
        setCanManagePermissions(result.canManage);
        setIsLoading(false);
        hasLoadedRef.current = true;
      });
    } catch (error) {
      SPContext.logger.error('ManageAccess failed to load permissions', error, {
        itemId,
        listId,
      });
      onError?.(error instanceof Error ? error.message : 'Failed to load permissions');
      setIsLoading(false);
    } finally {
      loadingRef.current = false;
    }
  }, [
    itemId,
    listId,
    getEnhancedItemPermissions,
    filterAndProcessPermissions,
    onError,
  ]);

  // Load permissions once when component mounts or itemId/listId changes
  React.useEffect(() => {
    // Reset load state when item changes
    hasLoadedRef.current = false;
    loadingRef.current = false;
    loadPermissions();
  }, [loadPermissions]);

  const showInlineMessageHandler = React.useCallback((message: string): void => {
    setInlineMessage(message);
    setShowInlineMessage(true);

    if (inlineMessageTimeoutRef.current) {
      clearTimeout(inlineMessageTimeoutRef.current);
    }

    inlineMessageTimeoutRef.current = window.setTimeout(() => {
      setShowInlineMessage(false);
      setInlineMessage('');
    }, 4000);
  }, []);

  const ensureUsers = React.useCallback(
    async (users: any[]): Promise<any[]> => {
      const validatedUsers: any[] = [];
      const existingUsers: string[] = [];
      const failedUsers: string[] = [];

      for (const user of users) {
        try {
          if (user.principalType === 8) {
            const hasExistingGroup = permissions.some(
              p =>
                p.isGroup &&
                (p.id === String(user.id ?? user.ID) ||
                  p.displayName.toLowerCase() === String(user.text || user.displayName || '').toLowerCase())
            );

            if (hasExistingGroup) {
              existingUsers.push(user.text || user.displayName);
            } else {
              validatedUsers.push({
                ...user,
                id: String(user.id ?? user.ID ?? ''),
                loginName: user.loginName || user.LoginName,
              });
            }
            continue;
          }

          const ensuredUser = await SPContext.sp.web.ensureUser(user.loginName || user.email);

          const hasExisting = permissions.some(
            p =>
              p.id === ensuredUser.data.Id.toString() ||
              (user.email && p.email && p.email.toLowerCase() === user.email.toLowerCase())
          );

          if (hasExisting) {
            existingUsers.push(user.text || user.displayName);
          } else {
            validatedUsers.push({
              ...user,
              id: ensuredUser.data.Id.toString(),
              loginName: ensuredUser.data.LoginName,
            });
          }
        } catch (error) {
          const userName = user.text || user.displayName || user.email || user.loginName || 'Unknown user';
          failedUsers.push(userName);
          SPContext.logger.error('ManageAccess failed to ensure user', error, {
            user: user.email || user.loginName,
          });
        }
      }

      const messages: string[] = [];
      if (existingUsers.length > 0) {
        messages.push(
          `${existingUsers.join(', ')} already ${
            existingUsers.length === 1 ? 'has' : 'have'
          } access to this item.`
        );
      }
      if (failedUsers.length > 0) {
        messages.push(
          `Could not validate: ${failedUsers.join(', ')}.`
        );
      }
      if (messages.length > 0) {
        showInlineMessageHandler(messages.join(' '));
      }

      return validatedUsers;
    },
    [permissions, showInlineMessageHandler]
  );

  const handleGrantAccess = React.useCallback(
    async (users: any[], permissionLevel: 'view' | 'edit'): Promise<void> => {
      if (users.length === 0) return;

      const principals: IPermissionPrincipal[] = users.map(user => ({
        id: user.id,
        displayName: user.text || user.displayName,
        email: user.email,
        loginName: user.loginName,
        permissionLevel,
        isGroup: user.principalType === 8,
        principalType: user.principalType,
        canBeRemoved: true,
      }));

      try {
        const success = await onPermissionChanged('add', principals);

        if (success) {
          invalidateSharingInfoCache(listId, itemId);
          await loadPermissions();
        }
      } catch (error) {
        SPContext.logger.error('ManageAccess failed to grant access', error);
        showInlineMessageHandler('Failed to grant access. Please try again.');
        throw error;
      }
    },
    [onPermissionChanged, loadPermissions, listId, itemId, showInlineMessageHandler]
  );

  const handleRemovePermission = React.useCallback(
    async (principal: IPermissionPrincipal): Promise<void> => {
      try {
        const success = await onPermissionChanged('remove', [principal]);

        if (success) {
          invalidateSharingInfoCache(listId, itemId);
          await loadPermissions();
        }
      } catch (error) {
        SPContext.logger.error('ManageAccess failed to remove permission', error);
        showInlineMessageHandler('Failed to remove access. Please try again.');
        throw error;
      }
    },
    [onPermissionChanged, loadPermissions, listId, itemId, showInlineMessageHandler]
  );

  const renderPermissionAvatar = React.useCallback(
    (permission: IPermissionPrincipal, index: number): React.ReactElement => {
      if (permission.isSharingLink) {
        return (
          <div key={`link-${index}`} className='manage-access-avatar-container'>
            <div className='manage-access-sharing-link-avatar' title={permission.displayName}>
              <Icon iconName={permission.sharingLinkIconName || 'Link'} />
            </div>
          </div>
        );
      }

      if (permission.isGroup) {
        return (
          <div key={`group-${index}`} className='manage-access-avatar-container'>
            <GroupViewer
              groupId={parseInt(permission.id, 10)}
              groupName={permission.displayName}
              displayMode='icon'
              size={32}
              bustCache={true}
            />
          </div>
        );
      }

      // User avatar with UserPersona component
      const userIdentifier =
        permission.loginName || permission.email || permission.userPrincipalName || permission.id;

      return (
        <div key={`user-${index}`} className='manage-access-avatar-container'>
          <UserPersona
            userIdentifier={userIdentifier}
            displayName={permission.displayName}
            email={permission.email}
            size={32}
            displayMode='avatar'
            showLivePersona={true}
            title={`${permission.displayName}${
              permission.inheritedFrom ? ` (${permission.inheritedFrom})` : ''
            } - ${permission.permissionLevel === 'edit' ? 'Can edit' : 'Can view'}`}
          />
        </div>
      );
    },
    []
  );

  const renderPermissionIndicator = (): React.ReactElement => {
    const iconName = canManagePermissions ? 'Edit' : 'View';
    const tooltip = canManagePermissions ? 'You can edit' : 'You can view';

    return (
      <TooltipHost content={tooltip}>
        <div className='manage-access-permission-indicator' tabIndex={0} aria-label={tooltip}>
          <Icon iconName={iconName} />
        </div>
      </TooltipHost>
    );
  };

  if (isLoading) {
    return (
      <div className='manage-access-loading'>
        <Spinner size={SpinnerSize.small} />
      </div>
    );
  }

  const visiblePermissions = permissions.slice(0, maxAvatars);
  const remainingCount = Math.max(0, permissions.length - maxAvatars);
  const linkText = canManagePermissions ? 'Manage access' : 'See all access';

  return (
    <div className='manage-access-component'>
      <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
        {renderPermissionIndicator()}
        {visiblePermissions.map((permission, index) => renderPermissionAvatar(permission, index))}
        {remainingCount > 0 && (
          <div
            className='manage-access-remaining'
            role='button'
            tabIndex={0}
            aria-label={`${remainingCount} more people have access. Click to see all.`}
            onClick={() => setShowManageAccessPanel(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowManageAccessPanel(true);
              }
            }}
          >
            <Text variant='small'>+{remainingCount}</Text>
          </div>
        )}
        {enabled && (
          <Link onClick={() => setShowManageAccessPanel(true)} className='manage-access-link'>
            {linkText}
          </Link>
        )}
      </Stack>

      <ManageAccessPanel
        isOpen={showManageAccessPanel}
        permissions={permissions}
        canManagePermissions={canManagePermissions}
        enabled={enabled ?? DefaultProps.enabled} // NEW PROP
        permissionTypes={permissionTypes || 'view'}
        showActivityFeed={false}
        inlineMessage={inlineMessage}
        showInlineMessage={showInlineMessage}
        onDismiss={() => setShowManageAccessPanel(false)}
        onRemovePermission={handleRemovePermission}
        onGrantAccess={handleGrantAccess}
        onShowActivityFeed={() => {}}
        onHideActivityFeed={() => {}}
        onEnsureUsers={ensureUsers}
      />
    </div>
  );
};
