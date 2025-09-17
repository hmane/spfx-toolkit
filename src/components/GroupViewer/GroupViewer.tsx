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
import { IGroupViewerProps, IGroupMember, IGroupInfo, DefaultProps } from './types';
import './GroupViewer.css';

export const GroupViewer: React.FC<IGroupViewerProps> = props => {
  const {
    spContext,
    groupId,
    groupName,
    size = DefaultProps.size,
    displayMode = DefaultProps.displayMode,
    iconName = DefaultProps.iconName,
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

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [loadTimeout]);

  // Load group data with caching
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
      const [groupData, usersData] = await Promise.all([
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

      setGroupInfo(groupData as IGroupInfo);
      setMembers(usersData as IGroupMember[]);
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
