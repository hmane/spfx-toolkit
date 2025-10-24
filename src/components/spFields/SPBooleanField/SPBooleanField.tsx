/**
 * SPBooleanField - SharePoint Boolean (Yes/No) Field Component
 *
 * A boolean field component that mirrors SharePoint's Yes/No fields.
 * Supports react-hook-form integration and DevExtreme CheckBox/Switch components.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { Controller, RegisterOptions } from 'react-hook-form';
import { CheckBox } from 'devextreme-react/check-box';
import { Switch } from 'devextreme-react/switch';
import { Stack } from '@fluentui/react/lib/Stack';
import { Label } from '@fluentui/react/lib/Label';
import { Text } from '@fluentui/react/lib/Text';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { ISPBooleanFieldProps, SPBooleanDisplayType } from './SPBooleanField.types';

/**
 * SPBooleanField component for boolean (Yes/No) input
 *
 * @example
 * ```tsx
 * // With react-hook-form
 * <SPBooleanField
 *   name="isActive"
 *   label="Active"
 *   control={control}
 * />
 *
 * // Toggle switch
 * <SPBooleanField
 *   name="enabled"
 *   label="Enabled"
 *   control={control}
 *   displayType={SPBooleanDisplayType.Toggle}
 *   showText
 * />
 * ```
 */
export const SPBooleanField: React.FC<ISPBooleanFieldProps> = (props) => {
  const {
    // Base props
    label,
    description,
    required = false,
    disabled = false,
    readOnly = false,
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

    // Boolean field specific props
    displayType = SPBooleanDisplayType.Checkbox,
    checkedText = 'Yes',
    uncheckedText = 'No',
    showText = false,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<boolean>(defaultValue || false);

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  // Handle boolean change
  const handleBooleanChange = React.useCallback(
    (newValue: boolean) => {
      setInternalValue(newValue);

      if (onChange) {
        onChange(newValue);
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

    return baseRules;
  }, [required, label, rules]);

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
    fieldValue: boolean,
    fieldOnChange: (val: boolean) => void,
    fieldError?: string
  ) => {
    const displayText = fieldValue ? checkedText : uncheckedText;

    return (
      <Stack className={`sp-boolean-field ${containerClass} ${className || ''}`}>
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

        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
          {displayType === SPBooleanDisplayType.Checkbox ? (
            <CheckBox
              value={fieldValue}
              onValueChanged={(e: any) => fieldOnChange(e.value)}
              disabled={disabled}
              readOnly={readOnly}
              text={showText ? displayText : ''}
            />
          ) : (
            <Switch
              value={fieldValue}
              onValueChanged={(e: any) => fieldOnChange(e.value)}
              disabled={disabled}
              readOnly={readOnly}
            />
          )}
          {showText && displayType === SPBooleanDisplayType.Toggle && (
            <Text>{displayText}</Text>
          )}
        </Stack>

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
        defaultValue={defaultValue || false}
        render={({ field, fieldState }) => (
          <>
            {renderField(
              field.value || false,
              (val) => field.onChange(val),
              fieldState.error?.message
            )}
          </>
        )}
      />
    );
  }

  // Standalone mode
  return renderField(currentValue, handleBooleanChange);
};

export default SPBooleanField;
