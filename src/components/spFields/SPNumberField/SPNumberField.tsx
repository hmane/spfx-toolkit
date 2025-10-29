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
import { useTheme } from '@fluentui/react/lib/Theme';
import { ISPNumberFieldProps } from './SPNumberField.types';
import { useFormContext } from '../../spForm/context/FormContext';

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
    className,
    width,

    // Form props
    name,
    control: controlProp,
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

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<number | undefined>(defaultValue);

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

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

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
      baseRules.validate = {
        ...baseRules.validate,
        ...(min !== undefined && {
          min: (val: number) =>
            val === undefined || val >= min ||
            `Value must be at least ${min}`,
        }),
        ...(max !== undefined && {
          max: (val: number) =>
            val === undefined || val <= max ||
            `Value must be at most ${max}`,
        }),
      };
    }

    return baseRules;
  }, [required, min, max, label, rules]);

  // Styles
  const containerClass = mergeStyles({
    width: width || '100%',
    marginBottom: 16,
  });

  const errorClass = mergeStyles({
    color: theme.palette.redDark,
    fontSize: 12,
    marginTop: 4,
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

        <div ref={fieldRef as React.RefObject<HTMLDivElement>}>
        {(() => {
          const hasError = !!fieldError;
          return (
            <NumberBox
              key={`numberbox-${disabled}-${readOnly}`}
              value={fieldValue}
              onValueChanged={(e: any) => fieldOnChange(e.value)}
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
              isValid={!hasError}
              validationStatus={hasError ? 'invalid' : 'valid'}
              className={`${hasError ? 'dx-invalid' : ''}`.trim()}
            />
          );
        })()}
        </div>
      </Stack>
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
