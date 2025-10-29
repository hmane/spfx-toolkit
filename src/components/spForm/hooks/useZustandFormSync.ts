/**
 * useZustandFormSync - Synchronize React Hook Form with Zustand store
 *
 * @example
 * ```tsx
 * const useFormStore = create((set) => ({
 *   formData: {},
 *   setFormData: (data) => set({ formData: data }),
 * }));
 *
 * const MyForm = () => {
 *   const { control } = useForm();
 *
 *   useZustandFormSync(control, useFormStore, {
 *     debounceMs: 300,
 *     selectFields: ['title', 'description'],
 *   });
 *
 *   return <form>...</form>;
 * };
 * ```
 */

import * as React from 'react';
import { Control, useWatch } from 'react-hook-form';

export interface IUseZustandFormSyncOptions {
  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounceMs?: number;

  /**
   * Only sync specific fields (optional)
   */
  selectFields?: string[];

  /**
   * Store method name to call with form data
   * @default 'setFormData'
   */
  setMethod?: string;

  /**
   * Transform data before syncing to store
   */
  transformOut?: (data: any) => any;

  /**
   * Load initial data from store
   * @default true
   */
  loadInitialData?: boolean;

  /**
   * Store method name to get initial data
   * @default 'formData'
   */
  getKey?: string;
}

/**
 * Sync React Hook Form with Zustand store
 */
export function useZustandFormSync(
  control: Control<any>,
  store: any,
  options?: IUseZustandFormSyncOptions
): void {
  const {
    debounceMs = 300,
    selectFields,
    setMethod = 'setFormData',
    transformOut,
    getKey = 'formData',
  } = options || {};

  const debounceTimerRef = React.useRef<NodeJS.Timeout>();

  // Watch form changes
  const formData = useWatch({ control });

  // Sync form changes to store with debouncing
  React.useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (!formData || !store) return;

      // Filter fields if selectFields provided
      let dataToSync = formData;
      if (selectFields && Array.isArray(selectFields)) {
        dataToSync = Object.keys(formData)
          .filter((key) => selectFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = formData[key];
            return obj;
          }, {} as any);
      }

      // Transform if needed
      if (transformOut) {
        dataToSync = transformOut(dataToSync);
      }

      // Sync to store
      const state = store.getState();
      if (typeof state[setMethod] === 'function') {
        state[setMethod](dataToSync);
      } else {
        console.warn(
          `useZustandFormSync: Method "${setMethod}" not found on store`
        );
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, store, debounceMs, selectFields, setMethod, transformOut]);
}
