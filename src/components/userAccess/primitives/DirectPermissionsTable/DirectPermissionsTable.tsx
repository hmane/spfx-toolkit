// DirectPermissionsTable.tsx
import * as React from 'react';
import {
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  SelectionMode,
} from '@fluentui/react/lib/DetailsList';
import { Link } from '@fluentui/react/lib/Link';
import { Text } from '@fluentui/react/lib/Text';
import { PermissionLevelBadge } from '../PermissionLevelBadge';
import { IDirectPermissionsTableProps } from './DirectPermissionsTable.types';
import './DirectPermissionsTable.css';

export const DirectPermissionsTable: React.FC<IDirectPermissionsTableProps> = ({
  lists,
  onListClick,
  className,
  emptyText = 'No direct list permissions.',
}) => {
  if (lists.length === 0) {
    return (
      <Text variant="small" className={className}>
        {emptyText}
      </Text>
    );
  }

  const columns: IColumn[] = [
    {
      key: 'title',
      name: 'List',
      fieldName: 'list',
      minWidth: 160,
      isResizable: true,
      onRender: (item) =>
        onListClick ? (
          <Link onClick={() => onListClick({ id: item.list.id })}>
            {item.list.title}
          </Link>
        ) : (
          <span>{item.list.title}</span>
        ),
    },
    {
      key: 'level',
      name: 'Permission',
      minWidth: 90,
      onRender: (item) => <PermissionLevelBadge level={item.permissionLevel} />,
    },
    {
      key: 'source',
      name: 'Source',
      minWidth: 160,
      isResizable: true,
      onRender: (item) =>
        item.source === 'Direct' ? 'Direct' : `Via ${item.source.viaGroupTitle}`,
    },
    {
      key: 'roles',
      name: 'Roles',
      minWidth: 160,
      isResizable: true,
      onRender: (item) =>
        item.roleDefinitions.map((r: any) => r.name).join(', '),
    },
  ];

  return (
    <DetailsList
      className={`spf-dirperms ${className ?? ''}`}
      items={lists}
      columns={columns}
      selectionMode={SelectionMode.none}
      layoutMode={DetailsListLayoutMode.justified}
      compact
    />
  );
};
