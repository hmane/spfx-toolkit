import { TextArea } from 'devextreme-react/text-area';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';

export interface IDevExtremeTextAreaProps<T extends FieldValues> {
  name: Path<T>;
  control: any;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  minHeight?: number | string;
  height?: number | string;
  autoResizeEnabled?: boolean;
  spellcheck?: boolean;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  onValueChanged?: (value: string) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeTextArea = <T extends FieldValues>({
  name,
  control,
  placeholder,
  disabled = false,
  readOnly = false,
  maxLength,
  minHeight = 80,
  height,
  autoResizeEnabled = true,
  spellcheck = true,
  stylingMode = 'outlined',
  className = '',
  onValueChanged,
  onFocusIn,
  onFocusOut,
}: IDevExtremeTextAreaProps<T>) => {
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
            <TextArea
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
              maxLength={maxLength}
              minHeight={minHeight}
              height={height}
              autoResizeEnabled={autoResizeEnabled}
              spellcheck={spellcheck}
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
};

export default React.memo(DevExtremeTextArea) as typeof DevExtremeTextArea;
