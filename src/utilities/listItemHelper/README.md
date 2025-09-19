# List Item Helper Utility

A powerful SharePoint list item manipulation utility for SPFx applications that simplifies extracting and updating SharePoint field values with automatic type detection and proper formatting.

## Overview

The List Item Helper provides two main factory functions:
- **`createSPExtractor`** - Extract and transform values from SharePoint list items
- **`createSPUpdater`** - Build field updates for SharePoint operations

Plus a collection of convenience functions for common operations.

## Installation

```typescript
import {
  createSPExtractor,
  createSPUpdater,
  extractField,
  quickUpdate
} from 'spfx-toolkit/utils';
```

## Quick Start

### Extracting Field Values

```typescript
import { createSPExtractor } from 'spfx-toolkit/utils';

// Sample SharePoint list item
const listItem = {
  ID: 42,
  Title: "Project Alpha",
  DueDate: "2024-12-31T00:00:00Z",
  AssignedTo: { ID: 123, Title: "John Doe", EMail: "john@company.com" },
  ProjectCategory: { ID: 5, Title: "Development" },
  Tags: { results: [
    { Label: "Critical", TermGuid: "abc-123" },
    { Label: "Frontend", TermGuid: "def-456" }
  ]}
};

// Create extractor
const extractor = createSPExtractor(listItem);

// Extract different field types
const id = extractor.number('ID');                    // 42
const title = extractor.string('Title');              // "Project Alpha"
const dueDate = extractor.date('DueDate');            // Date object
const assignedUser = extractor.user('AssignedTo');    // IPrincipal object
const category = extractor.lookup('ProjectCategory'); // SPLookup object
const tags = extractor.taxonomyMulti('Tags');         // SPTaxonomy[]
```

### Updating Field Values

```typescript
import { createSPUpdater } from 'spfx-toolkit/utils';

// Create updater
const updater = createSPUpdater();

// Chain field updates
const updates = updater
  .set('Title', 'Updated Project Title')
  .set('DueDate', new Date('2024-12-31'))
  .set('AssignedToId', 123)
  .set('ProjectCategoryId', 5)
  .set('IsActive', true)
  .getUpdates();

// Use with PnP.js
await sp.web.lists.getByTitle("Projects").items.getById(42).update(updates);
```

## API Reference

### createSPExtractor(item)

Creates an extractor instance for a SharePoint list item.

#### Basic Field Types

| Method | Description | Returns |
|--------|-------------|---------|
| `string(fieldName, defaultValue?)` | Extract text field | `string` |
| `number(fieldName, defaultValue?)` | Extract number field | `number` |
| `boolean(fieldName, defaultValue?)` | Extract yes/no field | `boolean` |
| `date(fieldName, defaultValue?)` | Extract date/time field | `Date \| undefined` |
| `choice(fieldName, defaultValue?)` | Extract choice field | `string` |
| `currency(fieldName, defaultValue?)` | Extract currency field | `number` |

#### Complex Field Types

| Method | Description | Returns |
|--------|-------------|---------|
| `user(fieldName)` | Extract person/group field | `IPrincipal \| undefined` |
| `userMulti(fieldName)` | Extract multi-person field | `IPrincipal[]` |
| `lookup(fieldName)` | Extract lookup field | `SPLookup \| undefined` |
| `lookupMulti(fieldName)` | Extract multi-lookup field | `SPLookup[]` |
| `taxonomy(fieldName)` | Extract managed metadata | `SPTaxonomy \| undefined` |
| `taxonomyMulti(fieldName)` | Extract multi-metadata field | `SPTaxonomy[]` |
| `multiChoice(fieldName)` | Extract multi-choice field | `string[]` |
| `url(fieldName)` | Extract hyperlink field | `SPUrl \| undefined` |
| `location(fieldName)` | Extract location field | `SPLocation \| undefined` |
| `image(fieldName)` | Extract image field | `SPImage \| undefined` |
| `json(fieldName)` | Extract JSON field | `any` |

#### Utility Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `hasField(fieldName)` | Check if field exists | `boolean` |
| `hasFields(...fieldNames)` | Check if all fields exist | `boolean` |
| `missingFields(...fieldNames)` | Get missing field names | `string[]` |
| `raw` | Access raw item data | `any` |

### createSPUpdater()

Creates an updater instance for building SharePoint field updates.

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `set(fieldName, value)` | Set field value (chainable) | `this` |
| `getUpdates()` | Get updates for PnP.js | `Record<string, any>` |
| `getValidateUpdates()` | Get updates for validate methods | `IListItemFormUpdateValue[]` |
| `clear()` | Clear all updates | `this` |
| `count()` | Get number of updates | `number` |
| `hasField(fieldName)` | Check if field is set | `boolean` |

## Type Definitions

### IPrincipal
```typescript
interface IPrincipal {
  id: string;
  email?: string;
  title?: string;
  value?: string;        // login name
  loginName?: string;
  department?: string;
  jobTitle?: string;
  sip?: string;
  picture?: string;
}
```

### SPLookup
```typescript
interface SPLookup {
  id?: number;
  title?: string;
}
```

