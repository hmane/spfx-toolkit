# SPFx Form Components

A comprehensive, responsive form component library for SharePoint Framework (SPFx) applications that integrates seamlessly with React Hook Form, DevExtreme controls, and PnP SPFx Controls.

## Features

- **Responsive Design**: Automatically adapts from horizontal layout (desktop) to vertical layout (mobile)
- **React Hook Form Integration**: Full TypeScript support with optimized validation
- **Zod Validation**: Type-safe schema validation with automatic error handling
- **DevExtreme Support**: Pre-built wrappers for 10+ form controls
- **PnP Controls Support**: Integrated PeoplePicker and TaxonomyPicker components
- **Fluent UI Integration**: Info tooltips and consistent styling
- **Performance Optimized**: React.memo on all components for minimal re-renders
- **Flexible Layouts**: Support for horizontal labels, top labels, and label-free fields
- **TypeScript**: Full type safety with Path-based field names

## Installation

```bash
npm install react-hook-form zod @hookform/resolvers devextreme devextreme-react @fluentui/react @pnp/spfx-controls-react
```

## Quick Start

```tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
  FormError,
  DevExtremeTextBox,
  DevExtremeSelectBox,
} from '../spForm';

// Define validation schema
const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'Must be at least 2 characters'),
  department: z.string().min(1, 'Please select a department'),
});

type FormData = z.infer<typeof formSchema>;

const MyForm: React.FC = () => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      department: '',
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('Form submitted:', data);
  };

  return (
    <FormContainer labelWidth='160px'>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormItem>
          <FormLabel isRequired>First Name</FormLabel>
          <FormValue>
            <DevExtremeTextBox
              name='firstName'
              control={form.control}
              placeholder='Enter your first name'
            />
            <FormError error={form.formState.errors.firstName?.message} showIcon />
          </FormValue>
        </FormItem>

        <FormItem>
          <FormLabel isRequired>Department</FormLabel>
          <FormValue>
            <DevExtremeSelectBox
              name='department'
              control={form.control}
              items={['IT', 'HR', 'Finance']}
              placeholder='Select department'
            />
            <FormError error={form.formState.errors.department?.message} showIcon />
          </FormValue>
        </FormItem>

        <button type='submit'>Submit</button>
      </form>
    </FormContainer>
  );
};
```

## Core Components

### FormContainer

Wraps your form and sets consistent label width for all child FormItems.

```tsx
<FormContainer labelWidth='180px'>{/* Form content */}</FormContainer>
```

**Props:**

- `labelWidth?: string` - Width for all labels (e.g., "140px", "180px")
- `className?: string` - Additional CSS classes
- `style?: React.CSSProperties` - Additional styles

### FormItem

Main container for each form field. Handles responsive layout automatically.

```tsx
<FormItem labelPosition='left'>
  <FormLabel>Field Label</FormLabel>
  <FormValue>{/* Form control */}</FormValue>
</FormItem>
```

**Props:**

- `labelPosition?: 'left' | 'top'` - Label position (default: 'left')
- `labelWidth?: string` - Override container's label width for this item
- `className?: string` - Additional CSS classes
- `style?: React.CSSProperties` - Additional styles

**Label-free fields (for tables/custom content):**

```tsx
<FormItem>
  <FormValue>
    <MyDataTable data={data} />
  </FormValue>
</FormItem>
```

### FormLabel

Displays field labels with optional required indicator and info tooltips.

```tsx
<FormLabel isRequired={true} infoText='Simple tooltip text'>
  Field Label
</FormLabel>;

{
  /* Rich tooltip content */
}
<FormLabel
  isRequired={true}
  infoContent={
    <div>
      <strong>Requirements:</strong>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    </div>
  }
>
  Field Label
</FormLabel>;
```

**Props:**

- `isRequired?: boolean` - Shows red asterisk
- `infoText?: string` - Simple tooltip text
- `infoContent?: React.ReactNode` - Rich tooltip content (JSX)
- `infoPosition?: DirectionalHint` - Tooltip position
- `className?: string` - Additional CSS classes

### FormValue

Container for form controls and their descriptions/errors.

```tsx
<FormValue>
  <DevExtremeTextBox name='fieldName' control={control} />
  <FormDescription>Helper text goes here</FormDescription>
  <FormError error={errors.fieldName?.message} showIcon />
</FormValue>
```

