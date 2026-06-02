# Importing spfx-toolkit — Tree-Shakable Import Reference

> **Single source of truth.** This document is the authoritative reference for AI agents and developers consuming `spfx-toolkit` in SPFx projects. If another doc disagrees, this one wins for import paths.

---

## The Rule

**Always import from the deepest, most specific path available.** Never import from `spfx-toolkit` (root) — it pulls the entire library surface and breaks tree-shaking.

`spfx-toolkit/components` (the top barrel) is now restricted to **lightweight components only** (Card, ConflictDetector, DocumentLink, ErrorBoundary, GroupViewer, UserPersona, WorkflowStepper). If you only need those, the barrel is safe to use. For heavy components (DevExtreme, people-picker, PnP-augmentation-bound), always use the per-component deep subpath.

```typescript
// ✅ CORRECT — per-component deep subpath (minimal bundle, always safe)
import { Card } from 'spfx-toolkit/components/Card';
import { SPContext } from 'spfx-toolkit/utilities/context';

// ✅ ALSO OK — barrel is now lightweight-only
import { Card, ErrorBoundary, GroupViewer } from 'spfx-toolkit/components';

// ❌ WRONG — pulls the full library
import { Card } from 'spfx-toolkit';

// ❌ WRONG for heavy components — use the deep subpath instead
import { VersionHistory } from 'spfx-toolkit/components';   // not exported from barrel
import { SPDynamicForm } from 'spfx-toolkit/components';    // not exported from barrel
```