### SPTaxonomy
```typescript
interface SPTaxonomy {
  label?: string;
  termId?: string;
  wssId?: number;
}
```

### SPUrl
```typescript
interface SPUrl {
  url?: string;
  description?: string;
}
```

### SPLocation
```typescript
interface SPLocation {
  displayName?: string;
  locationUri?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}
```

### SPImage
```typescript
interface SPImage {
  serverUrl?: string;
  serverRelativeUrl?: string;
  id?: string;
  fileName?: string;
}
```

## Convenience Functions

### extractField()
Extract a single field with type specification:

```typescript
import { extractField } from 'spfx-toolkit/utils';

const title = extractField(item, 'Title', 'string', 'Default Title');
const dueDate = extractField(item, 'DueDate', 'date');
const assignedUser = extractField(item, 'AssignedTo', 'user');
```

**Supported Types:** `'string'`, `'number'`, `'boolean'`, `'date'`, `'user'`, `'lookup'`, `'taxonomy'`, `'choice'`, `'url'`, `'json'`

### extractFields()
Extract multiple fields with configuration:

```typescript
import { extractFields } from 'spfx-toolkit/utils';

const fields = extractFields(item, {
  title: { type: 'string', defaultValue: 'Untitled' },
  dueDate: { type: 'date' },
  assignedUser: { type: 'user' },
  priority: { type: 'choice', defaultValue: 'Medium' }
});
```

### transformItem()
Transform SharePoint item to clean object:

```typescript
import { transformItem } from 'spfx-toolkit/utils';

const cleanItem = transformItem(item, {
  id: { sourceField: 'ID', type: 'number' },
  title: { sourceField: 'Title', type: 'string' },
  created: { sourceField: 'Created', type: 'date' },
  assignedTo: { sourceField: 'AssignedTo', type: 'user' }
});
```

### quickUpdate() & quickValidateUpdate()
Quick single-field updates:

```typescript
import { quickUpdate, quickValidateUpdate } from 'spfx-toolkit/utils';

// For regular updates
const updates = quickUpdate('Title', 'New Title');

// For validate updates
const validateUpdates = quickValidateUpdate('Title', 'New Title');
```

## Validation Utilities

### validateRequiredFields()
Check for required fields:

```typescript
import { validateRequiredFields } from 'spfx-toolkit/utils';

const validation = validateRequiredFields(item, ['Title', 'DueDate', 'AssignedTo']);
if (!validation.isValid) {
  console.log('Missing fields:', validation.missingFields);
}
```

### validateFieldValues()
Check for empty field values:

```typescript
import { validateFieldValues } from 'spfx-toolkit/utils';

const validation = validateFieldValues(item, ['Title', 'Description']);
if (!validation.isValid) {
  console.log('Empty fields:', validation.emptyFields);
}
```

### detectFieldType()
Auto-detect SharePoint field type from value:

```typescript
import { detectFieldType } from 'spfx-toolkit/utils';

const type1 = detectFieldType("Hello World");           // "text"
const type2 = detectFieldType(42);                      // "number"
const type3 = detectFieldType(new Date());              // "datetime"
const type4 = detectFieldType({ id: 1, title: "Item" }); // "lookup"
const type5 = detectFieldType({ email: "user@domain.com" }); // "user"
```

## Migration Utilities

### migrateFields()
Convert field structures for migrations:

```typescript
import { migrateFields } from 'spfx-toolkit/utils';

const migratedItems = migrateFields(items, {
  'OldFieldName': 'NewFieldName',
  'CategoryId': {
    newField: 'Category',
    transform: (value) => ({ id: value, title: getCategoryTitle(value) })
  }
});
```

## Common Field Mappings

Pre-defined mappings for standard SharePoint lists:

```typescript
import { COMMON_FIELD_MAPPINGS, transformItem } from 'spfx-toolkit/utils';

// Basic list item mapping
const basicItem = transformItem(item, COMMON_FIELD_MAPPINGS.BASIC_ITEM);
// Result: { id, title, created, modified, author, editor }

// Document library mapping
const document = transformItem(item, COMMON_FIELD_MAPPINGS.DOCUMENT_LIBRARY);
// Result: { id, name, title, size, created, modified }
```

## Advanced Examples

### Working with Complex Fields

```typescript
// Extract complex field combinations
const extractor = createSPExtractor(listItem);

// Handle user fields
const singleUser = extractor.user('AssignedTo');
const multipleUsers = extractor.userMulti('TeamMembers');

// Handle lookup fields
const parentProject = extractor.lookup('ParentProject');
const relatedItems = extractor.lookupMulti('RelatedItems');

// Handle taxonomy fields
const primaryCategory = extractor.taxonomy('PrimaryCategory');
const allTags = extractor.taxonomyMulti('Tags');

// Handle choice fields
const status = extractor.choice('Status');
const selectedOptions = extractor.multiChoice('Options');
```

### Building Complex Updates

