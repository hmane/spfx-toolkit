# DialogService - JSX Content Examples

The DialogService now supports both **string** and **JSX** content for all messages (loading, alert, confirm) and titles.

## Quick Reference

### String Content (Simple)

```typescript
showLoading('Loading data...');
await alert('Operation completed!');
const result = await confirm('Are you sure?');
```

### JSX Content (Rich)

```typescript
import * as React from 'react';

showLoading(
  <div>
    <strong>Loading data...</strong>
    <div>Please wait...</div>
  </div>
);

await alert(
  <div>
    <p>Operation completed!</p>
    <ul>
      <li>Item 1 processed</li>
      <li>Item 2 processed</li>
    </ul>
  </div>
);

const result = await confirm(
  <div>
    <strong>Warning:</strong> This cannot be undone.
  </div>
);
```

## Real-World JSX Examples

### 1. Loading with Progress Bar (Custom Icon Solution)

When updating loading messages very frequently (like in a progress loop), use a `customIcon` to prevent the default Spinner from restarting its animation on each update:

```typescript
import { showLoading, hideLoading } from 'spfx-toolkit/lib/utilities/dialogService';
import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';

// Define a custom spinner component to prevent restart glitches
const CustomSpinner: React.FC = () => (
  <div style={{ animation: 'spin 1s linear infinite' }}>
    <Icon iconName="ProgressRingDots" style={{ fontSize: '32px', color: '#0078d4' }} />
  </div>
);

// Example: File upload progress with frequent updates
try {
  const totalFiles = 10;

  for (let i = 1; i <= totalFiles; i++) {
    const progress = (i / totalFiles) * 100;

    // Use customIcon to prevent spinner restart on each update
    showLoading(
      <div style={{ textAlign: 'center', minWidth: '300px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Uploading Files
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#edebe9',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '8px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#0078d4',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ fontSize: '13px', color: '#605e5c' }}>
          {i} of {totalFiles} files ({Math.round(progress)}% complete)
        </div>
      </div>,
      {
        customIcon: <CustomSpinner />  // Prevents restart on each iteration
      }
    );

    await uploadFile(i);
  }
} finally {
  hideLoading();
  await alert('All files uploaded successfully!', { title: 'Upload Complete' });
}
```

**Why use customIcon?** Without it, the Fluent UI Spinner component would restart its rotation animation on each `showLoading()` call, causing a visual glitch. The `customIcon` option maintains the same spinner instance across updates.

### 2. Alert with Icon and Formatting

```typescript
import { alert } from 'spfx-toolkit/lib/utilities/dialogService';
import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';

await alert(
  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
    <Icon
      iconName="CheckMark"
      style={{
        fontSize: '32px',
        color: '#107c10',
        flexShrink: 0
      }}
    />
    <div>
      <div style={{ fontWeight: 600, marginBottom: '8px' }}>
        Successfully saved!
      </div>
      <div style={{ fontSize: '13px', color: '#605e5c' }}>
        Your changes have been applied to:
      </div>
      <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '13px' }}>
        <li>Customer Name</li>
        <li>Email Address</li>
        <li>Phone Number</li>
      </ul>
    </div>
  </div>,
  {
    title: <span style={{ color: '#107c10' }}>✓ Success</span>
  }
);
```

### 3. Confirm with Warning Style

```typescript
import { confirm } from 'spfx-toolkit/lib/utilities/dialogService';
import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';

const result = await confirm(
  <div>
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      padding: '12px',
      backgroundColor: '#fef0f1',
      borderLeft: '4px solid #d13438',
      borderRadius: '4px',
      marginBottom: '16px'
    }}>
      <Icon
        iconName="Warning"
        style={{ fontSize: '24px', color: '#d13438', flexShrink: 0 }}
      />
      <strong>This action is permanent and cannot be undone!</strong>
    </div>
    <div style={{ fontSize: '14px' }}>
      <p>You are about to delete:</p>
      <ul style={{ paddingLeft: '20px' }}>
        <li>Project Document.docx</li>
        <li>Budget Report.xlsx</li>
        <li>Meeting Notes.txt (3 files)</li>
      </ul>
    </div>
  </div>,
  {
    title: <span style={{ color: '#d13438' }}>⚠️ Confirm Deletion</span>,
    buttons: [
      {
        text: 'Delete Permanently',
        primary: true,
        value: true,
        props: {
          styles: {
            root: {
              backgroundColor: '#a4262c',
              borderColor: '#a4262c',
              color: '#ffffff'
            },
            rootHovered: {
              backgroundColor: '#8a1c1c',
              borderColor: '#8a1c1c'
            }
          }
        }
      },
      { text: 'Cancel', value: false }
    ]
  }
);
```

