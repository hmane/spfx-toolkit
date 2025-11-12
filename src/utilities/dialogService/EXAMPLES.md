# DialogService - Quick Examples

## Basic Usage

### Loading Overlay

```typescript
import { showLoading, hideLoading } from 'spfx-toolkit/lib/utilities/dialogService';

// Simple loading
showLoading('Loading data...');
await fetchData();
hideLoading();

// Update message during process
showLoading('Initializing...');
await init();
showLoading('Processing...');
await process();
hideLoading();
```

### Alert Dialog

```typescript
import { alert } from 'spfx-toolkit/lib/utilities/dialogService';

// Simple alert
await alert('Operation completed successfully!');

// Custom alert
await alert('The file has been deleted.', {
  title: 'Success',
  buttonText: 'Close'
});
```

### Confirm Dialog

```typescript
import { confirm } from 'spfx-toolkit/lib/utilities/dialogService';

// Simple yes/no
const result = await confirm('Are you sure you want to delete this item?');
if (result) {
  await deleteItem();
}

// Custom buttons
const choice = await confirm('What would you like to do?', {
  title: 'Choose Action',
  buttons: [
    { text: 'Save', primary: true, value: 'save' },
    { text: 'Discard', value: 'discard' },
    { text: 'Cancel', value: 'cancel' }
  ]
});

if (choice === 'save') {
  await saveChanges();
}
```

## Real-World SPFx Examples

### Example 1: Form Submission

```typescript
import { showLoading, hideLoading, alert } from 'spfx-toolkit/lib/utilities/dialogService';
import { sp } from '@pnp/sp';

public async submitForm(): Promise<void> {
  try {
    showLoading('Submitting form...');

    await sp.web.lists.getByTitle('MyList').items.add({
      Title: this.state.title,
      Description: this.state.description
    });

    hideLoading();
    await alert('Form submitted successfully!', { title: 'Success' });

    // Redirect or refresh
    window.location.href = '/sites/mysite/lists/MyList';
  } catch (error) {
    hideLoading();
    await alert(`Failed to submit form: ${error.message}`, {
      title: 'Error',
      buttonText: 'Close'
    });
  }
}
```

### Example 2: Delete with Confirmation

```typescript
import { confirm, showLoading, hideLoading, alert } from 'spfx-toolkit/lib/utilities/dialogService';
import { sp } from '@pnp/sp';

public async deleteItem(itemId: number): Promise<void> {
  const confirmed = await confirm('This action cannot be undone. Are you sure?', {
    title: 'Delete Item',
    buttons: [
      {
        text: 'Delete',
        primary: true,
        value: true,
        props: {
          styles: { root: { backgroundColor: '#a4262c', borderColor: '#a4262c' } }
        }
      },
      { text: 'Cancel', value: false }
    ]
  });

  if (!confirmed) {
    return;
  }

  try {
    showLoading('Deleting item...');
    await sp.web.lists.getByTitle('MyList').items.getById(itemId).delete();
    hideLoading();

    await alert('Item deleted successfully.', { title: 'Success' });

    // Refresh list
    this.loadItems();
  } catch (error) {
    hideLoading();
    await alert(`Failed to delete item: ${error.message}`, { title: 'Error' });
  }
}
```

### Example 3: Multi-Step Process

```typescript
import { showLoading, hideLoading, alert } from 'spfx-toolkit/lib/utilities/dialogService';
import { sp } from '@pnp/sp';

public async importData(file: File): Promise<void> {
  try {
    showLoading('Step 1/4: Reading file...');
    const data = await this.readFile(file);

    showLoading('Step 2/4: Validating data...');
    const validationResult = await this.validateData(data);

    if (!validationResult.isValid) {
      hideLoading();
      await alert(`Validation failed: ${validationResult.errors.join(', ')}`, {
        title: 'Validation Error'
      });
      return;
    }

    showLoading('Step 3/4: Processing records...');
    const processed = await this.processRecords(data);

    showLoading('Step 4/4: Saving to SharePoint...');
    await this.saveToSharePoint(processed);

    hideLoading();
    await alert(`Successfully imported ${processed.length} records.`, {
      title: 'Import Complete'
    });
  } catch (error) {
    hideLoading();
    await alert(`Import failed: ${error.message}`, { title: 'Error' });
  }
}
```

### Example 4: Batch Operations with Choice

