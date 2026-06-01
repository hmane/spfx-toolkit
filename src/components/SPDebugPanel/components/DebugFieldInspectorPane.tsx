/**
 * Field Inspector tab — shows resolved field metadata captured by
 * `useSPDebugFormFields`.
 *
 * Renders rows from the `__form_fields__` store table.
 * Each row shows: fieldName | type | label | required | hidden | readOnly |
 * overrideApplied.
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

export const FORM_FIELDS_TABLE_KEY = '__form_fields__';

export interface FieldInspectorRow {
  fieldName: string;
  type: string;
  label: string;
  required: boolean;
  hidden: boolean;
  readOnly: boolean;
  overrideApplied: boolean;
}

export interface DebugFieldInspectorPaneProps {
  fieldInspectorTable: SPDebugTable | undefined;
}

function boolCell(value: boolean, trueColor?: string, falseColor?: string): React.ReactElement {
  return value ? (
    <span style={{ color: trueColor ?? '#107c10', fontWeight: 600 }}>✓</span>
  ) : (
    <span style={{ color: falseColor ?? '#605e5c' }}>—</span>
  );
}

export const DebugFieldInspectorPane: React.FC<DebugFieldInspectorPaneProps> = ({
  fieldInspectorTable,
}) => {
  const rows = fieldInspectorTable
    ? (fieldInspectorTable.rows as FieldInspectorRow[])
    : [];

  const columns: IColumn[] = [
    {
      key: 'fieldName',
      name: 'Internal Name',
      fieldName: 'fieldName',
      minWidth: 100,
      maxWidth: 200,
      isResizable: true,
      onRender: (item: FieldInspectorRow) => (
        <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{item.fieldName}</span>
      ),
    },
    {
      key: 'type',
      name: 'Type',
      fieldName: 'type',
      minWidth: 72,
      maxWidth: 120,
      isResizable: true,
      onRender: (item: FieldInspectorRow) => (
        <span style={{ color: '#605e5c', fontSize: 11 }}>{item.type}</span>
      ),
    },
    {
      key: 'label',
      name: 'Label',
      fieldName: 'label',
      minWidth: 100,
      maxWidth: 200,
      isResizable: true,
    },
    {
      key: 'required',
      name: 'Req',
      fieldName: 'required',
      minWidth: 36,
      maxWidth: 44,
      isResizable: false,
      onRender: (item: FieldInspectorRow) =>
        boolCell(item.required, '#a4262c'),
    },
    {
      key: 'hidden',
      name: 'Hid',
      fieldName: 'hidden',
      minWidth: 36,
      maxWidth: 44,
      isResizable: false,
      onRender: (item: FieldInspectorRow) =>
        boolCell(item.hidden, '#ca5010'),
    },
    {
      key: 'readOnly',
      name: 'RO',
      fieldName: 'readOnly',
      minWidth: 36,
      maxWidth: 44,
      isResizable: false,
      onRender: (item: FieldInspectorRow) =>
        boolCell(item.readOnly, '#0078d4'),
    },
    {
      key: 'overrideApplied',
      name: 'Override',
      fieldName: 'overrideApplied',
      minWidth: 56,
      maxWidth: 72,
      isResizable: false,
      onRender: (item: FieldInspectorRow) =>
        boolCell(item.overrideApplied, '#8764b8'),
    },
  ];

  if (rows.length === 0) {
    return (
      <div className="spdebug-empty">
        <Text variant="medium">
          No form fields captured. Pass{' '}
          <code>onResolvedField={'{useSPDebugFormFields()}'}</code> to{' '}
          <code>{'<SPDynamicForm>'}</code> to enable the field inspector.
        </Text>
      </div>
    );
  }

  const overrideCount = rows.filter((r) => r.overrideApplied).length;

  return (
    <Stack
      styles={{ root: { padding: 12, overflow: 'auto', flex: 1, minHeight: 0 } }}
    >
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { marginBottom: 8 } }}>
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          Form Fields
        </Text>
        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
          {rows.length} fields
        </Text>
        {overrideCount > 0 && (
          <Text variant="small" styles={{ root: { color: '#8764b8' } }}>
            {overrideCount} overridden
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
        ariaLabelForGrid="Form fields"
        getKey={(item: FieldInspectorRow, idx?: number) =>
          item.fieldName + '_' + String(idx ?? 0)
        }
      />
    </Stack>
  );
};
