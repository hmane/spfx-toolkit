/**
 * SPUrlField - SharePoint URL (Hyperlink) Field Component
 *
 * A URL field component that mirrors SharePoint's Hyperlink fields.
 * Supports react-hook-form integration and DevExtreme TextBox components.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { Controller, RegisterOptions } from 'react-hook-form';
import TextBox from 'devextreme-react/text-box';
import { Stack } from '@fluentui/react/lib/Stack';
import { Label } from '@fluentui/react/lib/Label';
import { Text } from '@fluentui/react/lib/Text';
import { Icon } from '@fluentui/react/lib/Icon';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { ISPUrlFieldProps } from './SPUrlField.types';
import { ISPUrlFieldValue } from '../types';
import { useFormContext } from '../../spForm/context/FormContext';

/**
 * SPUrlField component for URL (hyperlink) input
 *
 * @example
 * ```tsx
 * // With react-hook-form
 * <SPUrlField
 *   name="website"
 *   label="Website"
 *   control={control}
 *   rules={{ required: 'Website is required' }}
 * />
 *
 * // URL only (no description)
 * <SPUrlField
 *   name="link"
 *   label="Link"
 *   control={control}
 *   showDescription={false}
 * />
 * ```
 */
export const SPUrlField: React.FC<ISPUrlFieldProps> = (props) => {
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

    // URL field specific props
    showDescription = true,
    descriptionLabel = 'Description',
    urlLabel = 'URL',
    validateUrl = true,
    allowRelativeUrl = false,
    showLinkIcon = true,
    openInNewWindow = true,
    urlPlaceholder = 'https://...',
    descriptionPlaceholder = 'Enter description...',
    stylingMode = 'outlined',
    inputRef,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<ISPUrlFieldValue>(
    defaultValue || { Url: '', Description: '' }
  );

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

  // URL validation regex
  const urlRegex = React.useMemo(() => {
    if (allowRelativeUrl) {
      // Allow relative URLs like /sites/mysite
      return /^(https?:\/\/)|(\/)/i;
    }
    // Require full URLs
    return /^https?:\/\/.+/i;
  }, [allowRelativeUrl]);

  // Handle URL change
  const handleUrlChange = React.useCallback(
    (newUrl: string) => {
      const updatedValue: ISPUrlFieldValue = {
        ...currentValue,
        Url: newUrl,
      };

      setInternalValue(updatedValue);

      if (onChange) {
        onChange(updatedValue);
      }
    },
    [currentValue, onChange]
  );

  // Handle description change
  const handleDescriptionChange = React.useCallback(
    (newDescription: string) => {
      const updatedValue: ISPUrlFieldValue = {
        ...currentValue,
        Description: newDescription,
      };

      setInternalValue(updatedValue);

      if (onChange) {
        onChange(updatedValue);
      }
    },
    [currentValue, onChange]
  );

  // Merge validation rules
  const validationRules = React.useMemo(() => {
    const baseRules: RegisterOptions = { ...rules };

    // Initialize validate object if needed
    if (!baseRules.validate) {
      baseRules.validate = {};
    }

    // Add required validation (check if Url property has value)
    if (required) {
      (baseRules.validate as any).required = (val: ISPUrlFieldValue) =>
        !!val?.Url || `${label || 'This field'} is required`;
    }

    // Add URL format validation
    if (validateUrl) {
      (baseRules.validate as any).validUrl = (val: ISPUrlFieldValue) =>
        !val?.Url || urlRegex.test(val.Url) ||
        (allowRelativeUrl
          ? 'Please enter a valid URL or relative path'
          : 'Please enter a valid URL (must start with http:// or https://)');
    }

    return baseRules;
  }, [required, validateUrl, urlRegex, allowRelativeUrl, label, rules]);

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

  const linkPreviewClass = mergeStyles({
    marginTop: 8,
    padding: 8,
    backgroundColor: theme.palette.neutralLighter,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  });

  // Render field content
  const renderField = (
    fieldValue: ISPUrlFieldValue,
    fieldOnChange: (val: ISPUrlFieldValue) => void,
    fieldError?: string
  ) => {
    const urlValue = fieldValue?.Url || '';
    const descriptionValue = fieldValue?.Description || '';
    const hasValidUrl = urlValue && urlRegex.test(urlValue);

    return (
      <Stack className={`sp-url-field ${containerClass} ${className || ''}`}>
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

        {/* URL Input */}
        <div ref={fieldRef as React.RefObject<HTMLDivElement>}>
        {(() => {
          const hasError = !!fieldError;
          return (
            <Stack tokens={{ childrenGap: 8 }}>
              <div>
                {urlLabel && <Text variant="small">{urlLabel}</Text>}
                <TextBox
                  value={urlValue}
                  onValueChanged={(e: any) => {
                    const newValue = { ...fieldValue, Url: e.value };
                    fieldOnChange(newValue);
                  }}
                  disabled={disabled}
                  readOnly={readOnly}
                  placeholder={urlPlaceholder}
                  stylingMode={stylingMode}
                  onFocusIn={onFocus}
                  onFocusOut={onBlur}
                  isValid={!hasError}
                  validationStatus={hasError ? 'invalid' : 'valid'}
          validationError={fieldError}
                  className={`${hasError ? 'dx-invalid' : ''}`.trim()}
                />
              </div>

              {/* Description Input */}
              {showDescription && (
                <div>
                  {descriptionLabel && <Text variant="small">{descriptionLabel}</Text>}
                  <TextBox
                    value={descriptionValue}
                    onValueChanged={(e: any) => {
                      const newValue = { ...fieldValue, Description: e.value };
                      fieldOnChange(newValue);
                    }}
                    disabled={disabled}
                    readOnly={readOnly}
                    placeholder={descriptionPlaceholder}
                    stylingMode={stylingMode}
                    isValid={!hasError}
                    validationStatus={hasError ? 'invalid' : 'valid'}
          validationError={fieldError}
                    className={`${hasError ? 'dx-invalid' : ''}`.trim()}
                  />
                </div>
              )}
            </Stack>
          );
        })()}
        </div>

        {/* Link Preview */}
        {showLinkIcon && hasValidUrl && !readOnly && (
          <div className={linkPreviewClass}>
            <Icon iconName="Link" />
            <a
              href={urlValue}
              target={openInNewWindow ? '_blank' : '_self'}
              rel={openInNewWindow ? 'noopener noreferrer' : undefined}
              style={{ color: theme.palette.themePrimary }}
            >
              {descriptionValue || urlValue}
            </a>
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
        defaultValue={defaultValue || { Url: '', Description: '' }}
        render={({ field, fieldState }) => (
          <>
            {renderField(
              field.value || { Url: '', Description: '' },
              (val) => field.onChange(val),
              fieldState.error?.message
            )}
          </>
        )}
      />
    );
  }

  // Standalone mode
  return renderField(currentValue, (val) => {
    setInternalValue(val);
    if (onChange) {
      onChange(val);
    }
  });
};

export default SPUrlField;
