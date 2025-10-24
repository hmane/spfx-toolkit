# SPTextField

A SharePoint text field component that provides single-line and multi-line text input with full react-hook-form integration and DevExtreme UI components.

## Features

- **Multiple display modes** - Single-line, multi-line, and rich text support
- **React Hook Form integration** - Seamless validation and form state management
- **Character counting** - Track character limits visually
- **Input masking** - Format input with custom masks
- **Debouncing** - Optimize performance with configurable debounce delay
- **Validation** - Built-in pattern, length, and custom validation
- **Accessibility** - Full ARIA support and keyboard navigation
- **Icons** - Prefix and suffix icons support

## Installation

```bash
npm install spfx-toolkit
```

## Basic Usage

### With React Hook Form

```typescript
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { SPTextField } from 'spfx-toolkit/lib/components/spFields/SPTextField';

interface IFormData {
  title: string;
  description: string;
}

const MyForm: React.FC = () => {
  const { control, handleSubmit } = useForm<IFormData>();

  const onSubmit = (data: IFormData) => {
    console.log('Form data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <SPTextField
        name="title"
        label="Title"
        control={control}
        rules={{ required: 'Title is required' }}
        maxLength={255}
        showCharacterCount
      />

      <SPTextField
        name="description"
        label="Description"
        control={control}
        mode={SPTextFieldMode.MultiLine}
        rows={6}
        maxLength={1000}
        showCharacterCount
      />

      <button type="submit">Save</button>
    </form>
  );
};
```

### Standalone Usage

```typescript
import * as React from 'react';
import { SPTextField } from 'spfx-toolkit/lib/components/spFields/SPTextField';

const MyComponent: React.FC = () => {
  const [title, setTitle] = React.useState<string>('');

  return (
    <SPTextField
      label="Title"
      value={title}
      onChange={(value) => setTitle(value)}
      placeholder="Enter title..."
      maxLength={255}
      showCharacterCount
    />
  );
};
```

## Props

### Base Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Field display label |
| `description` | `string` | - | Help text below field |
| `required` | `boolean` | `false` | Mark field as required |
| `disabled` | `boolean` | `false` | Disable field input |
| `readOnly` | `boolean` | `false` | Make field read-only |
| `placeholder` | `string` | - | Placeholder text |
| `errorMessage` | `string` | - | Custom error message |
| `className` | `string` | - | Custom CSS class |
| `width` | `number \| string` | `'100%'` | Field width |

### Form Integration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Field name (required for form) |
| `control` | `Control` | - | React Hook Form control |
| `rules` | `RegisterOptions` | - | Validation rules |

### Standalone Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Controlled value |
| `defaultValue` | `string` | - | Initial value |
| `onChange` | `(value: string) => void` | - | Change handler |
| `onBlur` | `() => void` | - | Blur handler |
| `onFocus` | `() => void` | - | Focus handler |

### TextField Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `SPTextFieldMode` | `SingleLine` | Display mode (SingleLine, MultiLine, RichText) |
| `maxLength` | `number` | - | Maximum character length |
| `minLength` | `number` | - | Minimum character length |
| `rows` | `number` | `4` | Number of rows (multiline mode) |
| `showCharacterCount` | `boolean` | `false` | Show character counter |
| `pattern` | `RegExp` | - | Validation pattern |
| `patternMessage` | `string` | - | Pattern validation message |
| `autoFocus` | `boolean` | `false` | Auto-focus on mount |
| `inputType` | `string` | `'text'` | Input type (text, email, tel, url, etc.) |
| `spellCheck` | `boolean` | `true` | Enable spell check |
| `autoComplete` | `string` | - | Auto-complete attribute |
| `prefixIcon` | `string` | - | DevExtreme icon name for prefix |
| `suffixIcon` | `string` | - | DevExtreme icon name for suffix |
| `showClearButton` | `boolean` | `false` | Show clear button |
| `debounceDelay` | `number` | `300` | Debounce delay (ms) |
| `inputClassName` | `string` | - | CSS class for input element |
| `mask` | `string` | - | Input mask (DevExtreme format) |
| `maskChar` | `string` | `'_'` | Mask placeholder character |
| `stylingMode` | `'outlined' \| 'underlined' \| 'filled'` | `'outlined'` | Styling mode |

## Display Modes

### Single Line (Default)

```typescript
<SPTextField
  name="title"
  label="Title"
  control={control}
  placeholder="Enter title..."
/>
```

### Multi-Line

```typescript
import { SPTextFieldMode } from 'spfx-toolkit/lib/components/spFields/SPTextField';

<SPTextField
  name="description"
  label="Description"
  control={control}
  mode={SPTextFieldMode.MultiLine}
  rows={6}
  placeholder="Enter description..."
/>
```

### Rich Text (Future Enhancement)

```typescript
<SPTextField
  name="content"
  label="Content"
  control={control}
  mode={SPTextFieldMode.RichText}
/>
```

## Validation Examples

### Required Field

```typescript
<SPTextField
  name="title"
  label="Title"
  control={control}
  required
  rules={{ required: 'Title is required' }}
/>
```

### Length Validation

```typescript
<SPTextField
  name="username"
  label="Username"
  control={control}
  minLength={3}
  maxLength={20}
  showCharacterCount
/>
```

### Pattern Validation

```typescript
<SPTextField
  name="email"
  label="Email"
  control={control}
  inputType="email"
  pattern={/^[^\s@]+@[^\s@]+\.[^\s@]+$/}
  patternMessage="Please enter a valid email address"
/>
```

### Custom Validation

