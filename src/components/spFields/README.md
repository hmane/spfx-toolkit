# SPField Suite

A comprehensive collection of SharePoint field components designed for seamless integration with SPFx projects. These components provide a consistent interface for working with SharePoint field types, with built-in support for react-hook-form validation and DevExtreme UI components.

## Overview

The SPField suite provides field components that mirror SharePoint's native field types, offering:

- **React Hook Form integration** - Native support for validation and form state management
- **DevExtreme components** - Consistent UI with the spForm system
- **Type safety** - Full TypeScript support with SharePoint field type definitions
- **Tree-shakable** - Import only the fields you need
- **SPFx optimized** - Minimal bundle impact with peer dependencies only

## Available Components

### Text Fields

- **[SPTextField](./SPTextField/README.md)** - Single line and multi-line text fields
  - Single line text input
  - Multi-line textarea
  - Rich text editor support
  - Character limits and validation

### Choice Fields

- **[SPChoiceField](./SPChoiceField/README.md)** - Choice and multi-choice fields
  - Radio buttons
  - Dropdown selection
  - Multi-select with checkboxes
  - Custom choice values

### People Fields

- **[SPUserField](./SPUserField/README.md)** - User and group picker fields
  - Single user selection
  - Multi-user selection
  - Group selection
  - Integration with UserPersona component

### Date/Time Fields

- **[SPDateField](./SPDateField/README.md)** - Date and date-time fields
  - Date only
  - Date and time
  - Friendly date display
  - Time zone support

### Number Fields

- **[SPNumberField](./SPNumberField/README.md)** - Numeric input fields
  - Integer and decimal support
  - Min/max validation
  - Currency formatting
  - Percentage display

### Lookup Fields

- **[SPLookupField](./SPLookupField/README.md)** - Lookup and dependent lookup fields
  - Single lookup
  - Multi-value lookup
  - Cascading lookups
  - Custom display fields

### Boolean Fields

- **[SPBooleanField](./SPBooleanField/README.md)** - Yes/No checkbox fields
  - Checkbox
  - Toggle switch
  - Default values

### URL Fields

- **[SPUrlField](./SPUrlField/README.md)** - Hyperlink fields
  - URL input
  - Description text
  - Link validation
  - Open in new window option

### Managed Metadata

- **[SPTaxonomyField](./SPTaxonomyField/README.md)** - Managed metadata term picker
  - Single term selection
  - Multi-term selection
  - Term set binding
  - Custom term stores

## Installation

These components are part of the spfx-toolkit package:

```bash
npm install spfx-toolkit
```

## Basic Usage

### With React Hook Form

```typescript
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { SPTextField } from 'spfx-toolkit/lib/components/spFields/SPTextField';
import { SPChoiceField } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';
import { SPUserField } from 'spfx-toolkit/lib/components/spFields/SPUserField';

interface IFormData {
  title: string;
  status: string;
  assignedTo: number;
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
      />

      <SPChoiceField
        name="status"
        label="Status"
        control={control}
        choices={['Not Started', 'In Progress', 'Completed']}
        displayType="dropdown"
      />

      <SPUserField
        name="assignedTo"
        label="Assigned To"
        control={control}
        allowMultiple={false}
      />

      <button type="submit">Save</button>
    </form>
  );
};
```

### Standalone Usage (Without Forms)

```typescript
import * as React from 'react';
import { SPTextField } from 'spfx-toolkit/lib/components/spFields/SPTextField';

const MyComponent: React.FC = () => {
  const [value, setValue] = React.useState<string>('');

  return (
    <SPTextField
      label="Title"
      value={value}
      onChange={(newValue) => setValue(newValue)}
      placeholder="Enter title..."
    />
  );
};
```

## Common Props

All SPField components share a common set of props for consistency:

### Base Props

```typescript
interface ISPFieldBaseProps<T> {
  // Field metadata
  label?: string;              // Field display label
  description?: string;        // Help text displayed below field
  required?: boolean;          // Mark field as required
  disabled?: boolean;          // Disable field input
  readOnly?: boolean;          // Make field read-only

  // React Hook Form integration
  name?: string;               // Field name for form registration
  control?: Control<any>;      // React Hook Form control
  rules?: RegisterOptions;     // Validation rules

  // Standalone mode
  value?: T;                   // Controlled value
  defaultValue?: T;            // Initial value
  onChange?: (value: T) => void; // Change handler

  // Styling
  className?: string;          // Custom CSS class
  width?: number | string;     // Field width

  // Events
  onBlur?: () => void;         // Blur event handler
  onFocus?: () => void;        // Focus event handler
}
```

### SharePoint Integration Props

Many components include SharePoint-specific props:

```typescript
interface ISPFieldSharePointProps {
  // SharePoint list context
  listId?: string;             // Source list GUID
  fieldName?: string;          // Internal field name
  webUrl?: string;             // Web URL for cross-site fields

  // Display options
  showFieldIcon?: boolean;     // Show SharePoint field type icon
  renderDisplayMode?: boolean; // Render in display-only mode
}
```

## Validation

All SPField components support validation through react-hook-form:

```typescript
<SPTextField
  name="title"
  label="Title"
  control={control}
  rules={{
    required: 'Title is required',
    minLength: { value: 3, message: 'Minimum 3 characters' },
    maxLength: { value: 255, message: 'Maximum 255 characters' },
    pattern: { value: /^[a-zA-Z0-9\s]+$/, message: 'Alphanumeric only' }
  }}
/>
```

### Custom Validation

