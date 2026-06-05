# UserAccessAdmin

Admin surface for inspecting any user's access, comparing two users, and bulk-editing one user's group memberships across many groups.

## Import

```typescript
import { UserAccessAdmin } from 'spfx-toolkit/components/userAccess/UserAccessAdmin';
```

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `className` | `string` | no | — | Extra wrapper class |
| `title` | `string` | no | `'User Access'` | Header text |
| `managePermission` | `PermissionKind` | no | `PermissionKind.ManageWeb` | Permission required for Manage Groups tab; also gates Browse/Compare unless `allowBrowse` is set |
| `allowBrowse` | `boolean` | no | `false` | Opt non-admins into the Browse/Compare tabs |
| `onError` | `(e: UserAccessError) => void` | no | — | Callback on hook errors |

## Tab visibility

- **Browse / Compare:** visible iff `allowBrowse === true` OR current user has `managePermission`.
- **Manage groups:** always gated by `managePermission`, regardless of `allowBrowse`.
- If no tabs are accessible: shell renders with an inline "no access" message; the chrome stays so embedding layouts don't shift.

## Example

```tsx
import { PermissionKind } from '@pnp/sp/security';

<UserAccessAdmin
  managePermission={PermissionKind.ManageLists}
  allowBrowse={true}
/>
```

## Behavior

- Uses `useHasPermission(managePermission)` to gate tabs.
- Each tab is its own React component lazy-loaded only if it's rendered.
- ManageGroupsTab apply re-checks the permission server-side before dispatching writes.
