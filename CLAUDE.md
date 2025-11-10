# CLAUDE.md - SPFx Toolkit Development Guide

This file provides comprehensive guidance for Claude Code (claude.ai/code) when working with this repository. It should be used as the primary reference for understanding the project structure, patterns, and best practices. General AI assistants (Copilot, ChatGPT, etc.) should load `copilot-instructions.md`, which mirrors the same constraints in a condensed form.

## 📋 Quick Reference for New Sessions

### Essential Context

1. **This is an SPFx LIBRARY, not a web part** - It gets consumed by other SPFx projects
2. **Bundle size is CRITICAL** - Always use tree-shakable imports
3. **ZERO runtime dependencies allowed** - Only use the exact peer dependencies listed in package.json
4. **SPContext must be initialized** before using any components
5. **All components are React functional components** with TypeScript
6. **Tree-shaking is mandatory** - Use specific import paths
7. **NO path aliases in source code** - Use relative imports only (e.g., `'./ComponentName'`, `'../utilities/helper'`)
8. **NO additional npm packages** - Build custom solutions with existing peer dependencies
9. **AI Context** - Keep `copilot-instructions.md` aligned with any new standards so all assistants share the same guidance.

### Current Project State

- **Main focus**: React components for SharePoint scenarios
- **Architecture**: Tree-shakable modules with `/lib/` subpaths
- **Build system**: Gulp + TypeScript compilation
- **Recent additions**: Comprehensive documentation, tree-shaking optimizations

---

## 🚀 Project Overview

**SPFx Toolkit** is a production-ready library of reusable components, hooks, and utilities for SharePoint Framework (SPFx) >= 1.21.1. It provides tree-shakable exports optimized for minimal bundle sizes in SPFx web parts.

### 🎯 Core Mission

- **Tree-shakable architecture** - Import only what you need for minimal bundle sizes
- **SPFx-first design** - Built specifically for SharePoint Framework constraints
- **Zero runtime dependencies** - Only peer dependencies to avoid version conflicts
- **Production-ready** - Battle-tested components with comprehensive error handling
- **Developer experience** - Full TypeScript support with comprehensive documentation

---

## 🚨 CRITICAL RULES

### ⛔ ABSOLUTE RESTRICTION: Zero Runtime Dependencies

**This toolkit MUST NOT introduce ANY runtime dependencies beyond the specified peer dependencies.** This is a hard requirement to:

1. **Prevent version conflicts** in consuming SPFx projects
2. **Minimize bundle size** - No additional packages to bloat bundles
3. **Maintain compatibility** - SPFx projects control all dependency versions
4. **Avoid dependency hell** - No transitive dependency conflicts

### ✅ ALLOWED: Only Peer Dependencies

**The ONLY packages that can be used are the exact peer dependencies listed in package.json:**

- `@fluentui/react@8.106.4` - UI components (tree-shakable imports only)
- `@pnp/spfx-controls-react@^3.22.0` - PnP SPFx controls
- `@pnp/logging@^4.16.0` - Logging framework
- `@pnp/sp@^3.20.1` - SharePoint API operations
- `@pnp/queryable@^3.20.1` - PnP queryable base
- `react@^17.0.1` - React framework
- `react-dom@^17.0.1` - React DOM rendering
- `devextreme@^22.2.3` - DevExtreme components
- `devextreme-react@^22.2.3` - DevExtreme React wrappers
- `react-hook-form@^7.45.4` - Form management
- `zustand@^4.3.9` - State management

### ❌ FORBIDDEN: Any Additional Packages

**DO NOT suggest, install, or use any packages not in the peer dependencies list, including:**

- Utility libraries (lodash, ramda, etc.)
- Date libraries (moment, date-fns, etc.)
- HTTP clients (axios, fetch polyfills, etc.)
- Animation libraries (framer-motion, react-spring, etc.)
- Icon libraries (react-icons, etc.)
- CSS-in-JS libraries (styled-components, emotion, etc.)
- Any other npm packages not explicitly listed

### 🛠️ Implementation Guidelines

1. **Use native JavaScript/TypeScript** for utilities instead of external libraries
2. **Leverage existing peer dependencies** for functionality (e.g., PnP for HTTP, Fluent UI for icons)
3. **Build custom implementations** rather than adding dependencies
4. **Tree-shake from allowed dependencies** to minimize bundle impact
5. **Verify package.json** has zero dependencies and only the specified peerDependencies
6. **Use relative imports in source code** - NO path aliases (tsconfig paths are for consuming projects only)

