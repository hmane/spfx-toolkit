# SPDynamicForm Component

Dynamically generates SharePoint forms based on list/library metadata with support for New/Edit/View modes. Inspired by PnP's DynamicForm but optimized for this toolkit's architecture with zero runtime dependencies and tree-shakable imports.

## 🎯 Features

- ✅ **Automatic form generation** from SharePoint list/library schemas
- ✅ **Three modes**: New, Edit, and View
- ✅ **ContentType-aware** field ordering and grouping
- ✅ **Smart lookup optimization** - Auto-switches to autocomplete for lists with >5000 items
- ✅ **Comprehensive field type support** - All SharePoint field types including rich text
- ✅ **Attachment management** - File upload/deletion with size and type validation
- ✅ **Section support** - Automatic ContentType groups or manual sections
- ✅ **Custom field rendering** - Override any field with custom components
- ✅ **Validation** - Built-in validation + custom validation functions
- ✅ **Developer-controlled save** - Returns SPUpdater with only changed fields
- ✅ **TypeScript** - Full type safety with improved generic types
- ✅ **Performance optimized** - Field caching, lazy loading, tree-shakable
- ✅ **Field conditional visibility** - Show/hide fields based on form values
- ✅ **Custom content injection** - Insert custom UI between fields
- ✅ **Field help tooltips** - Auto-display field descriptions as tooltips
- ✅ **Scroll-to-error** - Automatically scroll to validation errors
- ✅ **Dirty check confirmation** - Warn before losing unsaved changes
- ✅ **Default values** - Auto-apply field defaults from metadata or overrides
- ✅ **Error boundaries** - Graceful error handling with detailed logging
- ✅ **Compact mode** - Reduce spacing and padding for small forms
- ✅ **Custom field spacing** - Fine-tune spacing between fields (global or per-section)

## 📦 Installation

```typescript
// Tree-shakable import (recommended)
import { SPDynamicForm } from 'spfx-toolkit/lib/components/SPDynamicForm';
import type { IFormSubmitResult } from 'spfx-toolkit/lib/components/SPDynamicForm';
```

## 🚀 Quick Start

### Basic New Form

```typescript
import * as React from 'react';
import { SPDynamicForm } from 'spfx-toolkit/lib/components/SPDynamicForm';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

export const MyNewForm: React.FC = () => {
  return (
    <SPDynamicForm
      listId="Tasks"
      mode="new"
      onSubmit={async (result) => {
        // Save to SharePoint
        const item = await SPContext.sp.web.lists
          .getByTitle('Tasks')
          .items.add(result.updates);

        console.log('Item created:', item.data.Id);
      }}
    />
  );
};
```

### Edit Form

```typescript
export const MyEditForm: React.FC<{ itemId: number }> = ({ itemId }) => {
  return (
    <SPDynamicForm
      listId="Tasks"
      mode="edit"
      itemId={itemId}
      onSubmit={async (result) => {
        if (!result.hasChanges) {
          console.log('No changes to save');
          return;
        }

        // Update only changed fields
        await SPContext.sp.web.lists
          .getByTitle('Tasks')
          .items.getById(itemId)
          .update(result.updates);

        console.log('Item updated:', result.changes);
      }}
    />
  );
};
```

### View Form (Read-Only)

```typescript
export const MyViewForm: React.FC<{ itemId: number }> = ({ itemId }) => {
  return (
    <SPDynamicForm
      listId="Tasks"
      mode="view"
      itemId={itemId}
      onSubmit={() => {}} // Required but not used in view mode
    />
  );
};
```

## 🎨 Advanced Usage

### Custom Field Configuration

```typescript
<SPDynamicForm
  listId="Projects"
  mode="new"
  fieldOverrides={[
    {
      fieldName: 'Title',
      label: 'Project Name',
      required: true,
      description: 'Enter a unique project name',
    },
    {
      fieldName: 'Status',
      defaultValue: 'Active',
      disabled: true,
    },
    {
      fieldName: 'InternalNotes',
      hidden: true, // Hide field completely
    },
  ]}
  excludeFields={['Category', 'Tags']} // Don't show these fields
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Projects').items.add(result.updates);
  }}
/>
```

### Manual Field Order

```typescript
<SPDynamicForm
  listId="Tasks"
  mode="new"
  fieldOrder={[
    'Title',
    'Description',
    'Priority',
    'DueDate',
    'AssignedTo',
    'Status',
  ]}
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Tasks').items.add(result.updates);
  }}
/>
```

