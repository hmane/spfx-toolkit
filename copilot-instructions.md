# Copilot Instructions - SPFx Toolkit

> **For AI Assistants**: This file contains essential rules for working with this codebase. For comprehensive documentation, see `CLAUDE.md`.

---

## Quick Facts

- **What**: SPFx component library (NOT a web part) - consumed by other SPFx projects
- **Bundle size is CRITICAL** - Always use tree-shakable imports
- **SPFx version**: >= 1.21.1
- **React version**: 17.x (functional components only)

---

## Critical Rules

### 1. ZERO Runtime Dependencies

**Only use the exact peer dependencies listed in package.json:**

```
@fluentui/react@8.106.4
@pnp/spfx-controls-react@^3.22.0
@pnp/logging@^4.16.0
@pnp/sp@^3.20.1
@pnp/queryable@^3.20.1
react@^17.0.1
react-dom@^17.0.1
devextreme@^22.2.3
devextreme-react@^22.2.3
react-hook-form@^7.45.4
zustand@^4.3.9
```

**NEVER add**: lodash, moment, date-fns, axios, styled-components, or ANY other package.

### 2. Import Patterns

**In source code (this library) - Use RELATIVE imports:**
```typescript
// ✅ CORRECT
import { IComponentProps } from './ComponentName.types';
import { SPContext } from '../../utilities/context';

// ❌ WRONG - No path aliases
import { IComponentProps } from '@/components/ComponentName.types';
```

**Fluent UI - Use tree-shakable imports:**
```typescript
// ✅ CORRECT - Saves 200-500KB+
import { Button } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';
import { Stack } from '@fluentui/react/lib/Stack';

// ❌ WRONG - Imports entire library
import { Button, TextField, Stack } from '@fluentui/react';
```

### 3. SPContext Must Be Initialized First

```typescript
// In consuming web part's onInit():
await SPContext.smart(this.context, 'MyWebPart');

// Then use anywhere:
SPContext.sp.web.lists.getByTitle('MyList').items();
SPContext.logger.info('Message');
```

---

## Component Development

### Required Patterns

1. **Functional components** with hooks (no class components)
2. **TypeScript interfaces** for all props
3. **CSS modules** or scoped styles
4. **Memoization** for expensive operations
5. **Error boundaries** for graceful error handling

### Standard Structure

```
ComponentName/
├── ComponentName.tsx        # Main component
├── ComponentName.types.ts   # TypeScript interfaces
├── ComponentName.css        # Scoped styles
├── index.ts                 # Exports
└── README.md               # Documentation
```

### Async Safety Patterns

Always use `isMountedRef` or `requestIdRef` for async operations:

```typescript
// Pattern 1: isMountedRef
const isMountedRef = useRef(true);
useEffect(() => {
  return () => { isMountedRef.current = false; };
}, []);

// In async callback:
if (isMountedRef.current) {
  setState(result);
}

// Pattern 2: Request versioning (for rapid prop changes)
const requestIdRef = useRef(0);
useEffect(() => {
  const currentRequestId = ++requestIdRef.current;

  fetchData().then(result => {
    if (currentRequestId === requestIdRef.current) {
      setState(result);
    }
  });
}, [dependency]);
```

### Logging

Use `SPContext.logger` instead of `console.log/warn/error`:

```typescript
SPContext.logger.info('Message', { data });
SPContext.logger.warn('Warning', { context });
SPContext.logger.error('Error', error, { context });
```

---

## Build Commands

```bash
npm run build      # Build TypeScript + copy assets
npm run validate   # Validate build output
npm run watch      # Development mode
npm run clean      # Clean build output
```

---

## Key Components

| Component | Purpose | Import Path |
|-----------|---------|-------------|
| Card | Expandable containers | `spfx-toolkit/lib/components/Card` |
| UserPersona | User profile display | `spfx-toolkit/lib/components/UserPersona` |
| WorkflowStepper | Process flow UI | `spfx-toolkit/lib/components/WorkflowStepper` |
| ManageAccess | Permission management | `spfx-toolkit/lib/components/ManageAccess` |
| VersionHistory | Document versions | `spfx-toolkit/lib/components/VersionHistory` |
| ConflictDetector | Concurrent editing | `spfx-toolkit/lib/components/ConflictDetector` |
| GroupViewer | SharePoint groups | `spfx-toolkit/lib/components/GroupViewer` |
| ErrorBoundary | Error handling | `spfx-toolkit/lib/components/ErrorBoundary` |

## Key Utilities

| Utility | Purpose |
|---------|---------|
| `SPContext` | SPFx context management, PnP instances, logging |
| `BatchBuilder` | Batch SharePoint operations |
| `PermissionHelper` | Permission validation |
| `ListItemHelper` | Field extraction/updates |

---

## Common Mistakes to Avoid

1. **Don't add npm packages** - Build custom solutions with existing peer deps
2. **Don't use path aliases** - Use relative imports only
3. **Don't bulk import Fluent UI** - Use `/lib/` paths
4. **Don't forget SPContext init** - Must be called before using components
5. **Don't use console.log** - Use `SPContext.logger`
6. **Don't mutate DOM directly** - Use React state
7. **Don't ignore async cleanup** - Use `isMountedRef` or `requestIdRef`

---

## Validation Checklist

Before committing:

- [ ] `npm run build` passes
- [ ] `npm run validate` passes
- [ ] No new dependencies added to package.json
- [ ] Using relative imports (no path aliases)
- [ ] Fluent UI imports are tree-shakable
- [ ] Async operations have cleanup patterns
- [ ] Using `SPContext.logger` instead of console

---

*Last Updated: January 2026*
*For detailed documentation, see `CLAUDE.md`*
