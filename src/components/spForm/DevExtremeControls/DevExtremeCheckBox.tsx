import { CheckBox } from 'devextreme-react/check-box';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';

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
  const formContext = useFormContext();
  const fieldRef = React.useRef<HTMLDivElement>(null);

  // Register field with FormContext for scroll-to-error functionality
  React.useEffect(() => {
    if (name && formContext?.registry) {
      formContext.registry.register(name as string, {
        name: name as string,
        label: undefined, // spForm controls don't have labels
        required: false,
        ref: fieldRef as React.RefObject<HTMLElement>,
        section: undefined,
      });

      return () => {
        formContext.registry.unregister(name as string);
      };
    }
  }, [name, formContext]);

  return (
    <div ref={fieldRef}>
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
    </div>
  );
};

export default React.memo(DevExtremeCheckBox) as typeof DevExtremeCheckBox;