### Manual Sections

```typescript
<SPDynamicForm
  listId="Projects"
  mode="edit"
  itemId={123}
  sections={[
    {
      name: 'basic',
      title: 'Basic Information',
      fields: ['Title', 'Description', 'Status'],
      defaultExpanded: true,
      description: 'Core project details',
    },
    {
      name: 'schedule',
      title: 'Schedule',
      fields: ['StartDate', 'EndDate', 'Duration'],
      defaultExpanded: false,
    },
    {
      name: 'team',
      title: 'Team Members',
      fields: ['ProjectManager', 'TeamMembers', 'Stakeholders'],
      defaultExpanded: false,
    },
  ]}
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Projects')
      .items.getById(123)
      .update(result.updates);
  }}
/>
```

### Smart Lookup Configuration

```typescript
<SPDynamicForm
  listId="Orders"
  mode="new"
  lookupThreshold={1000} // Switch to autocomplete at 1000 items
  lookupFieldConfig={[
    {
      fieldName: 'Customer',
      threshold: 5000, // Override for this field
      renderMode: 'autocomplete', // Force autocomplete
      searchFields: ['Title', 'CustomerCode', 'Email'],
      cacheResults: true,
    },
    {
      fieldName: 'Category',
      renderMode: 'dropdown', // Force dropdown even if > threshold
    },
  ]}
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Orders').items.add(result.updates);
  }}
/>
```

### Custom Field Rendering

```typescript
<SPDynamicForm
  listId="Tasks"
  mode="edit"
  itemId={123}
  customFields={[
    {
      fieldName: 'Priority',
      render: (props) => (
        <div>
          <Label required={props.field.required}>
            {props.field.displayName}
          </Label>
          <Slider
            min={1}
            max={5}
            value={props.value || 3}
            onChange={(value) => {
              // Custom logic
            }}
          />
        </div>
      ),
    },
  ]}
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Tasks')
      .items.getById(123)
      .update(result.updates);
  }}
/>
```

### With Attachments

```typescript
<SPDynamicForm
  listId="Documents"
  mode="new"
  showAttachments={true}
  attachmentPosition="bottom" // 'top', 'bottom', or 'section'
  maxAttachmentSize={10} // MB
  allowedFileTypes={['.pdf', '.docx', '.xlsx']}
  onSubmit={async (result) => {
    // Create item first
    const item = await SPContext.sp.web.lists
      .getByTitle('Documents')
      .items.add(result.updates);

    // Upload attachments
    for (const file of result.attachments.filesToAdd) {
      await SPContext.sp.web.lists
        .getByTitle('Documents')
        .items.getById(item.data.Id)
        .attachmentFiles.add(file.name, file);
    }

    console.log(`Created with ${result.attachments.filesToAdd.length} attachments`);
  }}
/>
```

### Edit with Attachment Management

```typescript
<SPDynamicForm
  listId="Documents"
  mode="edit"
  itemId={456}
  showAttachments={true}
  onSubmit={async (result) => {
    // Update item
    await SPContext.sp.web.lists
      .getByTitle('Documents')
      .items.getById(456)
      .update(result.updates);

    // Upload new attachments
    for (const file of result.attachments.filesToAdd) {
      await SPContext.sp.web.lists
        .getByTitle('Documents')
        .items.getById(456)
        .attachmentFiles.add(file.name, file);
    }

    // Delete removed attachments
    for (const fileName of result.attachments.filesToDelete) {
      await SPContext.sp.web.lists
        .getByTitle('Documents')
        .items.getById(456)
        .attachmentFiles.getByName(fileName)
        .delete();
    }

    console.log('Attachments updated');
  }}
/>
```

### Custom Validation

