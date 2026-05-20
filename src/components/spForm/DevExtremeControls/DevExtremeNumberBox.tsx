import { NumberBox } from 'devextreme-react/number-box';
import * as React from 'react';
import { Controller, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';
import {
  DevExtremeInlineError,
  IDevExtremeValidationProps,
  isDevExtremeUserValueChange,
  resolveDevExtremeValidationState,
  useControllableValue,
} from './validation';

export interface IDevExtremeNumberBoxProps<T extends FieldValues> extends IDevExtremeValidationProps {
  name: Path<T> | string;
  control?: any;
  value?: number | null;
  defaultValue?: number | null;
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
  hint?: string;
  inputAttr?: Record<string, any>;
  tabIndex?: number;
  onValueChanged?: (value: number | null) => void;
  onEnterKey?: (e: any) => void;
  onKeyDown?: (e: any) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeNumberBox = <T extends FieldValues>({
  name,
  control,
  value,
  defaultValue = null,
  label,
  required = false,
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
  hint,
  inputAttr,
  tabIndex,
  onValueChanged,
  onEnterKey,
  onKeyDown,
  onFocusIn,
  onFocusOut,
  isValid,
  errorMessage,
  errorText,
  showErrorMessage = true,
  validationMessageMode,
}: IDevExtremeNumberBoxProps<T>) => {
  const formContext = useFormContext();
  const effectiveControl = control || formContext?.control;
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [standaloneValue, setStandaloneValue] = useControllableValue<number | null>(value, defaultValue);

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

  const renderNumberBox = (
    fieldValue: number | null,
    fieldOnChange: (value: number | null) => void,
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
        <NumberBox
          value={fieldValue ?? undefined}
          onValueChanged={e => {
            if (isDevExtremeUserValueChange(e) && fieldValue !== e.value) {
              fieldOnChange(e.value ?? null);
              onValueChanged?.(e.value ?? null);
            }
          }}
          onFocusIn={onFocusIn}
          onFocusOut={() => {
            fieldOnBlur?.();
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
          hint={hint}
          inputAttr={inputAttr}
          tabIndex={tabIndex}
          onEnterKey={onEnterKey}
          onKeyDown={onKeyDown}
          className={`${className} ${validation.hasError ? 'dx-invalid' : ''}`}
          isValid={validation.isValid}
          validationError={validation.validationError}
          validationMessageMode={validation.validationMessageMode}
        />
        {validation.shouldRenderInlineError && (
          <DevExtremeInlineError name={name as string} error={validation.errorMessage} />
        )}
      </>
    );
  };

  if (!effectiveControl) {
    return (
      <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
        {renderNumberBox(standaloneValue, (next) => setStandaloneValue(next))}
      </div>
    );
  }

  return (
    <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
      <Controller
        name={name as Path<T>}
        control={effectiveControl}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
          return renderNumberBox(value ?? null, onChange, onBlur, error);
        }}
      />
    </div>
  );
};

export default React.memo(DevExtremeNumberBox) as typeof DevExtremeNumberBox;
