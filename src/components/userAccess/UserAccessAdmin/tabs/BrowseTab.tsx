// tabs/BrowseTab.tsx
import * as React from 'react';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';
import { IPersonaProps } from '@fluentui/react/lib/Persona';
import { PrincipalType } from '@pnp/spfx-controls-react/lib/controls/peoplepicker/PrincipalType';

import { SPContext } from '../../../../utilities/context';
import { UserPersona } from '../../../UserPersona';
import {
  useEffectiveItemPermission,
  useEffectiveListPermission,
  useLocalStorage,
  useUserAccess,
} from '../../../../hooks';
import { DirectPermissionsTable } from '../../primitives/DirectPermissionsTable';
import { PermissionLevelBadge } from '../../primitives/PermissionLevelBadge';
import { UserGroupChips } from '../../primitives/UserGroupChips';
import type { ListRef, UserAccessError } from '../../../../utilities/userAccess';

const PeoplePicker = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/PeoplePicker').then((m) => ({
    default: m.PeoplePicker,
  }))
);

interface IBrowseTabProps {
  onError?: (e: UserAccessError) => void;
}

type RecentUser = { login: string; title: string };

// PnP PeoplePicker extends IPersonaProps at runtime with extra fields
interface IPickedPersona extends IPersonaProps {
  loginName: string;
  text: string;
}

export const BrowseTab: React.FC<IBrowseTabProps> = ({ onError }) => {
  const { value: recents, setValue: setRecents } = useLocalStorage<RecentUser[]>(
    'spfx-toolkit.userAccess.recents',
    [] as RecentUser[]
  );
  const [login, setLogin] = React.useState<string | null>(null);
  const [pickedList, setPickedList] = React.useState<ListRef | null>(null);
  const [itemIdInput, setItemIdInput] = React.useState('');
  const itemId = /^\d+$/.test(itemIdInput) ? Number(itemIdInput) : null;

  const { data, loading, error } = useUserAccess(login);
  const level2 = useEffectiveListPermission(login, pickedList);
  const level3 = useEffectiveItemPermission(login, pickedList, itemId);

  React.useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  const handlePick = React.useCallback(
    (items: IPersonaProps[]): void => {
      if (!items || items.length === 0) {
        setLogin(null);
        return;
      }
      const picked = items[0] as IPickedPersona;
      if (!picked.loginName) {
        setLogin(null);
        return;
      }
      setLogin(picked.loginName);
      setRecents((prev: RecentUser[]) => {
        const next: RecentUser[] = [
          { login: picked.loginName, title: picked.text || picked.loginName },
          ...prev.filter((r) => r.login !== picked.loginName),
        ].slice(0, 5);
        return next;
      });
    },
    [setRecents]
  );

  const listOptions: IDropdownOption[] =
    data?.directListPermissions.map((d) => ({
      key: d.list.id,
      text: d.list.title,
    })) ?? [];

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <React.Suspense fallback={<Spinner />}>
        <PeoplePicker
          context={SPContext.peoplepickerContext}
          personSelectionLimit={1}
          principalTypes={[PrincipalType.User]}
          resolveDelay={300}
          ensureUser
          onChange={handlePick}
        />
      </React.Suspense>

      {!login && recents.length > 0 && (
        <Stack>
          <Text variant="small">Recent users:</Text>
          <Stack horizontal wrap tokens={{ childrenGap: 6 }}>
            {recents.map((r) => (
              <button
                key={r.login}
                type="button"
                className="spf-recentuser"
                onClick={() => setLogin(r.login)}
              >
                {r.title}
              </button>
            ))}
          </Stack>
        </Stack>
      )}

      {loading && <Spinner label="Loading user access…" />}
      {error && (
        <MessageBar messageBarType={MessageBarType.error}>
          {error.message}
        </MessageBar>
      )}

      {data && (
        <Stack tokens={{ childrenGap: 8 }}>
          <UserPersona
            userIdentifier={data.user.loginName}
            displayName={data.user.title}
            email={data.user.email}
            displayMode="avatarAndName"
            size={40}
          />
          <Text variant="mediumPlus">Site groups ({data.siteGroups.length})</Text>
          <UserGroupChips groups={data.siteGroups} emptyText="No site groups." />
          <Text variant="mediumPlus">
            Matched list role assignments ({data.directListPermissions.length})
          </Text>
          <DirectPermissionsTable
            lists={data.directListPermissions}
            onListClick={(ref) => setPickedList(ref)}
          />

          {pickedList && (
            <Stack tokens={{ childrenGap: 6 }}>
              <Text variant="mediumPlus">Drill down</Text>
              <Dropdown
                options={listOptions}
                selectedKey={pickedList.id ?? null}
                onChange={(_, opt) =>
                  setPickedList(opt ? { id: opt.key as string } : null)
                }
              />
              {level2.loading && <Spinner />}
              {level2.data && (
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <Text>Permission level:</Text>
                  <PermissionLevelBadge level={level2.data.permissionLevel} />
                </Stack>
              )}
              <TextField
                label="Item ID"
                value={itemIdInput}
                onChange={(_, v) => setItemIdInput(v ?? '')}
              />
              {level3.loading && <Spinner />}
              {level3.data && (
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <Text>Item permission:</Text>
                  <PermissionLevelBadge level={level3.data.permissionLevel} />
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
};
