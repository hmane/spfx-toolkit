# SPListView Component - Requirements Document

> **Status:** Planned
> **Version:** 1.0.0
> **Last Updated:** November 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Goals & Objectives](#goals--objectives)
3. [Core Features](#core-features)
4. [Data Source & CAML Query](#data-source--caml-query)
5. [Save Modes](#save-modes)
6. [Smart Field Renderers](#smart-field-renderers)
7. [UI Components](#ui-components)
8. [Document Library Features](#document-library-features)
9. [SPDynamicForm Integration](#spdynamicform-integration)
10. [Permissions & Security](#permissions--security)
11. [API Reference](#api-reference)
12. [Usage Examples](#usage-examples)
13. [File Structure](#file-structure)
14. [Implementation Phases](#implementation-phases)
15. [Dependencies](#dependencies)

---

## Overview

**SPListView** is a comprehensive SharePoint ListView component built on DevExtreme DataGrid. It provides a rich, feature-complete interface for viewing, editing, and managing SharePoint list items and document libraries within SPFx web parts.

### Why SPListView?

- **Native SharePoint Integration** - Built specifically for SharePoint data patterns
- **DevExtreme Performance** - Leverages DevExtreme DataGrid for smooth UX with large datasets
- **Smart Rendering** - Automatic field type detection with specialized renderers
- **Flexible Save Modes** - Instant or on-demand saving to fit different workflows
- **SPDynamicForm Integration** - Seamless item viewing/editing with form configuration
- **Document Library Support** - File upload, download, and management
- **Permission-Aware** - Actions filtered by user permissions

---

## Goals & Objectives

### Primary Goals

1. **Simplify SharePoint List Rendering** - One component to display any SharePoint list
2. **Minimize Configuration** - Smart defaults with opt-in customization
3. **Support Complex Workflows** - On-demand save mode for forms with multiple data sources
4. **Maintain Performance** - Efficient rendering with virtualization and paging
5. **Ensure Accessibility** - WCAG 2.1 AA compliance

### Non-Goals

- Replacing SharePoint's native list views entirely
- Supporting non-SharePoint data sources
- Building a custom grid from scratch (leverage DevExtreme)

---

## Core Features

### Feature Summary

| Feature | Priority | Description |
|---------|----------|-------------|
| CAML Query Data Source | High | Load items via CAML query |
| Instant Save Mode | High | Direct SP updates on edit |
| On-Demand Save Mode | High | Batch saves on explicit action |
| Smart Field Renderers | High | Auto-detect and render field types |
| ECB Context Menu | High | Right-click menu with actions |
| Selection Toolbar | High | Bulk actions for selected items |
| Title Hover Card | Medium | Rich preview on title hover |
| Column Chooser | Medium | Show/hide/reorder columns |
| Document Upload | Medium | Drag-drop file upload |
| SPDynamicForm Integration | High | View/Edit forms in Panel/Dialog |

---

## Data Source & CAML Query

### CAML Query Support

SPListView uses CAML queries as the primary data source for maximum flexibility.

```typescript
interface ISPListViewDataSource {
  listNameOrId: string;           // List title or GUID
  siteUrl?: string;               // Optional: Different site (multi-site support)
  camlQuery?: string;             // CAML query XML
  viewFields?: string[];          // Fields to retrieve
  rowLimit?: number;              // Items per page (default: 30)
  expandFields?: string[];        // Lookup/User fields to expand
}
```

### Example CAML Queries

```xml
<!-- Active tasks assigned to current user -->
<View>
  <Query>
    <Where>
      <And>
        <Eq>
          <FieldRef Name="AssignedTo" LookupId="TRUE" />
          <Value Type="Integer"><UserID /></Value>
        </Eq>
        <Neq>
          <FieldRef Name="Status" />
          <Value Type="Choice">Completed</Value>
        </Neq>
      </And>
    </Where>
    <OrderBy>
      <FieldRef Name="DueDate" Ascending="TRUE" />
    </OrderBy>
  </Query>
</View>

<!-- Recent documents modified in last 7 days -->
<View>
  <Query>
    <Where>
      <Geq>
        <FieldRef Name="Modified" />
        <Value Type="DateTime"><Today OffsetDays="-7" /></Value>
      </Geq>
    </Where>
    <OrderBy>
      <FieldRef Name="Modified" Ascending="FALSE" />
    </OrderBy>
  </Query>
</View>
```

### Field Expansion

For lookup and user fields, automatic expansion retrieves related data:

```typescript
// Auto-expands these fields for full data
expandFields: ['AssignedTo', 'Category', 'Author', 'Editor']

// Results include:
// - AssignedTo/Title, AssignedTo/EMail, AssignedTo/Id
// - Category/Title, Category/Id
// - Author/Title, Author/EMail
// - Editor/Title, Editor/EMail
```

---

## Save Modes

### Instant Save Mode

Changes are immediately persisted to SharePoint on cell edit.

```typescript
<SPListView
  listNameOrId="Tasks"
  saveMode="instant"
  onSaveError={(error, item) => {
    // Handle save failure - rollback is automatic
    console.error('Failed to save:', error);
  }}
  onSaveSuccess={(item) => {
    // Optional: Show success notification
  }}
/>
```

**Behavior:**
- Cell blur triggers save
- Optimistic UI update
- Automatic rollback on failure
- Visual indicator during save

### On-Demand Save Mode

Changes are tracked locally until explicit save is triggered.

```typescript
interface IListViewChanges {
  added: IListItem[];           // New items created
  modified: IListItem[];        // Changed existing items
  deleted: number[];            // Deleted item IDs
  uploads: IPendingUpload[];    // Pending file uploads
}

// Component usage
const listViewRef = React.useRef<ISPListViewRef>(null);

<SPListView
  ref={listViewRef}
  listNameOrId="Tasks"
  saveMode="on-demand"
  onChangesDetected={(hasChanges) => {
    // Enable/disable form save button
    setHasUnsavedChanges(hasChanges);
  }}
/>

// Save all changes
const handleFormSave = async () => {
  const changes = listViewRef.current?.getChanges();

  if (changes) {
    await listViewRef.current?.save();
  }

  // Save other form data...
};

// Discard changes
const handleCancel = () => {
  listViewRef.current?.discardChanges();
};
```

**Behavior:**
- Changes stored in local state
- Visual indicators for pending changes (row highlighting)
- `getChanges()` returns all pending modifications
- `save()` persists all changes in batch
- `discardChanges()` reverts to original state

### Visual Indicators

| State | Indicator |
|-------|-----------|
| Pending Add | Green left border |
| Pending Edit | Yellow left border |
| Pending Delete | Red strikethrough + opacity |
| Saving | Spinner overlay |
| Save Error | Red background + error icon |

---

## Smart Field Renderers

SPListView automatically detects SharePoint field types and applies appropriate renderers.

### Built-in Renderers

| Field Type | Renderer | Features |
|------------|----------|----------|
| Text | TextRenderer | Truncation, tooltip for full text |
| Note | NoteRenderer | Multi-line with expand |
| Number | NumberRenderer | Locale formatting, decimals |
| Currency | CurrencyRenderer | Currency symbol, formatting |
| DateTime | DateRenderer | Relative/absolute, time support |
| Choice | ChoiceRenderer | Pill/tag styling |
| MultiChoice | MultiChoiceRenderer | Multiple pills |
| User | UserRenderer | UserPersona component |
| UserMulti | UserMultiRenderer | Multiple personas, overflow |
| Lookup | LookupRenderer | Link to source item |
| LookupMulti | LookupMultiRenderer | Multiple links |
| URL | UrlRenderer | Clickable link, icon |
| Boolean | BooleanRenderer | Checkbox or Yes/No text |
| Taxonomy | TaxonomyRenderer | Term with path tooltip |
| TaxonomyMulti | TaxonomyMultiRenderer | Multiple terms |
| Title | TitleRenderer | Hover card + ECB menu trigger |

### Custom Renderers

Override default rendering for specific columns:

```typescript
<SPListView
  listNameOrId="Tasks"
  columns={[
    {
      field: 'Priority',
      renderer: (data) => (
        <PriorityBadge level={data.value} />
      )
    },
    {
      field: 'Progress',
      renderer: (data) => (
        <ProgressBar value={data.value} max={100} />
      )
    }
  ]}
/>
```

---

## UI Components

### ECB Menu (Edit Control Block)

Context menu for item actions, filtered by permissions.

```typescript
interface IECBAction {
  key: string;
  text: string;
  iconName?: string;
  onClick: (item: any) => void;

  // Permission requirements
  requiresPermission?: SPPermissionKind;

  // Conditional visibility
  visible?: (item: any) => boolean;
  disabled?: (item: any) => boolean;

  // Divider before this item
  dividerBefore?: boolean;
}

// Default ECB actions (auto-included)
const defaultECBActions: IECBAction[] = [
  { key: 'view', text: 'View', iconName: 'View' },
  { key: 'edit', text: 'Edit', iconName: 'Edit', requiresPermission: SPPermissionKind.EditListItems },
  { key: 'delete', text: 'Delete', iconName: 'Delete', requiresPermission: SPPermissionKind.DeleteListItems },
  { key: 'divider1', dividerBefore: true },
  { key: 'versionHistory', text: 'Version History', iconName: 'History' },
  { key: 'permissions', text: 'Manage Permissions', iconName: 'Lock', requiresPermission: SPPermissionKind.ManagePermissions },
];

// Custom ECB configuration
<SPListView
  listNameOrId="Tasks"
  showECBMenu={true}
  ecbActions={[
    ...defaultECBActions,
    { key: 'divider2', dividerBefore: true },
    {
      key: 'archive',
      text: 'Archive',
      iconName: 'Archive',
      onClick: (item) => archiveTask(item.ID),
      visible: (item) => item.Status === 'Completed'
    },
  ]}
/>
```

### Selection Toolbar

Appears when items are selected, provides bulk actions.

```typescript
interface IToolbarAction {
  key: string;
  text: string;
  iconName?: string;
  onClick: (selectedItems: any[]) => void;

  // Enable/disable based on selection
  disabled?: (selectedItems: any[]) => boolean;

  // Confirmation dialog
  confirmMessage?: string | ((items: any[]) => string);

  // Permission requirements
  requiresPermission?: SPPermissionKind;
}

<SPListView
  listNameOrId="Documents"
  selectionMode="multiple"
  showSelectionToolbar={true}
  toolbarActions={[
    {
      key: 'download',
      text: 'Download',
      iconName: 'Download',
      onClick: (items) => downloadFiles(items),
    },
    {
      key: 'delete',
      text: 'Delete',
      iconName: 'Delete',
      confirmMessage: (items) => `Delete ${items.length} item(s)?`,
      requiresPermission: SPPermissionKind.DeleteListItems,
    },
    {
      key: 'move',
      text: 'Move To...',
      iconName: 'MoveToFolder',
      onClick: (items) => openMoveDialog(items),
    },
  ]}
/>
```

### Title Hover Card

Rich preview panel on title hover.

```typescript
interface ITitleHoverCardConfig {
  enabled?: boolean;
  delay?: number;                    // Hover delay in ms (default: 500)

  // Fields to display in hover card
  fields?: string[];                 // Default: ['Created', 'Modified', 'Author', 'Editor']

  // Quick actions in hover card
  showQuickActions?: boolean;        // View, Edit, Delete buttons

  // Custom content
  renderContent?: (item: any) => React.ReactNode;
}

<SPListView
  listNameOrId="Tasks"
  titleHoverCard={{
    enabled: true,
    delay: 300,
    fields: ['Status', 'Priority', 'DueDate', 'AssignedTo', 'Created', 'Author'],
    showQuickActions: true,
  }}
/>
```

### Column Chooser

Show/hide and reorder columns.

```typescript
<SPListView
  listNameOrId="Tasks"
  allowColumnChooser={true}
  allowColumnReorder={true}

  // Persist preferences
  columnPreferenceKey="myWebPart_tasks_columns"  // localStorage key

  // Initial column visibility
  columns={[
    { field: 'Title', visible: true },
    { field: 'Status', visible: true },
    { field: 'AssignedTo', visible: true },
    { field: 'DueDate', visible: true },
    { field: 'Priority', visible: false },  // Hidden by default
    { field: 'Created', visible: false },
  ]}
/>
```

---

## Document Library Features

### File Upload

Support for document libraries with upload capabilities.

```typescript
interface IUploadConfig {
  enabled: boolean;
  mode: 'single' | 'multiple';

  // Upload location
  folder?: string;                   // Target folder path

  // Validation
  allowedExtensions?: string[];      // e.g., ['.pdf', '.docx']
  maxFileSize?: number;              // In bytes

  // Behavior
  overwriteExisting?: boolean;
  checkOutRequired?: boolean;

  // UI
  showDropZone?: boolean;            // Drag-drop overlay
  dropZoneText?: string;
}

interface IUploadedFile {
  name: string;
  serverRelativeUrl: string;
  uniqueId: string;
  size: number;
  item: any;                         // List item data
}

<SPListView
  listNameOrId="Documents"
  isDocumentLibrary={true}

  upload={{
    enabled: true,
    mode: 'multiple',
    folder: '/Shared Documents/Reports',
    allowedExtensions: ['.pdf', '.docx', '.xlsx'],
    maxFileSize: 10 * 1024 * 1024,  // 10MB
    showDropZone: true,
    dropZoneText: 'Drop files here to upload',
  }}

  onFileUploading={(file) => {
    console.log('Uploading:', file.name);
  }}

  onFileUploaded={(uploadedFile) => {
    console.log('Uploaded:', uploadedFile.serverRelativeUrl);
  }}

  onUploadError={(error, file) => {
    console.error('Upload failed:', file.name, error);
  }}
/>
```

### File Download

Single and bulk file download support.

```typescript
<SPListView
  listNameOrId="Documents"
  isDocumentLibrary={true}

  download={{
    enabled: true,

    // For bulk downloads
    bulkMode: 'zip',                // 'zip' | 'individual'
    zipFileName: 'documents.zip',
  }}

  // Download is available in:
  // 1. ECB menu (single file)
  // 2. Selection toolbar (bulk)
  // 3. Programmatically via ref
/>
```

---

## SPDynamicForm Integration

### Form Configuration

Control how items are displayed/edited in SPDynamicForm.

```typescript
interface ISPListViewFormConfig {
  // Container settings
  containerType: 'panel' | 'dialog';
  panelSize?: 'small' | 'medium' | 'large' | 'extraLarge';
  dialogWidth?: number | string;

  // View Mode - Display item details (read-only)
  viewMode?: {
    fields?: string[];               // Whitelist: Only show these fields
    excludeFields?: string[];        // Blacklist: Hide these fields
    fieldOrder?: string[];           // Custom field order
    showSystemFields?: boolean;      // Show Created, Modified, Author, Editor
    layout?: 'single' | 'double';    // Column layout
  };

  // Edit Mode - Modify existing item
  editMode?: {
    fields?: string[];               // Whitelist: Only these fields editable
    excludeFields?: string[];        // Blacklist: These fields not shown
    readOnlyFields?: string[];       // Show but not editable
    fieldOrder?: string[];           // Custom field order
    requiredFields?: string[];       // Override required validation
  };

  // Add Mode - Create new item
  addMode?: {
    fields?: string[];               // Fields to show in new form
    excludeFields?: string[];        // Fields to hide
    fieldOrder?: string[];           // Custom field order
    defaultValues?: Record<string, any>;  // Pre-fill values
  };

  // Field-level overrides (applies to all modes)
  fieldOverrides?: Record<string, IFieldOverride>;

  // Form lifecycle events
  onFormOpen?: (mode: 'view' | 'edit' | 'add', item?: any) => void;
  onFormClose?: () => void;
  onBeforeSave?: (item: any) => Promise<any>;  // Transform before save
  onAfterSave?: (item: any) => void;
  onValidationError?: (errors: any) => void;
}

interface IFieldOverride {
  label?: string;                    // Custom label
  description?: string;              // Help text below field
  placeholder?: string;
  hidden?: boolean;                  // Hide in all modes
  readOnly?: boolean;                // Read-only in all modes
  required?: boolean;                // Override required
  width?: string | number;           // Field width
  colSpan?: 1 | 2;                   // Columns to span (in 2-column layout)
  renderer?: React.ComponentType<any>;  // Custom field renderer
  validator?: (value: any) => string | undefined;  // Custom validation
}
```

### Example: Task Management

```typescript
<SPListView
  listNameOrId="Tasks"
  formConfig={{
    containerType: 'panel',
    panelSize: 'medium',

    // View: Show all relevant fields
    viewMode: {
      excludeFields: ['ContentType', 'ComplianceAssetId', '_UIVersionString'],
      showSystemFields: true,
      layout: 'double',
    },

    // Edit: Limit editable fields
    editMode: {
      fields: ['Title', 'Description', 'Status', 'Priority', 'AssignedTo', 'DueDate', 'PercentComplete'],
      readOnlyFields: ['Created', 'Author'],
      requiredFields: ['Title', 'Status'],
    },

    // Add: Minimal fields with defaults
    addMode: {
      fields: ['Title', 'Description', 'AssignedTo', 'DueDate', 'Priority'],
      defaultValues: {
        Status: 'Not Started',
        Priority: '(2) Normal',
        PercentComplete: 0,
      },
    },

    // Field customizations
    fieldOverrides: {
      Title: {
        label: 'Task Name',
        required: true,
        colSpan: 2,
      },
      Description: {
        label: 'Task Details',
        colSpan: 2,
      },
      DueDate: {
        label: 'Deadline',
        description: 'When should this task be completed?',
      },
      PercentComplete: {
        label: 'Progress (%)',
        renderer: ProgressSlider,
      },
    },

    onBeforeSave: async (item) => {
      // Auto-set status based on completion
      if (item.PercentComplete === 100) {
        item.Status = 'Completed';
      }
      return item;
    },
  }}
/>
```

### Example: Document Library

```typescript
<SPListView
  listNameOrId="Documents"
  isDocumentLibrary={true}

  formConfig={{
    containerType: 'panel',
    panelSize: 'large',

    // View: Show document metadata
    viewMode: {
      fields: ['Name', 'Title', 'DocumentType', 'Author', 'Created', 'Modified', 'Editor', 'FileSize'],
      showSystemFields: true,
    },

    // Edit: Only allow editing metadata, not file
    editMode: {
      fields: ['Title', 'DocumentType', 'Description', 'Keywords'],
      excludeFields: ['Name', 'FileLeafRef'],  // Can't rename via form
    },

    fieldOverrides: {
      Name: {
        label: 'File Name',
        readOnly: true,
      },
      FileSize: {
        label: 'Size',
        readOnly: true,
        renderer: FileSizeRenderer,  // Formats bytes to KB/MB
      },
    },
  }}
/>
```

---

## Permissions & Security

### Permission Checking

Actions are automatically filtered based on user permissions.

```typescript
// Permissions checked for standard actions
const permissionMapping = {
  view: SPPermissionKind.ViewListItems,
  edit: SPPermissionKind.EditListItems,
  delete: SPPermissionKind.DeleteListItems,
  add: SPPermissionKind.AddListItems,
  managePermissions: SPPermissionKind.ManagePermissions,
  approve: SPPermissionKind.ApproveItems,
};

// Custom permission requirements
<SPListView
  listNameOrId="Tasks"
  ecbActions={[
    {
      key: 'approve',
      text: 'Approve',
      iconName: 'CheckMark',
      requiresPermission: SPPermissionKind.ApproveItems,
      onClick: (item) => approveItem(item.ID),
    },
  ]}
/>
```

### Permission Caching

User permissions are cached to avoid repeated API calls.

```typescript
// Permissions cached per list for session
// Automatically refreshed on:
// - Page reload
// - Explicit refresh call
// - Permission change detection (optional polling)
```

---

## API Reference

### Main Component Props

```typescript
interface ISPListViewProps {
  // ===== DATA SOURCE =====
  /** List title or GUID */
  listNameOrId: string;

  /** Site URL for cross-site queries (uses current site if not specified) */
  siteUrl?: string;

  /** CAML query XML for filtering/sorting */
  camlQuery?: string;

  /** Fields to retrieve and display */
  viewFields?: string[];

  /** Number of items per page */
  rowLimit?: number;

  /** Fields to expand (lookups, users) */
  expandFields?: string[];

  // ===== SAVE BEHAVIOR =====
  /** Save mode: 'instant' or 'on-demand' */
  saveMode: 'instant' | 'on-demand';

  /** Callback when save completes (instant mode) */
  onSaveSuccess?: (item: any) => void;

  /** Callback when save fails */
  onSaveError?: (error: Error, item: any) => void;

  /** Callback when changes are detected (on-demand mode) */
  onChangesDetected?: (hasChanges: boolean) => void;

  // ===== DOCUMENT LIBRARY =====
  /** Enable document library features */
  isDocumentLibrary?: boolean;

  /** Upload configuration */
  upload?: IUploadConfig;

  /** Download configuration */
  download?: IDownloadConfig;

  /** File upload progress callback */
  onFileUploading?: (file: File) => void;

  /** File upload complete callback */
  onFileUploaded?: (uploadedFile: IUploadedFile) => void;

  /** File upload error callback */
  onUploadError?: (error: Error, file: File) => void;

  // ===== SELECTION =====
  /** Selection mode */
  selectionMode?: 'none' | 'single' | 'multiple';

  /** Show toolbar when items selected */
  showSelectionToolbar?: boolean;

  /** Custom toolbar actions */
  toolbarActions?: IToolbarAction[];

  /** Selection change callback */
  onSelectionChanged?: (selectedItems: any[]) => void;

  // ===== COLUMNS =====
  /** Column configuration */
  columns?: IColumnConfig[];

  /** Enable column chooser UI */
  allowColumnChooser?: boolean;

  /** Enable column drag-drop reorder */
  allowColumnReorder?: boolean;

  /** localStorage key for column preferences */
  columnPreferenceKey?: string;

  // ===== ECB MENU =====
  /** Show ECB context menu */
  showECBMenu?: boolean;

  /** ECB menu actions */
  ecbActions?: IECBAction[];

  // ===== TITLE HOVER CARD =====
  /** Title hover card configuration */
  titleHoverCard?: ITitleHoverCardConfig;

  // ===== FORM INTEGRATION =====
  /** SPDynamicForm configuration */
  formConfig?: ISPListViewFormConfig;

  // ===== EVENTS =====
  /** Row click handler */
  onRowClick?: (item: any) => void;

  /** Row double-click handler */
  onRowDoubleClick?: (item: any) => void;

  /** Data loaded callback */
  onDataLoaded?: (items: any[], totalCount: number) => void;

  /** Error callback */
  onError?: (error: Error) => void;

  // ===== STYLING =====
  /** Additional CSS class */
  className?: string;

  /** Inline styles */
  style?: React.CSSProperties;

  /** Grid height */
  height?: number | string;
}
```

### Ref Methods

```typescript
interface ISPListViewRef {
  /** Refresh data from SharePoint */
  refresh(): Promise<void>;

  /** Get pending changes (on-demand mode) */
  getChanges(): IListViewChanges | null;

  /** Save all pending changes (on-demand mode) */
  save(): Promise<void>;

  /** Discard all pending changes (on-demand mode) */
  discardChanges(): void;

  /** Get selected items */
  getSelectedItems(): any[];

  /** Clear selection */
  clearSelection(): void;

  /** Select items by ID */
  selectItems(ids: number[]): void;

  /** Get current data */
  getData(): any[];

  /** Download selected files (document library) */
  downloadSelected(): Promise<void>;

  /** Open view form for item */
  viewItem(itemId: number): void;

  /** Open edit form for item */
  editItem(itemId: number): void;

  /** Open add form */
  addItem(): void;
}
```

---

## Usage Examples

### Basic List View

```typescript
import { SPListView } from 'spfx-toolkit/lib/components/SPListView';

<SPListView
  listNameOrId="Tasks"
  saveMode="instant"
  viewFields={['Title', 'Status', 'AssignedTo', 'DueDate']}
  selectionMode="multiple"
  showECBMenu={true}
/>
```

### On-Demand Save with Form

```typescript
import { SPListView, ISPListViewRef } from 'spfx-toolkit/lib/components/SPListView';

const MyFormComponent: React.FC = () => {
  const listViewRef = React.useRef<ISPListViewRef>(null);
  const [hasChanges, setHasChanges] = React.useState(false);

  const handleSave = async () => {
    // Save list view changes
    await listViewRef.current?.save();

    // Save other form data...
  };

  return (
    <form>
      {/* Other form fields */}

      <SPListView
        ref={listViewRef}
        listNameOrId="LineItems"
        saveMode="on-demand"
        onChangesDetected={setHasChanges}
        formConfig={{
          containerType: 'dialog',
          editMode: {
            fields: ['Product', 'Quantity', 'UnitPrice'],
          },
        }}
      />

      <button onClick={handleSave} disabled={!hasChanges}>
        Save All
      </button>
    </form>
  );
};
```

### Document Library with Upload

```typescript
<SPListView
  listNameOrId="Documents"
  isDocumentLibrary={true}
  saveMode="instant"

  upload={{
    enabled: true,
    mode: 'multiple',
    allowedExtensions: ['.pdf', '.docx', '.xlsx', '.pptx'],
    maxFileSize: 25 * 1024 * 1024,
    showDropZone: true,
  }}

  selectionMode="multiple"
  showSelectionToolbar={true}
  toolbarActions={[
    { key: 'download', text: 'Download', iconName: 'Download' },
    { key: 'delete', text: 'Delete', iconName: 'Delete' },
  ]}

  formConfig={{
    containerType: 'panel',
    viewMode: {
      fields: ['Name', 'Title', 'Author', 'Modified', 'FileSize'],
    },
    editMode: {
      fields: ['Title', 'Description', 'Category'],
    },
  }}
/>
```

### Cross-Site Query

```typescript
// Using multi-site connectivity
await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', { alias: 'hr' });

<SPListView
  listNameOrId="Employees"
  siteUrl="https://contoso.sharepoint.com/sites/hr"
  camlQuery={`
    <View>
      <Query>
        <Where>
          <Eq>
            <FieldRef Name="Department" />
            <Value Type="Text">Engineering</Value>
          </Eq>
        </Where>
      </Query>
    </View>
  `}
  viewFields={['Title', 'Email', 'Department', 'Manager', 'StartDate']}
/>
```

---

## File Structure

```
src/components/SPListView/
├── SPListView.tsx                 # Main component
├── SPListView.types.ts            # All TypeScript interfaces
├── SPListView.css                 # Minimal styling
├── index.ts                       # Public exports
├── README.md                      # Component documentation
│
├── hooks/
│   ├── index.ts
│   ├── useSPListView.ts           # Data fetching & CAML execution
│   ├── useListViewState.ts        # Change tracking for on-demand mode
│   ├── useSelectionToolbar.ts     # Selection state & toolbar actions
│   ├── useColumnConfig.ts         # Column visibility & order
│   └── usePermissions.ts          # Permission caching
│
├── components/
│   ├── index.ts
│   ├── ListViewToolbar.tsx        # Top toolbar with actions
│   ├── SelectionToolbar.tsx       # Bulk action bar
│   ├── ColumnChooser.tsx          # Column show/hide panel
│   ├── ECBMenu.tsx                # Context menu
│   ├── TitleHoverCard.tsx         # Rich preview popup
│   ├── FileUploader.tsx           # Drag-drop upload zone
│   ├── FileDropZone.tsx           # Drop overlay
│   └── UploadProgress.tsx         # Upload status indicator
│
├── renderers/
│   ├── index.ts                   # Renderer registry
│   ├── TextRenderer.tsx
│   ├── NumberRenderer.tsx
│   ├── CurrencyRenderer.tsx
│   ├── DateRenderer.tsx
│   ├── BooleanRenderer.tsx
│   ├── ChoiceRenderer.tsx
│   ├── MultiChoiceRenderer.tsx
│   ├── UserRenderer.tsx
│   ├── UserMultiRenderer.tsx
│   ├── LookupRenderer.tsx
│   ├── LookupMultiRenderer.tsx
│   ├── UrlRenderer.tsx
│   ├── TaxonomyRenderer.tsx
│   ├── TaxonomyMultiRenderer.tsx
│   └── TitleRenderer.tsx          # Special: includes hover card + ECB
│
└── utils/
    ├── index.ts
    ├── camlQueryExecutor.ts       # Execute CAML via PnP
    ├── fieldTypeMapper.ts         # SP field type → renderer mapping
    ├── columnBuilder.ts           # Build DX column config from SP fields
    ├── permissionChecker.ts       # Check user permissions
    └── fileUploader.ts            # Upload file to document library
```

---

## Implementation Phases

### Phase 1: Core Foundation
- Basic DataGrid setup with DevExtreme
- CAML query execution via PnP
- Simple text rendering
- Row click events
- Basic column configuration

### Phase 2: Field Renderers
- Implement all smart field renderers
- Field type auto-detection
- Custom renderer support
- Renderer registry pattern

### Phase 3: Save Modes
- Instant save mode
- On-demand save mode with change tracking
- Visual indicators for pending changes
- Rollback on failure

### Phase 4: UI Components
- ECB context menu
- Selection toolbar
- Title hover card
- Permission filtering

### Phase 5: Column Management
- Column chooser panel
- Column drag-drop reorder
- Preference persistence (localStorage)

### Phase 6: Document Library
- File upload (drag-drop + file picker)
- Upload progress & validation
- File download (single + bulk)
- Document library specific UI

### Phase 7: Form Integration
- SPDynamicForm integration
- View/Edit/Add mode configurations
- Field overrides
- Form lifecycle events

### Phase 8: Polish & Testing
- Accessibility audit
- Performance optimization
- Comprehensive testing
- Documentation

---

## Dependencies

### Required Peer Dependencies (Already in package.json)

| Package | Usage |
|---------|-------|
| `devextreme` | DataGrid component |
| `devextreme-react` | React wrapper for DevExtreme |
| `@pnp/sp` | SharePoint API operations |
| `@fluentui/react` | UI components (Panel, Dialog, etc.) |
| `react` | React framework |
| `react-hook-form` | Form integration |

### No New Dependencies Required

This component will be built entirely using existing peer dependencies.

---

## Open Questions

1. **Grouping Support** - Should we support DevExtreme grouping features?
2. **Export to Excel** - Should we include data export functionality?
3. **Filters UI** - Header filter vs filter row vs filter panel?
4. **Master-Detail** - Expandable rows with nested data?
5. **Infinite Scroll** - Virtual scrolling vs pagination?

---

## References

- [DevExtreme DataGrid Documentation](https://js.devexpress.com/Documentation/ApiReference/UI_Components/dxDataGrid/)
- [PnP/sp List Items](https://pnp.github.io/pnpjs/sp/items/)
- [CAML Query Reference](https://docs.microsoft.com/en-us/sharepoint/dev/schema/query-schema)
- [SharePoint Permissions](https://docs.microsoft.com/en-us/sharepoint/dev/solution-guidance/security-permissionslevels)

---

**Document Created:** November 2025
**Author:** SPFx Toolkit Team
