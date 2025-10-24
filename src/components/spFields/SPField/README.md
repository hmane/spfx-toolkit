# SPField - Smart SharePoint Field Component

The **SPField** component is an intelligent field component that automatically detects SharePoint field types and renders the appropriate field control. It eliminates the need to manually determine and configure field types, making form development faster and more maintainable.

## Features

- **Auto-detection**: Automatically loads field metadata from SharePoint and determines the field type
- **Manual mode**: Supports explicit field type specification when needed
- **All field types**: Supports all common SharePoint field types (Text, Choice, User, Date, Number, etc.)
- **Seamless integration**: Works with react-hook-form for validation
- **Intelligent caching**: Uses SPContext caching strategies for optimal performance
- **Error handling**: Built-in loading states, error messages, and fallbacks
- **Type-safe**: Full TypeScript support with proper type inference

## Supported Field Types

The SPField component automatically detects and renders these SharePoint field types:

| SharePoint Field Type | Rendered Component | Description |
|----------------------|-------------------|-------------|
| Text | SPTextField | Single-line text input |
| Note | SPTextField | Multi-line text area |
| Choice | SPChoiceField | Dropdown/radio selection |
| MultiChoice | SPChoiceField | Multi-select choices |
| Number | SPNumberField | Numeric input |
| Currency | SPNumberField | Currency formatted input |
| DateTime | SPDateField | Date/time picker |
| Boolean | SPBooleanField | Checkbox/toggle |
| User | SPUserField | People picker (single) |
| UserMulti | SPUserField | People picker (multiple) |
| Lookup | SPLookupField | Lookup to another list |
| LookupMulti | SPLookupField | Multi-value lookup |
| URL | SPUrlField | Hyperlink with description |
| TaxonomyFieldType | SPTaxonomyField | Managed metadata (single) |
| TaxonomyFieldTypeMulti | SPTaxonomyField | Managed metadata (multiple) |

## Installation

```typescript
import { SPField } from 'spfx-toolkit/lib/components/spFields/SPField';
import type { ISPFieldProps, ISmartFieldConfig, IManualFieldConfig } from 'spfx-toolkit/lib/components/spFields/SPField';
```

## Usage

### Smart Mode (Auto-detection from SharePoint)

The recommended approach - loads field metadata from SharePoint and automatically determines the field type:

```typescript
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { SPField } from 'spfx-toolkit/lib/components/spFields/SPField';

interface IFormData {
  title: string;
  status: string;
  assignedTo: any;
  dueDate: Date;
}

export const MyForm: React.FC = () => {
  const { control, handleSubmit } = useForm<IFormData>();

  const onSubmit = (data: IFormData) => {
    console.log('Form data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Auto-detects as Text field */}
      <SPField
        name="title"
        control={control}
        config={{
          listNameOrId: 'Tasks',
          fieldInternalName: 'Title'
        }}
      />

      {/* Auto-detects as Choice field */}
      <SPField
        name="status"
        control={control}
        config={{
          listNameOrId: 'Tasks',
          fieldInternalName: 'Status'
        }}
      />

      {/* Auto-detects as User field */}
      <SPField
        name="assignedTo"
        control={control}
        config={{
          listNameOrId: 'Tasks',
          fieldInternalName: 'AssignedTo'
        }}
      />

      {/* Auto-detects as DateTime field */}
      <SPField
        name="dueDate"
        control={control}
        config={{
          listNameOrId: 'Tasks',
          fieldInternalName: 'DueDate'
        }}
      />

      <button type="submit">Submit</button>
    </form>
  );
};
```

### Manual Mode (Explicit Field Type)

Use when you don't want to load from SharePoint or need custom field configuration:

