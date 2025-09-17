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

  // Load permissions without caching
  private loadPermissions = async (): Promise<void> => {
    try {
      this.setState({ isLoading: true });

      const permissions = await this.getItemPermissions();
      const currentUserPermissions = await this.getCurrentUserPermissions();
      const canManagePermissions = this.checkManagePermissions(currentUserPermissions);

      this.setState({
        permissions,
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

  // Get item permissions
  private getItemPermissions = async (): Promise<IPermissionPrincipal[]> => {
    try {
      const roleAssignments = await this.sp.web.lists
        .getById(this.props.listId)
        .items.getById(this.props.itemId)
        .roleAssignments.expand('RoleDefinitionBindings', 'Member')();

      const permissions: IPermissionPrincipal[] = [];

      for (const assignment of roleAssignments) {
        const assignmentData = assignment as any;
        const member = assignmentData.Member;
        const roleDefinitions = assignmentData.RoleDefinitionBindings;

        if (!member || !roleDefinitions) continue;

        const permissionLevel = this.getPermissionLevelFromRoles(roleDefinitions);
        const canBeRemoved = !this.props.protectedPrincipals?.includes(member.Id.toString());

        permissions.push({
          id: member.Id.toString(),
          displayName: member.Title,
          email: member.Email || '',
          loginName: member.LoginName,
          permissionLevel,
          isGroup: member.PrincipalType === 8,
          principalType: member.PrincipalType,
          canBeRemoved,
        });
      }

      // Sort: Groups first, then users
      return permissions.sort((a, b) => {
        if (a.isGroup && !b.isGroup) return -1;
        if (!a.isGroup && b.isGroup) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
    } catch (error) {
      console.error('Error getting item permissions:', error);
      throw error;
    }
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

  private showActivityFeed = (): void => {
    this.setState({ showActivityFeed: true });
  };

  private hideActivityFeed = (): void => {
    this.setState({ showActivityFeed: false });
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

  // Render manage access panel
  private renderManageAccessPanel = (): React.ReactElement => {
    const {
      showManageAccessPanel,
      showActivityFeed,
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
        showActivityFeed={showActivityFeed}
        inlineMessage={inlineMessage}
        showInlineMessage={showInlineMessage}
        onDismiss={this.hideManageAccessPanel}
        onRemovePermission={this.onRemovePermission}
        onGrantAccess={this.onGrantAccess}
        onShowActivityFeed={this.showActivityFeed}
        onHideActivityFeed={this.hideActivityFeed}
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

          {/* User/Group Avatars */}
          {visiblePermissions.map(permission => (
            <div key={permission.id} className='manage-access-avatar-container'>
              {permission.isGroup ? (
                <GroupViewer
                  spContext={this.props.spContext}
                  groupId={parseInt(permission.id)}
                  groupName={permission.displayName}
                  displayMode='icon'
                  size={32}
                />
              ) : (
                <TooltipHost
                  content={`${permission.displayName} - ${
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
              )}
            </div>
          ))}

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
