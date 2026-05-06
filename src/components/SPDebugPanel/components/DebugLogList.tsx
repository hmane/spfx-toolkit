/**
 * Virtualized log/timeline list using Fluent `DetailsList`.
 *
 * v1 default ring buffer is 1000 entries; `DetailsList`'s default
 * virtualization is sufficient at that scale per spec.
 */

import * as React from 'react';
import {
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  SelectionMode,
  Selection,
} from '@fluentui/react/lib/DetailsList';
import { Icon } from '@fluentui/react/lib/Icon';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import type { SPDebugEntry, SPDebugLevel } from '../../../utilities/debug/SPDebugTypes';
import { relTime } from '../panelLogic';

export interface DebugLogListProps {
  entries: ReadonlyArray<SPDebugEntry>;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}

const levelIcon: Record<SPDebugLevel, { name: string; color: string }> = {
  debug: { name: 'Bug', color: '#737373' },
  info: { name: 'Info', color: '#0078d4' },
  warn: { name: 'Warning', color: '#a4262c' },
  error: { name: 'StatusErrorFull', color: '#a80000' },
  success: { name: 'CheckMark', color: '#107c10' },
};

const cellWrap = mergeStyles({
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: 12,
});

export const DebugLogList: React.FC<DebugLogListProps> = ({
  entries,
  selectedId,
  onSelect,
}) => {
  const t0 = entries.length > 0 ? entries[0].timestamp : Date.now();

  const selection = React.useMemo(
    () =>
      new Selection({
        onSelectionChanged: () => {
          const items = selection.getSelection() as SPDebugEntry[];
          onSelect(items[0]?.id);
        },
      }),
    [onSelect]
  );

  React.useEffect(() => {
    // Keep external selection in sync with internal selection state.
    if (!selectedId) {
      selection.setAllSelected(false);
      return;
    }
    const idx = entries.findIndex((e) => e.id === selectedId);
    if (idx >= 0) {
      selection.setIndexSelected(idx, true, false);
    }
    // intentionally limited deps — selection identity is stable
  }, [entries, selectedId, selection]);

  const columns: IColumn[] = [
    {
      key: 'level',
      // Visible name kept blank to save horizontal space; screen readers read
      // `iconName` aria-label via `ariaLabel` below + the column header
      // accessibility name set on the column via `isIconOnly: true`.
      name: 'Level',
      isIconOnly: true,
      fieldName: 'level',
      minWidth: 18,
      maxWidth: 18,
      onRender: (item: SPDebugEntry) => {
        const ico = levelIcon[item.level] || levelIcon.info;
        return (
          <Icon
            iconName={ico.name}
            styles={{ root: { color: ico.color, fontSize: 14 } }}
            aria-label={item.level}
          />
        );
      },
    },
    {
      key: 'time',
      name: '+ms',
      fieldName: 'timestamp',
      minWidth: 60,
      maxWidth: 80,
      onRender: (item: SPDebugEntry) => (
        <span className={cellWrap}>{relTime(item.timestamp, t0)}</span>
      ),
    },
    {
      key: 'type',
      name: 'Type',
      fieldName: 'type',
      minWidth: 50,
      maxWidth: 70,
      onRender: (item: SPDebugEntry) => <span className={cellWrap}>{item.type}</span>,
    },
    {
      key: 'source',
      name: 'Source',
      fieldName: 'source',
      minWidth: 100,
      maxWidth: 200,
      onRender: (item: SPDebugEntry) => <span className={cellWrap}>{item.source}</span>,
    },
    {
      key: 'message',
      name: 'Message',
      fieldName: 'message',
      minWidth: 200,
      isResizable: true,
      onRender: (item: SPDebugEntry) => <span className={cellWrap}>{item.message}</span>,
    },
  ];

  return (
    <div className="spdebug-list">
      <DetailsList
        items={entries as SPDebugEntry[]}
        columns={columns}
        getKey={(item: SPDebugEntry) => item.id}
        setKey="spdebug-list"
        selection={selection}
        selectionMode={SelectionMode.single}
        selectionPreservedOnEmptyClick
        layoutMode={DetailsListLayoutMode.fixedColumns}
        compact
        onShouldVirtualize={() => true}
        ariaLabelForGrid="Debug entries"
      />
    </div>
  );
};
