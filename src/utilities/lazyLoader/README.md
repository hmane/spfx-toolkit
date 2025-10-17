# Lazy Loader Utility

Utilities for lazy loading React components with automatic error boundaries and loading states. Optimizes bundle size by splitting heavy components into separate chunks.

## Features

- **Automatic code splitting** - Components loaded on-demand
- **Built-in error boundaries** - Graceful error handling
- **Loading states** - Customizable loading indicators
- **Preloading support** - Load components before they're needed
- **Minimum load time** - Prevents loading flash for fast connections
- **TypeScript support** - Full type safety

## Basic Usage

### Creating a Lazy Component

```tsx
import { createLazyComponent } from 'spfx-toolkit/lib/utilities/lazyLoader';

// Create lazy version of heavy component
const LazyVersionHistory = createLazyComponent(
  () => import('../VersionHistory').then(m => ({ default: m.VersionHistory }))
);

// Use like a normal component
<LazyVersionHistory itemId={123} listId="abc" itemType="document" />
```

### With Custom Options

```tsx
const LazyManageAccess = createLazyComponent(
  () => import('../ManageAccess').then(m => ({ default: m.ManageAccessComponent })),
  {
    // Custom loading indicator
    fallback: <Spinner label="Loading access management..." />,

    // Custom error message
    errorMessage: 'Failed to load access management component',

    // Minimum loading time (prevents flash on fast connections)
    minLoadingTime: 300,

    // Error callback
    onError: (error, errorInfo) => {
      console.error('Component load error:', error);
    }
  }
);
```

## Advanced Usage

### Preloading Components

Preload components before they're needed to improve perceived performance:

```tsx
import { preloadComponent } from 'spfx-toolkit/lib/utilities/lazyLoader';

// Preload on user interaction
<Button
  onMouseEnter={() => preloadComponent(
    () => import('../VersionHistory').then(m => ({ default: m.VersionHistory }))
  )}
>
  View Version History
</Button>
```

### Preload Hook

```tsx
import { useLazyPreload } from 'spfx-toolkit/lib/utilities/lazyLoader';

function MyComponent({ showAdvanced }: { showAdvanced: boolean }) {
  // Preload when condition is true
  useLazyPreload(
    () => import('../AdvancedSettings').then(m => ({ default: m.AdvancedSettings })),
    showAdvanced // Preload when user enables advanced mode
  );

  return <div>...</div>;
}
```

### Custom Loading Component

```tsx
const CustomLoadingFallback = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <Spinner size={SpinnerSize.large} />
    <Text variant="large">Loading advanced features...</Text>
  </div>
);

const LazyComponent = createLazyComponent(
  () => import('../HeavyComponent').then(m => ({ default: m.HeavyComponent })),
  { fallback: <CustomLoadingFallback /> }
);
```

### Custom Error Handling

```tsx
const CustomErrorComponent = (
  <MessageBar messageBarType={MessageBarType.error}>
    <strong>Oops! Something went wrong.</strong>
    <br />
    Please refresh the page or contact support.
  </MessageBar>
);

<LazyLoadErrorBoundary
  errorComponent={CustomErrorComponent}
  onError={(error, errorInfo) => {
    // Send to logging service
    logError(error, errorInfo);
  }}
>
  <LazyComponent />
</LazyLoadErrorBoundary>
```

## Components

### `createLazyComponent()`

Creates a lazy-loaded component with automatic error boundary and loading state.

**Parameters:**
- `importFn: () => Promise<{ default: T }>` - Function that returns dynamic import
- `options?: ILazyLoadOptions` - Configuration options

**Returns:** `React.FC<React.ComponentProps<T>>`

**Options:**
```typescript
interface ILazyLoadOptions {
  fallback?: React.ReactNode;        // Custom loading component
  errorMessage?: string;             // Custom error message
  onError?: (error, errorInfo) => void;  // Error callback
  minLoadingTime?: number;           // Minimum loading time in ms
}
```

### `LazyLoadFallback`

Default loading fallback component.

