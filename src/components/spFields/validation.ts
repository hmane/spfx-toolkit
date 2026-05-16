import { RegisterOptions } from 'react-hook-form';

type ValidateResult = boolean | string | undefined;
type ValidateFn = (value: any) => ValidateResult | Promise<ValidateResult>;

export function addValidateRule(
  rules: RegisterOptions,
  name: string,
  validator: ValidateFn
): void {
  const existingValidate = rules.validate as any;

  if (!existingValidate) {
    rules.validate = { [name]: validator };
    return;
  }

  if (typeof existingValidate === 'function') {
    rules.validate = {
      existing: existingValidate,
      [name]: validator,
    };
    return;
  }

  rules.validate = {
    ...existingValidate,
    [name]: validator,
  };
}

export function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== '';
}

export interface SPFieldValidationState {
  isValid: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export function getDefaultInvalidMessage(fieldLabel?: string): string {
  const label = fieldLabel?.trim();
  return label ? `${label} is invalid.` : 'This field is invalid.';
}

export function resolveFieldValidationState(args: {
  fieldError?: string;
  errorMessage?: string;
  errorText?: string;
  isValid?: boolean;
  fieldLabel?: string;
  fallbackErrorMessage?: string;
}): SPFieldValidationState {
  // RHF-driven errors always win — the form's source of truth overrides
  // any explicit override the caller passed.
  if (args.fieldError) {
    return { isValid: false, hasError: true, errorMessage: args.fieldError };
  }

  // Caller explicitly asserted validity → suppress any stale explicit message.
  if (args.isValid === true) {
    return { isValid: true, hasError: false, errorMessage: undefined };
  }

  const explicitMessage = args.errorMessage || args.errorText;

  if (args.isValid === false) {
    return {
      isValid: false,
      hasError: true,
      errorMessage:
        explicitMessage ||
        args.fallbackErrorMessage ||
        getDefaultInvalidMessage(args.fieldLabel),
    };
  }

  if (explicitMessage) {
    return { isValid: false, hasError: true, errorMessage: explicitMessage };
  }

  return { isValid: true, hasError: false, errorMessage: undefined };
}

export function shouldRenderFieldValidationMessage(args: {
  validation: SPFieldValidationState;
  fieldError?: string;
  errorMessage?: string;
  errorText?: string;
  isValid?: boolean;
  formContext?: { control?: unknown };
}): boolean {
  if (!args.validation.errorMessage) {
    return false;
  }

  // RHF-driven errors are rendered by FormItem/FormValue when the field lives
  // inside a FormProvider — skip the inline render to avoid duplication.
  // External/custom errors still render inline because the form context does
  // not know about them.
  if (args.formContext?.control && args.fieldError) {
    return false;
  }

  return true;
}
