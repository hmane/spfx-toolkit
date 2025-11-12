# DialogService Utility

A comprehensive utility for managing loading overlays, alerts, and confirm dialogs in SPFx applications using Fluent UI components.

## Features

- **Loading Overlay**: Block UI with customizable loading messages
- **Alert Dialog**: Show informational messages with Fluent UI styling
- **Confirm Dialog**: Configurable confirmation dialogs with custom buttons
- **Promise-based API**: Async/await support for clean code
- **Singleton Pattern**: Single instance manages all dialogs
- **Tree-shakable**: Import only what you need

## Installation

```typescript
// Import specific functions (recommended for tree-shaking)
import { showLoading, hideLoading, alert, confirm } from 'spfx-toolkit/lib/utilities/dialogService';

// Or import all at once
import * as dialogService from 'spfx-toolkit/lib/utilities/dialogService';
```

## Usage

### Loading Overlay

Block the UI while performing async operations with string or JSX content. Supports both **global (full-screen)** and **scoped (component-level)** loading overlays.

#### Global Loading (Default)

```typescript
import { showLoading, hideLoading } from 'spfx-toolkit/lib/utilities/dialogService';
import * as React from 'react';

// Basic usage with string
showLoading('Loading data...');
await fetchData();
hideLoading();

// JSX content for rich loading messages
showLoading(
  <div>
    <strong>Loading data...</strong>
    <div style={{ marginTop: '8px', fontSize: '12px' }}>
      Please wait while we fetch your information.
    </div>
  </div>
);
await fetchData();
hideLoading();

// Update message during operation (smoothly updates without flickering)
showLoading('Initializing...');
await initialize();

showLoading('Loading data...');
await loadData();

showLoading('Finalizing...');
await finalize();

hideLoading();

// Note: The spinner animation continues smoothly when updating messages.
// If you need to update very frequently (e.g., progress bars), use customIcon
// option to prevent any visual glitches (see "Custom Loading Icons" section).

// With try-catch
try {
  showLoading('Processing...');
  await processData();
} finally {
  hideLoading();
}
```

#### Scoped Loading (Component-Level)

Show loading overlay scoped to a specific container instead of blocking the entire screen:

```typescript
import { showLoading, hideLoading } from 'spfx-toolkit/lib/utilities/dialogService';

// Scoped to a specific container
showLoading('Loading chart data...', { containerId: 'chart-container' });
await loadChartData();
hideLoading('chart-container');

// Multiple scoped loaders simultaneously
showLoading('Loading chart...', { containerId: 'chart-1' });
showLoading('Loading table...', { containerId: 'table-1' });

await Promise.all([loadChart(), loadTable()]);

hideLoading('chart-1');
hideLoading('table-1');

// Or hide all loaders at once
hideLoading();
```

**Important**: The target container must have `position: relative`, `absolute`, or `fixed` for the overlay to display correctly:

```typescript
<div
  id="chart-container"
  style={{ position: 'relative', minHeight: '400px' }}
>
  {/* Chart content */}
</div>
```

**Container Not Found**: If the specified `containerId` doesn't exist, the overlay will automatically fallback to global mode with a console warning:

```typescript
showLoading('Loading...', { containerId: 'non-existent' });
// Console: "DialogService: Container '#non-existent' not found. Using global overlay instead."
```

#### Custom Loading Icons

You can provide a custom loading icon to replace the default Fluent UI Spinner. This is particularly useful when:
- Updating loading messages frequently (prevents spinner restart glitch)
- Using custom brand spinners or animations
- Displaying static icons instead of animated spinners

