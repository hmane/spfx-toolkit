# GroupUsersPicker Component

A DevExtreme-based user picker component that loads users from a SharePoint group. Automatically switches between SelectBox (single selection) and TagBox (multi-selection) based on `maxUserCount`.

## Features

- 🎯 **Auto-detect selection mode** - SelectBox for single, TagBox for multiple
- 👥 **Group-based user loading** - Fetch users from SharePoint groups
- 🖼️ **Photo support** - Displays user photos with initials fallback
- ⚡ **Async ensureUser** - Non-blocking user validation
- 🔄 **Cache control** - Use fresh data (spPessimistic) or cached data (spCached)
- 🎨 **Custom rendering** - Customize item display templates
- ♿ **Accessible** - WCAG 2.1 AA compliant
- 📱 **Responsive** - Works on all screen sizes
- 🎣 **React Hook Form** - Full RHF integration available

## Installation

```typescript
// Standalone component
import { GroupUsersPicker } from 'spfx-toolkit/lib/components/GroupUsersPicker';

// React Hook Form version
import { GroupUsersPicker } from 'spfx-toolkit/lib/components/spForm/customComponents/GroupUsersPicker';
```

## Usage

### Basic Example (Standalone)

```typescript
import * as React from 'react';
import { GroupUsersPicker } from 'spfx-toolkit/lib/components/GroupUsersPicker';
import type { IGroupUser } from 'spfx-toolkit/lib/components/GroupUsersPicker';

const MyComponent: React.FC = () => {
  const [selectedUsers, setSelectedUsers] = React.useState<IGroupUser[]>([]);

  return (
    <GroupUsersPicker
      groupName="Approvers"
      maxUserCount={3}
      label="Select Approvers"
      selectedUsers={selectedUsers}
      onChange={(users) => setSelectedUsers(users)}
      ensureUser={true}
      required={true}
    />
  );
};
```

### Single Selection Example

```typescript
<GroupUsersPicker
  groupName="Project Managers"
  maxUserCount={1}
  label="Select Project Manager"
  placeholder="Choose a project manager..."
  selectedUsers={selectedManager ? [selectedManager] : []}
  onChange={(users) => setSelectedManager(users[0])}
/>
```

### React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GroupUsersPicker } from 'spfx-toolkit/lib/components/spForm/customComponents/GroupUsersPicker';

// Define schema
const schema = z.object({
  approvers: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]),
        text: z.string(),
        secondaryText: z.string().optional(),
      })
    )
    .min(1, 'At least one approver is required')
    .max(3, 'Maximum 3 approvers allowed'),
  reviewer: z
    .array(z.any())
    .min(1, 'Reviewer is required'),
});

type FormData = z.infer<typeof schema>;

const MyForm: React.FC = () => {
  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      approvers: [],
      reviewer: [],
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('Form data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Multi-select */}
      <GroupUsersPicker
        name="approvers"
        control={control}
        groupName="Approvers"
        maxUserCount={3}
        label="Select Approvers (1-3)"
        rules={{
          required: 'At least one approver is required',
        }}
        ensureUser={true}
      />

      {/* Single-select */}
      <GroupUsersPicker
        name="reviewer"
        control={control}
        groupName="Reviewers"
        maxUserCount={1}
        label="Select Reviewer"
        ensureUser={true}
      />

      <button type="submit">Submit</button>
    </form>
  );
};
```

### Custom Item Rendering

```typescript
<GroupUsersPicker
  groupName="Team Members"
  maxUserCount={5}
  label="Select Team Members"
  itemRender={(user) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <strong>{user.text}</strong>
      <span style={{ color: '#666', fontSize: 12 }}>
        ({user.secondaryText})
      </span>
    </div>
  )}
/>
```

### With Cache Control

```typescript
// Use cached data (faster, may be stale)
<GroupUsersPicker
  groupName="All Employees"
  maxUserCount={10}
  useCache={true}
/>

// Use fresh data (default, slower but always current)
<GroupUsersPicker
  groupName="All Employees"
  maxUserCount={10}
  useCache={false}
