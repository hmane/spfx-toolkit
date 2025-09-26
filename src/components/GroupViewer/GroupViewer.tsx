import * as React from 'react';
import {
  TooltipHost,
  DirectionalHint,
  Stack,
  Text,
  Spinner,
  SpinnerSize,
  Icon,
} from '@fluentui/react';
import { LivePersona } from '@pnp/spfx-controls-react/lib/LivePersona';
import { spfi, SPFx } from '@pnp/sp';
import { Caching } from '@pnp/queryable';
import '@pnp/sp/site-groups';
import '@pnp/sp/site-users';
import '@pnp/sp/webs';
import '@pnp/sp/site-groups/web';
import '@pnp/sp/site-users/web';
import { IGroupViewerProps, IGroupMember, IGroupInfo, GroupViewerDefaultSettings } from './types';
import './GroupViewer.css';

export const GroupViewer: React.FC<IGroupViewerProps> = props => {
  const {
    spContext,
    groupId,
    groupName,
    size = GroupViewerDefaultSettings.size,
    displayMode = GroupViewerDefaultSettings.displayMode,
    iconName = GroupViewerDefaultSettings.iconName,
    className = '',
    onClick,
  } = props;

  // State
  const [members, setMembers] = React.useState<IGroupMember[]>([]);
  const [groupInfo, setGroupInfo] = React.useState<IGroupInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Refs and lightweight cache to avoid repeated network calls
  const loadTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const loadingRef = React.useRef(false);
  const cacheRef = React.useRef<Map<string, { info: IGroupInfo; members: IGroupMember[]; ts: number }>>(new Map());
  const isMountedRef = React.useRef(true);
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  // Minimal, consistent logging helper
  const log = (...args: any[]): void => console.log('[GroupViewer]', ...args);
  const logErr = (...args: any[]): void => console.error('[GroupViewer]', ...args);

  // Initialize PnP.js with SPFx context
  const sp = React.useMemo(() => {
    return spfi().using(SPFx(spContext));
  }, [spContext]);

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

  // More precise check for special SharePoint groups
  const isSpecialGroup = React.useCallback(
    (groupTitle: string): boolean => {
      const normalizedTitle = groupTitle.toLowerCase().trim();

      // Check for exact matches first
      const exactMatch = specialGroups.some(
        specialGroup => normalizedTitle === specialGroup.toLowerCase()
      );

      if (exactMatch) {
        return true;
      }

      // Only check for specific patterns that are definitely system groups
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

  // Enhanced system account detection - Less aggressive filtering
  const isSystemAccount = React.useCallback((user: any): boolean => {
    if (!user || (!user.Title && !user.LoginName)) return true;

    // More specific system patterns to avoid false positives
    const systemPatterns = [
      // Standard system accounts - exact matches
      'System Account',
      'SharePoint App',
      'SHAREPOINT\\system',
      'app@sharepoint',

      // Service accounts - more specific
      'NT AUTHORITY\\SYSTEM',
      'NT AUTHORITY\\LOCAL SERVICE',
      'NT AUTHORITY\\NETWORK SERVICE',
      'BUILTIN\\',

      // Claims-based system identities - more specific
      'c:0(.s|true',
      'c:0-.f|rolemanager|spo-grid', // RoleManager pattern
      'c:0!.s|windows',

      // SharePoint service accounts - specific
      'sharepoint\\system',
      'app@local',

      // Special/virtual org-wide groups we never want to display as members
      'Everyone except external users'
    ];

    const title = (user.Title || '').toLowerCase().trim();
    const loginName = (user.LoginName || '').toLowerCase().trim();
    const email = (user.Email || '').toLowerCase().trim();

    // Use more specific matching to avoid false positives
    const isSystemPattern = systemPatterns.some(pattern => {
      const lowerPattern = pattern.toLowerCase();
      return (
        title === lowerPattern ||
        loginName === lowerPattern ||
        loginName.startsWith(lowerPattern) ||
        (email && email === lowerPattern)
      );
    });

    // More specific system account characteristics
    const isSystemByCharacteristics =
      // Very specific suspicious login patterns
      loginName.startsWith('c:0-.f|rolemanager|spo-grid') ||
      loginName.startsWith('c:0!.s|windows') ||
      // App-only principals - be more specific
      (loginName.includes('app@') && loginName.endsWith('.local'));

    const result = isSystemPattern || isSystemByCharacteristics;
    return result;
  }, []);

  // Check if member is the current group itself
  const isCurrentGroup = React.useCallback((user: any, currentGroupName: string): boolean => {
    return (
      user.Title === currentGroupName ||
      user.LoginName === currentGroupName ||
      (user.PrincipalType === 8 && user.Title === currentGroupName)
    );
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, []);

  // ENHANCED: Load group data with special group handling
  const loadGroupData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      let group;
      const cacheKey = `group_${groupId ?? groupName}`.toLowerCase();

      // Serve from cache if fresh and avoid duplicate inflight loads
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        log('Cache hit', { cacheKey });
        if (isMountedRef.current) {
          setGroupInfo(cached.info);
          setMembers(cached.members);
          setIsLoading(false);
        }
        return;
      }
      if (loadingRef.current) {
        log('Load skipped: already loading');
        return;
      }
      loadingRef.current = true;

      if (groupId) {
        group = sp.web.siteGroups.getById(groupId);
      } else {
        group = sp.web.siteGroups.getByName(groupName);
      }

      log('Loading group info', { by: groupId ? 'id' : 'name', groupId, groupName });

      // Load group info first
      const groupData = await group.select('Id', 'Title', 'Description', 'LoginName').using(
        Caching({
          store: 'session',
          keyFactory: () => `${cacheKey}_info`,
          expireFunc: () => new Date(Date.now() + 15 * 60 * 1000),
        })
      )();

      const currentGroupName = groupData.Title || groupName;

      log(`Loaded group info for "${currentGroupName}" (ID: ${groupData.Id})`);

      // Check if this is a special group that shouldn't show member details
      const isSpecial = isSpecialGroup(currentGroupName);
      if (isSpecial) {
        log(`Special group detected: "${currentGroupName}" – skipping member enumeration`);
        setGroupInfo(groupData as IGroupInfo);
        setMembers([]); // Don't show members for special groups
        setIsLoading(false);
        loadingRef.current = false;
        return;
      }

      log(`Loading members for group "${currentGroupName}" (ID: ${groupData.Id})`);

      let usersData: any[] = [];
      try {
        const targetGroup = groupData.Id
          ? sp.web.siteGroups.getById(groupData.Id)
          : sp.web.siteGroups.getByName(currentGroupName);

        usersData = await targetGroup.users
          .select('Id','Title','Email','LoginName','PrincipalType')
          .top(5000)();

        if (!Array.isArray(usersData)) {
          log('Unexpected users response shape; coercing to empty array');
          usersData = [];
        }
      } catch (membersError) {
        logErr('Failed to load group members via PnP', membersError);
        throw membersError;
      }

      if (usersData.length === 0) {
        setGroupInfo(groupData as IGroupInfo);
        setMembers([]);
        setIsLoading(false);
        loadingRef.current = false;
        return;
      }

      log(`Loaded ${usersData.length} raw members for "${currentGroupName}"`);

      // Filter out system accounts and self-references
      const filteredMembers = usersData.filter((user: any) => {
        try {
          const isSystem = isSystemAccount(user);
          const isSelfReference = isCurrentGroup(user, currentGroupName);
          const shouldKeep = !isSystem && !isSelfReference;
          return shouldKeep;
        } catch (_filterError) {
          return false;
        }
      });

      // Only keep displayable principals (Users and SharePoint Groups) and drop special virtual groups
      const sanitizedMembers = filteredMembers.filter(u => {
        const pt = Number(u?.PrincipalType);
        const title = (u?.Title || '').toString();
        const isDisplayableType = pt === 1 || pt === 8; // 1=User, 8=SharePoint Group
        const isEveryone = isSpecialGroup(title) || (u?.LoginName || '').toLowerCase().startsWith('c:0-.f|rolemanager|spo-grid-all-users');
        return isDisplayableType && !isEveryone;
      });

      log(`Kept ${sanitizedMembers.length}/${usersData.length} members after filtering`);

      // Cache the result
      const info = groupData as IGroupInfo;
      cacheRef.current.set(cacheKey, { info, members: sanitizedMembers as IGroupMember[], ts: Date.now() });

      // Safe state updates
      if (isMountedRef.current) {
        setGroupInfo(info);
        setMembers(sanitizedMembers as IGroupMember[]);
      }
    } catch (err) {
      logErr('Failed to load group data', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load group data');
      }
    } finally {
      loadingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Tooltip event handlers
  const onTooltipShow = React.useCallback((): void => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = setTimeout(() => {
      loadGroupData();
    }, 300);
  }, []);

  const onTooltipHide = React.useCallback((): void => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  // Click handler
  const handleClick = (): void => {
    if (onClick) {
      onClick(groupName, groupInfo?.Id || groupId);
    }
  };

  // ENHANCED: Tooltip content renderer with special group handling
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

    // Special handling for special groups
    const currentGroupName = groupInfo?.Title || groupName;
    if (isSpecialGroup(currentGroupName)) {
      return (
        <div className='group-viewer-tooltip special-group'>
          {/* Header for special groups */}
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
            </div>
            <div className='group-viewer-subtitle'>Special SharePoint Group</div>
            {groupInfo?.Description && (
              <div className='group-viewer-description'>{groupInfo.Description}</div>
            )}
          </div>

          {/* Content for special groups */}
          <div style={{ padding: '16px 20px' }}>
            <Stack tokens={{ childrenGap: 12 }}>
              <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign='center'>
                <Icon
                  iconName='People'
                  style={{
                    fontSize: 24,
                    color: '#0078d4',
                    opacity: 0.7,
                  }}
                />
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

    const users = members.filter(m => m.PrincipalType === 1);
    const nestedGroups = members.filter(m => m.PrincipalType === 8);

    // Regular group handling - Better empty group messaging
    if (users.length === 0 && nestedGroups.length === 0) {
      return (
        <div className='group-viewer-tooltip empty'>
          {/* Header for empty groups */}
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
              <span style={{ flex: 1, minWidth: 0 }}>{groupInfo?.Title || groupName}</span>
            </div>
            <div className='group-viewer-subtitle'>SharePoint Group</div>
            {groupInfo?.Description && (
              <div className='group-viewer-description'>{groupInfo.Description}</div>
            )}
          </div>

          {/* Content for empty groups */}
          <div style={{ padding: '16px 20px' }}>
            <Stack tokens={{ childrenGap: 12 }}>
              <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign='center'>
                <Icon
                  iconName='Info'
                  style={{
                    fontSize: 20,
                    color: '#605e5c',
                    opacity: 0.7,
                  }}
                />
                <Stack style={{ flex: 1 }}>
                  <Text variant='medium' style={{ fontWeight: 500, color: '#323130' }}>
                    No Members Found
                  </Text>
                  <Text variant='small' style={{ color: '#605e5c', lineHeight: 1.3 }}>
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


    return (
      <div className='group-viewer-tooltip'>
        {/* Enhanced Header */}
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
            <span style={{ flex: 1, minWidth: 0 }}>{groupInfo?.Title || groupName}</span>
          </div>
          <div className='group-viewer-subtitle'>
            {users.length + nestedGroups.length} {(users.length + nestedGroups.length) === 1 ? 'member' : 'members'}
          </div>
          {groupInfo?.Description && (
            <div className='group-viewer-description'>{groupInfo.Description}</div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px' }}>
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Users Section */}
            {users.length > 0 && (
              <Stack tokens={{ childrenGap: 8 }}>
                {users.map(user => (
                  <div key={user.Id} className='group-viewer-member-item'>
                    <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign='center'>
                      <div className='group-viewer-live-persona-small'>
                        <LivePersona
                          upn={user.Email || user.Title}
                          disableHover={false}
                          serviceScope={spContext.serviceScope}
                        />
                      </div>
                      <Stack style={{ flex: 1, minWidth: 0 }}>
                        <Text className='group-viewer-member-name'>{user.Title}</Text>
                        {user.Email && (
                          <Text className='group-viewer-member-email'>{user.Email}</Text>
                        )}
                      </Stack>
                    </Stack>
                  </div>
                ))}
              </Stack>
            )}

            {/* Nested Groups Section */}
            {nestedGroups.length > 0 && (
              <Stack tokens={{ childrenGap: 12 }}>
                {users.length > 0 && (
                  <div className='group-viewer-section-header'>Groups ({nestedGroups.length})</div>
                )}
                <Stack tokens={{ childrenGap: 8 }}>
                  {nestedGroups.map(group => (
                    <div key={group.Id} className='group-viewer-member-item'>
                      <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign='center'>
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
                        <Stack style={{ flex: 1, minWidth: 0 }}>
                          <Text className='group-viewer-member-name'>{group.Title}</Text>
                          <Text className='group-viewer-member-type'>SharePoint Group</Text>
                        </Stack>
                      </Stack>
                    </div>
                  ))}
                </Stack>
              </Stack>
            )}
          </Stack>
        </div>
      </div>
    );
  };

  // Enhanced display content renderer with proper icon centering
  const renderDisplayContent = (): React.ReactElement => {
    // Memoize expensive size computations
    const iconSize = React.useMemo(() => Math.max(12, Math.round(size * 0.45)), [size]);
    const fontSize = React.useMemo(() => Math.max(12, size * 0.35), [size]);

    switch (displayMode) {
      case 'icon':
        return (
          <div
            className='group-viewer-icon-only'
            style={{
              width: size,
              height: size,
            }}
          >
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
            style={{
              fontSize: fontSize,
              lineHeight: `${size}px`,
            }}
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

  // Enhanced container styles
  const containerStyle: React.CSSProperties = React.useMemo(() => ({
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
  }), [onClick, size, displayMode]);

  // Stable tooltip toggle handler
  const onTooltipToggle = React.useCallback((visible: boolean) => {
    if (visible) {
      onTooltipShow();
    } else {
      onTooltipHide();
    }
  }, [onTooltipShow, onTooltipHide]);

  // Main render with enhanced tooltip
  return (
    <TooltipHost
      content={renderTooltipContent()}
      directionalHint={DirectionalHint.bottomCenter}
      delay={0}
      onTooltipToggle={onTooltipToggle}
      styles={{
        root: {
          display: 'inline-block',
        },
      }}
      tooltipProps={{
        styles: {
          root: {
            maxWidth: 380,
            padding: 0,
            filter: 'drop-shadow(0 8px 32px rgba(0, 0, 0, 0.12))',
          },
          content: {
            padding: 0,
            background: 'transparent',
            border: 'none',
            borderRadius: 8,
            boxShadow: 'none',
          },
        },
      }}
    >
      <div
        className={`group-viewer ${className}`}
        style={containerStyle}
        onClick={handleClick}
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
    </TooltipHost>
  );
};
