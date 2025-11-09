# SPListItemAttachments

A feature-rich, enterprise-grade attachment manager for SharePoint list items with drag-and-drop support, file previews, and comprehensive file management capabilities.

## Features

- ✅ **Drag and Drop Upload** - Intuitive drag-and-drop interface with visual feedback
- ✅ **File Type Icons** - PnP FileTypeIcon integration for professional appearance
- ✅ **Image Previews** - Automatic preview generation for image files
- ✅ **Progress Indicators** - Visual feedback for upload and delete operations
- ✅ **File Validation** - Size limits, extension filtering, and security checks
- ✅ **Multiple Display Modes** - Compact, List, and Grid views
- ✅ **Real-time Operations** - Instant upload and delete with SharePoint integration
- ✅ **Error Handling** - Comprehensive error messages and validation
- ✅ **Responsive Design** - Mobile-friendly with smooth animations
- ✅ **Accessibility** - WCAG 2.1 AA compliant

## Installation

```bash
npm install spfx-toolkit
```

## Basic Usage

### Edit Mode (Upload + Delete)

```tsx
import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';

<SPListItemAttachments
  listId="MyList"
  itemId={123}
  mode="edit"
  maxFileSize={25}
  allowedExtensions={['.pdf', '.docx', '.xlsx', '.jpg', '.png']}
/>
```

### New Item Mode (Staged Upload)

```tsx
<SPListItemAttachments
  listId="MyList"
  mode="new"
  onFilesAdded={(files) => {
    console.log('Files added:', files);
    // Store files for upload after item creation
  }}
/>
```

### View Mode (Read-Only)

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  mode="view"
  displayMode="grid"
  showPreviews={true}
/>
```

## Display Modes

### List Mode (Default)

```tsx
import { AttachmentDisplayMode } from 'spfx-toolkit/lib/components/SPListItemAttachments';

<SPListItemAttachments
  listId="MyList"
  itemId={123}
  displayMode={AttachmentDisplayMode.List}
/>
```

### Grid Mode (With Previews)

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  displayMode={AttachmentDisplayMode.Grid}
  showPreviews={true}
/>
```

### Compact Mode

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  displayMode={AttachmentDisplayMode.Compact}
/>
```

## Advanced Configuration

### File Size and Type Restrictions

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  maxFileSize={50} // MB
  allowedExtensions={['.pdf', '.docx', '.xlsx']}
  blockedExtensions={['.exe', '.bat', '.cmd']}
  maxAttachments={10}
/>
```

### Custom Labels and Descriptions

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  label="Supporting Documents"
  description="Upload relevant documents (max 25MB per file)"
/>
```

### Callbacks for Events

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  onFilesAdded={(files) => {
    console.log('Files added:', files);
  }}
  onFilesRemoved={(fileNames) => {
    console.log('Files removed:', fileNames);
  }}
  onUploadStart={(fileName) => {
    console.log('Uploading:', fileName);
  }}
  onUploadComplete={(fileName, success) => {
    console.log(`Upload ${success ? 'succeeded' : 'failed'}:`, fileName);
  }}
  onDeleteComplete={(fileName, success) => {
    console.log(`Delete ${success ? 'succeeded' : 'failed'}:`, fileName);
  }}
  onError={(error) => {
    console.error('Attachment error:', error);
  }}
/>
```

### Disable Drag and Drop

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  enableDragDrop={false}
/>
```

### Single File Selection

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  allowMultiple={false}
  maxAttachments={1}
/>
```

## Integration with SPDynamicForm

```tsx
import { SPDynamicForm } from 'spfx-toolkit/lib/components/SPDynamicForm';
import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';

<SPDynamicForm
  listId="MyList"
  mode="new"
  onSubmit={async (data) => {
    // Create item first
    const newItem = await createItem(data);

    // Then handle attachments
    return newItem;
  }}
  customContent={{
    position: 'bottom',
    render: (formData, itemId) => (
      <SPListItemAttachments
        listId="MyList"
        itemId={itemId}
        mode={itemId ? 'edit' : 'new'}
      />
    ),
  }}
/>
```

## Styling

### Custom Width

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  width="600px"
/>
```

### Custom CSS Class

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  className="my-custom-attachments"
/>
```

