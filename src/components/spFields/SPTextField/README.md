# SPTextField Component 📝

A comprehensive text field component that mirrors SharePoint's Text and Note field types. Supports single-line text, multi-line text areas, rich text editing, and append-only history mode for SharePoint Note fields.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props](#props)
- [Display Modes](#display-modes)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- 📝 **Multiple Modes** - Single-line, multi-line, and rich text editor
- 📋 **Note History** - Append-only mode with version history display
- 🎯 **React Hook Form** - Native integration with validation
- 🎨 **DevExtreme UI** - Consistent styling with spForm system
- ✅ **Validation** - Built-in validation with custom rules
- 🔢 **Character Counting** - Show remaining/used characters
- 🎭 **Input Masking** - Format input with masks (phone, SSN, etc.)
- 🔍 **Pattern Validation** - Regex pattern matching
- 🎨 **Styling Modes** - Outlined, underlined, or filled styles
- ⚡ **Debouncing** - Configurable onChange debounce delay
- 🔒 **Access Control** - Read-only and disabled states
- 📦 **Tree-Shakable** - Import only what you need
- 🎯 **TypeScript** - Full type safety

---

## Installation

```bash
npm install spfx-toolkit
```

---

## Quick Start

### With React Hook Form

```typescript
import { SPTextField, SPTextFieldMode } from 'spfx-toolkit/lib/components/spFields/SPTextField';
import { useForm } from 'react-hook-form';

function MyForm() {
  const { control } = useForm();

  return (
    <>
      {/* Single-line text */}
      <SPTextField
        name="title"
        label="Title"
        control={control}
        rules={{ required: 'Title is required' }}
        maxLength={255}
      />

      {/* Multi-line text */}
      <SPTextField
        name="description"
        label="Description"
        control={control}
        mode={SPTextFieldMode.MultiLine}
        rows={6}
        maxLength={500}
        showCharacterCount
      />

      {/* Rich text editor */}
      <SPTextField
        name="notes"
        label="Notes"
        control={control}
        mode={SPTextFieldMode.RichText}
      />
    </>
  );
}
```

### Standalone (Without Form)

```typescript
import { SPTextField, SPTextFieldMode } from 'spfx-toolkit/lib/components/spFields/SPTextField';

function MyComponent() {
  const [description, setDescription] = React.useState('');

  return (
    <SPTextField
      label="Description"
      mode={SPTextFieldMode.MultiLine}
      value={description}
      onChange={setDescription}
      placeholder="Enter description..."
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
| `placeholder` | `string` | - | Placeholder text |
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
| `value` | `string` | - | Controlled value |
| `defaultValue` | `string` | - | Initial value |
| `onChange` | `(value: string) => void` | - | Change handler |
| `onBlur` | `() => void` | - | Blur handler |
| `onFocus` | `() => void` | - | Focus handler |

### TextField Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `SPTextFieldMode` | `SingleLine` | Display mode |
| `maxLength` | `number` | - | Maximum character length |
| `minLength` | `number` | - | Minimum character length |
| `rows` | `number` | `4` | Rows for multi-line mode |
| `showCharacterCount` | `boolean` | `false` | Show character counter |
| `pattern` | `RegExp` | - | Validation regex pattern |
| `patternMessage` | `string` | - | Error message for pattern |
| `autoFocus` | `boolean` | `false` | Auto-focus on mount |
| `inputType` | `string` | `'text'` | HTML input type |
| `spellCheck` | `boolean` | `true` | Enable spell checking |
| `autoComplete` | `string` | - | Auto-complete attribute |
| `prefixIcon` | `string` | - | Icon before input |
| `suffixIcon` | `string` | - | Icon after input |
| `showClearButton` | `boolean` | `false` | Show clear button |
| `debounceDelay` | `number` | `300` | onChange debounce (ms) |
| `mask` | `string` | - | Input mask format |
| `maskChar` | `string` | `'_'` | Mask placeholder char |
| `stylingMode` | `string` | `'outlined'` | Style variant |

### Append-Only Mode Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appendOnly` | `boolean` | `false` | Enable history mode |
| `itemId` | `number` | - | SharePoint item ID |
| `listNameOrId` | `string` | - | List name or GUID |
| `fieldInternalName` | `string` | - | Field internal name |
| `historyConfig` | `INoteHistoryConfig` | - | History display config |
| `useCacheForHistory` | `boolean` | `false` | Cache version data |
| `onHistoryLoad` | `(entries, count) => void` | - | History loaded callback |
| `onHistoryError` | `(error) => void` | - | History error callback |
| `onNoteAdd` | `(note) => void` | - | Note added callback |
| `onCopyPrevious` | `(entry) => void` | - | Copy entry callback |

---

## Display Modes

### SingleLine Mode

Standard single-line text input.

```typescript
<SPTextField
  name="title"
  label="Title"
  control={control}
  mode={SPTextFieldMode.SingleLine}
  maxLength={255}
/>
```

**Use cases:** Titles, names, short descriptions, URLs, email addresses

---

### MultiLine Mode

Multi-line textarea for longer content.

```typescript
<SPTextField
  name="description"
  label="Description"
  control={control}
  mode={SPTextFieldMode.MultiLine}
  rows={6}
  maxLength={1000}
  showCharacterCount
/>
```

**Use cases:** Descriptions, comments, notes, addresses, long text

---

### RichText Mode

Rich text editor with formatting toolbar.

```typescript
<SPTextField
  name="content"
  label="Content"
  control={control}
  mode={SPTextFieldMode.RichText}
/>
```

**Features:**
- Bold, italic, underline
- Lists (ordered/unordered)
- Links and images
- Text alignment
- Font size and color

**Use cases:** Articles, documentation, formatted content, announcements

---

## Usage Patterns

### Pattern 1: Basic Text Input

```typescript
<SPTextField
  name="firstName"
  label="First Name"
  control={control}
  rules={{ required: 'First name is required' }}
  placeholder="Enter your first name"
  maxLength={50}
/>
```

---

### Pattern 2: Text Area with Character Count

```typescript
<SPTextField
  name="comments"
  label="Comments"
  control={control}
  mode={SPTextFieldMode.MultiLine}
  rows={5}
  maxLength={500}
  showCharacterCount
  placeholder="Enter your comments..."
/>
```

---

### Pattern 3: Email Validation

```typescript
<SPTextField
  name="email"
  label="Email Address"
  control={control}
  inputType="email"
  rules={{
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address'
    }
  }}
  prefixIcon="email"
/>
```

---

### Pattern 4: Phone Number with Mask

```typescript
<SPTextField
  name="phone"
  label="Phone Number"
  control={control}
  inputType="tel"
  mask="+1 (000) 000-0000"
  rules={{ required: 'Phone number is required' }}
/>
```

---

### Pattern 5: URL Input

```typescript
<SPTextField
  name="website"
  label="Website"
  control={control}
  inputType="url"
  pattern={/^https?:\/\/.+/}
  patternMessage="URL must start with http:// or https://"
  prefixIcon="globe"
/>
```

---

### Pattern 6: Rich Text Editor

```typescript
<SPTextField
  name="announcement"
  label="Announcement"
  control={control}
  mode={SPTextFieldMode.RichText}
  description="Format your announcement with bold, lists, links, etc."
/>
```

---

### Pattern 7: Append-Only Note Field with History

```typescript
<SPTextField
  name="notes"
  label="Project Notes"
  control={control}
  mode={SPTextFieldMode.MultiLine}
  appendOnly
  itemId={123}
  listNameOrId="Projects"
  fieldInternalName="Notes"
  historyConfig={{
    initialDisplayCount: 5,
    showUserPhoto: true,
    timeFormat: 'relative',
    enableCopyPrevious: true
  }}
  onNoteAdd={(note) => console.log('New note:', note)}
/>
```

---

## Complete Examples

### Example 1: Contact Form

```typescript
import { SPTextField, SPTextFieldMode } from 'spfx-toolkit/lib/components/spFields/SPTextField';
import { useForm } from 'react-hook-form';
import { PrimaryButton } from '@fluentui/react/lib/Button';

interface IContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

function ContactForm() {
  const { control, handleSubmit } = useForm<IContactForm>();

  const onSubmit = async (data: IContactForm) => {
    console.log('Form data:', data);
    // Submit to SharePoint
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <SPTextField
        name="name"
        label="Full Name"
        control={control}
        rules={{ required: 'Name is required' }}
        placeholder="John Doe"
        maxLength={100}
      />

      <SPTextField
        name="email"
        label="Email Address"
        control={control}
        inputType="email"
        rules={{
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        }}
        prefixIcon="email"
      />

      <SPTextField
        name="phone"
        label="Phone Number"
        control={control}
        inputType="tel"
        mask="+1 (000) 000-0000"
        prefixIcon="tel"
      />

      <SPTextField
        name="subject"
        label="Subject"
        control={control}
        rules={{ required: 'Subject is required' }}
        maxLength={200}
      />

      <SPTextField
        name="message"
        label="Message"
        control={control}
        mode={SPTextFieldMode.MultiLine}
        rules={{ required: 'Message is required' }}
        rows={8}
        maxLength={2000}
        showCharacterCount
        placeholder="Type your message here..."
      />

      <PrimaryButton type="submit" text="Send Message" />
    </form>
  );
}
```

---

### Example 2: Issue Tracking with Append-Only Notes

```typescript
import { SPTextField, SPTextFieldMode } from 'spfx-toolkit/lib/components/spFields/SPTextField';
import { useForm } from 'react-hook-form';

interface IIssue {
  title: string;
  description: string;
  notes: string;
}

function IssueForm({ itemId }: { itemId?: number }) {
  const { control, handleSubmit, setValue } = useForm<IIssue>();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <SPTextField
        name="title"
        label="Issue Title"
        control={control}
        rules={{ required: 'Title is required' }}
        maxLength={255}
      />

      <SPTextField
        name="description"
        label="Description"
        control={control}
        mode={SPTextFieldMode.MultiLine}
        rows={6}
        rules={{ required: 'Description is required' }}
      />

      {/* Append-only note field with history */}
      {itemId && (
        <SPTextField
          name="notes"
          label="Resolution Notes"
          control={control}
          mode={SPTextFieldMode.MultiLine}
          appendOnly
          itemId={itemId}
          listNameOrId="Issues"
          fieldInternalName="Notes"
          historyConfig={{
            initialDisplayCount: 5,
            showUserPhoto: true,
            timeFormat: 'relative',
            enableCopyPrevious: true,
            historyTitle: 'Previous Updates',
            emptyHistoryMessage: 'No updates yet'
          }}
          onHistoryLoad={(entries, total) => {
            console.log(`Loaded ${entries.length} of ${total} history entries`);
          }}
          onCopyPrevious={(entry) => {
            // Populate field with previous entry
            setValue('notes', entry.text);
          }}
          description="Add updates to this issue. Previous updates will be preserved."
        />
      )}
    </form>
  );
}
```

---

## Best Practices

### 1. Always Use Labels

```typescript
// ❌ BAD: No label
<SPTextField name="field1" control={control} />

// ✅ GOOD: Clear label
<SPTextField
  name="firstName"
  label="First Name"
  control={control}
/>
```

---

### 2. Set Appropriate Max Length

```typescript
// ✅ GOOD: Match SharePoint field limits
<SPTextField
  name="title"
  label="Title"
  control={control}
  maxLength={255}  // SharePoint single-line text limit
  showCharacterCount
/>
```

---

### 3. Provide Helpful Descriptions

```typescript
// ✅ GOOD: Clear guidance
<SPTextField
  name="sku"
  label="SKU"
  control={control}
  description="Enter the 6-digit product SKU (e.g., 123456)"
  pattern={/^\d{6}$/}
/>
```

---

### 4. Use Appropriate Input Types

```typescript
// ✅ GOOD: Specific input types
<SPTextField name="email" inputType="email" />
<SPTextField name="phone" inputType="tel" />
<SPTextField name="website" inputType="url" />
<SPTextField name="search" inputType="search" />
```

---

### 5. Validate with Patterns

```typescript
// ✅ GOOD: Client-side validation
<SPTextField
  name="ssn"
  label="SSN"
  control={control}
  mask="000-00-0000"
  pattern={/^\d{3}-\d{2}-\d{4}$/}
  patternMessage="Invalid SSN format"
/>
```

---

### 6. Use Character Counts for Long Text

```typescript
// ✅ GOOD: Show progress
<SPTextField
  name="description"
  label="Description"
  control={control}
  mode={SPTextFieldMode.MultiLine}
  maxLength={500}
  showCharacterCount
/>
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  SPTextField,
  SPTextFieldMode,
  ISPTextFieldProps,
  INoteHistoryEntry,
  INoteHistoryConfig
} from 'spfx-toolkit/lib/components/spFields/SPTextField';

// All props are fully typed
const props: ISPTextFieldProps = {
  name: 'description',
  label: 'Description',
  mode: SPTextFieldMode.MultiLine,
  maxLength: 500,
  showCharacterCount: true
};

// History entries are typed
const onHistoryLoad = (entries: INoteHistoryEntry[], total: number) => {
  entries.forEach(entry => {
    console.log(entry.author.title, entry.created, entry.text);
  });
};
```

---

## Related Components

- **[SPChoiceField](../SPChoiceField/README.md)** - Choice and dropdown fields
- **[SPDateField](../SPDateField/README.md)** - Date and time fields
- **[SPUserField](../SPUserField/README.md)** - People picker fields
- **[SPNumberField](../SPNumberField/README.md)** - Numeric input fields

---

## Tree-Shaking

Always use specific imports for optimal bundle size:

```typescript
// ✅ RECOMMENDED: Specific import
import { SPTextField } from 'spfx-toolkit/lib/components/spFields/SPTextField';

// ❌ AVOID: Bulk import
import { SPTextField } from 'spfx-toolkit';
```

---

## License

Part of [SPFx Toolkit](../../../../README.md) - MIT License

---

**Last Updated:** November 2025
