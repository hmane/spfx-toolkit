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
} from '@fluentui/react';
import { PeoplePicker, PrincipalType } from '@pnp/spfx-controls-react/lib/PeoplePicker';
import { LivePersona } from '@pnp/spfx-controls-react/lib/LivePersona';
import { IPermissionPrincipal, PermissionLevelOptions, SPFxContext, PersonaUtils } from './types';
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

  // Component lifecycle methods
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

  // Utility methods
  private handleClickOutside = (event: MouseEvent): void => {
    if (this.panelRef.current && !this.panelRef.current.contains(event.target as Node)) {
      const panelOverlay = document.querySelector('.ms-Panel');
      if (panelOverlay && !panelOverlay.contains(event.target as Node)) {
        this.props.onDismiss();
      }
    }
  };

  private getDefaultPermissionLevel = (): 'view' | 'edit' => {
    const { permissionTypes } = this.props;
    if (permissionTypes === 'both') return 'view';
    return permissionTypes;
  };

  private getInitials = (displayName: string): string => {
    return PersonaUtils.getInitials(displayName);
  };

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

  // Event handlers
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

  private onPermissionLevelChange = (
    event: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption
  ): void => {
    if (option) {
      this.setState({ selectedPermissionLevel: option.key as 'view' | 'edit' });
    }
  };

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

  private onRemoveClick = (principal: IPermissionPrincipal): void => {
    this.setState({
      showRemoveDialog: true,
      userToRemove: principal,
    });
  };

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

  private onCancelRemove = (): void => {
    this.setState({
      showRemoveDialog: false,
      userToRemove: null,
    });
  };

  // Rendering methods
  private renderPermissionOption = (option?: IDropdownOption): JSX.Element => {
    if (!option) return <div />;

    return (
      <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
        <Icon iconName={option.data?.icon} />
        <Text>{option.text}</Text>
      </Stack>
    );
  };

  // FIXED: Enhanced permission item rendering with proper LivePersona integration
  private renderPermissionItem = (permission: IPermissionPrincipal): React.ReactElement => {
    const { canManagePermissions } = this.props;
    const canRemove = canManagePermissions && permission.canBeRemoved;

    return (
      <div key={permission.id} className='manage-access-permission-item'>
        {/* FIXED: Avatar with proper LivePersona integration */}
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
            // FIXED: Enhanced user persona with LivePersona integration
            this.renderUserPersona(permission)
          )}
        </div>

        {/* User/Group Information - Center (Flexible) */}
        <div className='manage-access-permission-info'>
          <div className='manage-access-permission-text'>
            <Text className='manage-access-permission-name'>{permission.displayName}</Text>
            {permission.email && (
              <Text className='manage-access-permission-email'>{permission.email}</Text>
            )}
            {permission.inheritedFrom && (
              <Text className='manage-access-permission-details'>
                via {permission.inheritedFrom}
              </Text>
            )}
          </div>
        </div>

        {/* Permission Level and Actions - Right Side */}
        <div className='manage-access-permission-actions'>
          <div className='manage-access-permission-level'>
            <Icon
              iconName={permission.permissionLevel === 'edit' ? 'Edit' : 'View'}
              className='manage-access-permission-icon'
            />
            <Text variant='small'>{permission.permissionLevel === 'edit' ? 'Edit' : 'View'}</Text>
          </div>

          {canRemove && (
            <TooltipHost content='Remove access'>
              <IconButton
                iconProps={{ iconName: 'Delete' }}
                onClick={() => this.onRemoveClick(permission)}
                className='manage-access-remove-button'
                ariaLabel={`Remove access for ${permission.displayName}`}
              />
            </TooltipHost>
          )}
        </div>
      </div>
    );
  };

  // FIXED: New method for rendering user persona with LivePersona
  private renderUserPersona = (permission: IPermissionPrincipal): React.ReactElement => {
    const upnForPersona = PersonaUtils.normalizeUpn(permission);
    const canUsePersona = PersonaUtils.canUsePersona(permission);

    console.log(
      `Rendering persona for ${permission.displayName}: UPN=${upnForPersona}, CanUse=${canUsePersona}`
    );

    if (canUsePersona) {
      return (
        <div style={{ position: 'relative', width: '32px', height: '32px' }}>
          {/* Base Persona for consistent styling */}
          <Persona
            size={PersonaSize.size32}
            text={permission.displayName}
            secondaryText={permission.email}
            initialsColor={this.getPersonaColor(permission.displayName)}
            imageInitials={this.getInitials(permission.displayName)}
            showInitialsUntilImageLoads={true}
            styles={{
              root: {
                cursor: 'pointer',
              },
              primaryText: {
                display: 'none', // Hide text in panel view
              },
              secondaryText: {
                display: 'none', // Hide secondary text in panel view
              },
            }}
          />

          {/* LivePersona overlay for hover functionality */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              pointerEvents: 'all',
            }}
          >
            <LivePersona
              upn={upnForPersona}
              disableHover={false}
              serviceScope={this.props.spContext.serviceScope}
            />
          </div>
        </div>
      );
    } else {
      // Fallback for users without valid UPN
      console.log(`Using fallback persona for ${permission.displayName}`);

      return (
        <Persona
          size={PersonaSize.size32}
          text={permission.displayName}
          secondaryText={permission.email || 'External User'}
          initialsColor={this.getPersonaColor(permission.displayName)}
          imageInitials={this.getInitials(permission.displayName)}
          showInitialsUntilImageLoads={true}
          styles={{
            root: {
              cursor: 'pointer',
            },
            primaryText: {
              display: 'none', // Hide text in panel view
            },
            secondaryText: {
              display: 'none', // Hide secondary text in panel view
            },
          }}
        />
      );
    }
  };

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

  // Main render method
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
              '@media (min-width: 769px) and (max-width: 1024px)': {
                width: '60vw !important',
                maxWidth: '600px !important',
              },
            },
          }}
        >
          <div ref={this.panelRef} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Scrollable content area with responsive padding */}
            <div
              style={{
                flex: 1,
                padding:
                  window.innerWidth <= 480 ? '12px' : window.innerWidth <= 768 ? '16px' : '24px',
                overflowY: 'auto',
              }}
            >
              <Stack tokens={{ childrenGap: window.innerWidth <= 768 ? 20 : 24 }}>
                {/* Grant Access Section */}
                {canManagePermissions && (
                  <Stack tokens={{ childrenGap: 16 }} className='manage-access-grant-section'>
                    <Text
                      variant={window.innerWidth <= 768 ? 'medium' : 'mediumPlus'}
                      styles={{ root: { fontWeight: 600 } }}
                    >
                      Grant access
                    </Text>

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

                    <Stack tokens={{ childrenGap: 12 }}>
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
                        styles={{
                          root: {
                            width: '100%',
                          },
                        }}
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
                              width: '100%',
                              minWidth: '160px',
                            },
                          }}
                        />
                      )}

                      {/* Simplified button layout */}
                      <div className='manage-access-grant-buttons'>
                        <PrimaryButton
                          text={isGrantingAccess ? 'Granting...' : 'Grant access'}
                          disabled={
                            selectedUsers.length === 0 || isGrantingAccess || isValidatingUsers
                          }
                          onClick={this.onGrantAccessClick}
                          iconProps={isGrantingAccess ? { iconName: 'Sync' } : { iconName: 'Add' }}
                          styles={{
                            root: {
                              minWidth: window.innerWidth <= 768 ? '100%' : '120px',
                            },
                          }}
                        />
                      </div>
                    </Stack>

                    <Separator />
                  </Stack>
                )}

                {/* Current Permissions Section */}
                <Stack tokens={{ childrenGap: 20 }}>
                  <Text
                    variant={window.innerWidth <= 768 ? 'medium' : 'mediumPlus'}
                    styles={{ root: { fontWeight: 600 } }}
                  >
                    People with access
                  </Text>

                  {/* Groups Section - First */}
                  {groups.length > 0 && (
                    <Stack tokens={{ childrenGap: 12 }}>
                      <Text variant='medium' className='manage-access-section-header'>
                        Groups ({groups.length})
                      </Text>
                      <Stack tokens={{ childrenGap: 8 }}>
                        {groups.map(this.renderPermissionItem)}
                      </Stack>
                    </Stack>
                  )}

                  {/* Users Section - Second */}
                  {users.length > 0 && (
                    <Stack tokens={{ childrenGap: 12 }}>
                      <Text variant='medium' className='manage-access-section-header'>
                        Users ({users.length})
                      </Text>
                      <Stack tokens={{ childrenGap: 8 }}>
                        {users.map(this.renderPermissionItem)}
                      </Stack>
                    </Stack>
                  )}

                  {/* Shared Users Section - Third */}
                  {sharedUsers.length > 0 && (
                    <Stack tokens={{ childrenGap: 12 }}>
                      <Text variant='medium' className='manage-access-section-header'>
                        Shared ({sharedUsers.length})
                      </Text>
                      <Stack tokens={{ childrenGap: 8 }}>
                        {sharedUsers.map(this.renderPermissionItem)}
                      </Stack>
                    </Stack>
                  )}

                  {permissions.length === 0 && (
                    <div className='manage-access-no-permissions'>
                      <Icon
                        iconName='People'
                        styles={{
                          root: { fontSize: '24px', marginBottom: '8px', color: '#a19f9d' },
                        }}
                      />
                      <Text variant='medium'>No permissions found</Text>
                      <Text variant='small' styles={{ root: { marginTop: '4px' } }}>
                        This item doesn't have any specific permissions assigned.
                      </Text>
                    </div>
                  )}
                </Stack>
              </Stack>
            </div>
          </div>
        </Panel>

        {/* Remove Confirmation Dialog */}
        {this.renderRemoveDialog()}
      </>
    );
  }
}