### 4. Alert with MessageBar Component

```typescript
import { alert } from 'spfx-toolkit/lib/utilities/dialogService';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import * as React from 'react';

await alert(
  <div>
    <MessageBar messageBarType={MessageBarType.warning}>
      Some items could not be processed
    </MessageBar>
    <div style={{ marginTop: '16px' }}>
      <strong>Failed items:</strong>
      <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
        <li>Item 5: Invalid date format</li>
        <li>Item 12: Missing required field</li>
        <li>Item 18: Duplicate entry</li>
      </ul>
      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#fff4ce',
        borderRadius: '4px',
        fontSize: '13px'
      }}>
        <strong>Tip:</strong> Review the failed items and try again.
      </div>
    </div>
  </div>,
  { title: 'Partial Success' }
);
```

### 5. Loading with Custom Spinner

```typescript
import { showLoading, hideLoading } from 'spfx-toolkit/lib/utilities/dialogService';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import * as React from 'react';

showLoading(
  <div style={{ textAlign: 'center', padding: '16px' }}>
    <Spinner size={SpinnerSize.large} />
    <div style={{
      marginTop: '16px',
      fontSize: '16px',
      fontWeight: 600,
      color: '#323130'
    }}>
      Analyzing Data
    </div>
    <div style={{
      marginTop: '8px',
      fontSize: '13px',
      color: '#605e5c'
    }}>
      This may take a few moments...
    </div>
    <div style={{
      marginTop: '12px',
      fontSize: '12px',
      color: '#8a8886',
      fontStyle: 'italic'
    }}>
      Processing 1,234 records
    </div>
  </div>
);
```

### 6. Confirm with Data Table

```typescript
import { confirm } from 'spfx-toolkit/lib/utilities/dialogService';
import * as React from 'react';

const changes = [
  { field: 'Title', old: 'Draft Document', new: 'Final Document' },
  { field: 'Status', old: 'Draft', new: 'Published' },
  { field: 'Author', old: 'John Doe', new: 'Jane Smith' }
];

const result = await confirm(
  <div>
    <p style={{ marginBottom: '12px' }}>
      Review the following changes before saving:
    </p>
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    }}>
      <thead>
        <tr style={{ backgroundColor: '#f3f2f1' }}>
          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #edebe9' }}>
            Field
          </th>
          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #edebe9' }}>
            Current Value
          </th>
          <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #edebe9' }}>
            New Value
          </th>
        </tr>
      </thead>
      <tbody>
        {changes.map((change, index) => (
          <tr key={index}>
            <td style={{
              padding: '8px',
              borderBottom: '1px solid #edebe9',
              fontWeight: 600
            }}>
              {change.field}
            </td>
            <td style={{
              padding: '8px',
              borderBottom: '1px solid #edebe9',
              color: '#a19f9d'
            }}>
              {change.old}
            </td>
            <td style={{
              padding: '8px',
              borderBottom: '1px solid #edebe9',
              color: '#0078d4',
              fontWeight: 600
            }}>
              {change.new}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>,
  {
    title: 'Confirm Changes',
    buttons: [
      { text: 'Save Changes', primary: true, value: 'save' },
      { text: 'Cancel', value: null }
    ]
  }
);
```

### 7. Alert with Links

```typescript
import { alert } from 'spfx-toolkit/lib/utilities/dialogService';
import { Link } from '@fluentui/react/lib/Link';
import * as React from 'react';

await alert(
  <div>
    <p style={{ marginBottom: '12px' }}>
      Your report has been generated successfully!
    </p>
    <div style={{
      padding: '12px',
      backgroundColor: '#f3f2f1',
      borderRadius: '4px',
      marginBottom: '12px'
    }}>
      <div style={{ fontSize: '13px', color: '#605e5c', marginBottom: '4px' }}>
        File Location:
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
        /sites/team/Shared Documents/Reports/
      </div>
    </div>
    <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
      <Link href="#" onClick={() => console.log('Open report')}>
        Open Report
      </Link>
      <Link href="#" onClick={() => console.log('Copy link')}>
        Copy Link
      </Link>
      <Link href="#" onClick={() => console.log('Share')}>
        Share
      </Link>
    </div>
  </div>,
  { title: 'Report Generated' }
);
```

