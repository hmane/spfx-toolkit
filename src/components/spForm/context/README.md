# FormContext System

The FormContext system provides centralized form state management and utilities for the spForm component suite. It integrates with React Hook Form to provide enhanced functionality including field registration, error handling, focus management, and scroll-to-error capabilities.

## Overview

The FormContext system consists of:

- **FormContext**: React context for sharing form state
- **FormProvider**: Provider component that wraps forms
- **useFormContext**: Hook to access form context
- **Field Registry**: Automatic tracking of all form fields with metadata

## Core Features

### 🎯 Field Registry

Automatically tracks all form fields with metadata including:
- Field name and label
- Required status
- DOM reference
- Section/group
- Display order

### 🔍 Error Handling

- Get error messages for specific fields
- Check if fields have errors
- Find first field with error
- Auto-show errors (optional)

### 🎨 Focus Management

- Focus fields by name
- Focus first error field
- Find focusable elements within containers

### 📜 Scroll-to-Error

- Scroll to specific fields
- Scroll to first error
- Customizable scroll options (smooth, instant, etc.)

## Basic Usage

### 1. Wrap Form with FormProvider

```tsx
import { useForm } from 'react-hook-form';
import { FormProvider, FormContainer } from 'spfx-toolkit/lib/components/spForm';

const MyForm = () => {
  const { control, handleSubmit } = useForm();

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <FormProvider control={control}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </FormProvider>
  );
};
```

### 2. Or Use FormContainer with Control Prop

```tsx
import { useForm } from 'react-hook-form';
import { FormContainer } from 'spfx-toolkit/lib/components/spForm';

const MyForm = () => {
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormContainer control={control} autoShowErrors>
        {/* Form fields */}
      </FormContainer>
    </form>
  );
};
```

### 3. Register Fields with FormItem

```tsx
import { Controller } from 'react-hook-form';
import { FormItem, FormLabel } from 'spfx-toolkit/lib/components/spForm';

<FormItem fieldName="title" autoShowError>
  <FormLabel isRequired>Title</FormLabel>
  <Controller
    name="title"
    control={control}
    rules={{ required: 'Title is required' }}
    render={({ field }) => (
      <TextField {...field} />
    )}
  />
</FormItem>
```

## API Reference

### FormProvider Props

```typescript
interface IFormProviderProps {
  /** Child components */
  children: React.ReactNode;

  /** React Hook Form control (optional) */
  control?: Control<any>;

  /** Auto-show errors for all fields */
  autoShowErrors?: boolean;
}
```

### FormContext Value

```typescript
interface IFormContextValue<TFormData extends FieldValues = any> {
  /** React Hook Form control */
  control?: Control<TFormData>;

  /** Form state from React Hook Form */
  formState?: UseFormStateReturn<TFormData>;

  /** Field registry */
  registry: IFieldRegistry;

  /** Auto-show errors for all fields */
  autoShowErrors?: boolean;

  /** Get error message for a field */
  getFieldError(fieldName: string): string | undefined;

  /** Check if field has error */
  hasError(fieldName: string): boolean;

  /** Get first field with error */
  getFirstErrorField(): string | undefined;

  /** Focus a field by name */
  focusField(fieldName: string): boolean;

  /** Focus first field with error */
  focusFirstError(): boolean;

  /** Scroll to a field by name */
  scrollToField(fieldName: string, options?: ScrollIntoViewOptions): void;

  /** Scroll to first field with error */
  scrollToFirstError(options?: ScrollIntoViewOptions): void;
}
```

### Field Metadata

```typescript
interface IFormFieldMetadata {
  /** Field name */
  name: string;

  /** Field label text */
  label?: string;

  /** Whether field is required */
  required?: boolean;

  /** Reference to the field's DOM element */
  ref?: React.RefObject<HTMLElement>;

  /** Section/group the field belongs to */
  section?: string;

  /** Display order */
  order?: number;
}
```

### Field Registry

```typescript
interface IFieldRegistry {
  /** Register a field */
  register(name: string, metadata: IFormFieldMetadata): void;

  /** Unregister a field */
  unregister(name: string): void;

  /** Get field metadata by name */
  get(name: string): IFormFieldMetadata | undefined;

  /** Get all registered fields */
  getAll(): IFormFieldMetadata[];

  /** Get fields by section */
  getBySection(section: string): IFormFieldMetadata[];
}
```