### 🔍 Validation Process

Before adding any functionality:

1. Check if it can be implemented with existing peer dependencies
2. Implement custom solution using native JS/TS if needed
3. Never suggest adding new dependencies
4. Always verify `npm ls` shows zero dependencies

### 🎯 Import Paths - CRITICAL

**In source code (this library):**
```typescript
// ✅ CORRECT: Use relative imports
import { IComponentProps } from './ComponentName.types';
import { HelperUtility } from '../utilities/helper';
import { SPContext } from '../../utilities/context';

// ❌ WRONG: NO path aliases in source
import { IComponentProps } from '@/components/ComponentName.types';
import { HelperUtility } from '@utilities/helper';
```

**In consuming projects:**
```typescript
// ✅ CORRECT: Use package imports
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';

// ❌ AVOID: Main package import (imports everything)
import { Card } from 'spfx-toolkit';
```

---

## 🏛️ Architecture Overview

### 📁 Source Structure

```
src/
├── components/                 # React components (tree-shakable)
│   ├── Card/                  # Expandable content containers
│   ├── UserPersona/           # User profile display
│   ├── WorkflowStepper/       # Process flow visualization
│   ├── ManageAccess/          # Permission management
│   ├── VersionHistory/        # Document version tracking
│   ├── ConflictDetector/      # Concurrent editing protection
│   ├── GroupViewer/           # SharePoint group display
│   ├── ErrorBoundary/         # Error handling wrapper
│   └── spForm/                # Form component suite
├── hooks/                     # Reusable React hooks
│   ├── useLocalStorage.ts    # Persistent state
│   ├── useViewport.ts        # Responsive breakpoints
│   └── index.ts              # Hook exports
├── utilities/                 # Helper utilities
│   ├── context/              # SPFx context management
│   ├── batchBuilder/         # SharePoint batch operations
│   ├── permissionHelper/     # Permission validation
│   ├── listItemHelper/       # Field extraction/updates
│   ├── stringUtils/          # String manipulation
│   ├── dateUtils/            # Date operations
│   └── CssLoader.ts          # CSS loading utility
├── types/                     # Global TypeScript definitions
│   ├── css-modules.d.ts      # CSS import declarations
│   └── *.ts                  # Type exports
└── index.ts                   # Main library exports
```

### 🎯 Tree-Shaking Strategy

**Critical**: The library is designed for **optimal bundle sizes** through aggressive tree-shaking:

```typescript
// ✅ RECOMMENDED: Direct imports for minimal bundle size
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';

// ✅ GOOD: Category imports for multiple related items
import { Card } from 'spfx-toolkit/lib/components/Card';
import { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';

// ❌ AVOID: Main package import (imports everything ~2MB+)
import { Card } from 'spfx-toolkit';
```

**Package.json exports configuration**:

- `.` → Main index with all exports (use sparingly)
- `./lib/components/*` → Individual components
- `./lib/hooks/*` → Individual hooks
- `./lib/utilities/*` → Individual utilities
- `./components` → All components bundle
- `./hooks` → All hooks bundle
- `./utils` → All utilities bundle

---

## 🎨 Component Library Overview

### 📦 Available Components

| Component                                                  | Purpose                       | Bundle Impact | Key Features                              |
| ---------------------------------------------------------- | ----------------------------- | ------------- | ----------------------------------------- |
| [**Card**](./src/components/Card/)                         | Expandable content containers | Low           | Animations, persistence, accessibility    |
| [**UserPersona**](./src/components/UserPersona/)           | User profile display          | Low           | Auto-fetching, photo loading, LivePersona |
| [**WorkflowStepper**](./src/components/WorkflowStepper/)   | Process flow visualization    | Medium        | Arrow design, responsive, keyboard nav    |
| [**ManageAccess**](./src/components/ManageAccess/)         | SharePoint permission UI      | High          | People picker, permission levels          |
| [**VersionHistory**](./src/components/VersionHistory/)     | Document version tracking     | High          | DevExtreme popup, field comparisons       |
| [**ConflictDetector**](./src/components/ConflictDetector/) | Concurrent editing protection | Medium        | Real-time detection, conflict resolution  |
| [**GroupViewer**](./src/components/GroupViewer/)           | SharePoint group display      | Low           | Rich tooltips, caching                    |
| [**ErrorBoundary**](./src/components/ErrorBoundary/)       | Error handling wrapper        | Low           | Retry functionality, logging              |
| [**spForm**](./src/components/spForm/)                     | Form component suite          | Variable      | DevExtreme integration                    |