```typescript
<SPDynamicForm
  listId="Tasks"
  mode="new"
  customValidation={async (data) => {
    const errors: Record<string, string> = {};

    // Validate title length
    if (data.Title && data.Title.length < 5) {
      errors.Title = 'Title must be at least 5 characters';
    }

    // Validate due date
    if (data.DueDate && new Date(data.DueDate) < new Date()) {
      errors.DueDate = 'Due date must be in the future';
    }

    // Cross-field validation
    if (data.Priority === 'High' && !data.AssignedTo) {
      errors.AssignedTo = 'High priority tasks must have an assignee';
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }}
  validationMode="onChange" // 'onSubmit', 'onChange', 'onBlur', 'onTouched', or 'all'
  scrollToError={true} // Automatically scroll to first error
  onBeforeSubmit={async (data, changes) => {
    // Additional pre-submit logic
    console.log('About to submit:', changes);
  }}
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Tasks').items.add(result.updates);
  }}
  onError={(error, context) => {
    if (context === 'validation') {
      console.error('Validation failed:', error);
    } else if (context === 'submit') {
      console.error('Save failed:', error);
    }
  }}
/>
```

### Custom Buttons

```typescript
<SPDynamicForm
  listId="Tasks"
  mode="new"
  showDefaultButtons={false}
  renderButtons={({ onSave, onCancel, isSubmitting, isValid, isDirty }) => (
    <Stack horizontal tokens={{ childrenGap: 10 }}>
      <PrimaryButton
        text="Create Task"
        onClick={onSave}
        disabled={!isValid || isSubmitting}
        iconProps={{ iconName: 'Save' }}
      />
      <DefaultButton
        text="Reset"
        onClick={onCancel}
        disabled={isSubmitting}
        iconProps={{ iconName: 'Cancel' }}
      />
      {isDirty && (
        <MessageBar messageBarType={MessageBarType.info}>
          You have unsaved changes
        </MessageBar>
      )}
    </Stack>
  )}
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Tasks').items.add(result.updates);
  }}
/>
```

### Field Conditional Visibility

```typescript
<SPDynamicForm
  listId="Requests"
  mode="new"
  fieldVisibilityRules={[
    {
      fieldName: 'ApproverComments',
      showWhen: (formValues) => formValues.Status === 'Pending Approval',
    },
    {
      fieldName: 'RejectionReason',
      showWhen: (formValues) => formValues.Status === 'Rejected',
    },
    {
      fieldName: 'Budget',
      showWhen: (formValues) => formValues.RequestType === 'Financial',
    },
  ]}
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Requests').items.add(result.updates);
  }}
/>
```

### Custom Content Injection

```typescript
<SPDynamicForm
  listId="Projects"
  mode="new"
  customContent={[
    {
      position: 'before:Budget',
      render: (formValues) => (
        <MessageBar messageBarType={MessageBarType.info}>
          Budget approval required for amounts over $10,000
        </MessageBar>
      ),
      showWhen: (formValues) => formValues.Budget > 10000,
    },
    {
      position: 'after:Description',
      render: () => (
        <Text variant="small" styles={{ root: { fontStyle: 'italic', color: '#605e5c' } }}>
          Tip: Be specific and concise in your description
        </Text>
      ),
    },
    {
      position: 0, // At the very top
      render: (formValues) => (
        <MessageBar messageBarType={MessageBarType.warning}>
          {`High priority: ${formValues.Priority === 'High' ? 'Yes' : 'No'}`}
        </MessageBar>
      ),
      showWhen: (formValues) => formValues.Priority === 'High',
    },
  ]}
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Projects').items.add(result.updates);
  }}
/>
```

### Dirty Check and Confirmation

```typescript
<SPDynamicForm
  listId="Tasks"
  mode="edit"
  itemId={123}
  enableDirtyCheck={true} // Shows "unsaved changes" warning
  confirmOnCancel={true} // Confirms before canceling if dirty
  confirmMessage="You have unsaved changes. Are you sure you want to discard them?"
  onSubmit={async (result) => {
    if (!result.hasChanges) {
      alert('No changes to save');
      return;
    }
    await SPContext.sp.web.lists
      .getByTitle('Tasks')
      .items.getById(123)
      .update(result.updates);
  }}
/>
```

### Field Help Tooltips

```typescript
<SPDynamicForm
  listId="Projects"
  mode="new"
  showFieldHelp={true} // Shows info icon with field descriptions (default: true)
  fieldOverrides={[
    {
      fieldName: 'Budget',
      description: 'Enter the total project budget in USD. This should include all direct and indirect costs.',
    },
  ]}
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Projects').items.add(result.updates);
  }}
/>
```

### Compact Mode for Small Forms

