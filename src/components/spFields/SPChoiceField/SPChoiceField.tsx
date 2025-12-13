/**
 * SPChoiceField - SharePoint Choice Field Component
 *
 * A choice field component that mirrors SharePoint's Choice and Multi-Choice fields.
 * Supports react-hook-form integration, DevExtreme UI, and "Other" option functionality.
 *
 * @packageDocumentation
 */

import { Label } from '@fluentui/react/lib/Label';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { Text } from '@fluentui/react/lib/Text';
import { useTheme } from '@fluentui/react/lib/Theme';
import { CheckBox } from 'devextreme-react/check-box';
import { RadioGroup } from 'devextreme-react/radio-group';
import { SelectBox } from 'devextreme-react/select-box';
import { TagBox } from 'devextreme-react/tag-box';
import TextBox from 'devextreme-react/text-box';
import * as React from 'react';
import { Controller, RegisterOptions, useWatch } from 'react-hook-form';
import {
  DefaultSPChoiceFieldProps,
  ISPChoiceFieldProps,
  SPChoiceDisplayType
} from './SPChoiceField.types';
import { useSPChoiceField } from './hooks/useSPChoiceField';
import { useFormContext } from '../../spForm/context/FormContext';

/**
 * SPChoiceField component for choice and multi-choice selection
 *
 * @example
 * ```tsx
 * // With react-hook-form
 * <SPChoiceField
 *   name="status"
 *   label="Status"
 *   control={control}
 *   choices={['Not Started', 'In Progress', 'Completed']}
 * />
 *
 * // With SharePoint field
 * <SPChoiceField
 *   name="category"
 *   label="Category"
 *   control={control}
 *   dataSource={{
 *     type: 'list',
 *     listNameOrId: 'Tasks',
 *     fieldInternalName: 'Category'
 *   }}
 * />
 * ```
 */
