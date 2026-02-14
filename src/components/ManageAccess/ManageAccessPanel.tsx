import { DefaultButton, IconButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Separator } from '@fluentui/react/lib/Separator';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
// Import PrincipalType enum directly to avoid CSS side effects
import { PrincipalType } from '@pnp/spfx-controls-react/lib/controls/peoplepicker/PrincipalType';
import * as React from 'react';

// Lazy load PeoplePicker to prevent PnP controls CSS from being bundled when not used
const PeoplePicker = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/PeoplePicker').then((module) => ({
    default: module.PeoplePicker,
  }))
);
import { SPContext } from '../../utilities/context';
import { GroupViewer } from '../GroupViewer';
import { UserPersona } from '../UserPersona';
import { IPermissionPrincipal, PermissionLevelOptions } from './types';

export interface IManageAccessPanelProps {
  isOpen: boolean;
  permissions: IPermissionPrincipal[];
  canManagePermissions: boolean;
  enabled: boolean; // NEW PROP
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

export const ManageAccessPanel: React.FC<IManageAccessPanelProps> = props => {
  const {
    isOpen,
    permissions,
    canManagePermissions,
    permissionTypes,
    inlineMessage,
    showInlineMessage,
    onDismiss,
    onRemovePermission,
    onGrantAccess,
    onEnsureUsers,
    enabled,
  } = props;

  const defaultPermissionLevel = permissionTypes === 'both' ? 'view' : permissionTypes;
  const [selectedUsers, setSelectedUsers] = React.useState<any[]>([]);
  const [selectedPermissionLevel, setSelectedPermissionLevel] =
    React.useState<'view' | 'edit'>(defaultPermissionLevel);
  const [showRemoveDialog, setShowRemoveDialog] = React.useState(false);
  const [userToRemove, setUserToRemove] = React.useState<IPermissionPrincipal | null>(null);
  const [isGrantingAccess, setIsGrantingAccess] = React.useState(false);
  const [isValidatingUsers, setIsValidatingUsers] = React.useState(false);
  const [peoplePickerKey, setPeoplePickerKey] = React.useState(0);

  React.useEffect(() => {
    setSelectedPermissionLevel(defaultPermissionLevel);
  }, [defaultPermissionLevel]);

  const handlePeoplePickerChange = React.useCallback(
    async (items: any[]): Promise<void> => {
      setIsValidatingUsers(true);

      try {
        const validatedUsers = await onEnsureUsers(items);
        setSelectedUsers(validatedUsers);
      } catch (error) {
        SPContext.logger.error('ManageAccessPanel failed to validate users', error);
      } finally {
        setIsValidatingUsers(false);
      }
    },
    [onEnsureUsers]
  );

  const handlePermissionLevelChange = React.useCallback(
    (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
      if (option) {
        setSelectedPermissionLevel(option.key as 'view' | 'edit');
      }
    },
    []
  );

  const handleGrantAccessClick = React.useCallback(async (): Promise<void> => {
    if (selectedUsers.length === 0) return;

    setIsGrantingAccess(true);

    try {
      await onGrantAccess(selectedUsers, selectedPermissionLevel);
      setSelectedUsers([]);
      setSelectedPermissionLevel(defaultPermissionLevel);
      setPeoplePickerKey(prev => prev + 1);
    } catch (error) {
      SPContext.logger.error('ManageAccessPanel failed to grant access', error);
    } finally {
      setIsGrantingAccess(false);
    }
  }, [selectedUsers, selectedPermissionLevel, onGrantAccess, defaultPermissionLevel]);

  const handleRemoveClick = React.useCallback((principal: IPermissionPrincipal): void => {
    setShowRemoveDialog(true);
    setUserToRemove(principal);
  }, []);

  const handleConfirmRemove = React.useCallback(async (): Promise<void> => {
    if (!userToRemove) return;

    try {
      await onRemovePermission(userToRemove);
      setShowRemoveDialog(false);
      setUserToRemove(null);
    } catch (error) {
      SPContext.logger.error('ManageAccessPanel failed to remove permission', error);
      setShowRemoveDialog(false);
      setUserToRemove(null);
    }
  }, [userToRemove, onRemovePermission]);

  const handleCancelRemove = React.useCallback((): void => {
    setShowRemoveDialog(false);
    setUserToRemove(null);
  }, []);

  const renderPermissionOption = React.useCallback((option?: IDropdownOption): JSX.Element => {
    if (!option) return <div />;

    return (
      <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
        <Icon iconName={option.data?.icon} />
        <Text>{option.text}</Text>
      </Stack>
    );
  }, []);

  const renderUserPersona = React.useCallback(
    (permission: IPermissionPrincipal): React.ReactElement => {
      const userIdentifier =
        permission.loginName || permission.email || permission.userPrincipalName || permission.id;

      return (
        <UserPersona
          userIdentifier={userIdentifier}
          displayName={permission.displayName}
          email={permission.email}
          size={32}
          displayMode='avatar'
          showLivePersona={true}
        />
      );
    },
    []
  );

  const renderPermissionItem = React.useCallback(
    (permission: IPermissionPrincipal): React.ReactElement => {
      const canRemove = enabled && canManagePermissions && permission.canBeRemoved;

      return (
        <div key={permission.id} className='manage-access-permission-item'>
          <div className='manage-access-permission-persona'>
            {permission.isGroup ? (
              <GroupViewer
                groupId={Number.parseInt(permission.id, 10)}
                groupName={permission.displayName}
                displayMode='icon'
                size={32}
                bustCache={true}
              />
            ) : (
              renderUserPersona(permission)
            )}
          </div>

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

          <div className='manage-access-permission-actions'>
            <div
              className={`manage-access-permission-level ${
                permission.inheritedFrom ? 'with-badge' : ''
              }`}
            >
              <Icon
                iconName={permission.permissionLevel === 'edit' ? 'Edit' : 'View'}
                className='manage-access-permission-icon'
              />
              <Text variant='small'>
                {permission.permissionLevel === 'edit' ? 'Can edit' : 'Can view'}
              </Text>
              {permission.inheritedFrom && (
                <Text variant='small' className='manage-access-shared-badge'>
                  • Shared
                </Text>
              )}
            </div>

            {canRemove && (
              <TooltipHost content='Remove access'>
                <IconButton
                  iconProps={{ iconName: 'Delete' }}
                  onClick={() => handleRemoveClick(permission)}
                  className='manage-access-remove-button'
                  ariaLabel={`Remove access for ${permission.displayName}`}
                />
              </TooltipHost>
            )}
          </div>
        </div>
      );
    },
    [enabled, canManagePermissions, renderUserPersona, handleRemoveClick]
  );

  const renderRemoveDialog = React.useCallback((): React.ReactElement => {
    return (
      <Dialog
        hidden={!showRemoveDialog}
        onDismiss={handleCancelRemove}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Remove access',
          subText: `Are you sure you want to remove access for ${userToRemove?.displayName}?`,
        }}
      >
        <DialogFooter>
          <PrimaryButton onClick={handleConfirmRemove} text='Remove' />
          <DefaultButton onClick={handleCancelRemove} text='Cancel' />
        </DialogFooter>
      </Dialog>
    );
  }, [showRemoveDialog, userToRemove, handleConfirmRemove, handleCancelRemove]);

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
        headerText={enabled ? 'Manage access' : 'All access'}
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              flex: 1,
              padding:
                window.innerWidth <= 480 ? '12px' : window.innerWidth <= 768 ? '16px' : '20px',
              overflowY: 'auto',
            }}
          >
            <Stack tokens={{ childrenGap: 16 }}>
              {/* Only show grant access section if enabled */}
              {enabled && canManagePermissions && (
                <Stack tokens={{ childrenGap: 12 }} className='manage-access-grant-section'>
                  <Text variant='medium' styles={{ root: { fontWeight: 600 } }}>
                    Grant access
                  </Text>

                  {showInlineMessage && inlineMessage && (
                    <MessageBar
                      messageBarType={MessageBarType.warning}
                      isMultiline={false}
                      className='manage-access-inline-message'
                    >
                      {inlineMessage}
                    </MessageBar>
                  )}

                  <Stack tokens={{ childrenGap: 10 }}>
                    <React.Suspense fallback={<Spinner size={SpinnerSize.small} label="Loading people picker..." />}>
                      <PeoplePicker
                        context={SPContext.peoplepickerContext}
                        titleText=''
                        personSelectionLimit={10}
                        groupName=''
                        showtooltip={true}
                        disabled={isGrantingAccess || isValidatingUsers}
                        onChange={handlePeoplePickerChange}
                        showHiddenInUI={false}
                        principalTypes={[PrincipalType.User, PrincipalType.SharePointGroup]}
                        resolveDelay={300}
                        placeholder='Enter names or email addresses'
                        key={peoplePickerKey}
                      />
                    </React.Suspense>

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
                        onChange={handlePermissionLevelChange}
                        onRenderOption={renderPermissionOption}
                        className='manage-access-permission-dropdown'
                      />
                    )}

                    <PrimaryButton
                      text={isGrantingAccess ? 'Granting...' : 'Grant access'}
                      disabled={selectedUsers.length === 0 || isGrantingAccess || isValidatingUsers}
                      onClick={handleGrantAccessClick}
                      iconProps={isGrantingAccess ? { iconName: 'Sync' } : { iconName: 'Add' }}
                      styles={{
                        root: {
                          maxWidth: '150px',
                        },
                      }}
                    />
                  </Stack>

                  <Separator />
                </Stack>
              )}

              {/* People with access section - always visible */}
              <Stack tokens={{ childrenGap: 16 }}>
                <Text variant='medium' styles={{ root: { fontWeight: 600 } }}>
                  People with access
                </Text>

                {groups.length > 0 && (
                  <Stack tokens={{ childrenGap: 8 }}>
                    <Text variant='small' styles={{ root: { fontWeight: 600, color: '#605e5c' } }}>
                      Groups ({groups.length})
                    </Text>
                    <Stack tokens={{ childrenGap: 6 }}>{groups.map(renderPermissionItem)}</Stack>
                  </Stack>
                )}

                {users.length > 0 && (
                  <Stack tokens={{ childrenGap: 8 }}>
                    <Text variant='small' styles={{ root: { fontWeight: 600, color: '#605e5c' } }}>
                      Users ({users.length})
                    </Text>
                    <Stack tokens={{ childrenGap: 6 }}>{users.map(renderPermissionItem)}</Stack>
                  </Stack>
                )}

                {sharedUsers.length > 0 && (
                  <Stack tokens={{ childrenGap: 8 }}>
                    <Text variant='small' styles={{ root: { fontWeight: 600, color: '#605e5c' } }}>
                      Shared ({sharedUsers.length})
                    </Text>
                    <Stack tokens={{ childrenGap: 6 }}>
                      {sharedUsers.map(renderPermissionItem)}
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
                  </div>
                )}
              </Stack>
            </Stack>
          </div>
        </div>
      </Panel>

      {renderRemoveDialog()}
    </>
  );
};
