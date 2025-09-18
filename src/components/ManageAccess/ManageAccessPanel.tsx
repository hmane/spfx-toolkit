import * as React from 'react';
import {
  Panel,
  PanelType,
  DefaultButton,
  PrimaryButton,
  IconButton,
  Persona,
  PersonaSize,
  PersonaInitialsColor,
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
  TooltipHost,
  Spinner,
  SpinnerSize,
  IPersonaProps,
} from '@fluentui/react';
import { PeoplePicker, PrincipalType } from '@pnp/spfx-controls-react/lib/PeoplePicker';
import { LivePersona } from '@pnp/spfx-controls-react/lib/LivePersona';
import { IPermissionPrincipal, PermissionLevelOptions, SPFxContext } from './types';
import { GroupViewer } from '../GroupViewer';

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
  private panelRef: React.RefObject<HTMLDivElement>;

  constructor(props: IManageAccessPanelProps) {
    super(props);

    this.panelRef = React.createRef();

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

  // Handle clicking outside the panel
  componentDidMount(): void {
    if (this.props.isOpen) {
      document.addEventListener('mousedown', this.handleClickOutside);
    }
  }

  componentDidUpdate(prevProps: IManageAccessPanelProps): void {
    if (this.props.isOpen !== prevProps.isOpen) {
      if (this.props.isOpen) {
        document.addEventListener('mousedown', this.handleClickOutside);
      } else {
        document.removeEventListener('mousedown', this.handleClickOutside);
      }
    }
  }

  componentWillUnmount(): void {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  // Handle clicking outside to close panel
  private handleClickOutside = (event: MouseEvent): void => {
    if (this.panelRef.current && !this.panelRef.current.contains(event.target as Node)) {
      // Check if click is on panel overlay or outside
      const panelOverlay = document.querySelector('.ms-Panel');
      if (panelOverlay && !panelOverlay.contains(event.target as Node)) {
        this.props.onDismiss();
      }
    }
  };

  // Get default permission level based on permissionTypes
  private getDefaultPermissionLevel = (): 'view' | 'edit' => {
    const { permissionTypes } = this.props;
    if (permissionTypes === 'both') return 'view';
    return permissionTypes;
  };

  // Generate initials from display name
  private getInitials = (displayName: string): string => {
    if (!displayName) return '?';

    const words = displayName.split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  // Get persona color based on name
  private getPersonaColor = (displayName: string): PersonaInitialsColor => {
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

  // Enhanced permission item renderer with proper avatars and GroupViewer
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
            {/* Enhanced avatar display */}
            <div className='manage-access-permission-persona'>
              {permission.isSharingLink ? (
                // Sharing link icon
                <div className='manage-access-sharing-link-avatar'>
                  <Icon
                    iconName={
                      permission.sharingLinkType === 'anonymous'
                        ? 'Link'
                        : permission.sharingLinkType === 'organization'
                        ? 'People'
                        : 'Contact'
                    }
                  />
                </div>
              ) : permission.isGroup ? (
                // Group with GroupViewer for hover tooltip
                <GroupViewer
                  spContext={this.props.spContext}
                  groupId={parseInt(permission.id)}
                  groupName={permission.displayName}
                  displayMode='icon'
                  size={32}
                />
              ) : (
                // User persona with proper initials and LivePersona
                <div style={{ position: 'relative' }}>
                  <Persona
                    size={PersonaSize.size32}
                    text={permission.displayName}
                    secondaryText={permission.email}
                    initialsColor={this.getPersonaColor(permission.displayName)}
                    imageInitials={this.getInitials(permission.displayName)}
                    showInitialsUntilImageLoads={true}
                  />
                  {/* Overlay LivePersona for hover functionality */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '32px',
                      height: '32px',
                      opacity: 0,
                      pointerEvents: 'all',
                    }}
                  >
                    <LivePersona
                      upn={permission.email || permission.displayName}
                      disableHover={false}
                      serviceScope={this.props.spContext.serviceScope}
                    />
                  </div>
                </div>
              )}
            </div>

            <Stack>
              <Text variant='medium'>{permission.displayName}</Text>
              {permission.email && (
                <Text variant='small' className='manage-access-permission-email'>
                  {permission.email}
                </Text>
              )}
              {permission.inheritedFrom && (
                <Text variant='xSmall' style={{ color: '#605e5c', fontStyle: 'italic' }}>
                  via {permission.inheritedFrom}
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

  // Render panel footer with proper spacing
  private renderPanelFooter = (): React.ReactElement => {
    return (
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid #e1dfdd',
          backgroundColor: '#ffffff',
          position: 'sticky',
          bottom: 0,
          zIndex: 1000,
        }}
      >
        <Stack horizontal horizontalAlign='end'>
          <DefaultButton text='Done' onClick={this.props.onDismiss} />
        </Stack>
      </div>
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
      inlineMessage,
      showInlineMessage,
      onDismiss,
    } = this.props;

    const {
      selectedUsers,
      selectedPermissionLevel,
      isGrantingAccess,
      isValidatingUsers,
      peoplePickerKey,
    } = this.state;

    // Sort permissions: Groups first, then users, then shared users
    const groups = permissions.filter(p => p.isGroup);
    const users = permissions.filter(p => !p.isGroup && !p.isSharingLink && !p.inheritedFrom);
    const sharedUsers = permissions.filter(p => !p.isGroup && (p.isSharingLink || p.inheritedFrom));
    const showPermissionDropdown = permissionTypes === 'both';

    return (
      <>
        <Panel
          isOpen={isOpen}
          type={PanelType.medium}
          onDismiss={onDismiss}
          headerText='Manage access'
          className='manage-access-panel'
          isFooterAtBottom={false}
          onRenderFooter={undefined}
          isBlocking={false}
          isLightDismiss={true}
          styles={{
            main: {
              zIndex: 1000,
            },
            overlay: {
              zIndex: 999,
            },
            content: {
              padding: 0,
            },
            scrollableContent: {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
            header: {
              borderBottom: '1px solid #e1dfdd',
              padding: '16px 24px',
              position: 'sticky',
              top: 0,
              backgroundColor: '#ffffff',
              zIndex: 1001,
            },
            // Enhanced mobile responsiveness
            root: {
              '@media (max-width: 768px)': {
                width: '100vw !important',
                height: '100vh !important',
                maxWidth: 'none !important',
                maxHeight: 'none !important',
              },
            },
          }}
        >
          <div ref={this.panelRef} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Scrollable content area with better mobile padding */}
            <div
              style={{
                flex: 1,
                padding: window.innerWidth <= 768 ? '16px' : '24px',
                overflowY: 'auto',
              }}
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
                          styles={{
                            dropdown: {
                              '@media (max-width: 768px)': {
                                width: '100%',
                              },
                            },
                          }}
                        />
                      )}

                      <Stack
                        horizontal={window.innerWidth > 768}
                        tokens={{ childrenGap: 8 }}
                        styles={{
                          root: {
                            '@media (max-width: 768px)': {
                              flexDirection: 'column',
                            },
                          },
                        }}
                      >
                        <PrimaryButton
                          text={isGrantingAccess ? 'Granting...' : 'Grant access'}
                          disabled={
                            selectedUsers.length === 0 || isGrantingAccess || isValidatingUsers
                          }
                          onClick={this.onGrantAccessClick}
                          iconProps={isGrantingAccess ? { iconName: 'Sync' } : { iconName: 'Add' }}
                          styles={{
                            root: {
                              '@media (max-width: 768px)': {
                                width: '100%',
                              },
                            },
                          }}
                        />
                        {/* Done button moved here - only show when granting access */}
                        {!isGrantingAccess && !isValidatingUsers && (
                          <DefaultButton
                            text='Done'
                            onClick={this.props.onDismiss}
                            styles={{
                              root: {
                                '@media (max-width: 768px)': {
                                  width: '100%',
                                },
                              },
                            }}
                          />
                        )}
                      </Stack>
                    </Stack>

                    <Separator />
                  </Stack>
                )}

                {/* Current Permissions Section */}
                <Stack tokens={{ childrenGap: 16 }}>
                  <Stack horizontal horizontalAlign='space-between' verticalAlign='center'>
                    <Text variant='mediumPlus'>People with access</Text>
                  </Stack>

                  {/* Groups Section - First */}
                  {groups.length > 0 && (
                    <Stack tokens={{ childrenGap: 8 }}>
                      <Text variant='medium' className='manage-access-section-header'>
                        Groups ({groups.length})
                      </Text>
                      {groups.map(this.renderPermissionItem)}
                    </Stack>
                  )}

                  {/* Users Section - Second */}
                  {users.length > 0 && (
                    <Stack tokens={{ childrenGap: 8 }}>
                      <Text variant='medium' className='manage-access-section-header'>
                        Users ({users.length})
                      </Text>
                      {users.map(this.renderPermissionItem)}
                    </Stack>
                  )}

                  {/* Shared Users Section - Third */}
                  {sharedUsers.length > 0 && (
                    <Stack tokens={{ childrenGap: 8 }}>
                      <Text variant='medium' className='manage-access-section-header'>
                        Shared ({sharedUsers.length})
                      </Text>
                      {sharedUsers.map(this.renderPermissionItem)}
                    </Stack>
                  )}

                  {permissions.length === 0 && (
                    <Text variant='medium' className='manage-access-no-permissions'>
                      No permissions found
                    </Text>
                  )}
                </Stack>
              </Stack>
            </div>

            {/* Fixed footer - only for non-management users or at the very end */}
            {!canManagePermissions && this.renderPanelFooter()}
          </div>
        </Panel>

        {/* Remove Confirmation Dialog */}
        {this.renderRemoveDialog()}
      </>
    );
  }
}