```typescript
// Global compact mode - reduces spacing and padding
<SPDynamicForm
  listId="QuickNotes"
  mode="new"
  compact={true} // Reduces spacing from 16px to 8px and uses compact section padding
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('QuickNotes').items.add(result.updates);
  }}
/>

// Custom field spacing (overrides compact setting)
<SPDynamicForm
  listId="SimpleForm"
  mode="new"
  fieldSpacing={4} // Custom spacing in pixels
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('SimpleForm').items.add(result.updates);
  }}
/>

// Per-section compact mode
<SPDynamicForm
  listId="Projects"
  mode="new"
  sections={[
    {
      name: 'basic',
      title: 'Basic Info',
      fields: ['Title', 'Description'],
      compact: true, // This section uses compact padding
    },
    {
      name: 'details',
      title: 'Detailed Information',
      fields: ['Budget', 'Timeline', 'Resources'],
      compact: false, // This section uses comfortable padding
    },
  ]}
  onSubmit={async (result) => {
    await SPContext.sp.web.lists.getByTitle('Projects').items.add(result.updates);
  }}
/>
```

### With Event Handlers

```typescript
<SPDynamicForm
  listId="Projects"
  mode="edit"
  itemId={123}
  onBeforeLoad={async () => {
    console.log('About to load form...');
    // Return false to cancel loading
  }}
  onAfterLoad={(data, fields) => {
    console.log('Form loaded:', data);
    console.log('Fields:', fields.length);
  }}
  onBeforeSubmit={async (data, changes) => {
    console.log('About to submit:', changes);
    // Perform additional checks
    if (Object.keys(changes).length === 0) {
      alert('No changes detected');
      return false; // Cancel submission
    }
  }}
  onSubmit={async (result) => {
    console.log('Submitting:', result);
    await SPContext.sp.web.lists
      .getByTitle('Projects')
      .items.getById(123)
      .update(result.updates);
  }}
  onCancel={() => {
    console.log('Form cancelled');
    // Custom cancel logic
  }}
  onFieldChange={(fieldName, value, allValues) => {
    console.log(`Field "${fieldName}" changed to:`, value);
    // React to field changes
  }}
  onError={(error, context) => {
    console.error(`Error during ${context}:`, error);
  }}
/>
```

### Complete Example with All Features

```typescript
import * as React from 'react';
import { SPDynamicForm, IFormSubmitResult } from 'spfx-toolkit/lib/components/SPDynamicForm';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { z } from 'zod';

export const CompleteExample: React.FC = () => {
  const [itemId, setItemId] = React.useState<number>();

  const handleSubmit = async (result: IFormSubmitResult) => {
    try {
      if (result.mode === 'new') {
        // Create new item
        const item = await SPContext.sp.web.lists
          .getByTitle('Projects')
          .items.add(result.updates);

        // Upload attachments
        for (const file of result.attachments.filesToAdd) {
          await SPContext.sp.web.lists
            .getByTitle('Projects')
            .items.getById(item.data.Id)
            .attachmentFiles.add(file.name, file);
        }

        setItemId(item.data.Id);
        alert(`Project created successfully! ID: ${item.data.Id}`);
      } else if (result.mode === 'edit') {
        // Update existing item
        if (result.hasChanges) {
          await SPContext.sp.web.lists
            .getByTitle('Projects')
            .items.getById(result.itemId!)
            .update(result.updates);

          // Handle attachments
          for (const file of result.attachments.filesToAdd) {
            await SPContext.sp.web.lists
              .getByTitle('Projects')
              .items.getById(result.itemId!)
              .attachmentFiles.add(file.name, file);
          }

          for (const fileName of result.attachments.filesToDelete) {
            await SPContext.sp.web.lists
              .getByTitle('Projects')
              .items.getById(result.itemId!)
              .attachmentFiles.getByName(fileName)
              .delete();
          }

          alert('Project updated successfully!');
        } else {
          alert('No changes to save');
        }
      }
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <SPDynamicForm
      listId="Projects"
      mode={itemId ? 'edit' : 'new'}
      itemId={itemId}
      contentTypeId="0x0100..." // Optional: specific content type
      // Field configuration
      fieldOrder={['Title', 'Description', 'StartDate', 'EndDate', 'ProjectManager']}
      excludeFields={['_Hidden', 'InternalUseOnly']}
      fieldOverrides={[
        {
          fieldName: 'Title',
          label: 'Project Name',
          required: true,
        },
        {
          fieldName: 'Status',
          defaultValue: 'Planning',
        },
      ]}
      // Sections
      sections={[
        {
          name: 'general',
          title: 'General Information',
          fields: ['Title', 'Description', 'Status'],
          defaultExpanded: true,
        },
        {
          name: 'schedule',
          title: 'Project Schedule',
          fields: ['StartDate', 'EndDate', 'Duration'],
          defaultExpanded: false,
        },
        {
          name: 'team',
          title: 'Project Team',
          fields: ['ProjectManager', 'TeamMembers'],
          defaultExpanded: false,
        },
      ]}
      // Lookup optimization
      lookupThreshold={5000}
      // Validation
      customValidation={async (data) => {
        const errors: Record<string, string> = {};
        if (data.Title && data.Title.length < 3) {
          errors.Title = 'Project name must be at least 3 characters';
        }
        if (data.EndDate && data.StartDate && new Date(data.EndDate) < new Date(data.StartDate)) {
          errors.EndDate = 'End date must be after start date';
        }
        return Object.keys(errors).length > 0 ? errors : null;
      }}
      validationMode="onChange"
      scrollToError={true}
      // Attachments
      showAttachments={true}
      attachmentPosition="bottom"
      maxAttachmentSize={10}
      allowedFileTypes={['.pdf', '.docx', '.xlsx', '.png', '.jpg']}
      // UI
      saveButtonText="Save Project"
      cancelButtonText="Reset"
      // Events
      onBeforeLoad={async () => {
        SPContext.logger.info('Loading project form...');
      }}
      onAfterLoad={(data, fields) => {
        SPContext.logger.success(`Form loaded with ${fields.length} fields`);
      }}
      onBeforeSubmit={async (data, changes) => {
        SPContext.logger.info('Validating before submit...', changes);
      }}
      onSubmit={handleSubmit}
      onCancel={() => {
        if (confirm('Discard changes?')) {
          setItemId(undefined);
        }
      }}
      onFieldChange={(name, value) => {
        console.log(`${name} =`, value);
      }}
      onError={(error, context) => {
        SPContext.logger.error(`Error during ${context}`, error);
      }}
      // Advanced
      cacheFields={true}
      enableDirtyCheck={true}
      scrollToError={true}
    />
  );
};
```

