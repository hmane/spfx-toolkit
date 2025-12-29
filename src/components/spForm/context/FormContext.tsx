/**
 * FormContext - Centralized form state and utilities
 * Provides field registry, error handling, and focus management
 */

import * as React from 'react';
import { Control, FieldValues, useFormState, UseFormStateReturn } from 'react-hook-form';
import { IFormContextValue, IFieldRegistry, IFormFieldMetadata, ICharCountRegistry, ICharCountData } from './FormContext.types';

/**
 * Create a field registry
 */
function createFieldRegistry(): IFieldRegistry {
  const fields = new Map<string, IFormFieldMetadata>();

  return {
    register(name: string, metadata: IFormFieldMetadata) {
      fields.set(name, metadata);
    },

    unregister(name: string) {
      fields.delete(name);
    },

    get(name: string) {
      return fields.get(name);
    },

    getAll() {
      return Array.from(fields.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    getBySection(section: string) {
      return Array.from(fields.values())
        .filter((f) => f.section === section)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    },
  };
}

/**
 * Create a character count registry with pub/sub support
 */
function createCharCountRegistry(): ICharCountRegistry {
  const charCounts = new Map<string, ICharCountData>();
  const subscribers = new Map<string, Set<(data: ICharCountData | undefined) => void>>();

  const notifySubscribers = (fieldName: string, data: ICharCountData | undefined) => {
    const fieldSubscribers = subscribers.get(fieldName);
    if (fieldSubscribers) {
      fieldSubscribers.forEach(callback => callback(data));
    }
  };

  return {
    set(fieldName: string, data: ICharCountData) {
      charCounts.set(fieldName, data);
      notifySubscribers(fieldName, data);
    },

    get(fieldName: string) {
      return charCounts.get(fieldName);
    },

    remove(fieldName: string) {
      charCounts.delete(fieldName);
      notifySubscribers(fieldName, undefined);
    },

    subscribe(fieldName: string, callback: (data: ICharCountData | undefined) => void) {
      if (!subscribers.has(fieldName)) {
        subscribers.set(fieldName, new Set());
      }
      subscribers.get(fieldName)!.add(callback);

      // Return unsubscribe function
      return () => {
        const fieldSubscribers = subscribers.get(fieldName);
        if (fieldSubscribers) {
          fieldSubscribers.delete(callback);
          if (fieldSubscribers.size === 0) {
            subscribers.delete(fieldName);
          }
        }
      };
    },
  };
}

/**
 * FormContext - provides form utilities to child components
 */
export const FormContext = React.createContext<IFormContextValue | undefined>(undefined);

/**
 * FormStateContext - provides frequently-changing form state separately
 * This allows components that only need stable context values to avoid re-renders
 */
export const FormStateContext = React.createContext<UseFormStateReturn<any> | undefined>(undefined);

/**
 * Props for FormProvider
 */
export interface IFormProviderProps {
  /**
   * Child components
   */
  children: React.ReactNode;

  /**
   * React Hook Form control (optional)
   */
  control?: Control<any>;

  /**
   * Auto-show errors for all fields
   */
  autoShowErrors?: boolean;
}

/**
 * FormProvider - wraps form to provide context
 * Uses two contexts: one for stable values (control, registry, etc.)
 * and one for frequently-changing form state to optimize re-renders
 */
export const FormProvider: React.FC<IFormProviderProps> = ({
  children,
  control,
  autoShowErrors = false,
}) => {
  const registry = React.useRef<IFieldRegistry>(createFieldRegistry());
  const charCountRegistry = React.useRef<ICharCountRegistry>(createCharCountRegistry());
  const formState = control ? useFormState({ control }) : undefined;

  // Stable context value - only changes when control or autoShowErrors changes
  const contextValue = React.useMemo<IFormContextValue>(() => {
    // Store formState in a ref-like pattern for methods that need it
    // This way the contextValue doesn't change when formState changes
    const getFormState = () => formState;

    return {
      control,
      formState, // Keep for backward compatibility
      registry: registry.current,
      charCountRegistry: charCountRegistry.current,
      autoShowErrors,

      getFieldError(fieldName: string): string | undefined {
        const currentFormState = getFormState();
        if (!currentFormState?.errors) return undefined;
        const error = currentFormState.errors[fieldName];
        return error?.message as string | undefined;
      },

      hasError(fieldName: string): boolean {
        const currentFormState = getFormState();
        if (!currentFormState?.errors) return false;
        return !!currentFormState.errors[fieldName];
      },

      getFirstErrorField(): string | undefined {
        const currentFormState = getFormState();
        if (!currentFormState?.errors) return undefined;
        const errorKeys = Object.keys(currentFormState.errors);
        return errorKeys.length > 0 ? errorKeys[0] : undefined;
      },

      focusField(fieldName: string): boolean {
        const field = registry.current.get(fieldName);
        if (field?.ref?.current) {
          // Try to find focusable element
          const focusableElement = findFocusableElement(field.ref.current);
          if (focusableElement) {
            focusableElement.focus();
            return true;
          }
        }
        return false;
      },

      focusFirstError(): boolean {
        const firstErrorField = this.getFirstErrorField();
        if (firstErrorField) {
          return this.focusField(firstErrorField);
        }
        return false;
      },

      scrollToField(fieldName: string, options?: ScrollIntoViewOptions): void {
        const field = registry.current.get(fieldName);
        if (field?.ref?.current) {
          field.ref.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            ...options,
          });
        }
      },

      scrollToFirstError(options?: ScrollIntoViewOptions): void {
        const firstErrorField = this.getFirstErrorField();
        if (firstErrorField) {
          this.scrollToField(firstErrorField, options);
        }
      },
    };
  }, [control, autoShowErrors, formState]);

  return (
    <FormContext.Provider value={contextValue}>
      <FormStateContext.Provider value={formState}>
        {children}
      </FormStateContext.Provider>
    </FormContext.Provider>
  );
};

/**
 * Find focusable element within a container
 */
function findFocusableElement(container: HTMLElement): HTMLElement | null {
  // If container itself is focusable
  if (
    container.matches(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])'
    )
  ) {
    return container;
  }

  // Find focusable child
  const focusable = container.querySelector(
    'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  return focusable as HTMLElement | null;
}

/**
 * Hook to use FormContext
 */
export function useFormContext<TFormData extends FieldValues = any>(): IFormContextValue<TFormData> | undefined {
  return React.useContext(FormContext);
}

/**
 * Hook to use FormStateContext directly
 * Use this when you need to subscribe to form state changes (errors, dirty, etc.)
 * Components using this will re-render on every form state change
 */
export function useFormStateContext<TFormData extends FieldValues = any>(): UseFormStateReturn<TFormData> | undefined {
  return React.useContext(FormStateContext);
}
