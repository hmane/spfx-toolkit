# CLAUDE.md - SPFx Toolkit Development Guide

This file provides comprehensive guidance for Claude Code (claude.ai/code) when working with this repository. It should be used as the primary reference for understanding the project structure, patterns, and best practices.

## 🚀 Project Overview

**SPFx Toolkit** is a production-ready library of reusable components, hooks, and utilities for SharePoint Framework (SPFx) >= 1.21.1. It provides tree-shakable exports optimized for minimal bundle sizes in SPFx web parts.

### 🎯 Core Mission

- **Tree-shakable architecture** - Import only what you need for minimal bundle sizes
- **SPFx-first design** - Built specifically for SharePoint Framework constraints
- **Zero runtime dependencies** - Only peer dependencies to avoid version conflicts
- **Production-ready** - Battle-tested components with comprehensive error handling
- **Developer experience** - Full TypeScript support with comprehensive documentation

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

## 🚨 CRITICAL: Dependency Policy

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

### 🔍 Validation Process

Before adding any functionality:

1. Check if it can be implemented with existing peer dependencies
2. Implement custom solution using native JS/TS if needed
3. Never suggest adding new dependencies
4. Always verify `npm ls` shows zero dependencies

## 🏛️ Architecture Deep Dive

## 📋 Quick Reference for New Sessions

### Essential Context

1. **This is an SPFx library**, not a web part - it gets consumed by other SPFx projects
2. **Bundle size is critical** - Always use tree-shakable imports
3. **No runtime dependencies** - Everything is a peer dependency
4. **Strict TypeScript** - All code must have proper type definitions
5. **Context system** - SPContext must be initialized before using components

### Current Project State

- **Main focus**: React components for SharePoint scenarios
- **Architecture**: Tree-shakable modules with `/lib/` subpaths
- **Build system**: Gulp + TypeScript compilation
- **Recent additions**: Comprehensive documentation, tree-shaking optimizations

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

### Build & Development

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

### Versioning

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

### Publishing

```bash
# Publish alpha version
npm run publish:alpha

# Publish beta version
npm run publish:beta

# Publish production version
npm run publish:latest

# Note: prepublishOnly automatically runs build and validate
```

### Using Gulp Directly

```bash
# All npm scripts use Gulp under the hood
gulp clean
gulp build
gulp watch
gulp validate
gulp buildWithPackageJson
```

## Architecture

### Tree-Shakable Module Structure

The library is designed for **optimal bundle sizes** through tree-shaking. Components, hooks, and utilities are exported via subpaths:

```typescript
// ✅ RECOMMENDED: Direct imports for minimal bundle size
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';

// ❌ AVOID: Main package import (imports everything)
import { Card } from 'spfx-toolkit';
```

**Package exports configuration** (package.json):

- `.` → Main index with all exports
- `./components` → All components
- `./hooks` → All hooks
- `./utils` → All utilities
- `./lib/*` → Direct file access

### 📁 Detailed Source Structure

