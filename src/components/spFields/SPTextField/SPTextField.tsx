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
import { Controller, RegisterOptions, useWatch, useForm } from 'react-hook-form';
import TextBox from 'devextreme-react/text-box';
import TextArea from 'devextreme-react/text-area';
import { ISPTextFieldProps, SPTextFieldMode, INoteHistoryEntry } from './SPTextField.types';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Label } from '@fluentui/react/lib/Label';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { NoteHistory } from './NoteHistory';
import { useFormContext } from '../../spForm/context/FormContext';
import '../spFields.css';

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
  // Get control from FormContext if not provided as prop
  const formContext = useFormContext();

  // Determine if we're in standalone mode FIRST (before creating any form)
  const isStandaloneMode = !props.control && !formContext?.control;

  // Create a fallback form for standalone mode (no control provided)
  // This ensures useWatch always has a valid control to work with
  // IMPORTANT: useForm must be called unconditionally (React hooks rule)
  // but we only use the fallback control when actually in standalone mode
  const fallbackForm = useForm({ defaultValues: { __standalone__: '' } });

  // Use provided control, context control, or fallback (only in standalone mode)
  const effectiveControl = props.control || formContext?.control || (isStandaloneMode ? fallbackForm.control : undefined);

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

    // Ref for focus management
    inputRef,

    // SharePoint props (for future use)
    // webUrl,
    // showFieldIcon,
    // renderDisplayMode,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<string>(defaultValue || '');
  const debounceTimerRef = React.useRef<NodeJS.Timeout>();
  const [fieldValue, setFieldValue] = React.useState<string>(defaultValue || '');

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

  // Determine if we should show history
  const showHistory = appendOnly && itemId && listNameOrId && (fieldInternalName || name);
  const isRichTextMode = mode === SPTextFieldMode.RichText;
  const historyPosition = historyConfig?.position || 'below';

  // Determine if char count should be handled by FormContext (when inside spForm)
  // IMPORTANT: When history is shown below, SPTextField renders char count inline (between input and history),
  // so we should NOT register with FormContext to avoid duplicate display
  const shouldUseFormContextCharCount = formContext?.autoShowErrors && showCharacterCount && name && !(showHistory && historyPosition === 'below');

  // Watch form value for char count registration (when using react-hook-form)
  // In standalone mode, we use the fallback form with a dummy field name
  const watchFieldName = isStandaloneMode ? '__standalone__' : (name || '__unused__');
  const watchedValue = useWatch({
    control: effectiveControl,
    name: watchFieldName as string,
    defaultValue: defaultValue || '',
    disabled: isStandaloneMode,
  });

  // Use controlled value if provided, otherwise use internal state
  // EXCEPTION: For append-only mode, always use internal state for the input
  // because the value prop contains existing notes (or SharePoint HTML link)
  // and the input should start empty for adding new notes
  const currentValue = appendOnly ? internalValue : (value !== undefined ? value : internalValue);

  // Get the actual value for char count (from form, controlled prop, or internal state)
  const charCountValue = React.useMemo(() => {
    if (!isStandaloneMode && name) {
      return watchedValue || '';
    }
    return currentValue || '';
  }, [isStandaloneMode, name, watchedValue, currentValue]);

  // Register char count with FormContext via useEffect (not during render)
  React.useEffect(() => {
    if (shouldUseFormContextCharCount && formContext?.charCountRegistry && name) {
      const charCount = (charCountValue as string)?.length || 0;
      formContext.charCountRegistry.set(name, {
        current: charCount,
        max: maxLength,
        warningThreshold: 0.9,
      });
    }
  }, [shouldUseFormContextCharCount, formContext, name, charCountValue, maxLength]);

  // Separate cleanup effect - only runs on unmount or when char count feature is disabled
  React.useEffect(() => {
    return () => {
      if (formContext?.charCountRegistry && name) {
        formContext.charCountRegistry.remove(name);
      }
    };
  }, [formContext, name]);

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

  // Character count warning threshold (90% of max)
  const getCharCountClass = React.useCallback((current: number, max?: number): string => {
    if (!max) return 'sp-field-char-count';
    const ratio = current / max;
    if (ratio >= 1) return 'sp-field-char-count error';
    if (ratio >= 0.9) return 'sp-field-char-count warning';
    return 'sp-field-char-count';
  }, []);

  // Render field content
  const renderField = (fieldValue: string, fieldOnChange: (val: string) => void, fieldError?: string) => {
    const isMultiLine = mode === SPTextFieldMode.MultiLine;

    // For append-only mode, the input should always be empty (for adding new notes)
    // The existing notes are shown in NoteHistory, not in the input
    // Also filter out SharePoint's "View Entries" HTML links
    const effectiveFieldValue = appendOnly
      ? (fieldValue && !fieldValue.includes('View Entries</a>') ? fieldValue : '')
      : fieldValue;

    const currentCharCount = effectiveFieldValue?.length || 0;

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

    const hasError = !!fieldError;

    const fieldProps = {
      key: `textbox-${disabled}-${readOnly}`,
      value: effectiveFieldValue || '',
      onValueChanged: (e: any) => fieldOnChange(e.value),
      valueChangeEvent: 'input', // Update on every keystroke for real-time character count
      disabled: disabled,
      readOnly: readOnly,
      placeholder: placeholder,
      maxLength: maxLength,
      autoFocus: autoFocus,
      showClearButton: showClearButton && !disabled,
      stylingMode: stylingMode,
      className: inputClassName || '',
      onFocusIn: onFocus,
      onFocusOut: onBlur,
      // Keep isValid for DevExtreme error styling (red border), but don't pass validationError (we render our own)
      isValid: !hasError,
      ...(buttons.length > 0 && { buttons }), // Only add buttons if we have any
    };

    // For append-only mode, only show input when not read-only
    // In read-only append-only mode, the history component shows all content
    const shouldShowInput = appendOnly ? (!disabled && !readOnly) : (!disabled || !appendOnly);

    return (
      <Stack className={`sp-text-field ${containerClass} ${className || ''}`}>
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
            hasInputAbove={false}
          />
        )}

        {/* Input field (hidden when disabled in append-only mode) */}
        {shouldShowInput && (
          <div ref={fieldRef as React.RefObject<HTMLDivElement>} style={{ width: '100%' }}>
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

          </div>
        )}

        {/* Error message row - only show when NOT in FormContext (standalone mode)
            When inside FormContext, FormItem/FormValue handles error display */}
        {hasError && !formContext && (
          <div className="sp-field-meta-row">
            <span className="sp-field-error" role="alert">
              <span className="sp-field-error-text">{fieldError}</span>
            </span>
          </div>
        )}

        {/* Character count row - render here if:
            1. Not using FormContext char count (standalone mode), OR
            2. History is shown below (char count must appear between input and history, not after history)
            When history is below, we always render char count here to maintain proper visual order */}
        {showCharacterCount && !isRichTextMode && (!shouldUseFormContextCharCount || (showHistory && historyPosition === 'below')) && (
          <div className="sp-field-meta-row">
            <span className={getCharCountClass(currentCharCount, maxLength)}>
              {currentCharCount}
              {maxLength && ` / ${maxLength}`}
            </span>
          </div>
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
            hasInputAbove={shouldShowInput}
          />
        )}
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
        defaultValue={defaultValue || ''}
        render={({ field, fieldState }) => {
          return renderField(
            field.value,
            (val) => field.onChange(val),
            fieldState.error?.message
          );
        }}
      />
    );
  }

  // Standalone mode
  return renderField(currentValue, handleChange);
};

export default SPTextField;
