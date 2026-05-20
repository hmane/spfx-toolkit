import { TextArea } from 'devextreme-react/text-area';
import * as React from 'react';
import { Controller, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';
import {
  CharCountSync,
  DevExtremeFieldMetaRow,
  IDevExtremeValidationProps,
  isDevExtremeUserValueChange,
  resolveDevExtremeValidationState,
  useControllableValue,
} from './validation';

export interface IDevExtremeTextAreaProps<T extends FieldValues> extends IDevExtremeValidationProps {
  name: Path<T> | string;
  control?: any;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  minHeight?: number | string;
  maxHeight?: number | string;
  height?: number | string;
  autoResizeEnabled?: boolean;
  spellcheck?: boolean;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  hint?: string;
  inputAttr?: Record<string, any>;
  tabIndex?: number;
  onValueChanged?: (value: string) => void;
  onEnterKey?: (e: any) => void;
  onKeyDown?: (e: any) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeTextArea = <T extends FieldValues>({
  name,
  control,
  value,
  defaultValue = '',
  label,
  required = false,
  placeholder,
  disabled = false,
  readOnly = false,
  maxLength,
  showCharacterCount = false,
  minHeight = 80,
  maxHeight,
  height,
  autoResizeEnabled = true,
  spellcheck = true,
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
}: IDevExtremeTextAreaProps<T>) => {
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

  const renderTextArea = (
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
        <TextArea
          value={fieldTextValue}
          onValueChanged={e => {
            const nextValue = e.value || '';
            if (isDevExtremeUserValueChange(e) && fieldTextValue !== nextValue) {
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
          maxLength={maxLength}
          minHeight={minHeight}
          maxHeight={maxHeight}
          height={height}
          autoResizeEnabled={autoResizeEnabled}
          spellcheck={spellcheck}
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
        {renderTextArea(standaloneValue, (next) => setStandaloneValue(next))}
      </div>
    );
  }

  return (
    <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
      <Controller
        name={name as Path<T>}
        control={effectiveControl}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
          return renderTextArea(value || '', onChange, onBlur, error);
        }}
      />
    </div>
  );
};

export default React.memo(DevExtremeTextArea) as typeof DevExtremeTextArea;
