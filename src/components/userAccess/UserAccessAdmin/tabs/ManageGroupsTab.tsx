// tabs/ManageGroupsTab.tsx
import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import { List } from '@fluentui/react/lib/List';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { IPersonaProps } from '@fluentui/react/lib/Persona';
import { PrincipalType } from '@pnp/spfx-controls-react/lib/controls/peoplepicker/PrincipalType';

import { SPContext } from '../../../../utilities/context';
import { useGroupMembershipEditor } from '../../../../hooks';
import type { ISiteGroup, UserAccessError } from '../../../../utilities/userAccess';

// PnP PeoplePicker extends IPersonaProps at runtime with extra fields
interface IPickedPersona extends IPersonaProps {
  loginName: string;
  text: string;
}

const PeoplePicker = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/PeoplePicker').then((m) => ({
    default: m.PeoplePicker,
  }))
);

interface IManageGroupsTabProps {
  managePermission: PermissionKind;
  onError?: (e: UserAccessError) => void;
}

const VIRTUALIZE_THRESHOLD = 50;

export const ManageGroupsTab: React.FC<IManageGroupsTabProps> = ({
  managePermission,
  onError,
}) => {
  const [login, setLogin] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const editor = useGroupMembershipEditor(login, managePermission);

  React.useEffect(() => {
    if (editor.error && onError) onError(editor.error);
  }, [editor.error, onError]);

  const filteredGroups = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return editor.allGroups;
    return editor.allGroups.filter((g) => g.title.toLowerCase().includes(q));
  }, [editor.allGroups, filter]);

  const handlePick = React.useCallback((items: IPersonaProps[]): void => {
    if (!items || items.length === 0) {
      setLogin(null);
      return;
    }
    const picked = items[0] as IPickedPersona;
    setLogin(picked.loginName ?? null);
  }, []);

  const handleApply = async (): Promise<void> => {
    setConfirmOpen(false);
    await editor.apply();
  };

  const renderRow = (group?: ISiteGroup): React.ReactElement | null => {
    if (!group) return null;
    return (
      <div className="spf-managegroups__row" key={group.id}>
        <Checkbox
          label={group.title}
          checked={editor.pendingMembership.has(group.id)}
          onChange={() => editor.toggle(group.id)}
        />
      </div>
    );
  };

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

      <SearchBox
        placeholder="Filter groups…"
        value={filter}
        onChange={(_, v) => setFilter(v ?? '')}
      />

      {editor.loading && <Spinner label="Loading…" />}
      {editor.error && (
        <MessageBar messageBarType={MessageBarType.error}>
          {editor.error.message}
        </MessageBar>
      )}

      {login && (
        <div className="spf-managegroups__list">
          {filteredGroups.length > VIRTUALIZE_THRESHOLD ? (
            <List items={filteredGroups} onRenderCell={renderRow as any} />
          ) : (
            filteredGroups.map((g) => renderRow(g))
          )}
        </div>
      )}

      {editor.lastResult && editor.lastResult.failed.length > 0 && (
        <Stack tokens={{ childrenGap: 4 }}>
          <MessageBar messageBarType={MessageBarType.warning}>
            {editor.lastResult.failed.length} group operation(s) failed.
          </MessageBar>
          {editor.lastResult.failed.map((f) => (
            <Text key={f.groupId} variant="small">
              Group {f.groupId}: {f.error}
            </Text>
          ))}
        </Stack>
      )}
      {editor.lastResult &&
        editor.lastResult.failed.length === 0 &&
        editor.lastResult.succeeded.length > 0 && (
          <MessageBar messageBarType={MessageBarType.success}>
            Updated {editor.lastResult.succeeded.length} group membership(s).
          </MessageBar>
        )}

      {login && (
        <div className="spf-managegroups__footer">
          <Text>
            +{editor.pendingAdds.length} added, −{editor.pendingRemoves.length} removed.
          </Text>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <DefaultButton
              text="Reset"
              onClick={editor.reset}
              disabled={!editor.isDirty || editor.applying}
            />
            <PrimaryButton
              text={editor.applying ? 'Applying…' : 'Apply'}
              onClick={() => setConfirmOpen(true)}
              disabled={!editor.isDirty || editor.applying}
            />
          </Stack>
        </div>
      )}

      <Dialog
        hidden={!confirmOpen}
        onDismiss={() => setConfirmOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Confirm changes',
          subText: `Add to ${editor.pendingAdds.length} group(s), remove from ${editor.pendingRemoves.length} group(s). Some changes may succeed while others fail.`,
        }}
      >
        <DialogFooter>
          <PrimaryButton onClick={handleApply} text="Apply" />
          <DefaultButton onClick={() => setConfirmOpen(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>
    </Stack>
  );
};
