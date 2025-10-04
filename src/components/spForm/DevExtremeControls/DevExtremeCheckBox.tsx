import { CheckBox } from 'devextreme-react/check-box';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';

export interface IDevExtremeCheckBoxProps<T extends FieldValues> {
  name: Path<T>;
  control: any;
  text?: string;
  disabled?: boolean;
  readOnly?: boolean;
  iconSize?: number;
  enableThreeStateBehavior?: boolean;
  className?: string;
  onValueChanged?: (value: boolean | null) => void;
}

const DevExtremeCheckBox = <T extends FieldValues>({
  name,
  control,
  text,
  disabled = false,
  readOnly = false,
  iconSize,
  enableThreeStateBehavior = false,
  className = '',
  onValueChanged,
}: IDevExtremeCheckBoxProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const hasError = !!error;

        return (
          <CheckBox
            value={value ?? false}
            onValueChanged={e => {
              if (value !== e.value) {
                onChange(e.value);
                onValueChanged?.(e.value);
              }
            }}
            text={text}
            disabled={disabled}
            readOnly={readOnly}
            iconSize={iconSize}
            enableThreeStateBehavior={enableThreeStateBehavior}
            className={`${className} ${hasError ? 'dx-invalid' : ''}`}
            isValid={!hasError}
            validationError={error as FieldError}
          />
        );
      }}
    />
  );
};

export default React.memo(DevExtremeCheckBox) as typeof DevExtremeCheckBox;