### 🎣 Custom Hooks

| Hook                   | Purpose                    | Usage Pattern                    |
| ---------------------- | -------------------------- | -------------------------------- |
| `useLocalStorage`      | Persistent state           | Settings, preferences, form data |
| `useViewport`          | Responsive breakpoints     | Mobile/desktop layouts           |
| `useCardController`    | Programmatic card control  | External card state management   |
| `useConflictDetection` | Conflict monitoring        | Form applications                |
| `useErrorHandler`      | Error boundary integration | Component error handling         |

### 🛠️ Core Utilities

| Utility                                                   | Purpose                     | Key Methods                                |
| --------------------------------------------------------- | --------------------------- | ------------------------------------------ |
| [**SPContext**](./src/utilities/context/)                 | SPFx context management     | `.smart()`, `.sp`, `.logger`               |
| [**BatchBuilder**](./src/utilities/batchBuilder/)         | Batch SharePoint operations | `.list()`, `.execute()`                    |
| [**PermissionHelper**](./src/utilities/permissionHelper/) | Permission validation       | `.checkPermissions()`, `.validateAccess()` |
| [**ListItemHelper**](./src/utilities/listItemHelper/)     | Field extraction/updates    | `createSPExtractor()`, `createSPUpdater()` |
| [**StringUtils**](./src/utilities/stringUtils/)           | String manipulation         | `.getFileName()`, `.getInitials()`         |
| [**DateUtils**](./src/utilities/dateUtils/)               | Date operations             | `.formatDate()`, `.getRelativeTime()`      |

---

## 🧠 SPFx Context Management

The **SPContext** system is the **foundation** for all SharePoint operations.

### 🔧 Core Architecture

1. **Lazy initialization** with environment detection (dev/prod/teams)
2. **Multiple PnP instances** with different caching strategies:
   - `sp` - Default PnP instance with standard caching
   - `spCached` - Memory-cached instance for frequently accessed data
   - `spPessimistic` - No-cache instance for always-fresh data
3. **Built-in modules** (pluggable architecture):
   - Cache (memory/storage strategies)
   - Logger (console/performance tracking)
   - HTTP client (with auth and retries)
   - Performance tracker
   - PeoplePickerContext (for @pnp/spfx-controls-react)

### 🚀 Initialization Patterns (CRITICAL)

```typescript
// 🎯 RECOMMENDED: Smart initialization (auto-detects environment)
const ctx = await SPContext.smart(this.context, 'MyWebPart');

// 📋 Preset configurations for different scenarios
const ctx = await SPContext.basic(this.context, 'MyWebPart'); // Simple setup
const ctx = await SPContext.production(this.context, 'MyWebPart'); // Optimized for prod
const ctx = await SPContext.development(this.context, 'MyWebPart'); // Verbose logging
const ctx = await SPContext.teams(this.context, 'MyWebPart'); // Teams-optimized

// 🔍 Access anywhere after initialization (static access)
SPContext.sp.web.lists.getByTitle('MyList').items();
SPContext.webAbsoluteUrl;
SPContext.currentUser;
SPContext.logger.info('Message', data);
```

### 🌐 Multi-Site Connectivity (NEW)

**SPContext now supports connecting to multiple SharePoint sites!**

```typescript
// 1. Initialize primary context
await SPContext.smart(this.context, 'MyWebPart');

// 2. Connect to other sites
await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', {
  alias: 'hr',
  cache: { strategy: 'memory', ttl: 300000 }
});

// 3. Use connected sites
const hrSite = SPContext.sites.get('hr');
const employees = await hrSite.sp.web.lists.getByTitle('Employees').items();

// 4. Each site has its own PnP instances
hrSite.sp                    // Standard instance
hrSite.spCached              // Cached instance
hrSite.spPessimistic         // No-cache instance

// 5. Site properties available
hrSite.webAbsoluteUrl        // Full URL
hrSite.webTitle              // Site title
hrSite.webId                 // GUID

// 6. Clean up when done
SPContext.sites.remove('hr');
```

