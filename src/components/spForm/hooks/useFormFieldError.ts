/**
 * useFormFieldError - Extract error message for a specific field
 *
 * @example
 * ```tsx
 * const { error, hasError } = useFormFieldError('title', formState.errors);
 *
 * return (
 *   <div>
 *     <input name="title" aria-invalid={hasError} />
 *     {error && <span>{error}</span>}
 *   </div>
 * );
 * ```
 */

import * as React from 'react';
import { FieldErrors } from 'react-hook-form';

export interface IUseFormFieldErrorReturn {
  /**
   * Error message for the field
   */
  error: string | undefined;

  /**
   * Whether field has an error
   */
  hasError: boolean;
}

/**
 * Hook to extract error for a specific field
 */
export function useFormFieldError(
  fieldName: string,
  errors: FieldErrors<any>
): IUseFormFieldErrorReturn {
  return React.useMemo(() => {
    const fieldError = errors[fieldName];
    return {
      error: fieldError?.message as string | undefined,
      hasError: !!fieldError,
    };
  }, [fieldName, errors]);
}
