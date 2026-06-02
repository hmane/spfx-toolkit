import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';

import { ErrorBoundary } from '../../ErrorBoundary';
import { UserPersona } from '../../UserPersona';
import {
  useEffectiveItemPermission,
  useEffectiveListPermission,
  useUserAccess,
} from '../../../hooks';
import { DirectPermissionsTable } from '../primitives/DirectPermissionsTable';
import { PermissionLevelBadge } from '../primitives/PermissionLevelBadge';
import { UserGroupChips } from '../primitives/UserGroupChips';
import type { ListRef } from '../../../utilities/userAccess';
import { IMyAccessViewProps } from './MyAccessView.types';
import './MyAccessView.css';

function plainEnglishSummary(
  hasGroups: boolean,
  hasDirect: boolean,
  allDirectUnverified: boolean
): string {
  if (!hasGroups && !hasDirect) return 'No permissions detected on this site.';
  if (hasGroups && !hasDirect)
    return "You're a member of one or more site groups.";
  if (!hasGroups && hasDirect) {
    return allDirectUnverified
      ? 'You may have permissions on specific lists via group or Everyone membership — attribution could not be individually confirmed.'
      : 'You have permissions granted on specific lists.';
  }
  // hasGroups && hasDirect
  return allDirectUnverified
    ? "You're a member of site groups. List-specific permissions were detected via group or Everyone membership and could not be individually confirmed."
    : "You're a member of site groups AND have list-specific permissions.";
}

export const MyAccessView: React.FC<IMyAccessViewProps> = ({
  className,
  title = 'My Access',
  showRefresh = true,
  onError,
}) => {
  const { data, loading, error, refresh } = useUserAccess('current');
  const [pickedList, setPickedList] = React.useState<ListRef | null>(null);
  const [itemIdInput, setItemIdInput] = React.useState<string>('');
  const itemId = /^\d+$/.test(itemIdInput) ? Number(itemIdInput) : null;
  const level2 = useEffectiveListPermission('current', pickedList);
  const level3 = useEffectiveItemPermission('current', pickedList, itemId);

  React.useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  const listOptions: IDropdownOption[] =
    data?.directListPermissions.map(d => ({
      key: d.list.id,
      text: d.list.title,
    })) ?? [];

  return (
    <ErrorBoundary>
      <div className={`spf-myaccess ${className ?? ''}`}>
        <Stack tokens={{ childrenGap: 12 }}>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
            <Text variant="xLarge">{title}</Text>
            {showRefresh && (
              <DefaultButton iconProps={{ iconName: 'Refresh' }} onClick={refresh} />
            )}
          </Stack>

          {loading && <Spinner label="Loading your access…" />}

          {error && (
            <MessageBar messageBarType={MessageBarType.error}>
              We couldn't load your access. {error.message}
            </MessageBar>
          )}

          {data && (
            <>
              {/* UserPersona requires userIdentifier: string; we use loginName from the resolved user */}
              <UserPersona
                userIdentifier={data.user.loginName}
                displayName={data.user.title}
                email={data.user.email}
                displayMode="avatarAndName"
                size={40}
              />
              <Text>
                {plainEnglishSummary(
                  data.siteGroups.length > 0,
                  data.directListPermissions.length > 0,
                  data.directListPermissions.length > 0 &&
                    data.directListPermissions.every(d => d.membershipUnverified)
                )}
              </Text>

              <Stack>
                <Text variant="mediumPlus">Your groups</Text>
                <UserGroupChips
                  groups={data.siteGroups}
                  emptyText="You're not a member of any site groups."
                />
              </Stack>

              <Stack>
                <Text variant="mediumPlus">Permissions on specific lists</Text>
                <DirectPermissionsTable
                  lists={data.directListPermissions}
                  emptyText="You don't have any list-specific permissions beyond your group memberships."
                  onListClick={(ref) => setPickedList(ref)}
                />
              </Stack>

              <Stack className="spf-myaccess__drilldown">
                <Text variant="mediumPlus">Check a specific list or item</Text>
                <Dropdown
                  placeholder="Pick a list/library…"
                  options={listOptions}
                  selectedKey={pickedList?.id ?? null}
                  onChange={(_, opt) =>
                    setPickedList(opt ? { id: opt.key as string } : null)
                  }
                />
                {level2.loading && <Spinner label="Checking permission…" />}
                {level2.data && (
                  <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                    <Text>Your permission on {level2.data.list.title}:</Text>
                    <PermissionLevelBadge level={level2.data.permissionLevel} />
                  </Stack>
                )}
                {pickedList && (
                  <>
                    <TextField
                      label="Optional item ID"
                      value={itemIdInput}
                      onChange={(_, v) => setItemIdInput(v ?? '')}
                    />
                    {level3.loading && <Spinner label="Checking item permission…" />}
                    {level3.data && (
                      <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                        <Text>On item {level3.data.itemId}:</Text>
                        <PermissionLevelBadge level={level3.data.permissionLevel} />
                      </Stack>
                    )}
                    {level3.error && (
                      <MessageBar messageBarType={MessageBarType.warning}>
                        {level3.error.message}
                      </MessageBar>
                    )}
                  </>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </div>
    </ErrorBoundary>
  );
};