export const SPChoiceField: React.FC<ISPChoiceFieldProps> = props => {
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
    placeholder = DefaultSPChoiceFieldProps.placeholder,
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

    // Choice field props
    dataSource,
    choices: staticChoices,
    displayType = DefaultSPChoiceFieldProps.displayType,
    allowMultiple = DefaultSPChoiceFieldProps.allowMultiple,
    otherConfig: userOtherConfig,
    useCache = DefaultSPChoiceFieldProps.useCache,
    maxDisplayedTags = DefaultSPChoiceFieldProps.maxDisplayedTags,
    showMultiTagOnly = DefaultSPChoiceFieldProps.showMultiTagOnly,
    sortChoices = DefaultSPChoiceFieldProps.sortChoices,
    showClearButton = DefaultSPChoiceFieldProps.showClearButton,
    renderItem,
    renderValue,

    // Ref for focus management
    inputRef,
  } = props;

  const theme = useTheme();

  // Merge user's otherConfig with defaults to ensure all properties have values
  const otherConfig = React.useMemo(() => ({
    ...DefaultSPChoiceFieldProps.otherConfig,
    ...userOtherConfig,
  }), [userOtherConfig]);

  // Create stable references to prevent infinite loops
  const emptyArray = React.useRef<string[]>([]).current;
  const emptyString = React.useRef<string>('').current;

  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue || (allowMultiple ? emptyArray : emptyString)
  );
  const [invalidValueError, setInvalidValueError] = React.useState<string | null>(null);
  const [isDOMReady, setIsDOMReady] = React.useState(false);

  // Create internal ref if not provided
  const internalRef = React.useRef<HTMLDivElement>(null);
  const fieldRef = inputRef || internalRef;

  // Watch form value when using react-hook-form (to detect "Other" values on load)
  // This ensures the hook receives the actual form value, not just the initial/empty value
  const watchedFormValue = useWatch({
    control: effectiveControl,
    name: name as string,
    defaultValue: defaultValue,
    disabled: !effectiveControl || !name,
  });

  // Determine the actual current value for the hook
  // Priority: standalone value prop > watched form value > internal state
  const hookValue = React.useMemo(() => {
    if (value !== undefined) return value;
    if (effectiveControl && name && watchedFormValue !== undefined) return watchedFormValue;
    return internalValue;
  }, [value, effectiveControl, name, watchedFormValue, internalValue]);

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

  // Wait for DOM to be fully ready before rendering DevExtreme components
  // This prevents DevExtreme from trying to measure elements before they exist
  React.useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsDOMReady(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Use the hook to load choices and manage "Other" option
  const {
    metadata,
    choices: loadedChoices,
    loading,
    error,
    retry,
    otherEnabled,
    otherOptionText,
    otherState,
    setCustomValue,
    isOtherValue,
  } = useSPChoiceField(dataSource, staticChoices, hookValue, otherConfig, useCache);

  // Sort choices if requested
  const finalChoices = React.useMemo(() => {
    if (sortChoices) {
      return [...loadedChoices].sort((a, b) => a.localeCompare(b));
    }
    return loadedChoices;
  }, [loadedChoices, sortChoices]);

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  // Determine if field should allow multiple selections
  const isMultiChoice = React.useMemo(() => {
    // Explicitly set allowMultiple takes precedence
    if (allowMultiple !== undefined && allowMultiple !== DefaultSPChoiceFieldProps.allowMultiple) {
      return allowMultiple;
    }
    // Otherwise use metadata from SharePoint
    return metadata?.isMultiChoice || false;
  }, [allowMultiple, metadata]);

  // LRU cache for transformed values to prevent infinite loops from array recreation
  // Using Map which maintains insertion order for LRU eviction
  const transformedValuesCache = React.useRef<Map<string, string | string[]>>(new Map());
  const MAX_CACHE_SIZE = 50; // Reduced size since values are typically stable

  // Helper function to transform value for dropdown display (convert custom values to "Other" if needed)
  const getDropdownValue = React.useCallback(
    (val: string | string[] | undefined | null) => {
      if (!val) return isMultiChoice ? emptyArray : undefined;

      // Create a stable cache key - include otherState to detect when "Other" is selected
      const cacheKey = JSON.stringify({ val, otherEnabled, otherOptionText, isOtherSelected: otherState.isOtherSelected, customValue: otherState.customValue });
      const cache = transformedValuesCache.current;

      // Return cached result if available (LRU: move to end on access)
      if (cache.has(cacheKey)) {
        const cachedValue = cache.get(cacheKey)!;
        // Move to end for LRU by delete + set
        cache.delete(cacheKey);
        cache.set(cacheKey, cachedValue);
        return cachedValue;
      }

      let result: string | string[];

      if (Array.isArray(val)) {
        // Multi-select: replace custom values with "Other"
        const mapped = val.map(v => {
          // Check if this is a known "Other" value from state or detected by isOtherValue
          if (otherEnabled && (isOtherValue(v) || (otherState.isOtherSelected && v === otherState.customValue))) {
            return otherOptionText;
          }
          return v;
        });
        result = mapped;
      } else {
        // Single-select: replace custom value with "Other"
        // Use both isOtherValue check AND check against known otherState.customValue
        if (otherEnabled && (isOtherValue(val) || (otherState.isOtherSelected && val === otherState.customValue))) {
          result = otherOptionText;
        } else {
          result = val;
        }
      }

      // Evict oldest entries if at capacity (LRU eviction)
      while (cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) {
          cache.delete(oldestKey);
        } else {
          break;
        }
      }

      // Cache the result
      cache.set(cacheKey, result);

      return result;
    },
    [otherEnabled, isOtherValue, otherOptionText, isMultiChoice, emptyArray, otherState.isOtherSelected, otherState.customValue]
  );

  // Determine dropdown value for standalone mode (convert custom values to "Other" if needed)
  const dropdownValue = React.useMemo(() => {
    return getDropdownValue(currentValue);
  }, [currentValue, getDropdownValue]);

  // Validate value against choices
  React.useEffect(() => {
    if (!metadata || loading) {
      setInvalidValueError(null);
      return;
    }

    if (!currentValue) {
      setInvalidValueError(null);
      return;
    }

    const valuesToCheck = Array.isArray(currentValue) ? currentValue : [currentValue];
    const invalidValues = valuesToCheck.filter(v => {
      // If "Other" is enabled and value is not in choices, it's valid (custom value)
      if (otherEnabled && isOtherValue(v)) {
        return false;
      }
      // Check if value exists in choices
      return !finalChoices.some(choice => choice.toLowerCase() === v.toLowerCase());
    });

    if (invalidValues.length > 0) {
      setInvalidValueError(
        `The selected value "${invalidValues[0]}" does not exist in available choices.`
      );
    } else {
      setInvalidValueError(null);
    }
  }, [currentValue, metadata, finalChoices, loading, otherEnabled, isOtherValue]);

  // Handle dropdown selection change
  // Returns the processed final value (with "Other" replaced by custom value if applicable)
  const handleDropdownChange = React.useCallback(
    (newValue: string | string[]): string | string[] => {
      if (!metadata && !staticChoices) return newValue;

      let finalValue: string | string[];

      if (isMultiChoice) {
        // Multi-select
        const selectedArray: string[] = (newValue as string[]) || [];

        // Check if "Other" is selected
        const hasOther = selectedArray.some(v => v.toLowerCase() === otherOptionText.toLowerCase());

        if (hasOther && otherState.customValue) {
          // Replace "Other" with custom value
          finalValue = selectedArray.map(v =>
            v.toLowerCase() === otherOptionText.toLowerCase() ? otherState.customValue : v
          );
        } else {
          finalValue = selectedArray;
        }
      } else {
        // Single-select
        const selectedValue = newValue as string;

        if (
          selectedValue &&
          selectedValue.toLowerCase() === otherOptionText.toLowerCase() &&
          otherState.customValue
        ) {
          // Use custom value instead of "Other"
          finalValue = otherState.customValue;
        } else {
          finalValue = selectedValue || '';
        }
      }

      setInternalValue(finalValue);

      if (onChange) {
        onChange(finalValue);
      }

      return finalValue;
    },
    [metadata, staticChoices, isMultiChoice, otherOptionText, otherState.customValue, onChange]
  );

  // Ref to store the form field.onChange for use in handleCustomValueChange
  const formOnChangeRef = React.useRef<((val: any) => void) | null>(null);

  // Handle custom value textbox change
  const handleCustomValueChange = React.useCallback(
    (newCustomValue: string) => {
      setCustomValue(newCustomValue);

      if (!metadata && !staticChoices) return;

      let finalValue: string | string[];

      // For multi-select, use hookValue (which includes watchedFormValue) to get actual current selections
      // This ensures we're working with the form's actual value, not stale internalValue
      const actualCurrentValue = isMultiChoice ? hookValue : currentValue;

      // Update the main value
      if (isMultiChoice) {
        // Multi-select: replace "Other" in array with custom value
        const currentArray = Array.isArray(actualCurrentValue) ? actualCurrentValue : [];
        // Filter out "Other" text and any previously set custom values
        const filteredArray = currentArray.filter(
          v => v.toLowerCase() !== otherOptionText.toLowerCase() && !isOtherValue(v)
        );

        finalValue = newCustomValue ? [...filteredArray, newCustomValue] : filteredArray;
      } else {
        // Single-select: replace value with custom value
        finalValue = newCustomValue;
      }

      setInternalValue(finalValue);

      // Call form field.onChange if available (for react-hook-form integration)
      if (formOnChangeRef.current) {
        formOnChangeRef.current(finalValue);
      }

      // Call standalone onChange prop
      if (onChange) {
        onChange(finalValue);
      }
    },
    [
      metadata,
      staticChoices,
      currentValue,
      hookValue,
      isMultiChoice,
      otherOptionText,
      isOtherValue,
      setCustomValue,
      onChange,
    ]
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

  const otherTextboxClass = mergeStyles({
    marginTop: 8,
  });

  // Show error message if field loading failed
  if (error && !loading) {
    return (
      <Stack className={containerClass}>
        {label && <Label required={required}>{label}</Label>}
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={false}
          onDismiss={retry}
          dismissButtonAriaLabel='Retry'
        >
          {error}
        </MessageBar>
      </Stack>
    );
  }

  // Combine all error sources - use for standalone mode validation display
  const displayErrorMessage = errorMessage || invalidValueError || otherState.customValueError;

  // Common props for both SelectBox and TagBox
  const commonProps = {
    dataSource: finalChoices,
    disabled: disabled || loading || readOnly,
    placeholder: loading ? 'Loading choices...' : placeholder,
    showClearButton: showClearButton && !readOnly && !loading,
    onValueChanged: (e: any) => handleDropdownChange(e.value),
    onFocusIn: onFocus,
    onFocusOut: onBlur,
    readOnly: readOnly,
  };

  // Render field content
  const renderField = (
    fieldValue: string | string[],
    fieldOnChange: (val: string | string[]) => void,
    fieldError?: string
  ) => {
    // Render radio buttons mode
    const renderRadioButtons = () => {
      if (isMultiChoice) {
        // Radio buttons don't support multi-select, fall back to checkboxes
        return renderCheckboxes();
      }

      const hasError = !!fieldError;

      return (
        <>
          <RadioGroup
            key={`radiogroup-${loading}-${finalChoices.length}`}
            dataSource={finalChoices}
            value={!Array.isArray(fieldValue) ? fieldValue : undefined}
            disabled={disabled || loading || readOnly}
            readOnly={readOnly}
            onValueChanged={(e: any) => fieldOnChange(e.value)}
            layout="vertical"
            isValid={!hasError}
            validationStatus={hasError ? 'invalid' : 'valid'}
            validationError={fieldError}
            className={`${hasError ? 'dx-invalid' : ''}`.trim()}
          />
          {hasError && (
            <Text className={errorClass} role="alert">
              {fieldError}
            </Text>
          )}
        </>
      );
    };

    // Render checkboxes mode
    const renderCheckboxes = () => {
      const currentValues = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
      const hasError = !!fieldError;

      const handleCheckboxChange = (choice: string, isChecked: boolean) => {
        if (isMultiChoice) {
          // Multi-select
          const newValues = isChecked
            ? [...currentValues, choice]
            : currentValues.filter(v => v !== choice);
          fieldOnChange(newValues);
        } else {
          // Single-select
          fieldOnChange(isChecked ? choice : '');
        }
      };

      return (
        <>
          <Stack tokens={{ childrenGap: 8 }}>
            {finalChoices.map((choice) => (
              <CheckBox
                key={`checkbox-${choice}`}
                text={choice}
                value={currentValues.includes(choice)}
                disabled={disabled || loading || readOnly}
                readOnly={readOnly}
                onValueChanged={(e: any) => handleCheckboxChange(choice, e.value)}
                isValid={!hasError}
                validationStatus={hasError ? 'invalid' : 'valid'}
                validationError={fieldError}
                className={`${hasError ? 'dx-invalid' : ''}`.trim()}
              />
            ))}
          </Stack>
          {hasError && (
            <Text className={errorClass} role="alert">
              {fieldError}
            </Text>
          )}
        </>
      );
    };

    // Render dropdown mode
    // Delay rendering until DOM is ready to prevent DevExtreme measurement errors
    const renderDropdown = () => {
      if (!isDOMReady) return null;

      const hasError = !!fieldError;

      return (
        <>
          {isMultiChoice ? (
            <TagBox
              key={`tagbox-${loading}-${finalChoices.length}`}
              {...commonProps}
              value={Array.isArray(fieldValue) ? fieldValue : undefined}
              maxDisplayedTags={maxDisplayedTags}
              showMultiTagOnly={showMultiTagOnly}
              onValueChanged={(e: any) => fieldOnChange(e.value)}
              isValid={!hasError}
              validationStatus={hasError ? 'invalid' : 'valid'}
              itemRender={renderItem ? (item: any) => renderItem(item) : undefined}
            />
          ) : (
            <SelectBox
              key={`selectbox-${loading}-${finalChoices.length}`}
              {...commonProps}
              value={!Array.isArray(fieldValue) ? fieldValue : undefined}
              onValueChanged={(e: any) => fieldOnChange(e.value)}
              isValid={!hasError}
              validationStatus={hasError ? 'invalid' : 'valid'}
              itemRender={renderItem ? (item: any) => renderItem(item) : undefined}
              fieldRender={renderValue ? (data: any) => renderValue(data as string) : undefined}
            />
          )}
          {hasError && (
            <Text className={errorClass} role="alert">
              {fieldError}
            </Text>
          )}
        </>
      );
    };

    // Determine which control to render
    const renderControl = () => {
      switch (displayType) {
        case SPChoiceDisplayType.RadioButtons:
          return renderRadioButtons();
        case SPChoiceDisplayType.Checkboxes:
          return renderCheckboxes();
        case SPChoiceDisplayType.Dropdown:
        default:
          return renderDropdown();
      }
    };

    return (
      <Stack className={`sp-choice-field ${containerClass} ${className || ''}`}>
        {label && (
          <Label required={required} disabled={disabled}>
            {label}
          </Label>
        )}

        {description && (
          <Text variant='small' style={{ marginBottom: 4 }}>
            {description}
          </Text>
        )}

        {loading && (
          <Spinner size={SpinnerSize.small} label="Loading choices..." />
        )}

        <div className='sp-choice-field-control' ref={fieldRef as React.RefObject<HTMLDivElement>}>
          {renderControl()}
        </div>

        {/* Show custom value textbox when "Other" is selected */}
        {otherEnabled && otherState.isOtherSelected && (
          <div className={otherTextboxClass}>
            <TextBox
              value={otherState.customValue}
              placeholder={otherConfig?.otherTextboxPlaceholder || 'Enter custom value...'}
              onValueChanged={(e: any) => handleCustomValueChange(e.value)}
              disabled={disabled}
              readOnly={readOnly}
            />
          </div>
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
        defaultValue={defaultValue || (isMultiChoice ? emptyArray : emptyString)}
        render={({ field, fieldState }) => {
          // Store field.onChange ref for use in handleCustomValueChange
          formOnChangeRef.current = field.onChange;

          // Transform field.value for dropdown display (replace custom values with "Other")
          const displayValue = getDropdownValue(field.value);

          return (
            <>
              {renderField(
                displayValue || (isMultiChoice ? emptyArray : emptyString),
                val => {
                  // Process the value through handleDropdownChange which replaces "Other" with custom value
                  const processedValue = handleDropdownChange(val || (isMultiChoice ? emptyArray : emptyString));
                  // Update react-hook-form with the processed value (not the raw display value)
                  field.onChange(processedValue);
                },
                fieldState.error?.message
              )}
            </>
          );
        }}
      />
    );
  }

  // Standalone mode - pass displayErrorMessage for validation feedback
  return renderField(dropdownValue || (isMultiChoice ? emptyArray : emptyString), handleDropdownChange, displayErrorMessage || undefined);
};

export default SPChoiceField;
