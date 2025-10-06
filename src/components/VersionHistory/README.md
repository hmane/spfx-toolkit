# VersionHistory Component

Advanced version history viewer for SharePoint documents and list items with field-level change tracking, built with React, Fluent UI, and DevExtreme.

## Features

### Core Functionality
- **Automatic Item Type Detection** - Detects whether viewing document or list item history
- **Field-Level Change Tracking** - Shows exactly which fields changed between versions with before/after comparison
- **User Profile Integration** - Automatically fetches and displays correct user names via SharePoint's ensureUser API
- **Smart Photo Detection** - Uses MD5 hash validation to show user photos or initials
- **Version Download** - Download any historical version of a document
- **CSV Export** - Export complete version history with all field changes
- **Advanced Filtering** - Filter by user, date range, search text, or major versions only
- **DevExtreme Popup** - Uses DevExtreme Popup with ScrollView for better screen utilization (95vw x 95vh)

### UI/UX
- **Minimal Design** - Streamlined interface focused on changes, not decoration
- **Compact Version Cards** - 60px height cards showing version, user avatar, time, and change count
- **Inline Field Comparison** - 3-column table layout with "Previous → New" inline display
- **Live Persona Integration** - Hover cards for user details via PnP LivePersona
- **Responsive Layout** - Optimized for desktop with mobile support
- **Collapsible Filters** - Keep UI clean when filters aren't needed

## Installation

```bash
npm install
```

### Dependencies

Required packages:
- `@fluentui/react` (v8.106.4)
- `@pnp/sp` (^3.20.1)
- `@pnp/queryable` (^3.20.1)
- `@pnp/spfx-controls-react` (for LivePersona)
- `devextreme-react` (22.2.3)
- `@microsoft/sp-loader` (for MD5 module)

## Usage

### Basic Example

```typescript
import { VersionHistory } from './components/VersionHistory';
import * as React from 'react';

const MyComponent: React.FC = () => {
  const [showHistory, setShowHistory] = React.useState(false);

  return (
    <>
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
    </>
  );
};
```

### With Callbacks

```typescript
<VersionHistory
  listId="07950eb9-7523-4e7e-9c78-19d719e06c7d"
  itemId={2}
  onClose={() => setShowHistory(false)}
  onExport={(versionCount) => {
    console.log(`Exported ${versionCount} versions`);
  }}
  onDownload={(version) => {
    console.log(`Downloaded v${version.versionLabel}`);
  }}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `listId` | `string` | Yes | SharePoint List GUID |
| `itemId` | `number` | Yes | SharePoint Item ID |
| `onClose` | `() => void` | Yes | Callback when popup is closed |
| `onExport` | `(versionCount: number) => void` | No | Callback after successful CSV export |
| `onDownload` | `(version: IVersionInfo) => void` | No | Callback after successful version download |

## Component Structure

```
VersionHistory/
├── VersionHistory.tsx          # Main component
├── VersionHistory.css          # Styles
├── types.ts                    # TypeScript interfaces
├── VersionHistoryUtils.ts      # Utility functions
├── index.ts                    # Exports
└── components/
    ├── VersionTimeline.tsx     # Left panel - version list
    ├── VersionCard.tsx         # Individual version card
    ├── VersionDetails.tsx      # Right panel - details view
    ├── FieldChangesTable.tsx   # Field changes table
    └── FieldChangeRow.tsx      # Individual field change row
