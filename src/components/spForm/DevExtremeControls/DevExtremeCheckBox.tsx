import { CheckBox } from 'devextreme-react/check-box';
import * as React from 'react';
import { Controller, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';
import {
  DevExtremeInlineError,
  IDevExtremeValidationProps,
  resolveDevExtremeValidationState,
  useControllableValue,
} from './validation';

export interface IDevExtremeCheckBoxProps<T extends FieldValues> extends IDevExtremeValidationProps {
  name: Path<T> | string;
  control?: any;
  value?: boolean | null;
  defaultValue?: boolean | null;
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
  value,
  defaultValue = false,
  label,
  required = false,
  text,
  disabled = false,
  readOnly = false,
  iconSize,
  enableThreeStateBehavior = false,
  className = '',
  onValueChanged,
  isValid,
  errorMessage,
  errorText,
  showErrorMessage = true,
  validationMessageMode,
}: IDevExtremeCheckBoxProps<T>) => {
  const formContext = useFormContext();
  const effectiveControl = control || formContext?.control;
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [standaloneValue, setStandaloneValue] = useControllableValue<boolean | null>(value, defaultValue);

  // Register field with FormContext for scroll-to-error functionality
  React.useEffect(() => {
    if (name && formContext?.registry) {
      formContext.registry.register(name as string, {
        name: name as string,
        label: label || text,
        required,
        ref: fieldRef as React.RefObject<HTMLElement>,
        section: undefined,
      });

      return () => {
        formContext.registry.unregister(name as string);
      };
    }
  }, [name, label, text, required, formContext]);

  const renderCheckBox = (
    fieldValue: boolean | null,
    fieldOnChange: (value: boolean | null) => void,
    fieldError?: any
  ) => {
    const validation = resolveDevExtremeValidationState({
      name: name as string,
      label: label || text,
      fieldError,
      isValid,
      errorMessage,
      errorText,
      showErrorMessage,
      validationMessageMode,
    });

    return (
      <>
        <CheckBox
          value={fieldValue ?? false}
          onValueChanged={e => {
            if (fieldValue !== e.value) {
              fieldOnChange(e.value);
              onValueChanged?.(e.value);
            }
          }}
          text={text}
          disabled={disabled}
          readOnly={readOnly}
          iconSize={iconSize}
          enableThreeStateBehavior={enableThreeStateBehavior}
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
        {renderCheckBox(standaloneValue, (next) => setStandaloneValue(next))}
      </div>
    );
  }

  return (
    <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
      <Controller
        name={name as Path<T>}
        control={effectiveControl}
        render={({ field: { onChange, value }, fieldState: { error } }) => {
          return renderCheckBox(value ?? false, onChange, error);
        }}
      />
    </div>
  );
};

export default React.memo(DevExtremeCheckBox) as typeof DevExtremeCheckBox;
