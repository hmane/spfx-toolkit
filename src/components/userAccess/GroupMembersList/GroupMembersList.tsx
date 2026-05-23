import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { UserPersona } from '../../UserPersona';
import { useGroupMembers } from '../../../hooks';
import { IGroupMembersListProps } from './GroupMembersList.types';
import './GroupMembersList.css';

export const GroupMembersList: React.FC<IGroupMembersListProps> = ({
  groupRef,
  className,
  showSearch = true,
  maxHeight = 400,
  onMemberClick,
  emptyText = 'No members.',
}) => {
  const { data, loading, error } = useGroupMembers(groupRef);
  const [filter, setFilter] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data;
    return data.filter(m =>
      [m.title, m.email ?? '', m.loginName].some(s =>
        s.toLowerCase().includes(q)
      )
    );
  }, [data, filter]);

  return (
    <div
      className={`spf-groupmembers ${className ?? ''}`}
      style={{ maxHeight }}
    >
      <Stack tokens={{ childrenGap: 8 }}>
        {showSearch && (
          <SearchBox
            placeholder="Search members…"
            value={filter}
            onChange={(_, v) => setFilter(v ?? '')}
          />
        )}
        {loading && <Spinner label="Loading members…" />}
        {error && (
          <MessageBar messageBarType={MessageBarType.error}>
            {error.message}
          </MessageBar>
        )}
        {!loading && filtered.length === 0 && !error && (
          <Text variant="small">{emptyText}</Text>
        )}
        {filtered.map(m => (
          <div
            key={m.id}
            className="spf-groupmembers__row"
            onClick={() => onMemberClick?.(m.id)}
          >
            {/* ADAPT: UserPersona requires userIdentifier (string), not userId (number) */}
            <UserPersona
              userIdentifier={m.loginName}
              displayName={m.title}
              email={m.email}
              displayMode="avatarAndName"
              size={32}
            />
          </div>
        ))}
      </Stack>
    </div>
  );
};