```typescript
import { showLoading, hideLoading } from 'spfx-toolkit/lib/utilities/dialogService';
import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';

// Custom animated icon
showLoading('Processing...', {
  customIcon: (
    <div style={{ animation: 'spin 1s linear infinite' }}>
      <Icon iconName="Sync" style={{ fontSize: '32px', color: '#0078d4' }} />
    </div>
  )
});

// Static icon (no animation)
showLoading('Please wait...', {
  customIcon: <Icon iconName="HourGlass" style={{ fontSize: '32px' }} />
});

// Custom HTML/CSS spinner
showLoading('Loading...', {
  customIcon: <div className="my-custom-spinner" />
});

// Prevents glitching when updating message frequently
const totalFiles = 10;
for (let i = 1; i <= totalFiles; i++) {
  showLoading(
    `Processing file ${i} of ${totalFiles}...`,
    { customIcon: <MyBrandSpinner /> }
  );
  await processFile(i);
}
hideLoading();
```

**Note**: When using `customIcon`, the default Fluent UI Spinner is completely replaced. The custom icon should handle its own styling and animations.

**Loading Overlay API:**

```typescript
/**
 * Show loading overlay
 * @param message - Loading message (string or JSX, default: 'Loading...')
 * @param options - Loading options
 * @returns Loader ID for tracking
 */
showLoading(message?: React.ReactNode, options?: {
  containerId?: string;   // Optional container ID for scoped loading
  customIcon?: React.ReactNode;  // Custom loading icon (replaces default Spinner)
}): string;

/**
 * Hide loading overlay
 * @param containerId - Optional container ID to hide specific scoped loader
 *                      If undefined, hides all loaders
 */
hideLoading(containerId?: string): void;
```

### Alert Dialog

Show informational messages with string or JSX content:

```typescript
import { alert } from 'spfx-toolkit/lib/utilities/dialogService';
import * as React from 'react';

// Basic alert with string
await alert('Operation completed successfully!');

// JSX content for rich messages
await alert(
  <div>
    <p>Your changes have been saved successfully!</p>
    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
      <li>Item 1 updated</li>
      <li>Item 2 created</li>
      <li>3 files uploaded</li>
    </ul>
  </div>,
  { title: 'Success' }
);

// Custom title and button text
await alert('The item has been saved.', {
  title: 'Success',
  buttonText: 'Close'
});

// JSX title and message
await alert(
  <div>Please review the following errors before continuing.</div>,
  {
    title: <span style={{ color: '#a4262c' }}>⚠️ Validation Error</span>,
    buttonText: 'Close'
  }
);

// Non-dismissable alert
await alert('Please read this important message.', {
  title: 'Important',
  isDismissable: false
});

// Custom styling
await alert('Error occurred', {
  title: 'Error',
  className: 'my-error-dialog'
});
```

**Alert API:**

```typescript
/**
 * Show alert dialog
 * @param message - Alert message (string or JSX)
 * @param options - Additional options
 * @returns Promise that resolves when dismissed
 */
alert(message: React.ReactNode, options?: {
  title?: React.ReactNode;     // Dialog title (string or JSX, default: 'Alert')
  buttonText?: string;         // Button text (default: 'OK')
  isDismissable?: boolean;     // Can dismiss with ESC/backdrop (default: true)
  className?: string;          // Custom CSS class
  dialogContentProps?: any;    // Fluent UI dialog props
  width?: string;              // Dialog width (e.g., '500px', '80%')
  maxWidth?: string;           // Dialog max width (default: 340px)
  minWidth?: string;           // Dialog min width
}): Promise<void>;
```

### Confirm Dialog

#### Simple Yes/No Confirmation

```typescript
import { confirm } from 'spfx-toolkit/lib/utilities/dialogService';
import * as React from 'react';

// String message
const result = await confirm('Are you sure you want to delete this item?');

if (result) {
  // User clicked OK (returns true)
  await deleteItem();
} else {
  // User clicked Cancel or dismissed (returns false)
  console.log('Cancelled');
}

// JSX message
const result = await confirm(
  <div>
    <strong>Warning:</strong> This action cannot be undone.
    <p style={{ marginTop: '8px' }}>
      Deleting this item will also remove all associated data.
    </p>
  </div>
);
```

