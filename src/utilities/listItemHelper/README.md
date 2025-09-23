# List Item Helper Utility

A powerful SharePoint list item manipulation utility for SPFx applications that simplifies extracting and updating SharePoint field values with automatic type detection, change detection, and proper formatting.

## Overview

The List Item Helper provides two main factory functions optimized for SharePoint's `renderListData` API:
- **`createSPExtractor`** - Extract and transform values from SharePoint list items with enhanced type handling
- **`createSPUpdater`** - Build field updates for SharePoint operations with automatic change detection

Plus a comprehensive collection of convenience functions for common operations.

## Dependencies & Compatibility

### Primary Dependency
This utility is **optimized for SharePoint's `renderListData` API** which is typically used with CAML queries. It handles the native object structures returned by `renderListData` without requiring additional transformations.

### Additional Dependencies
```json
{
  "@microsoft/sp-lodash-subset": "^1.x.x"
}
```

### Compatibility
- **Primary**: SharePoint `renderListData` API responses
- **Secondary**: PnP.js REST API responses (with `.results` wrapper handling)
- **SharePoint Versions**: SharePoint Online, SharePoint 2019+
- **SPFx Versions**: 1.11+

## Installation

```typescript
import {
  createSPExtractor,
  createSPUpdater,
  extractField,
  quickUpdate,
  createUpdatesFromItem,
  compareItems
} from 'spfx-toolkit/lib/utilities/listItemHelper';
```

## Quick Start

### Using with renderListData (CAML Queries)

```typescript
import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';

// Sample SharePoint renderListData response item
const renderListDataItem = {
  ID: 42,
  Title: "Project Alpha",
  DueDate: "2024-12-31T00:00:00Z",

  // User field - renderListData format (lowercase properties)
  AssignedTo: {
    id: "123",
    email: "john@company.com",
    title: "John Doe",
    value: "i:0#.f|membership|john@company.com",
    loginName: "i:0#.f|membership|john@company.com"
  },

  // Lookup field - renderListData format
  ProjectCategory: {
    id: 5,
    title: "Development"
  },

  // Multi-user field - direct array (no .results wrapper)
  TeamMembers: [
    {
      id: "123",
      email: "john@company.com",
      title: "John Doe",
      value: "i:0#.f|membership|john@company.com"
    },
    {
      id: "456",
      email: "jane@company.com",
      title: "Jane Smith",
      value: "i:0#.f|membership|jane@company.com"
    }
  ],

  // Taxonomy field - renderListData format (lowercase properties)
  Tags: [
    {
      label: "Critical",
      termId: "abc-123",
      wssId: 10
    },
    {
      label: "Frontend",
      termId: "def-456",
      wssId: 11
    }
  ],

  IsActive: true,
  Budget: 50000
};

// Create extractor - optimized for renderListData format
const extractor = createSPExtractor(renderListDataItem);

// Extract different field types
const id = extractor.number('ID');                    // 42
const title = extractor.string('Title');              // "Project Alpha"
const dueDate = extractor.date('DueDate');            // Date object
const assignedUser = extractor.user('AssignedTo');    // IPrincipal object
const category = extractor.lookup('ProjectCategory'); // SPLookup object
const teamMembers = extractor.userMulti('TeamMembers'); // IPrincipal[]
const tags = extractor.taxonomyMulti('Tags');         // SPTaxonomy[]
const isActive = extractor.boolean('IsActive');       // true
const budget = extractor.currency('Budget');          // 50000
```

### Real-world renderListData Usage

