import * as React from 'react';
import {
  Panel,
  PanelType,
  DefaultButton,
  PrimaryButton,
  IconButton,
  Persona,
  PersonaSize,
  Stack,
  Text,
  Separator,
  MessageBar,
  MessageBarType,
  Dialog,
  DialogType,
  DialogFooter,
  Dropdown,
  IDropdownOption,
  Icon,
  Link,
  TooltipHost,
  Spinner,
  SpinnerSize,
} from '@fluentui/react';
import { PeoplePicker, PrincipalType } from '@pnp/spfx-controls-react/lib/PeoplePicker';
import { IPermissionPrincipal, PermissionLevelOptions, SPFxContext } from './types';

export interface IManageAccessPanelProps {
  spContext: SPFxContext;
  isOpen: boolean;
  permissions: IPermissionPrincipal[];
  canManagePermissions: boolean;
  permissionTypes: 'view' | 'edit' | 'both';
  showActivityFeed: boolean;
  inlineMessage: string;
  showInlineMessage: boolean;
  onDismiss: () => void;
  onRemovePermission: (principal: IPermissionPrincipal) => Promise<void>;
  onGrantAccess: (users: any[], permissionLevel: 'view' | 'edit') => Promise<void>;
  onShowActivityFeed: () => void;
  onHideActivityFeed: () => void;
  onEnsureUsers: (users: any[]) => Promise<any[]>;
}

export interface IManageAccessPanelState {
  selectedUsers: any[];
  selectedPermissionLevel: 'view' | 'edit';
  showRemoveDialog: boolean;
  userToRemove: IPermissionPrincipal | null;
  isGrantingAccess: boolean;
  isValidatingUsers: boolean;
  peoplePickerKey: number;
}

export class ManageAccessPanel extends React.Component<
  IManageAccessPanelProps,
  IManageAccessPanelState
