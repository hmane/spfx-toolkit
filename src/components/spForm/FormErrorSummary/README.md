# FormErrorSummary Component

A comprehensive error summary component that displays all form validation errors in a single, accessible panel. Perfect for large forms where users need a quick overview of all validation issues.

## Features

- 🎯 **Centralized Errors**: Show all form errors in one place
- 🔗 **Click-to-Navigate**: Click errors to scroll/focus to fields
- 🎨 **Flexible Positioning**: Top, bottom, or sticky positioning
- 🗜️ **Compact Mode**: Minimal spacing for dense forms
- ✨ **Hover Effects**: Dotted underline on hover with subtle highlight
- 📝 **Clean Display**: Shows just error messages (no field labels by default)
- ♿ **Accessible**: WCAG 2.1 AA compliant with ARIA attributes
- 🎨 **Fluent UI Design**: Matches SharePoint/Microsoft 365 design language
- 📊 **Error Limiting**: Optionally limit number of displayed errors

## Installation

```bash
npm install spfx-toolkit
```

## Basic Usage

```typescript
import { useForm } from 'react-hook-form';
import { FormProvider, FormErrorSummary } from 'spfx-toolkit/lib/components/spForm';

const MyForm = () => {
  const { control, handleSubmit, formState } = useForm();

  return (
    <FormProvider control={control}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Show errors at the top */}
        <FormErrorSummary />

        {/* Form fields */}
      </form>
    </FormProvider>
  );
};
```

## API Reference

### Props

```typescript
interface IFormErrorSummaryProps {
  /**
   * Position of error summary
   * @default 'top'
   */
  position?: 'top' | 'bottom' | 'sticky';

  /**
   * Maximum number of errors to display
   * @optional
   */
  maxErrors?: number;

  /**
   * Show field labels/names before error message
   * @default false
   */
  showFieldLabels?: boolean;

  /**
   * Enable click-to-scroll functionality
   * @default true
   */
  clickToScroll?: boolean;

  /**
   * Compact mode with less spacing
   * @default false
   */
  compact?: boolean;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Callback when error item is clicked
   */
  onErrorClick?: (fieldName: string) => void;
}
```

### Default Behavior

- Shows at top of form
- Displays only error messages (no field labels)
- Click-to-scroll enabled
- Normal spacing (not compact)
- Dotted underline on hover
- Shows all errors (no limit)
- Auto-hides when no errors

## Usage Examples

### Positioned at Top (Default)

```typescript
<FormProvider control={control}>
  <FormErrorSummary />
  {/* Form fields */}
</FormProvider>
```

### Positioned at Bottom

```typescript
<FormProvider control={control}>
  {/* Form fields */}
  <FormErrorSummary position="bottom" />
</FormProvider>
```

### Sticky Position

Perfect for long forms - stays visible while scrolling:

```typescript
<FormProvider control={control}>
  <FormErrorSummary position="sticky" />
  {/* Long form with many fields */}
</FormProvider>
```

### Compact Mode

For dense forms with minimal spacing:

```typescript
<FormErrorSummary compact />
```

**Benefits:**
- Smaller font sizes (12px vs 14px)
- Reduced spacing between errors
- No header text ("Please fix...")
- No navigation arrow icon
- Perfect for sidebars or narrow layouts

### Limit Number of Errors

Show only the first 5 errors:

```typescript
<FormErrorSummary maxErrors={5} />
```

Output:
```
Please fix the following 10 errors:
• Title is required
• Invalid email address
• Phone is required
• Address is required
• City is required
...and 5 more errors
```

### Show Field Labels

By default, only error messages are shown. Enable field labels if needed:

```typescript
<FormErrorSummary showFieldLabels />
```

Output:
```
• Title is required           (default - no field label)
vs.
• Title: Title is required    (with showFieldLabels)
```

### Disable Click-to-Scroll

```typescript
<FormErrorSummary clickToScroll={false} />
```

### Custom Click Handler

```typescript
<FormErrorSummary
  onErrorClick={(fieldName) => {
    console.log(`Error clicked: ${fieldName}`);
    // Custom logic (e.g., analytics, logging)
  }}
/>
```

### With Custom Class

```typescript
<FormErrorSummary className="my-custom-error-summary" />
```

## Visual Enhancements

### Hover Effects

The component includes polished hover interactions:

- **Dotted underline** appears on hover (when clickToScroll is enabled)
- **Subtle background highlight** (light red tint)
- **Icon opacity changes** for visual feedback
- **Smooth transitions** for professional feel

```typescript
<FormErrorSummary />  {/* Hover effects enabled by default */}
```

### Compact vs Normal Mode Comparison