## Advanced Usage

### Using Context Utilities

```tsx
import { useFormContext } from 'spfx-toolkit/lib/components/spForm';

const MyFormSection = () => {
  const formContext = useFormContext();

  const handleScrollToFirstError = () => {
    formContext?.scrollToFirstError({ behavior: 'smooth', block: 'center' });
  };

  const handleFocusFirstError = () => {
    formContext?.focusFirstError();
  };

  return (
    <div>
      <button onClick={handleScrollToFirstError}>
        Scroll to First Error
      </button>
      <button onClick={handleFocusFirstError}>
        Focus First Error
      </button>
    </div>
  );
};
```

### Accessing Field Registry

```tsx
import { useFormContext } from 'spfx-toolkit/lib/components/spForm';

const FormDebugger = () => {
  const formContext = useFormContext();

  const allFields = formContext?.registry.getAll();
  const requiredFields = allFields?.filter(f => f.required);

  return (
    <div>
      <h3>Registered Fields ({allFields?.length})</h3>
      <ul>
        {allFields?.map(field => (
          <li key={field.name}>
            {field.label || field.name}
            {field.required && ' *'}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### Organizing Fields by Section

```tsx
<FormItem fieldName="firstName" section="personal" autoShowError>
  <FormLabel isRequired>First Name</FormLabel>
  <Controller
    name="firstName"
    control={control}
    rules={{ required: 'First name is required' }}
    render={({ field }) => <TextField {...field} />}
  />
</FormItem>

<FormItem fieldName="lastName" section="personal" autoShowError>
  <FormLabel isRequired>Last Name</FormLabel>
  <Controller
    name="lastName"
    control={control}
    rules={{ required: 'Last name is required' }}
    render={({ field }) => <TextField {...field} />}
  />
</FormItem>

// Access fields by section
const formContext = useFormContext();
const personalFields = formContext?.registry.getBySection('personal');
```

## Integration with Other Features

### With FormErrorSummary

```tsx
import { FormProvider, FormErrorSummary } from 'spfx-toolkit/lib/components/spForm';

<FormProvider control={control} autoShowErrors>
  <FormErrorSummary
    position="top"
    clickToScroll
    showFieldLabels
  />

  {/* Form fields */}
</FormProvider>
```

### With useScrollToError Hook

```tsx
import { useForm } from 'react-hook-form';
import { FormProvider, useScrollToError } from 'spfx-toolkit/lib/components/spForm';

const MyForm = () => {
  const { control, handleSubmit, formState } = useForm();

  // Automatically scroll to first error on submit
  useScrollToError(formState, {
    behavior: 'smooth',
    block: 'center',
    focusAfterScroll: true,
    scrollDelay: 100,
  });

  return (
    <FormProvider control={control}>
      {/* Form fields */}
    </FormProvider>
  );
};
```

### With useZustandFormSync Hook

```tsx
import { create } from 'zustand';
import { useForm } from 'react-hook-form';
import { FormProvider, useZustandFormSync } from 'spfx-toolkit/lib/components/spForm';

const useFormStore = create((set) => ({
  formData: {},
  setFormData: (data) => set({ formData: data }),
}));

const MyForm = () => {
  const { control } = useForm();

  // Sync form data to Zustand store
  useZustandFormSync(control, useFormStore, {
    debounceMs: 300,
    selectFields: ['title', 'description'], // Only sync specific fields
  });

  return (
    <FormProvider control={control}>
      {/* Form fields */}
    </FormProvider>
  );
};
```

## Best Practices

### 1. Always Provide Control

The FormContext system works best when you provide a React Hook Form control:

```tsx
// ✅ Good
<FormProvider control={control}>
  {/* Fields */}
</FormProvider>

// ❌ Limited functionality
<FormProvider>
  {/* Fields - no error tracking, no form state */}
</FormProvider>
```

### 2. Use fieldName for Auto-Registration

FormItem automatically registers fields when you provide a fieldName:

```tsx
// ✅ Good - auto-registers with metadata
<FormItem fieldName="email" autoShowError>
  <FormLabel isRequired>Email</FormLabel>
  <Controller name="email" control={control} render={...} />
