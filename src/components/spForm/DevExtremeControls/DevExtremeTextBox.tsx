import { TextBox } from 'devextreme-react/text-box';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Control, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';

export interface IDevExtremeTextBoxProps<T extends FieldValues> {
  name: Path<T>;
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

function DevExtremeTextBoxInner<T extends FieldValues>({
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
}: IDevExtremeTextBoxProps<T>) {
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
            <TextBox
              value={value || ''}
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
    </div>
  );
}

const DevExtremeTextBox = React.memo(DevExtremeTextBoxInner) as <T extends FieldValues>(
  props: IDevExtremeTextBoxProps<T>
) => React.ReactElement;

export default DevExtremeTextBox;
