# SPUserField Component =d

A comprehensive people picker field component that mirrors SharePoint's Person or Group fields. Supports single/multi-select, group selection, presence indicators, user photos, and PnP SPFx Controls integration.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props](#props)
- [Value Structure](#value-structure)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- =d **People Picker** - Native SharePoint user search
- =e **Groups** - Optional group selection
- = **Search** - Real-time user/group search
- =Ê **Single/Multi Select** - One or multiple users
- <¯ **Group Filtering** - Limit to specific SharePoint groups
- =ø **User Photos** - Display user profile pictures
- =â **Presence** - Show online/offline/busy status
- =ç **User Details** - Email, job title display
- <£ **React Hook Form** - Native integration
- <¨ **PnP Controls** - PeoplePicker integration
- < **Cross-Site** - Look up users from other sites
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
import { SPUserField } from 'spfx-toolkit/lib/components/spFields/SPUserField';
import { useForm } from 'react-hook-form';

function MyForm() {
  const { control } = useForm();

  return (
    <>
      {/* Single user */}
      <SPUserField
        name="assignedTo"
        label="Assigned To"
        control={control}
        rules={{ required: 'User is required' }}
      />

      {/* Multiple users */}
      <SPUserField
        name="teamMembers"
        label="Team Members"
        control={control}
        allowMultiple
        maxSelections={10}
      />

      {/* Include groups */}
      <SPUserField
        name="approver"
        label="Approver"
        control={control}
        allowGroups
      />

      {/* Limited to specific group */}
      <SPUserField
        name="manager"
        label="Manager"
        control={control}
        limitToGroup="Managers"
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

### Form Integration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Field name |
| `control` | `Control` | - | React Hook Form control |
| `rules` | `RegisterOptions` | - | Validation rules |

### User Field Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `allowMultiple` | `boolean` | `false` | Multi-selection |
| `allowGroups` | `boolean` | `false` | Allow groups |
| `limitToGroup` | `string \| string[]` | - | Limit to specific groups |
| `maxSelections` | `number` | - | Max users (multi-select) |
| `minSelections` | `number` | - | Min users (multi-select) |
| `showPresence` | `boolean` | `false` | Show presence indicator |
| `showPhoto` | `boolean` | `true` | Show user photo |
| `showEmail` | `boolean` | `false` | Show email |
| `showJobTitle` | `boolean` | `false` | Show job title |
| `resolveDelay` | `number` | `300` | Search debounce (ms) |
| `suggestionLimit` | `number` | `5` | Max search results |
| `webUrl` | `string` | - | Cross-site URL |

---

## Value Structure

```typescript
interface IPrincipal {
  id: string;           // User/Group ID
  email?: string;       // Email address
  title?: string;       // Display name
  value?: string;       // Login name
  loginName?: string;   // Login name
  department?: string;  // Department
  jobTitle?: string;    // Job title
  sip?: string;         // SIP address
  picture?: string;     // Photo URL
}

// Single user
const single: IPrincipal = {
  id: '5',
  email: 'john.doe@company.com',
  title: 'John Doe',
  loginName: 'i:0#.f|membership|john.doe@company.com'
};

// Multiple users
const multiple: IPrincipal[] = [
  { id: '5', title: 'John Doe', email: 'john@company.com' },
  { id: '10', title: 'Jane Smith', email: 'jane@company.com' }
];
```

---

## Usage Patterns

### Pattern 1: Basic Single User

```typescript
<SPUserField
  name="owner"
  label="Owner"
  control={control}
  rules={{ required: 'Owner is required' }}
  showPhoto
/>
```

---

### Pattern 2: Multi-Select with Limit

```typescript
<SPUserField
  name="reviewers"
  label="Reviewers"
  control={control}
  allowMultiple
  maxSelections={5}
  rules={{
    required: 'At least one reviewer is required',
    validate: (value) => {
      if (value.length < 2) return 'Minimum 2 reviewers required';
      if (value.length > 5) return 'Maximum 5 reviewers allowed';
      return true;
    }
  }}
/>
```

---

### Pattern 3: Users and Groups

```typescript
<SPUserField
  name="approver"
  label="Approver"
  control={control}
  allowGroups
  description="Select a user or approval group"
/>
```

---

### Pattern 4: Limited to Specific Group

```typescript
<SPUserField
  name="manager"
  label="Manager"
  control={control}
  limitToGroup="Managers"
  description="Select from Managers group only"
/>
```

---

### Pattern 5: With Presence and Details

```typescript
<SPUserField
  name="assignee"
  label="Assigned To"
  control={control}
  showPresence
  showEmail
  showJobTitle
  resolveDelay={500}
/>
```

---

## Complete Examples

### Example 1: Task Assignment Form

```typescript
import { SPUserField } from 'spfx-toolkit/lib/components/spFields/SPUserField';
import { useForm } from 'react-hook-form';
import { IPrincipal } from 'spfx-toolkit/lib/types';

interface ITaskForm {
  assignedTo: IPrincipal;
  approver: IPrincipal;
  cc: IPrincipal[];
}

function TaskAssignmentForm() {
  const { control, handleSubmit } = useForm<ITaskForm>();

  const onSubmit = async (data: ITaskForm) => {
    console.log('Task assignment:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Assigned To - Single user */}
      <SPUserField
        name="assignedTo"
        label="Assigned To"
        control={control}
        showPresence
        showPhoto
        showEmail
        rules={{ required: 'Assignee is required' }}
      />

      {/* Approver - User or Group */}
      <SPUserField
        name="approver"
        label="Approver"
        control={control}
        allowGroups
        showPhoto
        description="Select user or approval group"
      />

      {/* CC - Multiple users */}
      <SPUserField
        name="cc"
        label="CC"
        control={control}
        allowMultiple
        maxSelections={10}
        showEmail
        description="Carbon copy recipients"
      />

      <PrimaryButton type="submit" text="Assign Task" />
    </form>
  );
}
```

---

### Example 2: Team Management

```typescript
import { SPUserField } from 'spfx-toolkit/lib/components/spFields/SPUserField';
import { useForm } from 'react-hook-form';
import { IPrincipal } from 'spfx-toolkit/lib/types';

interface ITeamForm {
  teamLead: IPrincipal;
  teamMembers: IPrincipal[];
  stakeholders: IPrincipal[];
}

function TeamManagementForm() {
  const { control, handleSubmit } = useForm<ITeamForm>();

  const onSubmit = async (data: ITeamForm) => {
    console.log('Team data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Team Lead - From Managers group */}
      <SPUserField
        name="teamLead"
        label="Team Lead"
        control={control}
        limitToGroup="Managers"
        showPresence
        showJobTitle
        rules={{ required: 'Team lead is required' }}
      />

      {/* Team Members - 2-10 people */}
      <SPUserField
        name="teamMembers"
        label="Team Members"
        control={control}
        allowMultiple
        minSelections={2}
        maxSelections={10}
        showPhoto
        showEmail
        rules={{
          required: 'Team members are required',
          validate: (value) => {
            if (value.length < 2) return 'Minimum 2 team members';
            if (value.length > 10) return 'Maximum 10 team members';
            return true;
          }
        }}
      />

      {/* Stakeholders - Optional */}
      <SPUserField
        name="stakeholders"
        label="Stakeholders"
        control={control}
        allowMultiple
        allowGroups
        showEmail
        description="Users or groups to notify"
      />

      <PrimaryButton type="submit" text="Save Team" />
    </form>
  );
}
```

---

## Best Practices

### 1. Set Appropriate Selection Limits

```typescript
//  GOOD: Clear limits for multi-select
<SPUserField
  name="approvers"
  label="Approvers"
  control={control}
  allowMultiple
  minSelections={1}
  maxSelections={5}
  rules={{
    validate: (value) => {
      if (value.length < 1) return 'At least one approver required';
      if (value.length > 5) return 'Maximum 5 approvers allowed';
      return true;
    }
  }}
/>
```

---

### 2. Use Group Filtering When Appropriate

```typescript
//  GOOD: Limit to specific role
<SPUserField
  name="technicalReviewer"
  label="Technical Reviewer"
  control={control}
  limitToGroup="Tech Reviewers"
  description="Select from technical review team"
/>
```

---

### 3. Show Presence for Real-Time Collaboration

```typescript
//  GOOD: Show presence for immediate contact
<SPUserField
  name="contactPerson"
  label="Contact Person"
  control={control}
  showPresence
  showEmail
  showJobTitle
  description="Primary contact for this item"
/>
```

---

### 4. Allow Groups for Flexibility

```typescript
//  GOOD: Allow groups for broader assignments
<SPUserField
  name="notificationRecipients"
  label="Notification Recipients"
  control={control}
  allowMultiple
  allowGroups
  description="Select users or groups to notify"
/>
```

---

### 5. Validate Required Selections

```typescript
//  GOOD: Proper validation
<SPUserField
  name="owner"
  label="Document Owner"
  control={control}
  rules={{
    required: 'Owner is required',
    validate: (value) => {
      if (!value) return 'Please select an owner';
      return true;
    }
  }}
/>
```

---

## TypeScript Support

```typescript
import {
  SPUserField,
  ISPUserFieldProps
} from 'spfx-toolkit/lib/components/spFields/SPUserField';
import { IPrincipal } from 'spfx-toolkit/lib/types';

// User value
const user: IPrincipal = {
  id: '5',
  email: 'john.doe@company.com',
  title: 'John Doe',
  loginName: 'i:0#.f|membership|john.doe@company.com',
  department: 'IT',
  jobTitle: 'Developer'
};

// Multiple users
const users: IPrincipal[] = [
  { id: '5', title: 'John Doe', email: 'john@company.com' },
  { id: '10', title: 'Jane Smith', email: 'jane@company.com' }
];
```

---

## Related Components

- **[SPLookupField](../SPLookupField/README.md)** - Lookup fields
- **[SPTaxonomyField](../SPTaxonomyField/README.md)** - Managed metadata fields
- **[SPChoiceField](../SPChoiceField/README.md)** - Choice fields

---

## Tree-Shaking

```typescript
//  RECOMMENDED
import { SPUserField } from 'spfx-toolkit/lib/components/spFields/SPUserField';

// L AVOID
import { SPUserField } from 'spfx-toolkit';
```

---

## License

Part of [SPFx Toolkit](../../../../README.md) - MIT License

---

**Last Updated:** November 2025
