import { isEqual } from '@microsoft/sp-lodash-subset';
import { RadioGroup } from 'devextreme-react/radio-group';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';

export interface IRadioOption {
  text: string;
  value: any;
  disabled?: boolean;
}

export interface IDevExtremeRadioGroupProps<T extends FieldValues> {
  name: Path<T>;
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
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
          const hasError = !!error;

          return (
            <RadioGroup
              value={value}
              onValueChanged={e => {
                if (!isEqual(value, e.value)) {
                  onChange(e.value);
                  onValueChanged?.(e.value);
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
    </div>
  );
};

export default React.memo(DevExtremeRadioGroup) as typeof DevExtremeRadioGroup;
