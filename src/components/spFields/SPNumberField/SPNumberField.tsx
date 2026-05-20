/**
 * SPNumberField - SharePoint Number Field Component
 *
 * A number field component that mirrors SharePoint's Number and Currency fields.
 * Supports react-hook-form integration and DevExtreme NumberBox component.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { Controller, RegisterOptions } from 'react-hook-form';
import { NumberBox } from 'devextreme-react/number-box';
import { Stack } from '@fluentui/react/lib/Stack';
import { Label } from '@fluentui/react/lib/Label';
import { Text } from '@fluentui/react/lib/Text';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { ISPNumberFieldProps } from './SPNumberField.types';
import { isDevExtremeUserValueChange } from '../../spForm/DevExtremeControls/validation';
import { useFormContext } from '../../spForm/context/FormContext';
import { addValidateRule, resolveFieldValidationState, shouldRenderFieldValidationMessage } from '../validation';
import '../spFields.css';

/**
 * SPNumberField component for numeric input
 *
 * @example
 * ```tsx
 * // With react-hook-form
 * <SPNumberField
 *   name="quantity"
 *   label="Quantity"
 *   control={control}
 *   min={1}
 *   max={100}
 * />
 *
 * // Currency
 * <SPNumberField
 *   name="price"
 *   label="Price"
 *   control={control}
 *   format={{
 *     currencyLocale: 'en-US',
 *     currencyCode: 'USD',
 *     decimals: 2
 *   }}
 * />
 * ```
 */