```typescript
import { SPField } from 'spfx-toolkit/lib/components/spFields/SPField';
import { SPFieldType } from 'spfx-toolkit/lib/components/spFields';

export const ManualFieldExample: React.FC = () => {
  const { control } = useForm();

  return (
    <>
      {/* Manually specify as Choice field */}
      <SPField
        name="priority"
        control={control}
        config={{
          fieldType: SPFieldType.Choice,
          displayName: 'Priority',
          description: 'Select task priority',
          required: true,
          fieldConfig: {
            choices: ['High', 'Medium', 'Low']
          }
        }}
      />

      {/* Manually specify as Number field */}
      <SPField
        name="estimate"
        control={control}
        config={{
          fieldType: SPFieldType.Number,
          displayName: 'Estimate (hours)',
          fieldConfig: {
            minValue: 0,
            maxValue: 100,
            decimals: 2
          }
        }}
      />

      {/* Manually specify as User field */}
      <SPField
        name="reviewer"
        control={control}
        config={{
          fieldType: SPFieldType.User,
          displayName: 'Reviewer',
          required: false,
          fieldConfig: {
            allowGroups: false
          }
        }}
      />
    </>
  );
};
```

### Smart Mode with Caching Control

Control how field metadata is cached:

```typescript
<SPField
  name="title"
  control={control}
  config={{
    listNameOrId: 'Tasks',
    fieldInternalName: 'Title',
    useCache: false  // Disable caching for always-fresh metadata
  }}
/>
```

### Standalone Mode (Without react-hook-form)

Use SPField without form integration:

```typescript
export const StandaloneExample: React.FC = () => {
  const [value, setValue] = React.useState<any>();

  return (
    <SPField
      config={{
        listNameOrId: 'Tasks',
        fieldInternalName: 'Status'
      }}
      value={value}
      onChange={(newValue) => setValue(newValue)}
      label="Status"
    />
  );
};
```

### Overriding Auto-detected Properties

You can override auto-detected properties using the standard props:

```typescript
<SPField
  name="title"
  control={control}
  config={{
    listNameOrId: 'Tasks',
    fieldInternalName: 'Title'
  }}
  // Override the auto-detected label
  label="Custom Task Title"

  // Override the auto-detected placeholder
  placeholder="Enter a descriptive title..."

  // Add custom validation (in addition to auto-detected 'required')
  rules={{
    minLength: { value: 10, message: 'Title must be at least 10 characters' }
  }}
/>
```

## Props Reference

### ISPFieldProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `ISmartFieldConfig \| IManualFieldConfig` | Yes | Field configuration (smart or manual mode) |
| `name` | `string` | No* | Field name for form registration (*required with `control`) |
| `control` | `Control<any>` | No | React Hook Form control object |
| `rules` | `RegisterOptions` | No | Validation rules for react-hook-form |
| `value` | `any` | No | Controlled value (for standalone usage) |
| `defaultValue` | `any` | No | Initial value |
| `onChange` | `(value: any) => void` | No | Change handler for standalone mode |
| `onBlur` | `() => void` | No | Blur event handler |
| `onFocus` | `() => void` | No | Focus event handler |
| `className` | `string` | No | Custom CSS class name |
| `width` | `number \| string` | No | Field width |
| `disabled` | `boolean` | No | Disable field input |
| `readOnly` | `boolean` | No | Make field read-only |
| `label` | `string` | No | Override auto-detected label |
| `placeholder` | `string` | No | Override placeholder |
| `errorMessage` | `string` | No | Custom error message |

### ISmartFieldConfig (Auto-detection Mode)

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `listNameOrId` | `string` | Yes | SharePoint list title or GUID |
| `fieldInternalName` | `string` | Yes | Field internal name in SharePoint |
| `webUrl` | `string` | No | Web URL for cross-site fields (not fully supported) |
| `useCache` | `boolean` | No | Use cached field metadata (default: `true`) |

### IManualFieldConfig (Manual Mode)

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `fieldType` | `SPFieldType` | Yes | Explicit field type |
| `displayName` | `string` | No | Field display name/label |
| `description` | `string` | No | Field description/help text |
| `required` | `boolean` | No | Whether field is required |
| `fieldConfig` | `any` | No | Field-specific configuration (varies by type) |

### Field-Specific Configurations

Different field types accept different configurations in `fieldConfig`:

#### Choice/MultiChoice
```typescript
fieldConfig: {
  choices: string[];           // Available choices
  fillInChoice?: boolean;      // Allow "Other" option
}
```

#### Number/Currency
```typescript
fieldConfig: {
  minValue?: number;           // Minimum value
  maxValue?: number;           // Maximum value
  decimals?: number;           // Decimal places
}
```

#### User/UserMulti
```typescript
fieldConfig: {
  allowGroups?: boolean;       // Allow group selection
}
```

#### Lookup/LookupMulti
```typescript
fieldConfig: {
  lookupList: string;          // Target list ID
  lookupField: string;         // Display field name
}
```

#### Taxonomy
```typescript
fieldConfig: {
  termSetId: string;           // Term set GUID
}
```

## How It Works

### Auto-detection Process

1. **Metadata Loading**: When using smart mode, SPField loads the field definition from SharePoint using PnP/SP
2. **Type Mapping**: The SharePoint `FieldTypeKind` (numeric) and `TypeAsString` are mapped to the appropriate `SPFieldType` enum
3. **Config Extraction**: Field-specific metadata (choices, min/max values, lookup lists, etc.) is extracted
4. **Component Rendering**: The appropriate field component is rendered with the extracted configuration

### SharePoint FieldTypeKind Mapping

| FieldTypeKind | TypeAsString | Mapped SPFieldType |
|---------------|--------------|-------------------|
| 2 | - | Text |
| 3 | - | Note |
| 6 | - | Choice |
| 15 | - | MultiChoice |
| 9 | - | Number |
| 10 | - | Currency |
| 4 | - | DateTime |
| 8 | - | Boolean |
| 20 | - | User |
| 20 | UserMulti | UserMulti |
| 7 | - | Lookup |
| 7 | LookupMulti | LookupMulti |
| 11 | - | URL |
| - | TaxonomyFieldType | TaxonomyFieldType |
| - | TaxonomyFieldTypeMulti | TaxonomyFieldTypeMulti |

## Performance Considerations

### Caching Strategy

By default, SPField uses `SPContext.spCached` for field metadata loading, which provides memory caching:

```typescript
// Uses cache (default, faster)
<SPField
  config={{
    listNameOrId: 'Tasks',
    fieldInternalName: 'Status',
    useCache: true  // default
  }}
/>

// Always fetches fresh (slower)
<SPField
  config={{
    listNameOrId: 'Tasks',
    fieldInternalName: 'Status',
    useCache: false  // bypass cache
  }}
/>
```

### Loading States

SPField handles loading gracefully:
- Shows a spinner while loading field metadata
- Displays error messages if loading fails
- Renders the field once metadata is available

### Bundle Size

SPField imports all field components, so it has a larger bundle size. If you only need specific field types, consider using the individual field components directly instead.

## Best Practices

### 1. Use Smart Mode for SharePoint Lists

Always prefer smart mode when working with SharePoint lists:

```typescript
// ✅ GOOD: Auto-detects field type and configuration
<SPField
  name="status"
  control={control}
  config={{
    listNameOrId: 'Tasks',
    fieldInternalName: 'Status'
  }}
/>

// ❌ AVOID: Manual configuration when SharePoint metadata is available
<SPField
  name="status"
  control={control}
  config={{
    fieldType: SPFieldType.Choice,
    displayName: 'Status',
    fieldConfig: { choices: ['Active', 'Completed'] }
  }}
/>
```

### 2. Use Manual Mode for Custom Fields

Use manual mode when:
- Creating forms not backed by SharePoint lists
- Building dynamic forms with runtime-determined fields
- Prototyping without SharePoint access

### 3. Leverage Validation Rules

Combine auto-detected required validation with custom rules:

```typescript
<SPField
  name="title"
  control={control}
  config={{
    listNameOrId: 'Tasks',
    fieldInternalName: 'Title'
  }}
  rules={{
    // Auto-detected 'required' + custom validation
    minLength: { value: 5, message: 'Minimum 5 characters' },
    pattern: { value: /^[A-Z]/, message: 'Must start with uppercase' }
  }}
/>
```

