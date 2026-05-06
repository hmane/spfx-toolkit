/**
 * Detail pane for the currently selected entry.
 *
 * Shows the full message, metadata, and a recursive JSON viewer for the
 * payload. Provides copy buttons per spec ("Search, Copy, and Export"
 * → Copy Actions).
 */

import * as React from 'react';
import { DefaultButton, IconButton } from '@fluentui/react/lib/Button';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import type { SPDebugEntry } from '../../../utilities/debug/SPDebugTypes';
import { DebugJsonViewer } from './DebugJsonViewer';
import { writeToClipboard } from '../clipboard';

export interface DebugDetailPaneProps {
  entry: SPDebugEntry | undefined;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export const DebugDetailPane: React.FC<DebugDetailPaneProps> = ({ entry }) => {
  if (!entry) {
    return (
      <div className="spdebug-detail-empty">
        <Text variant="medium">Select an entry to inspect its payload.</Text>
      </div>
    );
  }
  const handleCopyMessage = (): void => {
    void writeToClipboard(entry.message);
  };
  const handleCopyPayload = (): void => {
    void writeToClipboard(safeJson(entry.data));
  };
  const handleCopyEntry = (): void => {
    void writeToClipboard(safeJson(entry));
  };
  const handleCopyPath = (path: string): void => {
    void writeToClipboard(path);
  };
  const handleCopyValue = (value: unknown): void => {
    void writeToClipboard(typeof value === 'string' ? value : safeJson(value));
  };
  return (
    <div className="spdebug-detail">
      <Stack
        horizontal
        verticalAlign="center"
        tokens={{ childrenGap: 8 }}
        styles={{ root: { padding: 8, borderBottom: '1px solid #edebe9' } }}
      >
        <Text variant="medium" styles={{ root: { fontWeight: 600, flexGrow: 1 } }}>
          {entry.message}
        </Text>
        <DefaultButton
          iconProps={{ iconName: 'Copy' }}
          text="Copy message"
          onClick={handleCopyMessage}
          ariaLabel="Copy message"
        />
        <DefaultButton
          iconProps={{ iconName: 'Copy' }}
          text="Copy payload"
          onClick={handleCopyPayload}
          ariaLabel="Copy payload JSON"
        />
        <IconButton
          iconProps={{ iconName: 'CopyEdit' }}
          title="Copy full entry JSON"
          ariaLabel="Copy full entry JSON"
          onClick={handleCopyEntry}
        />
      </Stack>
      <div className="spdebug-detail-meta" style={{ padding: 8, fontSize: 12, color: '#605e5c' }}>
        <span>{new Date(entry.timestamp).toISOString()}</span>
        {' · '}
        <span>{entry.level}</span>
        {' · '}
        <span>{entry.type}</span>
        {' · '}
        <span>{entry.source}</span>
        {entry.bytes !== undefined && (
          <>
            {' · '}
            <span>{entry.bytes} B</span>
          </>
        )}
      </div>
      <div style={{ padding: 8, overflow: 'auto', flex: 1, minHeight: 0 }}>
        <DebugJsonViewer
          value={entry.data}
          rootLabel="data"
          onCopyPath={handleCopyPath}
          onCopyValue={handleCopyValue}
        />
        {entry.meta && (
          <DebugJsonViewer
            value={entry.meta}
            rootLabel="meta"
            onCopyPath={handleCopyPath}
            onCopyValue={handleCopyValue}
          />
        )}
      </div>
    </div>
  );
};
