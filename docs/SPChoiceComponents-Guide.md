# SPChoicePicker vs SPChoiceField - Usage Guide

This guide helps you choose between `SPChoicePicker` and `SPChoiceField` for your SharePoint choice field needs.

## 🎯 Quick Decision Guide

```
Need react-hook-form integration?
├─ YES → Use SPChoiceField
└─ NO  → Use SPChoicePicker

Building a form with multiple fields?
├─ YES → Use SPChoiceField (consistent with other SPField components)
└─ NO  → Either works (SPChoicePicker is simpler)

Need advanced field features (description, width, display types)?
├─ YES → Use SPChoiceField
└─ NO  → Use SPChoicePicker

Want the simplest possible implementation?
└─ Use SPChoicePicker
```

---

## 📦 Component Comparison

### SPChoicePicker (Standalone Component)

**Location**: `spfx-toolkit/lib/components/SPChoicePicker`

**Best For**:
- ✅ Standalone choice selectors outside of forms
- ✅ Simple controlled components
- ✅ When you don't need react-hook-form
- ✅ Lightweight implementations
- ✅ Custom form libraries (non react-hook-form)

**Characteristics**:
- Simple, focused API
- Controlled component only (`value`/`onChange`)
- Fewer configuration options
- No form integration overhead
- Smaller bundle size when used standalone

**Import**:
```typescript
import { SPChoicePicker } from 'spfx-toolkit/lib/components/SPChoicePicker';
```

**Basic Usage**:
```typescript
const [status, setStatus] = React.useState<string>('');

<SPChoicePicker
  label="Status"
  dataSource={{
    type: 'list',
    listNameOrId: 'Tasks',
    fieldInternalName: 'Status'
  }}
  value={status}
  onChange={(newValue) => setStatus(newValue)}
/>
```

---

### SPChoiceField (Form-Integrated Component)

**Location**: `spfx-toolkit/lib/components/spFields/SPChoiceField`

**Best For**:
- ✅ Forms using react-hook-form
- ✅ Part of SPField suite (consistent API)
- ✅ Need advanced features (display types, sorting, etc.)
- ✅ Complex forms with validation
- ✅ When using with SPForm or other SPField components

**Characteristics**:
- Full react-hook-form integration
- Comprehensive field props (width, description, etc.)
- Advanced features (displayType, sortChoices, etc.)
- Consistent with other SPField components
- Built-in validation support

**Import**:
```typescript
import { SPChoiceField } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';
```

**Basic Usage**:
```typescript
const { control } = useForm();

<SPChoiceField
  name="status"
  label="Status"
  control={control}
  dataSource={{
    type: 'list',
    listNameOrId: 'Tasks',
    fieldInternalName: 'Status'
  }}
  rules={{ required: 'Status is required' }}
/>
```

---

## 🔄 Shared Features

Both components share the same core functionality through the `useSPChoiceField` hook:

✅ Load choices from SharePoint (list fields or site columns)
✅ Support for "Other" option with custom values
✅ Fill-in choice detection
✅ Single and multi-select modes
✅ Static choices support
✅ Caching support
✅ Error handling and retry
✅ Loading states

---

## 📚 Usage Examples

### Example 1: Simple Standalone Picker (SPChoicePicker)

```typescript
import * as React from 'react';
import { SPChoicePicker } from 'spfx-toolkit/lib/components/SPChoicePicker';

export const SimpleStatusPicker: React.FC = () => {
  const [status, setStatus] = React.useState<string>('Not Started');

  return (
    <div>
      <SPChoicePicker
        label="Task Status"
        dataSource={{
          type: 'list',
          listNameOrId: 'Tasks',
          fieldInternalName: 'Status'
        }}
        value={status}
        onChange={setStatus}
        required={true}
      />
      <p>Selected: {status}</p>
    </div>
  );
};
```

**Why SPChoicePicker?**
- Simple standalone use case
- No form integration needed
- Minimal code

---

### Example 2: Form with Multiple Fields (SPChoiceField)

```typescript
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { SPChoiceField } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';
import { SPTextField } from 'spfx-toolkit/lib/components/spFields/SPTextField';
import { SPDateField } from 'spfx-toolkit/lib/components/spFields/SPDateField';

interface ITaskForm {
  title: string;
  status: string;
  priority: string;
  dueDate: Date;
}

export const TaskForm: React.FC = () => {
  const { control, handleSubmit } = useForm<ITaskForm>();

  const onSubmit = (data: ITaskForm) => {
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
        dataSource={{
          type: 'list',
          listNameOrId: 'Tasks',
          fieldInternalName: 'Status'
        }}
        rules={{ required: 'Status is required' }}
      />

      <SPChoiceField
        name="priority"
        label="Priority"
        control={control}
        choices={['High', 'Medium', 'Low']}
        sortChoices={true}
        displayType="dropdown"
      />

      <SPDateField
        name="dueDate"
        label="Due Date"
        control={control}
      />

      <button type="submit">Save Task</button>
    </form>
  );
};
```

**Why SPChoiceField?**
- Part of a react-hook-form
- Consistent with other SPField components
- Built-in validation
- Clean API

---

### Example 3: Custom Form Library (SPChoicePicker)

