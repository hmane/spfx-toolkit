# spForm Utility Hooks

A collection of utility hooks that enhance form functionality when working with React Hook Form and the FormContext system.

## Available Hooks

- [useScrollToError](#usescrolltoerror) - Automatically scroll to first error field
- [useZustandFormSync](#usezustandformsync) - Sync React Hook Form with Zustand store
- [useFormFieldError](#useformfielderror) - Extract error message for a specific field

---

## useScrollToError

Automatically scrolls to the first field with an error. Useful for long forms where users need to be guided to validation errors.

### Features

- 🎯 **Smart Field Detection**: Uses 3 strategies to find error fields
- 🔄 **Automatic Scrolling**: Scrolls on error state change
- ⚙️ **Configurable**: Customizable scroll behavior and timing
- 🎨 **Focus Support**: Optionally focus the error field after scroll
- ♿ **Accessible**: Works with screen readers and keyboard navigation

### Basic Usage

```typescript
import { useForm } from 'react-hook-form';
import { useScrollToError } from 'spfx-toolkit/lib/components/spForm';

const MyForm = () => {
  const { control, handleSubmit, formState } = useForm();

  // Automatically scroll to first error
  useScrollToError(formState);

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
};
```

### With Options

```typescript
useScrollToError(formState, {
  behavior: 'smooth',      // Scroll behavior
  block: 'center',         // Vertical alignment
  inline: 'nearest',       // Horizontal alignment
  focusAfterScroll: true,  // Focus field after scroll
  scrollDelay: 100,        // Delay before scrolling (ms)
  enabled: true,           // Enable/disable scrolling
});
```

### API Reference

#### Parameters

```typescript
function useScrollToError(
  formState: UseFormStateReturn<any>,
  options?: IUseScrollToErrorOptions
): IUseScrollToErrorReturn
```

#### Options

```typescript
interface IUseScrollToErrorOptions {
  /** Scroll behavior */
  behavior?: ScrollBehavior; // 'auto' | 'smooth'

  /** Vertical alignment */
  block?: ScrollLogicalPosition; // 'start' | 'center' | 'end' | 'nearest'

  /** Horizontal alignment */
  inline?: ScrollLogicalPosition;

  /** Focus field after scroll */
  focusAfterScroll?: boolean; // Default: true

  /** Delay before scrolling (ms) */
  scrollDelay?: number; // Default: 0

  /** Enable/disable scrolling */
  enabled?: boolean; // Default: true
}
```

#### Return Value

```typescript
interface IUseScrollToErrorReturn {
  /** Manually scroll to first error */
  scrollToFirstError: () => void;

  /** Manually scroll to specific field */
  scrollToField: (fieldName: string) => void;

  /** Get first field with error */
  getFirstErrorField: () => string | undefined;
}
```

### Advanced Usage

#### Manual Scrolling

```typescript
const { scrollToFirstError, scrollToField } = useScrollToError(formState, {
  enabled: false, // Disable automatic scrolling
});

// Manually trigger scroll
const handleSubmit = async (data) => {
  try {
    await saveData(data);
  } catch (error) {
    scrollToFirstError();
  }
};

// Scroll to specific field
scrollToField('email');
```

#### Conditional Scrolling

```typescript
const [enableScroll, setEnableScroll] = React.useState(false);

useScrollToError(formState, {
  enabled: enableScroll,
});

// Enable scrolling after first submit attempt
const handleSubmit = () => {
  setEnableScroll(true);
  // ...
};
```

#### With FormContext

```typescript
import { FormProvider, useScrollToError } from 'spfx-toolkit/lib/components/spForm';

const MyForm = () => {
  const { control, formState, handleSubmit } = useForm();

  useScrollToError(formState, {
    behavior: 'smooth',
    block: 'center',
    focusAfterScroll: true,
  });

  return (
    <FormProvider control={control}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Fields */}
      </form>
    </FormProvider>
  );
};
```

### Field Detection Strategies

The hook uses 3 strategies to find error fields:

1. **By Name Attribute**: `input[name="fieldName"]`
2. **By ID Attribute**: `#fieldName`
3. **By Data Attribute**: `[data-field-name="fieldName"]`

Example markup that works with all strategies:

```tsx
<input name="email" id="email" data-field-name="email" />
```

---

## useZustandFormSync

Synchronizes React Hook Form state with a Zustand store. Perfect for:
- Persisting form drafts
- Sharing form state across components
- Implementing auto-save functionality
- Managing complex form state

### Features

- 🔄 **Bidirectional Sync**: Form ↔ Store synchronization
- ⏱️ **Debounced Updates**: Prevents excessive store updates
- 🎯 **Field Filtering**: Sync only specific fields
- 🔧 **Data Transformation**: Transform data before syncing
- 🎨 **Flexible**: Works with any Zustand store structure

### Basic Usage

```typescript
import { create } from 'zustand';
import { useForm } from 'react-hook-form';
import { useZustandFormSync } from 'spfx-toolkit/lib/components/spForm';

// Create Zustand store
const useFormStore = create((set) => ({
  formData: {},
  setFormData: (data) => set({ formData: data }),
}));

const MyForm = () => {
  const { control } = useForm();

  // Sync form to store
  useZustandFormSync(control, useFormStore);

  return <form>...</form>;
};
```

### With Options

```typescript
useZustandFormSync(control, useFormStore, {
  debounceMs: 500,                    // Debounce delay
  selectFields: ['title', 'status'],  // Only sync these fields
  setMethod: 'setFormData',           // Store method name
  transformOut: (data) => ({          // Transform before sync
    ...data,
    timestamp: Date.now(),
  }),
});
```

### API Reference

#### Parameters

```typescript
function useZustandFormSync(
  control: Control<any>,
  store: any,
  options?: IUseZustandFormSyncOptions
): void
```

#### Options

```typescript
interface IUseZustandFormSyncOptions {
  /** Debounce delay in milliseconds */
  debounceMs?: number; // Default: 300

  /** Only sync specific fields */
  selectFields?: string[];

  /** Store method name to call with form data */
  setMethod?: string; // Default: 'setFormData'

  /** Transform data before syncing to store */
  transformOut?: (data: any) => any;
}
```

### Advanced Usage

#### Sync Specific Fields Only

```typescript
useZustandFormSync(control, useFormStore, {
  selectFields: ['title', 'description', 'priority'],
  // Only these fields will be synced to the store
});
```

#### Transform Data Before Sync

```typescript
useZustandFormSync(control, useFormStore, {
  transformOut: (data) => ({
    ...data,
    // Add metadata
    lastModified: new Date().toISOString(),
    userId: currentUser.id,
    // Clean up temporary fields
    tempField: undefined,
  }),
});
```

#### Custom Store Method

```typescript
const useFormStore = create((set) => ({
  draft: {},
  updateDraft: (data) => set({ draft: data }),
}));

useZustandFormSync(control, useFormStore, {
  setMethod: 'updateDraft', // Call this method instead of setFormData
});
```

#### Persistent Draft Auto-Save

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useFormStore = create(
  persist(
    (set) => ({
      formData: {},
      setFormData: (data) => set({ formData: data }),
    }),
    {
      name: 'form-draft', // localStorage key
    }
  )
);

const MyForm = () => {
  const { control, reset } = useForm();
  const { formData } = useFormStore();

  // Load draft on mount
  React.useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      reset(formData);
    }
  }, []);

  // Auto-save every 500ms
  useZustandFormSync(control, useFormStore, {
    debounceMs: 500,
  });

  return <form>...</form>;
};
```

#### Multi-Step Form with Shared State

```typescript
const useWizardStore = create((set) => ({
  step1Data: {},
  step2Data: {},
  step3Data: {},
  setStep1Data: (data) => set({ step1Data: data }),
  setStep2Data: (data) => set({ step2Data: data }),
  setStep3Data: (data) => set({ step3Data: data }),
}));

