# SharePoint Helper Utility

Utility functions for working with SharePoint lists and items, including GUID detection and smart list retrieval.

## Features

- **GUID Detection** - Validate if a string is a valid GUID
- **Smart List Retrieval** - Automatically detect if identifier is GUID or title
- **GUID Normalization** - Format GUIDs with proper hyphenation

## Installation

```typescript
import { isGuid, getListByNameOrId, normalizeGuid } from 'spfx-toolkit/lib/utilities/spHelper';
```

## API Reference

### `isGuid(value: string): boolean`

Checks if a string is a valid GUID (Globally Unique Identifier).

**Parameters:**
- `value` - The string to test

**Returns:**
- `true` if the string is a valid GUID, `false` otherwise

**Examples:**

```typescript
import { isGuid } from 'spfx-toolkit/lib/utilities/spHelper';

// Valid GUIDs
isGuid('a1b2c3d4-e5f6-1234-5678-123456789abc'); // true
isGuid('A1B2C3D4E5F612345678123456789ABC'); // true (without hyphens)

// Invalid values
isGuid('MyList'); // false
isGuid('not-a-guid'); // false
isGuid(''); // false
```

**Supported Formats:**
- Standard GUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Compact GUID: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (32 hex characters)

---

### `getListByNameOrId(sp: SPFI, listNameOrId: string)`

Gets a SharePoint list by GUID or title. Automatically detects if the provided identifier is a GUID or title and calls the appropriate PnP method.

**Parameters:**
- `sp` - PnP SP instance (SPContext.sp, SPContext.spCached, or SPContext.spPessimistic)
- `listNameOrId` - List title or GUID

**Returns:**
- `IList` instance from @pnp/sp

**Examples:**

```typescript
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { getListByNameOrId } from 'spfx-toolkit/lib/utilities/spHelper';

// Using list title
const list1 = getListByNameOrId(SPContext.sp, 'Tasks');
const items1 = await list1.items();

// Using list GUID
const list2 = getListByNameOrId(SPContext.sp, 'a1b2c3d4-e5f6-1234-5678-123456789abc');
const items2 = await list2.items();

// Works seamlessly with both
async function getListItems(listNameOrId: string) {
  const list = getListByNameOrId(SPContext.sp, listNameOrId);
  return await list.items.select('Id', 'Title').top(100)();
}

// Can be called with either format
const taskItems = await getListItems('Tasks');
const documentItems = await getListItems('a1b2c3d4-e5f6-1234-5678-123456789abc');
```

**Use Cases:**
- **Flexible APIs** - Accept either list name or ID from users
- **Cross-site lookups** - GUIDs are more reliable across sites
- **Dynamic list references** - Switch between dev/prod lists by GUID
- **Configuration-driven** - Store list IDs in config files

**Performance Notes:**
- `getById()` is slightly faster than `getByTitle()` (direct ID lookup vs. name resolution)
- Using GUIDs avoids issues with renamed lists
- Both methods are cached by PnP when using `SPContext.spCached`

---

### `normalizeGuid(guid: string): string`

Normalizes a GUID to include hyphens if missing. Converts compact GUID format to standard format.

**Parameters:**
- `guid` - GUID with or without hyphens

**Returns:**
- GUID with hyphens in standard format (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

**Examples:**

```typescript
import { normalizeGuid } from 'spfx-toolkit/lib/utilities/spHelper';

// Add hyphens to compact GUID
normalizeGuid('a1b2c3d4e5f612345678123456789abc');
// Returns: 'a1b2c3d4-e5f6-1234-5678-123456789abc'

// Already formatted (returns unchanged)
normalizeGuid('a1b2c3d4-e5f6-1234-5678-123456789abc');
// Returns: 'a1b2c3d4-e5f6-1234-5678-123456789abc'

// Invalid GUID (returns original)
normalizeGuid('not-a-guid');
// Returns: 'not-a-guid'
```

**Use Cases:**
- Formatting user input
- Standardizing GUID display
- Preparing GUIDs for API calls

---

## Common Patterns

### Accept Both List Name and ID in Component Props

```typescript
interface IMyComponentProps {
  listNameOrId: string; // Can be either 'Tasks' or a GUID
}

const MyComponent: React.FC<IMyComponentProps> = ({ listNameOrId }) => {
  React.useEffect(() => {
    const loadItems = async () => {
      const list = getListByNameOrId(SPContext.sp, listNameOrId);
      const items = await list.items();
      // ...
    };
    loadItems();
  }, [listNameOrId]);

  return <div>...</div>;
};

// Usage
<MyComponent listNameOrId="Tasks" />
<MyComponent listNameOrId="a1b2c3d4-e5f6-1234-5678-123456789abc" />
```

### Configuration-Driven List References

```typescript
// config.json
{
  "lists": {
    "dev": {
      "tasks": "DevTasks",
      "documents": "DevDocuments"
    },
    "prod": {
      "tasks": "a1b2c3d4-e5f6-1234-5678-123456789abc",
      "documents": "b2c3d4e5-f6a7-2345-6789-23456789abcd"
    }
  }
}

// component.tsx
const environment = SPContext.environment;
const listId = config.lists[environment].tasks;
const list = getListByNameOrId(SPContext.sp, listId);
```

### Validate User Input

```typescript
import { isGuid } from 'spfx-toolkit/lib/utilities/spHelper';

function validateListInput(input: string): string | null {
  if (!input) {
    return 'List name or ID is required';
  }

  if (isGuid(input)) {
    return null; // Valid GUID
  }

  // Validate list name (alphanumeric, spaces, underscores)
  if (!/^[a-zA-Z0-9 _-]+$/.test(input)) {
    return 'Invalid list name or GUID';
  }

  return null; // Valid list name
}
```

---

## Implementation in SPFx Toolkit

This utility is used throughout the toolkit's spField components to provide flexible list references:

- **SPLookupField** - Supports list lookups by name or GUID
- **SPChoiceField** - Loads choice values from any list
- **SPField** - Auto-detects field types from lists
- **NoteHistory** - Loads version history from lists

---

## TypeScript Types

```typescript
import { SPFI } from '@pnp/sp';
import { IList } from '@pnp/sp/lists';

function isGuid(value: string): boolean;
function getListByNameOrId(sp: SPFI, listNameOrId: string): IList;
function normalizeGuid(guid: string): string;
```

---

## Best Practices

1. **Always use getListByNameOrId** - Don't manually check for GUID and call `getById` or `getByTitle`. Let the utility handle it.

2. **Prefer GUIDs in production** - List names can change, but GUIDs are permanent. Store GUIDs in configuration.

3. **Use descriptive names in development** - Human-readable names make debugging easier during development.

4. **Validate user input** - Use `isGuid` to validate and provide helpful error messages.

5. **Cache appropriately** - Use `SPContext.spCached` for frequently accessed lists, `SPContext.spPessimistic` for always-fresh data.

---

## Related Utilities

- [SPContext](../context/README.md) - SPFx context management
- [ListItemHelper](../listItemHelper/README.md) - Field extraction and updates
- [BatchBuilder](../batchBuilder/README.md) - Batch operations on lists

---

## Migration Guide

If you have existing code using `sp.web.lists.getByTitle()`, update it:

**Before:**
```typescript
const list = sp.web.lists.getByTitle(listName);
```

**After:**
```typescript
import { getListByNameOrId } from 'spfx-toolkit/lib/utilities/spHelper';

const list = getListByNameOrId(sp, listNameOrId); // Works with both name and GUID
```

**Benefits:**
- No code changes needed to support GUIDs
- More robust against list renames
- Consistent API across all list operations