### 8. Multi-Choice Confirm with Icons

```typescript
import { confirm } from 'spfx-toolkit/lib/utilities/dialogService';
import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';

const action = await confirm(
  <div>
    <p style={{ marginBottom: '16px' }}>
      Choose how you want to handle this document:
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        border: '1px solid #edebe9',
        borderRadius: '4px'
      }}>
        <Icon iconName="CloudDownload" style={{ fontSize: '24px', color: '#0078d4' }} />
        <div>
          <div style={{ fontWeight: 600 }}>Download</div>
          <div style={{ fontSize: '12px', color: '#605e5c' }}>
            Save a copy to your computer
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        border: '1px solid #edebe9',
        borderRadius: '4px'
      }}>
        <Icon iconName="Share" style={{ fontSize: '24px', color: '#0078d4' }} />
        <div>
          <div style={{ fontWeight: 600 }}>Share</div>
          <div style={{ fontSize: '12px', color: '#605e5c' }}>
            Send link to others
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        border: '1px solid #edebe9',
        borderRadius: '4px'
      }}>
        <Icon iconName="Delete" style={{ fontSize: '24px', color: '#d13438' }} />
        <div>
          <div style={{ fontWeight: 600 }}>Delete</div>
          <div style={{ fontSize: '12px', color: '#605e5c' }}>
            Remove permanently
          </div>
        </div>
      </div>
    </div>
  </div>,
  {
    title: 'Document Actions',
    buttons: [
      { text: 'Download', primary: true, value: 'download' },
      { text: 'Share', value: 'share' },
      { text: 'Delete', value: 'delete' },
      { text: 'Cancel', value: null }
    ]
  }
);
```

## Tips for JSX Content

### 1. Use Inline Styles

Since CSS modules may not work in dialogs, use inline styles:

```typescript
<div style={{
  padding: '12px',
  backgroundColor: '#f3f2f1',
  borderRadius: '4px'
}}>
  Content here
</div>
```

### 2. Leverage Fluent UI Components

Import tree-shakable Fluent UI components for rich UI:

```typescript
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Link } from '@fluentui/react/lib/Link';
```

### 3. Keep It Simple

Don't overload dialogs with too much JSX - they should be quick to read:

```typescript
// ✅ GOOD: Clear and concise
<div>
  <strong>Warning:</strong> This action cannot be undone.
</div>

// ❌ AVOID: Too complex
<div>
  <div style={{ ... }}>
    <div style={{ ... }}>
      <span>...</span>
      <div>...</div>
    </div>
  </div>
</div>
```

### 4. Use Semantic HTML

Structure your JSX content semantically:

```typescript
<div>
  <p>Main message</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
```

### 5. Consider Accessibility

Add appropriate aria attributes when needed:

```typescript
<div role="alert" aria-live="assertive">
  <strong>Error:</strong> Please correct the following issues.
</div>
```

## Component-Scoped Loading Examples

### 9. Dashboard with Multiple Loaders

```typescript
import { showLoading, hideLoading } from 'spfx-toolkit/lib/utilities/dialogService';
import * as React from 'react';

const Dashboard: React.FC = () => {
  const refreshChart = async () => {
    try {
      showLoading(
        <div>
          <strong>Refreshing Chart</strong>
          <div style={{ fontSize: '13px', marginTop: '8px' }}>
            Loading latest sales data...
          </div>
        </div>,
        { containerId: 'sales-chart' }
      );
      await fetch ChartData();
    } finally {
      hideLoading('sales-chart');
    }
  };

  const refreshTable = async () => {
    try {
      showLoading(
        <div>
          <strong>Loading Table</strong>
          <div style={{ fontSize: '13px', marginTop: '8px' }}>
            Fetching records...
          </div>
        </div>,
        { containerId: 'data-table' }
      );
      await fetchTableData();
    } finally {
      hideLoading('data-table');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div
        id="sales-chart"
        style={{
          position: 'relative',
          height: '400px',
          border: '1px solid #edebe9',
          padding: '16px'
        }}
      >
        <h3>Sales Chart</h3>
        <button onClick={refreshChart}>Refresh</button>
        {/* Chart content */}
      </div>

      <div
        id="data-table"
        style={{
          position: 'relative',
          minHeight: '400px',
          border: '1px solid #edebe9',
          padding: '16px'
        }}
      >
        <h3>Data Table</h3>
        <button onClick={refreshTable}>Refresh</button>
        {/* Table content */}
      </div>
    </div>
  );
};
```

