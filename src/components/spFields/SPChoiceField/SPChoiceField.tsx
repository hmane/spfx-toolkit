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
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { Text } from '@fluentui/react/lib/Text';
import { useTheme } from '@fluentui/react/lib/Theme';
import { CheckBox } from 'devextreme-react/check-box';
import { LoadPanel } from 'devextreme-react/load-panel';
import { RadioGroup } from 'devextreme-react/radio-group';
import { SelectBox } from 'devextreme-react/select-box';
import { TagBox } from 'devextreme-react/tag-box';
import TextBox from 'devextreme-react/text-box';
import * as React from 'react';
import { Controller, RegisterOptions } from 'react-hook-form';
import {
  DefaultSPChoiceFieldProps,
  ISPChoiceFieldProps,
  SPChoiceDisplayType
} from './SPChoiceField.types';
import { useSPChoiceField } from './hooks/useSPChoiceField';

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
    control,
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
    otherConfig = DefaultSPChoiceFieldProps.otherConfig,
    useCache = DefaultSPChoiceFieldProps.useCache,
    maxDisplayedTags = DefaultSPChoiceFieldProps.maxDisplayedTags,
    showMultiTagOnly = DefaultSPChoiceFieldProps.showMultiTagOnly,
    sortChoices = DefaultSPChoiceFieldProps.sortChoices,
    showClearButton = DefaultSPChoiceFieldProps.showClearButton,
    renderItem,
    renderValue,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue || (allowMultiple ? [] : '')
  );
  const [invalidValueError, setInvalidValueError] = React.useState<string | null>(null);

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
  } = useSPChoiceField(dataSource, staticChoices, value || internalValue, otherConfig, useCache);

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

  // Helper function to transform value for dropdown display (convert custom values to "Other" if needed)
  const getDropdownValue = React.useCallback(
    (val: string | string[] | undefined | null) => {
      if (!val) return isMultiChoice ? [] : undefined;

      if (Array.isArray(val)) {
        // Multi-select: replace custom values with "Other"
        return val.map(v => {
          if (otherEnabled && isOtherValue(v)) {
            return otherOptionText;
          }
          return v;
        });
      } else {
        // Single-select: replace custom value with "Other"
        if (otherEnabled && isOtherValue(val)) {
          return otherOptionText;
        }
        return val;
      }
    },
    [otherEnabled, isOtherValue, otherOptionText, isMultiChoice]
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
  const handleDropdownChange = React.useCallback(
    (newValue: string | string[]) => {
      if (!metadata && !staticChoices) return;

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
    },
    [metadata, staticChoices, isMultiChoice, otherOptionText, otherState.customValue, onChange]
  );

  // Handle custom value textbox change
  const handleCustomValueChange = React.useCallback(
    (newCustomValue: string) => {
      setCustomValue(newCustomValue);

      if (!metadata && !staticChoices) return;

      // Update the main value
      if (isMultiChoice) {
        // Multi-select: replace "Other" in array with custom value
        const currentArray = Array.isArray(currentValue) ? currentValue : [];
        const filteredArray = currentArray.filter(
          v => v.toLowerCase() !== otherOptionText.toLowerCase() && !isOtherValue(v)
        );

        const newArray = newCustomValue ? [...filteredArray, newCustomValue] : filteredArray;

        setInternalValue(newArray);
        if (onChange) {
          onChange(newArray);
        }
      } else {
        // Single-select: replace value with custom value
        setInternalValue(newCustomValue);
        if (onChange) {
          onChange(newCustomValue);
        }
      }
    },
    [
      metadata,
      staticChoices,
      currentValue,
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

      return (
        <RadioGroup
          key={`radiogroup-${loading}-${finalChoices.length}`}
          dataSource={finalChoices}
          value={!Array.isArray(fieldValue) ? fieldValue : undefined}
          disabled={disabled || loading || readOnly}
          readOnly={readOnly}
          onValueChanged={(e: any) => fieldOnChange(e.value)}
          layout="vertical"
        />
      );
    };

    // Render checkboxes mode
    const renderCheckboxes = () => {
      const currentValues = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);

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
        <Stack tokens={{ childrenGap: 8 }}>
          {finalChoices.map((choice) => (
            <CheckBox
              key={`checkbox-${choice}`}
              text={choice}
              value={currentValues.includes(choice)}
              disabled={disabled || loading || readOnly}
              readOnly={readOnly}
              onValueChanged={(e: any) => handleCheckboxChange(choice, e.value)}
            />
          ))}
        </Stack>
      );
    };

    // Render dropdown mode
    const renderDropdown = () => {
      return isMultiChoice ? (
        <TagBox
          key={`tagbox-${loading}-${finalChoices.length}`}
          {...commonProps}
          value={Array.isArray(fieldValue) ? fieldValue : undefined}
          maxDisplayedTags={maxDisplayedTags}
          showMultiTagOnly={showMultiTagOnly}
          onValueChanged={(e: any) => fieldOnChange(e.value)}
          isValid={!fieldError}
          validationError={fieldError ? { message: fieldError } : undefined}
          itemRender={renderItem ? (item: any) => renderItem(item) : undefined}
          fieldRender={renderValue ? (values: string[]) => renderValue(values) : undefined}
        />
      ) : (
        <SelectBox
          key={`selectbox-${loading}-${finalChoices.length}`}
          {...commonProps}
          value={!Array.isArray(fieldValue) ? fieldValue : undefined}
          onValueChanged={(e: any) => fieldOnChange(e.value)}
          isValid={!fieldError}
          validationError={fieldError ? { message: fieldError } : undefined}
          itemRender={renderItem ? (item: any) => renderItem(item) : undefined}
          fieldRender={renderValue ? (value: string) => renderValue(value) : undefined}
        />
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
          <div className='sp-choice-field-loading'>
            <LoadPanel
              visible={true}
              message='Loading choices...'
              position={{ of: '.sp-choice-field-control' }}
            />
          </div>
        )}

        <div className='sp-choice-field-control'>
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

        {/* Show error messages */}
        {(fieldError || displayErrorMessage) && (
          <Text className={errorClass}>{fieldError || displayErrorMessage}</Text>
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
        defaultValue={defaultValue || (isMultiChoice ? [] : '')}
        render={({ field, fieldState }) => {
          // Transform field.value for dropdown display (replace custom values with "Other")
          const displayValue = getDropdownValue(field.value);

          return (
            <>
              {renderField(
                displayValue || (isMultiChoice ? [] : ''),
                val => {
                  field.onChange(val);
                  handleDropdownChange(val || (isMultiChoice ? [] : ''));
                },
                fieldState.error?.message
              )}
            </>
          );
        }}
      />
    );
  }

  // Standalone mode
  return renderField(dropdownValue || (isMultiChoice ? [] : ''), handleDropdownChange);
};

export default SPChoiceField;
