import { Switch } from 'devextreme-react/switch';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';

export interface IDevExtremeSwitchProps<T extends FieldValues> {
  name: Path<T>;
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
            <div style={{ display: 'inline-block' }}>
              <Switch
                value={value || false}
                onValueChanged={e => {
                  if (value !== e.value) {
                    onChange(e.value);
                    onValueChanged?.(e.value);
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
            </div>
          );
        }}
      />
    </div>
  );
};

export default React.memo(DevExtremeSwitch) as typeof DevExtremeSwitch;
