import { NumberBox } from 'devextreme-react/number-box';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';

export interface IDevExtremeNumberBoxProps<T extends FieldValues> {
  name: Path<T>;
  control: any;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: number;
  format?: string;
  showSpinButtons?: boolean;
  showClearButton?: boolean;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  onValueChanged?: (value: number | null) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeNumberBox = <T extends FieldValues>({
  name,
  control,
  placeholder,
  disabled = false,
  readOnly = false,
  min,
  max,
  step,
  format,
  showSpinButtons = false,
  showClearButton = true,
  stylingMode = 'outlined',
  className = '',
  onValueChanged,
  onFocusIn,
  onFocusOut,
}: IDevExtremeNumberBoxProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
        const hasError = !!error;

        return (
          <NumberBox
            value={value ?? undefined}
            onValueChanged={e => {
              if (value !== e.value) {
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
            min={min}
            max={max}
            step={step}
            format={format}
            showSpinButtons={showSpinButtons}
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

export default React.memo(DevExtremeNumberBox) as typeof DevExtremeNumberBox;
