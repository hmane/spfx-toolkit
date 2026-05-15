/**
 * FormErrorSummary - Displays all form errors in a summary panel
 * Provides click-to-scroll functionality to error fields
 */

import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { useFormContext, useFormStateContext } from '../context';

export type FormErrorSummaryErrorValue =
  | string
  | string[]
  | { message?: string; label?: string };

export type FormErrorSummaryErrors =
  | Record<string, FormErrorSummaryErrorValue | Record<string, any>>
  | Array<{ fieldName: string; message: string; label?: string }>;

export interface IFormErrorSummaryProps {
  /**
   * Explicit errors for standalone/custom forms.
   * If provided, these are used instead of React Hook Form context errors.
   */
  errors?: FormErrorSummaryErrors;

  /**
   * Position of error summary
   * @default 'top'
   */
  position?: 'top' | 'bottom' | 'sticky';

  /**
   * Maximum number of errors to display
   * @optional
   */
  maxErrors?: number;

  /**
   * Show field labels before error message
   * @default true
   */
  showFieldLabels?: boolean;

  /**
   * Enable click-to-scroll functionality
   * @default true
   */
  clickToScroll?: boolean;

  /**
   * Compact mode with less spacing
   * @default false
   */
  compact?: boolean;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Callback when error item is clicked
   */
  onErrorClick?: (fieldName: string) => void;

  /**
   * Custom scroll handler for standalone/custom forms.
   * React Hook Form context scrolling is used when this is not provided.
   */
  onScrollToField?: (fieldName: string) => void;

  /**
   * Custom focus handler for standalone/custom forms.
   * React Hook Form context focusing is used when this is not provided.
   */
  onFocusField?: (fieldName: string) => void;

  /**
   * Only show errors for these fields. If not provided, shows all errors.
   */
  filterFields?: string[];

  /**
   * Custom function to get a human-readable label for a field name.
   * Falls back to the form context registry label, then the raw field name.
   */
  getFieldLabel?: (fieldName: string) => string;
}

/**
 * Flatten nested react-hook-form errors into [fieldName, error] pairs.
 * Handles field arrays (e.g., items[0].name) and nested objects.
 */
interface INormalizedError {
  fieldName: string;
  message?: string;
  label?: string;
}

function normalizeErrorValue(value: any): { message?: string; label?: string } | null {
  if (!value) return null;

  if (typeof value === 'string') {
    return { message: value };
  }

  if (Array.isArray(value)) {
    const messages = value.filter((entry) => typeof entry === 'string' && entry.trim() !== '');
    return messages.length > 0 ? { message: messages.join(', ') } : null;
  }

  if (typeof value === 'object' && value.message !== undefined) {
    return {
      message: typeof value.message === 'string' ? value.message : undefined,
      label: typeof value.label === 'string' ? value.label : undefined,
    };
  }

  return null;
}

function flattenErrors(
  errors: Record<string, any>,
  prefix = ''
): INormalizedError[] {
  const result: INormalizedError[] = [];

  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue;
    const fieldName = prefix ? `${prefix}.${key}` : key;
    const normalized = normalizeErrorValue(value);

    if (normalized) {
      result.push({ fieldName, ...normalized });
    } else if (typeof value === 'object' && !value.type) {
      result.push(...flattenErrors(value, fieldName));
    }
  }

  return result;
}

function normalizeErrors(errors: FormErrorSummaryErrors): INormalizedError[] {
  if (Array.isArray(errors)) {
    return errors.map((error) => ({
      fieldName: error.fieldName,
      message: error.message,
      label: error.label,
    }));
  }

  return flattenErrors(errors as Record<string, any>);
}