### FormDescription

Optional descriptive text below the form control.

```tsx
<FormDescription>This field accepts email addresses in standard format</FormDescription>
```

### FormError

Displays validation errors with optional icons.

```tsx
<FormError error={form.formState.errors.fieldName?.message} showIcon={true} />
```

**Props:**

- `error?: string | string[]` - Error message(s)
- `showIcon?: boolean` - Show error icon
- `className?: string` - Additional CSS classes

## DevExtreme Components

All DevExtreme components are performance-optimized with React.memo and use proper type-safe field names.

### DevExtremeTextBox

```tsx
<DevExtremeTextBox
  name='email'
  control={form.control}
  placeholder='Enter email'
  mode='email'
  maxLength={100}
  stylingMode='outlined'
  onValueChanged={value => console.log(value)}
/>
```

**Props:**

- `name: Path<T>` - Type-safe field name
- `control: any` - React Hook Form control
- `mode?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url'`
- `placeholder?: string`
- `disabled?: boolean`
- `readOnly?: boolean`
- `maxLength?: number`
- `stylingMode?: 'outlined' | 'underlined' | 'filled'`
- `onValueChanged?: (value: string) => void`
- `onFocusIn?: () => void`
- `onFocusOut?: () => void`

### DevExtremeTextArea

```tsx
<DevExtremeTextArea
  name='description'
  control={form.control}
  placeholder='Enter description'
  minHeight={100}
  autoResizeEnabled={true}
/>
```

### DevExtremeNumberBox

```tsx
<DevExtremeNumberBox
  name='salary'
  control={form.control}
  placeholder='Enter amount'
  format='currency'
  min={0}
  max={1000000}
  showSpinButtons={true}
/>
```

### DevExtremeDateBox

```tsx
<DevExtremeDateBox
  name='startDate'
  control={form.control}
  type='date'
  placeholder='Select date'
  displayFormat='MM/dd/yyyy'
  min={new Date()}
/>
```

### DevExtremeSelectBox

```tsx
<DevExtremeSelectBox
  name='category'
  control={form.control}
  dataSource={categories}
  displayExpr='name'
  valueExpr='id'
  placeholder='Select category'
  searchEnabled={true}
/>
```

### DevExtremeTagBox

```tsx
<DevExtremeTagBox
  name='skills'
  control={form.control}
  dataSource={skillsList}
  placeholder='Select skills'
  searchEnabled={true}
  acceptCustomValue={true}
/>
```

### DevExtremeAutocomplete

```tsx
<DevExtremeAutocomplete
  name='city'
  control={form.control}
  dataSource={cities}
  placeholder='Type city name'
  minSearchLength={2}
/>
```

### DevExtremeCheckBox

```tsx
<DevExtremeCheckBox name='agree' control={form.control} text='I agree to the terms' />
```

### DevExtremeRadioGroup

```tsx
<DevExtremeRadioGroup
  name='status'
  control={form.control}
  items={[
    { text: 'Active', value: 'active' },
    { text: 'Inactive', value: 'inactive' },
  ]}
  layout='horizontal'
/>
```

### DevExtremeSwitch

```tsx
<DevExtremeSwitch name='enabled' control={form.control} />
```

## PnP Components

### PnPPeoplePicker

```tsx
<PnPPeoplePicker
  name='assignees'
  control={form.control}
  context={this.props.context}
  placeholder='Select people'
  personSelectionLimit={5}
  required={true}
/>
```

### PnPModernTaxonomyPicker

```tsx
<PnPModernTaxonomyPicker
  name='tags'
  control={form.control}
  context={this.props.context}
  termSetId='your-termset-id'
  label='Tags'
  panelTitle='Select Tags'
  allowMultipleSelections={true}
/>
```

## Responsive Behavior

**Desktop (768px+):**

```
[Label      ] [Form Control                    ]
              [Description/Error               ]
```

**Mobile (<768px):**

```
[Label                          ]
[Form Control                   ]
[Description/Error              ]
```

## Advanced Usage

### Side-by-Side Fields