```css
.my-custom-attachments {
  border: 2px solid #0078d4;
  border-radius: 8px;
  padding: 16px;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `listId` | `string` | **Required** | SharePoint list ID or name |
| `itemId` | `number` | - | Item ID (required for edit/view modes) |
| `mode` | `'new' \| 'edit' \| 'view'` | `'edit'` | Component mode |
| `displayMode` | `AttachmentDisplayMode` | `List` | Display layout |
| `maxFileSize` | `number` | `10` | Maximum file size in MB |
| `allowedExtensions` | `string[]` | - | Allowed file extensions (e.g., `['.pdf']`) |
| `blockedExtensions` | `string[]` | `['.exe', '.bat', ...]` | Blocked extensions |
| `maxAttachments` | `number` | - | Maximum number of attachments |
| `enableDragDrop` | `boolean` | `true` | Enable drag and drop |
| `showPreviews` | `boolean` | `true` | Show image previews |
| `allowMultiple` | `boolean` | `true` | Allow multiple file selection |
| `disabled` | `boolean` | `false` | Disable all interactions |
| `label` | `string` | `'Attachments'` | Label text |
| `description` | `string` | - | Description text |
| `onFilesAdded` | `(files: File[]) => void` | - | Callback when files added |
| `onFilesRemoved` | `(fileNames: string[]) => void` | - | Callback when files removed |
| `onUploadStart` | `(fileName: string) => void` | - | Callback when upload starts |
| `onUploadComplete` | `(fileName: string, success: boolean) => void` | - | Callback when upload completes |
| `onDeleteComplete` | `(fileName: string, success: boolean) => void` | - | Callback when delete completes |
| `onError` | `(error: Error) => void` | - | Error callback |
| `className` | `string` | - | Custom CSS class |
| `width` | `string \| number` | `'100%'` | Component width |

## Types

### IAttachmentFile

```typescript
interface IAttachmentFile {
  fileName: string;
  serverRelativeUrl: string;
  size?: number; // For new files
}
```

### AttachmentDisplayMode

```typescript
enum AttachmentDisplayMode {
  Compact = 'compact',
  Grid = 'grid',
  List = 'list',
}
```

## Best Practices

### 1. Use in New Item Workflow

```tsx
const [newFiles, setNewFiles] = React.useState<File[]>([]);
const [itemId, setItemId] = React.useState<number | undefined>();

// Step 1: Create item
const handleSubmit = async (data) => {
  const item = await list.items.add(data);
  setItemId(item.data.Id);
};

// Step 2: Upload attachments
<SPListItemAttachments
  listId="MyList"
  itemId={itemId}
  mode={itemId ? 'edit' : 'new'}
  onFilesAdded={setNewFiles}
/>
```

### 2. Security Considerations

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  // Block executable files
  blockedExtensions={['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js']}
  // Limit size to prevent abuse
  maxFileSize={25}
  // Limit total attachments
  maxAttachments={10}
/>
```

### 3. User Experience

```tsx
<SPListItemAttachments
  listId="MyList"
  itemId={123}
  // Provide clear instructions
  label="Supporting Documents"
  description="Upload relevant documents (PDF, Word, Excel only)"
  // Show visual feedback
  showPreviews={true}
  // Enable easy upload
  enableDragDrop={true}
  // Handle errors gracefully
  onError={(error) => {
    notify.error(`Upload failed: ${error.message}`);
  }}
/>
```

## Performance Considerations

- **Image Previews**: Automatically generates preview URLs using `URL.createObjectURL()` with proper cleanup
- **Lazy Loading**: Attachments are loaded on-demand when component mounts
- **Optimistic Updates**: UI updates immediately with progress indicators
- **Memory Management**: Preview URLs are revoked when component unmounts or files change

## Troubleshooting

### Files Not Uploading

1. Check SPContext is initialized
2. Verify item ID exists for edit mode
3. Check user permissions on the list item
4. Verify file size doesn't exceed SharePoint limits (250MB default)

### Drag and Drop Not Working

1. Ensure `enableDragDrop={true}`
2. Check `mode` is not `'view'`
3. Verify `disabled={false}`
4. Test in supported browsers (Chrome, Edge, Firefox, Safari)

### File Type Icons Not Showing

1. Verify `@pnp/spfx-controls-react` is installed
2. Check import path is correct
3. Ensure FileTypeIcon component is available

## Browser Support

- ✅ Chrome (latest)
- ✅ Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ⚠️ IE11 (limited - no drag and drop)

## Related Components

- [SPDynamicForm](../SPDynamicForm/README.md) - Dynamic form generation
- [SPTextField](../spFields/SPTextField/README.md) - Text input field
- [SPFileField](../spFields/SPFileField/README.md) - File upload field (single file)

## License

MIT