const FormErrorSummary = React.forwardRef<HTMLDivElement, IFormErrorSummaryProps>(
  (
    {
      errors: explicitErrors,
      position = 'top',
      maxErrors,
      showFieldLabels = true,
      clickToScroll = true,
      compact = false,
      className = '',
      onErrorClick,
      onScrollToField,
      onFocusField,
      filterFields,
      getFieldLabel,
    },
    ref
  ) => {
    const formContext = useFormContext();
    const formState = useFormStateContext();

    if (!explicitErrors && !formState?.errors) {
      return null;
    }

    const allErrors = explicitErrors
      ? normalizeErrors(explicitErrors)
      : flattenErrors(formState!.errors as Record<string, any>);

    // Filter to specific fields if requested
    const errors = filterFields
      ? allErrors.filter((error) => filterFields.includes(error.fieldName))
      : allErrors;

    if (errors.length === 0) {
      return null;
    }

    // Filter out errors without meaningful messages
    const errorsWithMessages = errors.filter((error) => {
      const errorMessage = error.message;
      return errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== '';
    });

    if (errorsWithMessages.length === 0) {
      return null;
    }

    const displayErrors = maxErrors ? errorsWithMessages.slice(0, maxErrors) : errorsWithMessages;
    const hasMoreErrors = maxErrors && errorsWithMessages.length > maxErrors;

    const resolveLabel = (fieldName: string, explicitLabel?: string): string => {
      if (explicitLabel) return explicitLabel;
      if (getFieldLabel) return getFieldLabel(fieldName);
      const field = formContext?.registry.get(fieldName);
      return field?.label || fieldName;
    };

    const handleErrorClick = (fieldName: string) => {
      if (clickToScroll) {
        if (onScrollToField) {
          onScrollToField(fieldName);
        } else {
          formContext?.scrollToField(fieldName, { behavior: 'smooth', block: 'center' });
        }

        setTimeout(() => {
          if (onFocusField) {
            onFocusField(fieldName);
          } else {
            formContext?.focusField(fieldName);
          }
        }, 300);
      }

      onErrorClick?.(fieldName);
    };

    const positionClass = position === 'sticky' ? 'spfx-form-error-summary-sticky' : '';
    const compactClass = compact ? 'spfx-form-error-summary-compact' : '';
    const listMargin = compact ? '4px 0 0 0' : '8px 0 0 0';
    const itemMargin = compact ? '2px' : '4px';

    return (
      <div
        ref={ref}
        role='alert'
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline
          className={`spfx-form-error-summary ${positionClass} ${compactClass} ${className}`}
          styles={{ root: { borderRadius: '4px' } }}
        >
          <Stack tokens={{ childrenGap: compact ? 4 : 12 }}>
            {!compact && (
              <span style={{ fontWeight: 600 }}>
                Please fix the following {errorsWithMessages.length} error
                {errorsWithMessages.length > 1 ? 's' : ''}:
              </span>
            )}

            <ul style={{ margin: listMargin, paddingLeft: '20px' }}>
              {displayErrors.map((error) => {
                const label = showFieldLabels ? resolveLabel(error.fieldName, error.label) : null;
                const errorMessage = error.message;
                const canNavigate = clickToScroll && (!!formContext || !!onScrollToField || !!onErrorClick);

                return (
                  <li key={error.fieldName} style={{ marginBottom: itemMargin }}>
                    {label && canNavigate ? (
                      <>
                        <button
                          type='button'
                          onClick={() => handleErrorClick(error.fieldName)}
                          aria-label={`Go to ${label} field`}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            margin: 0,
                            font: 'inherit',
                            fontWeight: 600,
                            color: 'var(--themePrimary, #0078d4)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {label}
                        </button>
                        : {errorMessage}
                      </>
                    ) : label ? (
                      <>
                        <span style={{ fontWeight: 600 }}>{label}</span>: {errorMessage}
                      </>
                    ) : (
                      errorMessage
                    )}
                  </li>
                );
              })}

              {hasMoreErrors && (
                <li
                  style={{
                    marginTop: compact ? 4 : 8,
                    fontStyle: 'italic',
                    fontSize: compact ? '11px' : '12px',
                    color: 'var(--neutralSecondary, #605e5c)',
                    listStyle: 'none',
                    marginLeft: '-20px',
                  }}
                >
                  ...and {errorsWithMessages.length - maxErrors!} more error
                  {errorsWithMessages.length - maxErrors! > 1 ? 's' : ''}
                </li>
              )}
            </ul>
          </Stack>
        </MessageBar>
      </div>
    );
  }
);

FormErrorSummary.displayName = 'FormErrorSummary';

export default FormErrorSummary;
