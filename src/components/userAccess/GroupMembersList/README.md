# GroupMembersList

Lists the members of a SharePoint group with optional search.

## Import

```typescript
import { GroupMembersList } from 'spfx-toolkit/components/userAccess/GroupMembersList';
```

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `groupRef` | `{ id?: number; name?: string }` | yes | — | Identifies the group (id preferred, name fallback) |
| `className` | `string` | no | — | Extra wrapper class |
| `showSearch` | `boolean` | no | `true` | Render the search box |
| `maxHeight` | `number \| string` | no | `400` | Container max height (scrolls overflow) |
| `onMemberClick` | `(userId: number) => void` | no | — | Click handler for a row |
| `emptyText` | `string` | no | `'No members.'` | Empty-state copy |

## Example

```tsx
<GroupMembersList groupRef={{ id: 5 }} />
<GroupMembersList groupRef={{ name: 'Site Owners' }} />
```

## Behavior

- Uses `useGroupMembers` to fetch (cached 5 min).
- Filters client-side by title, email, or login when the search box is non-empty.
- Each row renders `<UserPersona>` for the member.

See [the design spec](../../../../docs/superpowers/specs/2026-05-22-user-access-toolkit-design.md).
