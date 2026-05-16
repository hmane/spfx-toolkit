import { Switch } from 'devextreme-react/switch';
import * as React from 'react';
import { Controller, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';
import {
  DevExtremeInlineError,
  IDevExtremeValidationProps,
  resolveDevExtremeValidationState,
  useControllableValue,
} from './validation';

export interface IDevExtremeSwitchProps<T extends FieldValues> extends IDevExtremeValidationProps {
  name: Path<T> | string;
  control?: any;
  value?: boolean;
  defaultValue?: boolean;
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
  value,
  defaultValue = false,
  label,
  required = false,
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
  isValid,
  errorMessage,
  errorText,
  showErrorMessage = true,
  validationMessageMode,
}: IDevExtremeSwitchProps<T>) => {
  const formContext = useFormContext();
  const effectiveControl = control || formContext?.control;
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [standaloneValue, setStandaloneValue] = useControllableValue<boolean>(value, defaultValue);

  // Register field with FormContext for scroll-to-error functionality
  React.useEffect(() => {
    if (name && formContext?.registry) {
      formContext.registry.register(name as string, {
        name: name as string,
        label,
        required,
        ref: fieldRef as React.RefObject<HTMLElement>,
        section: undefined,
      });

      return () => {
        formContext.registry.unregister(name as string);
      };
    }
  }, [name, label, required, formContext]);

  const renderSwitch = (
    fieldValue: boolean,
    fieldOnChange: (value: boolean) => void,
    fieldOnBlur?: () => void,
    fieldError?: any
  ) => {
    const validation = resolveDevExtremeValidationState({
      name: name as string,
      label,
      fieldError,
      isValid,
      errorMessage,
      errorText,
      showErrorMessage,
      validationMessageMode,
    });

    return (
      <>
        <div
          style={{ display: 'inline-block' }}
          onFocusCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              onFocusIn?.();
            }
          }}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              fieldOnBlur?.();
              onFocusOut?.();
            }
          }}
        >
          <Switch
            value={fieldValue || false}
            onValueChanged={e => {
              if (fieldValue !== e.value) {
                fieldOnChange(e.value);
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
            className={`${className} ${validation.hasError ? 'dx-invalid' : ''}`}
            isValid={validation.isValid}
            validationError={validation.validationError}
            validationMessageMode={validation.validationMessageMode}
          />
        </div>
        {validation.shouldRenderInlineError && (
          <DevExtremeInlineError name={name as string} error={validation.errorMessage} />
        )}
      </>
    );
  };

  if (!effectiveControl) {
    return (
      <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
        {renderSwitch(standaloneValue, (next) => setStandaloneValue(next))}
      </div>
    );
  }

  return (
    <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
      <Controller
        name={name as Path<T>}
        control={effectiveControl}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
          return renderSwitch(value || false, onChange, onBlur, error);
        }}
      />
    </div>
  );
};

export default React.memo(DevExtremeSwitch) as typeof DevExtremeSwitch;
