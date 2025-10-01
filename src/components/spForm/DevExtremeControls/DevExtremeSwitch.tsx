import { isEqual } from '@microsoft/sp-lodash-subset';
import { Switch } from 'devextreme-react/switch';
import * as React from 'react';
import { Controller, FieldError, FieldValues } from 'react-hook-form';

export interface IDevExtremeSwitchProps<T extends FieldValues> {
  name: string;
  control: any;
  disabled?: boolean;
  readOnly?: boolean;
  width?: number | string;
  height?: number | string;
  hint?: string;
  rtlEnabled?: boolean;
  activeStateEnabled?: boolean;
  focusStateEnabled?: boolean;
  hoverStateEnabled?: boolean;
  tabIndex?: number;
  accessKey?: string;
  className?: string;
  onValueChanged?: (value: boolean) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeSwitch = <T extends FieldValues>({
  name,
  control,
  disabled = false,
  readOnly = false,
  width,
  height,
  hint,
  rtlEnabled,
  activeStateEnabled,
  focusStateEnabled,
  hoverStateEnabled,
  tabIndex,
  accessKey,
  className = '',
  onValueChanged,
  onFocusIn,
  onFocusOut,
}: IDevExtremeSwitchProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
        const hasError = !!error;

        return (
          <Switch
            value={value || false}
            onValueChanged={e => {
              if (!isEqual(value, e.value)) {
                onChange(e.value);
                if (onValueChanged) {
                  onValueChanged(e.value);
                }
              }
            }}
            disabled={disabled}
            readOnly={readOnly}
            width={width}
            height={height}
            hint={hint}
            rtlEnabled={rtlEnabled}
            activeStateEnabled={activeStateEnabled}
            focusStateEnabled={focusStateEnabled}
            hoverStateEnabled={hoverStateEnabled}
            tabIndex={tabIndex}
            accessKey={accessKey}
            className={`${className} ${hasError ? 'dx-invalid' : ''}`}
            isValid={!hasError}
            validationError={error as FieldError}
          />
        );
      }}
    />
  );
};

export default DevExtremeSwitch;
