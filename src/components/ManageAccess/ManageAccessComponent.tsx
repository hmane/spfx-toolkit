import { Icon } from '@fluentui/react/lib/Icon';
import { Link } from '@fluentui/react/lib/Link';
import { PersonaInitialsColor } from '@fluentui/react/lib/Persona';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { SPContext } from '../../utilities/context';
import { createPermissionHelper } from '../../utilities/permissionHelper';
import { GroupViewer } from '../GroupViewer';
import { UserPersona } from '../UserPersona';
import './ManageAccessComponent.css';
import { ManageAccessPanel } from './ManageAccessPanel';
import {
  DefaultProps,
  IManageAccessComponentProps,
  IPermissionPrincipal,
  ISPSharingInfo,
  PersonaUtils,
  ROLE_DEFINITION_IDS,
} from './types';

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
  const [currentUserPermissions, setCurrentUserPermissions] = React.useState<string[]>([]);
  const [canManagePermissions, setCanManagePermissions] = React.useState(false);
  const [inlineMessage, setInlineMessage] = React.useState('');
  const [showInlineMessage, setShowInlineMessage] = React.useState(false);

  const inlineMessageTimeoutRef = React.useRef<number | null>(null);
  const permissionHelperRef = React.useRef(createPermissionHelper(SPContext.sp));
  // R-4: Request deduplication - track ongoing requests to prevent race conditions
  const loadRequestIdRef = React.useRef<number>(0);

  React.useEffect(() => {
    return () => {
      if (inlineMessageTimeoutRef.current) {
        clearTimeout(inlineMessageTimeoutRef.current);
      }
    };
  }, []);

  const isSystemAccount = React.useCallback((user: any): boolean => {
    if (!user.Title && !user.LoginName) return false;

    const systemPatterns = [
      'System Account',
      'SharePoint App',
      'SHAREPOINT\\system',
      'app@sharepoint',
      'NT AUTHORITY',
    ];

    const title = (user.Title || '').toLowerCase();
    const loginName = (user.LoginName || '').toLowerCase();

    return systemPatterns.some(
      pattern => title.includes(pattern.toLowerCase()) || loginName.includes(pattern.toLowerCase())
    );
  }, []);

  const isLimitedAccessGroup = React.useCallback((member: any, roleDefinitions: any[]): boolean => {
    return roleDefinitions.some(
      role =>
        role.Name.toLowerCase().includes('limited access') ||
        role.Id === ROLE_DEFINITION_IDS.LIMITED_ACCESS
    );
  }, []);

  const isSharingLinkPrincipal = React.useCallback((member: any): boolean => {
    return (
      member.Title &&
      (member.Title.includes('SharingLinks.') ||
        member.Title.includes('.OrganizationEdit.') ||
        member.Title.includes('.OrganizationView.') ||
        member.Title.includes('.AnonymousEdit.') ||
        member.Title.includes('.AnonymousView.'))
    );
  }, []);

  const getPermissionLevelFromRoles = React.useCallback(
    (roleDefinitions: any[]): 'view' | 'edit' => {
      const hasEdit = roleDefinitions.some(
        role =>
          role.Name === 'Full Control' ||
          role.Name === 'Edit' ||
          role.Name === 'Contribute' ||
          role.Name === 'Design'
      );

      return hasEdit ? 'edit' : 'view';
    },
    []
  );

  const getPermissionLevelFromRoleDefinitions = React.useCallback(
    async (groupId: number, roleDefinitions: any[]): Promise<'view' | 'edit'> => {
      try {
        const hasEditPermission = roleDefinitions.some(
          (role: any) =>
            role.Name === 'Full Control' ||
            role.Name === 'Design' ||
            role.Name === 'Edit' ||
            role.Name === 'Contribute' ||
            role.Id === ROLE_DEFINITION_IDS.FULL_CONTROL ||
            role.Id === ROLE_DEFINITION_IDS.DESIGN ||
            role.Id === ROLE_DEFINITION_IDS.EDIT ||
            role.Id === ROLE_DEFINITION_IDS.CONTRIBUTE
        );

        if (hasEditPermission) {
          SPContext.logger.info('ManageAccess detected edit permission', {
            groupId,
            roles: roleDefinitions.map((r: any) => r.Name),
          });
          return 'edit';
        }

        SPContext.logger.info('ManageAccess detected view permission', {
          groupId,
          roles: roleDefinitions.map((r: any) => r.Name),
        });
        return 'view';
      } catch (error) {
        SPContext.logger.warn('ManageAccess failed to determine permission level', {
          error,
          groupId,
        });
        return 'view';
      }
    },
    []
  );

  const getSharingInformation = React.useCallback(async (): Promise<ISPSharingInfo | null> => {
    try {
      const item = SPContext.sp.web.lists.getById(listId).items.getById(itemId);
      const sharingInfo = await item.getSharingInformation();
      return sharingInfo;
    } catch (error) {
      SPContext.logger.warn('ManageAccess could not get sharing information', error);
      return null;
    }
  }, [itemId, listId]);

  const extractSharedUsersFromLimitedAccessGroup = React.useCallback(
    async (
      groupId: number,
      actualPermissionLevel: 'view' | 'edit'
    ): Promise<IPermissionPrincipal[]> => {
      try {
        const group = SPContext.sp.web.siteGroups.getById(groupId);
        const users = await group.users.select(
          'Id',
          'Title',
          'Email',
          'LoginName',
          'PrincipalType',
          'UserPrincipalName'
        )();

        const sharedUsers: IPermissionPrincipal[] = [];

        for (const user of users) {
          if (isSystemAccount(user)) continue;

          const principal: IPermissionPrincipal = {
            id: user.Id.toString(),
            displayName: user.Title,
            email: user.Email || '',
            loginName: user.LoginName,
            permissionLevel: actualPermissionLevel,
            isGroup: false,
            principalType: user.PrincipalType,
            canBeRemoved: true,
            isSharingLink: true,
            inheritedFrom: 'Shared',
            userPrincipalName: user.UserPrincipalName,
            normalizedEmail: user.Email ? user.Email.toLowerCase().trim() : undefined,
            isValidForPersona: !!(user.Email || user.UserPrincipalName),
          };

          sharedUsers.push(principal);
        }

        SPContext.logger.info('ManageAccess extracted shared users', {
          groupId,
          count: sharedUsers.length,
          permissionLevel: actualPermissionLevel,
        });

        return sharedUsers;
      } catch (error) {
        SPContext.logger.warn('ManageAccess failed to extract shared users', { error, groupId });
        return [];
      }
    },
    [isSystemAccount]
  );

  const getEnhancedItemPermissions = React.useCallback(async (): Promise<
    IPermissionPrincipal[]
  > => {
    try {
      const item = SPContext.sp.web.lists.getById(listId).items.getById(itemId);

      const roleAssignments = await item.roleAssignments.expand(
        'RoleDefinitionBindings',
        'Member'
      )();

      const permissionsList: IPermissionPrincipal[] = [];
      const processedUsers = new Set<string>();

      const sharingLinkGroups: Array<{ id: number; permissionLevel: 'view' | 'edit' }> = [];

      // STEP 1: Identify sharing link groups and regular groups
      for (const assignment of roleAssignments) {
        const assignmentData = assignment as any;
        const member = assignmentData.Member;
        const roleDefinitions = assignmentData.RoleDefinitionBindings;

        if (!member || !roleDefinitions) continue;

        // Check if this is a sharing link group
        if (isSharingLinkPrincipal(member)) {
          // Determine permission level from role definitions
          const permissionLevel = getPermissionLevelFromRoles(roleDefinitions);

          sharingLinkGroups.push({
            id: member.Id,
            permissionLevel,
          });

          SPContext.logger.info('ManageAccess found sharing link group', {
            id: member.Id,
            title: member.Title,
            permissionLevel,
          });
          continue;
        }

        // Skip Limited Access groups
        if (isLimitedAccessGroup(member, roleDefinitions)) {
          continue;
        }

        // Regular groups and users
        const permissionLevel = getPermissionLevelFromRoles(roleDefinitions);
        const canBeRemoved = !protectedPrincipals?.includes(member.Id.toString());

        const principal: IPermissionPrincipal = {
          id: member.Id.toString(),
          displayName: member.Title,
          email: member.Email || '',
          loginName: member.LoginName,
          permissionLevel,
          isGroup: member.PrincipalType === 8,
          principalType: member.PrincipalType,
          canBeRemoved,
          userPrincipalName: member.UserPrincipalName,
          normalizedEmail: member.Email ? member.Email.toLowerCase().trim() : undefined,
          isValidForPersona: !!(member.Email || member.UserPrincipalName),
        };

        if (member.PrincipalType === 8) {
          permissionsList.push(principal);
        } else if (!isSystemAccount(member)) {
          const userKey = `${member.Email || member.LoginName || member.Id}`;
          if (!processedUsers.has(userKey)) {
            permissionsList.push(principal);
            processedUsers.add(userKey);
          }
        }
      }

      // STEP 2: Get members from sharing link groups
      if (sharingLinkGroups.length > 0) {
        SPContext.logger.info('ManageAccess processing sharing link groups', {
          count: sharingLinkGroups.length,
        });

        const sharedUsersArrays = await Promise.all(
          sharingLinkGroups.map(async group => {
            try {
              const groupObj = SPContext.sp.web.siteGroups.getById(group.id);
              const users = await groupObj.users.select(
                'Id',
                'Title',
                'Email',
                'LoginName',
                'PrincipalType',
                'UserPrincipalName'
              )();

              const sharedUsers: IPermissionPrincipal[] = [];

              for (const user of users) {
                if (isSystemAccount(user)) continue;

                const userKey = `${user.Email || user.LoginName || user.Id}`;
                if (processedUsers.has(userKey)) continue;

                const principal: IPermissionPrincipal = {
                  id: user.Id.toString(),
                  displayName: user.Title,
                  email: user.Email || '',
                  loginName: user.LoginName,
                  permissionLevel: group.permissionLevel,
                  isGroup: false,
                  principalType: user.PrincipalType,
                  canBeRemoved: true,
                  isSharingLink: true,
                  inheritedFrom: 'Shared',
                  userPrincipalName: user.UserPrincipalName,
                  normalizedEmail: user.Email ? user.Email.toLowerCase().trim() : undefined,
                  isValidForPersona: !!(user.Email || user.UserPrincipalName),
                };

                sharedUsers.push(principal);
                processedUsers.add(userKey);
              }

              SPContext.logger.info('ManageAccess extracted users from sharing link', {
                groupId: group.id,
                userCount: sharedUsers.length,
                permissionLevel: group.permissionLevel,
              });

              return sharedUsers;
            } catch (error) {
              SPContext.logger.warn('ManageAccess failed to get sharing link members', {
                error,
                groupId: group.id,
              });
              return [];
            }
          })
        );

        const allSharedUsers = sharedUsersArrays.flat();
        permissionsList.push(...allSharedUsers);
      }

      SPContext.logger.info('ManageAccess final permissions', {
        totalCount: permissionsList.length,
        directUsers: permissionsList.filter(p => !p.isGroup && !p.inheritedFrom).length,
        groups: permissionsList.filter(p => p.isGroup).length,
        sharedUsers: permissionsList.filter(p => p.inheritedFrom).length,
      });

      return permissionsList;
    } catch (error) {
      SPContext.logger.error('ManageAccess failed to get permissions', error);
      throw error;
    }
  }, [
    itemId,
    listId,
    protectedPrincipals,
    isLimitedAccessGroup,
    isSharingLinkPrincipal,
    getPermissionLevelFromRoles,
    isSystemAccount,
  ]);

  const filterAndProcessPermissions = React.useCallback(
    async (permissionsList: IPermissionPrincipal[]): Promise<IPermissionPrincipal[]> => {
      const processedPermissions = permissionsList.map(permission => {
        if (!permission.isGroup && !permission.isValidForPersona) {
          const normalizedUpn = PersonaUtils.normalizeUpn(permission);
          permission.normalizedEmail = normalizedUpn;
          permission.isValidForPersona = PersonaUtils.canUsePersona(permission);
        }
        return permission;
      });

      return processedPermissions.sort((a, b) => {
        if (a.isGroup && !b.isGroup) return -1;
        if (!a.isGroup && b.isGroup) return 1;

        if (!a.isGroup && !b.isGroup) {
          if (!a.inheritedFrom && b.inheritedFrom) return -1;
          if (a.inheritedFrom && !b.inheritedFrom) return 1;
        }

        return a.displayName.localeCompare(b.displayName);
      });
    },
    []
  );

  const getCurrentUserPermissions = React.useCallback(async (): Promise<string[]> => {
    try {
      const userPerms = await permissionHelperRef.current.getCurrentUserPermissions();
      return userPerms.permissionLevels || [];
    } catch (error) {
      SPContext.logger.error('ManageAccess failed to get current user permissions', error);
      return [];
    }
  }, []);

  const checkManagePermissions = React.useCallback((perms: string[]): boolean => {
    const hasEditPermission = perms.some(
      perm =>
        perm.toLowerCase().includes('edit') ||
        perm.toLowerCase().includes('full control') ||
        perm.toLowerCase().includes('manage')
    );
    return hasEditPermission;
  }, []);

  const loadPermissions = React.useCallback(async (): Promise<void> => {
    // R-4: Request deduplication - increment request ID to invalidate stale responses
    const currentRequestId = ++loadRequestIdRef.current;

    try {
      setIsLoading(true);

      await SPContext.performance.track('ManageAccess.loadPermissions', async () => {
        const [permissionsList, userPerms] = await Promise.all([
          getEnhancedItemPermissions(),
          getCurrentUserPermissions(),
        ]);

        // R-4: Only update state if this is still the latest request
        if (currentRequestId !== loadRequestIdRef.current) {
          SPContext.logger.info('ManageAccess ignoring stale permission response', {
            requestId: currentRequestId,
            latestRequestId: loadRequestIdRef.current,
          });
          return;
        }

        const canManage = checkManagePermissions(userPerms);

        setPermissions(await filterAndProcessPermissions(permissionsList));
        setCurrentUserPermissions(userPerms);
        setCanManagePermissions(canManage);
        setIsLoading(false);

        SPContext.logger.info('ManageAccess permissions loaded', {
          permissionCount: permissionsList.length,
          canManage: canManage,
        });
      });
    } catch (error) {
      // R-4: Only update error state if this is still the latest request
      if (currentRequestId !== loadRequestIdRef.current) {
        return;
      }
      SPContext.logger.error('ManageAccess failed to load permissions', error, {
        itemId,
        listId,
      });
      onError?.(error instanceof Error ? error.message : 'Failed to load permissions');
      setIsLoading(false);
    }
  }, [
    itemId,
    listId,
    getEnhancedItemPermissions,
    getCurrentUserPermissions,
    checkManagePermissions,
    filterAndProcessPermissions,
    onError,
  ]);

  React.useEffect(() => {
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

      for (const user of users) {
        try {
          const ensuredUser = await SPContext.sp.web.ensureUser(user.loginName || user.email);

          const hasExisting = permissions.some(
            p =>
              p.id === ensuredUser.data.Id.toString() ||
              p.email?.toLowerCase() === (user.email || '').toLowerCase()
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
          SPContext.logger.error('ManageAccess failed to ensure user', error, {
            user: user.email || user.loginName,
          });
        }
      }

      if (existingUsers.length > 0) {
        showInlineMessageHandler(
          `${existingUsers.join(', ')} already ${
            existingUsers.length === 1 ? 'has' : 'have'
          } access to this item.`
        );
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

      const success = await onPermissionChanged('add', principals);

      if (success) {
        await loadPermissions();
      }
    },
    [onPermissionChanged, loadPermissions]
  );

  const handleRemovePermission = React.useCallback(
    async (principal: IPermissionPrincipal): Promise<void> => {
      const success = await onPermissionChanged('remove', [principal]);

      if (success) {
        await loadPermissions();
      }
    },
    [onPermissionChanged, loadPermissions]
  );

  const getPersonaColor = React.useCallback((displayName: string): PersonaInitialsColor => {
    const colors = [
      PersonaInitialsColor.lightBlue,
      PersonaInitialsColor.lightGreen,
      PersonaInitialsColor.lightPink,
      PersonaInitialsColor.magenta,
      PersonaInitialsColor.orange,
      PersonaInitialsColor.teal,
      PersonaInitialsColor.violet,
      PersonaInitialsColor.warmGray,
    ];

    const hash = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }, []);

  const renderPermissionAvatar = React.useCallback(
    (permission: IPermissionPrincipal, index: number): React.ReactElement => {
      if (permission.isGroup) {
        return (
          <div key={`group-${index}`} className='manage-access-avatar-container'>
            <GroupViewer
              groupId={parseInt(permission.id)}
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
        <div className='manage-access-permission-indicator'>
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
          <div className='manage-access-remaining' onClick={() => setShowManageAccessPanel(true)}>
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
