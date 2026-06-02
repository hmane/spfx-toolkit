# SPNotificationBar

Renders active toast notifications as stacked Fluent UI `MessageBar`s. Subscribes to the notification store automatically — place it once near the root of your web part and call `notify()` from anywhere.

## Import

```ts
import { SPNotificationBar } from 'spfx-toolkit/lib/components/SPNotificationBar';
import { notify, dismiss, dismissAll } from 'spfx-toolkit/lib/utilities/notifications';
```

## Usage

```tsx
// In your web part render method:
<SPNotificationBar position="top" maxVisible={5} />

// Anywhere in your code — no prop drilling required:
import { notify } from 'spfx-toolkit/lib/utilities/notifications';

notify({ type: 'success', message: 'Item saved successfully.' });
notify({ type: 'error',   message: 'Failed to load data.' });       // sticky
notify({ type: 'warning', message: 'Draft auto-saved.' });
notify({ type: 'info',    message: 'Loading items...' });
```

## Props

| Prop         | Type                | Default | Description                                                                      |
|--------------|---------------------|---------|----------------------------------------------------------------------------------|
| `position`   | `'top' \| 'bottom'` | `'top'` | Where to anchor the stack — top or bottom of the viewport.                       |
| `maxVisible` | `number`            | `5`     | Max notifications shown at once. Older ones queue behind the most recent visible. |
| `className`  | `string`            | —       | Optional CSS class applied to the container element.                             |

## Behaviour

- Renders nothing when there are no active notifications.
- Each `MessageBar` includes a dismiss button (`aria-label="Dismiss notification"`).
- Dismissing a notification calls `dismiss(id)` on the store and cancels any pending auto-dismiss timer.
- The `maxVisible` cap shows the **most recent** N notifications; older ones are not lost and appear when newer ones are dismissed.

## Bundle impact

Lightweight: depends only on zustand (peer dep) and `@fluentui/react/lib/MessageBar` (subpath import). Safe to include in the light component barrel.