| Feature | Normal Mode | Compact Mode |
|---------|-------------|--------------|
| Font Size | 14px | 12px |
| Line Height | 20px | 16px |
| Gap Between Errors | 4px | 0px |
| Header Text | ✅ Shows | ❌ Hidden |
| Navigation Icon | ✅ Shows | ❌ Hidden |
| Icon Size | 14px | 12px |
| Best For | Standard forms | Sidebars, dense layouts |

### Accessibility Features

- **ARIA Attributes**: `role="alert"` and `aria-live="assertive"`
- **Keyboard Navigation**: Tab through errors, Enter/Space to activate
- **Focus Management**: Automatically focuses field after scroll
- **Screen Reader Support**: Announces error count and messages

## Complete Example

```typescript
import { useForm, Controller } from 'react-hook-form';
import { TextField } from '@fluentui/react/lib/TextField';
import {
  FormProvider,
  FormErrorSummary,
  FormItem,
  FormLabel,
} from 'spfx-toolkit/lib/components/spForm';

interface IFormData {
  title: string;
  email: string;
  phone: string;
  description: string;
}

const ContactForm = () => {
  const { control, handleSubmit, formState } = useForm<IFormData>();

  const onSubmit = (data: IFormData) => {
    console.log('Submitting:', data);
  };

  return (
    <FormProvider control={control} autoShowErrors>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Error Summary at Top */}
        <FormErrorSummary
          position="top"
          clickToScroll
          showFieldLabels
          maxErrors={10}
        />

        {/* Form Fields */}
        <FormItem fieldName="title">
          <FormLabel isRequired>Title</FormLabel>
          <Controller
            name="title"
            control={control}
            rules={{ required: 'Title is required' }}
            render={({ field }) => <TextField {...field} />}
          />
        </FormItem>

        <FormItem fieldName="email">
          <FormLabel isRequired>Email</FormLabel>
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
        </FormItem>

        <FormItem fieldName="phone">
          <FormLabel isRequired>Phone</FormLabel>
          <Controller
            name="phone"
            control={control}
            rules={{
              required: 'Phone is required',
              pattern: {
                value: /^\d{10}$/,
                message: 'Phone must be 10 digits',
              },
            }}
            render={({ field }) => <TextField {...field} />}
          />
        </FormItem>

        <FormItem fieldName="description">
          <FormLabel>Description</FormLabel>
          <Controller
            name="description"
            control={control}
            render={({ field }) => <TextField {...field} multiline rows={4} />}
          />
        </FormItem>

        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};
```

## Integration with FormContext

The FormErrorSummary component requires FormContext to work. Ensure your form is wrapped with FormProvider:

```typescript
// ✅ Correct - Has FormProvider
<FormProvider control={control}>
  <FormErrorSummary />
  {/* Fields */}
</FormProvider>

// ❌ Wrong - No FormProvider
<form>
  <FormErrorSummary /> {/* Won't work - no context */}
  {/* Fields */}
</form>
```

## Styling

### Default Styles

The component uses Fluent UI's MessageBar with error styling:
- Red error icon
- Error background color
- Bold error count
- Click hover effects
- Keyboard focus indicators

### Custom Styling

Override styles with CSS:

```css
/* Custom error summary styles */
.my-custom-error-summary {
  margin: 20px 0;
  border-radius: 8px;
}

/* Sticky position customization */
.spfx-form-error-summary-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Error item hover effect */
.spfx-form-error-summary-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
```

## Accessibility

### ARIA Attributes

The component includes comprehensive ARIA attributes:

```html
<div
  role="alert"           <!-- Announces errors to screen readers -->
  aria-live="assertive"  <!-- High priority announcement -->
>
  <div
    role="button"        <!-- Each error is keyboard accessible -->
    tabIndex={0}         <!-- Keyboard focusable -->
  >
    Error message
  </div>
</div>
```

### Keyboard Navigation

- **Tab**: Navigate between error items
- **Enter/Space**: Click error to scroll to field
- **Escape**: (handled by form level)

### Screen Reader Support

- Announces "Please fix the following X errors" when errors appear
- Each error is announced with field label and message
- Click-to-scroll action is announced

## Advanced Usage

### Conditional Display

Only show error summary after first submit attempt:

```typescript
const [showErrors, setShowErrors] = React.useState(false);

const handleSubmit = () => {
  setShowErrors(true);
  // ...
};

return (
  <FormProvider control={control}>
    {showErrors && <FormErrorSummary />}
    {/* Fields */}
  </FormProvider>
);
```

### Multiple Error Summaries

Show errors in multiple locations:

```typescript
<FormProvider control={control}>
  {/* Top summary - compact */}
  <FormErrorSummary maxErrors={3} />

  {/* Form sections */}
  <Section1 />
  <Section2 />
  <Section3 />

  {/* Bottom summary - complete */}
  <FormErrorSummary position="bottom" />
</FormProvider>
```

