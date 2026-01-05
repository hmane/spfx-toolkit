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
 * Inner component that uses useFormState when control is provided
 * This allows us to conditionally use the hook without violating React rules
 */
const FormProviderWithState: React.FC<IFormProviderProps & {
  registry: React.MutableRefObject<IFieldRegistry>;
  charCountRegistry: React.MutableRefObject<ICharCountRegistry>;
}> = ({
  children,
  control,
  autoShowErrors = false,
  registry,
  charCountRegistry,
}) => {
  // useFormState is only called when control is provided (this component is only rendered then)
  const formState = useFormState({ control: control! });

  // Store formState in a ref so context value doesn't need to depend on it
  // This prevents context updates when formState changes during render
  const formStateRef = React.useRef(formState);
  formStateRef.current = formState;

  // Stable context value - only changes when control or autoShowErrors changes
  // formState is accessed via ref to avoid context value changes on every form state update
  const contextValue = React.useMemo<IFormContextValue>(() => {
    // Use ref to get current formState - this keeps the context value stable
    const getFormState = () => formStateRef.current;

    return {
      control,
      formState: formStateRef.current, // Initial value for backward compat
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
  }, [control, autoShowErrors, registry, charCountRegistry]);

  return (
    <FormContext.Provider value={contextValue}>
      <FormStateContext.Provider value={formState}>
        {children}
      </FormStateContext.Provider>
    </FormContext.Provider>
  );
};

/**
 * FormProvider - wraps form to provide context
 * Uses two contexts: one for stable values (control, registry, etc.)
 * and one for frequently-changing form state to optimize re-renders
 *
 * When control is provided, uses FormProviderWithState to get form state.
 * When control is not provided, provides a minimal context without form state.
 */
export const FormProvider: React.FC<IFormProviderProps> = ({
  children,
  control,
  autoShowErrors = false,
}) => {
  const registry = React.useRef<IFieldRegistry>(createFieldRegistry());
  const charCountRegistry = React.useRef<ICharCountRegistry>(createCharCountRegistry());

  // If control is provided, use the inner component that calls useFormState
  if (control) {
    return (
      <FormProviderWithState
        control={control}
        autoShowErrors={autoShowErrors}
        registry={registry}
        charCountRegistry={charCountRegistry}
      >
        {children}
      </FormProviderWithState>
    );
  }

  // No control provided - create minimal context without form state
  const contextValue = React.useMemo<IFormContextValue>(() => {
    return {
      control: undefined,
      formState: undefined,
      registry: registry.current,
      charCountRegistry: charCountRegistry.current,
      autoShowErrors,

      getFieldError(): string | undefined {
        return undefined;
      },

      hasError(): boolean {
        return false;
      },

      getFirstErrorField(): string | undefined {
        return undefined;
      },

      focusField(fieldName: string): boolean {
        const field = registry.current.get(fieldName);
        if (field?.ref?.current) {
          const focusableElement = findFocusableElement(field.ref.current);
          if (focusableElement) {
            focusableElement.focus();
            return true;
          }
        }
        return false;
      },

      focusFirstError(): boolean {
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

      scrollToFirstError(): void {
        // No-op without form state
      },
    };
  }, [autoShowErrors]);

  return (
    <FormContext.Provider value={contextValue}>
      <FormStateContext.Provider value={undefined}>
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
