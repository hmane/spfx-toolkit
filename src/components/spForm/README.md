# SPFx Form Components

A comprehensive, responsive form component library for SharePoint Framework (SPFx) applications that integrates seamlessly with React Hook Form, DevExtreme controls, and PnP SPFx Controls.

## Features

- **Responsive Design**: Automatically adapts from horizontal layout (desktop) to vertical layout (mobile)
- **React Hook Form Integration**: Full TypeScript support with Controller pattern
- **DevExtreme Support**: Pre-built wrappers for TextBox, SelectBox, DateBox, NumberBox, TagBox, Autocomplete, and CheckBox
- **PnP Controls Support**: Integrated PeoplePicker component
- **Fluent UI Integration**: Info tooltips and consistent styling
- **Form Validation**: Built-in error display and validation state management
- **Accessibility**: WCAG 2.1 AA compliant with proper focus management
- **TypeScript**: Full type safety and IntelliSense support

## Installation

```bash
# Install dependencies
npm install react-hook-form devextreme devextreme-react @fluentui/react @pnp/spfx-controls-react

# Copy the spForm folder to your src directory
```

## Quick Start

```tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import {
  FormItem,
  FormLabel,
  FormValue,
  FormDescription,
  FormError,
  DevExtremeTextBox,
  DevExtremeSelectBox,
  PnPPeoplePicker
} from '../spForm';

interface IFormData {
  firstName: string;
  department: string;
  assignee: any[];
}

const MyForm: React.FC = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<IFormData>();

  const onSubmit = (data: IFormData) => {
    console.log('Form submitted:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormItem>
        <FormLabel isRequired>First Name</FormLabel>
        <FormValue>
          <DevExtremeTextBox
            name="firstName"
            control={control}
            placeholder="Enter your first name"
          />
        </FormValue>
        <FormError error={errors.firstName?.message} />
      </FormItem>

      <FormItem>
        <FormLabel
          infoText="Select your department from the list"
        >
          Department
        </FormLabel>
        <FormValue>
          <DevExtremeSelectBox
            name="department"
            control={control}
            items={['IT', 'HR', 'Finance', 'Marketing']}
            placeholder="Select department"
          />
        </FormValue>
        <FormDescription>
          This will determine your access permissions
        </FormDescription>
        <FormError error={errors.department?.message} />
      </FormItem>

      <button type="submit">Submit</button>
    </form>
  );
};
```

## Core Components

### FormItem
The main container component that handles responsive layout.

```tsx
<FormItem className="custom-class">
  {/* Form components go here */}
</FormItem>
```

### FormLabel
Displays field labels with optional required indicator and info tooltips.

```tsx
<FormLabel
  isRequired={true}
  infoText="Additional information about this field"
  infoPosition={DirectionalHint.rightCenter}
>
  Field Label
</FormLabel>
```

**Props:**
- `isRequired?: boolean` - Shows red asterisk
- `infoText?: string` - Simple tooltip text
- `infoContent?: React.ReactNode` - Rich tooltip content (JSX)
- `infoPosition?: DirectionalHint` - Tooltip position
- `className?: string` - Additional CSS classes

### FormValue
Container for form controls and input elements.

```tsx
<FormValue>
  <DevExtremeTextBox name="fieldName" control={control} />
</FormValue>
```

### FormDescription
Optional descriptive text that appears below the form control.

```tsx
<FormDescription>
  This field accepts multiple formats including email and phone
</FormDescription>
```

### FormError
Displays validation errors with optional icons.

```tsx
<FormError
  error={errors.fieldName?.message}
  showIcon={true}
/>
```

**Props:**
- `error?: string | string[]` - Error message(s) to display
- `showIcon?: boolean` - Show error icon
- `className?: string` - Additional CSS classes

## DevExtreme Components

### DevExtremeTextBox
```tsx
<DevExtremeTextBox
  name="email"
  control={control}
  placeholder="Enter email address"
  mode="email"
  stylingMode="outlined"
  maxLength={100}
  onValueChanged={(value) => console.log(value)}
/>
```

### DevExtremeSelectBox
```tsx
<DevExtremeSelectBox
  name="category"
  control={control}
  dataSource={categories}
  displayExpr="name"
  valueExpr="id"
  placeholder="Select category"
  searchEnabled={true}
/>
```

### DevExtremeDateBox
```tsx
<DevExtremeDateBox
  name="startDate"
  control={control}
  type="date"
  placeholder="Select start date"
  min={new Date()}
  displayFormat="MM/dd/yyyy"
/>
```

### DevExtremeNumberBox
```tsx
<DevExtremeNumberBox
  name="amount"
  control={control}
  placeholder="Enter amount"
  min={0}
  max={10000}
  format="currency"
  showSpinButtons={true}
/>
```

### DevExtremeTagBox
```tsx
<DevExtremeTagBox
  name="skills"
  control={control}
  dataSource={skillsList}
  displayExpr="name"
  valueExpr="id"
  placeholder="Select skills"
  searchEnabled={true}
  acceptCustomValue={true}
/>
```

### DevExtremeAutocomplete
```tsx
<DevExtremeAutocomplete
  name="city"
  control={control}
  dataSource={cities}
  placeholder="Type city name"
  minSearchLength={2}
  searchTimeout={300}
/>
```

### DevExtremeCheckBox
```tsx
<DevExtremeCheckBox
  name="agree"
  control={control}
  text="I agree to the terms and conditions"
/>
```

## PnP Components