// Step 1
const Step1 = () => {
  const { control } = useForm();
  useZustandFormSync(control, useWizardStore, {
    setMethod: 'setStep1Data',
  });
  return <form>...</form>;
};

// Step 2
const Step2 = () => {
  const { control } = useForm();
  useZustandFormSync(control, useWizardStore, {
    setMethod: 'setStep2Data',
  });
  return <form>...</form>;
};
```

---

## useFormFieldError

Extracts error message and status for a specific form field. Useful for custom error display components.

### Features

- 🎯 **Simple API**: Get error info for any field
- 🔄 **Reactive**: Updates when errors change
- 📝 **Type-Safe**: Full TypeScript support
- ⚡ **Memoized**: Optimized with React.useMemo

### Basic Usage

```typescript
import { useForm } from 'react-hook-form';
import { useFormFieldError } from 'spfx-toolkit/lib/components/spForm';

const MyFormField = ({ name }) => {
  const { formState: { errors } } = useForm();
  const { error, hasError } = useFormFieldError(name, errors);

  return (
    <div>
      <input name={name} />
      {hasError && <span className="error">{error}</span>}
    </div>
  );
};
```

### API Reference

#### Parameters

```typescript
function useFormFieldError(
  fieldName: string,
  errors: FieldErrors<any>
): IUseFormFieldErrorReturn
```

#### Return Value

```typescript
interface IUseFormFieldErrorReturn {
  /** Error message for the field */
  error: string | undefined;