#### Custom Title

```typescript
const result = await confirm('This action cannot be undone.', {
  title: 'Delete Confirmation'
});

// JSX title
const result = await confirm('This action cannot be undone.', {
  title: <span style={{ color: '#d13438' }}>⚠️ Warning</span>
});
```

#### Custom Buttons

```typescript
const choice = await confirm('Choose an option:', {
  title: 'Save Changes',
  buttons: [
    { text: 'Save', primary: true, value: 'save' },
    { text: 'Discard', value: 'discard' },
    { text: 'Cancel', value: 'cancel' }
  ]
});

switch (choice) {
  case 'save':
    await saveChanges();
    break;
  case 'discard':
    discardChanges();
    break;
  case 'cancel':
  default:
    // User cancelled
    break;
}
```

#### Dialog Sizing and Button Layouts

**Button Spacing**: All buttons have proper 8px gap spacing in both horizontal (≤3 buttons) and vertical (>3 buttons) layouts.

When you have many buttons or need wider dialogs, use sizing options:

```typescript
// Wide dialog for long content
const result = await confirm('Select your preferred action:', {
  title: 'Document Actions',
  maxWidth: '600px',  // Increase from default 340px
  buttons: [
    { text: 'Download', primary: true, value: 'download' },
    { text: 'Share', value: 'share' },
    { text: 'Delete', value: 'delete' },
    { text: 'Archive', value: 'archive' },
    { text: 'Cancel', value: null }
  ]
});

// Vertical button layout (auto-enables for > 3 buttons)
const result = await confirm('Choose one of the following options:', {
  title: 'Select Action',
  maxWidth: '500px',
  stackButtons: true,  // Force vertical layout
  buttons: [
    { text: 'Option 1', primary: true, value: 1 },
    { text: 'Option 2', value: 2 },
    { text: 'Option 3', value: 3 },
    { text: 'Option 4', value: 4 },
    { text: 'Cancel', value: null }
  ]
});

// Custom width for specific layouts
await alert('This is a wider alert message.', {
  title: 'Information',
  width: '500px',      // Fixed width
  minWidth: '400px',   // Minimum width
  maxWidth: '90vw'     // Maximum width (responsive)
});
```

#### Custom Button Props (Fluent UI)

```typescript
const result = await confirm('Permanently delete this file?', {
  title: 'Warning',
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
```

#### Non-Dismissable Dialogs

Force users to make an explicit choice by preventing ESC key or backdrop click dismissal:

```typescript
// Confirm - user MUST click a button
const result = await confirm('You must make a choice.', {
  title: 'Required Action',
  isDismissable: false  // Cannot close with ESC or backdrop click
});

// Alert - user MUST click OK button
await alert('Please read this important message.', {
  title: 'Important',
  isDismissable: false  // Cannot close with ESC or backdrop click
});
```

**Default behavior**: `isDismissable: true` (users can press ESC or click backdrop to dismiss).

**Confirm API:**

```typescript
/**
 * Show confirm dialog
 * @param message - Confirm message (string or JSX)
 * @param options - Additional options
 * @returns Promise that resolves with button value
 */
confirm(message: React.ReactNode, options?: {
  title?: React.ReactNode;     // Dialog title (string or JSX, default: 'Confirm')
  buttons?: Array<{            // Custom buttons
    text: string;              // Button text
    primary?: boolean;         // Is primary button
    value?: any;               // Value returned when clicked
    props?: any;               // Fluent UI button props
  }>;
  isDismissable?: boolean;     // Can dismiss with ESC/backdrop (default: true)
  className?: string;          // Custom CSS class
  dialogContentProps?: any;    // Fluent UI dialog props
  width?: string;              // Dialog width (e.g., '500px', '80%')
  maxWidth?: string;           // Dialog max width (default: 340px)
  minWidth?: string;           // Dialog min width
  stackButtons?: boolean;      // Force vertical button layout (auto if >3 buttons)
}): Promise<any>;
```

