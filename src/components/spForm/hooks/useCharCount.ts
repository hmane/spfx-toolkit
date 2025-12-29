/**
 * useCharCount - Hook to subscribe to character count data from FormContext
 *
 * Used by FormValue to automatically display character counts registered by SP fields
 */

import * as React from 'react';
import { useFormContext } from '../context/FormContext';
import { ICharCountData } from '../context/FormContext.types';

export interface IUseCharCountReturn {
  /**
   * Current character count data (or undefined if not registered)
   */
  charCountData: ICharCountData | undefined;
}

/**
 * Hook to subscribe to character count updates for a specific field
 *
 * @param fieldName - The name of the field to get char count for
 * @returns Object containing the current char count data
 *
 * @example
 * ```tsx
 * const { charCountData } = useCharCount('description');
 * if (charCountData) {
 *   return <span>{charCountData.current} / {charCountData.max}</span>;
 * }
 * ```
 */
export function useCharCount(fieldName: string | undefined): IUseCharCountReturn {
  const formContext = useFormContext();
  // Extract charCountRegistry once to use as a stable dependency
  const charCountRegistry = formContext?.charCountRegistry;
  const [charCountData, setCharCountData] = React.useState<ICharCountData | undefined>(undefined);

  React.useEffect(() => {
    if (!fieldName || !charCountRegistry) {
      setCharCountData(undefined);
      return;
    }

    // Get initial value (might be set already by SPTextField's useEffect)
    const initialData = charCountRegistry.get(fieldName);
    if (initialData) {
      setCharCountData(initialData);
    }

    // Subscribe to updates - this will catch any future registrations
    const unsubscribe = charCountRegistry.subscribe(fieldName, (data) => {
      setCharCountData(data);
    });

    return unsubscribe;
  }, [fieldName, charCountRegistry]);

  return { charCountData };
}
