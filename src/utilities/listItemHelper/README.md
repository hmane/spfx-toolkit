# ListItemHelper Utility 🔧

Production-ready utilities for extracting, transforming, and updating SharePoint list item fields. Provides type-safe field access, intelligent change detection, and comprehensive validation for SPFx applications.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [SPExtractor API](#spextractor-api)
  - [SPUpdater API](#spupdater-api)
  - [Convenience Functions](#convenience-functions)
  - [Validation Utilities](#validation-utilities)
  - [Migration Utilities](#migration-utilities)
  - [Performance Utilities](#performance-utilities)
  - [Debugging Utilities](#debugging-utilities)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- 🎯 **Type-Safe Extraction** - Extract SharePoint fields with proper TypeScript types
- 🔄 **Smart Change Detection** - Automatically detect what fields changed for optimized updates
- 📝 **Field Transformations** - Transform SharePoint complex field values to clean objects
- ✅ **Validation** - Validate required fields, field values, and update operations
- 🔀 **Migration Tools** - Migrate fields between different structures with transformations
- ⚡ **Performance Optimized** - Skip unnecessary updates with intelligent change detection
- 🧪 **Batch Operations** - Process multiple items efficiently with detailed tracking
- 📊 **Field Comparison** - Compare items and track differences with detailed reporting
- 🐛 **Debug Utilities** - Inspect field changes and troubleshoot update issues
- 📦 **Zero Dependencies** - Only uses SPFx peer dependencies

---

## Installation

```bash
npm install spfx-toolkit
```

---

## Quick Start

### Basic Field Extraction

```typescript
import { createSPExtractor } from 'spfx-toolkit/lib/utilities/listItemHelper';

// Get SharePoint item
const item = await sp.web.lists.getByTitle('Tasks').items.getById(1)();

// Create extractor
const extractor = createSPExtractor(item);

// Extract simple fields
const title = extractor.string('Title');
const dueDate = extractor.date('DueDate');
const isCompleted = extractor.boolean('IsCompleted');

// Extract complex fields
const assignedTo = extractor.user('AssignedTo');
const category = extractor.taxonomy('Category');
const relatedItems = extractor.lookupMulti('RelatedItems');
```

### Basic Field Updates with Change Detection

```typescript
import { createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

// Create updater
const updater = createSPUpdater();

// Set fields with change detection
updater.set('Title', 'New Title', originalItem.Title);
updater.set('Status', 'Completed', originalItem.Status);
updater.set('DueDate', new Date(), originalItem.DueDate);

// Only update if there are actual changes
if (updater.hasChanges()) {
  const updates = updater.getUpdates();
  await sp.web.lists.getByTitle('Tasks').items.getById(1).update(updates);

  console.log('Changed fields:', updater.getChangedFields());
}
```

### Quick Convenience Functions

```typescript
import { extractField, quickUpdate } from 'spfx-toolkit/lib/utilities/listItemHelper';

// Quick single field extraction
const status = extractField(item, 'Status', 'choice', 'Not Started');
const assignedTo = extractField(item, 'AssignedTo', 'user');

// Quick single field update
const updates = quickUpdate('Title', 'New Title', originalItem.Title);
await sp.web.lists.getByTitle('Tasks').items.getById(1).update(updates);
```

---

## API Reference

### SPExtractor API

The `createSPExtractor(item)` function returns an object with methods to safely extract SharePoint field values with proper type handling.

#### Basic Field Types

##### `string(fieldName: string, defaultValue?: string): string`

Extract text/string field values.

```typescript
const title = extractor.string('Title');
const description = extractor.string('Description', 'No description');
const status = extractor.string('Status', 'Not Started');
```

**Handles:** Text, Note, Choice fields

---

##### `number(fieldName: string, defaultValue?: number): number`

Extract numeric field values.

```typescript
const count = extractor.number('Count');
const percentage = extractor.number('Progress', 0);
const itemId = extractor.number('ID');
```

**Handles:** Number fields, returns `defaultValue` (0 by default) for invalid/empty values

---

##### `boolean(fieldName: string, defaultValue?: boolean): boolean`

Extract boolean/yes-no field values.

```typescript
const isActive = extractor.boolean('IsActive');
const isCompleted = extractor.boolean('Completed', false);
```

**Handles:**
- Boolean fields
- String values: 'yes', 'true', '1' → true
- String values: 'no', 'false', '0' → false
- Default: false

---

##### `date(fieldName: string, defaultValue?: Date): Date | undefined`

Extract date/time field values.

```typescript
const created = extractor.date('Created');
const dueDate = extractor.date('DueDate');
const modified = extractor.date('Modified', new Date());
```

**Handles:** DateTime fields, converts ISO strings to Date objects, returns undefined for invalid dates

---

#### User/People Fields

##### `user(fieldName: string): IPrincipal | undefined`

Extract single user/person field.

```typescript
const author = extractor.user('Author');
const assignedTo = extractor.user('AssignedTo');

// Returns IPrincipal object:
// {
//   id: string,
//   email?: string,
//   title?: string,
//   value?: string,      // login name
//   loginName?: string,
//   department?: string,
//   jobTitle?: string,
//   sip?: string,
//   picture?: string
// }
```

**Usage:**
```typescript
if (author) {
  console.log(`Created by: ${author.title} (${author.email})`);
}
```

---

##### `userMulti(fieldName: string): IPrincipal[]`

Extract multi-user/person field.

```typescript
const approvers = extractor.userMulti('Approvers');
const teamMembers = extractor.userMulti('TeamMembers');

// Returns array of IPrincipal objects
approvers.forEach(user => {
  console.log(`${user.title} - ${user.email}`);
});
```

**Handles:** People picker fields (multi-select), results arrays from PnP.js

---

#### Lookup Fields

##### `lookup(fieldName: string): SPLookup | undefined`

Extract single lookup field.

```typescript
const project = extractor.lookup('Project');
const category = extractor.lookup('Category');

// Returns SPLookup object:
// {
//   id?: number,
//   title?: string
// }
```

**Usage:**
```typescript
if (project) {
  console.log(`Project: ${project.title} (ID: ${project.id})`);
}
```

---

##### `lookupMulti(fieldName: string): SPLookup[]`

Extract multi-lookup field.

```typescript
const relatedItems = extractor.lookupMulti('RelatedItems');
const tags = extractor.lookupMulti('Tags');

relatedItems.forEach(item => {
  console.log(`Related: ${item.title}`);
});
```

---

#### Taxonomy/Managed Metadata Fields

##### `taxonomy(fieldName: string): SPTaxonomy | undefined`

Extract single taxonomy/managed metadata field.

```typescript
const category = extractor.taxonomy('Category');
const department = extractor.taxonomy('Department');

// Returns SPTaxonomy object:
// {
//   label?: string,
//   termId?: string,
//   wssId?: number
// }
```

**Usage:**
```typescript
if (category) {
  console.log(`Category: ${category.label} (${category.termId})`);
}
```

---

##### `taxonomyMulti(fieldName: string): SPTaxonomy[]`

Extract multi-taxonomy field.

```typescript
const keywords = extractor.taxonomyMulti('Keywords');
const categories = extractor.taxonomyMulti('Categories');

keywords.forEach(term => {
  console.log(`Keyword: ${term.label}`);
});
```

---

#### Choice Fields

##### `choice(fieldName: string, defaultValue?: string): string`

Extract single choice field value.

```typescript
const status = extractor.choice('Status', 'Not Started');
const priority = extractor.choice('Priority', 'Normal');
```

**Same as `string()` but semantically clearer for choice fields**

---

##### `multiChoice(fieldName: string): string[]`

Extract multi-choice field values.

```typescript
const colors = extractor.multiChoice('Colors');
const features = extractor.multiChoice('Features');

// Returns array of selected choices
colors.forEach(color => {
  console.log(`Selected: ${color}`);
});
```

**Handles:**
- Array format
- Results arrays from PnP.js
- Semicolon-delimited strings (`;#` format)

---

#### Modern SharePoint Fields

##### `url(fieldName: string): SPUrl | undefined`

Extract hyperlink/URL field.

```typescript
const website = extractor.url('Website');
const documentation = extractor.url('Documentation');

// Returns SPUrl object:
// {
//   url?: string,
//   description?: string
// }

if (website) {
  console.log(`Visit: ${website.description || website.url}`);
}
```

---

##### `location(fieldName: string): SPLocation | undefined`

Extract location field.

```typescript
const officeLocation = extractor.location('OfficeLocation');

// Returns SPLocation object:
// {
//   displayName?: string,
//   locationUri?: string,
//   coordinates?: {
//     latitude?: number,
//     longitude?: number
//   }
// }

if (officeLocation?.coordinates) {
  console.log(`Lat: ${officeLocation.coordinates.latitude}, Long: ${officeLocation.coordinates.longitude}`);
}
```

---

##### `image(fieldName: string): SPImage | undefined`

Extract image/thumbnail field.

```typescript
const thumbnail = extractor.image('Thumbnail');
const logo = extractor.image('Logo');

// Returns SPImage object:
// {
//   serverUrl?: string,
//   serverRelativeUrl?: string,
//   id?: string,
//   fileName?: string
// }

if (thumbnail) {
  return <img src={thumbnail.serverUrl} alt={thumbnail.fileName} />;
}
```

---

##### `currency(fieldName: string, defaultValue?: number): number`

Extract currency field value.

```typescript
const price = extractor.currency('Price');
const budget = extractor.currency('Budget', 0);
```

**Returns numeric value** (same as `number()` but semantically clearer)

---

##### `geolocation(fieldName: string): { latitude?: number, longitude?: number } | undefined`

Extract geolocation field.

```typescript
const coords = extractor.geolocation('Coordinates');

if (coords) {
  console.log(`Location: ${coords.latitude}, ${coords.longitude}`);
}
```

---

##### `json(fieldName: string): any`

Extract JSON field (modern SharePoint).

```typescript
const metadata = extractor.json('Metadata');
const settings = extractor.json('Settings');

// Automatically parses JSON strings
// Returns parsed object or original value
```

---

#### Field Existence Checking

##### `hasField(fieldName: string): boolean`

Check if a field exists in the item.

```typescript
if (extractor.hasField('CustomField')) {
  const value = extractor.string('CustomField');
}
```

---

##### `hasFields(...fieldNames: string[]): boolean`

Check if multiple fields exist.

```typescript
if (extractor.hasFields('Title', 'Status', 'AssignedTo')) {
  // All fields exist
}
```

---

##### `missingFields(...fieldNames: string[]): string[]`

Get list of fields that don't exist in the item.

```typescript
const required = ['Title', 'DueDate', 'AssignedTo'];
const missing = extractor.missingFields(...required);

if (missing.length > 0) {
  console.error(`Missing required fields: ${missing.join(', ')}`);
}
```

---

##### `raw`

Access the raw SharePoint item object.

```typescript
const rawItem = extractor.raw;
console.log(rawItem.ID, rawItem.Title);
```

---

### SPUpdater API

The `createSPUpdater()` function creates an updater object with intelligent change detection and SharePoint-compatible formatting.

#### Core Methods

##### `set(fieldName: string, value: any, originalValue?: any): this`

Set a field value with optional change detection.

```typescript
const updater = createSPUpdater();

// Without change detection (always marked as changed)
updater.set('Title', 'New Title');

// With change detection (only marked as changed if different)
updater.set('Title', 'New Title', originalItem.Title);
updater.set('Status', 'Completed', originalItem.Status);

// Returns 'this' for method chaining
updater
  .set('Title', 'New Title', originalItem.Title)
  .set('Status', 'Completed', originalItem.Status)
  .set('Priority', 'High', originalItem.Priority);
```

**Supported Value Types:**
- Primitives: string, number, boolean, Date
- User/People: `IPrincipal` or `IPrincipal[]`
- Lookup: `{ id: number }` or array
- Taxonomy: `{ label: string, termId: string }` or array
- URL: `{ url: string, description?: string }`
- Location, Image, etc.

---

##### `getUpdates(includeUnchanged?: boolean): Record<string, any>`

Get updates formatted for PnP.js update methods.

```typescript
updater.set('Title', 'New Title', originalItem.Title);
updater.set('Status', 'Completed', originalItem.Status);

// Get only changed fields (default)
const updates = updater.getUpdates();

// Include all fields even if unchanged
const allUpdates = updater.getUpdates(true);

// Use with PnP.js
await sp.web.lists.getByTitle('Tasks').items.getById(1).update(updates);
```

**Auto-formatting:**
- User fields → `{ AssignedToId: 5 }`
- Lookup fields → `{ ProjectId: 10 }`
- Taxonomy → Proper Label/TermGuid format
- Arrays → Correct multi-value formats

---

##### `getValidateUpdates(includeUnchanged?: boolean): IListItemFormUpdateValue[]`

Get updates formatted for `validateUpdateListItem` method.

```typescript
const validateUpdates = updater.getValidateUpdates();

// Use with PnP.js validate method
await sp.web.lists.getByTitle('Tasks').items.getById(1).validateUpdateListItem(validateUpdates);
```

**Returns:**
```typescript
[
  { FieldName: 'Title', FieldValue: 'New Title' },
  { FieldName: 'Status', FieldValue: 'Completed' }
]
```

---

#### Change Detection Methods

##### `hasChanges(): boolean`

Check if any fields have actually changed.

```typescript
updater.set('Title', 'Same Title', 'Same Title');
updater.set('Status', 'New Status', 'Old Status');

if (updater.hasChanges()) {
  // Only Status changed, Title is unchanged
  await performUpdate();
}
```

---

##### `getChangedFields(): string[]`

Get array of field names that changed.

```typescript
const changedFields = updater.getChangedFields();
console.log(`Changed: ${changedFields.join(', ')}`);
// Output: "Changed: Status, Priority"
```

---

##### `getUnchangedFields(): string[]`

Get array of field names that were set but didn't change.

```typescript
const unchangedFields = updater.getUnchangedFields();
console.log(`Unchanged: ${unchangedFields.join(', ')}`);
```

---

##### `getChangeSummary(): object`

Get detailed change summary.

```typescript
const summary = updater.getChangeSummary();
// Returns:
// {
//   totalFields: 5,
//   changedFields: ['Status', 'Priority'],
//   unchangedFields: ['Title', 'Description', 'DueDate'],
//   hasChanges: true
// }

console.log(`${summary.changedFields.length} of ${summary.totalFields} fields changed`);
```

---

##### `hasFieldChanged(fieldName: string): boolean`

Check if a specific field changed.

```typescript
if (updater.hasFieldChanged('Status')) {
  // Status field was changed
  console.log('Status was updated');
}
```

---

#### Field Inspection Methods

##### `count(includeUnchanged?: boolean): number`

Get count of pending updates.

```typescript
const changedCount = updater.count(); // Changed fields only
const totalCount = updater.count(true); // All fields
```

---

##### `hasField(fieldName: string): boolean`

Check if a field has been set in the updater.

```typescript
if (updater.hasField('Title')) {
  console.log('Title field was set');
}
```

---

##### `getFieldValue(fieldName: string): any`

Get the current (new) value for a field.

```typescript
const newTitle = updater.getFieldValue('Title');
```

---

##### `getFieldOriginalValue(fieldName: string): any`

Get the original value for a field.

```typescript
const oldTitle = updater.getFieldOriginalValue('Title');
```

---

##### `clear(): this`

Clear all pending updates.

```typescript
updater.set('Title', 'New Title');
updater.clear(); // Remove all updates
```

---

### Convenience Functions

High-level functions for common operations.

##### `extractField<T>(item: any, fieldName: string, fieldType: string, defaultValue?: T): T`

Extract a single field without creating an extractor instance.

```typescript
import { extractField } from 'spfx-toolkit/lib/utilities/listItemHelper';

const title = extractField(item, 'Title', 'string');
const dueDate = extractField(item, 'DueDate', 'date');
const assignedTo = extractField(item, 'AssignedTo', 'user');
const tags = extractField(item, 'Tags', 'lookup');
```

**Supported types:** `'string'`, `'number'`, `'boolean'`, `'date'`, `'user'`, `'lookup'`, `'taxonomy'`, `'choice'`, `'url'`, `'json'`

---

##### `quickUpdate(fieldName: string, value: any, originalValue?: any): Record<string, any>`

Create a single field update object.

```typescript
import { quickUpdate } from 'spfx-toolkit/lib/utilities/listItemHelper';

const updates = quickUpdate('Status', 'Completed', originalItem.Status);
await sp.web.lists.getByTitle('Tasks').items.getById(1).update(updates);
```

---

##### `quickValidateUpdate(fieldName: string, value: any, originalValue?: any): IListItemFormUpdateValue[]`

Create a single field validate update.

```typescript
import { quickValidateUpdate } from 'spfx-toolkit/lib/utilities/listItemHelper';

const validateUpdate = quickValidateUpdate('Title', 'New Title', originalItem.Title);
await sp.web.lists.getByTitle('Tasks').items.getById(1).validateUpdateListItem(validateUpdate);
```

---

##### `extractFields(item: any, fieldMappings: Record<string, { type: string, defaultValue?: any }>): Record<string, any>`

Batch extract multiple fields at once.

```typescript
import { extractFields } from 'spfx-toolkit/lib/utilities/listItemHelper';

const data = extractFields(item, {
  title: { type: 'string', defaultValue: 'Untitled' },
  dueDate: { type: 'date' },
  assignedTo: { type: 'user' },
  priority: { type: 'choice', defaultValue: 'Normal' }
});

console.log(data.title, data.dueDate, data.assignedTo, data.priority);
```

---

##### `transformItem(item: any, fieldMappings: Record<string, string | object>): Record<string, any>`

Transform SharePoint item to clean object with field remapping.

```typescript
import { transformItem } from 'spfx-toolkit/lib/utilities/listItemHelper';

// Simple field rename mapping
const simple = transformItem(item, {
  id: 'ID',
  name: 'Title',
  created: 'Created'
});

// Advanced mapping with types and defaults
const advanced = transformItem(item, {
  taskId: { sourceField: 'ID', type: 'number' },
  taskName: { sourceField: 'Title', type: 'string', defaultValue: 'Untitled' },
  owner: { sourceField: 'AssignedTo', type: 'user' },
  tags: { sourceField: 'Keywords', type: 'taxonomy' }
});
```

---

##### `createUpdatesFromItem(originalItem: any, newValues: Record<string, any>): Record<string, any>`

Create updates with automatic change detection.

```typescript
import { createUpdatesFromItem } from 'spfx-toolkit/lib/utilities/listItemHelper';

const newValues = {
  Title: 'Updated Title',
  Status: 'Completed',
  DueDate: new Date()
};

const updates = createUpdatesFromItem(originalItem, newValues);
// Only includes fields that actually changed

if (Object.keys(updates).length > 0) {
  await sp.web.lists.getByTitle('Tasks').items.getById(1).update(updates);
}
```

---

##### `createValidateUpdatesFromItem(originalItem: any, newValues: Record<string, any>): IListItemFormUpdateValue[]`

Create validate updates with change detection.

```typescript
import { createValidateUpdatesFromItem } from 'spfx-toolkit/lib/utilities/listItemHelper';

const validateUpdates = createValidateUpdatesFromItem(originalItem, newValues);
await sp.web.lists.getByTitle('Tasks').items.getById(1).validateUpdateListItem(validateUpdates);
```

---

##### `compareItems(originalItem: any, newItem: any, fieldNames?: string[]): object`

Compare two items and get detailed differences.

```typescript
import { compareItems } from 'spfx-toolkit/lib/utilities/listItemHelper';

const comparison = compareItems(originalItem, updatedItem);

// Returns:
// {
//   hasChanges: true,
//   changedFields: ['Status', 'Priority'],
//   unchangedFields: ['Title', 'Description'],
//   changes: {
//     Status: { from: 'Not Started', to: 'In Progress' },
//     Priority: { from: 'Normal', to: 'High' }
//   }
// }

if (comparison.hasChanges) {
  console.log(`Changed fields: ${comparison.changedFields.join(', ')}`);

  Object.entries(comparison.changes).forEach(([field, change]) => {
    console.log(`${field}: ${change.from} → ${change.to}`);
  });
}

// Compare specific fields only
const limitedComparison = compareItems(originalItem, updatedItem, ['Title', 'Status']);
```

---

##### `batchUpdateItems(updates: Array<{ originalItem: any, newValues: Record<string, any>, itemId?: number }>): Array<object>`

Process batch updates with change detection for multiple items.

```typescript
import { batchUpdateItems } from 'spfx-toolkit/lib/utilities/listItemHelper';

const batchData = [
  { itemId: 1, originalItem: item1, newValues: { Status: 'Completed' } },
  { itemId: 2, originalItem: item2, newValues: { Priority: 'High' } },
  { itemId: 3, originalItem: item3, newValues: { Status: 'In Progress' } }
];

const results = batchUpdateItems(batchData);

// Returns array of:
// {
//   itemId: 1,
//   updates: { Status: 'Completed' },
//   hasChanges: true,
//   changedFields: ['Status']
// }

// Process only items with changes
const itemsToUpdate = results.filter(r => r.hasChanges);

for (const result of itemsToUpdate) {
  await sp.web.lists.getByTitle('Tasks').items.getById(result.itemId).update(result.updates);
}

console.log(`Updated ${itemsToUpdate.length} of ${results.length} items`);
```

---

### Validation Utilities

##### `validateRequiredFields(item: any, requiredFields: string[]): object`

Validate that an item has required fields.

```typescript
import { validateRequiredFields } from 'spfx-toolkit/lib/utilities/listItemHelper';

const validation = validateRequiredFields(item, ['Title', 'DueDate', 'AssignedTo']);

// Returns:
// {
//   isValid: false,
//   missingFields: ['DueDate', 'AssignedTo']
// }

if (!validation.isValid) {
  console.error(`Missing fields: ${validation.missingFields.join(', ')}`);
}
```

---

##### `validateFieldValues(item: any, fieldNames: string[]): object`

Check if field values are empty/null.

```typescript
import { validateFieldValues } from 'spfx-toolkit/lib/utilities/listItemHelper';

const validation = validateFieldValues(item, ['Title', 'Description', 'Status']);

// Returns:
// {
//   isValid: false,
//   emptyFields: ['Description']
// }

if (!validation.isValid) {
  console.warn(`Empty fields: ${validation.emptyFields.join(', ')}`);
}
```

---

##### `validateUpdates(updates: Record<string, any>, rules?: object): object`

Validate update operations with custom rules.

```typescript
import { validateUpdates } from 'spfx-toolkit/lib/utilities/listItemHelper';

const updates = {
  Title: 'New Title',
  Priority: 'High',
  DueDate: null
};

const validation = validateUpdates(updates, {
  required: ['Title', 'DueDate'],
  notEmpty: ['Title'],
  customValidators: {
    Title: (value) => {
      if (value.length < 3) return 'Title must be at least 3 characters';
      return true;
    },
    Priority: (value) => {
      const validPriorities = ['Low', 'Normal', 'High'];
      return validPriorities.includes(value) || 'Invalid priority value';
    }
  }
});

// Returns:
// {
//   isValid: false,
//   errors: [
//     'Required field "DueDate" is missing or null'
//   ],
//   warnings: []
// }

if (!validation.isValid) {
  validation.errors.forEach(error => console.error(error));
}
```

---

##### `detectFieldType(value: any): string`

Detect the probable SharePoint field type from a value.

```typescript
import { detectFieldType } from 'spfx-toolkit/lib/utilities/listItemHelper';

const type1 = detectFieldType('Hello'); // 'text'
const type2 = detectFieldType(123); // 'number'
const type3 = detectFieldType(new Date()); // 'datetime'
const type4 = detectFieldType({ email: 'user@domain.com', id: '5' }); // 'user'
const type5 = detectFieldType({ label: 'Term', termId: 'abc-123' }); // 'taxonomy'
const type6 = detectFieldType([{ id: 1, title: 'Item' }]); // 'lookup_multi'
```

---

### Migration Utilities

##### `migrateFields(items: any[], fieldMigrationMap: Record<string, string | object>): any[]`

Convert items from one field structure to another.

```typescript
import { migrateFields } from 'spfx-toolkit/lib/utilities/listItemHelper';

const oldItems = [
  { OldTitle: 'Task 1', OldStatus: 'Active', OldPriority: '1' },
  { OldTitle: 'Task 2', OldStatus: 'Done', OldPriority: '2' }
];

// Simple field rename
const renamed = migrateFields(oldItems, {
  OldTitle: 'Title',
  OldStatus: 'Status'
});

// Advanced migration with transformation
const transformed = migrateFields(oldItems, {
  OldTitle: 'Title',
  OldStatus: {
    newField: 'Status',
    transform: (value) => value === 'Active' ? 'In Progress' : 'Completed'
  },
  OldPriority: {
    newField: 'Priority',
    transform: (value) => {
      const map = { '1': 'High', '2': 'Normal', '3': 'Low' };
      return map[value] || 'Normal';
    }
  }
});

// Result:
// [
//   { Title: 'Task 1', Status: 'In Progress', Priority: 'High' },
//   { Title: 'Task 2', Status: 'Completed', Priority: 'Normal' }
// ]
```

---

##### `migrateItemsWithUpdates(items: any[], fieldMigrationMap: Record<string, string | object>, generateUpdates?: boolean): Array<object>`

Migrate items with automatic change detection and update generation.

```typescript
import { migrateItemsWithUpdates } from 'spfx-toolkit/lib/utilities/listItemHelper';

const results = migrateItemsWithUpdates(oldItems, {
  OldTitle: 'Title',
  OldStatus: {
    newField: 'Status',
    transform: (value) => value === 'Active' ? 'In Progress' : 'Completed'
  }
}, true);

// Returns array of:
// {
//   originalItem: { OldTitle: 'Task 1', OldStatus: 'Active' },
//   migratedItem: { Title: 'Task 1', Status: 'In Progress' },
//   updates: { Title: 'Task 1', Status: 'In Progress' },
//   hasChanges: true,
//   changedFields: ['Title', 'Status']
// }

// Apply migrations
for (const result of results) {
  if (result.hasChanges) {
    await sp.web.lists.getByTitle('NewList').items.add(result.migratedItem);
  }
}
```

---

### Performance Utilities

##### `shouldPerformUpdate(originalItem: any, newValues: Record<string, any>, options?: object): object`

Determine if an update operation is worth performing.

```typescript
import { shouldPerformUpdate } from 'spfx-toolkit/lib/utilities/listItemHelper';

const decision = shouldPerformUpdate(
  originalItem,
  { Title: 'Same Title', Status: 'New Status' },
  {
    ignoreFields: ['Modified', 'ModifiedBy'],
    requiredFields: ['Status', 'Priority']
  }
);

// Returns:
// {
//   shouldUpdate: true,
//   reason: '1 field(s) changed: Status',
//   changedFields: ['Status']
// }

if (decision.shouldUpdate) {
  console.log(decision.reason);
  await performUpdate();
} else {
  console.log(`Skipping update: ${decision.reason}`);
}
```

---

##### `optimizeBatchUpdates<T>(items: T[], options?: object): object`

Optimize batch operations by filtering out items with no changes.

```typescript
import { optimizeBatchUpdates } from 'spfx-toolkit/lib/utilities/listItemHelper';

const batchItems = [
  { originalItem: item1, newValues: { Status: 'Completed' } },
  { originalItem: item2, newValues: { Status: item2.Status } }, // No change
  { originalItem: item3, newValues: { Priority: 'High' } }
];

const optimized = optimizeBatchUpdates(batchItems, {
  ignoreFields: ['Modified'],
  requiredFields: ['Status']
});

// Returns:
// {
//   itemsToUpdate: [
//     { originalItem: item1, newValues: {...}, updates: {...}, changedFields: ['Status'] },
//     { originalItem: item3, newValues: {...}, updates: {...}, changedFields: ['Priority'] }
//   ],
//   itemsSkipped: [
//     { originalItem: item2, newValues: {...}, reason: 'No field changes detected' }
//   ],
//   summary: {
//     total: 3,
//     toUpdate: 2,
//     skipped: 1,
//     totalChangedFields: 2
//   }
// }

console.log(`Updating ${optimized.summary.toUpdate} of ${optimized.summary.total} items`);
console.log(`Skipped ${optimized.summary.skipped} unchanged items`);

for (const item of optimized.itemsToUpdate) {
  await sp.web.lists.getByTitle('Tasks').items.getById(item.originalItem.ID).update(item.updates);
}
```

---

### Debugging Utilities

##### `debugFieldChanges(originalItem: any, newValues: Record<string, any>, options?: object): object`

Inspect and debug field changes with detailed comparison.

```typescript
import { debugFieldChanges } from 'spfx-toolkit/lib/utilities/listItemHelper';

const debug = debugFieldChanges(
  originalItem,
  { Title: 'New Title', Status: 'Completed', Priority: originalItem.Priority },
  {
    includeUnchanged: true,
    fieldNames: ['Title', 'Status', 'Priority']
  }
);

console.log(debug.summary);
// Output:
// Field Changes Debug:
//   Total fields: 3
//   Changed: 2 (Title, Status)
//   Unchanged: 1 (Priority)

debug.details.forEach(detail => {
  console.log(`Field: ${detail.fieldName}`);
  console.log(`  Changed: ${detail.hasChanged}`);
  console.log(`  Original: ${detail.originalValue}`);
  console.log(`  New: ${detail.newValue}`);
  console.log(`  Normalized Original: ${detail.normalizedOriginal}`);
  console.log(`  Normalized New: ${detail.normalizedNew}`);
});
```

---

### Constants

##### `FIELD_TYPE_CONSTANTS`

SharePoint field type constants and patterns.

```typescript
import { FIELD_TYPE_CONSTANTS } from 'spfx-toolkit/lib/utilities/listItemHelper';

// Field type strings
FIELD_TYPE_CONSTANTS.FIELD_TYPES.TEXT // 'Text'
FIELD_TYPE_CONSTANTS.FIELD_TYPES.NOTE // 'Note'
FIELD_TYPE_CONSTANTS.FIELD_TYPES.NUMBER // 'Number'
FIELD_TYPE_CONSTANTS.FIELD_TYPES.DATETIME // 'DateTime'
FIELD_TYPE_CONSTANTS.FIELD_TYPES.USER // 'User'
FIELD_TYPE_CONSTANTS.FIELD_TYPES.LOOKUP // 'Lookup'
FIELD_TYPE_CONSTANTS.FIELD_TYPES.TAXONOMY // 'TaxonomyFieldType'

// Field name patterns (RegExp)
FIELD_TYPE_CONSTANTS.PATTERNS.ID_FIELDS // /Id$/
FIELD_TYPE_CONSTANTS.PATTERNS.DATE_FIELDS // /(Date|Time|Created|Modified)$/i
FIELD_TYPE_CONSTANTS.PATTERNS.USER_FIELDS // /(Author|Editor|AssignedTo|CreatedBy|ModifiedBy)$/i
```

---

##### `COMMON_FIELD_MAPPINGS`

Predefined field mappings for standard SharePoint lists.

```typescript
import { COMMON_FIELD_MAPPINGS, transformItem } from 'spfx-toolkit/lib/utilities/listItemHelper';

// Basic item mapping
const basicItem = transformItem(item, COMMON_FIELD_MAPPINGS.BASIC_ITEM);
// Extracts: id, title, created, modified, author, editor

// Document library mapping
const document = transformItem(item, COMMON_FIELD_MAPPINGS.DOCUMENT_LIBRARY);
// Extracts: id, name, title, size, created, modified
```

---

## Complete Examples

### Example 1: Form Submission with Validation and Change Detection

```typescript
import {
  createSPExtractor,
  createSPUpdater,
  validateRequiredFields,
  validateFieldValues
} from 'spfx-toolkit/lib/utilities/listItemHelper';

async function handleFormSubmit(formData: any, itemId?: number) {
  try {
    // Validate required fields
    const requiredValidation = validateRequiredFields(formData, ['Title', 'DueDate', 'AssignedTo']);
    if (!requiredValidation.isValid) {
      throw new Error(`Missing fields: ${requiredValidation.missingFields.join(', ')}`);
    }

    // Validate field values
    const valueValidation = validateFieldValues(formData, ['Title', 'Description']);
    if (!valueValidation.isValid) {
      console.warn(`Empty fields: ${valueValidation.emptyFields.join(', ')}`);
    }

    if (itemId) {
      // Update existing item
      const originalItem = await sp.web.lists.getByTitle('Tasks').items.getById(itemId)();

      const updater = createSPUpdater();
      updater
        .set('Title', formData.Title, originalItem.Title)
        .set('Description', formData.Description, originalItem.Description)
        .set('DueDate', formData.DueDate, originalItem.DueDate)
        .set('AssignedTo', formData.AssignedTo, originalItem.AssignedTo)
        .set('Priority', formData.Priority, originalItem.Priority);

      if (updater.hasChanges()) {
        const updates = updater.getUpdates();
        await sp.web.lists.getByTitle('Tasks').items.getById(itemId).update(updates);

        console.log(`Updated ${updater.getChangedFields().length} fields:`, updater.getChangedFields());
        return { success: true, changedFields: updater.getChangedFields() };
      } else {
        console.log('No changes detected, skipping update');
        return { success: true, changedFields: [] };
      }
    } else {
      // Create new item
      const newItem = await sp.web.lists.getByTitle('Tasks').items.add({
        Title: formData.Title,
        Description: formData.Description,
        DueDate: formData.DueDate,
        AssignedToId: parseInt(formData.AssignedTo.id),
        Priority: formData.Priority
      });

      console.log('Created new item:', newItem.data.ID);
      return { success: true, itemId: newItem.data.ID };
    }
  } catch (error) {
    console.error('Form submission error:', error);
    throw error;
  }
}
```

---

### Example 2: Batch Processing with Performance Optimization

```typescript
import {
  batchUpdateItems,
  optimizeBatchUpdates,
  shouldPerformUpdate
} from 'spfx-toolkit/lib/utilities/listItemHelper';

async function processBulkStatusUpdate(items: any[], newStatus: string) {
  // Prepare batch data
  const batchData = items.map(item => ({
    itemId: item.ID,
    originalItem: item,
    newValues: {
      Status: newStatus,
      Modified: new Date() // This will be ignored in optimization
    }
  }));

  // Optimize - remove items that don't need updates
  const optimized = optimizeBatchUpdates(batchData, {
    ignoreFields: ['Modified', 'ModifiedBy'], // Auto-updated fields
    requiredFields: ['Status'] // Only update if Status changes
  });

  console.log(`Processing ${optimized.summary.toUpdate} of ${optimized.summary.total} items`);
  console.log(`Skipped ${optimized.summary.skipped} items (no changes)`);

  // Process updates in batches of 10
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < optimized.itemsToUpdate.length; i += batchSize) {
    const batch = optimized.itemsToUpdate.slice(i, i + batchSize);

    const batchPromises = batch.map(item =>
      sp.web.lists.getByTitle('Tasks').items.getById(item.originalItem.ID).update(item.updates)
        .then(() => ({ itemId: item.originalItem.ID, success: true }))
        .catch(error => ({ itemId: item.originalItem.ID, success: false, error }))
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    console.log(`Processed batch ${Math.floor(i / batchSize) + 1}`);
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return {
    total: items.length,
    processed: optimized.summary.toUpdate,
    skipped: optimized.summary.skipped,
    succeeded: successCount,
    failed: failureCount,
    results
  };
}
```

---

### Example 3: Data Migration Between Lists

```typescript
import {
  migrateItemsWithUpdates,
  transformItem,
  createSPExtractor
} from 'spfx-toolkit/lib/utilities/listItemHelper';

async function migrateTasksToNewList() {
  // Get items from old list
  const oldItems = await sp.web.lists.getByTitle('Old Tasks').items
    .select('ID', 'OldTitle', 'OldStatus', 'OldPriority', 'OldAssignedTo')
    .expand('OldAssignedTo')
    .getAll();

  // Define migration mapping with transformations
  const migrationMap = {
    OldTitle: 'Title',
    OldStatus: {
      newField: 'Status',
      transform: (value) => {
        // Map old status values to new values
        const statusMap = {
          'Not Started': 'To Do',
          'In Progress': 'In Progress',
          'Completed': 'Done',
          'On Hold': 'Blocked'
        };
        return statusMap[value] || 'To Do';
      }
    },
    OldPriority: {
      newField: 'Priority',
      transform: (value) => {
        // Convert numeric priority to text
        return { '1': 'High', '2': 'Normal', '3': 'Low' }[value] || 'Normal';
      }
    },
    OldAssignedTo: {
      newField: 'AssignedTo',
      transform: (user) => {
        // Keep user object structure
        return user ? { id: user.ID || user.id, title: user.Title } : null;
      }
    }
  };

  // Migrate with update generation
  const migratedResults = migrateItemsWithUpdates(oldItems, migrationMap, true);

  console.log(`Migrating ${migratedResults.length} items...`);

  const results = [];
  for (const result of migratedResults) {
    try {
      // Create item in new list
      const newItem = await sp.web.lists.getByTitle('New Tasks').items.add({
        Title: result.migratedItem.Title,
        Status: result.migratedItem.Status,
        Priority: result.migratedItem.Priority,
        AssignedToId: result.migratedItem.AssignedTo?.id || null
      });

      results.push({
        oldId: result.originalItem.ID,
        newId: newItem.data.ID,
        success: true
      });

      console.log(`Migrated item ${result.originalItem.ID} → ${newItem.data.ID}`);
    } catch (error) {
      results.push({
        oldId: result.originalItem.ID,
        success: false,
        error: error.message
      });
      console.error(`Failed to migrate item ${result.originalItem.ID}:`, error);
    }
  }

  return {
    total: migratedResults.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}
```

---

### Example 4: Complex Field Extraction and Transformation

```typescript
import {
  createSPExtractor,
  transformItem,
  extractFields
} from 'spfx-toolkit/lib/utilities/listItemHelper';

async function getProjectDetails(projectId: number) {
  // Get project item with all fields
  const item = await sp.web.lists.getByTitle('Projects').items.getById(projectId)
    .select('*', 'AssignedTo/Title', 'AssignedTo/EMail', 'TeamMembers/Title', 'Category/Label')
    .expand('AssignedTo', 'TeamMembers', 'Category')();

  const extractor = createSPExtractor(item);

  // Extract all fields
  const project = {
    // Basic fields
    id: extractor.number('ID'),
    title: extractor.string('Title'),
    description: extractor.string('Description'),

    // Date fields
    startDate: extractor.date('StartDate'),
    endDate: extractor.date('EndDate'),
    created: extractor.date('Created'),
    modified: extractor.date('Modified'),

    // User fields
    owner: extractor.user('AssignedTo'),
    teamMembers: extractor.userMulti('TeamMembers'),
    author: extractor.user('Author'),

    // Taxonomy fields
    category: extractor.taxonomy('Category'),
    tags: extractor.taxonomyMulti('Tags'),

    // Choice fields
    status: extractor.choice('Status', 'Not Started'),
    priority: extractor.choice('Priority', 'Normal'),

    // Lookup fields
    parentProject: extractor.lookup('ParentProject'),
    relatedProjects: extractor.lookupMulti('RelatedProjects'),

    // Number fields
    budget: extractor.currency('Budget', 0),
    completion: extractor.number('PercentComplete', 0),

    // Boolean fields
    isActive: extractor.boolean('IsActive', true),

    // URL fields
    documentationUrl: extractor.url('DocumentationLink'),

    // Modern fields
    location: extractor.location('ProjectLocation'),
    thumbnail: extractor.image('Thumbnail')
  };

  // Transform for display
  const displayData = {
    ...project,
    ownerName: project.owner?.title || 'Unassigned',
    ownerEmail: project.owner?.email || '',
    teamSize: project.teamMembers.length,
    categoryName: project.category?.label || 'Uncategorized',
    tagNames: project.tags.map(t => t.label).join(', '),
    hasDocumentation: !!project.documentationUrl?.url,
    daysRemaining: project.endDate
      ? Math.ceil((project.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null
  };

  return displayData;
}
```

---

### Example 5: React Hook for Item Updates with Change Tracking

```typescript
import * as React from 'react';
import {
  createSPUpdater,
  compareItems,
  debugFieldChanges
} from 'spfx-toolkit/lib/utilities/listItemHelper';

interface UseItemUpdaterResult {
  setField: (fieldName: string, value: any) => void;
  hasChanges: boolean;
  changedFields: string[];
  getUpdates: () => Record<string, any>;
  reset: () => void;
  save: () => Promise<void>;
  comparison: ReturnType<typeof compareItems> | null;
}

function useItemUpdater(listTitle: string, originalItem: any): UseItemUpdaterResult {
  const updaterRef = React.useRef(createSPUpdater());
  const [hasChanges, setHasChanges] = React.useState(false);
  const [changedFields, setChangedFields] = React.useState<string[]>([]);
  const [comparison, setComparison] = React.useState(null);

  const setField = React.useCallback((fieldName: string, value: any) => {
    const updater = updaterRef.current;
    updater.set(fieldName, value, originalItem[fieldName]);

    setHasChanges(updater.hasChanges());
    setChangedFields(updater.getChangedFields());

    // Debug changes in development
    if (process.env.NODE_ENV === 'development') {
      const debug = debugFieldChanges(originalItem, { [fieldName]: value });
      console.log(debug.summary);
    }
  }, [originalItem]);

  const getUpdates = React.useCallback(() => {
    return updaterRef.current.getUpdates();
  }, []);

  const reset = React.useCallback(() => {
    updaterRef.current.clear();
    setHasChanges(false);
    setChangedFields([]);
    setComparison(null);
  }, []);

  const save = React.useCallback(async () => {
    const updates = updaterRef.current.getUpdates();

    if (Object.keys(updates).length === 0) {
      console.log('No changes to save');
      return;
    }

    try {
      await sp.web.lists.getByTitle(listTitle).items.getById(originalItem.ID).update(updates);

      const comp = compareItems(originalItem, { ...originalItem, ...updates });
      setComparison(comp);

      console.log(`Saved ${changedFields.length} changes:`, changedFields);
      reset();
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    }
  }, [listTitle, originalItem, changedFields, reset]);

  return {
    setField,
    hasChanges,
    changedFields,
    getUpdates,
    reset,
    save,
    comparison
  };
}

// Usage in component
function TaskEditor({ taskId }: { taskId: number }) {
  const [task, setTask] = React.useState(null);
  const itemUpdater = useItemUpdater('Tasks', task);

  React.useEffect(() => {
    sp.web.lists.getByTitle('Tasks').items.getById(taskId)()
      .then(setTask);
  }, [taskId]);

  if (!task) return <div>Loading...</div>;

  return (
    <div>
      <TextField
        label="Title"
        value={task.Title}
        onChange={(_, value) => {
          setTask({ ...task, Title: value });
          itemUpdater.setField('Title', value);
        }}
      />

      <Dropdown
        label="Status"
        selectedKey={task.Status}
        options={[
          { key: 'Not Started', text: 'Not Started' },
          { key: 'In Progress', text: 'In Progress' },
          { key: 'Completed', text: 'Completed' }
        ]}
        onChange={(_, option) => {
          setTask({ ...task, Status: option.key });
          itemUpdater.setField('Status', option.key);
        }}
      />

      {itemUpdater.hasChanges && (
        <MessageBar messageBarType={MessageBarType.info}>
          Changed fields: {itemUpdater.changedFields.join(', ')}
        </MessageBar>
      )}

      <PrimaryButton
        text="Save"
        disabled={!itemUpdater.hasChanges}
        onClick={itemUpdater.save}
      />

      <DefaultButton
        text="Reset"
        disabled={!itemUpdater.hasChanges}
        onClick={itemUpdater.reset}
      />
    </div>
  );
}
```

---

## Best Practices

### 1. Always Use Change Detection

```typescript
// ❌ BAD: No change detection, always updates
updater.set('Title', newTitle);
updater.set('Status', newStatus);

// ✅ GOOD: Only updates if values actually changed
updater.set('Title', newTitle, originalItem.Title);
updater.set('Status', newStatus, originalItem.Status);

if (updater.hasChanges()) {
  await performUpdate();
}
```

---

### 2. Use Convenience Functions for Simple Operations

```typescript
// ❌ Verbose
const extractor = createSPExtractor(item);
const title = extractor.string('Title');

// ✅ Concise for one-off extractions
const title = extractField(item, 'Title', 'string');
```

---

### 3. Batch Extract Multiple Fields

```typescript
// ❌ BAD: Multiple extractors
const title = extractField(item, 'Title', 'string');
const status = extractField(item, 'Status', 'choice');
const dueDate = extractField(item, 'DueDate', 'date');

// ✅ GOOD: Single batch extraction
const data = extractFields(item, {
  title: { type: 'string' },
  status: { type: 'choice' },
  dueDate: { type: 'date' }
});
```

---

### 4. Validate Before Updating

```typescript
// ✅ GOOD: Always validate first
const validation = validateRequiredFields(formData, ['Title', 'AssignedTo']);
if (!validation.isValid) {
  throw new Error(`Missing: ${validation.missingFields.join(', ')}`);
}

const updater = createSPUpdater();
// ... set fields
```

---

### 5. Optimize Batch Operations

```typescript
// ❌ BAD: Update all items regardless of changes
for (const item of items) {
  await sp.web.lists.getByTitle('Tasks').items.getById(item.ID).update({ Status: 'Completed' });
}

// ✅ GOOD: Only update items with actual changes
const optimized = optimizeBatchUpdates(
  items.map(item => ({ originalItem: item, newValues: { Status: 'Completed' } }))
);

for (const item of optimized.itemsToUpdate) {
  await sp.web.lists.getByTitle('Tasks').items.getById(item.originalItem.ID).update(item.updates);
}

console.log(`Updated ${optimized.summary.toUpdate}, skipped ${optimized.summary.skipped}`);
```

---

### 6. Use TypeScript Types

```typescript
import { IPrincipal, SPLookup, SPTaxonomy } from 'spfx-toolkit/lib/types';

// ✅ GOOD: Fully typed
const assignedTo: IPrincipal | undefined = extractor.user('AssignedTo');
const category: SPTaxonomy | undefined = extractor.taxonomy('Category');
const relatedItems: SPLookup[] = extractor.lookupMulti('RelatedItems');

if (assignedTo) {
  console.log(assignedTo.email); // TypeScript knows the structure
}
```

---

### 7. Debug Changes in Development

```typescript
if (process.env.NODE_ENV === 'development') {
  const debug = debugFieldChanges(originalItem, newValues, { includeUnchanged: true });
  console.log(debug.summary);
  console.table(debug.details);
}
```

---

### 8. Handle Errors Gracefully

```typescript
try {
  const updater = createSPUpdater();
  updater.set('Title', formData.title, originalItem.Title);
  updater.set('AssignedTo', formData.assignedTo, originalItem.AssignedTo);

  if (updater.hasChanges()) {
    const updates = updater.getUpdates();
    await sp.web.lists.getByTitle('Tasks').items.getById(itemId).update(updates);
  }
} catch (error) {
  console.error('Update failed:', error);
  // Show user-friendly error message
  throw new Error('Failed to save changes. Please try again.');
}
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  createSPExtractor,
  createSPUpdater,
  extractField,
  compareItems,
  batchUpdateItems
} from 'spfx-toolkit/lib/utilities/listItemHelper';

import type {
  IPrincipal,
  SPLookup,
  SPTaxonomy,
  SPUrl,
  SPLocation,
  SPImage
} from 'spfx-toolkit/lib/types';

// All functions are fully typed
const extractor = createSPExtractor(item); // ReturnType is fully typed
const user: IPrincipal | undefined = extractor.user('AssignedTo');
const tags: SPTaxonomy[] = extractor.taxonomyMulti('Tags');

// Generic type support
const status = extractField<string>(item, 'Status', 'choice');
const assignedTo = extractField<IPrincipal>(item, 'AssignedTo', 'user');
```

---

## Tree-Shaking

Always use specific imports for optimal bundle size:

```typescript
// ✅ RECOMMENDED: Specific import (tree-shakable)
import { createSPExtractor, createSPUpdater } from 'spfx-toolkit/lib/utilities/listItemHelper';

// ❌ AVOID: Main package import
import { createSPExtractor } from 'spfx-toolkit';
```

---

## Related Utilities

- **[BatchBuilder](../batchBuilder/README.md)** - Batch SharePoint operations
- **[PermissionHelper](../permissionHelper/README.md)** - Permission validation
- **[StringUtils](../stringUtils/README.md)** - String manipulation utilities
- **[DateUtils](../dateUtils/README.md)** - Date formatting and operations

---

## License

Part of [SPFx Toolkit](../../../README.md) - MIT License

---

**Last Updated:** November 2025