## Advanced Examples

### Using JSX Content

#### Rich Loading Messages

```typescript
import { showLoading, hideLoading } from 'spfx-toolkit/lib/utilities/dialogService';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import * as React from 'react';

// With icons and formatting
showLoading(
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
      Uploading Files
    </div>
    <div style={{ fontSize: '13px', color: '#605e5c' }}>
      Processing 3 of 10 files...
    </div>
  </div>
);

// With progress indicator
const filesUploaded = 7;
const totalFiles = 10;
showLoading(
  <div>
    <strong>Uploading files...</strong>
    <div style={{ marginTop: '12px' }}>
      <div style={{
        width: '100%',
        height: '4px',
        backgroundColor: '#edebe9',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${(filesUploaded / totalFiles) * 100}%`,
          height: '100%',
          backgroundColor: '#0078d4',
          transition: 'width 0.3s ease'
        }} />
      </div>
      <div style={{ marginTop: '4px', fontSize: '12px', color: '#605e5c' }}>
        {filesUploaded} of {totalFiles} files uploaded
      </div>
    </div>
  </div>
);
```

#### Rich Alert Messages

```typescript
import { alert } from 'spfx-toolkit/lib/utilities/dialogService';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import * as React from 'react';

// Success message with details
await alert(
  <div>
    <MessageBar messageBarType={MessageBarType.success}>
      Your changes have been saved successfully!
    </MessageBar>
    <div style={{ marginTop: '16px' }}>
      <strong>Updated items:</strong>
      <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
        <li>Project Title → "New Project"</li>
        <li>Status → "Active"</li>
        <li>Assigned To → John Doe</li>
      </ul>
    </div>
  </div>,
  { title: '✅ Success', buttonText: 'Close' }
);

// Error message with instructions
await alert(
  <div>
    <div style={{ color: '#a4262c', fontWeight: 600, marginBottom: '12px' }}>
      The following errors occurred:
    </div>
    <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
      <li>Title field is required</li>
      <li>Due date must be in the future</li>
      <li>Budget cannot exceed $100,000</li>
    </ul>
    <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fef0f1', borderRadius: '4px' }}>
      <strong>Next steps:</strong> Please correct the errors above and try again.
    </div>
  </div>,
  { title: 'Validation Failed' }
);

// Information with links
await alert(
  <div>
    <p>Your document has been shared with the team.</p>
    <div style={{ marginTop: '12px' }}>
      <a href="https://contoso.sharepoint.com/sites/team/documents/report.docx" target="_blank">
        View Document
      </a>
    </div>
  </div>,
  { title: 'Document Shared' }
);
```

#### Rich Confirm Dialogs

```typescript
import { confirm } from 'spfx-toolkit/lib/utilities/dialogService';
import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';

// Confirm with detailed information
const result = await confirm(
  <div>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <Icon
        iconName="Warning"
        style={{ fontSize: '24px', color: '#d13438', flexShrink: 0 }}
      />
      <div>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>
          This action will permanently delete the following items:
        </div>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Project Document.docx</li>
          <li>Budget Spreadsheet.xlsx</li>
          <li>Meeting Notes.txt</li>
        </ul>
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#fef0f1',
          borderRadius: '4px',
          fontSize: '13px'
        }}>
          <strong>Note:</strong> This action cannot be undone.
        </div>
      </div>
    </div>
  </div>,
  {
    title: <span style={{ color: '#d13438' }}>⚠️ Confirm Deletion</span>,
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
  }
);

