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
  const [loadTimeout, setLoadTimeout] = React.useState<NodeJS.Timeout | null>(null);

  // Initialize PnP.js with SPFx context
  const sp = React.useMemo(() => {
    return spfi().using(SPFx(spContext));
  }, [spContext]);

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
      'c:0-.f|rolemanager|spo-grid',
      'c:0!.s|windows',

      // SharePoint service accounts - specific
      'sharepoint\\system',
      'app@local',
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

    // Debug logging for troubleshooting
    if (result) {
      console.log(
        `GroupViewer: Filtered system account - Title: "${user.Title}", LoginName: "${user.LoginName}"`
      );
    } else {
      console.log(
        `GroupViewer: Keeping user - Title: "${user.Title}", LoginName: "${user.LoginName}", Email: "${user.Email}"`
      );
    }

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
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [loadTimeout]);

  // Load group data with enhanced caching
  const loadGroupData = async (): Promise<void> => {
    if (members.length > 0) return; // Already loaded

    setIsLoading(true);
    setError(null);

    try {
      let group;
      const cacheKey = `group_${groupId || groupName.replace(/\s+/g, '_')}`;

      if (groupId) {
        group = sp.web.siteGroups.getById(groupId);
      } else {
        group = sp.web.siteGroups.getByName(groupName);
      }

      // Load group info and members in parallel with caching
      const [groupData, usersResponse] = await Promise.all([
        group.select('Id', 'Title', 'Description', 'LoginName').using(
          Caching({
            store: 'session',
            keyFactory: () => `${cacheKey}_info`,
            expireFunc: () => new Date(Date.now() + 15 * 60 * 1000),
          })
        )(),

        group.users.using(
          Caching({
            store: 'session',
            keyFactory: () => `${cacheKey}_members`,
            expireFunc: () => new Date(Date.now() + 5 * 60 * 1000),
          })
        )(),
      ]);

      const usersData = Array.isArray(usersResponse) ? usersResponse : [];
      const currentGroupName = groupData.Title || groupName;

      console.log(
        `GroupViewer: Processing group "${currentGroupName}" with ${usersData.length} raw members`
      );

      // Filter out system accounts and self-references with detailed logging
      const filteredMembers = usersData.filter((user: any, index: number) => {
        try {
          console.log(`GroupViewer: Checking user ${index + 1}:`, {
            Title: user.Title,
            LoginName: user.LoginName,
            Email: user.Email,
            PrincipalType: user.PrincipalType,
          });

          const isSystem = isSystemAccount(user);
          const isSelfReference = isCurrentGroup(user, currentGroupName);
          const shouldKeep = !isSystem && !isSelfReference;

          console.log(
            `GroupViewer: User "${user.Title}" - System: ${isSystem}, SelfRef: ${isSelfReference}, Keep: ${shouldKeep}`
          );

          return shouldKeep;
        } catch (filterError) {
          console.warn('GroupViewer: Error filtering user:', user, filterError);
          return false;
        }
      });

      console.log(
        `GroupViewer: Final results - Kept ${filteredMembers.length} out of ${usersData.length} members`
      );
      console.log(
        'GroupViewer: Kept members:',
        filteredMembers.map(u => u.Title)
      );

      // Fallback: if no members after filtering but we have raw data, show a less filtered version
      let finalMembers = filteredMembers;
      if (filteredMembers.length === 0 && usersData.length > 0) {
        console.log('GroupViewer: No members after filtering, trying less aggressive filtering...');

        // Less aggressive filtering - only filter out obvious system accounts
        finalMembers = usersData.filter((user: any) => {
          const title = (user.Title || '').toLowerCase();
          const loginName = (user.LoginName || '').toLowerCase();

          // Only filter out very obvious system accounts
          const isObviousSystem =
            title === 'system account' ||
            title === 'sharepoint app' ||
            loginName.includes('sharepoint\\system') ||
            loginName.includes('app@sharepoint');

          const isSelfReference = isCurrentGroup(user, currentGroupName);

          return !isObviousSystem && !isSelfReference;
        });

        console.log(`GroupViewer: Less aggressive filtering kept ${finalMembers.length} members`);
      }

      setGroupInfo(groupData as IGroupInfo);
      setMembers(finalMembers as IGroupMember[]);
    } catch (err) {
      console.error('Error loading group data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load group data');
    } finally {
      setIsLoading(false);
    }
  };

  // Tooltip event handlers
  const onTooltipShow = (): void => {
    const timeout = setTimeout(() => {
      loadGroupData();
    }, 300);
    setLoadTimeout(timeout);
  };

  const onTooltipHide = (): void => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
  };

  // Click handler
  const handleClick = (): void => {
    if (onClick) {
      onClick(groupName, groupInfo?.Id || groupId);
    }
  };

  // Enhanced tooltip content renderer
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
                Fetching group members...
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

    if (members.length === 0) {
      return (
        <div className='group-viewer-tooltip empty'>
          <Stack tokens={{ childrenGap: 12 }}>
            <Text variant='medium' className='group-viewer-member-name'>
              {groupInfo?.Title || groupName}
            </Text>
            <Text variant='small' className='group-viewer-member-type'>
              This group has no visible members or you may not have permission to view them
            </Text>
          </Stack>
        </div>
      );
    }

    const users = members.filter(m => m.PrincipalType === 1);
    const nestedGroups = members.filter(m => m.PrincipalType === 8);

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
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </div>
          {groupInfo?.Description && (
            <div className='group-viewer-description'>{groupInfo.Description}</div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px' }}>
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Users Section - Remove redundant header */}
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

            {/* Nested Groups Section - Only show header if there are nested groups */}
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
    // Make icon size proportional to container size (40-50% of container size)
    const iconSize = Math.max(12, Math.round(size * 0.45));
    const fontSize = Math.max(12, size * 0.35);

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
  const containerStyle: React.CSSProperties = {
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
  };

  // Main render with enhanced tooltip
  return (
    <TooltipHost
      content={renderTooltipContent()}
      directionalHint={DirectionalHint.bottomCenter}
      delay={0}
      onTooltipToggle={visible => {
        if (visible) {
          onTooltipShow();
        } else {
          onTooltipHide();
        }
      }}
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
