# SPTaxonomyField Component <÷

A comprehensive managed metadata (taxonomy) field component that mirrors SharePoint's Managed Metadata fields. Supports term set integration, single/multi-select, hierarchical term display, search functionality, and DevExtreme UI integration.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props](#props)
- [Value Structure](#value-structure)
- [Data Source Configuration](#data-source-configuration)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- <÷ **Managed Metadata** - Connect to SharePoint term stores
- = **Search Functionality** - Search terms with configurable delay
- =Ê **Single/Multi Select** - Select one or multiple terms
- <3 **Hierarchical Display** - Show term paths and hierarchy
- =¾ **Caching** - Optional term data caching
- <¯ **Anchor Terms** - Limit to specific term branches
- <£ **React Hook Form** - Native integration with validation
- <¨ **DevExtreme UI** - Consistent styling with spForm system
-  **Validation** - Built-in validation with custom rules
- <­ **Styling Modes** - Outlined, underlined, or filled styles
- = **Access Control** - Read-only and disabled states
- =æ **Tree-Shakable** - Import only what you need
- <¯ **TypeScript** - Full type safety

---

## Installation

```bash
npm install spfx-toolkit
```

---

## Quick Start

### With React Hook Form

```typescript
import { SPTaxonomyField } from 'spfx-toolkit/lib/components/spFields/SPTaxonomyField';
import { useForm } from 'react-hook-form';

function MyForm() {
  const { control } = useForm();

  return (
    <>
      {/* Single taxonomy term */}
      <SPTaxonomyField
        name="department"
        label="Department"
        control={control}
        dataSource={{
          termSetId: '12345678-1234-1234-1234-123456789012'
        }}
        rules={{ required: 'Department is required' }}
      />

      {/* Multiple taxonomy terms */}
      <SPTaxonomyField
        name="keywords"
        label="Keywords"
        control={control}
        allowMultiple
        dataSource={{
          termSetId: '87654321-4321-4321-4321-210987654321'
        }}
        maxDisplayedTags={5}
      />

      {/* With anchor term (limit to branch) */}
      <SPTaxonomyField
        name="subDepartment"
        label="Sub-Department"
        control={control}
        dataSource={{
          termSetId: '12345678-1234-1234-1234-123456789012',
          anchorId: 'abcdef12-1234-1234-1234-123456abcdef'
        }}
        showPath
      />
    </>
  );
}
```

### Standalone (Without Form)

```typescript
import { SPTaxonomyField } from 'spfx-toolkit/lib/components/spFields/SPTaxonomyField';
import { ISPTaxonomyFieldValue } from 'spfx-toolkit/lib/components/spFields/types';

function MyComponent() {
  const [selectedTerm, setSelectedTerm] = React.useState<ISPTaxonomyFieldValue | null>(null);

  return (
    <SPTaxonomyField
      label="Category"
      value={selectedTerm}
      onChange={setSelectedTerm}
      dataSource={{
        termSetId: '12345678-1234-1234-1234-123456789012'
      }}
      showSearchBox
      useCache
    />
  );
}
```

---

## Props

### Base Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Field label text |
| `description` | `string` | - | Help text below the field |
| `required` | `boolean` | `false` | Mark field as required |
| `disabled` | `boolean` | `false` | Disable the field |
| `readOnly` | `boolean` | `false` | Make field read-only |
| `placeholder` | `string` | - | Placeholder text |
| `errorMessage` | `string` | - | Custom error message |
| `className` | `string` | - | CSS class for wrapper |
| `width` | `string \| number` | - | Field width |

### Form Integration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Field name for form |
| `control` | `Control` | - | React Hook Form control |
| `rules` | `RegisterOptions` | - | Validation rules |

### Standalone Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `ISPTaxonomyFieldValue \| ISPTaxonomyFieldValue[]` | - | Controlled value |
| `defaultValue` | `ISPTaxonomyFieldValue \| ISPTaxonomyFieldValue[]` | - | Initial value |
| `onChange` | `(value) => void` | - | Change handler |
| `onBlur` | `() => void` | - | Blur handler |
| `onFocus` | `() => void` | - | Focus handler |

### Taxonomy Field Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataSource` | `ITaxonomyDataSource` | **Required** | Term store configuration |
| `allowMultiple` | `boolean` | `false` | Enable multi-selection |
| `showSearchBox` | `boolean` | `true` | Show search functionality |
| `searchDelay` | `number` | `300` | Search debounce delay (ms) |
| `minSearchLength` | `number` | `2` | Minimum search characters |
| `maxDisplayedTags` | `number` | `3` | Max tags before collapse |
| `showClearButton` | `boolean` | `true` | Show clear button |
| `useCache` | `boolean` | `true` | Cache taxonomy data |
| `showPath` | `boolean` | `false` | Show term hierarchy path |
| `pathSeparator` | `string` | `' > '` | Hierarchy separator |
| `stylingMode` | `string` | `'outlined'` | Style variant |

---

## Value Structure

### ISPTaxonomyFieldValue Interface

```typescript
interface ISPTaxonomyFieldValue {
  /**
   * Term label (display name)
   */
  label: string;

  /**
   * Term GUID
   */
  termId: string;

  /**
   * WSS ID (optional)
   */
  wssId?: number;
}
```

### Example Values

```typescript
// Single term
const singleTerm: ISPTaxonomyFieldValue = {
  label: 'Information Technology',
  termId: '12345678-1234-1234-1234-123456789012',
  wssId: 5
};

// Multiple terms
const multipleTerms: ISPTaxonomyFieldValue[] = [
  {
    label: 'JavaScript',
    termId: 'aaaaaaaa-1111-1111-1111-111111111111',
    wssId: 10
  },
  {
    label: 'TypeScript',
    termId: 'bbbbbbbb-2222-2222-2222-222222222222',
    wssId: 11
  }
];
```

---

## Data Source Configuration

### ITaxonomyDataSource Interface

```typescript
interface ITaxonomyDataSource {
  /**
   * Term set GUID (required)
   */
  termSetId: string;

  /**
   * Anchor term GUID (optional - limits to branch)
   */
  anchorId?: string;

  /**
   * Term store name (optional - defaults to default)
   */
  termStoreName?: string;
}
```

### Configuration Examples

```typescript
// Full term set
const dataSource1: ITaxonomyDataSource = {
  termSetId: '12345678-1234-1234-1234-123456789012'
};

// Limited to specific branch (anchor term)
const dataSource2: ITaxonomyDataSource = {
  termSetId: '12345678-1234-1234-1234-123456789012',
  anchorId: 'abcdef12-1234-1234-1234-123456abcdef'
};

// Specific term store
const dataSource3: ITaxonomyDataSource = {
  termSetId: '12345678-1234-1234-1234-123456789012',
  termStoreName: 'CustomTermStore'
};
```

---

## Usage Patterns

### Pattern 1: Basic Single Term

```typescript
<SPTaxonomyField
  name="department"
  label="Department"
  control={control}
  dataSource={{
    termSetId: '12345678-1234-1234-1234-123456789012'
  }}
  rules={{ required: 'Department is required' }}
/>
```

---

### Pattern 2: Multi-Select with Tags

```typescript
<SPTaxonomyField
  name="skills"
  label="Skills"
  control={control}
  allowMultiple
  dataSource={{
    termSetId: '87654321-4321-4321-4321-210987654321'
  }}
  maxDisplayedTags={5}
  showPath
  pathSeparator=" ’ "
/>
```

---

### Pattern 3: Limited to Term Branch

```typescript
<SPTaxonomyField
  name="region"
  label="Region"
  control={control}
  dataSource={{
    termSetId: '12345678-1234-1234-1234-123456789012',
    anchorId: 'northamerica-guid-here'
  }}
  description="Select from North American regions only"
/>
```

---

### Pattern 4: With Search and Caching

```typescript
<SPTaxonomyField
  name="category"
  label="Category"
  control={control}
  dataSource={{
    termSetId: '12345678-1234-1234-1234-123456789012'
  }}
  showSearchBox
  searchDelay={500}
  minSearchLength={3}
  useCache
/>
```

---

### Pattern 5: Show Hierarchical Path

```typescript
<SPTaxonomyField
  name="location"
  label="Location"
  control={control}
  dataSource={{
    termSetId: '12345678-1234-1234-1234-123456789012'
  }}
  showPath
  pathSeparator=" > "
  description="Full path will be displayed (e.g., North America > USA > California)"
/>
```

---

## Complete Examples

### Example 1: Department and Skills Selection

```typescript
import { SPTaxonomyField } from 'spfx-toolkit/lib/components/spFields/SPTaxonomyField';
import { useForm } from 'react-hook-form';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { ISPTaxonomyFieldValue } from 'spfx-toolkit/lib/components/spFields/types';

interface IEmployeeForm {
  department: ISPTaxonomyFieldValue;
  skills: ISPTaxonomyFieldValue[];
  certifications: ISPTaxonomyFieldValue[];
}

function EmployeeSkillsForm() {
  const { control, handleSubmit } = useForm<IEmployeeForm>();

  const onSubmit = async (data: IEmployeeForm) => {
    console.log('Employee data:', data);
    // Submit to SharePoint
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Department - Single select */}
      <SPTaxonomyField
        name="department"
        label="Department"
        control={control}
        dataSource={{
          termSetId: 'dept-termset-guid'
        }}
        showPath
        rules={{ required: 'Department is required' }}
        useCache
      />

      {/* Skills - Multi-select */}
      <SPTaxonomyField
        name="skills"
        label="Technical Skills"
        control={control}
        allowMultiple
        dataSource={{
          termSetId: 'skills-termset-guid'
        }}
        maxDisplayedTags={5}
        showSearchBox
        searchDelay={300}
        minSearchLength={2}
        rules={{
          required: 'At least one skill is required',
          validate: (value) =>
            value.length <= 10 || 'Maximum 10 skills allowed'
        }}
      />

      {/* Certifications - Multi-select */}
      <SPTaxonomyField
        name="certifications"
        label="Certifications"
        control={control}
        allowMultiple
        dataSource={{
          termSetId: 'cert-termset-guid'
        }}
        maxDisplayedTags={3}
        description="Select your professional certifications"
      />

      <PrimaryButton type="submit" text="Save Employee Profile" />
    </form>
  );
}
```

---

### Example 2: Document Classification

```typescript
import { SPTaxonomyField } from 'spfx-toolkit/lib/components/spFields/SPTaxonomyField';
import { useForm } from 'react-hook-form';
import { ISPTaxonomyFieldValue } from 'spfx-toolkit/lib/components/spFields/types';

interface IDocumentForm {
  documentType: ISPTaxonomyFieldValue;
  category: ISPTaxonomyFieldValue;
  keywords: ISPTaxonomyFieldValue[];
  geography: ISPTaxonomyFieldValue;
}

function DocumentClassificationForm() {
  const { control, handleSubmit, watch } = useForm<IDocumentForm>();
  const documentType = watch('documentType');

  const onSubmit = async (data: IDocumentForm) => {
    console.log('Document metadata:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Document Type */}
      <SPTaxonomyField
        name="documentType"
        label="Document Type"
        control={control}
        dataSource={{
          termSetId: 'doctype-termset-guid'
        }}
        rules={{ required: 'Document type is required' }}
        showPath
        pathSeparator=" ’ "
      />

      {/* Category - Limited based on document type */}
      <SPTaxonomyField
        name="category"
        label="Category"
        control={control}
        dataSource={{
          termSetId: 'category-termset-guid',
          anchorId: documentType?.termId  // Limit to branch
        }}
        rules={{ required: 'Category is required' }}
        disabled={!documentType}
        description="Select document type first"
      />

      {/* Keywords - Multi-select with search */}
      <SPTaxonomyField
        name="keywords"
        label="Keywords"
        control={control}
        allowMultiple
        dataSource={{
          termSetId: 'keywords-termset-guid'
        }}
        maxDisplayedTags={5}
        showSearchBox
        searchDelay={500}
        minSearchLength={3}
        useCache
        description="Add relevant keywords for search"
      />

      {/* Geography */}
      <SPTaxonomyField
        name="geography"
        label="Geography"
        control={control}
        dataSource={{
          termSetId: 'geography-termset-guid'
        }}
        showPath
        pathSeparator=" > "
        useCache
        description="Select the relevant geographic region"
      />

      <PrimaryButton type="submit" text="Save Classification" />
    </form>
  );
}
```

---

## Best Practices

### 1. Always Provide Term Set ID

```typescript
//  GOOD: Valid term set GUID
<SPTaxonomyField
  name="department"
  label="Department"
  control={control}
  dataSource={{
    termSetId: '12345678-1234-1234-1234-123456789012'
  }}
/>
```

**Note:** You can find term set GUIDs in SharePoint's Term Store Management Tool.

---

### 2. Use Caching for Better Performance

```typescript
//  GOOD: Enable caching for frequently used term sets
<SPTaxonomyField
  name="category"
  label="Category"
  control={control}
  dataSource={{
    termSetId: 'category-termset-guid'
  }}
  useCache  // Cache term data
/>
```

---

### 3. Configure Search for Large Term Sets

```typescript
//  GOOD: Optimize search for large term sets
<SPTaxonomyField
  name="location"
  label="Location"
  control={control}
  dataSource={{
    termSetId: 'location-termset-guid'
  }}
  showSearchBox
  searchDelay={500}  // Debounce for performance
  minSearchLength={3}  // Require 3 characters minimum
/>
```

---

### 4. Show Hierarchical Paths for Clarity

```typescript
//  GOOD: Show full path for nested terms
<SPTaxonomyField
  name="region"
  label="Region"
  control={control}
  dataSource={{
    termSetId: 'geography-termset-guid'
  }}
  showPath
  pathSeparator=" > "
  description="Full location path will be shown (e.g., North America > USA > California)"
/>
```

---

### 5. Use Anchor Terms to Limit Scope

```typescript
//  GOOD: Limit to specific branch of term set
<SPTaxonomyField
  name="productCategory"
  label="Product Category"
  control={control}
  dataSource={{
    termSetId: 'products-termset-guid',
    anchorId: 'electronics-branch-guid'
  }}
  description="Electronics categories only"
/>
```

---

### 6. Validate Multi-Select Limits

```typescript
//  GOOD: Limit number of selections
<SPTaxonomyField
  name="tags"
  label="Tags"
  control={control}
  allowMultiple
  dataSource={{
    termSetId: 'tags-termset-guid'
  }}
  maxDisplayedTags={5}
  rules={{
    validate: (value) => {
      if (!value || value.length === 0) return 'At least one tag is required';
      if (value.length > 10) return 'Maximum 10 tags allowed';
      return true;
    }
  }}
/>
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  SPTaxonomyField,
  ISPTaxonomyFieldProps,
  ITaxonomyDataSource,
  ISPTaxonomyFieldValue
} from 'spfx-toolkit/lib/components/spFields/SPTaxonomyField';

// All props are fully typed
const props: ISPTaxonomyFieldProps = {
  name: 'department',
  label: 'Department',
  dataSource: {
    termSetId: '12345678-1234-1234-1234-123456789012'
  },
  allowMultiple: false,
  showPath: true
};

// Data source configuration
const dataSource: ITaxonomyDataSource = {
  termSetId: '12345678-1234-1234-1234-123456789012',
  anchorId: 'anchor-guid-optional',
  termStoreName: 'CustomStore'
};

// Term value structure
const termValue: ISPTaxonomyFieldValue = {
  label: 'Information Technology',
  termId: '12345678-1234-1234-1234-123456789012',
  wssId: 5
};

// Multiple terms
const multipleTerms: ISPTaxonomyFieldValue[] = [
  { label: 'JavaScript', termId: 'guid1', wssId: 10 },
  { label: 'TypeScript', termId: 'guid2', wssId: 11 }
];
```

---

## Related Components

- **[SPLookupField](../SPLookupField/README.md)** - Lookup fields
- **[SPChoiceField](../SPChoiceField/README.md)** - Choice and dropdown fields
- **[SPUserField](../SPUserField/README.md)** - People picker fields

---

## Tree-Shaking

Always use specific imports for optimal bundle size:

```typescript
//  RECOMMENDED: Specific import
import { SPTaxonomyField } from 'spfx-toolkit/lib/components/spFields/SPTaxonomyField';

// L AVOID: Bulk import
import { SPTaxonomyField } from 'spfx-toolkit';
```

---

## License

Part of [SPFx Toolkit](../../../../README.md) - MIT License

---

**Last Updated:** November 2025
