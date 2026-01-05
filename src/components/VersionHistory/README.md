# VersionHistory Component 📜

A comprehensive, production-ready React component for displaying and managing SharePoint document and list item version history. Built with DevExtreme Popup, featuring version comparison, field change tracking, export capabilities, and advanced filtering.

## Features

- 📋 **Version Comparison** - Side-by-side comparison of any two versions
- 🔍 **Field Change Tracking** - Detailed view of what changed between versions
- 📥 **Export to CSV** - Export complete version history with all changes
- ⬇️ **Document Download** - Download specific document versions
- 🎯 **Advanced Filtering** - Filter by user, date range, major versions
- 🔎 **Search** - Full-text search across version comments and changes
- 📱 **Responsive Design** - Optimized for desktop with scrollable popup
- 🎨 **DevExtreme UI** - Modern, polished interface with ScrollView
- 🔧 **Auto-Detection** - Automatically detects document vs list item type
- ♿ **Accessible** - WCAG 2.1 AA compliant
- 🚀 **Performance** - Efficient rendering with virtualization

## Installation

This component is part of the SPFx Toolkit:

```bash
npm install spfx-toolkit
```

**Required Dependencies:**
```bash
npm install devextreme@^22.2.3
npm install devextreme-react@^22.2.3
npm install @pnp/sp@^3.20.1
```

**Import Styles:**
```typescript
import 'devextreme/dist/css/dx.light.css';
import 'spfx-toolkit/lib/components/VersionHistory/VersionHistory.css';
```

## Quick Start

```typescript
import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Initialize SPContext first
await SPContext.smart(this.context, 'MyWebPart');

// Basic usage
const [showHistory, setShowHistory] = React.useState(false);

<button onClick={() => setShowHistory(true)}>
  View Version History
</button>

{showHistory && (
  <VersionHistory
    listId="your-list-guid"
    itemId={123}
    onClose={() => setShowHistory(false)}
  />
)}
```

## API Reference

### Props

```typescript
interface IVersionHistoryProps {
  listId: string;                           // Required: SharePoint List GUID
  itemId: number;                           // Required: SharePoint Item ID
  onClose: () => void;                      // Required: Callback when modal is closed
  onExport?: (versionCount: number) => void;  // Optional: After CSV export
  onDownload?: (version: IVersionInfo) => void;  // Optional: After download
  allowCopyLink?: boolean;                  // Optional: Show copy link button (default: false)
}
```

### Version Info Interface

```typescript
interface IVersionInfo {
  versionLabel: string;          // "5.0", "4.1", etc.
  versionId: number;             // Unique version ID
  isCurrentVersion: boolean;     // Is this the latest version?
  modifiedBy: string;            // User who created this version
  modifiedByEmail: string;       // User's email
  modified: Date;                // When version was created
  size?: number;                 // File size (documents only)
  comment?: string;              // Version comment/label
  url?: string;                  // Document URL (documents only)
  fieldChanges: IFieldChange[];  // What changed in this version
}
```

### Field Change Interface

```typescript
interface IFieldChange {
  fieldName: string;        // Internal field name
  fieldDisplayName: string; // User-friendly name
  oldValue: any;            // Previous value
  newValue: any;            // New value
  changeType: 'added' | 'modified' | 'removed';
}
```

## Usage Examples

### 1. Basic Document Version History

```typescript
import * as React from 'react';
import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

const DocumentVersionHistory: React.FC = () => {
  const [showHistory, setShowHistory] = React.useState(false);
  const documentListId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
  const documentItemId = 42;

  return (
    <div>
      <button onClick={() => setShowHistory(true)}>
        View Document History
      </button>

      {showHistory && (
        <VersionHistory
          listId={documentListId}
          itemId={documentItemId}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};
```

### 2. List Item Version History

```typescript
import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';

const TaskVersionHistory: React.FC<{ taskId: number }> = ({ taskId }) => {
  const [showHistory, setShowHistory] = React.useState(false);
  const tasksListId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  return (
    <>
      <button onClick={() => setShowHistory(true)}>
        History
      </button>

      {showHistory && (
        <VersionHistory
          listId={tasksListId}
          itemId={taskId}
          onClose={() => setShowHistory(false)}
          onExport={(count) => {
            console.log(`Exported ${count} versions`);
          }}
        />
      )}
    </>
  );
};
```

### 3. With Export and Download Callbacks

```typescript
const AdvancedVersionHistory: React.FC = () => {
  const [showHistory, setShowHistory] = React.useState(false);

  const handleExport = (versionCount: number) => {
    // Track export analytics
    console.log(`User exported ${versionCount} versions`);

    // Show notification
    alert(`Successfully exported ${versionCount} versions to CSV`);
  };

  const handleDownload = (version: IVersionInfo) => {
    // Track download analytics
    console.log(`User downloaded version ${version.versionLabel}`);

    // Log to SharePoint audit
    logDocumentAccess(version.versionId);
  };

  return (
    <>
      <button onClick={() => setShowHistory(true)}>
        Version History
      </button>

      {showHistory && (
        <VersionHistory
          listId="doc-library-guid"
          itemId={123}
          onClose={() => setShowHistory(false)}
          onExport={handleExport}
          onDownload={handleDownload}
        />
      )}
    </>
  );
};
```