```typescript
<SPNumberField
  name="age"
  label="Age"
  control={control}
  rules={{
    validate: {
      positive: (value) => value > 0 || 'Must be positive',
      range: (value) => (value >= 18 && value <= 65) || 'Must be between 18 and 65'
    }
  }}
/>
```

## Theming

SPField components inherit theming from the parent SPFx application using Fluent UI theme tokens:

```typescript
import { ThemeProvider } from '@fluentui/react/lib/Theme';

<ThemeProvider>
  <SPTextField label="Themed Field" />
</ThemeProvider>
```

## Accessibility

All SPField components follow WCAG 2.1 AA guidelines:

- Proper ARIA labels and descriptions
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- High contrast mode support

## Performance

SPField components are optimized for minimal bundle impact:

- **Tree-shakable** - Import only needed components
- **Lazy loading** - Heavy dependencies loaded on demand
- **Memoization** - Prevent unnecessary re-renders
- **Efficient validation** - Debounced validation for text inputs

### Bundle Sizes

| Component        | Estimated Bundle Size |
|------------------|----------------------|
| SPTextField      | ~15KB                |
| SPChoiceField    | ~20KB                |
| SPUserField      | ~35KB                |
| SPDateField      | ~45KB                |
| SPNumberField    | ~18KB                |
| SPLookupField    | ~40KB                |
| SPBooleanField   | ~10KB                |
| SPUrlField       | ~15KB                |
| SPTaxonomyField  | ~50KB                |

## Integration with spForm

SPField components are designed to work seamlessly with the existing spForm system:

```typescript
import { spForm } from 'spfx-toolkit/lib/components/spForm';
import { SPTextField } from 'spfx-toolkit/lib/components/spFields/SPTextField';
import { SPChoiceField } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';

const MyForm: React.FC = () => {
  return (
    <spForm.Form listName="Tasks" itemId={123}>
      <SPTextField name="Title" label="Task Title" />
      <SPChoiceField name="Status" label="Status" />
      <spForm.FormActions />
    </spForm.Form>
  );
};
```

## Best Practices

### 1. Use Tree-Shakable Imports

```typescript
// ✅ Good - Import specific fields
import { SPTextField } from 'spfx-toolkit/lib/components/spFields/SPTextField';
import { SPChoiceField } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';

// ❌ Avoid - Imports all fields
import { SPTextField, SPChoiceField } from 'spfx-toolkit/lib/components/spFields';
```

### 2. Leverage React Hook Form

```typescript
// ✅ Good - Use react-hook-form for complex forms
const { control, handleSubmit } = useForm();

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <SPTextField name="title" control={control} />
  </form>
);
```

### 3. Initialize SPContext

```typescript
// ✅ Good - Initialize context before using fields with SharePoint integration
await SPContext.smart(this.context, 'MyWebPart');

// Then use fields that need SharePoint data
<SPUserField name="assignedTo" control={control} />
```

### 4. Memoize Callbacks

```typescript
// ✅ Good - Memoize event handlers
const handleChange = React.useCallback((value: string) => {
  console.log('Changed:', value);
}, []);

<SPTextField onChange={handleChange} />
```

## Troubleshooting

### Field Not Registering with Form

**Issue**: Field value not captured by react-hook-form

**Solution**: Ensure `name` and `control` props are provided:

```typescript
<SPTextField
  name="title"  // ✅ Required for form registration
  control={control}  // ✅ Required for form integration
/>
```

### Validation Not Working

**Issue**: Validation rules not triggering

**Solution**: Pass validation rules through the `rules` prop:

```typescript
<SPTextField
  name="title"
  control={control}
  rules={{ required: 'This field is required' }}  // ✅ Use rules prop
/>
```

### DevExtreme Styles Missing

**Issue**: Fields appear unstyled

**Solution**: Ensure DevExtreme CSS is imported in your SPFx project:

```typescript
import 'devextreme/dist/css/dx.common.css';
import 'devextreme/dist/css/dx.light.css';
```

### User Field Not Loading Users

**Issue**: SPUserField shows no results

**Solution**: Initialize SPContext before rendering:

```typescript
await SPContext.smart(this.context, 'MyWebPart');
```

## Examples

See individual component README files for detailed examples:

- [SPTextField Examples](./SPTextField/README.md#examples)
- [SPChoiceField Examples](./SPChoiceField/README.md#examples)
- [SPUserField Examples](./SPUserField/README.md#examples)
- [SPDateField Examples](./SPDateField/README.md#examples)

## Contributing

When adding new SPField components:

1. Follow the established component structure
2. Include comprehensive TypeScript types
3. Support both form-integrated and standalone modes
4. Provide detailed README with examples
5. Ensure tree-shakable exports
6. Add accessibility features (ARIA, keyboard navigation)
7. Include error handling and validation

## API Reference

### Component Structure

Each SPField component follows this structure:

```
SPFieldName/
├── SPFieldName.tsx           # Main component
├── SPFieldName.types.ts      # TypeScript interfaces
├── index.ts                  # Exports
└── README.md                 # Documentation
```

### Type Definitions

```typescript
// Base field props
export interface ISPFieldBaseProps<T> { /* ... */ }

// SharePoint field props
export interface ISPFieldSharePointProps { /* ... */ }

// Component-specific props
export interface ISPTextFieldProps extends ISPFieldBaseProps<string> {
  multiline?: boolean;
  maxLength?: number;
  // ... component-specific props
}
```

## License

Part of the spfx-toolkit package. See main LICENSE file.

## Support

For issues, questions, or contributions, please refer to the main spfx-toolkit documentation.
