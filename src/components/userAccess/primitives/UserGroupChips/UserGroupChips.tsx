import * as React from 'react';
import { Text } from '@fluentui/react/lib/Text';
import { GroupViewer } from '../../../GroupViewer';
import { IUserGroupChipsProps } from './UserGroupChips.types';
import type { ISiteGroup } from '../../../../utilities/userAccess';
import './UserGroupChips.css';

export const UserGroupChips: React.FC<IUserGroupChipsProps> = ({
  groups,
  onChipClick,
  className,
  emptyText = 'No groups',
}) => {
  if (groups.length === 0) {
    return (
      <Text variant="small" className={`spf-usergroupchips--empty${className ? ` ${className}` : ''}`}>
        {emptyText}
      </Text>
    );
  }

  // GroupViewer is a self-contained interactive element — it owns the hover callout
  // and accepts an onClick prop. We wrap it in a chip-styled div for visual treatment,
  // and forward the click through GroupViewer's own onClick signature.
  return (
    <div className={`spf-usergroupchips${className ? ` ${className}` : ''}`}>
      {groups.map((g: ISiteGroup) => (
        <div key={g.id} className="spf-usergroupchip">
          <GroupViewer
            groupId={g.id}
            groupName={g.title}
            displayMode="name"
            size={28}
            onClick={onChipClick ? () => onChipClick(g) : undefined}
          />
        </div>
      ))}
    </div>
  );
};
