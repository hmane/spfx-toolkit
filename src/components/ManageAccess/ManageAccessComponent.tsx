import { Icon, Link, Spinner, SpinnerSize, Stack, Text, TooltipHost } from '@fluentui/react';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/items';
import '@pnp/sp/lists';
import '@pnp/sp/security';
import '@pnp/sp/sharing';
import '@pnp/sp/site-groups';
import '@pnp/sp/site-users';
import '@pnp/sp/webs';
import { LivePersona } from '@pnp/spfx-controls-react/lib/LivePersona';
import * as React from 'react';
import { createPermissionHelper } from '../../utilities/permissionHelper';
import { GroupViewer } from '../GroupViewer';
import './ManageAccessComponent.css';
import { ManageAccessPanel } from './ManageAccessPanel';
import {
  DefaultProps,
  IManageAccessComponentProps,
  IManageAccessComponentState,
  IPermissionPrincipal,
  ISPSharingInfo,
  PersonaUtils
} from './types';

export class ManageAccessComponent extends React.Component<
  IManageAccessComponentProps,
  IManageAccessComponentState
> {
  private sp: any;
  private permissionHelper: any;
  private inlineMessageTimeout: NodeJS.Timeout | null = null;

  constructor(props: IManageAccessComponentProps) {
    super(props);

    // Initialize PnP.js with SPFx context (no caching for permissions)
    this.sp = spfi().using(SPFx(props.spContext));
    this.permissionHelper = createPermissionHelper(this.sp);

    this.state = {
      isLoading: true,
      showManageAccessPanel: false,
      showActivityFeed: false,
      permissions: [],
      currentUserPermissions: [],
      canManagePermissions: false,
      inlineMessage: '',
      showInlineMessage: false,
    };
  }

  public async componentDidMount(): Promise<void> {
    await this.loadPermissions();
  }

  public componentWillUnmount(): void {
    if (this.inlineMessageTimeout) {
      clearTimeout(this.inlineMessageTimeout);
    }
  }

  // FIXED: Enhanced permission loading with proper sharing link detection
  private loadPermissions = async (): Promise<void> => {
    try {
      this.setState({ isLoading: true });

      const [permissions, currentUserPermissions] = await Promise.all([
        this.getEnhancedItemPermissions(),
        this.getCurrentUserPermissions(),
      ]);

      const canManagePermissions = this.checkManagePermissions(currentUserPermissions);

      this.setState({
        permissions: await this.filterAndProcessPermissions(permissions),
        currentUserPermissions,
        canManagePermissions,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading permissions:', error);
      this.props.onError?.(error instanceof Error ? error.message : 'Failed to load permissions');
      this.setState({ isLoading: false });
    }
  };

  // FIXED: Enhanced permission retrieval with correct sharing link permission detection
  private getEnhancedItemPermissions = async (): Promise<IPermissionPrincipal[]> => {
    try {
      const item = this.sp.web.lists.getById(this.props.listId).items.getById(this.props.itemId);

      // Get both role assignments and sharing information in parallel
      const [roleAssignments, sharingInfo] = await Promise.all([
        item.roleAssignments.expand('RoleDefinitionBindings', 'Member')(),
        this.getSharingInformation(),
      ]);

      const permissions: IPermissionPrincipal[] = [];
      const processedUsers = new Set<string>(); // Track processed users to avoid duplicates

      console.log('ManageAccess: Retrieved sharing info:', sharingInfo);

      // Process role assignments
      for (const assignment of roleAssignments) {
        const assignmentData = assignment as any;
        const member = assignmentData.Member;
        const roleDefinitions = assignmentData.RoleDefinitionBindings;

        if (!member || !roleDefinitions) continue;

        const permissionLevel = this.getPermissionLevelFromRoles(roleDefinitions);
        const canBeRemoved = !this.props.protectedPrincipals?.includes(member.Id.toString());

        // Check if this is a Limited Access group or sharing link
        const isLimitedAccess = this.isLimitedAccessGroup(member, roleDefinitions);
        const isSharingLink = this.isSharingLinkPrincipal(member);

        console.log(
          `Processing member: ${member.Title}, Limited Access: ${isLimitedAccess}, Sharing Link: ${isSharingLink}`
        );

        // FIXED: Handle Limited Access groups - extract the actual shared users with CORRECT permission level
        if (isLimitedAccess && member.PrincipalType === 8) {
          try {
            // Get the ACTUAL permission level from sharing information
            const actualPermissionLevel = this.getActualSharingPermissionLevel(member, sharingInfo);
            console.log(
              `Limited Access Group ${member.Title} actual permission: ${actualPermissionLevel}`
            );

            const sharedUsers = await this.extractSharedUsersFromLimitedAccessGroup(
              member.Id,
              actualPermissionLevel
            );

            // Add unique shared users with CORRECT permission level
            for (const user of sharedUsers) {
              const userKey = `${user.email || user.loginName || user.id}`;
              if (!processedUsers.has(userKey)) {
                permissions.push(user);
                processedUsers.add(userKey);
              }
            }
          } catch (error) {
            console.warn('Could not extract shared users from Limited Access group:', error);
          }
          continue; // Skip the Limited Access group itself
        }

        // Skip organization sharing links (redundant since we show actual users)
        if (isSharingLink) {
          console.log(`Skipping sharing link: ${member.Title}`);
          continue;
        }

        // Handle regular users and groups
        const principal: IPermissionPrincipal = {
          id: member.Id.toString(),
          displayName: member.Title,
          email: member.Email || '',
          loginName: member.LoginName,
          permissionLevel,
          isGroup: member.PrincipalType === 8,
          principalType: member.PrincipalType,
          canBeRemoved,
          // Enhanced properties for LivePersona
          userPrincipalName: member.UserPrincipalName,
          normalizedEmail: member.Email ? member.Email.toLowerCase().trim() : undefined,
          isValidForPersona: !!(member.Email || member.UserPrincipalName),
        };

        // For regular groups, don't expand members (keep groups as groups)
        if (member.PrincipalType === 8) {
          permissions.push(principal);
        } else if (!this.isSystemAccount(member)) {
          // For users, check if not already processed and not a system account
          const userKey = `${member.Email || member.LoginName || member.Id}`;
          if (!processedUsers.has(userKey)) {
            permissions.push(principal);
            processedUsers.add(userKey);
          }
        }
      }

      console.log(`ManageAccess: Final results - Kept ${permissions.length} principals`);
      return permissions;
    } catch (error) {
      console.error('Error getting enhanced item permissions:', error);
      throw error;
    }
  };

  // FIXED: Get actual sharing permission level from sharing information
  private getActualSharingPermissionLevel = (
    limitedAccessGroup: any,
    sharingInfo: ISPSharingInfo | null
  ): 'view' | 'edit' => {
    try {
      if (!sharingInfo || !sharingInfo.sharingLinks) {
        console.warn('No sharing info available, defaulting to view');
        return 'view';
      }

      console.log('Analyzing sharing links for permission level:', sharingInfo.sharingLinks);

      // Look through sharing links to determine the actual permission level
      for (const link of sharingInfo.sharingLinks) {
        // Check if this is an edit link
        if (
          link.isEditLink ||
          link.roleValue === 'role:1073741827' || // Edit role
          link.description?.toLowerCase().includes('edit') ||
          (link.roleValue && link.roleValue.includes('edit'))
        ) {
          console.log('Found edit sharing link:', link);
          return 'edit';
        }
      }

      // Check for organization-wide edit links
      const hasOrgEditLink = sharingInfo.sharingLinks.some(
        link =>
          link.scope === 'organization' && (link.isEditLink || link.roleValue === 'role:1073741827')
      );

      if (hasOrgEditLink) {
        console.log('Found organization edit link');
        return 'edit';
      }

      // Default to view if no edit permissions found
      console.log('No edit sharing links found, defaulting to view');
      return 'view';
    } catch (error) {
      console.warn('Error determining sharing permission level, defaulting to view:', error);
      return 'view';
    }
  };

  // FIXED: Get sharing information with better error handling
  private getSharingInformation = async (): Promise<ISPSharingInfo | null> => {
    try {
      const item = this.sp.web.lists.getById(this.props.listId).items.getById(this.props.itemId);
      const sharingInfo = await item.getSharingInformation();

      console.log('Raw sharing information:', sharingInfo);
      return sharingInfo;
    } catch (error) {
      console.warn('Could not get sharing information:', error);
      return null;
    }
  };

  // FIXED: Extract actual shared users from Limited Access groups with CORRECT permissions
  private extractSharedUsersFromLimitedAccessGroup = async (
    groupId: number,
    actualPermissionLevel: 'view' | 'edit'
  ): Promise<IPermissionPrincipal[]> => {
    try {
      const group = this.sp.web.siteGroups.getById(groupId);
      const users = await group.users();

      console.log(
        `Extracting users from Limited Access Group ${groupId} with permission: ${actualPermissionLevel}`
      );

      const sharedUsers: IPermissionPrincipal[] = [];

      for (const user of users) {
        // Skip system accounts
        if (this.isSystemAccount(user)) {
          console.log(`Skipping system account: ${user.Title}`);
          continue;
        }

        // FIXED: Use the ACTUAL permission level determined from sharing info
        const principal: IPermissionPrincipal = {
          id: user.Id.toString(),
          displayName: user.Title,
          email: user.Email || '',
          loginName: user.LoginName,
          permissionLevel: actualPermissionLevel, // FIXED: Use correct permission level
          isGroup: false,
          principalType: user.PrincipalType,
          canBeRemoved: true,
          isSharingLink: true,
          sharingLinkType: 'specific',
          inheritedFrom: 'Shared link',
          // Enhanced properties for LivePersona
          userPrincipalName: user.UserPrincipalName,
          normalizedEmail: user.Email ? user.Email.toLowerCase().trim() : undefined,
          isValidForPersona: !!(user.Email || user.UserPrincipalName),
        };

        sharedUsers.push(principal);
      }

      console.log(
        `Limited Access Group ${groupId} extracted users:`,
        sharedUsers.map(u => `${u.displayName} (${u.permissionLevel})`)
      );
      return sharedUsers;
    } catch (error) {
      console.warn('Error extracting shared users:', error);
      return [];
    }
  };

  // Check if a user is a system account that should be filtered out
  private isSystemAccount = (user: any): boolean => {
    if (!user.Title && !user.LoginName) return false;

    const systemPatterns = [
      'System Account',
      'SharePoint App',
      'SHAREPOINT\\system',
      'app@sharepoint',
      'SYSTEM',
      'Everyone',
      'NT AUTHORITY',
    ];

    const title = (user.Title || '').toLowerCase();
    const loginName = (user.LoginName || '').toLowerCase();

    return systemPatterns.some(
      pattern => title.includes(pattern.toLowerCase()) || loginName.includes(pattern.toLowerCase())
    );
  };

  // Check if a principal is a Limited Access group
  private isLimitedAccessGroup = (member: any, roleDefinitions: any[]): boolean => {
    // Check for Limited Access role definition
    const hasLimitedAccess = roleDefinitions.some(
      role => role.Name.toLowerCase().includes('limited access') || role.Id === 1073741825
    );

    return hasLimitedAccess;
  };

  // Check if a principal is a sharing link
  private isSharingLinkPrincipal = (member: any): boolean => {
    return (
      member.Title &&
      (member.Title.includes('SharingLinks.') ||
        member.Title.includes('.OrganizationEdit.') ||
        member.Title.includes('.OrganizationView.') ||
        member.Title.includes('.AnonymousEdit.') ||
        member.Title.includes('.AnonymousView.'))
    );
  };

  // Filter and process permissions - Groups first, then users
  private filterAndProcessPermissions = async (
    permissions: IPermissionPrincipal[]
  ): Promise<IPermissionPrincipal[]> => {
    // FIXED: Enhanced processing with LivePersona preparation
    const processedPermissions = permissions.map(permission => {
      if (!permission.isGroup && !permission.isValidForPersona) {
        // Try to make user valid for LivePersona
        const normalizedUpn = PersonaUtils.normalizeUpn(permission);
        permission.normalizedEmail = normalizedUpn;
        permission.isValidForPersona = PersonaUtils.canUsePersona(permission);
      }
      return permission;
    });

    // Sort: Groups first, then users, then sharing links
    return processedPermissions.sort((a, b) => {
      // Groups first
      if (a.isGroup && !b.isGroup) return -1;
      if (!a.isGroup && b.isGroup) return 1;

      // Among non-groups: regular users first, then shared users, then sharing links
      if (!a.isGroup && !b.isGroup) {
        // Regular users first (no inheritedFrom)
        if (!a.inheritedFrom && b.inheritedFrom) return -1;
        if (a.inheritedFrom && !b.inheritedFrom) return 1;

        // Then sharing links last
        if (a.isSharingLink && !b.isSharingLink) return 1;
        if (!a.isSharingLink && b.isSharingLink) return -1;
      }

      return a.displayName.localeCompare(b.displayName);
    });
  };

  // Get current user permissions
  private getCurrentUserPermissions = async (): Promise<string[]> => {
    try {
      const userPerms = await this.permissionHelper.getCurrentUserPermissions();
      return userPerms.permissionLevels || [];
    } catch (error) {
      console.error('Error getting current user permissions:', error);
      return [];
    }
  };

  // Check if user can manage permissions
  private checkManagePermissions = (permissions: string[]): boolean => {
    const hasEditPermission = permissions.some(
      perm =>
        perm.toLowerCase().includes('edit') ||
        perm.toLowerCase().includes('full control') ||
        perm.toLowerCase().includes('manage')
    );
    return hasEditPermission;
  };

  // Get permission level from role definitions
  private getPermissionLevelFromRoles = (roleDefinitions: any[]): 'view' | 'edit' => {
    const hasEdit = roleDefinitions.some(
      role => role.Name === 'Full Control' || role.Name === 'Edit' || role.Name === 'Contribute'
    );

    return hasEdit ? 'edit' : 'view';
  };

  // Panel show/hide handlers
  private showManageAccessPanel = (): void => {
    this.setState({ showManageAccessPanel: true });
  };

  private hideManageAccessPanel = (): void => {
    this.setState({
      showManageAccessPanel: false,
      showActivityFeed: false,
    });
  };

  // Ensure users exist in site
  private ensureUsers = async (users: any[]): Promise<any[]> => {
    const validatedUsers: any[] = [];
    const existingUsers: string[] = [];

    for (const user of users) {
      try {
        const ensuredUser = await this.sp.web.ensureUser(user.loginName || user.email);

        const hasExisting = this.state.permissions.some(
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
        console.error('Error ensuring user:', error);
      }
    }

    if (existingUsers.length > 0) {
      this.showInlineMessage(
        `${existingUsers.join(', ')} already ${
          existingUsers.length === 1 ? 'has' : 'have'
        } access to this item.`
      );
    }

    return validatedUsers;
  };

  // Show inline message with auto-hide
  private showInlineMessage = (message: string): void => {
    this.setState({
      inlineMessage: message,
      showInlineMessage: true,
    });

    if (this.inlineMessageTimeout) {
      clearTimeout(this.inlineMessageTimeout);
    }

    this.inlineMessageTimeout = setTimeout(() => {
      this.setState({
        showInlineMessage: false,
        inlineMessage: '',
      });
    }, 4000);
  };

  // Grant access handler
  private onGrantAccess = async (users: any[], permissionLevel: 'view' | 'edit'): Promise<void> => {
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

    const success = await this.props.onPermissionChanged('add', principals);

    if (success) {
      await this.loadPermissions();
    }
  };

  // Remove permission handler
  private onRemovePermission = async (principal: IPermissionPrincipal): Promise<void> => {
    const success = await this.props.onPermissionChanged('remove', [principal]);

    if (success) {
      await this.loadPermissions();
    }
  };

  // Render permission indicator
  private renderPermissionIndicator = (): React.ReactElement => {
    const { canManagePermissions } = this.state;
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

  // FIXED: Enhanced render for different permission types with proper LivePersona integration
  private renderPermissionAvatar = (
    permission: IPermissionPrincipal,
    index: number
  ): React.ReactElement => {
    // Sharing link avatar
    if (permission.isSharingLink && permission.isGroup !== false) {
      const iconName =
        permission.sharingLinkType === 'anonymous'
          ? 'Link'
          : permission.sharingLinkType === 'organization'
          ? 'People'
          : 'Contact';

      return (
        <TooltipHost key={`sharing-${index}`} content={permission.displayName}>
          <div className='manage-access-sharing-link-avatar'>
            <Icon iconName={iconName} />
          </div>
        </TooltipHost>
      );
    }

    // Group avatar (using GroupViewer)
    if (permission.isGroup) {
      return (
        <div key={`group-${index}`} className='manage-access-avatar-container'>
          <GroupViewer
            spContext={this.props.spContext}
            groupId={parseInt(permission.id)}
            groupName={permission.displayName}
            displayMode='icon'
            size={32}
          />
        </div>
      );
    }

    // FIXED: User avatar with proper LivePersona integration
    const upnForPersona = PersonaUtils.normalizeUpn(permission);
    const canUsePersona = PersonaUtils.canUsePersona(permission);

    return (
      <div key={`user-${index}`} className='manage-access-avatar-container'>
        <TooltipHost
          content={`${permission.displayName}${
            permission.inheritedFrom ? ` (${permission.inheritedFrom})` : ''
          } - ${permission.permissionLevel === 'edit' ? 'Can edit' : 'Can view'}`}
        >
          <div className='manage-access-live-persona'>
            {canUsePersona ? (
              <LivePersona
                upn={upnForPersona}
                disableHover={false}
                serviceScope={this.props.spContext.serviceScope}
              />
            ) : (
              // Fallback for users without valid UPN
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#0078d4',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {PersonaUtils.getInitials(permission.displayName)}
              </div>
            )}
          </div>
        </TooltipHost>
      </div>
    );
  };

  // Render manage access panel with all fixes
  private renderManageAccessPanel = (): React.ReactElement => {
    const {
      showManageAccessPanel,
      permissions,
      canManagePermissions,
      inlineMessage,
      showInlineMessage,
    } = this.state;

    const { permissionTypes } = this.props;

    return (
      <ManageAccessPanel
        spContext={this.props.spContext}
        isOpen={showManageAccessPanel}
        permissions={permissions}
        canManagePermissions={canManagePermissions}
        permissionTypes={permissionTypes}
        showActivityFeed={false}
        inlineMessage={inlineMessage}
        showInlineMessage={showInlineMessage}
        onDismiss={this.hideManageAccessPanel}
        onRemovePermission={this.onRemovePermission}
        onGrantAccess={this.onGrantAccess}
        onShowActivityFeed={() => {}}
        onHideActivityFeed={() => {}}
        onEnsureUsers={this.ensureUsers}
      />
    );
  };

  // Main render
  public render(): React.ReactElement<IManageAccessComponentProps> {
    const { maxAvatars = DefaultProps.maxAvatars } = this.props;
    const { isLoading, permissions, canManagePermissions } = this.state;

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
          {/* Permission Level Indicator */}
          {this.renderPermissionIndicator()}

          {/* User/Group/Sharing Link Avatars */}
          {visiblePermissions.map((permission, index) =>
            this.renderPermissionAvatar(permission, index)
          )}

          {/* Remaining Count */}
          {remainingCount > 0 && (
            <div className='manage-access-remaining' onClick={this.showManageAccessPanel}>
              <Text variant='small'>+{remainingCount}</Text>
            </div>
          )}

          {/* Manage Access Link */}
          <Link onClick={this.showManageAccessPanel} className='manage-access-link'>
            {linkText}
          </Link>
        </Stack>

        {this.renderManageAccessPanel()}
      </div>
    );
  }
}
