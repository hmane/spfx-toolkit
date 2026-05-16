/**
 * FormErrorSummary - Displays form errors from React Hook Form and/or custom validation.
 * Supports click-to-scroll through the shared field registry, DOM data attributes, or consumer callbacks.
 */

import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import * as React from 'react';
import { useFormContext, useFormStateContext } from '../context';

export type FormErrorSummarySource = 'rhf' | 'custom' | 'server';
export type FormErrorSummaryVariant = 'messageBar' | 'card' | 'accordion';
export type FormErrorSummaryGroupBy = 'none' | 'section';

export type FormErrorSummaryErrorValue =
  | string
  | string[]
  | {
      message?: string;
      label?: string;
      section?: string;
      source?: FormErrorSummarySource;
    };

export interface IFormErrorSummaryError {
  fieldName: string;
  message: string;
  label?: string;
  section?: string;
  source?: FormErrorSummarySource;
}

export type FormErrorSummaryErrors =
  | Record<string, FormErrorSummaryErrorValue | Record<string, any>>
  | IFormErrorSummaryError[];

export interface IFormErrorSummaryProps {
  /**
   * Explicit errors for standalone/custom forms.
   * By default, these replace React Hook Form context errors for backward compatibility.
   */
  errors?: FormErrorSummaryErrors;

  /**
   * Include React Hook Form context errors when explicit errors are provided.
   * @default false when errors are provided, true otherwise
   */
  includeContextErrors?: boolean;

  /**
   * Visual treatment for the summary.
   * @default 'messageBar'
   */
  variant?: FormErrorSummaryVariant;

  /**
   * Group displayed errors by registry/custom section.
   * @default 'none'
   */
  groupBy?: FormErrorSummaryGroupBy;

  /**
   * Initial collapsed state when variant is 'accordion'.
   * @default false
   */
  defaultCollapsed?: boolean;

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
  onErrorClick?: (fieldName: string, error?: IFormErrorSummaryError) => void;

  /**
   * Optional hook used before scrolling. Use this to expand collapsed sections, cards, or accordions.
   */
  onBeforeScrollToField?: (fieldName: string, error?: IFormErrorSummaryError) => void | Promise<void>;

  /**
   * Custom element resolver for standalone/custom forms.
   */
  getFieldElement?: (fieldName: string, error?: IFormErrorSummaryError) => HTMLElement | null;

  /**
   * Custom scroll handler for standalone/custom forms.
   * React Hook Form context scrolling is used when this is not provided.
   */
  onScrollToField?: (fieldName: string, error?: IFormErrorSummaryError) => void | Promise<void>;

  /**
   * Custom focus handler for standalone/custom forms.
   * React Hook Form context focusing is used when this is not provided.
   */
  onFocusField?: (fieldName: string, error?: IFormErrorSummaryError) => void;

  /**
   * Delay before resolving/scrolling to a field after onBeforeScrollToField.
   * Useful when expanding animated cards or accordions.
   * @default 0
   */
  scrollDelay?: number;

  /**
   * Delay before focusing after scroll.
   * @default 300
   */
  focusDelay?: number;

  /**
   * Native scroll options used by the built-in scroller.
   */
  scrollOptions?: ScrollIntoViewOptions;

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

function normalizeErrorValue(value: any): Omit<IFormErrorSummaryError, 'fieldName'> | null {
  if (!value) return null;

  if (typeof value === 'string') {
    return { message: value };
  }

  if (Array.isArray(value)) {
    const messages = value.filter((entry) => typeof entry === 'string' && entry.trim() !== '');
    return messages.length > 0 ? { message: messages.join(', ') } : null;
  }

  if (typeof value === 'object' && value.message !== undefined) {
    const message = typeof value.message === 'string' ? value.message : undefined;
    if (!message) return null;

    return {
      message,
      label: typeof value.label === 'string' ? value.label : undefined,
      section: typeof value.section === 'string' ? value.section : undefined,
      source: value.source,
    };
  }

  return null;
}

/**
 * Flatten nested React Hook Form/custom error objects into field-level errors.
 * Handles nested object paths and field arrays using dot notation.
 */
function flattenErrors(
  errors: Record<string, any>,
  prefix = '',
  source?: FormErrorSummarySource
): IFormErrorSummaryError[] {
  const result: IFormErrorSummaryError[] = [];

  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue;

    const fieldName = prefix ? `${prefix}.${key}` : key;
    const normalized = normalizeErrorValue(value);

    if (normalized?.message) {
      result.push({
        fieldName,
        message: normalized.message,
        label: normalized.label,
        section: normalized.section,
        source: normalized.source || source,
      });
    } else if (typeof value === 'object' && !value.type) {
      result.push(...flattenErrors(value, fieldName, source));
    }
  }

  return result;
}