  /** Whether field has an error */
  hasError: boolean;
}
```

### Advanced Usage

#### Custom Error Display Component

```typescript
interface ICustomErrorProps {
  fieldName: string;
  errors: FieldErrors<any>;
}

const CustomError: React.FC<ICustomErrorProps> = ({ fieldName, errors }) => {
  const { error, hasError } = useFormFieldError(fieldName, errors);

  if (!hasError) return null;

  return (
    <div className="custom-error" role="alert" aria-live="polite">
      <Icon iconName="Error" />
      <Text>{error}</Text>
    </div>
  );
};

// Usage
<CustomError fieldName="email" errors={formState.errors} />
```

#### With Nested Fields

```typescript
const { error, hasError } = useFormFieldError('address.street', errors);
```

#### With Field Arrays

```typescript
const { error, hasError } = useFormFieldError('items[0].name', errors);
```

#### Conditional Rendering

```typescript
const EmailField = () => {
  const { formState: { errors, touchedFields } } = useForm();
  const { error, hasError } = useFormFieldError('email', errors);
  const isTouched = touchedFields.email;

  return (
    <div>
      <input name="email" />
      {/* Only show error if field was touched */}
      {isTouched && hasError && (
        <span className="error">{error}</span>
      )}
    </div>
  );
};
```

---

## Combined Usage Example

Here's an example combining all three hooks:

```typescript
import { create } from 'zustand';
import { useForm } from 'react-hook-form';
import {
  FormProvider,
  FormItem,
  FormLabel,
  FormErrorSummary,
  useScrollToError,
  useZustandFormSync,
  useFormFieldError,
} from 'spfx-toolkit/lib/components/spForm';

// Zustand store
const useFormStore = create((set) => ({
  formData: {},
  setFormData: (data) => set({ formData: data }),
}));

const AdvancedForm = () => {
  const { control, handleSubmit, formState } = useForm();

  // Auto-scroll to errors
  useScrollToError(formState, {
    behavior: 'smooth',
    block: 'center',
    focusAfterScroll: true,
  });

  // Auto-save to store
  useZustandFormSync(control, useFormStore, {
    debounceMs: 500,
    selectFields: ['title', 'description', 'priority'],
  });

  const onSubmit = (data) => {
    console.log('Submitting:', data);
  };

  return (
    <FormProvider control={control} autoShowErrors>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormErrorSummary position="top" clickToScroll />

        <FormItem fieldName="title">
          <FormLabel isRequired>Title</FormLabel>
          <Controller
            name="title"
            control={control}
            rules={{ required: 'Title is required' }}
            render={({ field }) => <TextField {...field} />}
          />
        </FormItem>

        <FormItem fieldName="description">
          <FormLabel>Description</FormLabel>
          <Controller
            name="description"
            control={control}
            render={({ field }) => <TextField {...field} multiline />}
          />
        </FormItem>

        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};
```

## Best Practices

### 1. Debounce Store Sync

Always use debouncing when syncing to stores to avoid excessive updates:

```typescript
// ✅ Good
useZustandFormSync(control, store, { debounceMs: 300 });

// ❌ Bad (performance issue)
useZustandFormSync(control, store, { debounceMs: 0 });
```

### 2. Enable Scroll-to-Error Conditionally

For multi-step forms, enable scroll-to-error only on submit:

```typescript
const [shouldScroll, setShouldScroll] = React.useState(false);

useScrollToError(formState, {
  enabled: shouldScroll,
});

const handleSubmit = () => {
  setShouldScroll(true);
  // ...
};
```

### 3. Filter Sensitive Fields

Don't sync sensitive fields to stores:

```typescript
useZustandFormSync(control, store, {
  selectFields: ['title', 'description'], // Exclude password, ssn, etc.
});
```

### 4. Combine with FormContext

Use hooks alongside FormContext for maximum functionality:

```typescript
<FormProvider control={control} autoShowErrors>
  {/* Hooks work seamlessly with FormContext */}
  <MyForm />
</FormProvider>
```

## TypeScript Support

All hooks are fully typed with generic support:

```typescript
interface IMyFormData {
  title: string;
  description: string;
}

const { control, formState } = useForm<IMyFormData>();

useScrollToError(formState);
useZustandFormSync(control, store);
const { error } = useFormFieldError('title', formState.errors);
```

## Performance Considerations

1. **useScrollToError**: Minimal overhead, uses React.useEffect
2. **useZustandFormSync**: Uses debouncing and useWatch for efficiency
3. **useFormFieldError**: Uses React.useMemo for optimal re-renders

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE 11 (with polyfills for scrollIntoView options)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Related Documentation

- [FormContext System](../context/README.md)
- [FormErrorSummary Component](../FormErrorSummary/README.md)
- [spForm Usage Guide](../../../../docs/spForm-Usage-Guide.md)
