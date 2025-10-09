# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SPFx Toolkit** is a production-ready library of reusable components, hooks, and utilities for SharePoint Framework (SPFx) >= 1.21.1. It provides tree-shakable exports optimized for minimal bundle sizes in SPFx web parts.

### Key Technologies
- **SharePoint Framework (SPFx)** 1.21.1+
- **React** 17.x with functional components and hooks
- **TypeScript** 4.7+ in strict mode
- **PnP/PnPjs** for SharePoint operations
- **Fluent UI React** 8.x for UI components
- **DevExtreme** for advanced form controls
- **Zustand** for state management
- **React Hook Form** for form handling

## Common Commands

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

### Source Structure

```
src/
├── components/          # React components
│   ├── Card/           # Expandable card system
│   ├── WorkflowStepper/    # Arrow-style workflow UI
│   ├── ConflictDetector/   # Concurrent editing protection
│   ├── GroupViewer/        # SharePoint group display
│   ├── ManageAccess/       # Permission management UI
│   ├── ErrorBoundary/      # Error handling component
│   ├── spForm/            # Form components (DevExtreme + PnP)
│   ├── UserPersona/        # User display component
│   └── VersionHistory/     # Document version history
├── hooks/              # Custom React hooks
│   ├── useLocalStorage.ts
│   ├── useViewport.ts
│   └── index.ts
├── utilities/          # Helper utilities
│   ├── batchBuilder/   # SharePoint batch operations
│   ├── context/        # SPFx context management
│   ├── permissionHelper/   # Permission utilities
│   ├── listItemHelper/     # Field extraction utilities
│   ├── stringUtils/        # String extensions
│   └── dateUtils/          # Date extensions
└── types/              # TypeScript type definitions
```

### SPFx Context Management (`utilities/context/`)

The **Context** system is the foundation for SharePoint operations. It provides:

1. **Lazy initialization** with environment detection
2. **Multiple PnP instances** with different caching strategies:
   - `sp` - Default PnP instance
   - `spCached` - Memory-cached instance
   - `spPessimistic` - No-cache instance for always-fresh data
3. **Built-in modules**:
   - Cache (memory/storage strategies)
   - Logger (console/performance tracking)
   - HTTP client (with auth and retries)
   - Performance tracker
   - Links builder

**Initialization patterns**:
```typescript
// Smart initialization (auto-detects environment)
const ctx = await SPContext.smart(this.context, 'MyWebPart');

// Preset configurations
const ctx = await SPContext.basic(this.context, 'MyWebPart');      // Simple setup
const ctx = await SPContext.production(this.context, 'MyWebPart'); // Optimized
const ctx = await SPContext.development(this.context, 'MyWebPart');// Verbose logging
const ctx = await SPContext.teams(this.context, 'MyWebPart');      // Teams-optimized

// Access anywhere after initialization
SPContext.sp.web.lists.getByTitle('MyList').items();
SPContext.webAbsoluteUrl;
SPContext.currentUser;
```

**Architecture Note**: The `SPContext` class uses lazy loading - it dynamically imports `context-manager` on first `initialize()` call to reduce initial bundle size.

### Batch Operations (`utilities/batchBuilder/`)

The **BatchBuilder** provides a fluent API for efficient SharePoint batch operations:

```typescript
const batch = new BatchBuilder(SPContext.sp, {
  batchSize: 100,           // Items per batch
  enableConcurrency: false  // Sequential by default
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

### Component Patterns

All components follow consistent patterns:

1. **Functional components** with hooks (no class components)
2. **TypeScript interfaces** for all props and state
3. **CSS modules** or scoped styles (avoid global styles)
4. **Accessibility** - WCAG 2.1 AA compliance
5. **Performance** - Memoization, lazy loading where appropriate
6. **Error boundaries** - Graceful error handling

**Example structure**:
```typescript
// Card/index.ts - Main exports
export { Card } from './Card';
export type { ICardProps } from './Card.types';

// Card/Card.types.ts - Type definitions
export interface ICardProps {
  title: string;
  // ... other props
}