```typescript
// Using renderListData with CAML query
async function getProjectsWithCAML(): Promise<any[]> {
  const camlQuery = `
    <View>
      <Query>
        <Where>
          <Eq>
            <FieldRef Name='Status' />
            <Value Type='Choice'>Active</Value>
          </Eq>
        </Where>
      </Query>
      <ViewFields>
        <FieldRef Name='ID' />
        <FieldRef Name='Title' />
        <FieldRef Name='AssignedTo' />
        <FieldRef Name='TeamMembers' />
        <FieldRef Name='Category' />
        <FieldRef Name='Tags' />
        <FieldRef Name='DueDate' />
        <FieldRef Name='Budget' />
      </ViewFields>
    </View>
  `;

  const renderListDataParams = {
    ViewXml: camlQuery,
    RenderOptions: 2, // Include field values
  };

  // Call SharePoint renderListData API
  const response = await this.context.spHttpClient.post(
    `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Projects')/renderListData`,
    SPHttpClient.configurations.v1,
    {
      headers: {
        'Accept': 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose'
      },
      body: JSON.stringify(renderListDataParams)
    }
  );

  const data = await response.json();
  const items = data.ListData.Row; // renderListData format

  // Process items with List Item Helper
  return items.map(item => {
    const extractor = createSPExtractor(item);

    return {
      id: extractor.number('ID'),
      title: extractor.string('Title'),
      assignedTo: extractor.user('AssignedTo'),         // Handles renderListData user format
      teamMembers: extractor.userMulti('TeamMembers'), // Handles direct arrays
      category: extractor.lookup('Category'),           // Handles renderListData lookup format
      tags: extractor.taxonomyMulti('Tags'),           // Handles direct taxonomy arrays
      dueDate: extractor.date('DueDate'),
      budget: extractor.currency('Budget')
    };
  });
}
```

### Updating with Change Detection

```typescript
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

// Original item from renderListData
const originalItem = {
  ID: 42,
  Title: "Project Alpha",
  Description: "Original description",
  AssignedTo: { id: "123", title: "John Doe", email: "john@company.com" },
  Priority: "Medium",
  IsActive: true
};

// New values to update
const newValues = {
  Title: "Project Alpha",           // Same - won't update
  Description: "Updated description", // Changed - will update
  AssignedTo: { id: "456", title: "Jane Smith", email: "jane@company.com" }, // Changed - will update
  Priority: "Medium",              // Same - won't update
  IsActive: false                  // Changed - will update
};

// Create updater with change detection
const updater = createSPUpdater();

Object.entries(newValues).forEach(([field, value]) => {
  updater.set(field, value, originalItem[field]);
});

// Check what changed
console.log('Has changes:', updater.hasChanges()); // true
console.log('Changed fields:', updater.getChangedFields()); // ['Description', 'AssignedTo', 'IsActive']

// Get only the changed fields for update (optimized for performance)
const updates = updater.getUpdates();
console.log(updates);
// Result: {
//   Description: "Updated description",
//   AssignedToId: 456,
//   IsActive: false
// }