> {
  constructor(props: IManageAccessPanelProps) {
    super(props);

    this.state = {
      selectedUsers: [],
      selectedPermissionLevel: this.getDefaultPermissionLevel(),
      showRemoveDialog: false,
      userToRemove: null,
      isGrantingAccess: false,
      isValidatingUsers: false,
      peoplePickerKey: 0,
    };
  }

  // Get default permission level based on permissionTypes
  private getDefaultPermissionLevel = (): 'view' | 'edit' => {
    const { permissionTypes } = this.props;
    if (permissionTypes === 'both') return 'view';
    return permissionTypes;
  };

  // Handle people picker change with user validation
  private onPeoplePickerChange = async (items: any[]): Promise<void> => {
    this.setState({ isValidatingUsers: true });

    try {
      const validatedUsers = await this.props.onEnsureUsers(items);
      this.setState({
        selectedUsers: validatedUsers,
        isValidatingUsers: false,
      });
    } catch (error) {
      console.error('Error validating users:', error);
      this.setState({ isValidatingUsers: false });
    }
  };

  // Handle permission level change
  private onPermissionLevelChange = (
    event: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption
  ): void => {
    if (option) {
      this.setState({ selectedPermissionLevel: option.key as 'view' | 'edit' });
    }
  };

  // Handle grant access click
  private onGrantAccessClick = async (): Promise<void> => {
    const { selectedUsers, selectedPermissionLevel } = this.state;

    if (selectedUsers.length === 0) return;

    this.setState({ isGrantingAccess: true });

    try {
      await this.props.onGrantAccess(selectedUsers, selectedPermissionLevel);
      this.setState({
        selectedUsers: [],
        isGrantingAccess: false,
        selectedPermissionLevel: this.getDefaultPermissionLevel(),
        peoplePickerKey: this.state.peoplePickerKey + 1,
      });
    } catch (error) {
      console.error('Error granting access:', error);
      this.setState({ isGrantingAccess: false });
    }
  };

  // Handle remove click
  private onRemoveClick = (principal: IPermissionPrincipal): void => {
    this.setState({
      showRemoveDialog: true,
      userToRemove: principal,
    });
  };

  // Handle confirm remove
  private onConfirmRemove = async (): Promise<void> => {
    const { userToRemove } = this.state;
    if (!userToRemove) return;

    try {
      await this.props.onRemovePermission(userToRemove);
      this.setState({
        showRemoveDialog: false,
        userToRemove: null,
      });
    } catch (error) {
      console.error('Error removing permission:', error);
      this.setState({
        showRemoveDialog: false,
        userToRemove: null,
      });
    }
  };

  // Handle cancel remove
  private onCancelRemove = (): void => {
    this.setState({
      showRemoveDialog: false,
      userToRemove: null,
    });
  };

  // Render permission dropdown option
  private renderPermissionOption = (option?: IDropdownOption): JSX.Element => {
    if (!option) return <div />;

    return (
      <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
        <Icon iconName={option.data?.icon} />
        <Text>{option.text}</Text>
      </Stack>
    );
  };

  // Render permission item
  private renderPermissionItem = (permission: IPermissionPrincipal): React.ReactElement => {
    const { canManagePermissions } = this.props;
    const canRemove = canManagePermissions && permission.canBeRemoved;

    return (
      <div key={permission.id} className='manage-access-permission-item'>
        <Stack horizontal horizontalAlign='space-between' verticalAlign='center'>
          <Stack
            horizontal
            tokens={{ childrenGap: 12 }}
            verticalAlign='center'
            className='manage-access-permission-info'
          >
            <Persona
              size={PersonaSize.size32}
              text={permission.displayName}
              secondaryText={permission.email}
              className='manage-access-permission-persona'
            />
            <Stack>
              <Text variant='medium'>{permission.displayName}</Text>
              {permission.email && (
                <Text variant='small' className='manage-access-permission-email'>
                  {permission.email}
                </Text>
              )}
            </Stack>
          </Stack>

          <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
            <Stack horizontal tokens={{ childrenGap: 4 }} verticalAlign='center'>
              <Icon
                iconName={permission.permissionLevel === 'edit' ? 'Edit' : 'View'}
                className='manage-access-permission-icon'
              />
              <Text variant='small'>
                {permission.permissionLevel === 'edit' ? 'Can edit' : 'Can view'}
              </Text>
            </Stack>

            {canRemove && (
              <TooltipHost content='Remove access'>
                <IconButton
                  iconProps={{ iconName: 'Delete' }}
                  onClick={() => this.onRemoveClick(permission)}
                  className='manage-access-remove-button'
                />
              </TooltipHost>
            )}
          </Stack>
        </Stack>
      </div>
    );
  };

  // Render panel footer
  private renderPanelFooter = (): React.ReactElement => {
    return (
      <Stack horizontal horizontalAlign='end'>
        <DefaultButton text='Done' onClick={this.props.onDismiss} />
      </Stack>
    );
  };

  // Render activity feed panel
  private renderActivityFeedPanel = (): React.ReactElement => {
    return (
      <Panel
        isOpen={this.props.showActivityFeed}
        type={PanelType.medium}
        onDismiss={this.props.onHideActivityFeed}
        headerText='Recent activity'
        className='manage-access-activity-panel'
      >
        <Stack tokens={{ childrenGap: 16 }}>
          <Text>Activity feed coming soon...</Text>
        </Stack>
      </Panel>
    );
  };

  // Render remove confirmation dialog
  private renderRemoveDialog = (): React.ReactElement => {
    const { showRemoveDialog, userToRemove } = this.state;

    return (
      <Dialog
        hidden={!showRemoveDialog}
        onDismiss={this.onCancelRemove}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Remove access',
          subText: `Are you sure you want to remove access for ${userToRemove?.displayName}?`,
        }}
      >
        <DialogFooter>
          <PrimaryButton onClick={this.onConfirmRemove} text='Remove' />
          <DefaultButton onClick={this.onCancelRemove} text='Cancel' />
        </DialogFooter>
      </Dialog>
    );
  };

  // Main render
  public render(): React.ReactElement {
    const {
      isOpen,
      permissions,
      canManagePermissions,
      permissionTypes,
      showActivityFeed,
      inlineMessage,
      showInlineMessage,
      onDismiss,
      onShowActivityFeed,
    } = this.props;

    const {
      selectedUsers,
      selectedPermissionLevel,
      isGrantingAccess,
      isValidatingUsers,
      peoplePickerKey,
    } = this.state;

    const groups = permissions.filter(p => p.isGroup);
    const users = permissions.filter(p => !p.isGroup);
    const showPermissionDropdown = permissionTypes === 'both';

    return (
      <>
        <Panel
          isOpen={isOpen && !showActivityFeed}
          type={PanelType.medium}
          onDismiss={onDismiss}
          headerText='Manage access'
          className='manage-access-panel'
          isFooterAtBottom={true}
          onRenderFooter={this.renderPanelFooter}
        >
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Grant Access Section */}
            {canManagePermissions && (
              <Stack tokens={{ childrenGap: 12 }}>
                <Stack horizontal horizontalAlign='space-between' verticalAlign='center'>
                  <Text variant='mediumPlus'>Grant access</Text>
                </Stack>

                {/* Inline Message */}
                {showInlineMessage && inlineMessage && (
                  <MessageBar
                    messageBarType={MessageBarType.warning}
                    isMultiline={false}
                    className='manage-access-inline-message'
                  >
                    {inlineMessage}
                  </MessageBar>
                )}

                <Stack tokens={{ childrenGap: 8 }}>
                  <PeoplePicker
                    context={this.props.spContext as any}
                    titleText=''
                    personSelectionLimit={10}
                    groupName=''
                    showtooltip={true}
                    disabled={false}
                    onChange={this.onPeoplePickerChange}
                    showHiddenInUI={false}
                    principalTypes={[PrincipalType.User, PrincipalType.SharePointGroup]}
                    resolveDelay={300}
                    placeholder='Enter names or email addresses'
                    key={peoplePickerKey}
                  />

                  {isValidatingUsers && (
                    <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
                      <Spinner size={SpinnerSize.xSmall} />
                      <Text variant='small'>Validating users...</Text>
                    </Stack>
                  )}

                  {showPermissionDropdown && (
                    <Dropdown
                      placeholder='Select permission level'
                      options={PermissionLevelOptions.map(option => ({
                        key: option.key,
                        text: option.text,
                        data: { icon: option.iconName },
                      }))}
                      selectedKey={selectedPermissionLevel}
                      onChange={this.onPermissionLevelChange}
                      onRenderOption={this.renderPermissionOption}
                      className='manage-access-permission-dropdown'
                    />
                  )}

                  <Stack horizontal tokens={{ childrenGap: 8 }}>
                    <PrimaryButton
                      text={isGrantingAccess ? 'Granting...' : 'Grant access'}
                      disabled={selectedUsers.length === 0 || isGrantingAccess || isValidatingUsers}
                      onClick={this.onGrantAccessClick}
                      iconProps={isGrantingAccess ? { iconName: 'Sync' } : { iconName: 'Add' }}
                    />
                  </Stack>
                </Stack>

                <Separator />
              </Stack>
            )}

            {/* Current Permissions Section */}
            <Stack tokens={{ childrenGap: 16 }}>
              <Stack horizontal horizontalAlign='space-between' verticalAlign='center'>
                <Text variant='mediumPlus'>People with access</Text>
                {canManagePermissions && (
                  <Link onClick={onShowActivityFeed}>
                    <Icon iconName='History' style={{ marginRight: 4 }} />
                    Activity
                  </Link>
                )}
              </Stack>

              {/* Groups Section */}
              {groups.length > 0 && (
                <Stack tokens={{ childrenGap: 8 }}>
                  <Text variant='medium' className='manage-access-section-header'>
                    Groups ({groups.length})
                  </Text>
                  {groups.map(this.renderPermissionItem)}
                </Stack>
              )}

              {/* Users Section */}
              {users.length > 0 && (
                <Stack tokens={{ childrenGap: 8 }}>
                  <Text variant='medium' className='manage-access-section-header'>
                    Users ({users.length})
                  </Text>
                  {users.map(this.renderPermissionItem)}
                </Stack>
              )}

              {permissions.length === 0 && (
                <Text variant='medium' className='manage-access-no-permissions'>
                  No permissions found
                </Text>
              )}
            </Stack>
          </Stack>
        </Panel>

        {/* Activity Feed Panel */}
        {this.renderActivityFeedPanel()}

        {/* Remove Confirmation Dialog */}
        {this.renderRemoveDialog()}
      </>
    );
  }
}
