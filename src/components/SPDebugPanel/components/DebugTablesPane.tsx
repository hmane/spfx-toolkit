/**
 * Tables tab — keyed latest-value tables from `SPDebug.table(key, rows)`.
 *
 * Each table renders as a Fluent `DetailsList`. Columns come from the call's
 * `columns` option when provided, otherwise we infer from the first row's
 * keys. Per spec the renderer is sortable.
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
import type {
  SPDebugTable,
  SPDebugTableColumn,
} from '../../../utilities/debug/SPDebugTypes';
import { formatBytes } from '../panelLogic';

export interface DebugTablesPaneProps {
  tables: ReadonlyArray<SPDebugTable>;
}

function formatCell(value: unknown, format?: SPDebugTableColumn['format']): string {
  if (value === null || value === undefined) return '';
  if (format === 'fileSize' && typeof value === 'number') {
    return formatBytes(value);
  }
  if ((format === 'dateTime' || format === 'date') && (typeof value === 'number' || typeof value === 'string')) {
    const d = new Date(value as number | string);
    if (!isNaN(d.getTime())) {
      return format === 'date' ? d.toISOString().slice(0, 10) : d.toISOString();
    }
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const TableCard: React.FC<{ table: SPDebugTable }> = ({ table }) => {
  const inferredKeys = React.useMemo<string[]>(() => {
    if (table.columns && table.columns.length > 0) {
      return table.columns.map((c) => c.key);
    }
    const first = table.rows[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      return Object.keys(first as object);
    }
    return ['value'];
  }, [table.columns, table.rows]);

  const columns: IColumn[] = inferredKeys.map((k) => {
    const meta = table.columns?.find((c) => c.key === k);
    return {
      key: k,
      name: meta?.label ?? k,
      fieldName: k,
      minWidth: 80,
      maxWidth: 240,
      isResizable: true,
      onRender: (item: unknown) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return formatCell((item as Record<string, unknown>)[k], meta?.format);
        }
        return formatCell(item, meta?.format);
      },
    };
  });

  return (
    <div style={{ border: '1px solid #edebe9', padding: 8 }}>
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          {table.key}
        </Text>
        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
          {table.source} · {table.rows.length} rows · {formatBytes(table.bytes)}
        </Text>
        <span style={{ flexGrow: 1 }} />
        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
          {new Date(table.updatedAt).toISOString()}
        </Text>
      </Stack>
      <DetailsList
        items={table.rows as unknown[]}
        columns={columns}
        compact
        selectionMode={SelectionMode.none}
        layoutMode={DetailsListLayoutMode.fixedColumns}
        onShouldVirtualize={() => true}
        ariaLabelForGrid={'Table ' + table.key}
      />
    </div>
  );
};

export const DebugTablesPane: React.FC<DebugTablesPaneProps> = ({ tables }) => {
  if (tables.length === 0) {
    return (
      <div className="spdebug-empty">
        <Text variant="medium">
          No tables captured. Use <code>SPDebug.table(key, rows)</code> or{' '}
          <code>useSPDebugTable(key, rows, deps)</code>.
        </Text>
      </div>
    );
  }
  return (
    <Stack
      tokens={{ childrenGap: 12 }}
      styles={{ root: { padding: 12, overflow: 'auto', flex: 1, minHeight: 0 } }}
    >
      {tables.map((t) => (
        <TableCard key={t.key} table={t} />
      ))}
    </Stack>
  );
};