**Multi-Site API Methods:**
- `SPContext.sites.add(url, config?)` - Connect to another site
- `SPContext.sites.get(urlOrAlias)` - Get site context
- `SPContext.sites.remove(urlOrAlias)` - Disconnect from site
- `SPContext.sites.list()` - List all connected sites
- `SPContext.sites.has(urlOrAlias)` - Check if site is connected

**Common Patterns:**

```typescript
// Cross-site data aggregation
await Promise.all([
  SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', { alias: 'hr' }),
  SPContext.sites.add('https://contoso.sharepoint.com/sites/finance', { alias: 'finance' })
]);

const [hrData, financeData] = await Promise.all([
  SPContext.sites.get('hr').sp.web.lists.getByTitle('Tasks').items(),
  SPContext.sites.get('finance').sp.web.lists.getByTitle('Budgets').items()
]);

// Hub site configuration pattern
await SPContext.sites.add('https://contoso.sharepoint.com/sites/hub', {
  alias: 'hub',
  cache: { strategy: 'storage', ttl: 3600000 } // 1 hour
});

const hubConfig = await SPContext.sites.get('hub').sp.web.lists
  .getByTitle('HubConfiguration')
  .items.getById(1)();

// Safe connection with error handling
try {
  await SPContext.sites.add('https://contoso.sharepoint.com/sites/restricted');
} catch (error) {
  if (error.message.includes('403')) {
    // Access denied
  } else if (error.message.includes('404')) {
    // Site not found
  }
}
```

**Documentation:** See [Multi-Site Connectivity Guide](./src/utilities/context/MULTI-SITE-GUIDE.md)

---

## 🎨 Development Patterns & Best Practices

### 🧩 Component Development Guidelines

#### ✅ Required Patterns

1. **Functional components** with hooks (no class components)
2. **TypeScript interfaces** for all props and state
3. **Tree-shakable exports** from index.ts
4. **CSS modules** or scoped styles (avoid global styles)
5. **Accessibility** - WCAG 2.1 AA compliance
6. **Performance** - Memoization, lazy loading where appropriate
7. **Error boundaries** - Graceful error handling
8. **Documentation** - Comprehensive README.md
9. **Relative imports** - NO path aliases in source code

#### 📁 Standard Component Structure

```typescript
// ComponentName/index.ts - Main exports
export { ComponentName } from './ComponentName';
export type { IComponentNameProps } from './ComponentName.types';
export * from './hooks'; // If component has custom hooks
export * from './utils'; // If component has utilities

// ComponentName/ComponentName.types.ts - Type definitions
export interface IComponentNameProps {
  title: string;
  onAction?: () => void;
  className?: string;
  // ... other props with proper JSDoc
}

// ComponentName/ComponentName.tsx - Main component
import * as React from 'react';
import { IComponentNameProps } from './ComponentName.types';
import './ComponentName.css';

export const ComponentName: React.FC<IComponentNameProps> = ({ title, onAction, className }) => {
  // Hooks at the top
  const [state, setState] = React.useState<string>('');

  // Event handlers (memoized)
  const handleClick = React.useCallback(() => {
    onAction?.();
  }, [onAction]);

  // Render
  return <div className={className}>{title}</div>;
};
```

### 🚨 Error Handling Patterns

```typescript
// ✅ Use custom error classes
import { PermissionError, PermissionLevel } from '../utilities/permissionHelper';

throw new PermissionError('Access denied', {
  level: PermissionLevel.Edit,
  resource: 'list-item',
  itemId: 123,
});

// ✅ Async functions with proper error handling
try {
  const result = await operation();
  SPContext.logger.success('Operation completed', { result });
  return result;
} catch (error) {
  SPContext.logger.error('Operation failed', error, { context: 'additional-data' });
  throw error; // Re-throw if caller needs to handle
}

// ✅ Component error boundaries
<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <MyComponent />
</ErrorBoundary>;
```

---

## ⚡ Common Commands & Workflows

### 🔨 Build & Development

```bash
# Clean build output
npm run clean

# Build TypeScript and copy assets
npm run build

# Build with package.json in lib/ (for debugging)
npm run build:full

# Watch mode for development
npm run watch

# Type checking without emitting
npm run type-check

# Validate build output
npm run validate
```

### 📦 Versioning