```tsx
<LazyLoadFallback
  message="Loading component..."
  size={SpinnerSize.medium}
/>
```

### `LazyLoadErrorBoundary`

Error boundary for lazy loaded components.

```tsx
<LazyLoadErrorBoundary
  errorMessage="Failed to load"
  onError={(error, errorInfo) => console.error(error)}
>
  <SomeComponent />
</LazyLoadErrorBoundary>
```

## Hooks

### `useLazyPreload()`

Preload a component when a condition is met.

```tsx
useLazyPreload(
  () => import('./Component').then(m => ({ default: m.Component })),
  shouldPreload // boolean condition
);
```

### `preloadComponent()`

Manually preload a component.

```tsx
await preloadComponent(
  () => import('./Component').then(m => ({ default: m.Component }))
);
```

## Best Practices

### When to Use Lazy Loading

✅ **DO use for:**
- Large components (>100KB)
- Components not needed on initial render
- Components with heavy dependencies (DevExtreme, charts, etc.)
- Modal dialogs and panels
- Admin/configuration screens
- Rarely used features

❌ **DON'T use for:**
- Small components (<50KB)
- Components needed immediately on page load
- Critical UI elements
- Simple presentational components

### Recommended Components for Lazy Loading

Based on your toolkit, these components benefit most from lazy loading:

```tsx
// ✅ RECOMMENDED: Heavy components
const LazyVersionHistory = createLazyComponent(
  () => import('./VersionHistory').then(m => ({ default: m.VersionHistory }))
);

const LazyManageAccess = createLazyComponent(
  () => import('./ManageAccess').then(m => ({ default: m.ManageAccessComponent }))
);

const LazyConflictDetector = createLazyComponent(
  () => import('./ConflictDetector').then(m => ({ default: m.ConflictDetector }))
);

// ✅ GOOD: Modal/panel content
const LazyManageAccessPanel = createLazyComponent(
  () => import('./ManageAccess').then(m => ({ default: m.ManageAccessPanel }))
);

// ❌ AVOID: Lightweight components
// Don't lazy load Card, UserPersona, GroupViewer, etc.
```

### Optimization Tips

1. **Preload on User Intent**
   ```tsx
   <Button
     onMouseEnter={() => preloadComponent(lazyImport)}
     onClick={showComponent}
   >
     Show Feature
   </Button>
   ```

2. **Prevent Loading Flash**
   ```tsx
   createLazyComponent(importFn, { minLoadingTime: 300 })
   ```

3. **Group Related Imports**
   ```tsx
   // Instead of lazy loading each sub-component
   const LazyModule = createLazyComponent(
     () => import('./CompleteModule').then(m => ({ default: m.Module }))
   );
   ```

4. **Use Error Boundaries**
   ```tsx
   <LazyLoadErrorBoundary errorMessage="Failed to load">
     <LazyComponent />
   </LazyLoadErrorBoundary>
   ```

## Bundle Size Impact

Lazy loading these components can reduce initial bundle size:

| Component | Estimated Size | Savings with Lazy Load |
|-----------|---------------|------------------------|
| VersionHistory | ~200-300KB | High |
| ManageAccess | ~150-250KB | High |
| ConflictDetector | ~100-150KB | Medium |
| spForm (all) | ~300-500KB | High |

**Total potential savings: 750KB - 1.2MB** from initial bundle

## TypeScript Support

Full type safety with inferred props:

```tsx
import { VersionHistory } from './VersionHistory';

const LazyVersionHistory = createLazyComponent(
  () => import('./VersionHistory').then(m => ({ default: m.VersionHistory }))
);

// Props are inferred from VersionHistory component
<LazyVersionHistory
  itemId={123}        // ✅ Type-safe
  listId="abc"        // ✅ Type-safe
  invalidProp="test"  // ❌ TypeScript error
/>
```

## See Also

- [VersionHistory Component](../../components/VersionHistory/README.md)
- [ManageAccess Component](../../components/ManageAccess/README.md)
- [Performance Optimization Guide](../../../docs/performance.md)