```typescript
import * as React from 'react';
import { SPChoicePicker } from 'spfx-toolkit/lib/components/SPChoicePicker';
// Using a different form library (e.g., Formik, Final Form)
import { Formik, Form, Field } from 'formik';

export const FormikExample: React.FC = () => {
  return (
    <Formik
      initialValues={{ status: '' }}
      onSubmit={(values) => console.log(values)}
    >
      {({ values, setFieldValue }) => (
        <Form>
          <Field name="status">
            {() => (
              <SPChoicePicker
                label="Status"
                dataSource={{
                  type: 'list',
                  listNameOrId: 'Tasks',
                  fieldInternalName: 'Status'
                }}
                value={values.status}
                onChange={(value) => setFieldValue('status', value)}
              />
            )}
          </Field>
        </Form>
      )}
    </Formik>
  );
};
```

**Why SPChoicePicker?**
- Works with any form library
- Not tied to react-hook-form
- Flexible controlled component

---

### Example 4: Filter/Search UI (SPChoicePicker)

```typescript
import * as React from 'react';
import { SPChoicePicker } from 'spfx-toolkit/lib/components/SPChoicePicker';

export const TaskFilter: React.FC = () => {
  const [statusFilter, setStatusFilter] = React.useState<string | string[]>([]);
  const [tasks, setTasks] = React.useState([]);

  React.useEffect(() => {
    // Filter tasks based on selected status
    const filtered = allTasks.filter(task =>
      Array.isArray(statusFilter)
        ? statusFilter.includes(task.Status)
        : task.Status === statusFilter
    );
    setTasks(filtered);
  }, [statusFilter]);

  return (
    <div>
      <h3>Filter Tasks</h3>
      <SPChoicePicker
        label="Filter by Status"
        dataSource={{
          type: 'list',
          listNameOrId: 'Tasks',
          fieldInternalName: 'Status'
        }}
        value={statusFilter}
        onChange={setStatusFilter}
        // Multi-select for filtering
      />

      {/* Display filtered tasks */}
      <TaskList tasks={tasks} />
    </div>
  );
};
```

**Why SPChoicePicker?**
- Not a form submission scenario
- Simple state management
- No validation needed

---

## 🔧 Advanced Features Comparison

| Feature | SPChoicePicker | SPChoiceField |
|---------|----------------|---------------|
| **Core Features** | | |
| Load from SharePoint | ✅ | ✅ |
| Static choices | ✅ | ✅ |
| "Other" option | ✅ | ✅ |
| Single/Multi select | ✅ | ✅ |
| Caching | ✅ | ✅ |
| **Form Integration** | | |
| react-hook-form | ❌ (needs wrapper) | ✅ Built-in |
| Validation rules | ❌ | ✅ |
| Field state | ❌ | ✅ |
| Error display | Basic | Advanced |
| **UI Features** | | |
| Custom width | ❌ | ✅ |
| Description text | ❌ | ✅ |
| Display types | ❌ | ✅ |
| Sort choices | ❌ | ✅ |
| Max displayed tags | ❌ | ✅ |
| Show multi-tag only | ❌ | ✅ |
| **Developer Experience** | | |
| Props complexity | Simple | Comprehensive |
| API consistency | Standalone | SPFields suite |
| Bundle size (standalone) | Smaller | Larger |

---

## 🚀 Migration Between Components

### From SPChoicePicker to SPChoiceField

When you need to add form integration:

**Before** (SPChoicePicker):
```typescript
const [status, setStatus] = React.useState('');

<SPChoicePicker
  label="Status"
  dataSource={...}
  value={status}
  onChange={setStatus}
/>
```

**After** (SPChoiceField):
```typescript
const { control } = useForm();

<SPChoiceField
  name="status"
  label="Status"
  control={control}
  dataSource={...}
  defaultValue="" // if needed
/>
```

---

### From SPChoiceField to SPChoicePicker

When you want to simplify and remove form dependencies:

**Before** (SPChoiceField):
```typescript
const { control } = useForm();

<SPChoiceField
  name="status"
  control={control}
  dataSource={...}
/>
```

**After** (SPChoicePicker):
```typescript
const [status, setStatus] = React.useState('');

<SPChoicePicker
  dataSource={...}
  value={status}
  onChange={setStatus}
/>
```

---

## 📖 Best Practices

### ✅ DO: Use SPChoicePicker When

- Building standalone choice selectors
- No form validation needed
- Using a different form library (Formik, Final Form, etc.)
- Creating filter/search UIs
- Simple controlled components
- Minimal dependencies preferred

### ✅ DO: Use SPChoiceField When

- Building forms with react-hook-form
- Need validation rules
- Using alongside other SPField components
- Need advanced features (display types, sorting, etc.)
- Part of SPForm implementation
- Consistent API across form fields desired

### ❌ DON'T

- Don't use RHFSPChoicePicker wrapper - use SPChoiceField instead
- Don't duplicate the `useSPChoiceField` hook
- Don't create your own wrappers - use the appropriate component

---

## 🔄 Shared Dependencies

Both components share:

1. **useSPChoiceField Hook** - Core logic for loading and managing choices
2. **Utility Functions** - Choice field loader, validation, etc.
3. **Type Definitions** - `IChoiceFieldMetadata`, `IOtherOptionConfig`, etc.

**Location**: `src/components/spFields/SPChoiceField/hooks/useSPChoiceField.ts`

This ensures:
- ✅ Consistent behavior
- ✅ Shared bug fixes
- ✅ Single source of truth
- ✅ No code duplication

---

## 🎓 Summary

**Use SPChoicePicker** for simple, standalone choice selection outside of react-hook-form.

**Use SPChoiceField** for form-integrated choice fields with validation and advanced features.

**Both components**:
- Share the same core logic
- Support the same SharePoint features
- Are actively maintained
- Are production-ready

Choose based on your use case, not preference!
