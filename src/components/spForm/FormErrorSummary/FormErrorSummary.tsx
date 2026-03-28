/**
 * FormErrorSummary - Displays all form errors in a summary panel
 * Provides click-to-scroll functionality to error fields
 */

import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { useFormContext, useFormStateContext } from '../context';

export interface IFormErrorSummaryProps {
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
function flattenErrors(
  errors: Record<string, any>,
  prefix = ''
): Array<[string, { message?: string }]> {
  const result: Array<[string, { message?: string }]> = [];

  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue;
    const fieldName = prefix ? `${prefix}.${key}` : key;

    if (value.message !== undefined) {
      result.push([fieldName, value]);
    } else if (typeof value === 'object' && !value.type) {
      result.push(...flattenErrors(value, fieldName));
    }
  }

  return result;
}

const FormErrorSummary = React.forwardRef<HTMLDivElement, IFormErrorSummaryProps>(
  (
    {
      position = 'top',
      maxErrors,
      showFieldLabels = true,
      clickToScroll = true,
      compact = false,
      className = '',
      onErrorClick,
      filterFields,
      getFieldLabel,
    },
    ref
  ) => {
    const formContext = useFormContext();
    const formState = useFormStateContext();

    if (!formContext || !formState?.errors) {
      return null;
    }

    const allErrors = flattenErrors(formState.errors as Record<string, any>);

    // Filter to specific fields if requested
    const errors = filterFields
      ? allErrors.filter(([fieldName]) => filterFields.includes(fieldName))
      : allErrors;

    if (errors.length === 0) {
      return null;
    }

    // Filter out errors without meaningful messages
    const errorsWithMessages = errors.filter(([_, error]) => {
      const errorMessage = error?.message;
      return errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== '';
    });

    if (errorsWithMessages.length === 0) {
      return null;
    }

    const displayErrors = maxErrors ? errorsWithMessages.slice(0, maxErrors) : errorsWithMessages;
    const hasMoreErrors = maxErrors && errorsWithMessages.length > maxErrors;

    const resolveLabel = (fieldName: string): string => {
      if (getFieldLabel) return getFieldLabel(fieldName);
      const field = formContext.registry.get(fieldName);
      return field?.label || fieldName;
    };

    const handleErrorClick = (fieldName: string) => {
      if (clickToScroll) {
        formContext.scrollToField(fieldName, { behavior: 'smooth', block: 'center' });

        setTimeout(() => {
          formContext.focusField(fieldName);
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
              {displayErrors.map(([fieldName, error]) => {
                const label = showFieldLabels ? resolveLabel(fieldName) : null;
                const errorMessage = error?.message;

                return (
                  <li key={fieldName} style={{ marginBottom: itemMargin }}>
                    {label && clickToScroll ? (
                      <>
                        <button
                          type='button'
                          onClick={() => handleErrorClick(fieldName)}
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
