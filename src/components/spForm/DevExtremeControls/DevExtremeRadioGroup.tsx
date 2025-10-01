import { isEqual } from '@microsoft/sp-lodash-subset';
import { RadioGroup } from 'devextreme-react/radio-group';
import * as React from 'react';
import { Controller, FieldError, FieldValues } from 'react-hook-form';

export interface IRadioOption {
  text: string;
  value: any;
  disabled?: boolean;
}

export interface IDevExtremeRadioGroupProps<T extends FieldValues> {
  name: string;
  control: any;
  items: IRadioOption[];
  disabled?: boolean;
  readOnly?: boolean;
  layout?: 'horizontal' | 'vertical';
  className?: string;
  onValueChanged?: (value: any) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeRadioGroup = <T extends FieldValues>({
  name,
  control,
  items,
  disabled = false,
  readOnly = false,
  layout = 'vertical',
  className = '',
  onValueChanged,
  onFocusIn,
  onFocusOut,
}: IDevExtremeRadioGroupProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
        const hasError = !!error;

        return (
          <RadioGroup
            value={value}
            onValueChanged={e => {
              if (!isEqual(value, e.value)) {
                onChange(e.value);
                if (onValueChanged) {
                  onValueChanged(e.value);
                }
              }
            }}
            items={items}
            disabled={disabled}
            readOnly={readOnly}
            layout={layout}
            className={`${className} ${hasError ? 'dx-invalid' : ''}`}
            isValid={!hasError}
            validationError={error as FieldError}
          />
        );
      }}
    />
  );
};

export default DevExtremeRadioGroup;