```bash
# Alpha releases (1.0.0-alpha.1, 1.0.0-alpha.2, etc.)
npm run version:alpha

# Beta releases
npm run version:beta

# Production releases
npm run version:patch    # 1.0.0 -> 1.0.1
npm run version:minor    # 1.0.0 -> 1.1.0
npm run version:major    # 1.0.0 -> 2.0.0
```

### 🚀 Publishing

```bash
# Publish alpha version
npm run publish:alpha

# Publish beta version
npm run publish:beta

# Publish production version
npm run publish:latest

# Note: prepublishOnly automatically runs build and validate
```

### 🏗️ Using Gulp Directly

```bash
# All npm scripts use Gulp under the hood
gulp clean
gulp build
gulp watch
gulp validate
gulp buildWithPackageJson
```

---

## 📚 Import Patterns for SPFx Compatibility

### Fluent UI React Tree-Shaking (CRITICAL for Bundle Size)

**Always use specific imports from Fluent UI React** to minimize bundle size:

```typescript
// ✅ EXCELLENT: Tree-shakable imports (saves 200-500KB+)
import { Button } from '@fluentui/react/lib/Button';
import { TextField } from '@fluentui/react/lib/TextField';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { useTheme } from '@fluentui/react/lib/Theme';
import { mergeStyles } from '@fluentui/react/lib/Styling';

// ❌ AVOID: Bulk imports (imports entire Fluent UI library)
import { Button, TextField, Icon } from '@fluentui/react';
```

**Common Fluent UI Import Paths:**

- Buttons: `@fluentui/react/lib/Button`
- Text/Typography: `@fluentui/react/lib/Text`
- Icons: `@fluentui/react/lib/Icon`
- Layout: `@fluentui/react/lib/Stack`
- Forms: `@fluentui/react/lib/TextField`, `@fluentui/react/lib/Dropdown`
- Feedback: `@fluentui/react/lib/MessageBar`, `@fluentui/react/lib/Spinner`
- Overlays: `@fluentui/react/lib/Panel`, `@fluentui/react/lib/Dialog`, `@fluentui/react/lib/Tooltip`
- Personas: `@fluentui/react/lib/Persona`
- Theme/Styling: `@fluentui/react/lib/Theme`, `@fluentui/react/lib/Styling`

---

## 🔧 Development Workflow & Adding New Features

### 🆕 Adding a New Component (Step-by-Step)

1. **Create the directory structure**:

   ```bash
   mkdir -p src/components/NewComponent/{hooks,utils,components,types}
   ```

2. **Create core files**:

   ```bash
   # Core component files
   touch src/components/NewComponent/NewComponent.tsx
   touch src/components/NewComponent/NewComponent.types.ts
   touch src/components/NewComponent/NewComponent.css
   touch src/components/NewComponent/index.ts
   touch src/components/NewComponent/README.md
   ```

3. **Component template** (`NewComponent.tsx`):

   ```typescript
   import * as React from 'react';
   import { INewComponentProps } from './NewComponent.types';
   import './NewComponent.css';

   export const NewComponent: React.FC<INewComponentProps> = ({ title, onAction, className }) => {
     // Component implementation
     return <div className={`new-component ${className || ''}`}>{title}</div>;
   };
   ```

4. **Types definition** (`NewComponent.types.ts`):

   ```typescript
   export interface INewComponentProps {
     title: string;
     onAction?: () => void;
     className?: string;
   }
   ```

5. **Export configuration** (`index.ts`):

   ```typescript
   export { NewComponent } from './NewComponent';
   export type { INewComponentProps } from './NewComponent.types';
   ```

6. **Add to main exports** (`src/components/index.ts`):

   ```typescript
   export * from './NewComponent';
   ```

7. **Build and validate**:
   ```bash
   npm run build
   npm run validate
   ```

### ✅ Build Validation Checklist

Before committing, ensure:

- [ ] `npm run build` completes without errors
- [ ] `npm run validate` passes
- [ ] All exports are properly configured
- [ ] Documentation (README.md) is comprehensive
- [ ] TypeScript types are complete
- [ ] Tree-shaking works correctly
- [ ] Using relative imports (no path aliases)

---

## 🚨 Troubleshooting & Common Issues

### 🔨 Build Issues

#### ❌ "Missing required files" validation error

**Symptoms**: `npm run validate` fails
**Solutions**:

