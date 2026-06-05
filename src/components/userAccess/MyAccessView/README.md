# MyAccessView

Self-service "what can I see here?" view for the current user. Designed for UAT and landing pages — friendly voice, no admin actions.

## Import

```typescript
import { MyAccessView } from 'spfx-toolkit/components/userAccess/MyAccessView';
```

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `className` | `string` | no | — | Extra wrapper class |
| `title` | `string` | no | `'My Access'` | Header text |
| `showRefresh` | `boolean` | no | `true` | Show the refresh button |
| `onError` | `(e: UserAccessError) => void` | no | — | Callback on hook errors |

## Example

```tsx
<MyAccessView />
```

## Behavior

- Loads Level 1 on mount via `useUserAccess('current')`.
- Drill-down: pick a list → Level 2; enter an item ID → Level 3.
- Wrapped in `<ErrorBoundary>` internally.
