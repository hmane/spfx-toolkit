import { isEqual } from '@microsoft/sp-lodash-subset';
import { DateBox } from 'devextreme-react/date-box';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';

export interface IDevExtremeDateBoxProps<T extends FieldValues> {
  name: Path<T>;
  control: any;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  type?: 'date' | 'datetime' | 'time';
  displayFormat?: string;
  min?: Date;
  max?: Date;
  showClearButton?: boolean;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  onValueChanged?: (value: Date | null) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeDateBox = <T extends FieldValues>({
  name,
  control,
  placeholder,
  disabled = false,
  readOnly = false,
  type = 'date',
  displayFormat,
  min,
  max,
  showClearButton = true,
  stylingMode = 'outlined',
  className = '',
  onValueChanged,
  onFocusIn,
  onFocusOut,
}: IDevExtremeDateBoxProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
        const hasError = !!error;

        return (
          <DateBox
            value={value || undefined}
            onValueChanged={e => {
              if (!isEqual(value, e.value)) {
                onChange(e.value);
                onValueChanged?.(e.value);
              }
            }}
            onFocusIn={onFocusIn}
            onFocusOut={() => {
              onBlur();
              onFocusOut?.();
            }}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            type={type}
            displayFormat={displayFormat}
            min={min}
            max={max}
            showClearButton={showClearButton}
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

export default React.memo(DevExtremeDateBox) as typeof DevExtremeDateBox;
