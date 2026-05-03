import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';

interface IProps {
  fieldName: string;
  isDirty: boolean;
  onRevert: (fieldName: string) => void;
}

export const SPDynamicFormFieldRevert: React.FC<IProps> = ({ fieldName, isDirty, onRevert }) => {
  if (!isDirty) return null;
  return (
    <TooltipHost content='Revert this field to the shared value'>
      <button
        type='button'
        className='spfx-df-revert-btn'
        onClick={() => onRevert(fieldName)}
        aria-label={`Revert ${fieldName}`}
      >
        <Icon iconName='Undo' />
      </button>
    </TooltipHost>
  );
};