## 📋 Props Reference

### Required Props

| Prop       | Type                                 | Description                       |
| ---------- | ------------------------------------ | --------------------------------- |
| `listId`   | `string`                             | List GUID or title                |
| `mode`     | `'new' \| 'edit' \| 'view'`          | Form mode                         |
| `onSubmit` | `(result: IFormSubmitResult) => void | Promise<void>`                    | Form submission handler |

### Item Props

| Prop            | Type     | Description                              |
| --------------- | -------- | ---------------------------------------- |
| `itemId`        | `number` | Item ID (required for edit/view modes)   |
| `contentTypeId` | `string` | Specific ContentType ID to use           |

### Field Control Props

| Prop             | Type                    | Description                           |
| ---------------- | ----------------------- | ------------------------------------- |
| `fields`         | `string[]`              | Explicit field list (overrides auto-load) |
| `excludeFields`  | `string[]`              | Fields to exclude                     |
| `fieldOverrides` | `IFieldOverride[]`      | Field-specific overrides              |
| `customFields`   | `ICustomFieldRenderer[]` | Custom field renderers                |

### Ordering Props

| Prop                   | Type      | Default | Description                         |
| ---------------------- | --------- | ------- | ----------------------------------- |
| `fieldOrder`           | `string[]` |         | Manual field order (internal names) |
| `useContentTypeOrder`  | `boolean` | `true`  | Use ContentType field order         |

### Section Props

| Prop                   | Type              | Default | Description                           |
| ---------------------- | ----------------- | ------- | ------------------------------------- |
| `sections`             | `ISectionConfig[]` |         | Manual section definitions            |
| `useContentTypeGroups` | `boolean`         | `true`  | Use ContentType groups for sections   |
| `customContent`        | `ICustomContent[]` |         | Custom content between fields         |

### Lookup Optimization Props

| Prop                | Type                   | Default | Description                                   |
| ------------------- | ---------------------- | ------- | --------------------------------------------- |
| `lookupThreshold`   | `number`               | `5000`  | Threshold for autocomplete (items)            |
| `lookupFieldConfig` | `ILookupFieldConfig[]` |         | Per-field lookup configuration                |

### Validation Props

