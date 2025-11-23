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
    showClearButton: _showClearButton = true, // Prefixed - see showClearBtn workaround
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

  // Delay mounting DevExtreme component to avoid measurement errors
  // DevExtreme's _getClearButtonWidth can fail if called before DOM is ready
  // Using useLayoutEffect + double RAF to ensure container is fully painted
  React.useLayoutEffect(() => {
    let mounted = true;
    // Double RAF ensures we're past the paint cycle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (mounted) {
          setIsDOMReady(true);
        }
      });
    });

    return () => {
      mounted = false;
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

  // Memoize calendar options at component level (not inside render function)
  const calendarOpts = React.useMemo(() => ({
    firstDayOfWeek: firstDayOfWeek as any,
    showWeekNumbers: showWeekNumbers,
    disabledDates: disabledDates && (typeof disabledDates === 'function' ? undefined : disabledDates),
  }), [firstDayOfWeek, showWeekNumbers, disabledDates]);

  // Determine if field is active (editable)
  const isActive = !disabled && !readOnly;
  // WORKAROUND: DevExtreme's showClearButton causes getComputedStyle errors
  // when measuring clear button width before elements are fully rendered.
  // Disable clear button to avoid _getClearButtonWidth measurement errors.
  // TODO: Find alternative way to provide clear functionality (custom button)
  const showClearBtn = false; // showClearButton && isActive;

  // Memoize buttons configuration - use stable reference without fieldOnChange dependency
  // The Today button will use a ref to get the current onChange handler
  const onChangeRef = React.useRef<(val: Date | undefined) => void>();

  const dateBoxButtons = React.useMemo(() => {
    const buttons: any[] = [];

    if (showCalendarIcon) {
      buttons.push('dropDown');
    }

    if (showTodayButton && isActive) {
      buttons.push({
        name: 'today',
        location: 'after',
        options: {
          text: 'Today',
          onClick: () => {
            if (onChangeRef.current) {
              onChangeRef.current(new Date());
            }
          },
        },
      });
    }

    return buttons;
  }, [showCalendarIcon, showTodayButton, isActive]);

  // Stable buttons array for readonly mode
  const readOnlyButtons = React.useMemo((): any[] =>
    showCalendarIcon ? ['dropDown'] : [],
    [showCalendarIcon]
  );

  // Normalize value - handle string dates from SharePoint
  const normalizeValue = React.useCallback((fieldValue: Date | undefined): Date | undefined => {
    if (!fieldValue) return undefined;
    if (fieldValue instanceof Date) return fieldValue;
    if (typeof fieldValue === 'string') {
      const parsed = new Date(fieldValue);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  }, []);

  // Render field content
  const renderField = (
    fieldValue: Date | undefined,
    fieldOnChange: (val: Date | undefined) => void,
    fieldError?: string
  ) => {
    // Update the ref so Today button can access current onChange
    onChangeRef.current = fieldOnChange;

    const normalizedValue = normalizeValue(fieldValue);
    const hasError = !!fieldError;
    const componentKey = `datebox-${isActive ? 'active' : 'readonly'}-${includeTime}`;

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
        {/* Delay rendering DevExtreme component until DOM is ready to prevent measurement errors */}
        {isDOMReady && (
          isActive ? (
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
          ) : (
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
              buttons={readOnlyButtons}
              isValid={!hasError}
              validationStatus={hasError ? 'invalid' : 'valid'}
              validationError={fieldError}
              className={`${hasError ? 'dx-invalid' : ''}`.trim()}
            />
          )
        )}
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
