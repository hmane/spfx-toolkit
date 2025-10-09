# ListItemHelper Utility 🔧

Production-ready utilities for extracting, transforming, and updating SharePoint list item fields. Provides type-safe field access, change detection, and comprehensive validation for SPFx applications.

## Features

- 🎯 **Type-Safe Extraction** - Extract fields with proper TypeScript types
- 🔄 **Smart Change Detection** - Automatically detect what fields changed
- 📝 **Field Transformations** - Transform SharePoint field values to clean objects
- ✅ **Validation** - Validate required fields and field values
- 🔀 **Migration Tools** - Migrate fields between different structures
- ⚡ **Performance Optimized** - Skip unnecessary updates with change detection
- 🧪 **Batch Operations** - Process multiple items efficiently
- 📊 **Field Comparison** - Compare items and track differences

## Installation

```bash
npm install spfx-toolkit
```

## Quick Start

```typescript
import {
  createSPExtractor,
  createSPUpdater,
  extractField,
  quickUpdate
} from 'spfx-toolkit/lib/utilities/listItemHelper';

// Extract field value
const extractor = createSPExtractor(spItem);
const title = extractor.string('Title');
const assignedTo = extractor.user('AssignedTo');

// Create update with change detection
const updater = createSPUpdater();
updater.set('Title', 'New Title', originalItem.Title);
updater.set('Status', 'Completed', originalItem.Status);

if (updater.hasChanges()) {
  const updates = updater.getUpdates();
  await sp.web.lists.getById(listId).items.getById(itemId).update(updates);
}
```

See full documentation in the README file for all available features, examples, and best practices.