| Prop                | Type                                                              | Default      | Description                        |
| ------------------- | ----------------------------------------------------------------- | ------------ | ---------------------------------- |
| `customValidation`  | `(data: T) => Promise<Record<string, string> \| null> \| Record<string, string> \| null` |              | Custom form-level validation       |
| `validationMode`    | `'onSubmit' \| 'onChange' \| 'onBlur' \| 'onTouched' \| 'all'`    | `'onSubmit'` | Validation trigger mode            |

### Button Props

| Prop                  | Type                                          | Default | Description                      |
| --------------------- | --------------------------------------------- | ------- | -------------------------------- |
| `showDefaultButtons`  | `boolean`                                     | `true`  | Show default Save/Cancel buttons |
| `renderButtons`       | `(props: IFormButtonProps) => ReactElement`   |         | Custom button renderer           |
| `saveButtonText`      | `string`                                      | `'Save'` | Save button text                |
| `cancelButtonText`    | `string`                                      | `'Cancel'` | Cancel button text            |

### Attachment Props

| Prop                   | Type                                | Default    | Description                          |
| ---------------------- | ----------------------------------- | ---------- | ------------------------------------ |
| `showAttachments`      | `boolean`                           | auto-detect | Show attachment field               |
| `attachmentPosition`   | `'top' \| 'bottom' \| 'section'`    | `'bottom'` | Attachment field position            |
| `attachmentSectionName` | `string`                           |            | Section for attachments (if 'section') |
| `maxAttachmentSize`    | `number`                            | `10`       | Max file size in MB                  |
| `allowedFileTypes`     | `string[]`                          |            | Allowed file extensions              |

### UI Props

| Prop       | Type      | Description              |
| ---------- | --------- | ------------------------ |
| `loading`  | `boolean` | Show loading state       |
| `disabled` | `boolean` | Disable entire form      |
| `readOnly` | `boolean` | Force read-only mode     |
| `className` | `string` | Custom CSS class         |

### Event Props

| Prop               | Type                                                   | Description                             |
| ------------------ | ------------------------------------------------------ | --------------------------------------- |
| `onBeforeLoad`     | `() => Promise<void \| boolean>`                       | Called before fields load               |
| `onAfterLoad`      | `(data: T, fields: IFieldMetadata[]) => void`          | Called after load                       |
| `onBeforeSubmit`   | `(data: T, changes: Partial<T>) => Promise<void \| boolean>` | Called before submit (can cancel)  |
| `onError`          | `(error: Error, context: 'load' \| 'validation' \| 'submit') => void` | Error handler            |
| `onCancel`         | `() => void`                                           | Cancel button handler                   |
| `onFieldChange`    | `(name: string, value: any, all: T) => void`           | Field change handler                    |

### Advanced Props

| Prop                     | Type                    | Default                                          | Description                               |
| ------------------------ | ----------------------- | ------------------------------------------------ | ----------------------------------------- |
| `cacheFields`            | `boolean`               | `true`                                           | Cache field metadata                      |
| `enableDirtyCheck`       | `boolean`               | `false`                                          | Show unsaved changes warning              |
| `confirmOnCancel`        | `boolean`               | `false`                                          | Confirm before canceling if dirty         |
| `confirmMessage`         | `string`                | `'You have unsaved changes...'`                  | Custom confirmation message               |
| `scrollToError`          | `boolean`               | `true`                                           | Scroll to first error on validation       |
| `showFieldHelp`          | `boolean`               | `true`                                           | Show info icon with field descriptions    |
| `fieldVisibilityRules`   | `IFieldVisibilityRule[]` |                                                  | Field conditional visibility rules        |
| `customContent`          | `ICustomContent<T>[]`   |                                                  | Custom content to inject between fields   |
| `compact`                | `boolean`               | `false`                                          | Compact mode (reduces spacing to 8px)     |
| `fieldSpacing`           | `number`                |                                                  | Custom field spacing in pixels            |

## 📊 IFormSubmitResult Interface

```typescript
interface IFormSubmitResult<T> {
  // Form data
  formData: T;              // Complete form data
  changes: Partial<T>;      // Only changed fields (edit mode)
  isValid: boolean;         // Validation status

  // SPUpdater
  updater: SPUpdater;       // SPUpdater instance
  updates: any;             // Ready for item.update()

  // Attachments
  attachments: {
    filesToAdd: File[];     // New files to upload
    filesToDelete: string[]; // Files to delete
  };

  // Metadata
  mode: 'new' | 'edit' | 'view';
  itemId?: number;
  listId: string;
  hasChanges: boolean;      // Any changes detected
}
```