export const SPNumberField: React.FC<ISPNumberFieldProps> = (props) => {
  // Get control from FormContext if not provided as prop
  const formContext = useFormContext();
  const effectiveControl = props.control || formContext?.control;

  const {
    // Base props
    label,
    description,
    required = false,
    disabled = false,
    readOnly = false,
    placeholder,
    errorMessage,
    errorText,
    isValid,
    className,
    width,

    // Form props
    name,
    rules,

    // Standalone props
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,

    // Number field specific props
    min,
    max,
    step = 1,
    format,
    showSpinButtons = true,
    showClearButton = false,
    stylingMode = 'outlined',
    valueChangeMode = 'onChange',
    inputRef,
  } = props;

  const [internalValue, setInternalValue] = React.useState<number | undefined>(
    defaultValue ?? value
  );

  // Mirror external `value` prop changes into internal state. Without this, a
  // consumer that updates `value` via an async setState would briefly snap the
  // input back to a stale value mid-typing, because the displayed value would
  // prefer the prop over our internal state.
  React.useEffect(() => {
    if (value !== undefined && value !== internalValue) {
      setInternalValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Create internal ref if not provided
  const internalRef = React.useRef<HTMLDivElement>(null);
  const fieldRef = inputRef || internalRef;

  // Register field with FormContext for scroll-to-error functionality
  React.useEffect(() => {
    if (name && formContext?.registry) {
      formContext.registry.register(name, {
        name,
        label: label, // Only use label if explicitly provided, don't fallback to name
        required,
        ref: fieldRef as React.RefObject<HTMLElement>,
        section: undefined,
      });

      return () => {
        formContext.registry.unregister(name);
      };
    }
  }, [name, label, required, formContext, fieldRef]);

  // Display source of truth is always `internalValue`. External `value` changes
  // are mirrored into it by the effect above. Reading from a single source
  // eliminates the controlled-vs-uncontrolled snap-back during typing when the
  // consumer's setState is asynchronous.
  const currentValue = internalValue;

  // Build format string for DevExtreme
  const numberFormat = React.useMemo(() => {
    if (!format) return undefined;

    if (format.currencyCode) {
      // Currency format
      return {
        type: 'currency',
        currency: format.currencyCode,
        precision: format.decimals !== undefined ? format.decimals : 2,
        useGrouping: format.useGrouping !== false,
      };
    }

    if (format.percentage) {
      // Percentage format
      return {
        type: 'percent',
        precision: format.decimals !== undefined ? format.decimals : 2,
      };
    }

    // Standard number format
    return {
      type: 'fixedPoint',
      precision: format.decimals,
      useGrouping: format.useGrouping !== false,
    };
  }, [format]);

  // Handle number change
  const handleNumberChange = React.useCallback(
    (newValue: number | undefined) => {
      setInternalValue(newValue);

      if (onChange) {
        onChange(newValue as number);
      }
    },
    [onChange]
  );

  // Merge validation rules
  const validationRules = React.useMemo(() => {
    const baseRules: RegisterOptions = { ...rules };

    if (required && !baseRules.required) {
      baseRules.required = `${label || 'This field'} is required`;
    }

    // Add min/max validation
    if (min !== undefined || max !== undefined) {
      if (min !== undefined) {
        addValidateRule(
          baseRules,
          'min',
          (val: number | undefined | null) =>
            val === undefined || val === null || val >= min ||
            `Value must be at least ${min}`
        );
      }

      if (max !== undefined) {
        addValidateRule(
          baseRules,
          'max',
          (val: number | undefined | null) =>
            val === undefined || val === null || val <= max ||
            `Value must be at most ${max}`
        );
      }
    }

    return baseRules;
  }, [required, min, max, label, rules]);

  // Styles
  const containerClass = mergeStyles({
    width: width || '100%',
    marginBottom: 16,
  });

  // Render field content
  const renderField = (
    fieldValue: number | undefined,
    fieldOnChange: (val: number | undefined) => void,
    fieldError?: string
  ) => {
    return (
      <Stack className={`sp-number-field ${containerClass} ${className || ''}`}>
        {label && (
          <Label required={required} disabled={disabled}>
            {label}
          </Label>
        )}

        {description && (
          <Text variant="small" style={{ marginBottom: 4 }}>
            {description}
          </Text>
        )}

        <div ref={fieldRef as React.RefObject<HTMLDivElement>} data-field-name={name} data-field={name}>
        {(() => {
          const validation = resolveFieldValidationState({
            fieldError,
            errorMessage,
            errorText,
            isValid,
            fieldLabel: label || name,
          });
          return (
            <NumberBox
              key={`numberbox-${disabled}-${readOnly}`}
              value={fieldValue}
              onValueChanged={(e: any) => {
                if (isDevExtremeUserValueChange(e)) {
                  fieldOnChange(e.value);
                }
              }}
              disabled={disabled}
              readOnly={readOnly}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              format={numberFormat as any}
              showSpinButtons={showSpinButtons && !readOnly && !disabled}
              showClearButton={showClearButton && !readOnly && !disabled}
              stylingMode={stylingMode}
              valueChangeEvent={valueChangeMode === 'onBlur' ? 'blur' : 'keyup'}
              onFocusIn={onFocus}
              onFocusOut={onBlur}
              isValid={validation.isValid}
            />
          );
        })()}
        </div>

        {/* Error message row - only show when NOT in FormContext (standalone mode)
            When inside FormContext, FormItem/FormValue handles error display */}
        {validationMessage(fieldError)}
      </Stack>
    );
  };

  const validationMessage = (fieldError?: string) => {
    const validation = resolveFieldValidationState({
      fieldError,
      errorMessage,
      errorText,
      isValid,
      fieldLabel: label || name,
    });
    if (!shouldRenderFieldValidationMessage({
      validation,
      fieldError,
      errorMessage,
      errorText,
      isValid,
      formContext,
    })) return null;

    return (
      <div className="sp-field-meta-row">
        <span className="sp-field-error" role="alert">
          <span className="sp-field-error-text">{validation.errorMessage}</span>
        </span>
      </div>
    );
  };

  // If using react-hook-form (from prop or context)
  if (effectiveControl && name) {
    return (
      <Controller
        name={name}
        control={effectiveControl}
        rules={validationRules}
        defaultValue={defaultValue}
        render={({ field, fieldState }) => (
          <>
            {renderField(
              field.value,
              (val) => field.onChange(val),
              fieldState.error?.message
            )}
          </>
        )}
      />
    );
  }

  // Standalone mode
  return renderField(currentValue, handleNumberChange);
};

export default SPNumberField;