### 10. Form with Scoped Loading

```typescript
import { showLoading, hideLoading, alert } from 'spfx-toolkit/lib/utilities/dialogService';
import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';

const EditForm: React.FC = () => {
  const handleSave = async () => {
    try {
      showLoading(
        <div style={{ textAlign: 'center' }}>
          <Icon
            iconName="Save"
            style={{ fontSize: '24px', color: '#0078d4', marginBottom: '8px' }}
          />
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            Saving Changes
          </div>
          <div style={{ fontSize: '12px', color: '#605e5c' }}>
            Please don't close this window...
          </div>
        </div>,
        { containerId: 'edit-form-container' }
      );

      await saveFormData();

      hideLoading('edit-form-container');

      await alert(
        <div>
          <Icon
            iconName="CheckMark"
            style={{ fontSize: '32px', color: '#107c10', marginBottom: '8px' }}
          />
          <div>Your changes have been saved successfully!</div>
        </div>,
        { title: 'Success' }
      );
    } catch (error) {
      hideLoading('edit-form-container');
      await alert(
        <div>
          <Icon
            iconName="Error"
            style={{ fontSize: '32px', color: '#a4262c', marginBottom: '8px' }}
          />
          <div style={{ color: '#a4262c' }}>
            <strong>Save Failed</strong>
            <div style={{ marginTop: '8px', fontSize: '13px' }}>
              {error.message}
            </div>
          </div>
        </div>,
        { title: 'Error' }
      );
    }
  };

  return (
    <div
      id="edit-form-container"
      style={{
        position: 'relative',
        padding: '24px',
        border: '1px solid #edebe9',
        borderRadius: '4px'
      }}
    >
      <h2>Edit Item</h2>
      {/* Form fields */}
      <button onClick={handleSave}>Save Changes</button>
    </div>
  );
};
```

### 11. Parallel Loading with Progress

```typescript
import { showLoading, hideLoading } from 'spfx-toolkit/lib/utilities/dialogService';
import * as React from 'react';

const DataLoader: React.FC = () => {
  const loadAllData = async () => {
    // Start all loaders
    showLoading(
      <div>
        <strong>Loading Charts</strong>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>0% complete</div>
      </div>,
      { containerId: 'charts-section' }
    );

    showLoading(
      <div>
        <strong>Loading Reports</strong>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>0% complete</div>
      </div>,
      { containerId: 'reports-section' }
    );

    showLoading(
      <div>
        <strong>Loading Analytics</strong>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>0% complete</div>
      </div>,
      { containerId: 'analytics-section' }
    );

    // Load in parallel
    await Promise.all([
      loadCharts().finally(() => hideLoading('charts-section')),
      loadReports().finally(() => hideLoading('reports-section')),
      loadAnalytics().finally(() => hideLoading('analytics-section'))
    ]);
  };

  return (
    <div>
      <button onClick={loadAllData}>Load All Data</button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
        <div
          id="charts-section"
          style={{ position: 'relative', minHeight: '300px', border: '1px solid #edebe9', padding: '16px' }}
        >
          <h3>Charts</h3>
          {/* Charts content */}
        </div>

        <div
          id="reports-section"
          style={{ position: 'relative', minHeight: '300px', border: '1px solid #edebe9', padding: '16px' }}
        >
          <h3>Reports</h3>
          {/* Reports content */}
        </div>

        <div
          id="analytics-section"
          style={{ position: 'relative', minHeight: '300px', border: '1px solid #edebe9', padding: '16px' }}
        >
          <h3>Analytics</h3>
          {/* Analytics content */}
        </div>
      </div>
    </div>
  );
};
```

## TypeScript Support

Full type safety for JSX content and scoped loading:

```typescript
import { DialogContent, ILoadingOptions } from 'spfx-toolkit/lib/utilities/dialogService';
import * as React from 'react';

// DialogContent = string | React.ReactNode

const message: DialogContent = <div>My JSX message</div>;
const title: DialogContent = <span style={{ color: 'red' }}>Warning</span>;

await alert(message, { title });

// Scoped loading with types
const loadingOptions: ILoadingOptions = {
  containerId: 'my-container'
};

showLoading(<div>Loading...</div>, loadingOptions);
```