### PnPPeoplePicker
```tsx
<PnPPeoplePicker
  name="assignees"
  control={control}
  context={this.props.context}
  placeholder="Select people"
  personSelectionLimit={5}
  required={true}
  groupName="My Site Users"
/>
```

## Responsive Behavior

The form automatically adapts to different screen sizes:

**Desktop (768px+):**
```
[Label      ] [Form Control                    ]
              [Description text                ]
              [Error message                   ]
```

**Mobile (<768px):**
```
[Label                          ]
[Form Control                   ]
[Description text               ]
[Error message                  ]
```

## Advanced Usage

### Side-by-Side Fields
```tsx
<div className="form-row">
  <FormItem>
    <FormLabel isRequired>First Name</FormLabel>
    <FormValue>
      <DevExtremeTextBox name="firstName" control={control} />
    </FormValue>
    <FormError error={errors.firstName?.message} />
  </FormItem>

  <FormItem>
    <FormLabel isRequired>Last Name</FormLabel>
    <FormValue>
      <DevExtremeTextBox name="lastName" control={control} />
    </FormValue>
    <FormError error={errors.lastName?.message} />
  </FormItem>
</div>
```

### Rich Info Tooltips
```tsx
<FormLabel
  isRequired={true}
  infoContent={
    <div>
      <strong>Password Requirements:</strong>
      <ul>
        <li>At least 8 characters</li>
        <li>One uppercase letter</li>
        <li>One number</li>
        <li>One special character</li>
      </ul>
    </div>
  }
>
  Password
</FormLabel>
```

### Custom Components
```tsx
<FormItem>
  <FormLabel>Custom Control</FormLabel>
  <FormValue>
    <Controller
      name="customField"
      control={control}
      render={({ field }) => (
        <MyCustomComponent
          value={field.value}
          onChange={field.onChange}
        />
      )}
    />
  </FormValue>
  <FormError error={errors.customField?.message} />
</FormItem>
```

### Fields Without Labels
```tsx
<FormItem>
  <FormValue>
    <MyDataTable
      data={tableData}
      onSelectionChange={handleSelection}
    />
  </FormValue>
  <FormDescription>
    Select multiple rows to perform bulk actions
  </FormDescription>
</FormItem>
```

## CSS Customization

### Custom Form Styles
```scss
// Override default spacing
.my-form {
  .formItem {
    margin-bottom: 24px;
  }

  // Custom label width on desktop
  @media (min-width: 769px) {
    .formLabel {
      min-width: 180px;
    }

    .formDescription,
    .formError {
      margin-left: 196px; // 180px + 16px gap
    }
  }
}
```

### DevExtreme Theme Integration
The components automatically inherit your DevExtreme theme. Load your theme CSS globally:

```tsx
// In your main component or web part
import 'devextreme/dist/css/dx.light.css'; // or your chosen theme
```

## Validation Integration

### React Hook Form Validation
```tsx
const { control, formState: { errors } } = useForm<IFormData>({
  mode: 'onChange',
  defaultValues: {
    email: '',
    age: 0
  }
});

// Built-in validation
<DevExtremeTextBox
  name="email"
  control={control}
  rules={{
    required: 'Email is required',
    pattern: {
      value: /^\S+@\S+$/i,
      message: 'Invalid email format'
    }
  }}
/>

// Custom validation
<DevExtremeNumberBox
  name="age"
  control={control}
  rules={{
    required: 'Age is required',
    min: {
      value: 18,
      message: 'Must be at least 18 years old'
    },
    validate: (value) =>
      value <= 100 || 'Age must be realistic'
  }}
/>
```

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support with proper focus management
- **Screen Readers**: Proper ARIA labels and descriptions
- **High Contrast**: Compatible with high contrast modes
- **Focus Management**: Visible focus indicators for keyboard navigation
- **Error Announcements**: Screen reader announcements for validation errors

## Browser Support

- Internet Explorer 11+
- Edge (all versions)
- Chrome 70+
- Firefox 65+
- Safari 12+

## TypeScript Support

All components include comprehensive TypeScript definitions:

```tsx
import type {
  IFormItemProps,
  IFormLabelProps,
  IDevExtremeTextBoxProps,
  IPnPPeoplePickerProps
} from '../spForm';
```

## Performance Considerations

- **Memoization**: Components use React.memo for optimal re-rendering
- **Debounced Updates**: Form state changes are debounced to prevent excessive re-renders
- **Lazy Loading**: Heavy components can be lazy-loaded
- **Bundle Size**: Tree-shakeable imports to minimize bundle size

## Migration Guide

### From Standard HTML Forms
```tsx
// Before
<div className="form-group">
  <label>Name *</label>
  <input type="text" required />
  <span className="error">Error message</span>
</div>

// After
<FormItem>
  <FormLabel isRequired>Name</FormLabel>
  <FormValue>
    <DevExtremeTextBox name="name" control={control} />
  </FormValue>
  <FormError error={errors.name?.message} />
</FormItem>
```

### From Office UI Fabric Controls
```tsx
// Before
<TextField
  label="Email"
  required
  errorMessage={errors.email}
  onChange={(e, value) => setValue('email', value)}
/>

// After
<FormItem>
  <FormLabel isRequired>Email</FormLabel>
  <FormValue>
    <DevExtremeTextBox name="email" control={control} />
  </FormValue>
  <FormError error={errors.email?.message} />
</FormItem>
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Changelog

### v1.0.0
- Initial release with core form components
- DevExtreme integration
- PnP Controls support
- Responsive design
- TypeScript support
- React Hook Form integration
