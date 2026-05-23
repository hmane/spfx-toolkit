// tabs/CompareTab.tsx
import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { IPersonaProps } from '@fluentui/react/lib/Persona';
import { PrincipalType } from '@pnp/spfx-controls-react/lib/controls/peoplepicker/PrincipalType';

import { SPContext } from '../../../../utilities/context';
import {
  useUserAccessComparison,
  useEffectiveListPermission,
} from '../../../../hooks';
import { UserGroupChips } from '../../primitives/UserGroupChips';
import { PermissionLevelBadge } from '../../primitives/PermissionLevelBadge';
import { accessExportToCsv } from '../../../../utilities/userAccess';
import type {
  IDirectListPermission,
  ListRef,
  UserAccessError,
} from '../../../../utilities/userAccess';

const PeoplePicker = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/PeoplePicker').then((m) => ({
    default: m.PeoplePicker,
  }))
);

interface ICompareTabProps {
  onError?: (e: UserAccessError) => void;
}

// PnP PeoplePicker extends IPersonaProps at runtime with extra fields
interface IPickedPersona extends IPersonaProps {
  loginName: string;
  text: string;
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CompareListRow({
  loginA,
  loginB,
  list,
}: {
  loginA: string;
  loginB: string;
  list: { id: string; title: string };
}): React.ReactElement {
  const [active, setActive] = React.useState(false);
  const ref: ListRef = { id: list.id };
  const lpA = useEffectiveListPermission(active ? loginA : null, ref);
  const lpB = useEffectiveListPermission(active ? loginB : null, ref);

  const unexplained =
    !!lpA.data &&
    !!lpB.data &&
    (lpA.data.permissionMask.high !== lpB.data.permissionMask.high ||
      lpA.data.permissionMask.low !== lpB.data.permissionMask.low) &&
    lpA.data.matchedAssignments.length === lpB.data.matchedAssignments.length;

  return (
    <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
      <Text>{list.title}</Text>
      <DefaultButton text="Compare permissions" onClick={() => setActive(true)} />
      {active && (lpA.loading || lpB.loading) && <Spinner />}
      {active && lpA.data && lpB.data && (
        <Stack horizontal tokens={{ childrenGap: 6 }}>
          <PermissionLevelBadge level={lpA.data.permissionLevel} tooltip="User A" />
          <PermissionLevelBadge level={lpB.data.permissionLevel} tooltip="User B" />
          {unexplained && (
            <Text variant="small" style={{ color: '#a4262c' }}>
              Unexplained difference — masks differ beyond visible assignments
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}

export const CompareTab: React.FC<ICompareTabProps> = ({ onError }) => {
  const [loginA, setLoginA] = React.useState<string | null>(null);
  const [loginB, setLoginB] = React.useState<string | null>(null);

  const { diff, loading, error } = useUserAccessComparison(loginA, loginB);

  React.useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  const handleExport = (): void => {
    if (!diff) return;
    const { filename, content } = accessExportToCsv(diff);
    downloadCsv(filename, content);
  };

  const handlePickA = React.useCallback((items: IPersonaProps[]): void => {
    if (!items || items.length === 0) {
      setLoginA(null);
      return;
    }
    const picked = items[0] as IPickedPersona;
    setLoginA(picked.loginName ?? null);
  }, []);

  const handlePickB = React.useCallback((items: IPersonaProps[]): void => {
    if (!items || items.length === 0) {
      setLoginB(null);
      return;
    }
    const picked = items[0] as IPickedPersona;
    setLoginB(picked.loginName ?? null);
  }, []);

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <Stack horizontal tokens={{ childrenGap: 12 }}>
        <Stack grow>
          <Text>User A</Text>
          <React.Suspense fallback={<Spinner />}>
            <PeoplePicker
              context={SPContext.peoplepickerContext}
              personSelectionLimit={1}
              principalTypes={[PrincipalType.User]}
              resolveDelay={300}
              ensureUser
              onChange={handlePickA}
            />
          </React.Suspense>
        </Stack>
        <Stack grow>
          <Text>User B</Text>
          <React.Suspense fallback={<Spinner />}>
            <PeoplePicker
              context={SPContext.peoplepickerContext}
              personSelectionLimit={1}
              principalTypes={[PrincipalType.User]}
              resolveDelay={300}
              ensureUser
              onChange={handlePickB}
            />
          </React.Suspense>
        </Stack>
      </Stack>

      {loading && <Spinner label="Comparing…" />}
      {error && (
        <MessageBar messageBarType={MessageBarType.error}>
          {error.message}
        </MessageBar>
      )}

      {diff && (
        <>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <Text variant="mediumPlus">
              Diff: {diff.userA.title} vs {diff.userB.title}
            </Text>
            <PrimaryButton text="Export CSV" onClick={handleExport} />
          </Stack>

          <Stack horizontal tokens={{ childrenGap: 12 }}>
            <Stack grow>
              <Text variant="mediumPlus">Only {diff.userA.title}</Text>
              <Text variant="small">Groups ({diff.onlyA.groups.length})</Text>
              <UserGroupChips groups={diff.onlyA.groups} emptyText="—" />
              <Text variant="small">
                Matched list role assignments ({diff.onlyA.directListPermissions.length})
              </Text>
              {diff.onlyA.directListPermissions.map((d: IDirectListPermission) => (
                <Text key={`${d.list.id}-${typeof d.source === 'string' ? d.source : d.source.viaGroupId}`}>
                  {d.list.title} — {d.permissionLevel}
                </Text>
              ))}
            </Stack>

            <Stack grow>
              <Text variant="mediumPlus">Common</Text>
              <Text variant="small">Groups ({diff.common.groups.length})</Text>
              <UserGroupChips groups={diff.common.groups} emptyText="—" />
              <Text variant="small">
                Lists ({diff.common.directListPermissions.length})
              </Text>
              {loginA && loginB &&
                diff.common.directListPermissions.map((d: IDirectListPermission) => (
                  <CompareListRow
                    key={d.list.id}
                    loginA={loginA}
                    loginB={loginB}
                    list={d.list}
                  />
                ))}
            </Stack>

            <Stack grow>
              <Text variant="mediumPlus">Only {diff.userB.title}</Text>
              <Text variant="small">Groups ({diff.onlyB.groups.length})</Text>
              <UserGroupChips groups={diff.onlyB.groups} emptyText="—" />
              <Text variant="small">
                Matched list role assignments ({diff.onlyB.directListPermissions.length})
              </Text>
              {diff.onlyB.directListPermissions.map((d: IDirectListPermission) => (
                <Text key={`${d.list.id}-${typeof d.source === 'string' ? d.source : d.source.viaGroupId}`}>
                  {d.list.title} — {d.permissionLevel}
                </Text>
              ))}
            </Stack>
          </Stack>
        </>
      )}
    </Stack>
  );
};