```typescript
// Build comprehensive update object
const updater = createSPUpdater()
  .set('Title', 'Updated Project')
  .set('Description', 'New description')
  .set('DueDate', new Date('2024-12-31'))
  .set('AssignedToId', 123)
  .set('Priority', 'High')
  .set('IsActive', true)
  .set('Tags', [
    { label: 'Important', termId: 'guid-1' },
    { label: 'Frontend', termId: 'guid-2' }
  ])
  .set('RelatedItemsId', [1, 2, 3]);

// Get updates for different PnP.js methods
const regularUpdates = updater.getUpdates();
const validateUpdates = updater.getValidateUpdates();
```

### Real-world SPFx Component Example

```typescript
import * as React from 'react';
import { createSPExtractor, createSPUpdater } from 'spfx-toolkit/utils';

export const ProjectCard: React.FC<{ item: any }> = ({ item }) => {
  const extractor = createSPExtractor(item);

  // Extract all needed fields
  const project = {
    id: extractor.number('ID'),
    title: extractor.string('Title', 'Untitled Project'),
    description: extractor.string('Description', 'No description'),
    dueDate: extractor.date('DueDate'),
    assignedTo: extractor.user('AssignedTo'),
    status: extractor.choice('Status', 'Not Started'),
    priority: extractor.choice('Priority', 'Medium'),
    tags: extractor.taxonomyMulti('Tags'),
    isActive: extractor.boolean('IsActive', true)
  };

  const handleStatusUpdate = async (newStatus: string) => {
    const updates = createSPUpdater()
      .set('Status', newStatus)
      .set('Modified', new Date())
      .getUpdates();

    // Update using PnP.js
    await sp.web.lists.getByTitle("Projects")
      .items.getById(project.id)
      .update(updates);
  };

  return (
    <div className="project-card">
      <h3>{project.title}</h3>
      <p>{project.description}</p>

      {project.dueDate && (
        <div>Due: {project.dueDate.toLocaleDateString()}</div>
      )}

      {project.assignedTo && (
        <div>Assigned to: {project.assignedTo.title}</div>
      )}

      <div>Status: {project.status}</div>
      <div>Priority: {project.priority}</div>

      {project.tags.length > 0 && (
        <div>
          Tags: {project.tags.map(tag => tag.label).join(', ')}
        </div>
      )}

      <button onClick={() => handleStatusUpdate('Completed')}>
        Mark Complete
      </button>
    </div>
  );
};
```

## Best Practices

### 1. Use Type-Safe Extraction
```typescript
// Good: Specify types and defaults
const title = extractor.string('Title', 'Untitled');
const dueDate = extractor.date('DueDate');

// Avoid: Relying on raw access
const title = item.Title || 'Untitled'; // Loses type safety
```

### 2. Validate Required Fields
```typescript
// Always validate critical fields
const validation = validateRequiredFields(item, ['Title', 'AssignedTo']);
if (!validation.isValid) {
  throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
}
```

### 3. Handle Multi-Value Fields Properly
```typescript
// Handle PnP.js results array format
const users = extractor.userMulti('TeamMembers'); // Automatically handles .results
const tags = extractor.taxonomyMulti('Categories'); // Automatically handles .results
```

### 4. Use Convenience Functions for Simple Operations
```typescript
// For single field extraction
const title = extractField(item, 'Title', 'string', 'Default');

// For quick updates
const updates = quickUpdate('Status', 'Completed');
```

### 5. Chain Updates for Better Performance
```typescript
// Good: Chain multiple updates
const updates = createSPUpdater()
  .set('Field1', value1)
  .set('Field2', value2)
  .set('Field3', value3)
  .getUpdates();

// Avoid: Multiple updater instances
const updates1 = quickUpdate('Field1', value1);
const updates2 = quickUpdate('Field2', value2);
```

## Error Handling

The utility handles common SharePoint field scenarios:

- **Missing fields**: Returns undefined or default values
- **Null values**: Properly handled with defaults
- **PnP.js results arrays**: Automatically unwrapped
- **Type mismatches**: Graceful fallbacks
- **Invalid dates**: Returns undefined instead of invalid Date objects

## Performance Tips

1. **Reuse extractors** for multiple field operations on the same item
2. **Use convenience functions** for one-off operations
3. **Validate once** at the beginning of your operations
4. **Chain updates** instead of creating multiple updater instances
5. **Use transform functions** for bulk data processing

## Troubleshooting

### Common Issues

**Q: Getting undefined for a field that exists?**
A: Check the exact field internal name. Use `extractor.raw` to inspect the actual item structure.

**Q: User/Lookup updates not working?**
A: Make sure to use the `Id` suffix for lookup/user fields (e.g., `AssignedToId` not `AssignedTo`).

**Q: Taxonomy fields not updating?**
A: Ensure you're providing the correct `termId` in the taxonomy object.

**Q: Multi-value fields returning empty arrays?**
A: Check if the field uses `.results` array format from PnP.js queries.

### Debug Mode

```typescript
// Inspect raw item structure
const extractor = createSPExtractor(item);
console.log('Raw item:', extractor.raw);

// Check for missing fields
const missing = extractor.missingFields('Field1', 'Field2', 'Field3');
console.log('Missing fields:', missing);
```