// Card/hooks/ - Component-specific hooks
// Card/services/ - Shared services (e.g., CardController)
// Card/utils/ - Helper functions
```

### Asset Handling

The build process (via Gulp) copies assets to `lib/`:
- **CSS/SCSS** files (component styles)
- **JSON** files (configuration)
- **Images** (SVG, PNG, JPG, GIF)
- **Fonts** (WOFF, WOFF2)

Assets are excluded from test directories and README files.

## TypeScript Configuration

**Key compiler options** (tsconfig.json):
- `target: ES5` - SPFx compatibility
- `module: commonjs` - SPFx compatibility
- `jsx: react` - React support
- `strict: true` - Full type safety
- `declaration: true` - Generate .d.ts files
- `sourceMap: true` - Debugging support
- `importHelpers: false` - Emit helpers inline (avoid tslib dependency)
- `experimentalDecorators: true` - SPFx decorators

**Tree-shaking optimizations**:
- `preserveConstEnums: false`
- `removeComments: true`

## Import Patterns for SPFx Compatibility

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
- `@pnp/sp@^3.20.1`
- `@pnp/logging@^4.16.0`
- `react@^17.0.1`
- `react-dom@^17.0.1`
- `devextreme@^22.2.3`
- `react-hook-form@^7.45.4`
- `zustand@^4.3.9`

## Development Workflow

### Adding a New Component

1. Create directory: `src/components/ComponentName/`
2. Add files:
   - `ComponentName.tsx` - Main component
   - `ComponentName.types.ts` - TypeScript interfaces
   - `ComponentName.module.scss` - Scoped styles (if needed)
   - `index.ts` - Exports
   - `README.md` - Documentation
3. Export from `src/components/index.ts`:
   ```typescript
   export * from './ComponentName';
   ```
4. Run `npm run build` and verify tree-shaking works:
   - Check `lib/components/ComponentName/` exists
   - Verify imports work: `import { X } from 'spfx-toolkit/lib/components/ComponentName'`

### Adding a New Utility

1. Create directory: `src/utilities/utilityName/`
2. Add files with clear exports in `index.ts`
3. Export from `src/utilities/index.ts`
4. Ensure types are exported from `src/types/` if needed

### Build Validation

The `gulp validate` task ensures these files exist in `lib/`:
- `index.js` and `index.d.ts`
- `components/index.js`
- `hooks/index.js`
- `utilities/index.js`
- `types/index.js`

**Important**: If validation fails, required index files are missing.

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
export function getFieldValue<T = any>(
  item: any,
  fieldName: string
): T | undefined {
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

## Performance Considerations

1. **Tree-shaking is critical** - Always test bundle impact of new exports
2. **Lazy load heavy dependencies** - Use dynamic imports where possible
3. **Memoization** - Use `React.memo()`, `useMemo()`, `useCallback()` appropriately
4. **Context caching** - Use `SPContext.spCached` for data that doesn't change frequently
5. **Batch operations** - Use BatchBuilder instead of sequential CRUD operations

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
      context: this.context
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
    <Card
      title="My Card"
      allowExpand
      persistState
      onExpand={() => cardController.expand()}
    >
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
  result.errors.forEach(err =>
    console.error(`${err.listName}: ${err.error}`)
  );
}
```

## Troubleshooting

### Build Issues

**"Missing required files" validation error**:
- Check that index.ts files exist in components/, hooks/, utilities/, types/
- Ensure exports are not accidentally removed
- Run `npm run clean` then `npm run build`

**TypeScript compilation errors**:
- Verify Node.js version: `node --version` (must be 18-22)
- Check TypeScript version: `npx tsc --version` (should be 4.7+)
- Clear build cache: `rm -rf lib/ *.tsbuildinfo`

### Import Issues in SPFx Projects

**"Module not found" when importing**:
- Use full paths: `spfx-toolkit/lib/components/Card`
- Check package.json exports configuration
- Verify the file exists in `node_modules/spfx-toolkit/lib/`

**Bundle size too large**:
- Avoid bulk imports: `import * from 'spfx-toolkit'`
- Use specific imports: `import { Card } from 'spfx-toolkit/lib/components/Card'`
- Run `gulp bundle --ship` in your SPFx project and check bundle size

### Runtime Issues

**SPContext not initialized**:
- Always call `SPContext.initialize()` or preset method before using
- Check initialization in web part's `onInit()` lifecycle

**Permission errors**:
- Verify user has required SharePoint permissions
- Check SharePoint API permissions in package-solution.json
- Use `SPContext.getHealthCheck()` to diagnose issues
