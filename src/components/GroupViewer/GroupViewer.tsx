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

  // Enhanced system account detection (matching ManageAccess logic)
  const isSystemAccount = React.useCallback((user: any): boolean => {
    if (!user || (!user.Title && !user.LoginName)) return false;

    const systemPatterns = [
      // Standard system accounts
      'System Account',
      'SharePoint App',
      'SHAREPOINT\\system',
      'app@sharepoint',
      'SYSTEM',

      // Service accounts
      'Everyone',
      'NT AUTHORITY',
      'BUILTIN\\',

      // Claims-based system identities
      'c:0(.s|true',
      'c:0-.f|rolemanager|',
      'c:0-.t|',
      'c:0!.s|windows',

      // SharePoint service accounts
      's-1-0-0',
      'sharepoint\\',

      // Search and indexing accounts
      'Search',
      'Crawl',
      'MySite',

      // Anonymous and guest accounts
      'Anonymous',
      'Guest',

      // App-only tokens
      'app@local',
      'app@',
    ];

    const title = (user.Title || '').toLowerCase().trim();
    const loginName = (user.LoginName || '').toLowerCase().trim();
    const email = (user.Email || '').toLowerCase().trim();

    // Check against system patterns
    const isSystemPattern = systemPatterns.some(pattern => {
      const lowerPattern = pattern.toLowerCase();
      return (
        title.includes(lowerPattern) ||
        loginName.includes(lowerPattern) ||
        email.includes(lowerPattern)
      );
    });

    // Additional checks for specific system account characteristics
    const isSystemByCharacteristics =
      // No email and suspicious login name
      (!user.Email && loginName.startsWith('c:0')) ||
      // System-like ID patterns
      loginName.includes('|rolemanager|') ||
      loginName.includes('|membership|') ||
      // Hidden or deleted users
      title.startsWith('_') ||
      // App-only principals
      (loginName.includes('@') && loginName.includes('app'));

    return isSystemPattern || isSystemByCharacteristics;
  }, []);

  // Check if member is the current group itself (nested group reference)
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

  // Enhanced system account detection with more specific patterns
  const checkIfSystemAccount = React.useCallback((user: any): boolean => {
    if (!user || (!user.Title && !user.LoginName)) {
      console.log('GroupViewer: User has no Title or LoginName:', user);
      return true; // Filter out incomplete user objects
    }

    const systemPatterns = [
      // Standard system accounts - be more specific
      'System Account',
      'SharePoint App',
      'SHAREPOINT\\system',
      'app@sharepoint',

      // Service accounts - be more specific
      'NT AUTHORITY\\',
      'BUILTIN\\',

      // Claims-based system identities - be more specific
      'c:0(.s|true',
      'c:0-.f|rolemanager|',
      'c:0!.s|windows',

      // SharePoint service accounts
      'sharepoint\\system',

      // Search and indexing accounts
      'Search Service',
      'Crawl Account',

      // App-only tokens
      'app@local',
    ];

    const title = (user.Title || '').toLowerCase().trim();
    const loginName = (user.LoginName || '').toLowerCase().trim();
    const email = (user.Email || '').toLowerCase().trim();

    // Check against system patterns - be more specific in matching
    const isSystemPattern = systemPatterns.some(pattern => {
      const lowerPattern = pattern.toLowerCase();
      // Use exact matches or starts with for more precision
      return (
        title === lowerPattern ||
        title.startsWith(lowerPattern) ||
        loginName === lowerPattern ||
        loginName.startsWith(lowerPattern) ||
        (email && email.startsWith(lowerPattern))
      );
    });

    // More specific system account characteristics
    const isSystemByCharacteristics =
      // Very specific suspicious login patterns
      loginName.startsWith('c:0-.f|rolemanager|') ||
      loginName.startsWith('c:0!.s|windows') ||
      // Hidden or deleted users (starting with underscore)
      title.startsWith('_') ||
      // Very specific app patterns
      (loginName.includes('app@') && loginName.includes('.local'));

    const result = isSystemPattern || isSystemByCharacteristics;

    if (result) {
      console.log(
        `GroupViewer: Identified system account - Title: "${user.Title}", LoginName: "${user.LoginName}", Email: "${user.Email}"`
      );
    }

    return result;
  }, []);

  // Check if member is the current group itself (nested group reference)
  const checkIfCurrentGroup = React.useCallback((user: any, currentGroupName: string): boolean => {
    if (!user || !user.Title || !currentGroupName) return false;

    const result =
      user.Title === currentGroupName ||
      user.LoginName === currentGroupName ||
      (user.PrincipalType === 8 && user.Title === currentGroupName);

    if (result) {
      console.log(
        `GroupViewer: Identified self-reference - Title: "${user.Title}", Current Group: "${currentGroupName}"`
      );
    }

    return result;
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [loadTimeout]);

  // Load group data with caching and proper filtering
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
        // Group info with 15 minutes cache
        group.select('Id', 'Title', 'Description', 'LoginName').using(
          Caching({
            store: 'session',
            keyFactory: () => `${cacheKey}_info`,
            expireFunc: () => new Date(Date.now() + 15 * 60 * 1000),
          })
        )(),

        // Group members with 5 minutes cache
        group.users.using(
          Caching({
            store: 'session',
            keyFactory: () => `${cacheKey}_members`,
            expireFunc: () => new Date(Date.now() + 5 * 60 * 1000),
          })
        )(),
      ]);
      debugger;
      // Ensure usersResponse is an array
      const usersData = Array.isArray(usersResponse) ? usersResponse : [];

      console.log(`GroupViewer: Raw API response for "${groupName}":`, usersResponse);
      console.log(`GroupViewer: Users array length: ${usersData.length}`);

      // Log all users before filtering
      usersData.forEach((user, index) => {
        console.log(`GroupViewer: User ${index + 1}:`, {
          Title: user.Title,
          LoginName: user.LoginName,
          Email: user.Email,
          PrincipalType: user.PrincipalType,
          Id: user.Id,
        });
      });

      const currentGroupName = groupData.Title || groupName;
      console.log(`GroupViewer: Current group name: "${currentGroupName}"`);

      // Filter out system accounts AND the current group itself
      const filteredMembers = usersData.filter((user: any, index: number) => {
        try {
          const isSystem = checkIfSystemAccount(user);
          const isSelfReference = checkIfCurrentGroup(user, currentGroupName);
          const shouldKeep = !isSystem && !isSelfReference;

          console.log(
            `GroupViewer: User ${index + 1} "${
              user.Title
            }" - System: ${isSystem}, SelfRef: ${isSelfReference}, Keep: ${shouldKeep}`
          );

          return shouldKeep;
        } catch (filterError) {
          console.warn('GroupViewer: Error filtering user:', user, filterError);
          return false; // Filter out problematic entries
        }
      });

      console.log(`GroupViewer: Final results for "${currentGroupName}"`);
      console.log(`- Total members from API: ${usersData.length}`);
      console.log(`- After filtering: ${filteredMembers.length}`);
      console.log(
        `- Kept users:`,
        filteredMembers.map(u => u.Title)
      );

      setGroupInfo(groupData as IGroupInfo);
      setMembers(filteredMembers as IGroupMember[]);
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

  // Render tooltip content
  const renderTooltipContent = (): React.ReactElement => {
    if (isLoading) {
      return (
        <div className='group-viewer-tooltip loading'>
          <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
            <Spinner size={SpinnerSize.xSmall} />
            <Text variant='small'>Loading group members...</Text>
          </Stack>
        </div>
      );
    }

    if (error) {
      return (
        <div className='group-viewer-tooltip error'>
          <Stack tokens={{ childrenGap: 8 }}>
            <Stack horizontal tokens={{ childrenGap: 4 }} verticalAlign='center'>
              <Icon iconName='Error' style={{ color: '#d13438' }} />
              <Text variant='medium' style={{ fontWeight: 600 }}>
                {groupInfo?.Title || groupName}
              </Text>
            </Stack>
            <Text variant='small' style={{ color: '#d13438' }}>
              {error}
            </Text>
          </Stack>
        </div>
      );
    }

    if (members.length === 0) {
      return (
        <div className='group-viewer-tooltip empty'>
          <Stack tokens={{ childrenGap: 8 }}>
            <Text variant='medium' style={{ fontWeight: 600 }}>
              {groupInfo?.Title || groupName}
            </Text>
            <Text variant='small' style={{ fontStyle: 'italic', color: '#605e5c' }}>
              No members found
            </Text>
          </Stack>
        </div>
      );
    }

    const users = members.filter(m => m.PrincipalType === 1);
    const nestedGroups = members.filter(m => m.PrincipalType === 8);

    return (
      <div className='group-viewer-tooltip'>
        <Stack tokens={{ childrenGap: 12 }}>
          {/* Header */}
          <Stack tokens={{ childrenGap: 4 }}>
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
              <Icon iconName={iconName} style={{ color: '#0078d4' }} />
              <Text variant='medium' style={{ fontWeight: 600 }}>
                {groupInfo?.Title || groupName}
              </Text>
            </Stack>
            <Text variant='small' style={{ color: '#605e5c' }}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Text>
            {groupInfo?.Description && (
              <Text variant='small' style={{ color: '#605e5c', fontStyle: 'italic' }}>
                {groupInfo.Description}
              </Text>
            )}
          </Stack>

          {/* Users Section */}
          {users.length > 0 && (
            <Stack tokens={{ childrenGap: 8 }}>
              <Text variant='small' style={{ fontWeight: 600, color: '#323130' }}>
                Users ({users.length})
              </Text>
              <Stack tokens={{ childrenGap: 6 }}>
                {users.map(user => (
                  <div key={user.Id} className='group-viewer-member-item'>
                    <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
                      <div className='group-viewer-live-persona-small'>
                        <LivePersona
                          upn={user.Email || user.Title}
                          disableHover={false}
                          serviceScope={spContext.serviceScope}
                        />
                      </div>
                      <Stack>
                        <Text variant='small' style={{ fontWeight: 500 }}>
                          {user.Title}
                        </Text>
                        {user.Email && (
                          <Text variant='xSmall' style={{ color: '#605e5c' }}>
                            {user.Email}
                          </Text>
                        )}
                      </Stack>
                    </Stack>
                  </div>
                ))}
              </Stack>
            </Stack>
          )}

          {/* Nested Groups Section */}
          {nestedGroups.length > 0 && (
            <Stack tokens={{ childrenGap: 8 }}>
              <Text variant='small' style={{ fontWeight: 600, color: '#323130' }}>
                Groups ({nestedGroups.length})
              </Text>
              <Stack tokens={{ childrenGap: 6 }}>
                {nestedGroups.map(group => (
                  <div key={group.Id} className='group-viewer-member-item'>
                    <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign='center'>
                      <div className='group-viewer-nested-group-icon'>
                        <Icon iconName='Group' />
                      </div>
                      <Stack>
                        <Text variant='small' style={{ fontWeight: 500 }}>
                          {group.Title}
                        </Text>
                        <Text variant='xSmall' style={{ color: '#605e5c', fontStyle: 'italic' }}>
                          SharePoint Group
                        </Text>
                      </Stack>
                    </Stack>
                  </div>
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </div>
    );
  };

  // Render display content based on display mode
  const renderDisplayContent = (): React.ReactElement => {
    const iconSize = Math.max(12, size * 0.4);

    switch (displayMode) {
      case 'icon':
        return (
          <div className='group-viewer-icon-only' style={{ fontSize: iconSize }}>
            <Icon iconName={iconName} />
          </div>
        );

      case 'name':
        return (
          <Text
            variant='small'
            className='group-viewer-name-only'
            style={{
              fontSize: Math.max(12, size * 0.3),
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
          <Stack horizontal tokens={{ childrenGap: 4 }} verticalAlign='center'>
            <Icon iconName={iconName} style={{ fontSize: iconSize }} />
            <Text
              variant='small'
              className='group-viewer-name-with-icon'
              style={{ fontSize: Math.max(12, size * 0.3) }}
              nowrap
            >
              {groupName}
            </Text>
          </Stack>
        );
    }
  };

  // Container styles
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    cursor: onClick ? 'pointer' : 'default',
    color: 'inherit',
    transition: 'opacity 0.2s ease',
    minHeight: size,
    ...(displayMode === 'icon' && {
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: '#0078d4',
      justifyContent: 'center',
      color: '#ffffff',
    }),
  };

  // Main render
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
            maxWidth: 350,
            padding: 0,
          },
          content: {
            padding: 16,
            background: '#ffffff',
            border: '1px solid #e1dfdd',
            borderRadius: 4,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          },
        },
      }}
    >
      <div
        className={`group-viewer ${className}`}
        style={containerStyle}
        onClick={handleClick}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        {renderDisplayContent()}
      </div>
    </TooltipHost>
  );
};
