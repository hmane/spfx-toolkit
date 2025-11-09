/**
 * SPDateField - SharePoint Date/DateTime Field Component
 *
 * A date field component that mirrors SharePoint's Date and DateTime fields.
 * Supports react-hook-form integration and DevExtreme DateBox component.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { Controller, RegisterOptions } from 'react-hook-form';
import { DateBox } from 'devextreme-react/date-box';
import { Stack } from '@fluentui/react/lib/Stack';
import { Label } from '@fluentui/react/lib/Label';
import { Text } from '@fluentui/react/lib/Text';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { ISPDateFieldProps } from './SPDateField.types';
import { SPDateTimeFormat } from '../types';
import { useFormContext } from '../../spForm/context/FormContext';

/**
 * SPDateField component for date and datetime selection
 *
 * @example
 * ```tsx
 * // With react-hook-form
 * <SPDateField
 *   name="dueDate"
 *   label="Due Date"
 *   control={control}
 *   rules={{ required: 'Due Date is required' }}
 * />
 *
 * // With time
 * <SPDateField
 *   name="meetingTime"
 *   label="Meeting Time"
 *   control={control}
 *   dateTimeFormat={SPDateTimeFormat.DateTime}
 *   timeFormat="12"
 * />
 * ```
 */
export const SPDateField: React.FC<ISPDateFieldProps> = (props) => {
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

    // Date field specific props
    dateTimeFormat = SPDateTimeFormat.DateOnly,
    showTimePicker,
    minDate,
    maxDate,
    displayFormat,
    timeFormat = '12',
    firstDayOfWeek = 0,
    showWeekNumbers = false,
    showClearButton = true,
    showTodayButton = true,
    timeInterval = 30,
    dateValidator,
    disabledDates,
    showCalendarIcon = true,
    stylingMode = 'outlined',
    inputRef,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<Date | undefined>(defaultValue);
  const [isDOMReady, setIsDOMReady] = React.useState(false);

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

  // Wait for DOM to be fully ready before showing clear button
  React.useEffect(() => {
    // Use multiple animation frames to ensure DevExtreme has fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsDOMReady(true);
        });
      });
    });

    return () => {
      setIsDOMReady(false);
    };
  }, []);

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  // Determine if time should be shown
  const includeTime = showTimePicker !== undefined
    ? showTimePicker
    : dateTimeFormat === SPDateTimeFormat.DateTime;

  // Determine display format
  const format = React.useMemo(() => {
    if (displayFormat) return displayFormat;

    if (includeTime) {
      return timeFormat === '12' ? 'MM/dd/yyyy hh:mm a' : 'MM/dd/yyyy HH:mm';
    }

    return 'MM/dd/yyyy';
  }, [displayFormat, includeTime, timeFormat]);

  // Handle date change
  const handleDateChange = React.useCallback(
    (newDate: Date | undefined) => {
      setInternalValue(newDate);

      if (onChange) {
        onChange(newDate as Date);
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

    // Add min/max date validation
    if (minDate || maxDate || dateValidator) {
      baseRules.validate = {
        ...baseRules.validate,
        ...(minDate && {
          minDate: (val: Date) =>
            !val || val >= minDate ||
            `Date must be after ${minDate.toLocaleDateString()}`,
        }),
        ...(maxDate && {
          maxDate: (val: Date) =>
            !val || val <= maxDate ||
            `Date must be before ${maxDate.toLocaleDateString()}`,
        }),
        ...(dateValidator && {
          custom: (val: Date) =>
            !val || dateValidator(val) ||
            'Invalid date',
        }),
      };
    }

    return baseRules;
  }, [required, minDate, maxDate, dateValidator, label, rules]);

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

  // Disabled dates function
  const isDateDisabled = React.useCallback(
    (date: Date) => {
      if (!disabledDates) return false;

      if (typeof disabledDates === 'function') {
        return disabledDates(date);
      }

      // Check if date is in disabled dates array
      return disabledDates.some(disabledDate =>
        disabledDate.toDateString() === date.toDateString()
      );
    },
    [disabledDates]
  );

  // Render field content
  const renderField = (
    fieldValue: Date | undefined,
    fieldOnChange: (val: Date | undefined) => void,
    fieldError?: string
  ) => {
    // Defensive normalization: convert string dates to Date objects
    // SharePoint may return ISO 8601 strings instead of Date objects
    const normalizedValue = React.useMemo(() => {
      if (!fieldValue) return undefined;
      if (fieldValue instanceof Date) return fieldValue;
      if (typeof fieldValue === 'string') {
        const parsed = new Date(fieldValue);
        return isNaN(parsed.getTime()) ? undefined : parsed;
      }
      return undefined;
    }, [fieldValue]);

    // Memoize buttons configuration to prevent re-creation on every render
    const dateBoxButtons = React.useMemo(() => {
      const buttons: any[] = [];

      if (showCalendarIcon) {
        buttons.push('dropDown');
      }

      if (showTodayButton && !disabled && !readOnly) {
        buttons.push({
          name: 'today',
          location: 'after',
          options: {
            text: 'Today',
            onClick: () => fieldOnChange(new Date()),
          },
        });
      }

      return buttons;
    }, [showCalendarIcon, showTodayButton, disabled, readOnly, fieldOnChange]);

    // Memoize calendar options to prevent re-creation
    const calendarOpts = React.useMemo(() => ({
      firstDayOfWeek: firstDayOfWeek as any,
      showWeekNumbers: showWeekNumbers,
      disabledDates: disabledDates && (typeof disabledDates === 'function' ? undefined : disabledDates),
    }), [firstDayOfWeek, showWeekNumbers, disabledDates]);

    return (
      <Stack className={`sp-date-field ${containerClass} ${className || ''}`}>
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
          const isActive = !disabled && !readOnly;
          const hasError = !!fieldError;
          // DevExtreme's DateBox has a bug with showClearButton during initialization
          // Keep it permanently disabled to prevent getComputedStyle errors
          const showClearBtn = false;
          const componentKey = `datebox-${isActive ? 'active' : 'readonly'}-${includeTime}`;

          if (isActive) {
            return (
              <DateBox
                key={componentKey}
                value={normalizedValue}
                onValueChanged={(e: any) => {
                  if (e.value !== undefined && e.value !== null) {
                    fieldOnChange(e.value);
                  } else {
                    fieldOnChange(undefined);
                  }
                }}
                type={includeTime ? 'datetime' : 'date'}
                displayFormat={format}
                disabled={false}
                readOnly={false}
                placeholder={placeholder}
                showClearButton={showClearBtn}
                stylingMode={stylingMode}
                min={minDate}
                max={maxDate}
                pickerType="calendar"
                useMaskBehavior={true}
                openOnFieldClick={true}
                showAnalogClock={false}
                interval={timeInterval}
                calendarOptions={calendarOpts}
                buttons={dateBoxButtons}
                onFocusIn={onFocus}
                onFocusOut={onBlur}
                isValid={!hasError}
                validationStatus={hasError ? 'invalid' : 'valid'}
          validationError={fieldError}
                className={`${hasError ? 'dx-invalid' : ''}`.trim()}
              />
            );
          } else {
            return (
              <DateBox
                key={componentKey}
                value={normalizedValue}
                onValueChanged={(e: any) => fieldOnChange(e.value)}
                type={includeTime ? 'datetime' : 'date'}
                displayFormat={format}
                disabled={disabled}
                readOnly={readOnly}
                placeholder={placeholder}
                showClearButton={false}
                stylingMode={stylingMode}
                min={minDate}
                max={maxDate}
                pickerType="calendar"
                useMaskBehavior={true}
                openOnFieldClick={false}
                showAnalogClock={false}
                interval={timeInterval}
                calendarOptions={calendarOpts}
                buttons={showCalendarIcon ? ['dropDown'] : []}
                isValid={!hasError}
                validationStatus={hasError ? 'invalid' : 'valid'}
          validationError={fieldError}
                className={`${hasError ? 'dx-invalid' : ''}`.trim()}
              />
            );
          }
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
  return renderField(currentValue, handleDateChange);
};

export default SPDateField;