```
src/
├── components/                 # React components (tree-shakable)
│   ├── Card/                  # Expandable content containers
│   │   ├── Card.tsx          # Main component
│   │   ├── Card.types.ts     # TypeScript interfaces
│   │   ├── card.css          # Component styles
│   │   ├── hooks/            # Card-specific hooks
│   │   ├── services/         # CardController service
│   │   ├── utils/            # Card utilities
│   │   ├── components/       # Sub-components (Accordion, etc.)
│   │   ├── index.ts          # Exports
│   │   └── README.md         # Documentation
│   ├── UserPersona/          # User profile display
│   ├── WorkflowStepper/      # Process flow visualization
│   ├── ManageAccess/         # Permission management
│   ├── VersionHistory/       # Document version tracking
│   ├── ConflictDetector/     # Concurrent editing protection
│   ├── GroupViewer/          # SharePoint group display
│   ├── ErrorBoundary/        # Error handling wrapper
│   └── spForm/               # Form component suite
├── hooks/                     # Reusable React hooks
│   ├── useLocalStorage.ts    # Persistent state
│   ├── useViewport.ts        # Responsive breakpoints
│   ├── index.ts              # Hook exports
│   └── README.md             # Hook documentation
├── utilities/                 # Helper utilities
│   ├── context/              # SPFx context management
│   │   ├── sp-context.ts     # Main context class
│   │   ├── core/             # Core context functionality
│   │   ├── modules/          # Pluggable modules
│   │   ├── types/            # Context type definitions
│   │   └── utils/            # Context utilities
│   ├── batchBuilder/         # SharePoint batch operations
│   ├── permissionHelper/     # Permission validation
│   ├── listItemHelper/       # Field extraction/updates
│   ├── stringUtils/          # String manipulation
│   ├── dateUtils/            # Date operations
│   └── CssLoader.ts          # CSS loading utility
├── types/                     # Global TypeScript definitions
│   ├── css-modules.d.ts      # CSS import declarations
│   ├── index.ts              # Type exports
│   ├── batchOperationTypes.ts
│   ├── listItemTypes.ts
│   └── permissionTypes.ts
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

### 🧠 SPFx Context Management (`utilities/context/`)

The **Context** system is the **foundation** for all SharePoint operations. It's a sophisticated context management system that must be understood for effective development.

#### 🔧 Core Architecture

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

#### 🚀 Initialization Patterns (CRITICAL)

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

#### 🏗️ Architecture Notes

- **Lazy loading**: The `SPContext` class uses dynamic imports to reduce initial bundle size
- **Context-manager**: Core functionality is in `context-manager.ts` (imported on demand)
- **Type safety**: Full TypeScript support with `IPeoplePickerContext` from PnP
- **Error handling**: Built-in error boundaries and logging
- **Performance**: Intelligent caching with pessimistic refresh strategies

### Batch Operations (`utilities/batchBuilder/`)

The **BatchBuilder** provides a fluent API for efficient SharePoint batch operations:

```typescript
const batch = new BatchBuilder(SPContext.sp, {
  batchSize: 100, // Items per batch
  enableConcurrency: false, // Sequential by default
});

const result = await batch
  .list('Tasks')
  .add({ Title: 'Task 1', Status: 'New' })
  .update(5, { Status: 'Completed' })
  .delete(10)
  .list('Documents')
  .add({ Title: 'Doc 1' })
  .execute();
