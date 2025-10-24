/**
 * SPTextField - SharePoint Text Field Component
 *
 * A text field component that mirrors SharePoint's single-line and multi-line text fields.
 * Supports react-hook-form integration and DevExtreme TextBox/TextArea components.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { Controller, RegisterOptions } from 'react-hook-form';
import TextBox from 'devextreme-react/text-box';
import TextArea from 'devextreme-react/text-area';
import { ISPTextFieldProps, SPTextFieldMode } from './SPTextField.types';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Label } from '@fluentui/react/lib/Label';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';

/**
 * SPTextField component for single-line and multi-line text input
 *
 * @example
 * ```tsx
 * // With react-hook-form
 * <SPTextField
 *   name="title"
 *   label="Title"
 *   control={control}
 *   rules={{ required: 'Title is required' }}
 *   maxLength={255}
 * />
 *
 * // Standalone
 * <SPTextField
 *   label="Description"
 *   mode={SPTextFieldMode.MultiLine}
 *   value={description}
 *   onChange={setDescription}
 * />
 * ```
 */
export const SPTextField: React.FC<ISPTextFieldProps> = (props) => {
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

    // TextField specific props
    mode = SPTextFieldMode.SingleLine,
    maxLength,
    minLength,
    rows = 4,
    showCharacterCount = false,
    pattern,
    patternMessage,
    autoFocus = false,
    inputType = 'text',
    spellCheck = true,
    autoComplete,
    prefixIcon,
    suffixIcon,
    showClearButton = false,
    debounceDelay = 300,
    inputClassName,
    mask,
    maskChar = '_',
    stylingMode = 'outlined',

    // SharePoint props (for future use)
    // listId,
    // fieldName,
    // webUrl,
    // showFieldIcon,
    // renderDisplayMode,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<string>(defaultValue || '');
  const [charCount, setCharCount] = React.useState<number>(0);
  const debounceTimerRef = React.useRef<NodeJS.Timeout>();

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  React.useEffect(() => {
    setCharCount(currentValue?.length || 0);
  }, [currentValue]);

  // Debounced change handler
  const handleChange = React.useCallback(
    (newValue: string) => {
      setInternalValue(newValue);
      setCharCount(newValue?.length || 0);

      if (onChange) {
        if (debounceDelay > 0) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            onChange(newValue);
          }, debounceDelay);
        } else {
          onChange(newValue);
        }
      }
    },
    [onChange, debounceDelay]
  );

  // Cleanup debounce timer
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Merge validation rules
  const validationRules = React.useMemo(() => {
    const baseRules: RegisterOptions = { ...rules };

    if (required && !baseRules.required) {
      baseRules.required = `${label || 'This field'} is required`;
    }

    if (maxLength && !baseRules.maxLength) {
      baseRules.maxLength = {
        value: maxLength,
        message: `Maximum ${maxLength} characters allowed`,
      };
    }

    if (minLength && !baseRules.minLength) {
      baseRules.minLength = {
        value: minLength,
        message: `Minimum ${minLength} characters required`,
      };
    }

    if (pattern && !baseRules.pattern) {
      baseRules.pattern = {
        value: pattern,
        message: patternMessage || 'Invalid format',
      };
    }

    return baseRules;
  }, [required, maxLength, minLength, pattern, patternMessage, label, rules]);

  // Container styles
  const containerClass = mergeStyles({
    width: width || '100%',
    marginBottom: 16,
  });

  // Error message styles
  const errorClass = mergeStyles({
    color: theme.palette.redDark,
    fontSize: 12,
    marginTop: 4,
  });

  // Character count styles
  const charCountClass = mergeStyles({
    fontSize: 12,
    color: theme.palette.neutralSecondary,
    marginTop: 4,
    textAlign: 'right',
  });

  // Render field content
  const renderField = (fieldValue: string, fieldOnChange: (val: string) => void, fieldError?: string) => {
    const isMultiLine = mode === SPTextFieldMode.MultiLine;
    const fieldProps = {
      key: `textbox-${disabled}-${readOnly}`,
      value: fieldValue || '',
      onValueChanged: (e: any) => fieldOnChange(e.value),
      disabled: disabled,
      readOnly: readOnly,
      placeholder: placeholder,
      maxLength: maxLength,
      autoFocus: autoFocus,
      showClearButton: showClearButton && !disabled,
      stylingMode: stylingMode,
      className: inputClassName,
      onFocusIn: onFocus,
      onFocusOut: onBlur,
      isValid: !fieldError,
      validationError: fieldError ? { message: fieldError } : undefined,
    };

    return (
      <Stack className={containerClass}>
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

        {isMultiLine ? (
          <TextArea
            {...fieldProps}
            height={rows * 24}
            inputAttr={{
              spellcheck: spellCheck,
            }}
            autoResizeEnabled={true}
          />
        ) : (
          <TextBox
            {...fieldProps}
            mode={inputType === 'password' ? 'password' : 'text'}
            inputAttr={{
              type: inputType,
              spellcheck: spellCheck,
              autoComplete: autoComplete,
            }}
            mask={mask}
            maskChar={maskChar}
          />
        )}

        {(fieldError || errorMessage) && (
          <Text className={errorClass}>{fieldError || errorMessage}</Text>
        )}

        {showCharacterCount && (
          <Text className={charCountClass}>
            {charCount}
            {maxLength && ` / ${maxLength}`}
          </Text>
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
        defaultValue={defaultValue || ''}
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
  return renderField(currentValue, handleChange);
};

export default SPTextField;