- Check that `index.ts` files exist in `components/`, `hooks/`, `utilities/`, `types/`
- Ensure exports are not accidentally removed from index files
- Run `npm run clean` then `npm run build`
- Verify file paths are correct (case-sensitive)

#### ❌ TypeScript compilation errors

**Symptoms**: `npm run build` fails with TS errors
**Solutions**:

- Verify Node.js version: `node --version` (must be 18-22)
- Check TypeScript version: `npx tsc --version` (should be 4.7+)
- Clear build cache: `rm -rf lib/ *.tsbuildinfo`
- Check for circular dependencies
- Ensure all imports use relative paths (no path aliases)

### 📦 Import Issues in SPFx Projects

#### ❌ "Module not found" when importing

**Symptoms**: Import statements fail in consuming projects
**Solutions**:

- Use full paths: `spfx-toolkit/lib/components/Card`
- Check `package.json` exports configuration
- Verify the file exists in `node_modules/spfx-toolkit/lib/`
- Ensure SPFx project has correct dependencies

#### ❌ Bundle size too large

**Symptoms**: SPFx bundle exceeds size limits
**Solutions**:

- Avoid bulk imports: `import * from 'spfx-toolkit'`
- Use specific imports: `import { Card } from 'spfx-toolkit/lib/components/Card'`
- Run `gulp bundle --ship --analyze-bundle` to identify large imports
- Check Fluent UI imports are tree-shakable (see FluentUI-TreeShaking-Guide.md)

---

## 📚 Critical Resources & Documentation

### 📖 Component Documentation

- [**Card System**](./src/components/Card/README.md)
- [**UserPersona**](./src/components/UserPersona/README.md)
- [**WorkflowStepper**](./src/components/WorkflowStepper/README.md)
- [**ManageAccess**](./src/components/ManageAccess/README.md)
- [**VersionHistory**](./src/components/VersionHistory/README.md)
- [**ConflictDetector**](./src/components/ConflictDetector/README.md)
- [**GroupViewer**](./src/components/GroupViewer/README.md)
- [**ErrorBoundary**](./src/components/ErrorBoundary/README.md)

### 🛠️ Utility Documentation

- [**BatchBuilder**](./src/utilities/batchBuilder/README.md)
- [**PermissionHelper**](./src/utilities/permissionHelper/README.md)
- [**ListItemHelper**](./src/utilities/listItemHelper/README.md)
- [**StringUtils**](./src/utilities/stringUtils/README.md)
- [**DateUtils**](./src/utilities/dateUtils/README.md)
- [**Context System**](./src/utilities/context/README.md)

### 📋 Special Documentation

- [**FluentUI Tree-Shaking Guide**](./docs/FluentUI-TreeShaking-Guide.md)
- [**Complete Usage Guide**](./SPFX-Toolkit-Usage-Guide.md)

---

## 🎯 Quick Start for Claude Sessions

### Key Things to Remember

1. **This is an SPFx LIBRARY, not a web part** - It gets consumed by other SPFx projects
2. **Bundle size is CRITICAL** - Always use tree-shakable imports
3. **ZERO runtime dependencies allowed** - Only use exact peer dependencies
4. **SPContext must be initialized** before using any components
5. **Use relative imports in source** - NO path aliases
6. **Tree-shaking is mandatory** - Use specific import paths
7. **NO additional npm packages** - Build custom solutions

### Quick Start Commands

```bash
# Build and validate
npm run build && npm run validate

# Development workflow
npm run watch

# Check bundle impact (in consuming project)
gulp bundle --ship --analyze-bundle
```

### Component Categories by Complexity

| **Simple** (Low Bundle Impact) | **Medium** (Moderate Impact) | **Complex** (High Impact) |
| ------------------------------ | ---------------------------- | ------------------------- |
| UserPersona                    | WorkflowStepper              | ManageAccess              |
| GroupViewer                    | ConflictDetector             | VersionHistory            |
| ErrorBoundary                  |                              | spForm components         |

### Essential Imports to Remember

```typescript
// Context (ALWAYS FIRST)
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Tree-shakable Fluent UI
import { Button } from '@fluentui/react/lib/Button';
import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react/lib/Stack';

// Toolkit components
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';
```

---

**Last Updated**: October 2025
**Current Focus**: Tree-shakable architecture, comprehensive documentation, bundle size optimization
