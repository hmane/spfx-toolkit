# SPChoiceField Component <¯

A comprehensive choice field component that mirrors SharePoint's Choice and Multi-Choice fields. Supports dropdown, radio buttons, checkboxes, tag box modes, and "Other" option functionality with automatic SharePoint field metadata loading.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props](#props)
- [Display Types](#display-types)
- [Data Sources](#data-sources)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- <¯ **Multiple Display Types** - Dropdown, radio buttons, checkboxes, tag box
- =Ë **SharePoint Integration** - Auto-load choices from SharePoint fields
- ( **"Other" Option** - Fill-in choice with custom value support
- <£ **React Hook Form** - Native integration with validation
- <¨ **DevExtreme UI** - Consistent styling with spForm system
-  **Validation** - Built-in validation with custom rules
- = **Single/Multi Select** - Seamless mode switching
- =¾ **Caching** - Optional choice metadata caching
- = **Smart Sorting** - Optional alphabetical sorting
- <­ **Custom Rendering** - Item and value render functions
- = **Access Control** - Read-only and disabled states
- =æ **Tree-Shakable** - Import only what you need
- <¯ **TypeScript** - Full type safety

---

## Installation

```bash
npm install spfx-toolkit
```

---

## Quick Start

### With React Hook Form

```typescript
import { SPChoiceField, SPChoiceDisplayType } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';
import { useForm } from 'react-hook-form';

function MyForm() {
  const { control } = useForm();

  return (
    <>
      {/* Static choices - dropdown */}
      <SPChoiceField
        name="status"
        label="Status"
        control={control}
        choices={['Not Started', 'In Progress', 'Completed']}
        rules={{ required: 'Status is required' }}
      />

      {/* Multi-choice - tag box */}
      <SPChoiceField
        name="skills"
        label="Skills"
        control={control}
        choices={['JavaScript', 'TypeScript', 'React', 'Angular']}
        allowMultiple
        displayType={SPChoiceDisplayType.TagBox}
      />

      {/* Load from SharePoint field */}
      <SPChoiceField
        name="department"
        label="Department"
        control={control}
        dataSource={{
          type: 'list',
          listNameOrId: 'Employees',
          fieldInternalName: 'Department'
        }}
      />
    </>
  );
}
```

### Standalone (Without Form)

```typescript
import { SPChoiceField, SPChoiceDisplayType } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';

function MyComponent() {
  const [priority, setPriority] = React.useState('Medium');

  return (
    <SPChoiceField
      label="Priority"
      choices={['Low', 'Medium', 'High', 'Critical']}
      value={priority}
      onChange={setPriority}
      displayType={SPChoiceDisplayType.RadioButtons}
    />
  );
}
```

---

## Props

### Base Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Field label text |
| `description` | `string` | - | Help text below the field |
| `required` | `boolean` | `false` | Mark field as required |
| `disabled` | `boolean` | `false` | Disable the field |
| `readOnly` | `boolean` | `false` | Make field read-only |
| `placeholder` | `string` | `'Select an option'` | Placeholder text |
| `errorMessage` | `string` | - | Custom error message |
| `className` | `string` | - | CSS class for wrapper |
| `width` | `string \| number` | - | Field width |

### Form Integration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Field name for form |
| `control` | `Control` | - | React Hook Form control |
| `rules` | `RegisterOptions` | - | Validation rules |

### Standalone Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| string[]` | - | Controlled value |
| `defaultValue` | `string \| string[]` | - | Initial value |
| `onChange` | `(value: string \| string[]) => void` | - | Change handler |
| `onBlur` | `() => void` | - | Blur handler |
| `onFocus` | `() => void` | - | Focus handler |

### Choice Field Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataSource` | `IChoiceDataSource` | - | SharePoint data source config |
| `choices` | `string[]` | - | Static choice options |
| `displayType` | `SPChoiceDisplayType` | `Dropdown` | Display mode |
| `allowMultiple` | `boolean` | `false` | Enable multi-selection |
| `sortChoices` | `boolean` | `false` | Sort choices alphabetically |
| `useCache` | `boolean` | `false` | Cache SharePoint metadata |
| `showClearButton` | `boolean` | `false` | Show clear button |

### "Other" Option Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `otherConfig` | `IOtherOptionConfig` | - | Fill-in choice configuration |
| `otherConfig.enabled` | `boolean` | `false` | Enable "Other" option |
| `otherConfig.optionText` | `string` | `'Other'` | Text for "Other" choice |
| `otherConfig.otherTextboxPlaceholder` | `string` | `'Enter custom value...'` | Placeholder for custom input |
| `otherConfig.validateCustomValue` | `(value: string) => string \| undefined` | - | Custom value validator |
| `otherConfig.transformCustomValue` | `(value: string) => string` | - | Transform custom value |

### Multi-Choice Display Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxDisplayedTags` | `number` | `3` | Max tags before collapse (TagBox) |
| `showMultiTagOnly` | `boolean` | `false` | Show only multi-tag mode (TagBox) |

### Custom Rendering Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderItem` | `(item: any) => React.ReactNode` | - | Custom choice item renderer |
| `renderValue` | `(value: string \| string[]) => React.ReactNode` | - | Custom value display renderer |

---

## Display Types

### Dropdown (Default)

Standard dropdown select box for single or multi-choice.

```typescript
<SPChoiceField
  name="priority"
  label="Priority"
  control={control}
  choices={['Low', 'Medium', 'High']}
  displayType={SPChoiceDisplayType.Dropdown}
/>
```

**Use cases:** Single selection, space-constrained layouts, long choice lists

---

### Radio Buttons

Vertical list of radio buttons for single selection.

```typescript
<SPChoiceField
  name="approval"
  label="Approval Status"
  control={control}
  choices={['Approved', 'Rejected', 'Pending']}
  displayType={SPChoiceDisplayType.RadioButtons}
/>
```

**Use cases:** 2-5 choices, single selection, visual prominence, forms

**Note:** Radio buttons automatically fall back to checkboxes for multi-choice fields

---

### Checkboxes

Vertical list of checkboxes for single or multi-selection.

```typescript
<SPChoiceField
  name="features"
  label="Requested Features"
  control={control}
  choices={['API Access', 'Custom Reports', 'Data Export', 'Notifications']}
  allowMultiple
  displayType={SPChoiceDisplayType.Checkboxes}
/>
```

**Use cases:** Multi-selection, 2-8 choices, clear visual selection

---

### Tag Box

Tag-based multi-select dropdown with token display.

```typescript
<SPChoiceField
  name="tags"
  label="Tags"
  control={control}
  choices={['Important', 'Urgent', 'Review', 'Follow-up', 'Archive']}
  allowMultiple
  displayType={SPChoiceDisplayType.TagBox}
  maxDisplayedTags={5}
  showMultiTagOnly
/>
```

**Use cases:** Multi-selection, many choices, tag-like behavior, compact display

---

## Data Sources

### Pattern 1: Static Choices

Provide choices directly as an array.

```typescript
<SPChoiceField
  name="priority"
  label="Priority"
  control={control}
  choices={['Low', 'Medium', 'High', 'Critical']}
/>
```

**Advantages:** Simple, no SharePoint dependency, full control
**Use cases:** Fixed options, prototyping, non-SharePoint scenarios

---

### Pattern 2: SharePoint List Field

Load choices from a SharePoint list field automatically.

```typescript
<SPChoiceField
  name="department"
  label="Department"
  control={control}
  dataSource={{
    type: 'list',
    listNameOrId: 'Employees',
    fieldInternalName: 'Department'
  }}
  useCache  // Cache metadata for performance
/>
```

**Advantages:** Automatic synchronization, no hardcoding, SharePoint-managed
**Use cases:** List-specific fields, existing SharePoint lists

---

### Pattern 3: Site Column

Load choices from a site column definition.

```typescript
<SPChoiceField
  name="projectStatus"
  label="Project Status"
  control={control}
  dataSource={{
    type: 'siteColumn',
    fieldInternalName: 'ProjectStatus'
  }}
/>
```

**Advantages:** Reusable across lists, centralized management
**Use cases:** Site columns, standardized fields

---

## Usage Patterns

### Pattern 1: Basic Dropdown

```typescript
<SPChoiceField
  name="status"
  label="Status"
  control={control}
  choices={['Active', 'Inactive', 'Pending']}
  rules={{ required: 'Status is required' }}
/>
```

---

### Pattern 2: Multi-Select with Tags

```typescript
<SPChoiceField
  name="skills"
  label="Skills"
  control={control}
  choices={[
    'JavaScript', 'TypeScript', 'React', 'Angular',
    'Vue', 'Node.js', 'Python', 'Java', 'C#'
  ]}
  allowMultiple
  displayType={SPChoiceDisplayType.TagBox}
  maxDisplayedTags={3}
  showClearButton
  sortChoices  // Alphabetical order
/>
```

---

### Pattern 3: Radio Buttons with Validation

```typescript
<SPChoiceField
  name="terms"
  label="Terms and Conditions"
  control={control}
  choices={['I Accept', 'I Decline']}
  displayType={SPChoiceDisplayType.RadioButtons}
  rules={{
    required: 'You must accept or decline',
    validate: (value) =>
      value === 'I Accept' || 'You must accept to continue'
  }}
/>
```

---

### Pattern 4: "Other" Option with Custom Value

```typescript
<SPChoiceField
  name="industry"
  label="Industry"
  control={control}
  choices={['Technology', 'Healthcare', 'Finance', 'Manufacturing']}
  otherConfig={{
    enabled: true,
    optionText: 'Other (please specify)',
    otherTextboxPlaceholder: 'Enter your industry...',
    validateCustomValue: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Custom value is required when "Other" is selected';
      }
      if (value.length < 3) {
        return 'Industry name must be at least 3 characters';
      }
      return undefined;
    },
    transformCustomValue: (value) => value.trim().toUpperCase()
  }}
/>
```

---

### Pattern 5: SharePoint List Field with Caching

```typescript
<SPChoiceField
  name="category"
  label="Category"
  control={control}
  dataSource={{
    type: 'list',
    listNameOrId: 'Products',
    fieldInternalName: 'Category'
  }}
  useCache  // Cache for 5 minutes
  placeholder="Select a category..."
  showClearButton
/>
```

---

### Pattern 6: Custom Item Rendering

```typescript
<SPChoiceField
  name="priority"
  label="Priority"
  control={control}
  choices={['Low', 'Medium', 'High', 'Critical']}
  renderItem={(item) => {
    const colors = {
      'Low': '#28a745',
      'Medium': '#ffc107',
      'High': '#fd7e14',
      'Critical': '#dc3545'
    };
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: colors[item],
          marginRight: 8
        }} />
        <span>{item}</span>
      </div>
    );
  }}
/>
```

---

## Complete Examples

### Example 1: Project Status Form

```typescript
import { SPChoiceField, SPChoiceDisplayType } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';
import { useForm } from 'react-hook-form';
import { PrimaryButton } from '@fluentui/react/lib/Button';

interface IProjectForm {
  status: string;
  priority: string;
  category: string[];
  assignedTeam: string;
}

function ProjectForm() {
  const { control, handleSubmit } = useForm<IProjectForm>();

  const onSubmit = async (data: IProjectForm) => {
    console.log('Form data:', data);
    // Submit to SharePoint
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Status - Dropdown */}
      <SPChoiceField
        name="status"
        label="Project Status"
        control={control}
        choices={['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled']}
        rules={{ required: 'Status is required' }}
        displayType={SPChoiceDisplayType.Dropdown}
      />

      {/* Priority - Radio Buttons */}
      <SPChoiceField
        name="priority"
        label="Priority Level"
        control={control}
        choices={['Low', 'Medium', 'High', 'Critical']}
        displayType={SPChoiceDisplayType.RadioButtons}
        rules={{ required: 'Priority is required' }}
      />

      {/* Category - Multi-select Tag Box */}
      <SPChoiceField
        name="category"
        label="Project Categories"
        control={control}
        choices={[
          'Development', 'Design', 'Marketing', 'Sales',
          'Support', 'Research', 'Training', 'Infrastructure'
        ]}
        allowMultiple
        displayType={SPChoiceDisplayType.TagBox}
        maxDisplayedTags={3}
        sortChoices
      />

      {/* Assigned Team - SharePoint Integration */}
      <SPChoiceField
        name="assignedTeam"
        label="Assigned Team"
        control={control}
        dataSource={{
          type: 'list',
          listNameOrId: 'Teams',
          fieldInternalName: 'TeamName'
        }}
        useCache
        showClearButton
      />

      <PrimaryButton type="submit" text="Save Project" />
    </form>
  );
}
```

---

### Example 2: Survey Form with "Other" Options

```typescript
import { SPChoiceField, SPChoiceDisplayType } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';
import { useForm } from 'react-hook-form';

interface ISurveyForm {
  howDidYouHear: string;
  interests: string[];
  frequency: string;
}

function SurveyForm() {
  const { control, handleSubmit } = useForm<ISurveyForm>();

  const onSubmit = async (data: ISurveyForm) => {
    console.log('Survey data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Single choice with "Other" */}
      <SPChoiceField
        name="howDidYouHear"
        label="How did you hear about us?"
        control={control}
        choices={[
          'Search Engine',
          'Social Media',
          'Friend/Colleague',
          'Advertisement',
          'Email'
        ]}
        otherConfig={{
          enabled: true,
          optionText: 'Other (please specify)',
          otherTextboxPlaceholder: 'Please specify...',
          validateCustomValue: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Please specify how you heard about us';
            }
            return undefined;
          }
        }}
        rules={{ required: 'This field is required' }}
      />

      {/* Multi-choice with "Other" */}
      <SPChoiceField
        name="interests"
        label="Areas of Interest"
        control={control}
        choices={[
          'Web Development',
          'Mobile Apps',
          'Cloud Services',
          'Data Analytics',
          'Machine Learning'
        ]}
        allowMultiple
        displayType={SPChoiceDisplayType.Checkboxes}
        otherConfig={{
          enabled: true,
          optionText: 'Other',
          otherTextboxPlaceholder: 'Specify other interests...'
        }}
      />

      {/* Frequency - Radio buttons */}
      <SPChoiceField
        name="frequency"
        label="How often would you use this service?"
        control={control}
        choices={['Daily', 'Weekly', 'Monthly', 'Rarely']}
        displayType={SPChoiceDisplayType.RadioButtons}
        rules={{ required: 'Please select a frequency' }}
      />

      <PrimaryButton type="submit" text="Submit Survey" />
    </form>
  );
}
```

---

### Example 3: SharePoint List Integration with Validation

```typescript
import { SPChoiceField, SPChoiceDisplayType } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';
import { useForm } from 'react-hook-form';

interface IEmployeeForm {
  department: string;
  skills: string[];
  employmentType: string;
  officeLocation: string;
}

function EmployeeForm() {
  const { control, handleSubmit, watch } = useForm<IEmployeeForm>();

  const department = watch('department');

  const onSubmit = async (data: IEmployeeForm) => {
    console.log('Employee data:', data);
    // Save to SharePoint
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Department - From Site Column */}
      <SPChoiceField
        name="department"
        label="Department"
        control={control}
        dataSource={{
          type: 'siteColumn',
          fieldInternalName: 'Department'
        }}
        useCache
        rules={{ required: 'Department is required' }}
      />

      {/* Skills - Multi-select from List */}
      <SPChoiceField
        name="skills"
        label="Skills"
        control={control}
        dataSource={{
          type: 'list',
          listNameOrId: 'Skills',
          fieldInternalName: 'SkillName'
        }}
        allowMultiple
        displayType={SPChoiceDisplayType.TagBox}
        maxDisplayedTags={5}
        sortChoices
        rules={{
          required: 'At least one skill is required',
          validate: (value) =>
            value.length <= 10 || 'Maximum 10 skills allowed'
        }}
      />

      {/* Employment Type - Radio with conditional validation */}
      <SPChoiceField
        name="employmentType"
        label="Employment Type"
        control={control}
        choices={['Full-Time', 'Part-Time', 'Contract', 'Intern']}
        displayType={SPChoiceDisplayType.RadioButtons}
        rules={{
          required: 'Employment type is required',
          validate: (value) => {
            if (department === 'Executive' && value !== 'Full-Time') {
              return 'Executive positions must be Full-Time';
            }
            return undefined;
          }
        }}
      />

      {/* Office Location - From List with custom rendering */}
      <SPChoiceField
        name="officeLocation"
        label="Office Location"
        control={control}
        dataSource={{
          type: 'list',
          listNameOrId: 'Offices',
          fieldInternalName: 'Location'
        }}
        useCache
        renderItem={(item) => (
          <div>
            <strong>{item}</strong>
            <div style={{ fontSize: '0.85em', color: '#666' }}>
              {/* Add location details here */}
            </div>
          </div>
        )}
      />

      <PrimaryButton type="submit" text="Save Employee" />
    </form>
  );
}
```

---

## Best Practices

### 1. Always Use Labels

```typescript
// L BAD: No label
<SPChoiceField name="field1" control={control} choices={['A', 'B']} />

//  GOOD: Clear label
<SPChoiceField
  name="priority"
  label="Priority Level"
  control={control}
  choices={['Low', 'Medium', 'High']}
/>
```

---

### 2. Choose Appropriate Display Type

```typescript
//  GOOD: Radio buttons for 2-5 single choices
<SPChoiceField
  name="approval"
  label="Approval Status"
  control={control}
  choices={['Approved', 'Rejected', 'Pending']}
  displayType={SPChoiceDisplayType.RadioButtons}
/>

//  GOOD: Dropdown for many single choices
<SPChoiceField
  name="country"
  label="Country"
  control={control}
  choices={countries}  // 100+ countries
  displayType={SPChoiceDisplayType.Dropdown}
/>

//  GOOD: TagBox for multi-select
<SPChoiceField
  name="tags"
  label="Tags"
  control={control}
  choices={availableTags}
  allowMultiple
  displayType={SPChoiceDisplayType.TagBox}
/>
```

---

### 3. Use Caching for SharePoint Fields

```typescript
//  GOOD: Cache metadata for repeated use
<SPChoiceField
  name="category"
  label="Category"
  control={control}
  dataSource={{
    type: 'list',
    listNameOrId: 'Products',
    fieldInternalName: 'Category'
  }}
  useCache  // Cache for 5 minutes
/>
```

---

### 4. Validate "Other" Custom Values

```typescript
//  GOOD: Proper validation for custom values
<SPChoiceField
  name="industry"
  label="Industry"
  control={control}
  choices={['Tech', 'Healthcare', 'Finance']}
  otherConfig={{
    enabled: true,
    validateCustomValue: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Custom value is required';
      }
      if (value.length < 3) {
        return 'Minimum 3 characters required';
      }
      if (value.length > 50) {
        return 'Maximum 50 characters allowed';
      }
      return undefined;
    }
  }}
/>
```

---

### 5. Provide Helpful Descriptions

```typescript
//  GOOD: Clear guidance
<SPChoiceField
  name="severity"
  label="Issue Severity"
  control={control}
  choices={['Low', 'Medium', 'High', 'Critical']}
  description="Select the severity level based on business impact"
  displayType={SPChoiceDisplayType.RadioButtons}
/>
```

---

### 6. Sort Long Choice Lists

```typescript
//  GOOD: Alphabetical sorting for easy finding
<SPChoiceField
  name="state"
  label="State"
  control={control}
  choices={usStates}  // 50 states
  sortChoices  // Alphabetical order
/>
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  SPChoiceField,
  SPChoiceDisplayType,
  ISPChoiceFieldProps,
  IChoiceDataSource,
  IOtherOptionConfig
} from 'spfx-toolkit/lib/components/spFields/SPChoiceField';

// All props are fully typed
const props: ISPChoiceFieldProps = {
  name: 'status',
  label: 'Status',
  choices: ['Active', 'Inactive'],
  displayType: SPChoiceDisplayType.Dropdown,
  allowMultiple: false
};

// Data source configuration
const dataSource: IChoiceDataSource = {
  type: 'list',
  listNameOrId: 'Tasks',
  fieldInternalName: 'Status'
};

// "Other" option configuration
const otherConfig: IOtherOptionConfig = {
  enabled: true,
  optionText: 'Other (specify)',
  otherTextboxPlaceholder: 'Enter custom value...',
  validateCustomValue: (value: string) => {
    if (!value) return 'Required';
    return undefined;
  },
  transformCustomValue: (value: string) => value.trim()
};

// Display type enum
const displayType: SPChoiceDisplayType = SPChoiceDisplayType.RadioButtons;
// Options: Dropdown, RadioButtons, Checkboxes, TagBox
```

---

## Related Components

- **[SPTextField](../SPTextField/README.md)** - Text input fields
- **[SPDateField](../SPDateField/README.md)** - Date and time fields
- **[SPUserField](../SPUserField/README.md)** - People picker fields
- **[SPNumberField](../SPNumberField/README.md)** - Numeric input fields

---

## Tree-Shaking

Always use specific imports for optimal bundle size:

```typescript
//  RECOMMENDED: Specific import
import { SPChoiceField } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';

// L AVOID: Bulk import
import { SPChoiceField } from 'spfx-toolkit';
```

---

## License

Part of [SPFx Toolkit](../../../../README.md) - MIT License

---

**Last Updated:** November 2025