// Apply updates
await this.context.spHttpClient.post(
  `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Projects')/items(42)`,
  SPHttpClient.configurations.v1,
  {
    headers: {
      'Accept': 'application/json;odata=verbose',
      'Content-Type': 'application/json;odata=verbose',
      'IF-MATCH': '*',
      'X-HTTP-Method': 'MERGE'
    },
    body: JSON.stringify(updates)
  }
);
```

## API Reference

### createSPExtractor(item)

Creates an extractor instance optimized for renderListData item structures.

#### renderListData Field Format Handling

| Field Type | renderListData Format | Extractor Method | Output Format |
|------------|----------------------|------------------|---------------|
| **User** | `{id: "123", email: "john@...", title: "John", value: "login"}` | `user(fieldName)` | `IPrincipal` |
| **User Multi** | `[{id: "123", email: "..."}, {id: "456", email: "..."}]` | `userMulti(fieldName)` | `IPrincipal[]` |
| **Lookup** | `{id: 5, title: "Category Name"}` | `lookup(fieldName)` | `SPLookup` |
| **Lookup Multi** | `[{id: 5, title: "Item1"}, {id: 6, title: "Item2"}]` | `lookupMulti(fieldName)` | `SPLookup[]` |
| **Taxonomy** | `{label: "Tag", termId: "abc-123", wssId: 10}` | `taxonomy(fieldName)` | `SPTaxonomy` |
| **Taxonomy Multi** | `[{label: "Tag1", termId: "abc"}, {label: "Tag2", termId: "def"}]` | `taxonomyMulti(fieldName)` | `SPTaxonomy[]` |

#### Basic Field Types

| Method | Description | Returns | renderListData Optimizations |
|--------|-------------|---------|------------------------------|
| `string(fieldName, defaultValue?)` | Extract text field | `string` | Handles choice objects, multiple property variations |
| `number(fieldName, defaultValue?)` | Extract number field | `number` | Removes currency symbols, handles formatted numbers |
| `boolean(fieldName, defaultValue?)` | Extract yes/no field | `boolean` | Handles various boolean representations |
| `date(fieldName, defaultValue?)` | Extract date/time field | `Date \| undefined` | Handles ISO strings, date objects |
| `choice(fieldName, defaultValue?)` | Extract choice field | `string` | Handles both string and object formats |
| `currency(fieldName, defaultValue?)` | Extract currency field | `number` | Removes currency symbols, handles objects |

#### Complex Field Types

| Method | Description | Returns | Notes |
|--------|-------------|---------|-------|
| `user(fieldName)` | Extract person/group field | `IPrincipal \| undefined` | Optimized for renderListData lowercase properties |
| `userMulti(fieldName)` | Extract multi-person field | `IPrincipal[]` | Handles direct arrays (no .results wrapper) |
| `lookup(fieldName)` | Extract lookup field | `SPLookup \| undefined` | Handles renderListData id/title format |
| `lookupMulti(fieldName)` | Extract multi-lookup field | `SPLookup[]` | Handles direct arrays |
| `taxonomy(fieldName)` | Extract managed metadata | `SPTaxonomy \| undefined` | Optimized for renderListData format |
| `taxonomyMulti(fieldName)` | Extract multi-metadata field | `SPTaxonomy[]` | Handles direct arrays of taxonomy objects |
| `multiChoice(fieldName)` | Extract multi-choice field | `string[]` | Handles arrays and semicolon-delimited strings |
| `url(fieldName)` | Extract hyperlink field | `SPUrl \| undefined` | Handles both string URLs and objects |
| `location(fieldName)` | Extract location field | `SPLocation \| undefined` | Handles nested and flat coordinate formats |
| `image(fieldName)` | Extract image field | `SPImage \| undefined` | Handles various image object formats |
| `json(fieldName)` | Extract JSON field | `any` | Auto-parsing with fallback |

#### Utility Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `hasField(fieldName)` | Check if field exists | `boolean` |
| `hasFields(...fieldNames)` | Check if all fields exist | `boolean` |
| `missingFields(...fieldNames)` | Get missing field names | `string[]` |
| `getFieldValue(fieldName, expectedType?)` | Auto-extract by type | `any` |
| `raw` | Access raw item data | `any` |

### createSPUpdater()

Creates an updater instance for building SharePoint field updates with automatic change detection using `@microsoft/sp-lodash-subset.isEqual`.

#### Core Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `set(fieldName, value, originalValue?)` | Set field value with change detection | `this` |
| `getUpdates(includeUnchanged?)` | Get updates for SharePoint REST API | `Record<string, any>` |
| `getValidateUpdates(includeUnchanged?)` | Get updates for validateUpdateListItem | `IListItemFormUpdateValue[]` |

#### Change Detection Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `hasChanges()` | Check if any fields changed | `boolean` |
| `getChangedFields()` | Get list of changed field names | `string[]` |
| `getUnchangedFields()` | Get list of unchanged field names | `string[]` |
| `getChangeSummary()` | Get detailed change analysis | `ChangesSummary` |
| `hasFieldChanged(fieldName)` | Check if specific field changed | `boolean` |

#### Performance Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `count(includeUnchanged?)` | Get count of updates | `number` |
| `clear()` | Clear all updates | `this` |
| `getFieldValue(fieldName)` | Get current field value | `any` |
| `getFieldOriginalValue(fieldName)` | Get original field value | `any` |

## Type Definitions

### IPrincipal (renderListData optimized)
```typescript
interface IPrincipal {
  id: string;           // renderListData: "123"
  email?: string;       // renderListData: "john@company.com"
  title?: string;       // renderListData: "John Doe"
  value?: string;       // renderListData: login name
  loginName?: string;   // renderListData: login name
  department?: string;
  jobTitle?: string;
  sip?: string;
  picture?: string;
}
```

### SPLookup (renderListData optimized)
```typescript
interface SPLookup {
  id?: number;          // renderListData: 5
  title?: string;       // renderListData: "Category Name"
}
```

### SPTaxonomy (renderListData optimized)
```typescript
interface SPTaxonomy {
  label?: string;       // renderListData: "Tag Name"
  termId?: string;      // renderListData: "abc-123-def"
  wssId?: number;       // renderListData: 10
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
import { extractField } from 'spfx-toolkit/lib/utilities/listItemHelper';

const title = extractField(item, 'Title', 'string', 'Default Title');
const dueDate = extractField(item, 'DueDate', 'date');
const assignedUser = extractField(item, 'AssignedTo', 'user');
```

### createUpdatesFromItem()
One-liner to create updates with change detection:

```typescript
import { createUpdatesFromItem } from 'spfx-toolkit/lib/utilities/listItemHelper';

const updates = createUpdatesFromItem(originalItem, newValues);
// Only includes changed fields
```

### compareItems()
Compare two items and get detailed differences:

```typescript
import { compareItems } from 'spfx-toolkit/lib/utilities/listItemHelper';

const comparison = compareItems(originalItem, newItem);
console.log('Changes:', comparison.changes);
console.log('Changed fields:', comparison.changedFields);
```

### shouldPerformUpdate()
Check if an update is worth performing:

```typescript
import { shouldPerformUpdate } from 'spfx-toolkit/lib/utilities/listItemHelper';

const shouldUpdate = shouldPerformUpdate(originalItem, newValues);
if (shouldUpdate.shouldUpdate) {
  // Proceed with update
  console.log('Reason:', shouldUpdate.reason);
  console.log('Changed fields:', shouldUpdate.changedFields);
}
```

### optimizeBatchUpdates()
Optimize batch operations by filtering out unchanged items:

```typescript
import { optimizeBatchUpdates } from 'spfx-toolkit/lib/utilities/listItemHelper';

const batchItems = [
  { originalItem: item1, newValues: newValues1 },
  { originalItem: item2, newValues: newValues2 },
  // ...
];

const optimized = optimizeBatchUpdates(batchItems);
console.log(`Optimized: ${optimized.summary.toUpdate} of ${optimized.summary.total} items need updates`);

// Process only items that actually changed
for (const item of optimized.itemsToUpdate) {
  await updateItem(item.updates);
}
```

## Real-world Examples

### Complete SPFx Component Example

```typescript
import * as React from 'react';
import {
  createSPExtractor,
  createSPUpdater,
  shouldPerformUpdate
} from 'spfx-toolkit/lib/utilities/listItemHelper';

export const ProjectEditForm: React.FC<{
  item: any;
  onSave: (updates: any) => Promise<void>;
}> = ({ item, onSave }) => {

  // Extract current values using renderListData optimized extractor
  const extractor = createSPExtractor(item);
  const [formData, setFormData] = React.useState({
    Title: extractor.string('Title', ''),
    Description: extractor.string('Description', ''),
    DueDate: extractor.date('DueDate'),
    AssignedTo: extractor.user('AssignedTo'),
    Priority: extractor.choice('Priority', 'Medium'),
    IsActive: extractor.boolean('IsActive', true)
  });

  const handleSave = async () => {
    // Check if there are actual changes
    const shouldUpdate = shouldPerformUpdate(item, formData);

    if (!shouldUpdate.shouldUpdate) {
      alert('No changes to save');
      return;
    }

    // Create optimized updates (only changed fields)
    const updater = createSPUpdater();
    Object.entries(formData).forEach(([field, value]) => {
      updater.set(field, value, item[field]);
    });

    const updates = updater.getUpdates();
    console.log(`Saving ${shouldUpdate.changedFields.length} changed fields:`, shouldUpdate.changedFields);

    await onSave(updates);
  };

  // Form JSX implementation...
  return (
    <div>
      {/* Form fields */}
      <button onClick={handleSave}>
        Save Changes ({Object.keys(formData).length} fields)
      </button>
    </div>
  );
};
```

### Batch Processing with renderListData

```typescript
import {
  optimizeBatchUpdates,
  createUpdatesFromItem
} from 'spfx-toolkit/lib/utilities/listItemHelper';

async function batchUpdateProjects(updates: Array<{id: number, newValues: any}>) {
  // Get original items using renderListData
  const camlQuery = `
    <View>
      <Query>
        <Where>
          <In>
            <FieldRef Name='ID' />
            <Values>
              ${updates.map(u => `<Value Type='Number'>${u.id}</Value>`).join('')}
            </Values>
          </In>
        </Where>
      </Query>
    </View>
  `;

  const originalItems = await getRenderListData('Projects', camlQuery);

  // Prepare batch with change detection
  const batchData = updates.map(update => ({
    id: update.id,
    originalItem: originalItems.find(item => item.ID === update.id),
    newValues: update.newValues
  }));

  // Optimize - only process items with actual changes
  const optimized = optimizeBatchUpdates(batchData);

  console.log(`Processing ${optimized.summary.toUpdate} of ${optimized.summary.total} items`);
  console.log(`Skipping ${optimized.summary.skipped} items with no changes`);

  // Process only items that changed
  const promises = optimized.itemsToUpdate.map(async (item) => {
    return updateSharePointItem('Projects', item.id, item.updates);
  });

  await Promise.all(promises);

  return {
    processed: optimized.summary.toUpdate,
    skipped: optimized.summary.skipped,
    totalChanges: optimized.summary.totalChangedFields
  };
}
```

## Performance Benefits

### Change Detection Optimization
- **Reduces API calls**: Only updates fields that actually changed
- **Improves performance**: Skips unnecessary SharePoint operations
- **Better user experience**: Faster save operations
- **Audit trail**: Know exactly what changed

### renderListData Advantages
- **Faster queries**: renderListData is optimized for performance
- **Native format**: No additional transformations needed
- **CAML power**: Full CAML query capabilities
- **Reduced payload**: Only requested fields are returned

## Troubleshooting

### Common renderListData Issues

**Q: Getting undefined for fields that exist in SharePoint?**
A: Ensure the field is included in your CAML ViewFields:
```xml
<ViewFields>
  <FieldRef Name='YourFieldName' />
</ViewFields>
```

**Q: User fields returning empty objects?**
A: renderListData returns user objects directly. Check that your field internal name is correct and the user field has a value.

**Q: Taxonomy fields not extracting properly?**
A: renderListData returns taxonomy as objects with lowercase properties (`label`, `termId`). The extractor handles this automatically.

**Q: Multi-value fields returning empty arrays?**
A: renderListData returns arrays directly (no `.results` wrapper). Ensure your CAML query includes the field and it has values.

### Debug Mode

```typescript
// Inspect raw renderListData structure
const extractor = createSPExtractor(item);
console.log('Raw renderListData item:', extractor.raw);

// Check for missing fields in your CAML query
const missing = extractor.missingFields('Field1', 'Field2', 'Field3');
console.log('Missing fields (add to CAML ViewFields):', missing);

// Debug field changes
import { debugFieldChanges } from 'spfx-toolkit/lib/utilities/listItemHelper';
const debug = debugFieldChanges(originalItem, newValues);
console.log(debug.summary);
console.table(debug.details);
```

## Migration from PnP.js

If migrating from PnP.js to renderListData, the List Item Helper handles both formats seamlessly:

```typescript
// Works with both PnP.js format:
// { TeamMembers: { results: [...] } }

// And renderListData format:
// { TeamMembers: [...] }

const teamMembers = extractor.userMulti('TeamMembers'); // Same API, different input formats
```

The extractor automatically detects and handles both formats, making migration painless.