</FormItem>

// ❌ Missing - no auto-registration
<FormItem autoShowError>
  <FormLabel>Email</FormLabel>
  <Controller name="email" control={control} render={...} />
</FormItem>
```

### 3. Enable autoShowErrors Strategically

Enable at FormProvider level for all fields, or per-field for specific fields:

```tsx
// All fields show errors
<FormProvider control={control} autoShowErrors>
  <FormItem fieldName="email">...</FormItem>
  <FormItem fieldName="phone">...</FormItem>
</FormProvider>

// Only specific fields show errors
<FormProvider control={control}>
  <FormItem fieldName="email" autoShowError>...</FormItem>
  <FormItem fieldName="phone">...</FormItem> {/* No error shown */}
</FormProvider>
```

### 4. Leverage Section Organization

Group related fields using the section prop:

```tsx
<FormItem fieldName="street" section="address">...</FormItem>
<FormItem fieldName="city" section="address">...</FormItem>
<FormItem fieldName="zip" section="address">...</FormItem>

// Later, access all address fields
const addressFields = formContext?.registry.getBySection('address');
```

### 5. Combine with Form Validation

Use React Hook Form validation with FormContext error display:

```tsx
<Controller
  name="email"
  control={control}
  rules={{
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address',
    },
  }}
  render={({ field }) => <TextField {...field} />}
/>
```

## TypeScript Support

The FormContext system is fully typed with generic support:

```typescript
interface IMyFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

const MyForm = () => {
  const { control } = useForm<IMyFormData>();
  const formContext = useFormContext<IMyFormData>();

  // Full type safety
  formContext?.getFieldError('title'); // ✅ Valid
  formContext?.getFieldError('invalid'); // ✅ Still works (runtime check)
};
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE 11 (with polyfills for scrollIntoView options)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Considerations

1. **Field Registry**: Uses Map for O(1) lookups
2. **Memoization**: Context value is memoized to prevent unnecessary re-renders
3. **Auto-unregister**: Fields automatically unregister on unmount
4. **Debouncing**: Use with useZustandFormSync for efficient state updates

## Troubleshooting

### Fields Not Registering

**Problem**: Fields don't appear in registry

**Solution**: Ensure you're providing the `fieldName` prop to FormItem:

```tsx
// ✅ Correct
<FormItem fieldName="email">...</FormItem>

// ❌ Wrong
<FormItem>...</FormItem>
```

### Focus Not Working

**Problem**: `focusField()` doesn't focus the input

**Solution**: Ensure the field has a focusable element (input, textarea, select, button):

```tsx
<FormItem fieldName="email">
  <Controller
    name="email"
    control={control}
    render={({ field }) => (
      <TextField {...field} /> {/* Must be a focusable element */}
    )}
  />
</FormItem>
```

### Scroll Not Working

**Problem**: `scrollToField()` doesn't scroll

**Solution**: Ensure FormItem has a DOM ref by providing fieldName:

```tsx
<FormItem fieldName="email"> {/* Creates ref automatically */}
  ...
</FormItem>
```

### Errors Not Showing

**Problem**: Field errors don't display

**Solution**: Enable autoShowError on FormItem or FormProvider:

```tsx
// Option 1: Per-field
<FormItem fieldName="email" autoShowError>...</FormItem>

// Option 2: All fields
<FormProvider control={control} autoShowErrors>
  <FormItem fieldName="email">...</FormItem>
</FormProvider>
```

## Related Components

- [FormErrorSummary](../FormErrorSummary/README.md) - Display all form errors
- [useScrollToError Hook](../hooks/README.md#usescrolltoerror) - Auto-scroll on errors
- [useZustandFormSync Hook](../hooks/README.md#usezustandformsync) - Sync with Zustand
- [useFormFieldError Hook](../hooks/README.md#useformfielderror) - Extract field errors

## Examples

See the [Usage Guide](../../../../docs/spForm-Usage-Guide.md) for complete examples including:
- Basic form with validation
- Form with error summary
- Multi-section forms
- Form with Zustand sync
- Custom error handling
- Programmatic field access
