import { isEqual } from '@microsoft/sp-lodash-subset';
import { DateBox } from 'devextreme-react/date-box';
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

export interface IDevExtremeDateBoxProps<T extends FieldValues> extends IDevExtremeValidationProps {
  name: Path<T> | string;
  control?: any;
  value?: Date | null;
  defaultValue?: Date | null;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  type?: 'date' | 'datetime' | 'time';
  displayFormat?: string;
  min?: Date;
  max?: Date;
  showClearButton?: boolean;
  // Type masked date entry into the editor. Default in DevExtreme is true.
  useMaskBehavior?: boolean;
  // When set, DevExtreme returns the value as a string in this format (e.g. "yyyy-MM-ddTHH:mm:ssZ")
  // instead of a Date object — useful for round-tripping SharePoint payloads without a Date conversion.
  // NOTE: When this is set, the value type becomes string, not Date.
  dateSerializationFormat?: string;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  hint?: string;
  inputAttr?: Record<string, any>;
  tabIndex?: number;
  onValueChanged?: (value: Date | null) => void;
  onEnterKey?: (e: any) => void;
  onKeyDown?: (e: any) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeDateBox = <T extends FieldValues>({
  name,
  control,
  value,
  defaultValue = null,
  label,
  required = false,
  placeholder,
  disabled = false,
  readOnly = false,
  type = 'date',
  displayFormat,
  min,
  max,
  showClearButton = true,
  useMaskBehavior,
  dateSerializationFormat,
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
}: IDevExtremeDateBoxProps<T>) => {
  const formContext = useFormContext();
  const effectiveControl = control || formContext?.control;
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [standaloneValue, setStandaloneValue] = useControllableValue<Date | null>(value, defaultValue);

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

  const renderDateBox = (
    fieldValue: Date | null,
    fieldOnChange: (value: Date | null) => void,
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
        <DateBox
          value={fieldValue || undefined}
          onValueChanged={e => {
            if (isDevExtremeUserValueChange(e) && !isEqual(fieldValue, e.value)) {
              fieldOnChange(e.value || null);
              onValueChanged?.(e.value || null);
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
          type={type}
          displayFormat={displayFormat}
          min={min}
          max={max}
          showClearButton={showClearButton}
          useMaskBehavior={useMaskBehavior}
          {...(dateSerializationFormat !== undefined && { dateSerializationFormat })}
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
        {renderDateBox(standaloneValue, (next) => setStandaloneValue(next))}
      </div>
    );
  }

  return (
    <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
      <Controller
        name={name as Path<T>}
        control={effectiveControl}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
          return renderDateBox(value || null, onChange, onBlur, error);
        }}
      />
    </div>
  );
};

export default React.memo(DevExtremeDateBox) as typeof DevExtremeDateBox;
