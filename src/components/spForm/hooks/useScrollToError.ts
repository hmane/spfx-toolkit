/**
 * useScrollToError - Utility hook for scrolling to first field with error
 *
 * @example
 * ```tsx
 * const { scrollToFirstError } = useScrollToError(formState);
 *
 * React.useEffect(() => {
 *   if (isSubmitted) {
 *     scrollToFirstError();
 *   }
 * }, [isSubmitted, scrollToFirstError]);
 * ```
 */

import * as React from 'react';
import { UseFormStateReturn } from 'react-hook-form';

export interface IUseScrollToErrorOptions {
  /**
   * Scroll behavior
   * @default 'smooth'
   */
  behavior?: ScrollBehavior;

  /**
   * Vertical alignment
   * @default 'center'
   */
  block?: ScrollLogicalPosition;

  /**
   * Focus field after scrolling
   * @default true
   */
  focusAfterScroll?: boolean;

  /**
   * Delay before focusing (ms)
   * @default 300
   */
  focusDelay?: number;
}

export interface IUseScrollToErrorReturn {
  /**
   * Scroll to first field with error
   */
  scrollToFirstError: () => void;

  /**
   * Scroll to specific field
   */
  scrollToField: (fieldName: string) => void;

  /**
   * Get first field with error
   */
  getFirstErrorField: () => string | undefined;
}

/**
 * Hook to scroll to fields with errors
 */
export function useScrollToError(
  formState: UseFormStateReturn<any>,
  options?: IUseScrollToErrorOptions
): IUseScrollToErrorReturn {
  const {
    behavior = 'smooth',
    block = 'center',
    focusAfterScroll = true,
    focusDelay = 300,
  } = options || {};

  // Track pending focus timeout for cleanup
  const focusTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  const getFirstErrorField = React.useCallback((): string | undefined => {
    if (!formState.errors) return undefined;
    const errorKeys = Object.keys(formState.errors);
    return errorKeys.length > 0 ? errorKeys[0] : undefined;
  }, [formState.errors]);

  const scrollToField = React.useCallback(
    (fieldName: string) => {
      // Strategy 1: Find by name attribute
      let element = document.querySelector(`[name="${fieldName}"]`) as HTMLElement;

      // Strategy 2: Find by data-field-name
      if (!element) {
        element = document.querySelector(`[data-field-name="${fieldName}"]`) as HTMLElement;
      }

      // Strategy 3: Find within FormItem with data-field-name
      if (!element) {
        const formItem = document.querySelector(
          `[data-field-name="${fieldName}"]`
        ) as HTMLElement;
        if (formItem) {
          element = formItem.querySelector(
            'input, textarea, select, button'
          ) as HTMLElement;
        }
      }

      if (element) {
        // Scroll to element
        element.scrollIntoView({ behavior, block });

        // Focus if requested
        if (focusAfterScroll) {
          // Clear any pending focus timeout
          if (focusTimeoutRef.current) {
            clearTimeout(focusTimeoutRef.current);
          }

          focusTimeoutRef.current = setTimeout(() => {
            // Find focusable element
            let focusTarget = element;
            if (!element.matches('input, textarea, select, button')) {
              const focusable = element.querySelector(
                'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])'
              );
              if (focusable) {
                focusTarget = focusable as HTMLElement;
              }
            }
            focusTarget?.focus();
            focusTimeoutRef.current = null;
          }, focusDelay);
        }
      }
    },
    [behavior, block, focusAfterScroll, focusDelay]
  );

  const scrollToFirstError = React.useCallback(() => {
    const firstErrorField = getFirstErrorField();
    if (firstErrorField) {
      scrollToField(firstErrorField);
    }
  }, [getFirstErrorField, scrollToField]);

  return {
    scrollToFirstError,
    scrollToField,
    getFirstErrorField,
  };
}