/>
```

## Props

### IGroupUsersPickerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `groupName` | `string` | **Required** | SharePoint group name to load users from |
| `maxUserCount` | `number` | **Required** | Max users to select (1 = SelectBox, >1 = TagBox) |
| `selectedUsers` | `IGroupUser[]` | `[]` | Pre-selected users |
| `ensureUser` | `boolean` | `false` | Call ensureUser for selected users (async) |
| `label` | `string` | - | Label text |
| `placeholder` | `string` | `'Select user(s)...'` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable the picker |
| `required` | `boolean` | `false` | Mark as required field |
| `onChange` | `(items: IGroupUser[]) => void` | - | Selection change callback |
| `onBlur` | `() => void` | - | Blur event callback |
| `className` | `string` | - | Custom CSS class |
| `errorMessage` | `string` | - | Error message to display |
| `showClearButton` | `boolean` | `true` | Show clear selection button |
| `itemRender` | `(item: IGroupUser) => ReactNode` | Default template | Custom item renderer |
| `useCache` | `boolean` | `false` | Use cached data (true = spCached, false = spPessimistic) |

### IRHFGroupUsersPickerProps

Same as `IGroupUsersPickerProps` but adds:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | **Required** | Field name for React Hook Form |
| `control` | `Control<any>` | **Required** | React Hook Form control |
| `rules` | `RegisterOptions` | - | RHF validation rules |

## IGroupUser Interface

```typescript
interface IGroupUser {
  id: string | number;          // User ID
  text: string;                 // Display name
  secondaryText?: string;       // Email address
  imageUrl?: string;            // Photo URL
  loginName?: string;           // Login name for ensureUser
  imageInitials?: string;       // Fallback initials
  initialsColor?: number;       // Initials background color
}
```

## Advanced Examples

### Pre-selection with Default Values

```typescript
const MyComponent: React.FC = () => {
  const [users, setUsers] = React.useState<IGroupUser[]>([
    {
      id: 123,
      text: 'John Doe',
      secondaryText: 'john.doe@contoso.com',
      loginName: 'i:0#.f|membership|john.doe@contoso.com',
    },
  ]);

  return (
    <GroupUsersPicker
      groupName="Developers"
      maxUserCount={5}
      selectedUsers={users}
      onChange={setUsers}
    />
  );
};
```

### Error Handling

```typescript
<GroupUsersPicker
  groupName="Non-Existent Group"
  maxUserCount={1}
  // Error will be displayed automatically:
  // "Group 'Non-Existent Group' does not exist or you don't have permission to access it."
/>
```

### Dynamic Group Selection

```typescript
const [groupName, setGroupName] = React.useState('Approvers');
const [users, setUsers] = React.useState<IGroupUser[]>([]);

return (
  <>
    <Dropdown
      options={[
        { key: 'Approvers', text: 'Approvers' },
        { key: 'Reviewers', text: 'Reviewers' },
      ]}
      selectedKey={groupName}
      onChange={(_, option) => {
        setGroupName(option.key as string);
        setUsers([]); // Clear selection when group changes
      }}
    />

    <GroupUsersPicker
      groupName={groupName}
      maxUserCount={3}
      selectedUsers={users}
      onChange={setUsers}
    />
  </>
);
```

## Hooks

### useGroupUsers

Custom hook to fetch users from a SharePoint group.

```typescript
import { useGroupUsers } from 'spfx-toolkit/lib/components/GroupUsersPicker';

const MyComponent: React.FC = () => {
  const { users, loading, error, retry } = useGroupUsers('Approvers', false);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.text}</li>
      ))}
    </ul>
  );
};
```

## Utilities

### ensureUsers

Asynchronously ensures users exist in SharePoint without blocking UI.

```typescript
import { ensureUsers } from 'spfx-toolkit/lib/components/GroupUsersPicker';

// Fire-and-forget
ensureUsers(selectedUsers);

// With callback
import { ensureUsersWithCallback } from 'spfx-toolkit/lib/components/GroupUsersPicker';

await ensureUsersWithCallback(selectedUsers, (success) => {
  if (success) {
    console.log('All users ensured!');
  }
});
```

## Styling

The component uses CSS classes that can be customized:

```css
/* Container */
.group-users-picker { }

/* Control (SelectBox or TagBox) */
.group-users-picker-control { }

/* Item template */
.group-users-picker-item { }
.group-users-picker-avatar { }
.group-users-picker-photo { }
.group-users-picker-initials { }
.group-users-picker-text { }
.group-users-picker-name { }
.group-users-picker-email { }

/* States */
.group-users-picker-loading { }
.group-users-picker-error { }
```

## Accessibility

- ✅ Keyboard navigation (Tab, Arrow keys, Enter, Escape)
- ✅ Screen reader support
- ✅ ARIA labels and roles
- ✅ Focus management
- ✅ High contrast mode support

## Performance

- **Bundle Size**: ~45KB (base) + DevExtreme SelectBox/TagBox
- **Initial Load**: Fetches group users on mount
- **Caching**: Optional (useCache prop)
- **Async ensureUser**: Non-blocking, runs in background

## Troubleshooting

### "Group does not exist" error

```typescript
// Check group name spelling and user permissions
<GroupUsersPicker groupName="Exact Group Name" {...props} />
```

### Users not loading

```typescript
// Use retry button in error message or check SPContext initialization
await SPContext.smart(this.context, 'MyWebPart');
```

### Photos not showing

```typescript
// Check if users have profile photos uploaded
// Initials will be shown as fallback automatically
```

### ensureUser not working

```typescript
// Ensure loginName is populated in IGroupUser
// Check browser console for errors
```

## Related Components

- [**UserPersona**](../UserPersona/README.md) - Display single user with photo
- [**PeoplePicker**](../spForm/PnPControls/README.md) - Search-based people picker
- [**ManageAccess**](../ManageAccess/README.md) - Permission management UI

## License

Part of SPFx Toolkit - MIT License
