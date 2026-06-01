/**
 * Network tab — REST/fetch inspector.
 *
 * Renders rows from the `__network__` store table recorded by `httpBridge`.
 * Each row shows: method | URL | status | duration | size.
 * Rows above the slow threshold are highlighted in amber.
 *
 * Shows an empty state (matching `DebugTablesPane`) when there are no rows.
 * The tab itself is always shown so users know the feature exists.
 */

import * as React from 'react';
import {
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  SelectionMode,
} from '@fluentui/react/lib/DetailsList';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import type { SPDebugTable } from '../../../utilities/debug/SPDebugTypes';
import type { NetworkRow } from '../../../utilities/debug/httpBridge';
import { NETWORK_TABLE_KEY, DEFAULT_SLOW_THRESHOLD_MS } from '../../../utilities/debug/httpBridge';
import { formatBytes } from '../panelLogic';

export interface DebugNetworkPaneProps {
  /** The `__network__` table from the store, or undefined when not yet populated. */
  networkTable: SPDebugTable | undefined;
  /** Duration threshold in ms above which rows are highlighted. Defaults to 2000. */
  slowThresholdMs?: number;
}

function statusColor(status: number | null): string {
  if (status === null) return '#a4262c'; // error red
  if (status >= 500) return '#a4262c';
  if (status >= 400) return '#ca5010'; // amber/orange
  if (status >= 200 && status < 300) return '#107c10'; // green
  return '#605e5c';
}

function durationColor(durationMs: number, slowThreshold: number): string {
  if (durationMs >= slowThreshold) return '#ca5010';
  return '';
}

export const DebugNetworkPane: React.FC<DebugNetworkPaneProps> = ({
  networkTable,
  slowThresholdMs = DEFAULT_SLOW_THRESHOLD_MS,
}) => {
  const rows = networkTable ? (networkTable.rows as NetworkRow[]) : [];

  const columns: IColumn[] = [
    {
      key: 'method',
      name: 'Method',
      fieldName: 'method',
      minWidth: 48,
      maxWidth: 64,
      isResizable: false,
      onRender: (item: NetworkRow) => (
        <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>
          {item.method}
        </span>
      ),
    },
    {
      key: 'status',
      name: 'Status',
      fieldName: 'status',
      minWidth: 50,
      maxWidth: 64,
      isResizable: false,
      onRender: (item: NetworkRow) => (
        <span style={{ color: statusColor(item.status) }}>
          {item.status !== null ? String(item.status) : 'ERR'}
        </span>
      ),
    },
    {
      key: 'durationMs',
      name: 'Duration',
      fieldName: 'durationMs',
      minWidth: 64,
      maxWidth: 88,
      isResizable: true,
      onRender: (item: NetworkRow) => {
        const color = durationColor(item.durationMs, slowThresholdMs);
        return (
          <span style={color ? { color, fontWeight: 600 } : {}}>
            {item.durationMs + 'ms'}
          </span>
        );
      },
    },
    {
      key: 'sizeBytes',
      name: 'Size',
      fieldName: 'sizeBytes',
      minWidth: 56,
      maxWidth: 80,
      isResizable: true,
      onRender: (item: NetworkRow) =>
        item.sizeBytes !== null ? formatBytes(item.sizeBytes) : '—',
    },
    {
      key: 'url',
      name: 'URL',
      fieldName: 'url',
      minWidth: 180,
      maxWidth: 700,
      isResizable: true,
      isMultiline: false,
      onRender: (item: NetworkRow) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            wordBreak: 'break-all',
            opacity: item.slow ? 1 : 0.9,
          }}
          title={item.url}
        >
          {item.url}
        </span>
      ),
    },
  ];

  if (rows.length === 0) {
    return (
      <div className="spdebug-empty">
        <Text variant="medium">
          No network requests captured. Pass an{' '}
          <code>http</code> prop to{' '}
          <code>{'<SPDebugProvider http={SPContext.http}>'}</code> to enable
          the network inspector.
        </Text>
      </div>
    );
  }

  return (
    <Stack
      styles={{ root: { padding: 12, overflow: 'auto', flex: 1, minHeight: 0 } }}
    >
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { marginBottom: 8 } }}>
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          Network Requests
        </Text>
        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
          {rows.length} requests
        </Text>
        {rows.some((r) => r.slow) && (
          <Text variant="small" styles={{ root: { color: '#ca5010', fontWeight: 600 } }}>
            ⚠ {rows.filter((r) => r.slow).length} slow ({'>'}{slowThresholdMs}ms)
          </Text>
        )}
      </Stack>
      <DetailsList
        items={rows}
        columns={columns}
        compact
        selectionMode={SelectionMode.none}
        layoutMode={DetailsListLayoutMode.fixedColumns}
        onShouldVirtualize={() => true}
        ariaLabelForGrid="Network requests"
        getKey={(item: NetworkRow, idx?: number) =>
          String(item.recordedAt) + '_' + String(idx ?? 0)
        }
      />
    </Stack>
  );
};
