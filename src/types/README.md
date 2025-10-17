# Type Definitions

This directory contains TypeScript type definitions for the SPFx Toolkit.

## Files

### `fluentui-types.ts`

Custom type definitions extracted from Fluent UI to maintain tree-shaking optimization.

**Why we have this:**
- Fluent UI changed their export structure, making some types difficult to import with tree-shaking
- Importing from the main `@fluentui/react` package defeats tree-shaking (adds 2-3MB)
- These are simple enums and interfaces that we can safely duplicate

**Available exports:**
- `DirectionalHint` - Enum for tooltip/callout positioning

**Usage:**
```typescript
import { DirectionalHint } from 'spfx-toolkit/lib/types';

<TooltipHost directionalHint={DirectionalHint.topCenter}>
  Content
</TooltipHost>
```

### `batchOperationTypes.ts`

Type definitions for batch SharePoint operations.

### `listItemTypes.ts`

Type definitions for SharePoint list item operations.

### `permissionTypes.ts`

Type definitions for SharePoint permission management.

## Best Practices

### When to Add Types Here

✅ **DO add types when:**
- Fluent UI exports are not tree-shakable
- Simple enums/interfaces that don't change often
- Types that prevent importing from main packages

❌ **DON'T add types when:**
- Complex types that might change
- Types that require runtime code
- Types well-supported by tree-shakable imports

### Maintaining Compatibility

When adding Fluent UI types:
1. Document the original source in JSDoc
2. Keep values identical to Fluent UI
3. Add reference link to Fluent UI docs
4. Test with actual Fluent UI components

## See Also

- [OPTIMIZATION-SUMMARY.md](../../OPTIMIZATION-SUMMARY.md) - Tree-shaking guide
- [Fluent UI Documentation](https://developer.microsoft.com/en-us/fluentui)