```typescript
<SPTextField
  name="username"
  label="Username"
  control={control}
  rules={{
    validate: {
      noSpaces: (value) => !value.includes(' ') || 'Username cannot contain spaces',
      alphanumeric: (value) => /^[a-zA-Z0-9]+$/.test(value) || 'Only alphanumeric characters allowed'
    }
  }}
/>
```

## Input Types

### Email

```typescript
<SPTextField
  name="email"
  label="Email"
  control={control}
  inputType="email"
  autoComplete="email"
/>
```

### Phone Number

```typescript
<SPTextField
  name="phone"
  label="Phone"
  control={control}
  inputType="tel"
  mask="+1 (000) 000-0000"
/>
```

### URL

```typescript
<SPTextField
  name="website"
  label="Website"
  control={control}
  inputType="url"
  placeholder="https://..."
/>
```

### Password

```typescript
<SPTextField
  name="password"
  label="Password"
  control={control}
  inputType="password"
  autoComplete="current-password"
/>
```

## Icons and Styling

### With Icons

```typescript
<SPTextField
  name="search"
  label="Search"
  control={control}
  prefixIcon="search"
  suffixIcon="clear"
  showClearButton
/>
```

### Styling Modes

```typescript
// Outlined (default)
<SPTextField stylingMode="outlined" />

// Underlined
<SPTextField stylingMode="underlined" />

// Filled
<SPTextField stylingMode="filled" />
```

## Input Masking

### Phone Number Mask

```typescript
<SPTextField
  name="phone"
  label="Phone Number"
  control={control}
  mask="+1 (000) 000-0000"
  placeholder="+1 (___) ___-____"
/>
```

### Social Security Number

```typescript
<SPTextField
  name="ssn"
  label="SSN"
  control={control}
  mask="000-00-0000"
  maskChar="_"
/>
```

### Credit Card

```typescript
<SPTextField
  name="creditCard"
  label="Credit Card"
  control={control}
  mask="0000 0000 0000 0000"
/>
```

## Character Counting

```typescript
<SPTextField
  name="bio"
  label="Bio"
  control={control}
  mode={SPTextFieldMode.MultiLine}
  maxLength={500}
  showCharacterCount
  placeholder="Tell us about yourself..."
/>
```

## Debouncing

Optimize performance for expensive operations (like API calls) with debouncing:

```typescript
const MyComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState<string>('');

  React.useEffect(() => {
    // This will only fire 500ms after user stops typing
    if (searchTerm) {
      performSearch(searchTerm);
    }
  }, [searchTerm]);

  return (
    <SPTextField
      label="Search"
      value={searchTerm}
      onChange={setSearchTerm}
      debounceDelay={500}
      prefixIcon="search"
    />
  );
};
```

## Advanced Examples

### Multi-Field Validation

```typescript
const MyForm: React.FC = () => {
  const { control, watch } = useForm();
  const password = watch('password');

  return (
    <>
      <SPTextField
        name="password"
        label="Password"
        control={control}
        inputType="password"
        rules={{
          required: 'Password is required',
          minLength: { value: 8, message: 'Minimum 8 characters' }
        }}
      />

      <SPTextField
        name="confirmPassword"
        label="Confirm Password"
        control={control}
        inputType="password"
        rules={{
          validate: (value) => value === password || 'Passwords do not match'
        }}
      />
    </>
  );
};
```

### Conditional Rendering

```typescript
const MyForm: React.FC = () => {
  const { control, watch } = useForm();
  const showAdditionalField = watch('needsAdditionalInfo');

  return (
    <>
      <SPTextField
        name="name"
        label="Name"
        control={control}
      />

      {showAdditionalField && (
        <SPTextField
          name="additionalInfo"
          label="Additional Information"
          control={control}
          mode={SPTextFieldMode.MultiLine}
        />
      )}
    </>
  );
};
```

## Accessibility

SPTextField includes comprehensive accessibility features:

- **ARIA labels** - Proper labeling for screen readers
- **Keyboard navigation** - Full keyboard support
- **Focus management** - Visible focus indicators
- **Error announcements** - Screen reader error messages
- **Required field indicators** - Visual and semantic required markers

```typescript
<SPTextField
  name="title"
  label="Document Title"
  control={control}
  required
  description="Enter a descriptive title for your document"
  aria-describedby="title-help-text"
/>
```

## Styling

### Custom Width

```typescript
<SPTextField width="300px" />
<SPTextField width="50%" />
<SPTextField width={400} />
```

### Custom CSS Class

```typescript
<SPTextField
  className="my-custom-field"
  inputClassName="my-custom-input"
/>
```

## TypeScript

### Type Definitions

```typescript
import { ISPTextFieldProps, SPTextFieldMode } from 'spfx-toolkit/lib/components/spFields/SPTextField';

const fieldProps: ISPTextFieldProps = {
  name: 'title',
  label: 'Title',
  control: control,
  mode: SPTextFieldMode.SingleLine,
  maxLength: 255,
};
```

## Performance Tips

1. **Use debouncing** for expensive onChange operations
2. **Memoize callbacks** to prevent unnecessary re-renders
3. **Control character counting** - Only enable when needed
4. **Optimize validation** - Use built-in rules over custom validators when possible

## Browser Support

SPTextField supports all modern browsers through DevExtreme:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Related Components

- [SPChoiceField](../SPChoiceField/README.md) - Choice and multi-choice fields
- [SPNumberField](../SPNumberField/README.md) - Numeric input fields
- [SPDateField](../SPDateField/README.md) - Date and time fields
- [SPUrlField](../SPUrlField/README.md) - Hyperlink fields

## API Reference

See [type definitions](./SPTextField.types.ts) for complete API documentation.

## License

Part of the spfx-toolkit package.
