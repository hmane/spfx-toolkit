import { TextBox } from 'devextreme-react/text-box';
import * as React from 'react';
import { Controller, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';
import {
  CharCountSync,
  DevExtremeFieldMetaRow,
  IDevExtremeValidationProps,
  resolveDevExtremeValidationState,
  useControllableValue,
} from './validation';

export interface IDevExtremeTextBoxProps<T extends FieldValues> extends IDevExtremeValidationProps {
  name: Path<T> | string;
  control?: any;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  mode?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
  maxLength?: number;
  showCharacterCount?: boolean;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  hint?: string;
  inputAttr?: Record<string, any>;
  tabIndex?: number;
  // DevExtreme TextBox button configs (use array form instead of nested <TextBoxButton> JSX,
  // which devextreme-react does not support inside this wrapper).
  buttons?: Array<{
    name?: string;
    location?: 'before' | 'after';
    options?: any;
  }>;
  onValueChanged?: (value: string) => void;
  onEnterKey?: (e: any) => void;
  onKeyDown?: (e: any) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

function DevExtremeTextBoxInner<T extends FieldValues>({
  name,
  control,
  value,
  defaultValue = '',
  label,
  required = false,
  placeholder,
  disabled = false,
  readOnly = false,
  mode = 'text',
  maxLength,
  showCharacterCount = false,
  stylingMode = 'outlined',
  className = '',
  hint,
  inputAttr,
  tabIndex,
  buttons,
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
}: IDevExtremeTextBoxProps<T>) {
  const formContext = useFormContext();
  const effectiveControl = control || formContext?.control;
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [standaloneValue, setStandaloneValue] = useControllableValue<string>(value, defaultValue);
  const hasInlineCustomValidation =
    showErrorMessage !== false && (!!errorMessage || !!errorText || isValid === false);
  const shouldUseFormContextCharCount =
    !!formContext?.autoShowErrors &&
    showCharacterCount &&
    !!name &&
    !hasInlineCustomValidation;

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

  const renderTextBox = (
    fieldValue: string,
    fieldOnChange: (value: string) => void,
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
    const fieldTextValue = fieldValue || '';
    const inlineCharCount = showCharacterCount && !shouldUseFormContextCharCount;

    return (
      <>
        <TextBox
          value={fieldTextValue}
          onValueChanged={e => {
            const nextValue = e.value || '';
            if (fieldTextValue !== nextValue) {
              fieldOnChange(nextValue);
              onValueChanged?.(nextValue);
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
          mode={mode}
          maxLength={maxLength}
          {...(buttons !== undefined && { buttons: buttons as any })}
          hint={hint}
          inputAttr={inputAttr}
          tabIndex={tabIndex}
          stylingMode={stylingMode}
          onEnterKey={onEnterKey}
          onKeyDown={onKeyDown}
          className={`${className} ${validation.hasError ? 'dx-invalid' : ''}`}
          isValid={validation.isValid}
          validationError={validation.validationError}
          validationMessageMode={validation.validationMessageMode}
        />
        <DevExtremeFieldMetaRow
          name={name as string}
          error={validation.shouldRenderInlineError ? validation.errorMessage : undefined}
          showCharacterCount={inlineCharCount}
          currentCharCount={fieldTextValue.length}
          maxLength={maxLength}
        />
        <CharCountSync
          name={name as string}
          value={fieldTextValue}
          maxLength={maxLength}
          enabled={shouldUseFormContextCharCount}
          registry={formContext?.charCountRegistry}
        />
      </>
    );
  };

  if (!effectiveControl) {
    return (
      <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
        {renderTextBox(
          standaloneValue,
          (next) => setStandaloneValue(next)
        )}
      </div>
    );
  }

  return (
    <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
      <Controller
        name={name as Path<T>}
        control={effectiveControl}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
          return renderTextBox(value || '', onChange, onBlur, error);
        }}
      />
    </div>
  );
}

const DevExtremeTextBox = React.memo(DevExtremeTextBoxInner) as <T extends FieldValues>(
  props: IDevExtremeTextBoxProps<T>
) => React.ReactElement;

export default DevExtremeTextBox;
