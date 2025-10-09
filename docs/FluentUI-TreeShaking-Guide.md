# Fluent UI Tree-Shaking Import Guide

This document provides the correct import paths for Fluent UI React components to ensure optimal tree-shaking and minimal bundle sizes.

## ✅ Tree-Shakable Import Patterns

### Buttons

```typescript
import {
  DefaultButton,
  PrimaryButton,
  ActionButton,
  IconButton,
  CommandBarButton,
  CompoundButton,
} from '@fluentui/react/lib/Button';
import { MessageBarButton } from '@fluentui/react/lib/Button'; // Note: MessageBarButton is also in Button
```

### Text and Typography

```typescript
import { Text } from '@fluentui/react/lib/Text';
import { Label } from '@fluentui/react/lib/Label';
import { Link } from '@fluentui/react/lib/Link';
```

### Icons

```typescript
import { Icon } from '@fluentui/react/lib/Icon';
import { FontIcon } from '@fluentui/react/lib/Icon';
```

### Layout Components

```typescript
import { Stack } from '@fluentui/react/lib/Stack';
import { Separator } from '@fluentui/react/lib/Separator';
```

### Form Controls

```typescript
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { Slider } from '@fluentui/react/lib/Slider';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { ComboBox } from '@fluentui/react/lib/ComboBox';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
```

### Feedback and Progress

```typescript
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
```

### Overlays and Surfaces

```typescript
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { Modal } from '@fluentui/react/lib/Modal';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { TeachingBubble } from '@fluentui/react/lib/TeachingBubble';
```

### Lists and Tables

```typescript
import { DetailsList, DetailsListLayoutMode, SelectionMode } from '@fluentui/react/lib/DetailsList';
import { List } from '@fluentui/react/lib/List';
```

### People and Personas

```typescript
import { Persona, PersonaSize, PersonaInitialsColor } from '@fluentui/react/lib/Persona';
import { Facepile } from '@fluentui/react/lib/Facepile';
```

### Navigation

```typescript
import { Nav } from '@fluentui/react/lib/Nav';
import { Breadcrumb } from '@fluentui/react/lib/Breadcrumb';
import { CommandBar } from '@fluentui/react/lib/CommandBar';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
```

### Theming and Styling

```typescript
import { useTheme, ITheme } from '@fluentui/react/lib/Theme';
import { mergeStyles, mergeStyleSets } from '@fluentui/react/lib/Styling';
import { getTheme } from '@fluentui/react/lib/Styling';
```

### Utilities

```typescript
import { FocusZone } from '@fluentui/react/lib/FocusZone';
import { Image } from '@fluentui/react/lib/Image';
```

## ❌ Avoid These Import Patterns

```typescript
// DON'T: Bulk imports from main package
import { Button, TextField, Icon } from '@fluentui/react';

// DON'T: Importing from index
import { Button } from '@fluentui/react/lib';
```

## Bundle Size Impact

Using tree-shakable imports can reduce your SPFx bundle size by:

- **200-500KB** for typical components
- **1MB+** for components using many Fluent UI controls
- **Faster load times** due to smaller bundles
- **Better performance** on slower connections

## Quick Migration Script

To quickly convert existing imports, you can use this regex find/replace:

**Find:** `import \{([^}]+)\} from '@fluentui/react';`
**Replace:** Split each import based on the component mapping above.

## Verification

After optimizing imports:

1. Run `npm run build` to ensure no compilation errors
2. Check bundle size with `gulp bundle --ship` in your SPFx project
3. Verify components still render correctly
4. Test functionality to ensure no missing dependencies

## Common Issues

### Missing exports

If you get "has no exported member" errors:

- Check if the component is in a different path
- Some components like `MessageBarButton` are in `/lib/Button` not `/lib/MessageBar`
- `useTheme` is in `/lib/Theme` not `/lib/Styling`

### Runtime errors

If components fail at runtime:

- Ensure all dependent interfaces are imported (e.g., `IDropdownOption`)
- Check that enum values are imported (e.g., `MessageBarType`, `PersonaSize`)
