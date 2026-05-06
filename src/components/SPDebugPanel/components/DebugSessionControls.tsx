/**
 * Session start/stop/note controls.
 *
 * - Start prompts for a label (optional).
 * - Stop prompts for a closing note (optional).
 * - Starting while active end-and-replaces with confirmation per spec.
 */

import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';
import { SPDebug } from '../../../utilities/debug';
import type { SPDebugSession } from '../../../utilities/debug/SPDebugTypes';
import { formatDuration } from '../panelLogic';

export interface DebugSessionControlsProps {
  active: SPDebugSession | null;
  entryCount: number;
}

type DialogMode = null | 'start' | 'replace' | 'stop';

export const DebugSessionControls: React.FC<DebugSessionControlsProps> = ({
  active,
  entryCount,
}) => {
  const [dialog, setDialog] = React.useState<DialogMode>(null);
  const [label, setLabel] = React.useState('');
  const [note, setNote] = React.useState('');

  const close = (): void => {
    setDialog(null);
    setLabel('');
    setNote('');
  };

  const onStartClick = (): void => {
    if (active) {
      setDialog('replace');
    } else {
      setLabel('');
      setDialog('start');
    }
  };

  const onConfirmStart = (): void => {
    SPDebug.session.start({ label });
    close();
  };

  const onConfirmStop = (): void => {
    SPDebug.session.stop({ note });
    close();
  };

  // Tick to refresh the duration display while active.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!active || active.endedAt !== null) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const duration = active ? Date.now() - active.startedAt : 0;

  return (
    <Stack
      horizontal
      verticalAlign="center"
      tokens={{ childrenGap: 8 }}
      className="spdebug-session-bar"
      styles={{ root: { padding: '6px 8px', borderTop: '1px solid #edebe9' } }}
    >
      {active ? (
        <>
          <Text styles={{ root: { fontWeight: 600 } }}>{active.label}</Text>
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            {formatDuration(duration)} · {entryCount} entries
          </Text>
          <span style={{ flexGrow: 1 }} />
          <DefaultButton
            text="Stop session"
            ariaLabel="Stop session"
            onClick={() => setDialog('stop')}
          />
        </>
      ) : (
        <>
          <Text variant="small" styles={{ root: { color: '#605e5c', flexGrow: 1 } }}>
            No active session.
          </Text>
          <PrimaryButton
            text="Start session"
            ariaLabel="Start session"
            onClick={onStartClick}
          />
        </>
      )}

      <Dialog
        hidden={dialog === null}
        onDismiss={close}
        dialogContentProps={{
          type: DialogType.normal,
          title:
            dialog === 'replace'
              ? 'Replace active session?'
              : dialog === 'stop'
              ? 'Stop session'
              : 'Start session',
          subText:
            dialog === 'replace'
              ? 'Starting a new session will stop the current session and start a new one.'
              : dialog === 'stop'
              ? 'Add an optional note to describe what happened.'
              : 'What are you debugging?',
        }}
      >
        {dialog === 'start' && (
          <TextField
            label="Label"
            placeholder="e.g. user reported save failure"
            value={label}
            onChange={(_, v) => setLabel(v || '')}
            autoFocus
          />
        )}
        {dialog === 'stop' && (
          <TextField
            label="Note"
            multiline
            rows={3}
            placeholder="e.g. it hung after the second click"
            value={note}
            onChange={(_, v) => setNote(v || '')}
            autoFocus
          />
        )}
        <DialogFooter>
          <DefaultButton text="Cancel" onClick={close} />
          {dialog === 'replace' && (
            <PrimaryButton
              text="End and start new"
              onClick={() => {
                setDialog('start');
              }}
            />
          )}
          {dialog === 'start' && (
            <PrimaryButton text="Start session" onClick={onConfirmStart} />
          )}
          {dialog === 'stop' && (
            <PrimaryButton text="Stop session" onClick={onConfirmStop} />
          )}
        </DialogFooter>
      </Dialog>
    </Stack>
  );
};
