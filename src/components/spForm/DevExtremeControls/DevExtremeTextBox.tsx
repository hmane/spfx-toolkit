import { TextBox } from 'devextreme-react/text-box';
import * as React from 'react';
import { Controller, FieldError, FieldValues } from 'react-hook-form';

export interface IDevExtremeTextBoxProps<T extends FieldValues> {
  name: string;
  control: any;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  mode?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
  maxLength?: number;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  onValueChanged?: (value: string) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeTextBox = <T extends FieldValues>({
  name,
  control,
  placeholder,
  disabled = false,
  readOnly = false,
  mode = 'text',
  maxLength,
  stylingMode = 'outlined',
  className = '',
  onValueChanged,
  onFocusIn,
  onFocusOut,
}: IDevExtremeTextBoxProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
        const hasError = !!error;

        return (
          <TextBox
            value={value || ''}
            onValueChanged={e => {
              onChange(e.value);
              if (onValueChanged) {
                onValueChanged(e.value);
              }
            }}
            onFocusIn={onFocusIn}
            onFocusOut={() => {
              onBlur();
              if (onFocusOut) {
                onFocusOut();
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            mode={mode}
            maxLength={maxLength}
            stylingMode={stylingMode}
            className={`${className} ${hasError ? 'dx-invalid' : ''}`}
            isValid={!hasError}
            validationError={error as FieldError}
          />
        );
      }}
    />
  );
};

export default DevExtremeTextBox;