### 4. Document Library Integration

```typescript
import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';

interface IDocument {
  id: number;
  name: string;
  modified: Date;
  modifiedBy: string;
}

const DocumentLibrary: React.FC<{ documents: IDocument[] }> = ({ documents }) => {
  const [selectedDocId, setSelectedDocId] = React.useState<number | null>(null);
  const libraryId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Modified</th>
            <th>Modified By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id}>
              <td>{doc.name}</td>
              <td>{doc.modified.toLocaleDateString()}</td>
              <td>{doc.modifiedBy}</td>
              <td>
                <button onClick={() => setSelectedDocId(doc.id)}>
                  View History
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedDocId && (
        <VersionHistory
          listId={libraryId}
          itemId={selectedDocId}
          onClose={() => setSelectedDocId(null)}
        />
      )}
    </div>
  );
};
```

### 5. SPFx WebPart Integration

```typescript
import * as React from 'react';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

interface IDocumentDetailsProps {
  listId: string;
  itemId: number;
}

const DocumentDetails: React.FC<IDocumentDetailsProps> = ({ listId, itemId }) => {
  const [showHistory, setShowHistory] = React.useState(false);

  return (
    <div className="document-details">
      <h2>Document Information</h2>

      <button
        className="btn-version-history"
        onClick={() => setShowHistory(true)}
      >
        📜 Version History
      </button>

      {showHistory && (
        <VersionHistory
          listId={listId}
          itemId={itemId}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default class DocumentDetailsWebPart extends BaseClientSideWebPart<IDocumentDetailsProps> {
  protected async onInit(): Promise<void> {
    // Initialize SPContext - REQUIRED
    await SPContext.smart(this.context, 'DocumentDetails');
    return super.onInit();
  }

  public render(): void {
    const element = React.createElement(DocumentDetails, {
      listId: this.properties.listId,
      itemId: this.properties.itemId
    });
    ReactDom.render(element, this.domElement);
  }
}
```

### 6. Form Customizer Integration

```typescript
import { VersionHistory } from 'spfx-toolkit/lib/components/VersionHistory';
import { FormDisplayMode } from '@microsoft/sp-core-library';

export default class MyFormCustomizer extends BaseFormCustomizer<IMyFormCustomizerProperties> {
  private _versionHistoryContainer: HTMLElement;

  public onInit(): Promise<void> {
    // Initialize SPContext
    return SPContext.smart(this.context, 'FormCustomizer');
  }

  public render(): void {
    // Add version history button to form
    if (this.displayMode !== FormDisplayMode.New) {
      this._versionHistoryContainer = document.createElement('div');
      this.domElement.appendChild(this._versionHistoryContainer);

      const element = React.createElement(VersionHistoryButton, {
        listId: this.context.list.id.toString(),
        itemId: this.context.itemId
      });

      ReactDom.render(element, this._versionHistoryContainer);
    }
  }
}

const VersionHistoryButton: React.FC<{ listId: string; itemId: number }> =
  ({ listId, itemId }) => {
    const [show, setShow] = React.useState(false);

    return (
      <>
        <button onClick={() => setShow(true)}>
          View Version History
        </button>
        {show && (
          <VersionHistory
            listId={listId}
            itemId={itemId}
            onClose={() => setShow(false)}
          />
        )}
      </>
    );
  };
```

## Utility Functions

The component exports several utility functions:

```typescript
import {
  compareVersions,
  downloadDocumentVersion,
  exportAllToCSV,
  filterVersions,
  formatRelativeTime,
  formatAbsoluteTime,
  formatFieldValue,
  formatFileSize,
  formatSizeDelta,
  getUniqueUsers
} from 'spfx-toolkit/lib/components/VersionHistory';

// Compare two versions
const changes = compareVersions(version1, version2);
console.log(changes); // Array of field changes

// Format relative time
const relative = formatRelativeTime(new Date('2025-01-01'));
// "2 months ago"

// Format absolute time
const absolute = formatAbsoluteTime(new Date());
// "January 15, 2025 at 3:45 PM"

// Format file size
const size = formatFileSize(1536000);
// "1.46 MB"

// Format size delta
const delta = formatSizeDelta(1000000, 1500000);
// "+500 KB (↑ 50%)"

// Get unique users from versions
const users = getUniqueUsers(versionArray);
// ["john.doe@company.com", "jane.smith@company.com"]
```

## Features in Detail

### 1. Version Comparison

The component automatically compares consecutive versions and highlights changes:

- **Added Fields:** Green indicator
- **Modified Fields:** Orange/yellow indicator with before → after
- **Removed Fields:** Red indicator

### 2. Field Change Types

Changes are categorized and displayed with visual indicators:

```typescript
interface IFieldChange {
  fieldName: string;
  fieldDisplayName: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'modified' | 'removed';
}
```

### 3. Filtering and Search

Users can filter versions by:

- **Search:** Free-text search in comments and field values
- **User:** Filter by who made the change
- **Date Range:** Custom date range or presets (Last 7 days, Last 30 days, etc.)
- **Major Versions Only:** Hide minor versions

### 4. Export to CSV

Exports complete version history including:
- Version number and date
- Modified by user
- Version comments
- All field changes with before/after values
- File size (for documents)

### 5. Document Download

For document libraries:
- Download button for each version
- Downloads specific version of the document
- Preserves original filename with version suffix

## Auto-Detection

The component automatically detects whether the item is:

- **Document:** Shows file size, download buttons, document-specific fields
- **List Item:** Shows all metadata fields, version comments

```typescript
// Component automatically detects type based on:
// - Presence of 'File' field
// - Content type
// - List template type
```

## Styling

### Default Styles

The component includes comprehensive styles in `VersionHistory.css`:

```typescript
import 'spfx-toolkit/lib/components/VersionHistory/VersionHistory.css';
```

### DevExtreme Theme

Requires DevExtreme CSS:

```typescript
import 'devextreme/dist/css/dx.light.css';
// or
import 'devextreme/dist/css/dx.dark.css';
```

### Custom Styling

```css
/* Override popup size */
.dx-popup-content .version-history-container {
  max-height: 80vh;
}

/* Customize version cards */
.version-card {
  border-left: 4px solid var(--themePrimary);
}

/* Customize field changes table */
.field-changes-table th {
  background-color: var(--neutralLight);
}
```

## Best Practices

### 1. Initialize SPContext

```typescript
// ✅ Good - Initialize in onInit
protected async onInit(): Promise<void> {
  await SPContext.smart(this.context, 'MyWebPart');
  return super.onInit();
}

// ❌ Bad - Missing initialization
// Component will fail without SPContext
```

### 2. Conditional Rendering

```typescript
// ✅ Good - Only render when needed
{showHistory && (
  <VersionHistory
    listId={listId}
    itemId={itemId}
    onClose={() => setShowHistory(false)}
  />
)}

// ❌ Bad - Always rendered (hidden with CSS)
<div style={{ display: showHistory ? 'block' : 'none' }}>
  <VersionHistory ... />
</div>
```

### 3. Handle Callbacks

```typescript
// ✅ Good - Handle export/download events
<VersionHistory
  listId={listId}
  itemId={itemId}
  onClose={() => setShowHistory(false)}
  onExport={(count) => {
    logAnalytics('version-export', { count });
  }}
  onDownload={(version) => {
    logAnalytics('version-download', { version: version.versionLabel });
  }}
/>
```

### 4. Error Handling

```typescript
// Component handles errors internally, but you can wrap in ErrorBoundary
import { ErrorBoundary } from 'spfx-toolkit/lib/components/ErrorBoundary';

<ErrorBoundary>
  {showHistory && (
    <VersionHistory
      listId={listId}
      itemId={itemId}
      onClose={() => setShowHistory(false)}
    />
  )}
</ErrorBoundary>
```

## Permissions

The component automatically checks user permissions:

- **ViewVersions:** Required to view version history
- **OpenItems:** Required to download document versions

If user lacks permissions, an appropriate message is displayed.

## Performance

### Optimizations

- **Lazy Loading:** Only loads versions when popup opens
- **Efficient Comparison:** Caches field comparisons
- **Virtualization:** Uses DevExtreme ScrollView for smooth scrolling
- **Memoization:** Prevents unnecessary re-renders

### Large Version Histories

For items with 100+ versions:
- Consider implementing pagination
- Use major versions filter
- Apply date range filters

## TypeScript Support

Full TypeScript definitions included:

```typescript
import {
  IVersionHistoryProps,
  IVersionInfo,
  IFieldChange,
  IItemInfo,
  IFilterState,
  DateRangeFilter
} from 'spfx-toolkit/lib/components/VersionHistory';
```

## Troubleshooting

### Issue: "Access Denied" Error

**Solution:** User needs `ViewVersions` permission on the list/library

```typescript
// Check permissions programmatically
const hasPermission = await SPContext.sp.web.lists
  .getById(listId)
  .currentUserHasPermissions(PermissionKind.ViewVersions);
```

### Issue: Download Button Not Working

**Solution:** Ensure item is in a document library, not a list

```typescript
// Only documents can be downloaded
// List items show metadata changes only
```

### Issue: Popup Not Showing

**Solution:** Verify DevExtreme CSS is imported

```typescript
import 'devextreme/dist/css/dx.light.css';
import 'spfx-toolkit/lib/components/VersionHistory/VersionHistory.css';
```

### Issue: Field Names Show Internal Names

**Solution:** Component uses field display names from SharePoint schema. If internal names appear, the field may not have a display name set.

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Related Components

- [UserPersona](../UserPersona/README.md) - Display user information
- [ConflictDetector](../ConflictDetector/README.md) - Concurrent editing detection
- [ErrorBoundary](../ErrorBoundary/README.md) - Error handling

## Dependencies

- `devextreme@^22.2.3` - UI components
- `devextreme-react@^22.2.3` - React wrappers
- `@pnp/sp@^3.20.1` - SharePoint operations
- SPFx Toolkit Context utility
