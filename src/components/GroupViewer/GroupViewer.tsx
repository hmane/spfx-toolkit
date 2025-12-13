import { Callout } from '@fluentui/react/lib/Callout';
import { Icon } from '@fluentui/react/lib/Icon';
import { Persona, PersonaInitialsColor, PersonaSize } from '@fluentui/react/lib/Persona';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { LivePersona } from '@pnp/spfx-controls-react/lib/LivePersona';
import * as React from 'react';
import { DirectionalHint } from '../../types/fluentui-types';
import { SPContext } from '../../utilities/context';
import { UserPersona } from '../UserPersona';
import './GroupViewer.css';
import {
  CACHE_CONSTANTS,
  GroupViewerDefaultSettings,
  IGroupInfo,
  IGroupMember,
  IGroupViewerProps,
  PersonaUtils,
  SPPrincipalType,
} from './types';

export const GroupViewer: React.FC<IGroupViewerProps> = props => {
  const {
    groupId,
    groupName,
    size = GroupViewerDefaultSettings.size,
    displayMode = GroupViewerDefaultSettings.displayMode,
    iconName = GroupViewerDefaultSettings.iconName,
    className = '',
    onClick,
    bustCache = false,
    onError,
    nestLevel = GroupViewerDefaultSettings.nestLevel,
    maxNestLevel = GroupViewerDefaultSettings.maxNestLevel,
  } = props;

  // State
  const [members, setMembers] = React.useState<IGroupMember[]>([]);
  const [groupInfo, setGroupInfo] = React.useState<IGroupInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isCalloutVisible, setIsCalloutVisible] = React.useState(false);

  // Refs and cache
  const loadTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const loadingRef = React.useRef(false);
  const cacheRef = React.useRef<
    Map<string, { info: IGroupInfo; members: IGroupMember[]; ts: number }>
  >(new Map());
  const isMountedRef = React.useRef(true);
  const targetElementRef = React.useRef<HTMLDivElement>(null);

  // Special SharePoint groups that should not show member details
  const specialGroups = React.useMemo(
    () => [
      'Everyone except external users',
      'Everyone',
      'All Users',
      'Authenticated Users',
      'NT Authority\\Authenticated Users',
    ],
    []
  );

  // Check if group is a special SharePoint group
  const isSpecialGroup = React.useCallback(
    (groupTitle: string): boolean => {
      const normalizedTitle = groupTitle.toLowerCase().trim();

      const exactMatch = specialGroups.some(
        specialGroup => normalizedTitle === specialGroup.toLowerCase()
      );

      if (exactMatch) return true;

      const isSystemGroup =
        normalizedTitle === 'everyone except external users' ||
        normalizedTitle === 'everyone' ||
        normalizedTitle === 'all users' ||
        normalizedTitle === 'authenticated users' ||
        normalizedTitle.startsWith('nt authority\\');

      return isSystemGroup;
    },
    [specialGroups]
  );

  // Enhanced system account detection
  const isSystemAccount = React.useCallback((user: IGroupMember): boolean => {
    if (!user || (!user.Title && !user.LoginName)) return true;

    const systemPatterns = [
      'System Account',
      'SharePoint App',
      'SHAREPOINT\\system',
      'app@sharepoint',
      'NT AUTHORITY\\SYSTEM',
      'NT AUTHORITY\\LOCAL SERVICE',
      'NT AUTHORITY\\NETWORK SERVICE',
      'BUILTIN\\',
      'c:0(.s|true',
      'c:0-.f|rolemanager|spo-grid',
      'c:0!.s|windows',
      'sharepoint\\system',
      'app@local',
      'Everyone except external users',
    ];

    const title = (user.Title || '').toLowerCase().trim();
    const loginName = (user.LoginName || '').toLowerCase().trim();
    const email = (user.Email || '').toLowerCase().trim();

    const isSystemPattern = systemPatterns.some(pattern => {
      const lowerPattern = pattern.toLowerCase();
      return (
        title === lowerPattern ||
        loginName === lowerPattern ||
        loginName.startsWith(lowerPattern) ||
        (email && email === lowerPattern)
      );
    });

    const isSystemByCharacteristics =
      loginName.startsWith('c:0-.f|rolemanager|spo-grid') ||
      loginName.startsWith('c:0!.s|windows') ||
      (loginName.includes('app@') && loginName.endsWith('.local'));

    return isSystemPattern || isSystemByCharacteristics;
  }, []);

  // Check if member is the current group itself
  const isCurrentGroup = React.useCallback(
    (user: IGroupMember, currentGroupName: string): boolean => {
      return (
        user.Title === currentGroupName ||
        user.LoginName === currentGroupName ||
        (user.PrincipalType === SPPrincipalType.SharePointGroup && user.Title === currentGroupName)
      );
    },
    []
  );

  // Reset state when group identifier changes (for dropdown scenarios)
  React.useEffect(() => {
    // Clear previous group data when groupId or groupName changes
    setMembers([]);
    setGroupInfo(null);
    setError(null);
    setIsLoading(false);

    // Clear the cache for the previous group to prevent stale data
    // This is important when switching groups in dropdown scenarios
    cacheRef.current.clear();

    // Cancel any pending operations
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Hide callout if visible
    setIsCalloutVisible(false);
  }, [groupId, groupName]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, []);

  // Load group data with SPContext integration
  const loadGroupData = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await SPContext.performance.track('GroupViewer.loadGroupData', async () => {
        const cacheKey = `group_${groupId ?? groupName}`.toLowerCase();

        // Check cache if not busting
        if (!bustCache) {
          const cached = cacheRef.current.get(cacheKey);
          if (cached && Date.now() - cached.ts < CACHE_CONSTANTS.TTL_MS) {
            SPContext.logger.info('GroupViewer cache hit', { cacheKey });
            if (isMountedRef.current) {
              setGroupInfo(cached.info);
              setMembers(cached.members);
              setIsLoading(false);
            }
            return;
          }
        }

        if (loadingRef.current) {
          SPContext.logger.info('GroupViewer load skipped: already loading');
          return;
        }
        loadingRef.current = true;

        let group;
        if (groupId) {
          group = SPContext.sp.web.siteGroups.getById(groupId);
        } else {
          group = SPContext.sp.web.siteGroups.getByName(groupName);
        }

        SPContext.logger.info('GroupViewer loading group', {
          by: groupId ? 'id' : 'name',
          groupId,
          groupName,
        });

        // Load group info
        const groupData = await group.select('Id', 'Title', 'Description', 'LoginName')();

        const currentGroupName = groupData.Title || groupName;

        SPContext.logger.info('GroupViewer loaded group info', {
          groupName: currentGroupName,
          groupId: groupData.Id,
        });

        // Check if special group
        const isSpecial = isSpecialGroup(currentGroupName);
        if (isSpecial) {
          SPContext.logger.info('GroupViewer special group detected', {
            groupName: currentGroupName,
          });
          if (isMountedRef.current) {
            setGroupInfo(groupData as IGroupInfo);
            setMembers([]);
            setIsLoading(false);
          }
          loadingRef.current = false;
          return;
        }

        // Load group members
        let usersData: IGroupMember[] = [];
        try {
          const targetGroup = groupData.Id
            ? SPContext.sp.web.siteGroups.getById(groupData.Id)
            : SPContext.sp.web.siteGroups.getByName(currentGroupName);

          usersData = await targetGroup.users.select(
            'Id',
            'Title',
            'Email',
            'LoginName',
            'PrincipalType',
            'UserPrincipalName'
          )();

          if (!Array.isArray(usersData)) {
            usersData = [];
          }
        } catch (membersError) {
          SPContext.logger.error('GroupViewer failed to load members', membersError, {
            groupId: groupData.Id,
            groupName: currentGroupName,
          });
          throw membersError;
        }

        if (usersData.length === 0) {
          if (isMountedRef.current) {
            setGroupInfo(groupData as IGroupInfo);
            setMembers([]);
            setIsLoading(false);
          }
          loadingRef.current = false;
          return;
        }

        SPContext.logger.info('GroupViewer loaded members', {
          groupName: currentGroupName,
          rawCount: usersData.length,
        });

        // Filter members
        const filteredMembers = usersData.filter((user: IGroupMember) => {
          try {
            const isSystem = isSystemAccount(user);
            const isSelfReference = isCurrentGroup(user, currentGroupName);
            return !isSystem && !isSelfReference;
          } catch {
            return false;
          }
        });

        // Keep only displayable principals
        const sanitizedMembers = filteredMembers.filter(u => {
          const pt = Number(u?.PrincipalType);
          const title = (u?.Title || '').toString();
          const isDisplayableType =
            pt === SPPrincipalType.User || pt === SPPrincipalType.SharePointGroup;
          const isEveryone =
            isSpecialGroup(title) ||
            (u?.LoginName || '').toLowerCase().startsWith('c:0-.f|rolemanager|spo-grid-all-users');
          return isDisplayableType && !isEveryone;
        });

        SPContext.logger.info('GroupViewer filtered members', {
          groupName: currentGroupName,
          finalCount: sanitizedMembers.length,
          originalCount: usersData.length,
        });

        // Cache the result
        const info = groupData as IGroupInfo;
        cacheRef.current.set(cacheKey, {
          info,
          members: sanitizedMembers,
          ts: Date.now(),
        });

        // Update state
        if (isMountedRef.current) {
          setGroupInfo(info);
          setMembers(sanitizedMembers);
        }
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load group data');
      SPContext.logger.error('GroupViewer failed to load group data', error, {
        groupId,
        groupName,
      });

      if (isMountedRef.current) {
        setError(error.message);
      }

      if (onError) {
        onError(error);
      }
    } finally {
      loadingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [groupId, groupName, bustCache, nestLevel, maxNestLevel, onError]);

  // Callout event handlers
  const showCallout = React.useCallback((): void => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Clear previous group data to prevent showing stale data from different group
    setMembers([]);
    setGroupInfo(null);
    setError(null);

    // Show the callout immediately
    setIsCalloutVisible(true);

    // Start loading data with delay
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = setTimeout(() => {
      loadGroupData();
    }, CACHE_CONSTANTS.TOOLTIP_DELAY);
  }, [loadGroupData]);

  const hideCallout = React.useCallback((): void => {
    // Cancel any pending data load
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // Delay hiding to allow moving mouse to callout
    hideTimeoutRef.current = setTimeout(() => {
      setIsCalloutVisible(false);
      // Clear data when hiding to prevent stale data on next show
      setMembers([]);
      setGroupInfo(null);
      setError(null);
    }, 200);
  }, []);

  const keepCalloutVisible = React.useCallback((): void => {
    // Clear hide timeout when mouse enters callout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Click handler
  const handleClick = (): void => {
    if (onClick) {
      onClick(groupName, groupInfo?.Id || groupId);
    }
  };

  // Get persona color
  const getPersonaColor = (displayName: string): PersonaInitialsColor => {
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

    const index = PersonaUtils.getPersonaColorIndex(displayName);
    return colors[index];
  };

  // Render user or group member with LivePersona support
  const renderMember = (member: IGroupMember): React.ReactElement => {
    const isGroup = member.PrincipalType === SPPrincipalType.SharePointGroup;

    if (isGroup) {
      // Nested group - recursive GroupViewer if within nesting limits
      const canNest = nestLevel < maxNestLevel;

      return (
        <div key={member.Id} className='group-viewer-member-item'>
          <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign='center'>
            {canNest ? (
              <div className='group-viewer-nested-group-item'>
                <GroupViewer
                  groupId={member.Id}
                  groupName={member.Title}
                  displayMode='icon'
                  size={24}
                  nestLevel={nestLevel + 1}
                  maxNestLevel={maxNestLevel}
                  bustCache={bustCache}
                />
              </div>
            ) : (
              <div className='group-viewer-nested-group-icon'>
                <Icon
                  iconName='Group'
                  styles={{
                    root: {
                      fontSize: 13,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      padding: 0,
                      lineHeight: 1,
                    },
                  }}
                />
              </div>
            )}
            <Stack style={{ flex: 1, minWidth: 0 }}>
              <Text className='group-viewer-member-name'>{member.Title}</Text>
              <Text className='group-viewer-member-type'>SharePoint Group</Text>
            </Stack>
          </Stack>
        </div>
      );
    }

    // User - try LivePersona first, fallback to regular Persona
    const upn = PersonaUtils.getBestUpn(member);
    const canShowLivePersona = PersonaUtils.canShowLivePersona(member);

    return (
      <div key={member.Id} className='group-viewer-member-item'>
        <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign='center'>
          <div className='group-viewer-live-persona-container'>
            {canShowLivePersona && upn ? (
              <LivePersona
                upn={upn}
                disableHover={false}
                serviceScope={SPContext.spfxContext.serviceScope}
              />
            ) : (
              <Persona
                size={PersonaSize.size28}
                text=''
                initialsColor={getPersonaColor(member.Title)}
                imageInitials={PersonaUtils.getInitials(member.Title)}
                className='group-viewer-fallback-persona'
              />
            )}
          </div>
          <Stack style={{ flex: 1, minWidth: 0 }}>
            <Text className='group-viewer-member-name'>{member.Title}</Text>
            {member.Email && <Text className='group-viewer-member-email'>{member.Email}</Text>}
          </Stack>
        </Stack>
      </div>
    );
  };

  // Render tooltip content
  const renderTooltipContent = (): React.ReactElement => {
    if (isLoading) {
      return (
        <div className='group-viewer-tooltip loading'>
          <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign='center'>
            <Spinner size={SpinnerSize.small} />
            <Stack>
              <Text variant='medium' style={{ fontWeight: 600 }}>
                Loading {groupName}
              </Text>
              <Text variant='small' style={{ color: '#605e5c' }}>
                Fetching group information...
              </Text>
            </Stack>
          </Stack>
        </div>
      );
    }

    if (error) {
      return (
        <div className='group-viewer-tooltip error'>
          <Stack tokens={{ childrenGap: 12 }}>
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
              <Icon iconName='Error' style={{ color: '#d13438', fontSize: 20 }} />
              <Text variant='medium' className='group-viewer-member-name'>
                {groupInfo?.Title || groupName}
              </Text>
            </Stack>
            <Text variant='small' style={{ color: '#d13438', lineHeight: 1.4 }}>
              {error.includes('404') ? 'Group not found or access denied' : error}
            </Text>
          </Stack>
        </div>
      );
    }

    const currentGroupName = groupInfo?.Title || groupName;

    // Special group handling
    if (isSpecialGroup(currentGroupName)) {
      // Don't show description if it matches the group name
      const showSpecialDescription = groupInfo?.Description &&
        groupInfo.Description.toLowerCase().trim() !== currentGroupName.toLowerCase().trim();

      return (
        <div className='group-viewer-tooltip special-group'>
          <div className='group-viewer-tooltip-header'>
            <div className='group-viewer-title'>
              <Icon
                iconName={iconName}
                styles={{
                  root: {
                    fontSize: 20,
                    color: '#0078d4',
                    flexShrink: 0,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>{currentGroupName}</span>
              <span className='group-viewer-member-count group-viewer-special-badge'>Special Group</span>
            </div>
            {showSpecialDescription && (
              <div className='group-viewer-description'>{groupInfo.Description}</div>
            )}
          </div>

          <div style={{ padding: '16px 20px' }}>
            <Stack tokens={{ childrenGap: 12 }}>
              <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign='center'>
                <Icon iconName='People' style={{ fontSize: 24, color: '#0078d4', opacity: 0.7 }} />
                <Stack style={{ flex: 1 }}>
                  <Text variant='medium' style={{ fontWeight: 500, color: '#323130' }}>
                    {currentGroupName.includes('Everyone')
                      ? 'All Organization Users'
                      : 'Dynamic Membership'}
                  </Text>
                  <Text variant='small' style={{ color: '#605e5c', lineHeight: 1.3 }}>
                    This is a special SharePoint group with automatic membership. Individual members
                    are not displayed for performance reasons.
                  </Text>
                </Stack>
              </Stack>

              {currentGroupName.toLowerCase().includes('everyone') && (
                <div
                  style={{
                    background: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef',
                    marginTop: '8px',
                  }}
                >
                  <Text variant='small' style={{ color: '#495057', fontStyle: 'italic' }}>
                    💡 This group automatically includes all authenticated users in your
                    organization.
                  </Text>
                </div>
              )}
            </Stack>
          </div>
        </div>
      );
    }

    const users = members.filter(m => m.PrincipalType === SPPrincipalType.User);
    const nestedGroups = members.filter(m => m.PrincipalType === SPPrincipalType.SharePointGroup);

    // Empty group
    if (users.length === 0 && nestedGroups.length === 0) {
      const emptyGroupTitle = groupInfo?.Title || groupName;
      // Don't show description if it matches the group name
      const showEmptyDescription = groupInfo?.Description &&
        groupInfo.Description.toLowerCase().trim() !== emptyGroupTitle.toLowerCase().trim();

      return (
        <div className='group-viewer-tooltip empty'>
          <div className='group-viewer-tooltip-header'>
            <div className='group-viewer-title'>
              <Icon
                iconName={iconName}
                styles={{
                  root: {
                    fontSize: 20,
                    color: '#0078d4',
                    flexShrink: 0,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>{emptyGroupTitle}</span>
              <span className='group-viewer-member-count'>0 members</span>
            </div>
            {showEmptyDescription && (
              <div className='group-viewer-description'>{groupInfo.Description}</div>
            )}
          </div>

          <div style={{ padding: '16px 20px' }}>
            <Stack tokens={{ childrenGap: 12 }}>
              <Stack
                horizontal
                tokens={{ childrenGap: 12 }}
                verticalAlign='center'
                style={{
                  padding: '16px',
                  background: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef',
                }}
              >
                <Icon
                  iconName='People'
                  style={{
                    fontSize: 32,
                    color: '#0078d4',
                    opacity: 0.5,
                    flexShrink: 0,
                  }}
                />
                <Stack style={{ flex: 1 }}>
                  <Text variant='medium' style={{ fontWeight: 500, color: '#323130' }}>
                    No Members
                  </Text>
                  <Text variant='small' style={{ color: '#605e5c', lineHeight: 1.4 }}>
                    This group currently has no members, or you may not have permission to view the
                    membership.
                  </Text>
                </Stack>
              </Stack>
            </Stack>
          </div>
        </div>
      );
    }

    // Regular group with members
    const memberCount = users.length + nestedGroups.length;
    const regularGroupTitle = groupInfo?.Title || groupName;
    // Don't show description if it matches the group name
    const showDescription = groupInfo?.Description &&
      groupInfo.Description.toLowerCase().trim() !== regularGroupTitle.toLowerCase().trim();

    return (
      <div className='group-viewer-tooltip'>
        <div className='group-viewer-tooltip-header'>
          <div className='group-viewer-title'>
            <Icon
              iconName={iconName}
              styles={{
                root: {
                  fontSize: 20,
                  color: '#0078d4',
                  flexShrink: 0,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              }}
            />
            <span style={{ flex: 1, minWidth: 0 }}>{regularGroupTitle}</span>
            <span className='group-viewer-member-count'>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
          {showDescription && (
            <div className='group-viewer-description'>{groupInfo.Description}</div>
          )}
        </div>

        <div style={{ padding: '16px 20px' }}>
          <Stack tokens={{ childrenGap: 16 }}>
            {users.length > 0 && (
              <Stack tokens={{ childrenGap: 8 }}>
                {users.map((user, idx) => (
                  <div key={`user-${idx}`} className='group-viewer-user-item'>
                    <UserPersona
                      userIdentifier={user.LoginName || user.Email || user.Id.toString()}
                      displayName={user.Title}
                      email={user.Email}
                      size={32}
                      displayMode='avatarAndName'
                      showLivePersona={true}
                      showSecondaryText={true}
                    />
                  </div>
                ))}
              </Stack>
            )}

            {nestedGroups.length > 0 && (
              <Stack tokens={{ childrenGap: 12 }}>
                {users.length > 0 && (
                  <div className='group-viewer-section-header'>Groups ({nestedGroups.length})</div>
                )}
                <Stack tokens={{ childrenGap: 8 }}>{nestedGroups.map(renderMember)}</Stack>
              </Stack>
            )}
          </Stack>
        </div>
      </div>
    );
  };

  // Render display content
  const renderDisplayContent = (): React.ReactElement => {
    const iconSize = React.useMemo(() => Math.max(12, Math.round(size * 0.45)), [size]);
    const fontSize = React.useMemo(() => Math.max(12, size * 0.35), [size]);

    switch (displayMode) {
      case 'icon':
        return (
          <div className='group-viewer-icon-only' style={{ width: size, height: size }}>
            <Icon
              iconName={iconName}
              styles={{
                root: {
                  fontSize: iconSize,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  margin: 0,
                  padding: 0,
                  lineHeight: 1,
                },
              }}
            />
          </div>
        );

      case 'name':
        return (
          <Text
            variant='small'
            className='group-viewer-name-only'
            style={{ fontSize: fontSize, lineHeight: `${size}px` }}
            nowrap
          >
            {groupName}
          </Text>
        );

      case 'iconAndName':
      default:
        return (
          <Stack horizontal tokens={{ childrenGap: 6 }} verticalAlign='center'>
            <Icon
              iconName={iconName}
              styles={{
                root: {
                  fontSize: iconSize,
                  color: 'inherit',
                  lineHeight: 1,
                },
              }}
            />
            <Text
              variant='small'
              className='group-viewer-name-with-icon'
              style={{ fontSize: fontSize }}
              nowrap
            >
              {groupName}
            </Text>
          </Stack>
        );
    }
  };

  // Container styles
  const containerStyle: React.CSSProperties = React.useMemo(
    () => ({
      display: 'inline-flex',
      alignItems: 'center',
      cursor: onClick ? 'pointer' : 'default',
      color: 'inherit',
      minHeight: size,
      borderRadius: displayMode === 'icon' ? '50%' : '4px',
      padding: displayMode === 'icon' ? 0 : '2px 4px',
      ...(displayMode === 'icon' && {
        width: size,
        height: size,
        justifyContent: 'center',
      }),
    }),
    [onClick, size, displayMode]
  );

  return (
    <>
      <div
        ref={targetElementRef}
        className={`group-viewer ${className}`}
        style={containerStyle}
        onClick={handleClick}
        onMouseEnter={showCallout}
        onMouseLeave={hideCallout}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && onClick) {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={onClick ? 0 : -1}
        role={onClick ? 'button' : 'text'}
        aria-label={`${groupName} group${onClick ? ', click to open' : ''}`}
      >
        {renderDisplayContent()}
      </div>

      {isCalloutVisible && targetElementRef.current && (
        <Callout
          target={targetElementRef.current}
          directionalHint={DirectionalHint.bottomCenter}
          isBeakVisible={true}
          gapSpace={8}
          onDismiss={hideCallout}
          onMouseEnter={keepCalloutVisible}
          onMouseLeave={hideCallout}
          styles={{
            root: {
              maxWidth: 380,
              padding: 0,
              filter: 'drop-shadow(0 8px 32px rgba(0, 0, 0, 0.12))',
            },
            calloutMain: {
              padding: 0,
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              boxShadow: 'none',
            },
          }}
        >
          {renderTooltipContent()}
        </Callout>
      )}
    </>
  );
};
