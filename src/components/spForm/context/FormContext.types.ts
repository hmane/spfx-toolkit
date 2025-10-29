/**
 * Type definitions for FormContext
 * Provides centralized form state management and utilities
 */

import { Control, FieldErrors, FieldValues, UseFormStateReturn } from 'react-hook-form';

/**
 * Metadata for a registered form field
 */
export interface IFormFieldMetadata {
  /**
   * Field name
   */
  name: string;

  /**
   * Field label text
   */
  label?: string;

  /**
   * Whether field is required
   */
  required?: boolean;

  /**
   * Reference to the field's DOM element
   */
  ref?: React.RefObject<HTMLElement>;

  /**
   * Section/group the field belongs to
   */
  section?: string;

  /**
   * Display order
   */
  order?: number;
}

/**
 * Field registry for tracking all form fields
 */
export interface IFieldRegistry {
  /**
   * Register a field
   */
  register(name: string, metadata: IFormFieldMetadata): void;

  /**
   * Unregister a field
   */
  unregister(name: string): void;

  /**
   * Get field metadata by name
   */
  get(name: string): IFormFieldMetadata | undefined;

  /**
   * Get all registered fields
   */
  getAll(): IFormFieldMetadata[];

  /**
   * Get fields by section
   */
  getBySection(section: string): IFormFieldMetadata[];
}

/**
 * Form context value providing utilities and state
 */
export interface IFormContextValue<TFormData extends FieldValues = any> {
  /**
   * React Hook Form control
   */
  control?: Control<TFormData>;

  /**
   * Form state from React Hook Form
   */
  formState?: UseFormStateReturn<TFormData>;

  /**
   * Field registry
   */
  registry: IFieldRegistry;

  /**
   * Auto-show errors for all fields
   */
  autoShowErrors?: boolean;

  /**
   * Get error message for a field
   */
  getFieldError(fieldName: string): string | undefined;

  /**
   * Check if field has error
   */
  hasError(fieldName: string): boolean;

  /**
   * Get first field with error
   */
  getFirstErrorField(): string | undefined;

  /**
   * Focus a field by name
   */
  focusField(fieldName: string): boolean;

  /**
   * Focus first field with error
   */
  focusFirstError(): boolean;

  /**
   * Scroll to a field by name
   */
  scrollToField(fieldName: string, options?: ScrollIntoViewOptions): void;

  /**
   * Scroll to first field with error
   */
  scrollToFirstError(options?: ScrollIntoViewOptions): void;
}