## 🎨 Supported Field Types

- ✅ **Text** - Single-line text
- ✅ **Note** - Multi-line text / Rich text
- ✅ **Number** - Number / Currency
- ✅ **Boolean** - Yes/No checkbox
- ✅ **DateTime** - Date / Date and Time
- ✅ **Choice** - Dropdown / Radio buttons
- ✅ **MultiChoice** - Checkboxes
- ✅ **User** - People Picker (single/multi)
- ✅ **Lookup** - Lookup (single/multi) with smart rendering
- ✅ **Url** - Hyperlink with description
- ✅ **Taxonomy** - Managed Metadata (single/multi)
- ✅ **Attachments** - File upload/download/delete

## ⚡ Performance Best Practices

1. **Enable field caching** (default):
   ```typescript
   <SPDynamicForm cacheFields={true} />
   ```

2. **Use specific field list** when possible:
   ```typescript
   <SPDynamicForm fields={['Title', 'Status', 'DueDate']} />
   ```

3. **Configure lookup thresholds**:
   ```typescript
   <SPDynamicForm lookupThreshold={1000} />
   ```

4. **Use sections for large forms**:
   ```typescript
   <SPDynamicForm useContentTypeGroups={true} />
   ```

## 🔍 Troubleshooting

### Form not loading

- Verify SPContext is initialized
- Check list ID/title is correct
- For edit/view, verify itemId is provided

### Field not showing

- Check if field is hidden in SharePoint
- Check excludeFields prop
- Verify field is not read-only (in new mode)

### Lookup showing dropdown for large list

- Check lookupThreshold setting
- Verify lookup field optimization is working (check console logs)
- Use lookupFieldConfig to force autocomplete mode

### Validation not working

- Check customValidation function returns correct format (Record<string, string> | null)
- Ensure error keys match field internal names
- Use onError to debug validation issues
- Check scrollToError is enabled if errors aren't visible

### Attachments not working

- Verify list has attachments enabled
- Check mode is not 'view'
- Verify file size and type restrictions

## 🎓 Advanced Topics

### Change Detection

The component uses `createSPUpdater` from listItemHelper for automatic change detection:

```typescript
onSubmit={async (result) => {
  console.log('Changed fields:', Object.keys(result.changes));
  console.log('Has changes:', result.hasChanges);

  if (!result.hasChanges) {
    alert('No changes detected');
    return;
  }

  // Only changed fields are in result.updates
  await SPContext.sp.web.lists
    .getByTitle('Tasks')
    .items.getById(itemId)
    .update(result.updates);
}}
```

### Conditional Logic

React to field changes and update other fields:

```typescript
onFieldChange={(fieldName, value, allValues) => {
  if (fieldName === 'Status' && value === 'Completed') {
    // Auto-set completion date
    form.setValue('CompletionDate', new Date());
  }
}}
```

### Form State Management

Access form state directly:

```typescript
const form = useForm<T>();

<SPDynamicForm
  control={form.control} // Pass external control
  onFieldChange={(name, value) => {
    // Custom logic
    if (name === 'Priority' && value === 'High') {
      form.setError('AssignedTo', {
        message: 'High priority tasks require an assignee'
      });
    }
  }}
/>
```

## 📝 Bundle Size Impact

- **Core component**: ~15KB (gzipped)
- **With all dependencies**: ~40KB (gzipped)
- Uses tree-shakable imports for minimal bundle impact
- Field components loaded on-demand

## 🔗 Related Components

- [SPField](../spFields/README.md) - Individual field components
- [Card](../Card/README.md) - Section wrapper component
- [FormContext](../spForm/FormContext/README.md) - Form state management

## 📚 Resources

- [PnP DynamicForm](https://pnp.github.io/sp-dev-fx-controls-react/controls/DynamicForm/) - Original inspiration
- [React Hook Form](https://react-hook-form.com/) - Form library
- [Zod](https://zod.dev/) - Validation library
- [SPContext](../../utilities/context/README.md) - SharePoint context management

## 🤝 Contributing

See [CLAUDE.md](../../CLAUDE.md) for development guidelines.

## 📄 License

MIT
