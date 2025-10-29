/**
 * FormContext - Centralized form state and utilities
 * Provides field registry, error handling, and focus management
 */

import * as React from 'react';
import { Control, FieldValues, useFormState, UseFormStateReturn } from 'react-hook-form';
import { IFormContextValue, IFieldRegistry, IFormFieldMetadata } from './FormContext.types';

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
 * FormContext - provides form utilities to child components
 */
export const FormContext = React.createContext<IFormContextValue | undefined>(undefined);

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
 */
export const FormProvider: React.FC<IFormProviderProps> = ({
  children,
  control,
  autoShowErrors = false,
}) => {
  const registry = React.useRef<IFieldRegistry>(createFieldRegistry());
  const formState = control ? useFormState({ control }) : undefined;

  const contextValue = React.useMemo<IFormContextValue>(() => {
    return {
      control,
      formState,
      registry: registry.current,
      autoShowErrors,

      getFieldError(fieldName: string): string | undefined {
        if (!formState?.errors) return undefined;
        const error = formState.errors[fieldName];
        return error?.message as string | undefined;
      },

      hasError(fieldName: string): boolean {
        if (!formState?.errors) return false;
        return !!formState.errors[fieldName];
      },

      getFirstErrorField(): string | undefined {
        if (!formState?.errors) return undefined;
        const errorKeys = Object.keys(formState.errors);
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
  }, [control, formState, autoShowErrors]);

  return <FormContext.Provider value={contextValue}>{children}</FormContext.Provider>;
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
