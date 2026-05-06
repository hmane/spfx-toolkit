/**
 * Snapshots tab — keyed latest-value snapshots from `SPDebug.set(key, value)`.
 *
 * Layout: list of keys on the left, JSON viewer for the selected snapshot on
 * the right. Reuses `DebugJsonViewer` for the per-path copy semantics.
 */

import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import type { SPDebugSnapshot } from '../../../utilities/debug/SPDebugTypes';
import { DebugJsonViewer } from './DebugJsonViewer';
import { writeToClipboard } from '../clipboard';
import { formatBytes } from '../panelLogic';

export interface DebugSnapshotsPaneProps {
  snapshots: ReadonlyArray<SPDebugSnapshot>;
}

export const DebugSnapshotsPane: React.FC<DebugSnapshotsPaneProps> = ({ snapshots }) => {
  const [selectedKey, setSelectedKey] = React.useState<string | undefined>(
    snapshots[0]?.key
  );

  React.useEffect(() => {
    if (!selectedKey || !snapshots.find((s) => s.key === selectedKey)) {
      setSelectedKey(snapshots[0]?.key);
    }
  }, [snapshots, selectedKey]);

  if (snapshots.length === 0) {
    return (
      <div className="spdebug-empty">
        <Text variant="medium">
          No snapshots captured. Use <code>SPDebug.set(key, value)</code> or{' '}
          <code>useSPDebugValue(key, value, deps)</code>.
        </Text>
      </div>
    );
  }

  const selected = snapshots.find((s) => s.key === selectedKey);
  const handleCopyPath = (p: string): void => {
    void writeToClipboard(p);
  };
  const handleCopyValue = (v: unknown): void => {
    try {
      void writeToClipboard(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
    } catch {
      void writeToClipboard(String(v));
    }
  };

  return (
    <Stack
      horizontal
      tokens={{ childrenGap: 0 }}
      styles={{ root: { flex: 1, minHeight: 0 } }}
    >
      <div
        role="listbox"
        aria-label="Snapshots"
        style={{
          width: 220,
          minWidth: 180,
          borderRight: '1px solid #edebe9',
          overflow: 'auto',
        }}
      >
        {snapshots.map((s) => {
          const isSelected = s.key === selectedKey;
          return (
            <div
              key={s.key}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => setSelectedKey(s.key)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') setSelectedKey(s.key);
              }}
              style={{
                padding: '6px 8px',
                cursor: 'pointer',
                background: isSelected ? '#deecf9' : 'transparent',
                borderBottom: '1px solid #f3f2f1',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.key}</div>
              <div style={{ fontSize: 11, color: '#605e5c' }}>
                {s.source} · {formatBytes(s.bytes)}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: 8 }}>
        {selected ? (
          <>
            <div style={{ marginBottom: 6, fontSize: 12, color: '#605e5c' }}>
              Updated {new Date(selected.updatedAt).toISOString()}
            </div>
            <DebugJsonViewer
              value={selected.value}
              rootLabel={selected.key}
              onCopyPath={handleCopyPath}
              onCopyValue={handleCopyValue}
            />
          </>
        ) : (
          <Text variant="medium">Select a snapshot to inspect.</Text>
        )}
      </div>
    </Stack>
  );
};