function normalizeErrors(
  errors: FormErrorSummaryErrors,
  source: FormErrorSummarySource = 'custom'
): IFormErrorSummaryError[] {
  if (Array.isArray(errors)) {
    return errors
      .filter((error) => !!error?.fieldName && !!error?.message)
      .map((error) => ({
        fieldName: error.fieldName,
        message: error.message,
        label: error.label,
        section: error.section,
        source: error.source || source,
      }));
  }

  return flattenErrors(errors as Record<string, any>, '', source);
}

function mergeErrors(errors: IFormErrorSummaryError[]): IFormErrorSummaryError[] {
  const seen = new Set<string>();
  const merged: IFormErrorSummaryError[] = [];

  errors.forEach((error) => {
    const key = `${error.fieldName}|${error.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(error);
  });

  return merged;
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function findFocusableElement(container: HTMLElement): HTMLElement | null {
  if (
    container.matches(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ) {
    return container;
  }

  return container.querySelector(
    'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [role="textbox"], [tabindex]:not([tabindex="-1"])'
  ) as HTMLElement | null;
}

function findFieldElement(fieldName: string): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const escaped = escapeAttributeValue(fieldName);
  return document.querySelector(
    `[data-field-name="${escaped}"], [data-field="${escaped}"], [name="${escaped}"], [id="${escaped}"]`
  ) as HTMLElement | null;
}

function expandContainingDisclosures(element: HTMLElement): void {
  let current: HTMLElement | null = element;
  while (current) {
    if (
      typeof HTMLDetailsElement !== 'undefined' &&
      current instanceof HTMLDetailsElement &&
      !current.open
    ) {
      current.open = true;
    }

    if (current.id && typeof document !== 'undefined') {
      const escapedId = escapeAttributeValue(current.id);
      const trigger = document.querySelector(
        `[aria-controls="${escapedId}"][aria-expanded="false"]`
      ) as HTMLElement | null;
      trigger?.click();
    }

    current = current.parentElement;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FormErrorSummaryBase = React.forwardRef<HTMLDivElement, IFormErrorSummaryProps>(
  (
    {
      errors: explicitErrors,
      includeContextErrors,
      variant = 'messageBar',
      groupBy = 'none',
      defaultCollapsed = false,
      position = 'top',
      maxErrors,
      showFieldLabels = true,
      clickToScroll = true,
      compact = false,
      className = '',
      onErrorClick,
      onBeforeScrollToField,
      getFieldElement,
      onScrollToField,
      onFocusField,
      scrollDelay = 0,
      focusDelay = 300,
      scrollOptions,
      filterFields,
      getFieldLabel,
    },
    ref
  ) => {
    const formContext = useFormContext();
    const formState = useFormStateContext();
    const [isExpanded, setIsExpanded] = React.useState(!defaultCollapsed);

    const contextErrors = React.useMemo(() => {
      const contextFormState = formState || formContext?.formState;
      return contextFormState?.errors
        ? flattenErrors(contextFormState.errors as Record<string, any>, '', 'rhf')
        : [];
    }, [formState?.errors]);

    const allErrors = React.useMemo(() => {
      const explicit = explicitErrors ? normalizeErrors(explicitErrors, 'custom') : [];
      const shouldIncludeContext = explicitErrors ? includeContextErrors === true : true;
      const combined = shouldIncludeContext ? [...contextErrors, ...explicit] : explicit;

      return mergeErrors(combined).map((error) => {
        const field = formContext?.registry.get(error.fieldName);
        return {
          ...error,
          label: error.label || field?.label,
          section: error.section || field?.section,
        };
      });
    }, [explicitErrors, includeContextErrors, contextErrors, formContext]);

    const filteredErrors = React.useMemo(() => {
      const filtered = filterFields
        ? allErrors.filter((error) => filterFields.includes(error.fieldName))
        : allErrors;

      return filtered.filter((error) => error.message.trim() !== '');
    }, [allErrors, filterFields]);

    if (filteredErrors.length === 0) {
      return null;
    }

    const displayErrors = maxErrors ? filteredErrors.slice(0, maxErrors) : filteredErrors;
    const hasMoreErrors = !!maxErrors && filteredErrors.length > maxErrors;
    const hiddenErrorCount = hasMoreErrors ? filteredErrors.length - maxErrors! : 0;

    const resolveLabel = (fieldName: string, explicitLabel?: string): string => {
      if (explicitLabel) return explicitLabel;
      if (getFieldLabel) return getFieldLabel(fieldName);
      const field = formContext?.registry.get(fieldName);
      return field?.label || fieldName;
    };

    const resolveFieldElement = (error: IFormErrorSummaryError): HTMLElement | null => {
      return (
        getFieldElement?.(error.fieldName, error) ||
        formContext?.registry.get(error.fieldName)?.ref?.current ||
        findFieldElement(error.fieldName)
      );
    };

    const focusField = (error: IFormErrorSummaryError) => {
      if (onFocusField) {
        onFocusField(error.fieldName, error);
        return;
      }

      const element = resolveFieldElement(error);
      const focusable = element ? findFocusableElement(element) : null;
      if (focusable) {
        focusable.focus({ preventScroll: true });
        return;
      }

      formContext?.focusField(error.fieldName);
    };

    const handleErrorClick = async (error: IFormErrorSummaryError) => {
      if (clickToScroll) {
        await onBeforeScrollToField?.(error.fieldName, error);

        if (scrollDelay > 0) {
          await delay(scrollDelay);
        }

        const fieldElement = resolveFieldElement(error);
        if (fieldElement) {
          expandContainingDisclosures(fieldElement);
        }

        if (onScrollToField) {
          await onScrollToField(error.fieldName, error);
        } else if (fieldElement) {
          fieldElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            ...scrollOptions,
          });
        } else {
          formContext?.scrollToField(error.fieldName, {
            behavior: 'smooth',
            block: 'center',
            ...scrollOptions,
          });
        }

        window.setTimeout(() => focusField(error), focusDelay);
      }

      onErrorClick?.(error.fieldName, error);
    };

    const positionClass = position === 'sticky' ? 'spfx-form-error-summary-sticky' : '';
    const compactClass = compact ? 'spfx-form-error-summary-compact' : '';
    const listMargin = compact ? '4px 0 0 0' : '8px 0 0 0';
    const itemMargin = compact ? '2px' : '4px';
    const title = `Please fix the following ${filteredErrors.length} error${filteredErrors.length > 1 ? 's' : ''}:`;

    const renderErrorList = (errorsToRender: IFormErrorSummaryError[]) => (
      <ul style={{ margin: listMargin, paddingLeft: '20px' }}>
        {errorsToRender.map((error) => {
          const label = showFieldLabels ? resolveLabel(error.fieldName, error.label) : null;
          const canNavigate = clickToScroll || !!onErrorClick;

          return (
            <li key={`${error.fieldName}-${error.message}`} style={{ marginBottom: itemMargin }}>
              {label && canNavigate ? (
                <>
                  <button
                    type='button'
                    onClick={() => {
                      void handleErrorClick(error);
                    }}
                    aria-label={`Go to ${label} field`}
                    className='spfx-form-error-summary-link'
                  >
                    {label}
                  </button>
                  : {error.message}
                </>
              ) : label ? (
                <>
                  <span style={{ fontWeight: 600 }}>{label}</span>: {error.message}
                </>
              ) : (
                error.message
              )}
            </li>
          );
        })}

        {hasMoreErrors && (
          <li className='spfx-form-error-summary-more'>
            ...and {hiddenErrorCount} more error{hiddenErrorCount > 1 ? 's' : ''}
          </li>
        )}
      </ul>
    );

    const groupedErrors = (() => {
      if (groupBy !== 'section') {
        return [{ section: undefined as string | undefined, errors: displayErrors }];
      }

      const groups = new Map<string, IFormErrorSummaryError[]>();
      displayErrors.forEach((error) => {
        const groupName = error.section || 'Other';
        const group = groups.get(groupName) || [];
        group.push(error);
        groups.set(groupName, group);
      });

      return Array.from(groups.entries()).map(([section, errors]) => ({ section, errors }));
    })();

    const content = (
      <Stack tokens={{ childrenGap: compact ? 4 : 12 }}>
        {!compact && <span className='spfx-form-error-summary-title'>{title}</span>}

        {groupedErrors.map((group) => (
          <div key={group.section || 'all'}>
            {groupBy === 'section' && group.section && (
              <div className='spfx-form-error-summary-section'>{group.section}</div>
            )}
            {renderErrorList(group.errors)}
          </div>
        ))}
      </Stack>
    );

    const rootClassName = `spfx-form-error-summary ${positionClass} ${compactClass} ${className}`.trim();

    if (variant === 'card') {
      return (
        <div
          ref={ref}
          role='alert'
          tabIndex={-1}
          className={`${rootClassName} spfx-form-error-summary-card`}
        >
          {content}
        </div>
      );
    }

    if (variant === 'accordion') {
      return (
        <div
          ref={ref}
          role='alert'
          tabIndex={-1}
          className={`${rootClassName} spfx-form-error-summary-accordion`}
        >
          <button
            type='button'
            className='spfx-form-error-summary-accordion-header'
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <span>{title}</span>
            <span aria-hidden='true'>{isExpanded ? '-' : '+'}</span>
          </button>
          {isExpanded && <div className='spfx-form-error-summary-accordion-content'>{content}</div>}
        </div>
      );
    }

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
          className={rootClassName}
          styles={{ root: { borderRadius: '4px' } }}
        >
          {content}
        </MessageBar>
      </div>
    );
  }
);

FormErrorSummaryBase.displayName = 'FormErrorSummary';

const FormErrorSummary = React.memo(FormErrorSummaryBase);

FormErrorSummary.displayName = 'FormErrorSummary';

export default FormErrorSummary;
