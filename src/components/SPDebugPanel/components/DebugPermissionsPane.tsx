/**
 * Permissions tab — displays permission check results recorded by
 * `useSPDebugPermission`.
 *
 * Renders rows from the `__permissions__` store table.
 * Each row shows: label | result (✓ / ✗ / loading) | checked-at timestamp.
 *
 * Matches the empty-state pattern of `DebugTablesPane`.
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

export const PERMISSIONS_TABLE_KEY = '__permissions__';

export interface PermissionRow {
  label: string;
  allowed: boolean;
  loading: boolean;
  checkedAt: number;
}

export interface DebugPermissionsPaneProps {
  permissionsTable: SPDebugTable | undefined;
}

export const DebugPermissionsPane: React.FC<DebugPermissionsPaneProps> = ({
  permissionsTable,
}) => {
  const rows = permissionsTable ? (permissionsTable.rows as PermissionRow[]) : [];

  const columns: IColumn[] = [
    {
      key: 'label',
      name: 'Permission',
      fieldName: 'label',
      minWidth: 120,
      maxWidth: 320,
      isResizable: true,
      onRender: (item: PermissionRow) => (
        <span style={{ fontWeight: 500 }}>{item.label}</span>
      ),
    },
    {
      key: 'allowed',
      name: 'Result',
      fieldName: 'allowed',
      minWidth: 64,
      maxWidth: 96,
      isResizable: false,
      onRender: (item: PermissionRow) => {
        if (item.loading) {
          return <span style={{ color: '#605e5c', fontStyle: 'italic' }}>loading…</span>;
        }
        return item.allowed ? (
          <span style={{ color: '#107c10', fontWeight: 700 }}>✓ Allowed</span>
        ) : (
          <span style={{ color: '#a4262c', fontWeight: 700 }}>✗ Denied</span>
        );
      },
    },
    {
      key: 'checkedAt',
      name: 'Checked At',
      fieldName: 'checkedAt',
      minWidth: 96,
      maxWidth: 160,
      isResizable: true,
      onRender: (item: PermissionRow) =>
        item.checkedAt ? new Date(item.checkedAt).toISOString() : '—',
    },
  ];

  if (rows.length === 0) {
    return (
      <div className="spdebug-empty">
        <Text variant="medium">
          No permission checks recorded. Use{' '}
          <code>useSPDebugPermission(label, allowed)</code> to capture
          permission states.
        </Text>
      </div>
    );
  }

  const allowedCount = rows.filter((r) => !r.loading && r.allowed).length;
  const deniedCount = rows.filter((r) => !r.loading && !r.allowed).length;

  return (
    <Stack
      styles={{ root: { padding: 12, overflow: 'auto', flex: 1, minHeight: 0 } }}
    >
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { marginBottom: 8 } }}>
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          Permission Checks
        </Text>
        <Text variant="small" styles={{ root: { color: '#107c10' } }}>
          ✓ {allowedCount}
        </Text>
        <Text variant="small" styles={{ root: { color: '#a4262c' } }}>
          ✗ {deniedCount}
        </Text>
      </Stack>
      <DetailsList
        items={rows}
        columns={columns}
        compact
        selectionMode={SelectionMode.none}
        layoutMode={DetailsListLayoutMode.fixedColumns}
        onShouldVirtualize={() => true}
        ariaLabelForGrid="Permission checks"
        getKey={(item: PermissionRow, idx?: number) =>
          item.label + '_' + String(idx ?? 0)
        }
      />
    </Stack>
  );
};
