import { Autocomplete } from 'devextreme-react/autocomplete';
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

export interface IDevExtremeAutocompleteProps<T extends FieldValues> extends IDevExtremeValidationProps {
  name: Path<T> | string;
  control?: any;
  value?: string;
  defaultValue?: string;
  dataSource?: any[] | any;
  items?: any[];
  displayExpr?: string;
  valueExpr?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  minSearchLength?: number;
  searchTimeout?: number;
  showClearButton?: boolean;
  maxItemCount?: number;
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

const DevExtremeAutocomplete = <T extends FieldValues>({
  name,
  control,
  value,
  defaultValue = '',
  label,
  required = false,
  dataSource,
  items,
  displayExpr,
  valueExpr,
  placeholder,
  disabled = false,
  readOnly = false,
  minSearchLength = 0,
  searchTimeout = 500,
  showClearButton = true,
  maxItemCount = 10,
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
}: IDevExtremeAutocompleteProps<T>) => {
  const formContext = useFormContext();
  const effectiveControl = control || formContext?.control;
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [standaloneValue, setStandaloneValue] = useControllableValue<string>(value, defaultValue);

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

  const renderAutocomplete = (
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

    return (
      <>
        <Autocomplete
          dataSource={dataSource}
          items={items}
          value={fieldValue || ''}
          onValueChanged={e => {
            if (isDevExtremeUserValueChange(e) && fieldValue !== e.value) {
              fieldOnChange(e.value);
              onValueChanged?.(e.value);
            }
          }}
          onFocusIn={onFocusIn}
          onFocusOut={() => {
            fieldOnBlur?.();
            onFocusOut?.();
          }}
          displayExpr={displayExpr}
          valueExpr={valueExpr}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          minSearchLength={minSearchLength}
          searchTimeout={searchTimeout}
          showClearButton={showClearButton}
          maxItemCount={maxItemCount}
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
        {renderAutocomplete(standaloneValue, (next) => setStandaloneValue(next))}
      </div>
    );
  }

  return (
    <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
      <Controller
        name={name as Path<T>}
        control={effectiveControl}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
          return renderAutocomplete(value || '', onChange, onBlur, error);
        }}
      />
    </div>
  );
};

export default React.memo(DevExtremeAutocomplete) as typeof DevExtremeAutocomplete;