```

**Key features**:

- Cross-list operations in single batch
- Automatic batch splitting (default: 100 operations)
- Concurrent or sequential execution
- Detailed result tracking with operation IDs

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

#### 🎯 Hook Development Patterns

```typescript
// ✅ Custom hook example
export function useCustomHook<T>(initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = React.useState<T>(initialValue);

  const updateValue = React.useCallback((newValue: T) => {
    setValue(newValue);
  }, []);

  return [value, updateValue];
}
```

### 🔧 Utility Development Guidelines

````typescript
// ✅ Export typed functions with comprehensive JSDoc
/**
 * Extracts field value from SharePoint list item with type safety
 * @param item - SharePoint list item (from renderListData or PnP)
 * @param fieldName - Internal field name
 * @param defaultValue - Fallback value if field is missing
 * @returns Field value or default value
 * @example
 * ```typescript
 * const title = getFieldValue(item, 'Title', 'Untitled');
 * const dueDate = getFieldValue<Date>(item, 'DueDate');
 * ```
 */
export function getFieldValue<T = any>(
  item: any,
  fieldName: string,
  defaultValue?: T
): T | undefined {
  return item?.[fieldName] ?? defaultValue;
}
````

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

## 📚 Critical Resources & Documentation

### 📖 Component Documentation

Each component has comprehensive documentation with examples:

- [**Card System**](./src/components/Card/README.md) - Expandable containers with animations and persistence
- [**UserPersona**](./src/components/UserPersona/README.md) - User profile display with automatic fetching
- [**WorkflowStepper**](./src/components/WorkflowStepper/README.md) - Arrow-style workflow progress visualization
- [**ManageAccess**](./src/components/ManageAccess/README.md) - SharePoint-like permission management
- [**VersionHistory**](./src/components/VersionHistory/README.md) - Document version history with comparisons
- [**ConflictDetector**](./src/components/ConflictDetector/README.md) - Concurrent editing protection
- [**GroupViewer**](./src/components/GroupViewer/README.md) - SharePoint group display with rich tooltips
- [**ErrorBoundary**](./src/components/ErrorBoundary/README.md) - Error handling with retry functionality

### 🎣 Hook Documentation

- [**Hooks Overview**](./src/hooks/README.md) - All available custom hooks
- **useLocalStorage** - Persistent state management
- **useViewport** - Responsive breakpoint detection

### 🛠️ Utility Documentation

- [**BatchBuilder**](./src/utilities/batchBuilder/README.md) - Efficient SharePoint batch operations
- [**PermissionHelper**](./src/utilities/permissionHelper/README.md) - Permission validation and management
- [**ListItemHelper**](./src/utilities/listItemHelper/README.md) - Field extraction and transformation
- [**StringUtils**](./src/utilities/stringUtils/README.md) - String manipulation extensions
- [**DateUtils**](./src/utilities/dateUtils/README.md) - Date formatting and calculations
- [**Context System**](./src/utilities/context/README.md) - SPFx context management

### 📋 Special Documentation

- [**FluentUI Tree-Shaking Guide**](./docs/FluentUI-TreeShaking-Guide.md) - Complete Fluent UI import optimization reference
- [**Component Types**](./src/types/README.md) - TypeScript type definitions

## ⚙️ TypeScript & Build Configuration

### 🎯 Key TypeScript Settings (tsconfig.json)

```jsonc
{
  "compilerOptions": {
    // SPFx Compatibility (CRITICAL)
    "target": "ES5", // SPFx requirement
    "module": "commonjs", // SPFx requirement
    "jsx": "react", // React support
    "experimentalDecorators": true, // SPFx decorators

    // Build Configuration
    "rootDir": "src", // Source directory
    "outDir": "lib", // Output directory
    "declaration": true, // Generate .d.ts files
    "declarationMap": true, // Source map for declarations
    "sourceMap": true, // Debug support

    // Code Quality
    "strict": true, // Full type safety
    "skipLibCheck": true, // Faster builds
    "forceConsistentCasingInFileNames": true,

    // Tree-shaking Optimizations (CRITICAL)
    "preserveConstEnums": false, // Better tree-shaking
    "removeComments": true, // Smaller bundles
    "importHelpers": false, // Avoid tslib dependency
    "noEmitHelpers": false, // Emit helpers inline

    // Module Resolution
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,

    // Type Roots
    "typeRoots": ["./node_modules/@types", "./src/types"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "lib", "dist", "temp", "src/**/__tests__/**"]
}
```

### 🏗️ Build Process (Gulp)

The build system uses Gulp with TypeScript compilation:

```bash
# Core build tasks
gulp clean          # Remove lib/ directory
gulp build          # Compile TypeScript + copy assets
gulp watch          # Watch mode for development
gulp validate       # Ensure required files exist
```

#### 📦 Asset Handling

The build process copies these assets to `lib/`:

- **CSS/SCSS** files (component styles)
- **JSON** files (configuration)
- **Images** (SVG, PNG, JPG, GIF)
- **Fonts** (WOFF, WOFF2)

**Excluded**: Test files, README files, source TypeScript files

#### ✅ Build Validation

The `gulp validate` task ensures these critical files exist in `lib/`:

- `index.js` and `index.d.ts` (main exports)
- `components/index.js` (component exports)
- `hooks/index.js` (hook exports)
- `utilities/index.js` (utility exports)
- `types/index.js` (type exports)

**If validation fails**: Check that index.ts files exist and export properly.

## Import Patterns for SPFx Compatibility

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

### PnP/PnPjs Imports

The `utilities/context/pnpImports/` directory provides **selective PnP imports** to reduce bundle size:

```typescript
// ✅ Import only what you need
import { getWeb, getList } from './pnpImports/lists';
import { getSearchResults } from './pnpImports/search';

// Organized by domain:
// - core.ts: Web, Site, SPFx integration
// - lists.ts: List operations
// - files.ts: File/folder operations
// - search.ts: Search operations
// - security.ts: Permissions, roles, groups
// - taxonomy.ts: Managed metadata
// And more...
```

### External Dependencies (Peer Dependencies)

The toolkit has **zero production dependencies** - everything is a peer dependency that the consuming SPFx project provides:

- `@fluentui/react@8.106.4`
- `@pnp/spfx-controls-react@^3.22.0`
- `@pnp/logging@^4.16.0`
- `@pnp/sp@^3.20.1`
- `@pnp/queryable@^3.20.1`
- `react@^17.0.1`
- `react-dom@^17.0.1`
- `devextreme@^22.2.3`
- `devextreme-react@^22.2.3`
- `react-hook-form@^7.45.4`
- `zustand@^4.3.9`

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

### 🛠️ Adding a New Utility

1. **Create utility directory**:

   ```bash
   mkdir -p src/utilities/newUtility
   ```

2. **Create utility files**:

   ```typescript
   // src/utilities/newUtility/newUtility.ts
   export class NewUtility {
     public static processData(data: any): any {
       // Implementation
     }
   }

   // src/utilities/newUtility/index.ts
   export * from './newUtility';

   // src/utilities/newUtility/README.md
   # NewUtility Documentation
   ```

3. **Export from main utilities**:
   ```typescript
   // src/utilities/index.ts
   export * from './newUtility';
   ```

### 🎣 Adding a New Hook

1. **Create hook file**:

   ```typescript
   // src/hooks/useNewHook.ts
   import * as React from 'react';

   export function useNewHook<T>(initialValue: T): [T, (value: T) => void] {
     const [value, setValue] = React.useState<T>(initialValue);

     const updateValue = React.useCallback((newValue: T) => {
       setValue(newValue);
     }, []);

     return [value, updateValue];
   }
   ```

2. **Export from hooks index**:
   ```typescript
   // src/hooks/index.ts
   export * from './useNewHook';
   ```

### ✅ Build Validation Checklist

Before committing, ensure:

- [ ] `npm run build` completes without errors
- [ ] `npm run validate` passes
- [ ] All exports are properly configured
- [ ] Documentation (README.md) is comprehensive
- [ ] TypeScript types are complete
- [ ] Tree-shaking works correctly

## Code Style Guidelines

### React Components

```typescript
// ✅ Functional components with explicit return types
export const MyComponent: React.FC<IMyComponentProps> = ({ title, onAction }) => {
  // Hooks at the top
  const [state, setState] = React.useState<string>('');

  // Event handlers
  const handleClick = React.useCallback(() => {
    onAction?.();
  }, [onAction]);

  // Render
  return <div>{title}</div>;
};
```

### Utility Functions

```typescript
// ✅ Export typed functions with JSDoc
/**
 * Extracts field value from SharePoint list item
 * @param item - SharePoint list item
 * @param fieldName - Internal field name
 * @returns Field value or undefined
 */
export function getFieldValue<T = any>(item: any, fieldName: string): T | undefined {
  return item?.[fieldName];
}
```

### Error Handling

```typescript
// ✅ Use custom error classes from utilities/permissionHelper/PermissionError.ts
throw new PermissionError('Access denied', { level: PermissionLevel.Edit });

// ✅ Async functions should catch and log errors
try {
  await operation();
} catch (error) {
  SPContext.logger.error('Operation failed', error);
  throw error; // Re-throw if caller needs to handle
}
```

## Testing

Currently, the project structure excludes tests from compilation:

- Test files: `**/__tests__/**`
- Build ignores: `src/**/__tests__/**`

When adding tests in the future, place them in `__tests__/` directories adjacent to the code.

## 🚀 Performance & Bundle Size Optimization

### 🎯 Critical Performance Guidelines

1. **Tree-shaking is paramount** - Every import decision affects consuming projects
2. **Lazy load heavy dependencies** - Use dynamic imports for large utilities
3. **Memoization** - Use `React.memo()`, `useMemo()`, `useCallback()` appropriately
4. **Context caching** - Use `SPContext.spCached` for frequently accessed data
5. **Batch operations** - Use BatchBuilder instead of sequential CRUD operations
6. **Bundle analysis** - Regularly check bundle impact with `gulp bundle --ship`

### 📊 Bundle Size Targets

| Component Type     | Target Size | Max Size | Notes                          |
| ------------------ | ----------- | -------- | ------------------------------ |
| Simple components  | <50KB       | 100KB    | UserPersona, GroupViewer       |
| Complex components | <200KB      | 500KB    | ManageAccess, VersionHistory   |
| Utility bundles    | <100KB      | 200KB    | BatchBuilder, PermissionHelper |
| Hook bundles       | <25KB       | 50KB     | useLocalStorage, useViewport   |

### ⚡ Optimization Strategies

#### Tree-Shaking Verification

```bash
# In consuming SPFx project
gulp bundle --ship --analyze-bundle
# Check webpack-bundle-analyzer output
```

#### Lazy Loading Pattern

```typescript
// ✅ Lazy load heavy dependencies
const loadHeavyUtility = async () => {
  const { HeavyUtility } = await import('./heavyUtility');
  return new HeavyUtility();
};

// ✅ Conditional imports
if (needAdvancedFeature) {
  const { AdvancedFeature } = await import('./advancedFeature');
  return <AdvancedFeature />;
}
```

#### Memoization Best Practices

```typescript
// ✅ Memo expensive computations
const expensiveValue = React.useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// ✅ Memo callback functions
const handleClick = React.useCallback(
  (id: string) => {
    onItemClick(id);
  },
  [onItemClick]
);

// ✅ Memo components with stable props
const MemoizedChild = React.memo(ChildComponent);
```

## Common Patterns

### Context Initialization in Web Parts

```typescript
export default class MyWebPart extends BaseClientSideWebPart<IProps> {
  private context?: SPFxContext;

  protected async onInit(): Promise<void> {
    await super.onInit();

    // Initialize context once
    this.context = await SPContext.smart(this.context, 'MyWebPart');
  }

  public render(): void {
    const element = React.createElement(MyComponent, {
      context: this.context,
    });
    ReactDom.render(element, this.domElement);
  }
}
```

### Using Hooks in Components

```typescript
const MyComponent: React.FC = () => {
  // Local storage persistence
  const [settings, setSettings] = useLocalStorage('my-settings', defaultSettings);

  // Responsive design
  const { isMobile, isTablet, isDesktop } = useViewport();

  // Card controller
  const cardController = useCardController('my-card-id');

  return (
    <Card title='My Card' allowExpand persistState onExpand={() => cardController.expand()}>
      {isMobile ? <MobileView /> : <DesktopView />}
    </Card>
  );
};
```

### Batch Operations Pattern

```typescript
// Efficient multi-list updates
const batch = new BatchBuilder(SPContext.sp);

// Queue operations
batch
  .list('Tasks')
  .update(taskId, { Status: 'Completed' })
  .list('Notifications')
  .add({ Message: 'Task completed', UserId: userId });

// Execute once
const result = await batch.execute();

// Check results
if (!result.success) {
  result.errors.forEach(err => console.error(`${err.listName}: ${err.error}`));
}
```

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
- Ensure all imports have proper file extensions

#### ❌ CSS import errors

**Symptoms**: "Cannot find module or type declarations for side-effect import"
**Solutions**:

- CSS declarations are in `src/types/css-modules.d.ts`
- Ensure CSS files exist alongside components
- Check TypeScript `typeRoots` configuration

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

### ⚡ Runtime Issues

#### ❌ SPContext not initialized

**Symptoms**: "Context not initialized" errors
**Solutions**:

- Always call `SPContext.initialize()` or preset method before using components
- Check initialization in web part's `onInit()` lifecycle
- Verify context is initialized before rendering components
- Use `SPContext.isReady()` to check initialization status

#### ❌ Permission errors

**Symptoms**: SharePoint API access denied
**Solutions**:

- Verify user has required SharePoint permissions
- Check SharePoint API permissions in `package-solution.json`
- Use `SPContext.getHealthCheck()` to diagnose issues
- Ensure proper authentication flow

#### ❌ Component not rendering

**Symptoms**: Components appear blank or don't render
**Solutions**:

- Check browser console for JavaScript errors
- Verify all required props are provided
- Check CSS is loading correctly
- Ensure Fluent UI theme is properly initialized

### 🎨 Fluent UI Issues

#### ❌ "Module has no exported member" errors

**Symptoms**: TypeScript errors on Fluent UI imports
**Solutions**:

- Check component is in correct import path (see FluentUI-TreeShaking-Guide.md)
- Some components like `MessageBarButton` are in `/lib/Button` not `/lib/MessageBar`
- `useTheme` is in `/lib/Theme` not `/lib/Styling`
- Verify Fluent UI version compatibility

#### ❌ Runtime errors with Fluent UI components

**Symptoms**: Components fail at runtime despite successful compilation
**Solutions**:

- Ensure all dependent interfaces are imported (e.g., `IDropdownOption`)
- Check enum values are imported (e.g., `MessageBarType`, `PersonaSize`)
- Verify theme provider is properly configured in consuming application

### 🔍 Debugging Tips

#### Enable Verbose Logging

```typescript
// Use development context for verbose logging
await SPContext.development(this.context, 'MyComponent');

// Check context health
const health = await SPContext.getHealthCheck();
console.log('Context health:', health);
```

#### Bundle Analysis

```bash
# In consuming SPFx project
gulp bundle --ship --analyze-bundle

# Check output in temp/webpack-bundle-analyzer/
```

#### Performance Monitoring

```typescript
// Use performance tracker
SPContext.performance.track('operationName', async () => {
  // Your operation
});

// Get metrics
const metrics = SPContext.performance.getMetrics();
console.log('Performance metrics:', metrics);
```

## 📋 Quick Reference for Claude Sessions

### 🎯 Key Things to Remember

1. **This is an SPFx LIBRARY, not a web part** - It gets consumed by other SPFx projects
2. **Bundle size is CRITICAL** - Always use tree-shakable imports
3. **ZERO runtime dependencies allowed** - Only use the exact peer dependencies listed in package.json
4. **SPContext must be initialized** before using any components
5. **All components are React functional components** with TypeScript
6. **Tree-shaking is mandatory** - Use specific import paths
7. **NO additional npm packages** - Build custom solutions with existing peer dependencies

### 🚀 Quick Start Commands

```bash
# Build and validate
npm run build && npm run validate

# Development workflow
npm run watch

# Check bundle impact
gulp bundle --ship --analyze-bundle  # In consuming project
```

### 📁 Most Important Files

- `src/utilities/context/sp-context.ts` - Main context system
- `src/components/*/README.md` - Component documentation
- `docs/FluentUI-TreeShaking-Guide.md` - Import optimization guide
- `package.json` - Exports configuration
- `tsconfig.json` - TypeScript configuration

### 🎨 Component Categories by Complexity

| **Simple** (Low Bundle Impact) | **Medium** (Moderate Impact) | **Complex** (High Impact) |
| ------------------------------ | ---------------------------- | ------------------------- |
| UserPersona                    | WorkflowStepper              | ManageAccess              |
| GroupViewer                    | ConflictDetector             | VersionHistory            |
| ErrorBoundary                  |                              | spForm components         |

### 🔧 Essential Imports to Remember

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

### 📝 Commit Message Conventions

```bash
# Feature additions
feat: add new component for [purpose]
feat: enhance [component] with [feature]

# Bug fixes
fix: resolve [issue] in [component]
fix: improve error handling in [area]

# Documentation
docs: update [component] README with examples
docs: add troubleshooting guide for [topic]

# Performance
perf: optimize bundle size with tree-shaking
perf: improve [component] rendering performance

# Refactoring
refactor: improve [component] type definitions
refactor: simplify [utility] implementation
```

### 🎯 Session Goals Template

When starting a new session, consider these typical goals:

- [ ] Add new component with full documentation
- [ ] Optimize existing component for bundle size
- [ ] Fix TypeScript/build issues
- [ ] Enhance component functionality
- [ ] Update documentation and examples
- [ ] Improve error handling and accessibility
- [ ] Add new utility or hook

---

**Last Updated**: October 2025
**Current Focus**: Tree-shakable architecture, comprehensive documentation, bundle size optimization

```

```
