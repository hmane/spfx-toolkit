/**
 * SPTextField - SharePoint Text Field Component
 *
 * A text field component that mirrors SharePoint's single-line and multi-line text fields.
 * Supports react-hook-form integration and DevExtreme TextBox/TextArea components.
 * Also supports rich text mode and append-only (history) mode for Note fields.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { Controller, RegisterOptions } from 'react-hook-form';
import TextBox from 'devextreme-react/text-box';
import TextArea from 'devextreme-react/text-area';
import { ISPTextFieldProps, SPTextFieldMode, INoteHistoryEntry } from './SPTextField.types';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Label } from '@fluentui/react/lib/Label';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { NoteHistory } from './NoteHistory';

// Lazy load RichText from PnP for better bundle size
const RichText = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/RichText').then((m) => ({ default: m.RichText }))
);

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

    // Append-only props
    appendOnly = false,
    itemId,
    listNameOrId,
    fieldInternalName,
    historyConfig,
    useCacheForHistory = false,
    onHistoryLoad,
    onHistoryError,
    onNoteAdd,
    onCopyPrevious,

    // SharePoint props (for future use)
    // webUrl,
    // showFieldIcon,
    // renderDisplayMode,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<string>(defaultValue || '');
  const debounceTimerRef = React.useRef<NodeJS.Timeout>();
  const [fieldValue, setFieldValue] = React.useState<string>(defaultValue || '');

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  // Determine if we should show history
  const showHistory = appendOnly && itemId && listNameOrId && (fieldInternalName || name);
  const isRichTextMode = mode === SPTextFieldMode.RichText;
  const historyPosition = historyConfig?.position || 'below';

  // Debounced change handler
  const handleChange = React.useCallback(
    (newValue: string) => {
      setInternalValue(newValue);

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

  /**
   * Handle copy previous entry
   */
  const handleCopyPrevious = React.useCallback(
    (entry: INoteHistoryEntry) => {
      // Set the value to the copied entry
      setInternalValue(entry.text);
      setFieldValue(entry.text);

      // Trigger onChange if provided
      if (onChange) {
        onChange(entry.text);
      }

      // Fire callback
      if (onCopyPrevious) {
        onCopyPrevious(entry);
      }
    },
    [onChange, onCopyPrevious]
  );

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
    const currentCharCount = fieldValue?.length || 0;

    // Build buttons array for prefix/suffix icons
    const buttons: any[] = [];
    if (prefixIcon && !isMultiLine) {
      buttons.push({
        name: 'prefix',
        location: 'before' as 'before',
        options: {
          icon: prefixIcon,
          stylingMode: 'text' as 'text',
          disabled: true, // Make icon non-clickable by default
        }
      });
    }
    if (suffixIcon && !isMultiLine) {
      buttons.push({
        name: 'suffix',
        location: 'after' as 'after',
        options: {
          icon: suffixIcon,
          stylingMode: 'text' as 'text',
          disabled: true, // Make icon non-clickable by default
        }
      });
    }

    const fieldProps = {
      key: `textbox-${disabled}-${readOnly}`,
      value: fieldValue || '',
      onValueChanged: (e: any) => fieldOnChange(e.value),
      valueChangeEvent: 'input', // Update on every keystroke for real-time character count
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
      ...(buttons.length > 0 && { buttons }), // Only add buttons if we have any
    };

    // For append-only mode with disabled, only show history (no input field)
    const shouldShowInput = !disabled || !appendOnly;

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

        {/* Show history above if configured */}
        {showHistory && historyPosition === 'above' && (
          <NoteHistory
            itemId={itemId!}
            listNameOrId={listNameOrId!}
            fieldInternalName={fieldInternalName || name!}
            config={historyConfig}
            isRichText={isRichTextMode}
            useCache={useCacheForHistory}
            onHistoryLoad={onHistoryLoad}
            onHistoryError={onHistoryError}
            onCopyPrevious={handleCopyPrevious}
          />
        )}

        {/* Input field (hidden when disabled in append-only mode) */}
        {shouldShowInput && (
          <>
            {isRichTextMode ? (
              <React.Suspense fallback={<Text>Loading rich text editor...</Text>}>
                <RichText
                  value={fieldValue || ''}
                  onChange={(text: string) => {
                    fieldOnChange(text);
                    return text;
                  }}
                  isEditMode={!readOnly && !disabled}
                  placeholder={placeholder}
                  className={inputClassName}
                />
              </React.Suspense>
            ) : isMultiLine ? (
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

            {showCharacterCount && !isRichTextMode && (
              <Text className={charCountClass}>
                {currentCharCount}
                {maxLength && ` / ${maxLength}`}
              </Text>
            )}
          </>
        )}

        {/* Show history below if configured (default) */}
        {showHistory && historyPosition === 'below' && (
          <NoteHistory
            itemId={itemId!}
            listNameOrId={listNameOrId!}
            fieldInternalName={fieldInternalName || name!}
            config={historyConfig}
            isRichText={isRichTextMode}
            useCache={useCacheForHistory}
            onHistoryLoad={onHistoryLoad}
            onHistoryError={onHistoryError}
            onCopyPrevious={handleCopyPrevious}
          />
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