```

## Key Features Explained

### Automatic User Profile Resolution

The component automatically fetches user profiles using SharePoint's `ensureUser` API:
- Fetches correct display name even if caller provides incorrect data
- Uses pessimistic caching for instant subsequent loads
- Falls back gracefully if user lookup fails

```typescript
// User info is automatically fetched and cached
// No need to provide display names - they're resolved automatically
```

### Smart Photo Detection

Uses MD5 hash validation to detect SharePoint's default placeholder images:
- Dynamically loads MD5 module from SharePoint
- Calculates hash of user photo
- Shows initials if photo is default placeholder
- Shows actual photo if user has uploaded one

### Version Download

For documents, supports downloading any historical version:
- Current version: Uses standard SharePoint API
- Historical versions: Uses `_vti_history` path with native fetch
- Auto-generates versioned filename (e.g., `document_v1_0.pdf`)

### Field Change Detection

Compares versions field-by-field:
- Filters out system fields automatically
- Shows added/modified/removed fields
- Handles all SharePoint field types (User, Lookup, DateTime, etc.)
- Color-coded for quick scanning

## Styling Customization

The component uses CSS classes that can be overridden:

```css
/* Customize version card height */
.version-card {
  height: 60px; /* Change to your preferred height */
}

/* Customize popup size */
.version-history-popup .dx-popup-content {
  /* Custom styles */
}

/* Customize colors */
.version-card.selected {
  border-color: #0078d4; /* Your brand color */
}
```

## Error Handling

The component handles common error scenarios:
- **Item not found** - Closes popup and shows helpful alert
- **No permission** - Shows clear message about access issues
- **Network errors** - Logs errors and shows user-friendly messages
- **Download failures** - Alerts user with specific error details

Example error message:
```
Unable to load version history.

Possible reasons:
• The item does not exist
• You do not have permission to view this item
• The item may have been deleted
```

## Performance Considerations

### Caching
- **User profiles**: Cached for 1 hour using pessimistic refresh
- **Version data**: Fetched once per component mount
- **MD5 module**: Loaded once and reused

### Rendering
- **Minimal re-renders**: Uses React.useMemo and React.useCallback
- **Lightweight cards**: 60px cards allow ~10-12 versions visible without scrolling
- **Lazy loading**: DevExtreme ScrollView for efficient scrolling

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- IE11 (not supported - requires modern browser)

## Known Limitations

1. **Historical versions for documents** - SharePoint's API returns only historical versions; current version is fetched separately
2. **User photos** - Requires valid email/UPN; won't show for external users without SharePoint profile
3. **Large files** - Download may be slow for very large document versions
4. **Field types** - Some custom field types may not format correctly

## Troubleshooting

### "Unknown User" showing
- Check that the version has Author/Editor/CreatedBy information
- Verify user exists in SharePoint site
- Check console for user extraction logs

### Download fails
- Verify user has permission to view historical versions
- Check that `_vti_history` folder is accessible
- Ensure version ID is correct

### No versions showing
- Verify versioning is enabled on the library/list
- Check user has permission to view item
- Ensure item actually has multiple versions

### Photos not loading
- Verify user has uploaded a photo to SharePoint/Microsoft 365
- Check network tab for 404s on photo URLs
- Ensure MD5 module loads successfully

## Development

### Adding New Field Types

To support custom field types, update `formatFieldValue` in `VersionHistoryUtils.ts`:

```typescript
case FieldType.YourCustomType:
  return formatYourCustomType(value);
```

### Adding System Fields

To filter out additional system fields, update `isSystemField`:

```typescript
const systemFields = [
  // ... existing fields
  'YourSystemField',
];
```

### Debugging

Enable verbose logging:
```typescript
console.log('[VersionHistory] ...'); // Already included throughout
```

Check these key logs:
- `[loadVersions]` - Version fetching
- `[processVersions]` - Version processing
- `[compareVersions]` - Field comparison
- `[downloadDocumentVersion]` - Download operations

## License

Include your license here.

## Support

For issues or questions, contact your development team.

## Changelog

### v2.0.0 (Current)
- Redesigned with DevExtreme Popup
- Removed export dialog complexity (Export All only)
- Minimal version cards (60px height)
- Automatic user profile resolution
- Smart photo detection with MD5 hash
- Inline field comparison (Previous → New)
- Fixed historical version downloads
- Improved error handling

### v1.0.0
- Initial release with Fluent UI Modal
- Basic version history viewing
- Field-level change tracking