// Confirm with comparison
const result = await confirm(
  <div>
    <p style={{ marginBottom: '12px' }}>
      You have unsaved changes. Would you like to save before closing?
    </p>
    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#f3f2f1' }}>
          <th style={{ padding: '8px', textAlign: 'left' }}>Field</th>
          <th style={{ padding: '8px', textAlign: 'left' }}>Current</th>
          <th style={{ padding: '8px', textAlign: 'left' }}>New</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: '8px', borderTop: '1px solid #edebe9' }}>Title</td>
          <td style={{ padding: '8px', borderTop: '1px solid #edebe9' }}>Old Title</td>
          <td style={{ padding: '8px', borderTop: '1px solid #edebe9', fontWeight: 600 }}>New Title</td>
        </tr>
        <tr>
          <td style={{ padding: '8px', borderTop: '1px solid #edebe9' }}>Status</td>
          <td style={{ padding: '8px', borderTop: '1px solid #edebe9' }}>Draft</td>
          <td style={{ padding: '8px', borderTop: '1px solid #edebe9', fontWeight: 600 }}>Published</td>
        </tr>
      </tbody>
    </table>
  </div>,
  {
    title: 'Unsaved Changes',
    buttons: [
      { text: 'Save', primary: true, value: 'save' },
      { text: 'Discard', value: 'discard' },
      { text: 'Cancel', value: null }
    ]
  }
);
```

### Component-Scoped Loading

Show loading overlays specific to components while keeping the rest of the UI interactive:

```typescript
import { showLoading, hideLoading } from 'spfx-toolkit/lib/utilities/dialogService';
import * as React from 'react';

// Dashboard with multiple independent loaders
const Dashboard: React.FC = () => {
  const loadChart = async () => {
    try {
      showLoading('Loading chart data...', { containerId: 'chart-container' });
      await fetchChartData();
    } finally {
      hideLoading('chart-container');
    }
  };

  const loadTable = async () => {
    try {
      showLoading('Loading table data...', { containerId: 'table-container' });
      await fetchTableData();
    } finally {
      hideLoading('table-container');
    }
  };

  return (
    <div>
      <div
        id="chart-container"
        style={{ position: 'relative', height: '400px', marginBottom: '20px' }}
      >
        <h2>Sales Chart</h2>
        {/* Chart component */}
        <button onClick={loadChart}>Refresh Chart</button>
      </div>

      <div
        id="table-container"
        style={{ position: 'relative', minHeight: '300px' }}
      >
        <h2>Data Table</h2>
        {/* Table component */}
        <button onClick={loadTable}>Refresh Table</button>
      </div>
    </div>
  );
};

// Load multiple sections simultaneously
const loadDashboard = async () => {
  showLoading('Loading charts...', { containerId: 'charts-section' });
  showLoading('Loading reports...', { containerId: 'reports-section' });
  showLoading('Loading analytics...', { containerId: 'analytics-section' });

  await Promise.all([
    loadCharts().finally(() => hideLoading('charts-section')),
    loadReports().finally(() => hideLoading('reports-section')),
    loadAnalytics().finally(() => hideLoading('analytics-section'))
  ]);
};

