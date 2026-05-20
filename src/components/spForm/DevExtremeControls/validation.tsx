import * as React from 'react';
import FormCharCount from '../FormCharCount/FormCharCount';
import FormError from '../FormError/FormError';
export { CharCountSync } from '../FormCharCount/CharCountSync';

export interface IDevExtremeValidationProps {
  /**
   * Field label used by summaries and default invalid messages. DevExtreme
   * wrappers do not render the label themselves.
   */
  label?: string;

  /** Marks the field as required in the shared form registry. */
  required?: boolean;

  /** Explicit validity override for custom/class-component validation. */
  isValid?: boolean;

  /** Explicit validation message for custom/class-component validation. */
  errorMessage?: string;

  /** Alias for `errorMessage`, kept for consumers that use DevExtreme naming. */
  errorText?: string;

  /**
   * Render the explicit/custom error message below the editor.
   * @default true
   */
  showErrorMessage?: boolean;

  /**
   * DevExtreme validation message mode.
   */
  validationMessageMode?: 'always' | 'auto';
}

export interface IResolvedDevExtremeValidation {
  isValid: boolean;
  hasError: boolean;
  errorMessage?: string;
  validationError?: { message: string };
  validationMessageMode?: 'always' | 'auto';
  shouldRenderInlineError: boolean;
}

export interface IDevExtremeFieldMetaRowProps {
  name?: string;
  error?: string;
  showCharacterCount?: boolean;
  currentCharCount?: number;
  maxLength?: number;
  warningThreshold?: number;
}

function getErrorMessage(error: any): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  if (typeof error.message === 'string') return error.message;
  return undefined;
}

function getDefaultInvalidMessage(label?: string, name?: string): string {
  const fieldLabel = label?.trim() || name?.trim();
  return fieldLabel ? `${fieldLabel} is invalid.` : 'This field is invalid.';
}

const VALIDATION_ERROR_CACHE_MAX = 50;
const validationErrorCache = new Map<string, { message: string }>();

// FIFO-bounded cache: evict only the oldest entry on overflow instead of
// clearing the entire map, so existing entries keep their object identity
// (the whole point of the cache).
function getValidationError(message: string | undefined): { message: string } | undefined {
  if (!message) return undefined;

  const cached = validationErrorCache.get(message);
  if (cached) return cached;

  if (validationErrorCache.size >= VALIDATION_ERROR_CACHE_MAX) {
    const oldestKey = validationErrorCache.keys().next().value;
    if (oldestKey !== undefined) validationErrorCache.delete(oldestKey);
  }

  const validationError = { message };
  validationErrorCache.set(message, validationError);
  return validationError;
}

export function resolveDevExtremeValidationState(args: IDevExtremeValidationProps & {
  name?: string;
  fieldError?: any;
}): IResolvedDevExtremeValidation {
  const fieldErrorMessage = getErrorMessage(args.fieldError);

  // RHF-driven errors always win — the form's source of truth overrides
  // any explicit override the caller passed. Inline rendering is skipped
  // because FormItem/FormValue render the RHF error elsewhere; the message
  // is still pushed to DevExtreme so its tooltip stays in sync.
  if (fieldErrorMessage) {
    return {
      isValid: false,
      hasError: true,
      errorMessage: fieldErrorMessage,
      validationError: getValidationError(fieldErrorMessage),
      validationMessageMode: args.validationMessageMode,
      shouldRenderInlineError: false,
    };
  }

  // Caller explicitly asserted validity → suppress any stale explicit message.
  if (args.isValid === true) {
    return {
      isValid: true,
      hasError: false,
      errorMessage: undefined,
      validationError: undefined,
      validationMessageMode: args.validationMessageMode,
      shouldRenderInlineError: false,
    };
  }

  const explicitMessage = args.errorMessage || args.errorText;

  if (args.isValid === false || explicitMessage) {
    const errorMessage = explicitMessage || getDefaultInvalidMessage(args.label, args.name);
    const shouldRenderInlineError = args.showErrorMessage !== false;
    return {
      isValid: false,
      hasError: true,
      errorMessage,
      validationError: shouldRenderInlineError ? undefined : getValidationError(errorMessage),
      validationMessageMode: args.validationMessageMode,
      shouldRenderInlineError,
    };
  }

  return {
    isValid: true,
    hasError: false,
    errorMessage: undefined,
    validationError: undefined,
    validationMessageMode: args.validationMessageMode,
    shouldRenderInlineError: false,
  };
}

export function DevExtremeFieldMetaRow(props: IDevExtremeFieldMetaRowProps): React.ReactElement | null {
  const hasError = !!props.error;
  const hasCharCount = props.showCharacterCount && typeof props.currentCharCount === 'number';

  if (!hasError && !hasCharCount) {
    return null;
  }

  return (
    <div className='spfx-devextreme-field-meta-row'>
      {hasError && (
        <FormError
          error={props.error}
          id={props.name ? `${props.name}-error` : undefined}
        />
      )}
      {hasCharCount && (
        <FormCharCount
          current={props.currentCharCount!}
          max={props.maxLength}
          warningThreshold={props.warningThreshold}
        />
      )}
    </div>
  );
}

export function DevExtremeInlineError(props: {
  name?: string;
  error?: string;
}): React.ReactElement | null {
  return <DevExtremeFieldMetaRow name={props.name} error={props.error} />;
}

export function useControllableValue<T>(
  controlledValue: T | undefined,
  defaultValue: T
): [T, (value: T) => void] {
  const [internalValue, setInternalValue] = React.useState<T>(defaultValue);
  const isControlled = controlledValue !== undefined;
  return [isControlled ? (controlledValue as T) : internalValue, setInternalValue];
}

export function isDevExtremeUserValueChange(event: { event?: unknown } | undefined): boolean {
  return event?.event !== undefined;
}
