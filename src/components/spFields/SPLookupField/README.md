# SPLookupField Component =

A comprehensive lookup field component that mirrors SharePoint's Lookup fields. Supports single/multi-select, auto-switching display modes (dropdown/searchable), cascading lookups, cross-site lookups, and smart performance optimization.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props](#props)
- [Display Modes](#display-modes)
- [Value Structure](#value-structure)
- [Data Source Configuration](#data-source-configuration)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- = **Smart Display Modes** - Auto-switches between dropdown and searchable
- =Ê **Single/Multi Select** - Select one or multiple items
- = **Cascading Lookups** - Dependent lookup relationships
- < **Cross-Site Lookups** - Look up items from other sites
- =¾ **Caching** - Optional data caching
- <¯ **CAML Filtering** - Filter lookup items with CAML
- = **Search** - Search-as-you-type for large lists
- ¡ **Performance** - Optimized for small and large lists
- <£ **React Hook Form** - Native integration
- <¨ **DevExtreme UI** - SelectBox/TagBox for dropdowns
- <¯ **PnP Controls** - ListItemPicker for searchable mode
- =æ **Tree-Shakable** - Import only what you need
- <¯ **TypeScript** - Full type safety

---

## Installation

```bash
npm install spfx-toolkit
```

---

## Quick Start

```typescript
import { SPLookupField, SPLookupDisplayMode } from 'spfx-toolkit/lib/components/spFields/SPLookupField';
import { useForm } from 'react-hook-form';

function MyForm() {
  const { control } = useForm();

  return (
    <>
      {/* Auto mode - small lists use dropdown, large use search */}
      <SPLookupField
        name="customer"
        label="Customer"
        control={control}
        dataSource={{
          listNameOrId: 'Customers',
          displayField: 'Title'
        }}
        rules={{ required: 'Customer is required' }}
      />

      {/* Force dropdown mode for small lists */}
      <SPLookupField
        name="status"
        label="Status"
        control={control}
        displayMode={SPLookupDisplayMode.Dropdown}
        dataSource={{
          listNameOrId: 'ProjectStatus'
        }}
      />

      {/* Force searchable mode for large lists */}
      <SPLookupField
        name="employee"
        label="Employee"
        control={control}
        displayMode={SPLookupDisplayMode.Searchable}
        dataSource={{
          listNameOrId: 'Employees',
          searchFields: ['Title', 'Email']
        }}
      />

      {/* Multi-select */}
      <SPLookupField
        name="tags"
        label="Tags"
        control={control}
        allowMultiple
        dataSource={{
          listNameOrId: 'Tags'
        }}
      />
    </>
  );
}
```

---

## Props

### Base Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Field label |
| `description` | `string` | - | Help text |
| `required` | `boolean` | `false` | Required field |
| `disabled` | `boolean` | `false` | Disable field |
| `readOnly` | `boolean` | `false` | Read-only |
| `errorMessage` | `string` | - | Error message |

### Form Integration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Field name |
| `control` | `Control` | - | React Hook Form control |
| `rules` | `RegisterOptions` | - | Validation rules |

### Lookup Field Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataSource` | `ILookupDataSource` | **Required** | Lookup configuration |
| `allowMultiple` | `boolean` | `false` | Multi-selection |
| `displayMode` | `SPLookupDisplayMode` | `Auto` | Display mode |
| `searchableThreshold` | `number` | `100` | Auto-switch threshold |
| `showSearchBox` | `boolean` | `true` | Show search |
| `searchDelay` | `number` | `300` | Search debounce (ms) |
| `minSearchLength` | `number` | `2` | Min search chars |
| `pageSize` | `number` | `50` | Items per page |
| `maxDisplayedTags` | `number` | `3` | Max tags displayed |
| `useCache` | `boolean` | `true` | Cache data |
| `dependsOn` | `object` | - | Cascading lookup config |

---

## Display Modes

### Auto Mode (Default)

Automatically chooses between dropdown and searchable based on item count.

```typescript
<SPLookupField
  name="project"
  label="Project"
  control={control}
  displayMode={SPLookupDisplayMode.Auto}
  searchableThreshold={100}  // Switch at 100 items
  dataSource={{
    listNameOrId: 'Projects'
  }}
/>
```

- **d threshold**: Uses dropdown (SelectBox) - loads all items
- **> threshold**: Uses searchable (Autocomplete) - async search

**Use cases:** Unknown list sizes, general purpose

---

### Dropdown Mode

Loads all items upfront in a dropdown.

```typescript
<SPLookupField
  name="priority"
  label="Priority"
  control={control}
  displayMode={SPLookupDisplayMode.Dropdown}
  dataSource={{
    listNameOrId: 'Priorities',
    itemLimit: 50
  }}
/>
```

**Best for:** < 100 items, fast local filtering

---

### Searchable Mode

Async search-as-you-type with PnP ListItemPicker.

```typescript
<SPLookupField
  name="employee"
  label="Employee"
  control={control}
  displayMode={SPLookupDisplayMode.Searchable}
  dataSource={{
    listNameOrId: 'Employees',
    searchFields: ['Title', 'Email', 'Department']
  }}
  minSearchLength={3}
  pageSize={25}
/>
```

**Best for:** > 100 items, large lists, performance

---

## Value Structure

```typescript
interface ISPLookupFieldValue {
  id: number;      // Item ID
  title: string;   // Display value
}

// Single value
const single: ISPLookupFieldValue = { id: 5, title: 'John Doe' };

// Multiple values
const multiple: ISPLookupFieldValue[] = [
  { id: 5, title: 'John Doe' },
  { id: 10, title: 'Jane Smith' }
];
```

---

## Data Source Configuration

```typescript
interface ILookupDataSource {
  listNameOrId: string;        // List name or GUID (required)
  displayField?: string;       // Field to display (default: 'Title')
  additionalFields?: string[]; // Extra fields to retrieve
  filter?: string;             // CAML filter
  orderBy?: string;            // Order by clause
  itemLimit?: number;          // Max items (default: 100)
  webUrl?: string;             // Cross-site URL
  searchFields?: string[];     // Search fields (for searchable mode)
}
```

### Examples

```typescript
// Basic lookup
const ds1 = {
  listNameOrId: 'Customers'
};

// With filtering and ordering
const ds2 = {
  listNameOrId: 'Products',
  displayField: 'ProductName',
  filter: "<Eq><FieldRef Name='Active'/><Value Type='Boolean'>1</Value></Eq>",
  orderBy: 'ProductName'
};

// Cross-site lookup
const ds3 = {
  listNameOrId: 'Departments',
  webUrl: '/sites/hr'
};

// With search fields
const ds4 = {
  listNameOrId: 'Employees',
  displayField: 'Title',
  searchFields: ['Title', 'Email', 'Department']
};
```

---

## Usage Patterns

### Pattern 1: Basic Lookup

```typescript
<SPLookupField
  name="customer"
  label="Customer"
  control={control}
  dataSource={{
    listNameOrId: 'Customers'
  }}
  rules={{ required: 'Customer is required' }}
/>
```

---

### Pattern 2: Filtered Lookup

```typescript
<SPLookupField
  name="activeProject"
  label="Active Project"
  control={control}
  dataSource={{
    listNameOrId: 'Projects',
    filter: "<Eq><FieldRef Name='Status'/><Value Type='Text'>Active</Value></Eq>",
    orderBy: 'Title'
  }}
/>
```

---

### Pattern 3: Cascading Lookups

```typescript
function MyForm() {
  const { control, watch } = useForm();
  const country = watch('country');

  return (
    <>
      {/* Parent lookup */}
      <SPLookupField
        name="country"
        label="Country"
        control={control}
        dataSource={{
          listNameOrId: 'Countries'
        }}
      />

      {/* Dependent lookup */}
      <SPLookupField
        name="city"
        label="City"
        control={control}
        dataSource={{
          listNameOrId: 'Cities'
        }}
        dependsOn={{
          fieldName: 'country',
          lookupField: 'Country'  // Lookup field in Cities list
        }}
        disabled={!country}
      />
    </>
  );
}
```

---

### Pattern 4: Large List with Search

```typescript
<SPLookupField
  name="employee"
  label="Employee"
  control={control}
  displayMode={SPLookupDisplayMode.Searchable}
  dataSource={{
    listNameOrId: 'Employees',
    displayField: 'Title',
    searchFields: ['Title', 'Email', 'EmployeeID']
  }}
  minSearchLength={3}
  searchDelay={500}
  pageSize={25}
/>
```

---

### Pattern 5: Multi-Select with Limit

```typescript
<SPLookupField
  name="teamMembers"
  label="Team Members"
  control={control}
  allowMultiple
  dataSource={{
    listNameOrId: 'Employees',
    filter: "<Eq><FieldRef Name='Active'/><Value Type='Boolean'>1</Value></Eq>"
  }}
  maxDisplayedTags={5}
  rules={{
    validate: (value) => {
      if (value.length > 10) return 'Maximum 10 members allowed';
      return true;
    }
  }}
/>
```

---

## Complete Examples

### Example 1: Project Management Form

```typescript
import { SPLookupField, SPLookupDisplayMode } from 'spfx-toolkit/lib/components/spFields/SPLookupField';
import { useForm } from 'react-hook-form';
import { ISPLookupFieldValue } from 'spfx-toolkit/lib/components/spFields/types';

interface IProjectForm {
  customer: ISPLookupFieldValue;
  projectManager: ISPLookupFieldValue;
  teamMembers: ISPLookupFieldValue[];
  status: ISPLookupFieldValue;
}

function ProjectForm() {
  const { control, handleSubmit } = useForm<IProjectForm>();

  const onSubmit = async (data: IProjectForm) => {
    console.log('Project data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Customer - Dropdown mode */}
      <SPLookupField
        name="customer"
        label="Customer"
        control={control}
        displayMode={SPLookupDisplayMode.Dropdown}
        dataSource={{
          listNameOrId: 'Customers',
          filter: "<Eq><FieldRef Name='Active'/><Value Type='Boolean'>1</Value></Eq>",
          orderBy: 'CompanyName'
        }}
        rules={{ required: 'Customer is required' }}
        useCache
      />

      {/* Project Manager - Searchable mode */}
      <SPLookupField
        name="projectManager"
        label="Project Manager"
        control={control}
        displayMode={SPLookupDisplayMode.Searchable}
        dataSource={{
          listNameOrId: 'Employees',
          displayField: 'Title',
          searchFields: ['Title', 'Email'],
          filter: "<Eq><FieldRef Name='Role'/><Value Type='Text'>Manager</Value></Eq>"
        }}
        minSearchLength={2}
        rules={{ required: 'Project manager is required' }}
      />

      {/* Team Members - Multi-select */}
      <SPLookupField
        name="teamMembers"
        label="Team Members"
        control={control}
        allowMultiple
        displayMode={SPLookupDisplayMode.Searchable}
        dataSource={{
          listNameOrId: 'Employees',
          searchFields: ['Title', 'Department']
        }}
        maxDisplayedTags={5}
      />

      {/* Status - Small dropdown */}
      <SPLookupField
        name="status"
        label="Project Status"
        control={control}
        displayMode={SPLookupDisplayMode.Dropdown}
        dataSource={{
          listNameOrId: 'ProjectStatuses',
          orderBy: 'SortOrder'
        }}
        rules={{ required: 'Status is required' }}
      />

      <PrimaryButton type="submit" text="Save Project" />
    </form>
  );
}
```

---

### Example 2: Cascading Location Lookup

```typescript
import { SPLookupField } from 'spfx-toolkit/lib/components/spFields/SPLookupField';
import { useForm } from 'react-hook-form';
import { ISPLookupFieldValue } from 'spfx-toolkit/lib/components/spFields/types';

interface ILocationForm {
  country: ISPLookupFieldValue;
  state: ISPLookupFieldValue;
  city: ISPLookupFieldValue;
}

function LocationForm() {
  const { control, watch } = useForm<ILocationForm>();
  const country = watch('country');
  const state = watch('state');

  return (
    <div>
      {/* Level 1: Country */}
      <SPLookupField
        name="country"
        label="Country"
        control={control}
        dataSource={{
          listNameOrId: 'Countries',
          orderBy: 'Title'
        }}
        rules={{ required: 'Country is required' }}
      />

      {/* Level 2: State (depends on Country) */}
      <SPLookupField
        name="state"
        label="State/Province"
        control={control}
        dataSource={{
          listNameOrId: 'States'
        }}
        dependsOn={{
          fieldName: 'country',
          lookupField: 'Country'
        }}
        disabled={!country}
        rules={{
          required: 'State is required',
          validate: () => country || 'Please select country first'
        }}
      />

      {/* Level 3: City (depends on State) */}
      <SPLookupField
        name="city"
        label="City"
        control={control}
        displayMode={SPLookupDisplayMode.Searchable}
        dataSource={{
          listNameOrId: 'Cities',
          searchFields: ['Title', 'PostalCode']
        }}
        dependsOn={{
          fieldName: 'state',
          lookupField: 'State'
        }}
        disabled={!state}
        minSearchLength={2}
      />
    </div>
  );
}
```

---

## Best Practices

### 1. Choose Appropriate Display Mode

```typescript
//  GOOD: Dropdown for small lists
<SPLookupField
  name="priority"
  label="Priority"
  control={control}
  displayMode={SPLookupDisplayMode.Dropdown}
  dataSource={{ listNameOrId: 'Priorities' }}
/>

//  GOOD: Searchable for large lists
<SPLookupField
  name="employee"
  label="Employee"
  control={control}
  displayMode={SPLookupDisplayMode.Searchable}
  dataSource={{
    listNameOrId: 'Employees',
    searchFields: ['Title', 'Email']
  }}
/>
```

---

### 2. Use Filters to Limit Results

```typescript
//  GOOD: Filter for active items only
<SPLookupField
  name="activeProject"
  label="Active Project"
  control={control}
  dataSource={{
    listNameOrId: 'Projects',
    filter: "<Eq><FieldRef Name='Status'/><Value Type='Text'>Active</Value></Eq>"
  }}
/>
```

---

### 3. Enable Caching for Static Data

```typescript
//  GOOD: Cache for frequently used, rarely changing data
<SPLookupField
  name="department"
  label="Department"
  control={control}
  dataSource={{ listNameOrId: 'Departments' }}
  useCache  // Cache department list
/>
```

---

### 4. Configure Search for Large Lists

```typescript
//  GOOD: Optimize search
<SPLookupField
  name="customer"
  label="Customer"
  control={control}
  displayMode={SPLookupDisplayMode.Searchable}
  dataSource={{
    listNameOrId: 'Customers',
    searchFields: ['CompanyName', 'CustomerID']
  }}
  minSearchLength={3}
  searchDelay={500}
  pageSize={25}
/>
```

---

## TypeScript Support

```typescript
import {
  SPLookupField,
  SPLookupDisplayMode,
  ISPLookupFieldProps,
  ILookupDataSource,
  ISPLookupFieldValue
} from 'spfx-toolkit/lib/components/spFields/SPLookupField';

// Lookup value
const value: ISPLookupFieldValue = {
  id: 5,
  title: 'Customer Name'
};

// Data source
const dataSource: ILookupDataSource = {
  listNameOrId: 'Customers',
  displayField: 'Title',
  filter: "<Eq><FieldRef Name='Active'/><Value Type='Boolean'>1</Value></Eq>"
};

// Display mode
const mode: SPLookupDisplayMode = SPLookupDisplayMode.Auto;
```

---

## Related Components

- **[SPUserField](../SPUserField/README.md)** - People picker fields
- **[SPTaxonomyField](../SPTaxonomyField/README.md)** - Managed metadata fields
- **[SPChoiceField](../SPChoiceField/README.md)** - Choice fields

---

## Tree-Shaking

```typescript
//  RECOMMENDED
import { SPLookupField } from 'spfx-toolkit/lib/components/spFields/SPLookupField';

// L AVOID
import { SPLookupField } from 'spfx-toolkit';
```

---

## License

Part of [SPFx Toolkit](../../../../README.md) - MIT License

---

**Last Updated:** November 2025