// Data grid with scoped loading
const DataGrid: React.FC = () => {
  const [data, setData] = React.useState([]);

  const refreshData = async () => {
    try {
      showLoading('Refreshing data...', { containerId: 'data-grid' });
      const result = await fetchData();
      setData(result);
    } finally {
      hideLoading('data-grid');
    }
  };

  return (
    <div
      id="data-grid"
      style={{
        position: 'relative',
        minHeight: '500px',
        border: '1px solid #edebe9',
        padding: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3>Data Grid</h3>
        <button onClick={refreshData}>Refresh</button>
      </div>
      {/* Grid content */}
      {data.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
};

// Form with scoped loading on save
const EditForm: React.FC = () => {
  const handleSave = async () => {
    try {
      showLoading('Saving changes...', { containerId: 'edit-form' });
      await saveFormData();
      await alert('Changes saved successfully!', { title: 'Success' });
    } catch (error) {
      await alert(`Failed to save: ${error.message}`, { title: 'Error' });
    } finally {
      hideLoading('edit-form');
    }
  };

  return (
    <div
      id="edit-form"
      style={{ position: 'relative', padding: '24px' }}
    >
      <h2>Edit Item</h2>
      {/* Form fields */}
      <button onClick={handleSave}>Save</button>
    </div>
  );
};
```

### Multi-Step Process with Loading

```typescript
import { showLoading, hideLoading, alert } from 'spfx-toolkit/lib/utilities/dialogService';

async function processMultiStepOperation(): Promise<void> {
  try {
    showLoading('Step 1: Validating...');
    await validate();

    showLoading('Step 2: Processing data...');
    await processData();

    showLoading('Step 3: Saving...');
    await save();

    hideLoading();
    await alert('Operation completed successfully!', { title: 'Success' });
  } catch (error) {
    hideLoading();
    await alert(`Error: ${error.message}`, { title: 'Error' });
  }
}
```

### Confirm with Multiple Choices

```typescript
import { confirm } from 'spfx-toolkit/lib/utilities/dialogService';

async function handleDocumentAction(): Promise<void> {
  const action = await confirm('What would you like to do with this document?', {
    title: 'Document Actions',
    buttons: [
      { text: 'Download', primary: true, value: 'download' },
      { text: 'Share', value: 'share' },
      { text: 'Delete', value: 'delete' },
      { text: 'Cancel', value: null }
    ]
  });

  switch (action) {
    case 'download':
      showLoading('Downloading...');
      await downloadDocument();
      hideLoading();
      break;
    case 'share':
      // Open share dialog
      break;
    case 'delete':
      const confirmDelete = await confirm('Are you sure?', { title: 'Confirm Delete' });
      if (confirmDelete) {
        await deleteDocument();
      }
      break;
  }
}
```

### Error Handling Pattern

```typescript
import { showLoading, hideLoading, alert, confirm } from 'spfx-toolkit/lib/utilities/dialogService';

async function saveWithConfirmation(): Promise<void> {
  const hasChanges = checkForChanges();

  if (!hasChanges) {
    await alert('No changes to save.', { title: 'Info' });
    return;
  }

  const confirmed = await confirm('Save changes?', {
    title: 'Confirm Save',
    buttons: [
      { text: 'Save', primary: true, value: true },
      { text: 'Cancel', value: false }
    ]
  });

  if (!confirmed) {
    return;
  }

  try {
    showLoading('Saving changes...');
    await saveChanges();
    hideLoading();
    await alert('Changes saved successfully!', { title: 'Success' });
  } catch (error) {
    hideLoading();
    await alert(`Failed to save: ${error.message}`, {
      title: 'Error',
      buttonText: 'Close'
    });
  }
}
```

### Custom Styled Buttons

```typescript
import { confirm } from 'spfx-toolkit/lib/utilities/dialogService';

const result = await confirm('This action is destructive.', {
  title: 'Warning',
  buttons: [
    {
      text: 'Proceed',
      primary: true,
      value: true,
      props: {
        styles: {
          root: {
            backgroundColor: '#d13438',
            borderColor: '#d13438'
          },
          rootHovered: {
            backgroundColor: '#a4262c',
            borderColor: '#a4262c'
          }
        }
      }
    },
    { text: 'Cancel', value: false }
  ]
});
```

## TypeScript Types

```typescript
import type {
  IAlertOptions,
  IConfirmOptions,
  IConfirmButton,
  ILoadingState,
  IDialogState
} from 'spfx-toolkit/lib/utilities/dialogService';

// Custom button configuration
const buttons: IConfirmButton[] = [
  { text: 'Yes', primary: true, value: 'yes' },
  { text: 'No', value: 'no' },
  { text: 'Cancel', value: null }
];

// Alert options
const alertOpts: IAlertOptions = {
  title: 'Notice',
  message: 'This is a message',
  buttonText: 'Dismiss',
  isDismissable: true
};

// Confirm options
const confirmOpts: IConfirmOptions = {
  title: 'Confirm',
  message: 'Are you sure?',
  buttons: buttons,
  isDismissable: true
};
```

## Best Practices

### 1. Always Hide Loading in Finally Block

```typescript
try {
  showLoading('Processing...');
  await operation();
} finally {
  hideLoading(); // Ensures loading is hidden even on error
}
```

### 2. Use Async/Await with Dialogs

```typescript
// ✅ GOOD: Async/await
const result = await confirm('Continue?');
if (result) { /* ... */ }

// ❌ AVOID: Then/catch chains
confirm('Continue?').then((result) => {
  if (result) { /* ... */ }
});
```

### 3. Provide Clear Messages

```typescript
// ✅ GOOD: Specific and clear
showLoading('Uploading files (3 of 10)...');
await alert('Your changes have been saved successfully.', { title: 'Success' });

// ❌ AVOID: Vague messages
showLoading('Please wait...');
await alert('Done');
```

### 4. Use Appropriate Button Values

```typescript
// ✅ GOOD: Meaningful values
const choice = await confirm('Select action:', {
  buttons: [
    { text: 'Approve', value: 'approve' },
    { text: 'Reject', value: 'reject' },
    { text: 'Defer', value: 'defer' }
  ]
});

// ❌ AVOID: Generic values
const choice = await confirm('Select action:', {
  buttons: [
    { text: 'Approve', value: 0 },
    { text: 'Reject', value: 1 },
    { text: 'Defer', value: 2 }
  ]
});
```

### 5. Handle Dismissal Appropriately

```typescript
// Confirm returns false on dismissal
const result = await confirm('Delete item?');
if (result === false) {
  // User explicitly cancelled or dismissed
  console.log('Cancelled');
}

// For multi-button confirms, check for null/undefined
const choice = await confirm('Choose:', { buttons: [...] });
if (choice === null || choice === undefined) {
  // User dismissed dialog
}
```

## Bundle Size Impact

- **showLoading/hideLoading**: ~8KB (Spinner, Stack, basic styles)
- **alert**: ~12KB (Dialog, Button components)
- **confirm**: ~14KB (Dialog, Button components)
- **All functions**: ~15KB (shared dependencies)

Uses tree-shakable Fluent UI imports to minimize bundle size.

## Browser Compatibility

- **Modern browsers**: Full support (Chrome, Edge, Firefox, Safari)
- **IE11**: Requires Promise polyfill (included in SPFx)
- **Mobile**: Fully responsive and touch-friendly

## Troubleshooting

### Dialog Not Showing

**Issue**: Dialog functions don't display anything.

**Solution**: The DialogService auto-initializes on first use. If issues persist, check for:
- Console errors
- Conflicting z-index values (loading uses z-index: 1000000)
- React/ReactDOM version mismatches

### Multiple Dialogs Stacking

**Issue**: Multiple dialogs appear at once.

**Solution**: DialogService only shows one dialog at a time. Ensure you await previous dialogs:

```typescript
// ✅ GOOD: Sequential
await alert('First message');
await alert('Second message');

// ❌ AVOID: Parallel (only last will show)
alert('First message');
alert('Second message');
```

### Loading Not Hiding

**Issue**: Loading overlay stays visible.

**Solution**: Always call `hideLoading()` in a finally block:

```typescript
try {
  showLoading('Processing...');
  await operation();
  hideLoading(); // ❌ Won't run if error occurs
} catch (error) {
  hideLoading(); // ❌ Have to duplicate
}

// ✅ BETTER: Use finally
try {
  showLoading('Processing...');
  await operation();
} finally {
  hideLoading(); // ✅ Always runs
}
```

## Related Utilities

- [ErrorBoundary](../../components/ErrorBoundary/README.md) - React error handling
- [SPContext](../context/README.md) - Logging and error tracking

## License

This utility is part of the SPFx Toolkit library.
