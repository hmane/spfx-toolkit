import * as React from 'react';
import { List } from '@fluentui/react/lib/List';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { UserPersona } from '../../UserPersona';
import { useGroupMembers } from '../../../hooks';
import type { ISiteUser } from '../../../utilities/userAccess';
import { IGroupMembersListProps } from './GroupMembersList.types';
import './GroupMembersList.css';

/** Mirror the convention from ManageGroupsTab: virtualise when the list is long. */
const VIRTUALIZE_THRESHOLD = 50;

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

  /**
   * Renders a single member row.
   *
   * When `onMemberClick` is provided the row is interactive:
   *   - Rendered as a `<button>` so it is keyboard-focusable and announced
   *     correctly by screen readers without additional ARIA.
   *   - Activates on Enter and Space (native button behaviour).
   *   - Button default styles are reset so the visual appearance is unchanged.
   *
   * When `onMemberClick` is NOT provided the row is purely presentational and
   * carries no interactive semantics.
   */
  const renderMemberRow = React.useCallback(
    (member?: ISiteUser): React.ReactElement | null => {
      if (!member) return null;
      const persona = (
        /* ADAPT: UserPersona requires userIdentifier (string), not userId (number) */
        <UserPersona
          userIdentifier={member.loginName}
          displayName={member.title}
          email={member.email}
          displayMode="avatarAndName"
          size={32}
        />
      );

      if (onMemberClick) {
        return (
          <button
            key={member.id}
            type="button"
            className="spf-groupmembers__row spf-groupmembers__row--btn"
            onClick={() => onMemberClick(member.id)}
          >
            {persona}
          </button>
        );
      }

      return (
        <div key={member.id} className="spf-groupmembers__row">
          {persona}
        </div>
      );
    },
    [onMemberClick]
  );

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
        {filtered.length > VIRTUALIZE_THRESHOLD ? (
          <List items={filtered} onRenderCell={renderMemberRow as any} />
        ) : (
          filtered.map(m => renderMemberRow(m))
        )}
      </Stack>
    </div>
  );
};