### 4. Error Handling

Handle loading errors gracefully:

```typescript
// SPField automatically shows error messages
// You can provide fallback UI or retry logic
<SPField
  config={{
    listNameOrId: 'NonExistentList',  // Will show error
    fieldInternalName: 'Title'
  }}
/>
```

## Troubleshooting

### Field Not Loading

**Problem**: Spinner shows indefinitely or error appears

**Solutions**:
- Verify the list name/ID is correct
- Check that the field internal name matches SharePoint
- Ensure SPContext is initialized before rendering
- Check browser console for detailed error messages
- Try `useCache: false` to bypass caching issues

### Wrong Field Type Rendered

**Problem**: Auto-detection renders incorrect field type

**Solutions**:
- Check the SharePoint field type in list settings
- Verify the field isn't a custom field type
- Use manual mode to explicitly specify the field type

### Required Validation Not Working

**Problem**: Required fields allow empty submission

**Solutions**:
- Ensure `control` and `name` props are provided
- Check that react-hook-form is properly configured
- Verify the field is marked as required in SharePoint (for smart mode)

### Cross-Site Fields Not Working

**Problem**: Loading fields from other sites fails

**Note**: Cross-site field loading is not fully supported in the current implementation. Use fields from the current site web only.

## Examples

### Complete Form with Mixed Auto-detection

```typescript
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { SPField } from 'spfx-toolkit/lib/components/spFields/SPField';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { Stack } from '@fluentui/react/lib/Stack';

interface ITaskForm {
  title: string;
  description: string;
  priority: string;
  assignedTo: any;
  dueDate: Date;
  percentComplete: number;
  isActive: boolean;
}

export const TaskFormExample: React.FC = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<ITaskForm>();

  const onSubmit = async (data: ITaskForm) => {
    console.log('Submitting task:', data);
    // Save to SharePoint...
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack tokens={{ childrenGap: 16 }}>
        {/* All fields auto-detect from SharePoint */}
        <SPField
          name="title"
          control={control}
          config={{
            listNameOrId: 'Tasks',
            fieldInternalName: 'Title'
          }}
        />

        <SPField
          name="description"
          control={control}
          config={{
            listNameOrId: 'Tasks',
            fieldInternalName: 'Description'
          }}
        />

        <SPField
          name="priority"
          control={control}
          config={{
            listNameOrId: 'Tasks',
            fieldInternalName: 'Priority'
          }}
        />

        <SPField
          name="assignedTo"
          control={control}
          config={{
            listNameOrId: 'Tasks',
            fieldInternalName: 'AssignedTo'
          }}
        />

        <SPField
          name="dueDate"
          control={control}
          config={{
            listNameOrId: 'Tasks',
            fieldInternalName: 'DueDate'
          }}
        />

        <SPField
          name="percentComplete"
          control={control}
          config={{
            listNameOrId: 'Tasks',
            fieldInternalName: 'PercentComplete'
          }}
        />

        <SPField
          name="isActive"
          control={control}
          config={{
            listNameOrId: 'Tasks',
            fieldInternalName: 'IsActive'
          }}
        />

        <PrimaryButton type="submit">Create Task</PrimaryButton>
      </Stack>
    </form>
  );
};
```

## Related Components

- [SPTextField](../SPTextField/README.md) - Text and multi-line input
- [SPChoiceField](../SPChoiceField/README.md) - Choice and multi-choice selection
- [SPUserField](../SPUserField/README.md) - People and group picker
- [SPDateField](../SPDateField/README.md) - Date and DateTime picker
- [SPNumberField](../SPNumberField/README.md) - Numeric input with formatting
- [SPBooleanField](../SPBooleanField/README.md) - Yes/No checkbox/toggle
- [SPUrlField](../SPUrlField/README.md) - Hyperlink with description
- [SPLookupField](../SPLookupField/README.md) - Lookup to other lists
- [SPTaxonomyField](../SPTaxonomyField/README.md) - Managed metadata terms

## License

Part of the SPFx Toolkit. See main repository for license information.