**Why:** The barrel `index.ts` files use `export *`, which causes bundlers to eagerly load every re-exported module. The toolkit ships compatibility proxy entrypoints so the subpaths below resolve in modern SPFx, classic SPFx, and `npm link` setups. Legacy `spfx-toolkit/lib/*` imports still work for backward compatibility and are required for a few specific cases (see [Legacy `lib/*` paths](#legacy-lib-paths)).

---

## 1. Top-Level Components

Each component has a dedicated export. Use the `./components/<Name>` form.

| Component | Canonical import |
|-----------|------------------|
| Card | `import { Card } from 'spfx-toolkit/components/Card';` |
| Comments | `import { Comments } from 'spfx-toolkit/components/Comments';` ⚠️ requires `react-mentions` peer — see note below |
| ConflictDetector | `import { ConflictDetector, useConflictDetection } from 'spfx-toolkit/components/ConflictDetector';` |
| DocumentLink | `import { DocumentLink } from 'spfx-toolkit/components/DocumentLink';` |
| ErrorBoundary | `import { ErrorBoundary, useErrorHandler } from 'spfx-toolkit/components/ErrorBoundary';` |
| GroupUsersPicker | `import { GroupUsersPicker } from 'spfx-toolkit/components/GroupUsersPicker';` |
| GroupViewer | `import { GroupViewer } from 'spfx-toolkit/components/GroupViewer';` |
| ManageAccess | `import { ManageAccess } from 'spfx-toolkit/components/ManageAccess';` |
| SPDynamicForm | `import { SPDynamicForm } from 'spfx-toolkit/components/SPDynamicForm';` |
| SPListItemAttachments | `import { SPListItemAttachments } from 'spfx-toolkit/components/SPListItemAttachments';` |
| SPNotificationBar | `import { SPNotificationBar } from 'spfx-toolkit/components/SPNotificationBar';` — also in the light barrel `spfx-toolkit/components` |
| SPSiteSelector | `import { SPSiteSelector } from 'spfx-toolkit/components/SPSiteSelector';` ⚠️ deep subpath only — NOT in `spfx-toolkit/components` barrel; requires `@pnp/sp/search` (loaded automatically) |
| UserPersona | `import { UserPersona } from 'spfx-toolkit/components/UserPersona';` |
| VersionHistory | `import { VersionHistory } from 'spfx-toolkit/components/VersionHistory';` |
| WorkflowStepper | `import { WorkflowStepper } from 'spfx-toolkit/components/WorkflowStepper';` |

> **Comments — `react-mentions` peer dependency required.** `Comments` uses `react-mentions` for @-mention support. This package is declared as an optional peer dependency in `spfx-toolkit`. Install it explicitly in your consuming project:
> ```bash
> npm install react-mentions@^4.4.0
> ```
> Without it, importing `spfx-toolkit/components/Comments` will fail at runtime. `react-mentions` does **not** resolve transitively through `@pnp/spfx-controls-react`.

Types live in the same module:

```typescript
import { Card, ICardProps } from 'spfx-toolkit/components/Card';
```

---

## 2. spForm — Form Building Blocks

`spForm` provides FormProvider, FormContext, layout primitives (FormItem/FormLabel/FormValue/FormError/FormCharCount), error summary, and 11 DevExtreme RHF wrappers. The `./components/spForm` subpath is a barrel — it pulls in **all** of these. For best tree-shaking when you only need a few pieces, import each from the `./lib/components/spForm/...` deep path.

### Layout primitives, context, and hooks

```typescript
// ✅ Barrel import is fine for the small layout/context pieces — they're cheap
import {
  FormProvider,
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
  FormError,
  FormDescription,
  FormCharCount,
  FormErrorSummary,
  useFormContext,
  useScrollToError,
  useZustandFormSync,
  useFormFieldError,
  useCharCount,
} from 'spfx-toolkit/components/spForm';
```

### DevExtreme wrappers (use deep imports for tree-shaking)

Each wrapper has its own file. When you only need one or two, prefer the deepest path:

```typescript
// ✅ BEST — only this wrapper + its deps land in the bundle
import DevExtremeTextBox from 'spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeTextBox';
import DevExtremeSelectBox from 'spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeSelectBox';

// 🟡 OK — barrel pulls all 11 DevExtreme wrappers + their devextreme-react deps
import { DevExtremeTextBox, DevExtremeSelectBox } from 'spfx-toolkit/components/spForm';
```

Available DevExtreme wrappers (each has its own file at the path shown):

| Wrapper | Deep path |
|---------|-----------|
| DevExtremeAutocomplete | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeAutocomplete` |
| DevExtremeCheckBox | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeCheckBox` |
| DevExtremeDateBox | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeDateBox` |
| DevExtremeFileUploader | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeFileUploader` |
| DevExtremeNumberBox | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeNumberBox` |
| DevExtremeRadioGroup | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeRadioGroup` |
| DevExtremeSelectBox | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeSelectBox` |
| DevExtremeSwitch | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeSwitch` |
| DevExtremeTagBox | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeTagBox` |
| DevExtremeTextArea | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeTextArea` |
| DevExtremeTextBox | `spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeTextBox` |

Validation types/helpers used by custom components:

```typescript
import type {
  IDevExtremeValidationProps,
  IResolvedDevExtremeValidation,
} from 'spfx-toolkit/components/spForm';
```

### PnP pickers (RHF-integrated)

```typescript
import { PnPPeoplePicker, PnPModernTaxonomyPicker } from 'spfx-toolkit/components/spForm';
```

---

## 3. spFields — SharePoint Field Components

The `./components/spFields` barrel exposes most field components, but **`SPLookupField` and `SPTaxonomyField` must be imported from `lib/` deep paths** (intentional — their PnP control CSS is opt-in).

### Standard SPField imports (via barrel — light)

```typescript
import {
  SPField,            // smart wrapper, picks the right control by field type
  SPTextField,
  SPChoiceField,
  SPDateField,
  SPNumberField,
  SPBooleanField,
  SPUrlField,
  SPUserField,
} from 'spfx-toolkit/components/spFields';
```

For finer tree-shaking, each component also has a deep path:

```typescript
// Best for tree-shaking a single field
import { SPTextField } from 'spfx-toolkit/lib/components/spFields/SPTextField';
import { SPChoiceField } from 'spfx-toolkit/lib/components/spFields/SPChoiceField';
import { SPDateField } from 'spfx-toolkit/lib/components/spFields/SPDateField';
import { SPNumberField } from 'spfx-toolkit/lib/components/spFields/SPNumberField';
import { SPBooleanField } from 'spfx-toolkit/lib/components/spFields/SPBooleanField';
import { SPUrlField } from 'spfx-toolkit/lib/components/spFields/SPUrlField';
import { SPUserField } from 'spfx-toolkit/lib/components/spFields/SPUserField';
import { SPField } from 'spfx-toolkit/lib/components/spFields/SPField';
```

### Documented exceptions — SPLookupField & SPTaxonomyField

These require the legacy deep path because they pull PnP SPFx control CSS that should only load when the field is actually used:

```typescript
// ✅ REQUIRED — only way to import these
import { SPLookupField } from 'spfx-toolkit/lib/components/spFields/SPLookupField';
import { SPTaxonomyField } from 'spfx-toolkit/lib/components/spFields/SPTaxonomyField';

// ❌ DOES NOT WORK — intentionally not exported from the barrel
import { SPLookupField } from 'spfx-toolkit/components/spFields';
```

### Validation helpers for custom components

```typescript
import {
  resolveFieldValidationState,
  shouldRenderFieldValidationMessage,
  addValidateRule,
  hasValue,
} from 'spfx-toolkit/components/spFields';
```

---

## 4. Hooks

Most hooks are re-exported through the `./hooks` barrel, which is fine for the lightweight general-purpose hooks. The data-fetching hooks (`useListItems`, `useSPPagedQuery`, `useSPFieldMetadata`, `useSharePointSearch`) and the debounce hooks (`useDebouncedValue`, `useDebouncedCallback`) also have per-hook deep paths for maximum tree-shaking.

```typescript
// ✅ Barrel — fine for lightweight hooks
import { useLocalStorage, useViewport } from 'spfx-toolkit/hooks';

// ✅ Per-hook deep path — saves bundle bytes when you only need one hook
import { useDebouncedValue, useDebouncedCallback } from 'spfx-toolkit/lib/hooks/useDebouncedValue';
import { useListItems } from 'spfx-toolkit/lib/hooks/useListItems';
import { useSPPagedQuery } from 'spfx-toolkit/lib/hooks/useSPPagedQuery';
import { useSPFieldMetadata } from 'spfx-toolkit/lib/hooks/useSPFieldMetadata';
import { useSharePointSearch } from 'spfx-toolkit/lib/hooks/useSharePointSearch';
```

### Hook reference

| Hook | Import (barrel) | Deep path | Signature / return |
|------|----------------|-----------|--------------------|
| `useLocalStorage` | `spfx-toolkit/hooks` | — | `[value, setValue]` |
| `useViewport` | `spfx-toolkit/hooks` | — | `{ isMobile, isTablet, isDesktop }` |
| `useDebouncedValue` | `spfx-toolkit/hooks` | `spfx-toolkit/lib/hooks/useDebouncedValue` | `useDebouncedValue<T>(value, delayMs): T` |
| `useDebouncedCallback` | `spfx-toolkit/hooks` | `spfx-toolkit/lib/hooks/useDebouncedValue` | `useDebouncedCallback(fn, delayMs): fn` |
| `useListItems` | `spfx-toolkit/hooks` | `spfx-toolkit/lib/hooks/useListItems` | `({ listId, select?, filter?, orderBy?, top?, expand?, caml?, enabled?, sp? }) => { items, loading, error, refresh, count }` |
| `useSPPagedQuery` | `spfx-toolkit/hooks` | `spfx-toolkit/lib/hooks/useSPPagedQuery` | `({ listId, … }) => { pages, items, loadMore, hasMore, loading, error, reset }` |
| `useSPFieldMetadata` | `spfx-toolkit/hooks` | `spfx-toolkit/lib/hooks/useSPFieldMetadata` | `({ listId }) => { fields, loading, error, refresh }` — sessionStorage-cached |
| `useSharePointSearch` | `spfx-toolkit/hooks` | `spfx-toolkit/lib/hooks/useSharePointSearch` | `<T>({ query, selectProperties?, rowLimit?, trimDuplicates?, sourceId?, enabled?, sp? }) => { results, totalRows, loading, error, refresh }` — requires `@pnp/sp/search` (loaded automatically) |

(Component-specific hooks live with their component — e.g. `useConflictDetection` is exported from `spfx-toolkit/components/ConflictDetector`, `useCardController` from `spfx-toolkit/components/Card`.)

---

## 5. Utilities

Each utility has a dedicated subpath. Always import the specific one you need.

| Utility | Canonical import |
|---------|------------------|
| SPContext (multi-site, logging, PnP) | `import { SPContext } from 'spfx-toolkit/utilities/context';` |
| BatchBuilder | `import { BatchBuilder } from 'spfx-toolkit/utilities/batchBuilder';` |
| PermissionHelper | `import { PermissionHelper } from 'spfx-toolkit/utilities/permissionHelper';` |
| ListItemHelper | `import { createSPExtractor, createSPUpdater } from 'spfx-toolkit/utilities/listItemHelper';` |
| StringUtils | `import { ... } from 'spfx-toolkit/utilities/stringUtils';` |
| DateUtils | `import { ... } from 'spfx-toolkit/utilities/dateUtils';` |
| HtmlUtils | `import { sanitizeHtml } from 'spfx-toolkit/utilities/htmlUtils';` |
| CssLoader | `import { loadCss } from 'spfx-toolkit/utilities/CssLoader';` |
| LazyLoader | `import { createLazyComponent } from 'spfx-toolkit/utilities/lazyLoader';` |
| DialogService | `import { DialogService } from 'spfx-toolkit/utilities/dialogService';` |
| BrowserStorage | `import { ... } from 'spfx-toolkit/utilities/browserStorage';` |
| UserPhotoHelper | `import { ... } from 'spfx-toolkit/utilities/userPhotoHelper';` |
| SPHelper | `import { ... } from 'spfx-toolkit/utilities/spHelper';` |
| CamlBuilder | `import { CamlBuilder } from 'spfx-toolkit/utilities/camlBuilder';` |
| Notifications (imperative + hook) | `import { notify, dismiss, dismissAll, useNotifications } from 'spfx-toolkit/utilities/notifications';` |
| Debug (bridge utilities) | `import { attachHttpInspector, SPDebug } from 'spfx-toolkit/utilities/debug';` — see [§15 SPDebug Panel](#15-spdebug-panel) |

❌ Do NOT use `spfx-toolkit/utils` or `spfx-toolkit/utilities` (barrels — pulls everything).

---

## 6. PnP Imports (Required Setup)

Centralize PnP module imports once per web part using these dedicated bundles. They register typings globally for `@pnp/sp` operations:

```typescript
// src/webparts/pnpImports.ts — import in your web part entry
import 'spfx-toolkit/utilities/context/pnpImports/core';
import 'spfx-toolkit/utilities/context/pnpImports/lists';
import 'spfx-toolkit/utilities/context/pnpImports/content';

// Optional bundles — only import what you use
import 'spfx-toolkit/utilities/context/pnpImports/files';
import 'spfx-toolkit/utilities/context/pnpImports/search';
import 'spfx-toolkit/utilities/context/pnpImports/taxonomy';
import 'spfx-toolkit/utilities/context/pnpImports/security';
```

Available bundle keys: `core`, `lists`, `content`, `files`, `search`, `taxonomy`, `security`.

---

## 7. Lazy Components (On-Demand Heavy Features)

For heavy components (VersionHistory, ManageAccess, ConflictDetector, WorkflowStepper) you can defer loading until first render with the lazy wrappers:

```typescript
import {
  LazyVersionHistory,
  LazyManageAccessComponent,
  LazyManageAccessPanel,
  LazyConflictDetector,
  LazyWorkflowStepper,
  preloadComponent,
  useLazyPreload,
} from 'spfx-toolkit/components/lazy';
```

Use these when the heavy component is only sometimes rendered (e.g. behind a button click or in a panel).

---

## 8. Global Types

Cross-cutting types (e.g. `IPrincipal`) live in the dedicated types barrel:

```typescript
import type { IPrincipal } from 'spfx-toolkit/types';
```

Component-specific types stay co-located with the component:

```typescript
import { Card, ICardProps } from 'spfx-toolkit/components/Card';
import type { IFormErrorSummaryError } from 'spfx-toolkit/components/spForm';
```

---

## 9. CSS Requirements

### Toolkit CSS

Toolkit components ship their own CSS automatically — no manual import needed.

### DevExtreme styles (required if you use any DevExtreme wrapper)

Import once globally in your web part entry:

```typescript
import 'devextreme/dist/css/dx.light.css';
// or 'devextreme/dist/css/dx.dark.css'
// or 'devextreme/dist/css/dx.material.blue.light.css'
```

### Fluent UI

Already loaded by SPFx. No action needed.

---

## 10. Fluent UI inside the toolkit

When the toolkit's source uses Fluent UI, it imports from tree-shakable subpaths. **Consuming apps should follow the same rule**:

```typescript
// ✅ CORRECT — adds only the Button to the bundle
import { Button } from '@fluentui/react/lib/Button';
import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react/lib/Stack';

// ❌ WRONG — pulls the entire Fluent UI library (200-500KB+)
import { Button, Text, Stack } from '@fluentui/react';
```

See [FluentUI-TreeShaking-Guide.md](./FluentUI-TreeShaking-Guide.md) for the full per-control reference.

---

## 11. Forbidden Patterns

| Pattern | Why it's wrong |
|---------|---------------|
| `import { X } from 'spfx-toolkit'` | Pulls the root barrel — entire library, including all DevExtreme wrappers. |
| `import { VersionHistory } from 'spfx-toolkit/components'` | Heavy components (VersionHistory, SPDynamicForm, ManageAccess, Comments, GroupUsersPicker, spForm, spFields, SPListItemAttachments, userAccess, SPSiteSelector) are intentionally excluded from the barrel. Use their deep subpath. |
| `import { X } from 'spfx-toolkit/utils'` | Pulls every utility (alias for `spfx-toolkit/utilities`). |
| `import { X } from 'spfx-toolkit/utilities'` | Same as above — pulls every utility. |
| `import { SPLookupField } from 'spfx-toolkit/components/spFields'` | Intentionally not exported from the barrel — use the `lib/` path. |
| `import { Button } from '@fluentui/react'` | Bare Fluent UI barrel — pulls the entire library. |
| Adding any package that isn't a listed peer dependency | The toolkit has zero runtime deps; consuming apps inherit the constraint. |

---

## 12. Legacy `lib/*` paths

The `./lib/*` wildcard remains in `package.json` for two reasons:

1. **Backward compatibility** with older imports like `spfx-toolkit/lib/components/Card`.
2. **Tree-shaking the toolkit's own internals** that aren't surfaced as official subpaths (the DevExtreme wrappers, individual SP fields, the SPLookupField/SPTaxonomyField exceptions).

For new code, prefer the canonical `./components/<Name>` paths above. Reach for `./lib/*` only when you need finer granularity than the official subpaths provide.

---

## 13. Cheat Sheet — Common Scenarios

**A simple page with one form field and a card:**
```typescript
import { SPContext } from 'spfx-toolkit/utilities/context';
import { Card } from 'spfx-toolkit/components/Card';
import { SPTextField } from 'spfx-toolkit/lib/components/spFields/SPTextField';
```

**A complex form with multiple DevExtreme wrappers and FormErrorSummary:**
```typescript
import {
  FormProvider,
  FormContainer,
  FormItem,
  FormLabel,
  FormValue,
  FormErrorSummary,
  useScrollToError,
} from 'spfx-toolkit/components/spForm';
import DevExtremeTextBox from 'spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeTextBox';
import DevExtremeSelectBox from 'spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeSelectBox';
import DevExtremeDateBox from 'spfx-toolkit/lib/components/spForm/DevExtremeControls/DevExtremeDateBox';
```

**A dynamic form driven by SharePoint metadata:**
```typescript
import { SPDynamicForm } from 'spfx-toolkit/components/SPDynamicForm';
import { SPContext } from 'spfx-toolkit/utilities/context';
```

**A web part using PnP for SharePoint operations:**
```typescript
// pnpImports.ts (loaded once per web part entry)
import 'spfx-toolkit/utilities/context/pnpImports/core';
import 'spfx-toolkit/utilities/context/pnpImports/lists';

// Component file
import { SPContext } from 'spfx-toolkit/utilities/context';
import { BatchBuilder } from 'spfx-toolkit/utilities/batchBuilder';
```

**Heavy components behind user interaction (lazy):**
```typescript
import { LazyVersionHistory, LazyManageAccessPanel } from 'spfx-toolkit/components/lazy';
```

**A reactive list read with optional CAML filter:**
```typescript
import { useListItems } from 'spfx-toolkit/lib/hooks/useListItems';
import { CamlBuilder } from 'spfx-toolkit/utilities/camlBuilder';

const caml = CamlBuilder.where().field('Status').neq('Completed').orderBy('Created', false).rowLimit(50).build();
const { items, loading, error, refresh } = useListItems<ITask>({ listId: 'Tasks', caml });
```

**Paged / infinite-scroll list read:**
```typescript
import { useSPPagedQuery } from 'spfx-toolkit/lib/hooks/useSPPagedQuery';

const { items, loadMore, hasMore, loading } = useSPPagedQuery<ITask>({ listId: 'Tasks', top: 20 });
```

**Inspect a list's field schema:**
```typescript
import { useSPFieldMetadata } from 'spfx-toolkit/lib/hooks/useSPFieldMetadata';

const { fields, loading } = useSPFieldMetadata({ listId: 'Tasks' });
```

**Debounce a search input:**
```typescript
import { useDebouncedValue } from 'spfx-toolkit/lib/hooks/useDebouncedValue';

const debouncedQuery = useDebouncedValue(searchQuery, 300);
```

**KQL search across SharePoint (typed results):**
```typescript
// Add the search augmentation once, near your web part entry
import 'spfx-toolkit/utilities/context/pnpImports/search';

import { useSharePointSearch } from 'spfx-toolkit/lib/hooks/useSharePointSearch';

interface ISiteResult { Title?: string; Path?: string; SiteId?: string; }

const { results, totalRows, loading, error } = useSharePointSearch<ISiteResult>({
  query: 'contentclass:STS_Site contoso',
  selectProperties: ['Title', 'Path', 'SiteId'],
  rowLimit: 8,
});
```

**Search-backed site picker:**
```typescript
// ⚠️ DEEP SUBPATH ONLY — not exported from spfx-toolkit/components barrel
import { SPSiteSelector } from 'spfx-toolkit/components/SPSiteSelector';
import type { ISPSiteItem } from 'spfx-toolkit/components/SPSiteSelector';

// Requires @pnp/sp/search to be loaded (loaded automatically by the component)
<SPSiteSelector
  placeholder="Search for a site..."
  rowLimit={8}
  onSiteSelected={(site: ISPSiteItem) => console.log(site.url)}
/>
```

**Toast notifications (global, works outside React):**
```typescript
// Place the bar once, at your web part root:
import { SPNotificationBar } from 'spfx-toolkit/components/SPNotificationBar';
<SPNotificationBar position="top" maxVisible={5} />

// Trigger from anywhere — no React context needed:
import { notify, dismiss, dismissAll } from 'spfx-toolkit/utilities/notifications';

notify({ type: 'success', message: 'Item saved.' });
notify({ type: 'error', message: 'Failed to load data.' });   // sticky — no auto-dismiss
notify({ type: 'warning', message: 'Session expiring soon.', duration: 8000 });
dismiss(id);     // cancel one
dismissAll();    // clear all

// Or subscribe in a component:
import { useNotifications } from 'spfx-toolkit/utilities/notifications';
const { notifications, notify, dismiss } = useNotifications();
```

---

## 14. User Access

The `userAccess` family of components provides self-service and admin-facing SharePoint permission UIs.

| Symbol | Import path |
|---|---|
| `MyAccessView` | `spfx-toolkit/components/userAccess/MyAccessView` |
| `UserAccessAdmin` | `spfx-toolkit/components/userAccess/UserAccessAdmin` |
| `GroupMembersList` | `spfx-toolkit/components/userAccess/GroupMembersList` |
| `PermissionLevelBadge` | `spfx-toolkit/components/userAccess/PermissionLevelBadge` |
| `RequirePermission` | `spfx-toolkit/components/userAccess/RequirePermission` |
| `UserGroupChips` | `spfx-toolkit/components/userAccess/UserGroupChips` |
| `DirectPermissionsTable` | `spfx-toolkit/components/userAccess/DirectPermissionsTable` |
| `userAccessService`, `UserAccessError`, types | `spfx-toolkit/utilities/userAccess` |
| `useUserAccess`, `useEffectiveListPermission`, `useEffectiveItemPermission`, `useSiteGroups`, `useGroupMembers`, `useGroupMembershipEditor`, `useUserAccessComparison`, `useHasPermission`, `useBrokenInheritanceLists` | `spfx-toolkit/hooks` |

All types travel with their component:

```typescript
import { MyAccessView, IMyAccessViewProps } from 'spfx-toolkit/components/userAccess/MyAccessView';
import { UserAccessAdmin, IUserAccessAdminProps } from 'spfx-toolkit/components/userAccess/UserAccessAdmin';
import { GroupMembersList, IGroupMembersListProps } from 'spfx-toolkit/components/userAccess/GroupMembersList';
```

---

## 15. SPDebug Panel

The SPDebug panel is an opt-in diagnostic overlay for development/staging. It now includes six tabs: **Console**, **Data**, **Workflows**, **Network**, **Permissions (Perms)**, and **Fields**.

### Provider and hooks (from `spfx-toolkit/components/debug`)

```typescript
import {
  SPDebugProvider,           // wraps your web part root — renders the panel
  useSPDebugEnabled,         // boolean — is the panel open?
  useSPDebugValue,           // push a single key/value into the Data tab
  useSPDebugTable,           // push a table into the Data tab
  useSPDebugTimer,           // time a span and display it
  useSPDebugTrace,           // structured trace for async operations
  useSPDebugSession,         // export / clear the current session
  useSPDebugPermission,      // feed the Permissions tab (see below)
  useSPDebugFormFields,      // feed the Fields tab (see below)
} from 'spfx-toolkit/components/debug';
```

### Network tab — `attachHttpInspector` (from `spfx-toolkit/utilities/debug`)

Opt in to REST call inspection by attaching the inspector to the SPContext HTTP client:

```typescript
import { attachHttpInspector } from 'spfx-toolkit/utilities/debug';

// Option A — attach programmatically after SPContext is initialised
attachHttpInspector(SPContext.http, { slowThresholdMs: 1000 });

// Option B — declarative, via SPDebugProvider props
<SPDebugProvider http={SPContext.http} httpInspector={{ slowThresholdMs: 1000 }}>
  <App />
</SPDebugProvider>
```

`HttpInspectorOptions`:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `slowThresholdMs` | `number` | `3000` | Requests slower than this are flagged |
| `redactQueryStringKeys` | `string[]` | built-in list | Query-string keys to redact before logging |
| `maxRows` | `number` | `200` | Max network rows retained in memory |

### Permissions tab — `useSPDebugPermission`

```typescript
import { useSPDebugPermission } from 'spfx-toolkit/components/debug';
import { useHasPermission } from 'spfx-toolkit/hooks';

function MyComponent() {
  const { allowed, loading } = useHasPermission('EditListItems');
  useSPDebugPermission('Edit list items', allowed, loading);
  // …
}
```

Signature: `useSPDebugPermission(label: string, allowed: boolean | undefined, loading?: boolean): void`

### Fields tab — `useSPDebugFormFields`

```typescript
import { useSPDebugFormFields } from 'spfx-toolkit/components/debug';

function MyForm() {
  const onResolvedField = useSPDebugFormFields();
  return (
    <SPDynamicForm
      listId="…"
      onResolvedField={onResolvedField}
    />
  );
}
```

`useSPDebugFormFields()` returns a callback compatible with `SPDynamicForm`'s `onResolvedField` prop. Each resolved field is surfaced in the panel's Fields tab.

---

## 16. Bundle Verification

After importing, verify the bundle impact in your SPFx project:

```bash
gulp bundle --ship --analyze-bundle
```

Look for unexpected `devextreme-*`, `@pnp/spfx-controls-react/*`, or large toolkit chunks in your web part bundle. If you see them and didn't intend to use those features, you have a barrel import somewhere — switch to the deepest subpath.

---

**Maintainer note:** When adding a new component to the toolkit, also add (1) an entry to `package.json` `exports`, (2) a row to the appropriate table above, and (3) a usage example in the relevant README. Keeping all three in sync is what makes this doc trustworthy for AI agents.