```tsx
<div className='form-row'>
  <FormItem>
    <FormLabel isRequired>First Name</FormLabel>
    <FormValue>
      <DevExtremeTextBox name='firstName' control={form.control} />
      <FormError error={form.formState.errors.firstName?.message} />
    </FormValue>
  </FormItem>

  <FormItem>
    <FormLabel isRequired>Last Name</FormLabel>
    <FormValue>
      <DevExtremeTextBox name='lastName' control={form.control} />
      <FormError error={form.formState.errors.lastName?.message} />
    </FormValue>
  </FormItem>
</div>
```

### Top-Positioned Labels

```tsx
<FormItem labelPosition='top'>
  <FormLabel>Description</FormLabel>
  <FormValue>
    <DevExtremeTextArea name='description' control={form.control} />
  </FormValue>
</FormItem>
```

### Fields Without Labels (Custom Content)

```tsx
<FormItem>
  <FormValue>
    <MyCustomTable data={tableData} />
  </FormValue>
</FormItem>
```

### Zod Validation Patterns

**Cross-field validation:**

```tsx
const formSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

**Conditional validation:**

```tsx
const formSchema = z
  .object({
    hasAddress: z.boolean(),
    address: z.string().optional(),
  })
  .refine(data => !data.hasAddress || data.address, {
    message: 'Address is required when "Has Address" is checked',
    path: ['address'],
  });
```

**Transform/coerce:**

```tsx
const formSchema = z.object({
  email: z
    .string()
    .email()
    .transform(val => val.toLowerCase().trim()),
  age: z.coerce.number().min(18),
});
```

## Validation Flow

1. **Initial state**: No validation occurs
2. **On submit**: All fields validate (due to `mode: 'onSubmit'`)
3. **After submit**: Fields revalidate on change (due to `reValidateMode: 'onChange'`)
4. **Error persistence**: Errors stay visible until value becomes valid

```tsx
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  mode: 'onSubmit', // Validate on submit
  reValidateMode: 'onChange', // After submit, revalidate on change
});
```

## Performance Considerations

- ✅ All components use `React.memo` to prevent unnecessary re-renders
- ✅ Simple equality checks for primitives (strings, numbers, booleans)
- ✅ Deep equality checks only for objects/arrays (Date, SelectBox values, TagBox)
- ✅ DevExtreme controls are lazy-loaded by default
- ✅ PnP controls can be lazy-loaded for better initial load time

## Browser Support

- Edge (all versions)
- Chrome 70+
- Firefox 65+
- Safari 12+
- **IE11 is NOT supported**

## TypeScript Support

Full TypeScript support with:

- Type-safe field names via `Path<T>`
- Inferred types from Zod schemas
- Autocomplete for all props
- Proper error types from React Hook Form

## Common Patterns

### Integration with Zustand Store

```tsx
import { create } from 'zustand';
import { sp } from '@pnp/sp';

interface FormStore {
  isSubmitting: boolean;
  submitForm: (data: FormData) => Promise<void>;
}

const useFormStore = create<FormStore>(set => ({
  isSubmitting: false,
  submitForm: async data => {
    set({ isSubmitting: true });
    try {
      await sp.web.lists.getByTitle('MyList').items.add(data);
    } finally {
      set({ isSubmitting: false });
    }
  },
}));

// In component:
const { submitForm, isSubmitting } = useFormStore();
const onSubmit = async (data: FormData) => {
  await submitForm(data);
  form.reset();
};
```

### Custom Loading States

```tsx
<FormItem>
  <FormValue>
    <div style={{ position: 'relative' }}>
      <DevExtremeSelectBox
        name='department'
        control={form.control}
        dataSource={departments}
        disabled={isLoadingDepartments}
      />
      {isLoadingDepartments && (
        <div style={{ position: 'absolute', top: '50%', right: '10px' }}>
          <Spinner size={SpinnerSize.small} />
        </div>
      )}
    </div>
  </FormValue>
</FormItem>
```

## Troubleshooting

**Q: Errors disappear when I focus a field**
A: Use `reValidateMode: 'onChange'` instead of `'onBlur'`

**Q: Field names don't autocomplete**
A: Make sure you're using Zod schema with `z.infer<typeof formSchema>`

**Q: TypeScript errors with control prop**
A: This is expected - we use `control: any` due to React Hook Form generic limitations

**Q: Form doesn't revalidate after submit**
A: Set `reValidateMode: 'onChange'` in useForm options

## License

MIT

## Contributing

Issues and pull requests welcome!
