import * as React from 'react';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';

interface IContentTypePickerProps {
  options: Array<{ id: string; name: string; description?: string; default: boolean }>;
  selectedId?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
}

export const SPDynamicFormContentTypePicker: React.FC<IContentTypePickerProps> = ({
  options,
  selectedId,
  onChange,
  disabled,
  label = 'Content type',
}) => {
  const items: IDropdownOption[] = React.useMemo(
    () => options.map((o) => ({ key: o.id, text: o.name, title: o.description })),
    [options]
  );

  const handle = React.useCallback(
    (_: React.FormEvent<HTMLDivElement>, opt?: IDropdownOption) => {
      if (opt && typeof opt.key === 'string') onChange(opt.key);
    },
    [onChange]
  );

  return (
    <div className='spfx-df-ct-picker'>
      <Dropdown
        label={label}
        options={items}
        selectedKey={selectedId}
        onChange={handle}
        disabled={disabled}
      />
    </div>
  );
};
