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
    control,
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
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<number | undefined>(defaultValue);

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
          isValid={!fieldError}
          validationError={fieldError ? { message: fieldError } : undefined}
        />

        {/* Show error messages */}
        {(fieldError || errorMessage) && (
          <Text className={errorClass}>{fieldError || errorMessage}</Text>
        )}
      </Stack>
    );
  };

  // If using react-hook-form
  if (control && name) {
    return (
      <Controller
        name={name}
        control={control}
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