### With Custom Error Grouping

Group errors by section:

```typescript
const ErrorSummaryBySection = () => {
  const formContext = useFormContext();

  const personalErrors = formContext?.registry
    .getBySection('personal')
    .filter(f => formContext.hasError(f.name));

  const addressErrors = formContext?.registry
    .getBySection('address')
    .filter(f => formContext.hasError(f.name));

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      {personalErrors.length > 0 && (
        <div>
          <Text variant="large">Personal Information Errors</Text>
          <FormErrorSummary /> {/* Will show all errors */}
        </div>
      )}

      {addressErrors.length > 0 && (
        <div>
          <Text variant="large">Address Errors</Text>
          <FormErrorSummary />
        </div>
      )}
    </Stack>
  );
};
```

### With Analytics

Track which errors users click:

```typescript
<FormErrorSummary
  onErrorClick={(fieldName) => {
    // Send to analytics
    trackEvent('Form Error Clicked', {
      fieldName,
      timestamp: Date.now(),
    });
  }}
/>
```

## Best Practices

### 1. Position Strategically

For short forms:
```typescript
<FormErrorSummary position="top" />
```

For long forms:
```typescript
<FormErrorSummary position="sticky" />
```

For multi-step forms:
```typescript
<FormErrorSummary position="bottom" />
```

### 2. Limit Errors for Large Forms

```typescript
<FormErrorSummary maxErrors={10} />
```

This prevents overwhelming users with too many errors at once.

### 3. Always Enable Click-to-Scroll

```typescript
<FormErrorSummary clickToScroll /> {/* Default: true */}
```

This provides excellent UX for navigating to errors.

### 4. Use with FormProvider

```typescript
<FormProvider control={control} autoShowErrors>
  <FormErrorSummary />
  {/* Fields automatically show errors + summary */}
</FormProvider>
```

### 5. Combine with useScrollToError

```typescript
const { formState, control } = useForm();

useScrollToError(formState, {
  behavior: 'smooth',
  block: 'center',
});

return (
  <FormProvider control={control}>
    <FormErrorSummary />
    {/* Automatic scroll + summary display */}
  </FormProvider>
);
```

## TypeScript Support

Full TypeScript support with proper typing:

```typescript
import { IFormErrorSummaryProps } from 'spfx-toolkit/lib/components/spForm';

const props: IFormErrorSummaryProps = {
  position: 'top',
  maxErrors: 5,
  showFieldLabels: true,
  clickToScroll: true,
  onErrorClick: (fieldName: string) => {
    console.log(fieldName);
  },
};

<FormErrorSummary {...props} />
```

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ IE 11 (with polyfills)

## Performance Considerations

1. **Memoization**: Component is wrapped with React.memo
2. **Conditional Rendering**: Only renders when errors exist
3. **Efficient Updates**: Uses FormContext for error tracking
4. **Scroll Performance**: Uses native scrollIntoView API

## Troubleshooting

### Error Summary Not Showing

**Problem**: FormErrorSummary doesn't appear

**Solutions**:
1. Ensure form has errors:
```typescript
console.log(formState.errors); // Check if errors exist
```

2. Ensure FormProvider is present:
```typescript
<FormProvider control={control}> {/* Required */}
  <FormErrorSummary />
</FormProvider>
```

### Click-to-Scroll Not Working

**Problem**: Clicking errors doesn't scroll to fields

**Solutions**:
1. Ensure fields have `fieldName` prop:
```typescript
<FormItem fieldName="email"> {/* Required for scroll */}
  ...
</FormItem>
```

2. Check if clickToScroll is enabled:
```typescript
<FormErrorSummary clickToScroll /> {/* Should be true */}
```

### Field Labels Not Showing

**Problem**: Shows field names instead of labels

**Solutions**:
1. Ensure FormLabel is present:
```typescript
<FormItem fieldName="email">
  <FormLabel>Email Address</FormLabel> {/* Provides label */}
</FormItem>
```

2. Check showFieldLabels prop:
```typescript
<FormErrorSummary showFieldLabels /> {/* Should be true */}
```

## Related Components

- [FormContext System](../context/README.md) - Required context provider
- [useScrollToError Hook](../hooks/README.md#usescrolltoerror) - Auto-scroll functionality
- [FormItem Component](../FormItem/README.md) - Form field wrapper
- [FormLabel Component](../FormLabel/README.md) - Field label component

## Examples

See the [spForm Usage Guide](../../../../docs/spForm-Usage-Guide.md) for complete examples including:
- Basic form with error summary
- Multi-step form with error tracking
- Complex validation with error grouping
- Custom error handling patterns

## Feedback & Issues

Found a bug or have a suggestion? Please report it at:
https://github.com/your-org/spfx-toolkit/issues