```typescript
import { confirm, showLoading, hideLoading, alert } from 'spfx-toolkit/lib/utilities/dialogService';
import { sp } from '@pnp/sp';

public async handleBulkAction(selectedItems: number[]): Promise<void> {
  if (selectedItems.length === 0) {
    await alert('Please select at least one item.', { title: 'No Selection' });
    return;
  }

  const action = await confirm(`You have selected ${selectedItems.length} item(s). What would you like to do?`, {
    title: 'Bulk Actions',
    buttons: [
      { text: 'Approve All', primary: true, value: 'approve' },
      { text: 'Reject All', value: 'reject' },
      { text: 'Delete All', value: 'delete' },
      { text: 'Cancel', value: null }
    ]
  });

  if (!action) {
    return;
  }

  // Confirm destructive actions
  if (action === 'delete') {
    const confirmDelete = await confirm(
      `This will permanently delete ${selectedItems.length} item(s). Continue?`,
      {
        title: 'Confirm Delete',
        isDismissable: false
      }
    );

    if (!confirmDelete) {
      return;
    }
  }

  try {
    showLoading(`Processing ${selectedItems.length} item(s)...`);

    const list = sp.web.lists.getByTitle('MyList');
    const batch = sp.web.createBatch();

    selectedItems.forEach(itemId => {
      const item = list.items.getById(itemId);

      switch (action) {
        case 'approve':
          item.inBatch(batch).update({ Status: 'Approved' });
          break;
        case 'reject':
          item.inBatch(batch).update({ Status: 'Rejected' });
          break;
        case 'delete':
          item.inBatch(batch).delete();
          break;
      }
    });

    await batch.execute();
    hideLoading();

    await alert(`Successfully processed ${selectedItems.length} item(s).`, {
      title: 'Success'
    });

    // Refresh list
    this.loadItems();
  } catch (error) {
    hideLoading();
    await alert(`Failed to process items: ${error.message}`, { title: 'Error' });
  }
}
```

### Example 5: React Component Integration

```typescript
import * as React from 'react';
import { showLoading, hideLoading, alert, confirm } from 'spfx-toolkit/lib/utilities/dialogService';
import { PrimaryButton } from '@fluentui/react/lib/Button';

export const MyComponent: React.FC = () => {
  const handleSave = async (): Promise<void> => {
    try {
      showLoading('Saving changes...');
      await saveData();
      hideLoading();
      await alert('Changes saved successfully!', { title: 'Success' });
    } catch (error) {
      hideLoading();
      await alert(`Error: ${error.message}`, { title: 'Error' });
    }
  };

  const handleDelete = async (): Promise<void> {
    const confirmed = await confirm('Delete this item?', {
      title: 'Confirm Delete'
    });

    if (!confirmed) {
      return;
    }

    try {
      showLoading('Deleting...');
      await deleteData();
      hideLoading();
      await alert('Item deleted.', { title: 'Success' });
    } catch (error) {
      hideLoading();
      await alert(`Error: ${error.message}`, { title: 'Error' });
    }
  };

  return (
    <div>
      <PrimaryButton text="Save" onClick={handleSave} />
      <PrimaryButton text="Delete" onClick={handleDelete} />
    </div>
  );
};
```

## Best Practices

### 1. Always Use Finally Block

```typescript
// ✅ GOOD
try {
  showLoading('Processing...');
  await operation();
} finally {
  hideLoading();
}

// ❌ AVOID
try {
  showLoading('Processing...');
  await operation();
  hideLoading();
} catch (error) {
  hideLoading(); // Duplicated code
}
```

### 2. Provide Meaningful Messages

```typescript
// ✅ GOOD
showLoading('Uploading 3 of 10 files...');
await alert('Your document has been saved to the Documents library.', { title: 'Success' });

// ❌ AVOID
showLoading('Please wait...');
await alert('Done');
```

### 3. Use Appropriate Confirmation Buttons

```typescript
// ✅ GOOD - Clear actions
const choice = await confirm('Save changes before closing?', {
  buttons: [
    { text: 'Save', primary: true, value: 'save' },
    { text: 'Discard', value: 'discard' },
    { text: 'Cancel', value: null }
  ]
});

// ❌ AVOID - Unclear buttons
const choice = await confirm('What do you want to do?', {
  buttons: [
    { text: 'Option 1', value: 1 },
    { text: 'Option 2', value: 2 }
  ]
});
```

### 4. Handle Errors Gracefully

```typescript
// ✅ GOOD
try {
  showLoading('Processing...');
  await operation();
  hideLoading();
  await alert('Operation completed successfully!', { title: 'Success' });
} catch (error) {
  hideLoading();
  await alert(`Operation failed: ${error.message}`, {
    title: 'Error',
    buttonText: 'Close'
  });
}
```

### 5. Chain Dialogs Sequentially

```typescript
// ✅ GOOD - Sequential
await alert('First message');
await alert('Second message');

// ❌ AVOID - Parallel (only last shows)
alert('First message');
alert('Second message');
```
