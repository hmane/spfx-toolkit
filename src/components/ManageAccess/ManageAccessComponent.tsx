import * as React from 'react';
import { Spinner, SpinnerSize, Icon, Link, TooltipHost, Stack, Text } from '@fluentui/react';
import { LivePersona } from '@pnp/spfx-controls-react/lib/LivePersona';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/security';
import '@pnp/sp/site-users';
import '@pnp/sp/site-groups';
import '@pnp/sp/sharing';
import { createPermissionHelper } from '../../utilities/permissionHelper';
import {
  IManageAccessComponentProps,
  IManageAccessComponentState,
  IPermissionPrincipal,
  DefaultProps,
  SPFxContext,
} from './types';
import { ManageAccessPanel } from './ManageAccessPanel';
import { GroupViewer } from '../GroupViewer';
import './ManageAccessComponent.css';

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

  // Enhanced permission loading with proper filtering and expansion
  private loadPermissions = async (): Promise<void> => {
    try {
      this.setState({ isLoading: true });

      const [permissions, currentUserPermissions] = await Promise.all([
        this.getEnhancedItemPermissions(),
        this.getCurrentUserPermissions()
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

  // Enhanced permission retrieval with smart Limited Access handling
  private getEnhancedItemPermissions = async (): Promise<IPermissionPrincipal[]> => {
    try {
      const item = this.sp.web.lists
        .getById(this.props.listId)
        .items.getById(this.props.itemId);

      // Get role assignments
      const roleAssignments = await item.roleAssignments.expand('RoleDefinitionBindings', 'Member')();

      const permissions: IPermissionPrincipal[] = [];
      const processedUsers = new Set<string>(); // Track processed users to avoid duplicates

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

        // Handle Limited Access groups - extract the actual shared users with correct permissions
        if (isLimitedAccess && member.PrincipalType === 8) {
          try {
            const sharedUsers = await this.extractSharedUsersFromLimitedAccessGroup(
              member.Id,
              roleDefinitions // Pass the role definitions to get correct permissions
            );

            // Add unique shared users
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

      return permissions;
    } catch (error) {
      console.error('Error getting enhanced item permissions:', error);
      throw error;
    }
  };

  // Get sharing information for better permission detection
  private getSharingInfo = async (): Promise<any> => {
    try {
      const item = this.sp.web.lists
        .getById(this.props.listId)
        .items.getById(this.props.itemId);

      return await item.getSharingInformation();
    } catch (error) {
      console.warn('Could not get sharing information:', error);
      return null;
    }
  };

  // Extract actual shared users from Limited Access groups with correct permissions
  private extractSharedUsersFromLimitedAccessGroup = async (
    groupId: number,
    parentRoleDefinitions: any[] // Use parent group's role definitions for correct permissions
  ): Promise<IPermissionPrincipal[]> => {
    try {
      const group = this.sp.web.siteGroups.getById(groupId);
      const users = await group.users();

      // Get the permission level from the parent group's role definitions
      const groupPermissionLevel = this.getPermissionLevelFromRoles(parentRoleDefinitions);

      console.log(`Limited Access Group ${groupId} permission level: ${groupPermissionLevel}`);
      console.log(`Limited Access Group ${groupId} role definitions:`, parentRoleDefinitions.map(r => r.Name));

      const sharedUsers: IPermissionPrincipal[] = [];

      for (const user of users) {
        // Skip system accounts
        if (this.isSystemAccount(user)) {
          console.log(`Skipping system account: ${user.Title}`);
          continue;
        }

        // These are real users shared via sharing links - use the parent group's permission level
        sharedUsers.push({
          id: user.Id.toString(),
          displayName: user.Title,
          email: user.Email || '',
          loginName: user.LoginName,
          permissionLevel: groupPermissionLevel, // Use the actual permission level from the group
          isGroup: false,
          principalType: user.PrincipalType,
          canBeRemoved: true,
          isSharingLink: true,
          sharingLinkType: 'specific',
          inheritedFrom: 'Shared link',
        });
      }

      console.log(`Limited Access Group ${groupId} extracted users:`,
        sharedUsers.map(u => `${u.displayName} (${u.permissionLevel})`));
      return sharedUsers;
    } catch (error) {
      console.warn('Error extracting shared users:', error);
      return [];
    }
  };

  // Get correct permission level for sharing links
  private getSharingLinkPermissionLevel = (technicalName: string, sharingInfo: any): 'view' | 'edit' => {
    // Check technical name first
    if (technicalName.includes('.Edit.') || technicalName.includes('Edit')) {
      return 'edit';
    }

    // Check sharing info if available
    if (sharingInfo && sharingInfo.sharingLinks) {
      const editLink = sharingInfo.sharingLinks.find((link: any) =>
        link.linkKind === 2 || link.description?.toLowerCase().includes('edit')
      );
      if (editLink) {
        return 'edit';
      }
    }

    return 'view';
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

    return systemPatterns.some(pattern =>
      title.includes(pattern.toLowerCase()) ||
      loginName.includes(pattern.toLowerCase())
    );
  };

  // Check if a principal is a Limited Access group
  private isLimitedAccessGroup = (member: any, roleDefinitions: any[]): boolean => {
    // Check for Limited Access role definition
    const hasLimitedAccess = roleDefinitions.some(role =>
      role.Name.toLowerCase().includes('limited access') ||
      role.Id === 1073741825 // Standard Limited Access role ID
    );

    return hasLimitedAccess;
  };

  // Check if a principal is a sharing link
  private isSharingLinkPrincipal = (member: any): boolean => {
    return member.Title && (
      member.Title.includes('SharingLinks.') ||
      member.Title.includes('.OrganizationEdit.') ||
      member.Title.includes('.OrganizationView.') ||
      member.Title.includes('.AnonymousEdit.') ||
      member.Title.includes('.AnonymousView.')
    );
  };

  // Get user-friendly sharing link display name
  private getSharingLinkDisplayName = (technicalName: string, sharingInfo: any): string => {
    if (technicalName.includes('.OrganizationEdit.')) {
      return 'People in your organization can edit';
    }
    if (technicalName.includes('.OrganizationView.')) {
      return 'People in your organization can view';
    }
    if (technicalName.includes('.AnonymousEdit.')) {
      return 'Anyone with the link can edit';
    }
    if (technicalName.includes('.AnonymousView.')) {
      return 'Anyone with the link can view';
    }
    return 'Shared link';
  };

  // Determine sharing link type from technical name
  private getSharingLinkType = (technicalName: string): 'anonymous' | 'organization' | 'specific' => {
    if (technicalName.includes('.Anonymous')) return 'anonymous';
    if (technicalName.includes('.Organization')) return 'organization';
    return 'specific';
  };

  // Filter and process permissions - Groups first, then users
  private filterAndProcessPermissions = async (permissions: IPermissionPrincipal[]): Promise<IPermissionPrincipal[]> => {
    // Sort: Groups first, then users, then sharing links
    return permissions.sort((a, b) => {
      // Groups first
      if (a.isGroup && !b.isGroup) return -1;
      if (!a.isGroup && b.isGroup) return 1;

      // Among non-groups: regular users first, then shared users, then sharing links
      if (!a.isGroup && !b.isGroup) {
        // Regular users first (no inheritedFrom)
        if (!a.inheritedFrom && a.inheritedFrom) return -1;
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

  // Enhanced render for different permission types
  private renderPermissionAvatar = (permission: IPermissionPrincipal, index: number): React.ReactElement => {
    // Sharing link avatar
    if (permission.isSharingLink && permission.isGroup !== false) {
      const iconName = permission.sharingLinkType === 'anonymous' ? 'Link' :
                     permission.sharingLinkType === 'organization' ? 'People' : 'Contact';

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

    // User avatar (using LivePersona directly for better hover experience)
    return (
      <div key={`user-${index}`} className='manage-access-avatar-container'>
        <TooltipHost
          content={`${permission.displayName}${permission.inheritedFrom ? ` (${permission.inheritedFrom})` : ''} - ${
            permission.permissionLevel === 'edit' ? 'Can edit' : 'Can view'
          }`}
        >
          <div className='manage-access-live-persona'>
            <LivePersona
              upn={permission.email || permission.displayName}
              disableHover={false}
              serviceScope={this.props.spContext.serviceScope}
            />
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
