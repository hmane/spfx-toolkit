import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';

interface IProps {
  itemCount: number;
  changedFieldLabels: string[];
}

export const SPDynamicFormSavePreview: React.FC<IProps> = ({ itemCount, changedFieldLabels }) => {
  if (changedFieldLabels.length === 0) {
    return (
      <div className='spfx-df-save-preview is-empty' role='status'>
        <Icon iconName='Info' />
        <span>No changes to save.</span>
      </div>
    );
  }

  return (
    <div className='spfx-df-save-preview' role='status'>
      <Icon iconName='SaveTemplate' />
      <span>
        Will update <strong>{itemCount}</strong> item{itemCount === 1 ? '' : 's'}:{' '}
        <strong>{changedFieldLabels.length}</strong> field
        {changedFieldLabels.length === 1 ? '' : 's'}
        {changedFieldLabels.length <= 4
          ? ` (${changedFieldLabels.join(', ')})`
          : ` (${changedFieldLabels.slice(0, 3).join(', ')}, +${changedFieldLabels.length - 3} more)`}
      </span>
    </div>
  );
};
