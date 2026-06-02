# AI Assistant Guide — Consuming `spfx-toolkit`

> Drop this file into a **consuming SPFx project** so any AI coding assistant (Claude Code / Claude, GitHub Copilot, Cursor, etc.) uses the published `spfx-toolkit` package correctly. This is guidance about **using** the package — not developing the toolkit itself. Authoritative import paths live in [`node_modules/spfx-toolkit/docs/Importing-Components.md`](./Importing-Components.md); when in doubt, copy paths from there.

---

## 1. What this package is

`spfx-toolkit` is a tree-shakable library of React 17 components, hooks, and utilities for SharePoint Framework (SPFx) **>= 1.21.1**. It has **zero runtime dependencies** — everything it uses is a **peer dependency** the consuming project provides. Import only the deep subpaths you need so bundlers can tree-shake; never pull the package root.

---

## 2. Golden rules for the assistant

- **Initialize `SPContext` first.** Call `await SPContext.smart(this.context, 'MyWebPart')` in the web part's `onInit()` **before** `render()`. Components and data hooks throw or no-op without it.
- **Never import from the package root** `spfx-toolkit`. It pulls the entire library and breaks tree-shaking.
- **Import from canonical subpaths**: `spfx-toolkit/components/<Name>`, `spfx-toolkit/hooks`, `spfx-toolkit/utilities/<name>`. For maximum tree-shaking use the deep `spfx-toolkit/lib/...` paths.
- **The `spfx-toolkit/components` barrel is LIGHTWEIGHT-ONLY.** It safely exposes only: Card, ConflictDetector, DocumentLink, ErrorBoundary, GroupViewer, UserPersona, WorkflowStepper, SPNotificationBar. **Heavy components are NOT in the barrel** and MUST be imported via their deep subpath: `Comments`, `spForm`, `spFields`, `SPDynamicForm`, `VersionHistory`, `ManageAccess`, `SPListItemAttachments`, `GroupUsersPicker`, `userAccess`, `SPSiteSelector`.
- **Use tree-shakable Fluent UI imports** — `import { Button } from '@fluentui/react/lib/Button'`, never the bare barrel `import { Button } from '@fluentui/react'` (pulls 200–500KB+).
- **Install only the peer deps a chosen feature needs** — see the matrix in §3. The `@microsoft/sp-*` packages are host-injected by SPFx (already present); don't add them.
- **Never add a non-peer-dependency package.** The toolkit has zero runtime deps and the consuming app inherits that constraint.
- **Pass stable references to data hooks.** Don't pass a freshly-created `sp` instance or inline options object that changes every render — it re-fires the query.

---

## 3. Peer-dependency matrix

The toolkit's `peerDependencies` are all that consumers may install. `peerDependenciesMeta` marks the SPFx `@microsoft/sp-*` packages plus several feature libraries as **optional** — install them only when a feature requires them.

| Feature / Component | Peer deps to install (beyond core React + `@fluentui/react` + `@pnp/sp`) |
|---|---|
| `SPContext`, most hooks, Card, UserPersona, GroupViewer, ErrorBoundary, ConflictDetector, WorkflowStepper, DocumentLink | none extra (`@pnp/sp`, `@pnp/queryable`, `@fluentui/react`, `react`, `react-dom`) |
| `DocumentLink` (file-type icons), `ManageAccess`, PnP people pickers (`PnPPeoplePicker`) | `@pnp/spfx-controls-react@^3.22.0` |
| `Comments` (@-mentions) | `react-mentions@^4.4.0` — optional peer; **does not** resolve transitively, install explicitly |
| `VersionHistory`, `GroupUsersPicker`, `spForm` (DevExtreme wrappers), `spFields` | `devextreme@^22.2.3`, `devextreme-react@^22.2.3` (+ `import 'devextreme/dist/css/dx.light.css'` once) |
| `spForm`, `SPDynamicForm`, `spFields`, RHF-integrated pickers | `react-hook-form@^7.45.4`, `zustand@^4.3.9` (+ optional `@hookform/resolvers`, `zod` for schema validation) |
| `spForm` taxonomy/people pickers (`PnPModernTaxonomyPicker`) | `@pnp/spfx-controls-react@^3.22.0` |
| `SPSiteSelector`, `useSharePointSearch` | `@pnp/sp/search` — loaded automatically by the feature; add `pnpImports/search` augmentation for typings |
| `@microsoft/sp-*` (component-base, core-library, http, loader, webpart-base, etc.) | **host-injected** — already present in any SPFx project; do not install |

CSS: toolkit components ship their own CSS automatically. Fluent UI CSS is already loaded by SPFx. DevExtreme CSS must be imported once globally if you use any DevExtreme wrapper.

---

## 4. Complete import index

Every path below exists in `spfx-toolkit`'s `package.json` `exports` (or is a valid `./lib/*` deep path). Types travel with their module.

### Components

| Name | Import path | Purpose |
|---|---|---|
| Card | `spfx-toolkit/components/Card` | Expandable content container (also in light barrel) |
| ConflictDetector | `spfx-toolkit/components/ConflictDetector` | Concurrent-edit detection (+ `useConflictDetection`) |
| DocumentLink | `spfx-toolkit/components/DocumentLink` | Rich SharePoint file link with hover card/preview |
| ErrorBoundary | `spfx-toolkit/components/ErrorBoundary` | Error boundary wrapper (+ `useErrorHandler`) |
| GroupViewer | `spfx-toolkit/components/GroupViewer` | SharePoint group + members display |
| UserPersona | `spfx-toolkit/components/UserPersona` | User profile/persona display |
| WorkflowStepper | `spfx-toolkit/components/WorkflowStepper` | Process/approval flow visualization |
| SPNotificationBar | `spfx-toolkit/components/SPNotificationBar` | Toast/notification host (also in light barrel) |
| Comments | `spfx-toolkit/components/Comments` | List-item comments with @-mentions (needs `react-mentions`) |
| GroupUsersPicker | `spfx-toolkit/components/GroupUsersPicker` | Group-scoped people picker (DevExtreme) |
| ManageAccess | `spfx-toolkit/components/ManageAccess` | Permission management UI (PnP controls) |
| VersionHistory | `spfx-toolkit/components/VersionHistory` | Version history/comparison (DevExtreme) |
| SPDynamicForm | `spfx-toolkit/components/SPDynamicForm` | Metadata-driven dynamic form |
| SPListItemAttachments | `spfx-toolkit/components/SPListItemAttachments` | List-item attachment management |
| SPSiteSelector | `spfx-toolkit/components/SPSiteSelector` | Search-backed site picker (deep subpath only) |
| MyAccessView | `spfx-toolkit/components/userAccess/MyAccessView` | Self-service "what can I see" view |
| UserAccessAdmin | `spfx-toolkit/components/userAccess/UserAccessAdmin` | Admin access investigation + bulk group editor |
| GroupMembersList | `spfx-toolkit/components/userAccess/GroupMembersList` | List members of a SharePoint group |
| PermissionLevelBadge | `spfx-toolkit/components/userAccess/PermissionLevelBadge` | Permission-level badge primitive |
| RequirePermission | `spfx-toolkit/components/userAccess/RequirePermission` | Gate children behind a permission |
| UserGroupChips | `spfx-toolkit/components/userAccess/UserGroupChips` | Group-membership chip list |
| DirectPermissionsTable | `spfx-toolkit/components/userAccess/DirectPermissionsTable` | Direct (non-inherited) permission table |
| spForm suite | `spfx-toolkit/components/spForm` | FormProvider/FormItem/… + 11 DevExtreme RHF wrappers + PnP pickers |
| DevExtreme wrappers (single) | `spfx-toolkit/lib/components/spForm/DevExtremeControls/<Wrapper>` | One wrapper only, e.g. `DevExtremeTextBox`, `DevExtremeSelectBox`, `DevExtremeDateBox`, `DevExtremeTagBox` … |
| spFields suite | `spfx-toolkit/components/spFields` | SPField smart wrapper + typed SP field controls |
| SPLookupField / SPTaxonomyField | `spfx-toolkit/lib/components/spFields/SPLookupField` / `…/SPTaxonomyField` | Field controls excluded from barrel (opt-in PnP CSS) |
| Lazy heavy components | `spfx-toolkit/components/lazy` | `LazyVersionHistory`, `LazyManageAccessPanel`, `LazyConflictDetector`, `LazyWorkflowStepper`, `preloadComponent`, `useLazyPreload` |

### Hooks

| Name | Import path | Purpose |
|---|---|---|
| useLocalStorage | `spfx-toolkit/hooks` | Persistent state in localStorage |
| useViewport | `spfx-toolkit/hooks` | Responsive breakpoint flags |
| useDebouncedValue | `spfx-toolkit/hooks` (deep: `spfx-toolkit/lib/hooks/useDebouncedValue`) | Debounce a value |
| useDebouncedCallback | `spfx-toolkit/hooks` (deep: `spfx-toolkit/lib/hooks/useDebouncedValue`) | Debounce a callback |
| useListItems | `spfx-toolkit/hooks` (deep: `spfx-toolkit/lib/hooks/useListItems`) | Reactive list read (select/filter/orderBy/caml/…) |
| useSPPagedQuery | `spfx-toolkit/hooks` (deep: `spfx-toolkit/lib/hooks/useSPPagedQuery`) | Paged / infinite-scroll list read |
| useSPFieldMetadata | `spfx-toolkit/hooks` (deep: `spfx-toolkit/lib/hooks/useSPFieldMetadata`) | Read a list's field schema (sessionStorage-cached) |
| useSharePointSearch | `spfx-toolkit/hooks` (deep: `spfx-toolkit/lib/hooks/useSharePointSearch`) | KQL search (needs `@pnp/sp/search`) |
| useUserAccess | `spfx-toolkit/hooks` | Aggregate effective access for a user |
| useEffectiveListPermission | `spfx-toolkit/hooks` | Effective permission on a list |
| useEffectiveItemPermission | `spfx-toolkit/hooks` | Effective permission on a list item |
| useSiteGroups | `spfx-toolkit/hooks` | Site groups |
| useGroupMembers | `spfx-toolkit/hooks` | Members of a group |
| useGroupMembershipEditor | `spfx-toolkit/hooks` | Add/remove group members |
| useUserAccessComparison | `spfx-toolkit/hooks` | Compare access between users |
| useHasPermission | `spfx-toolkit/hooks` | Boolean permission check |
| useBrokenInheritanceLists | `spfx-toolkit/hooks` | Lists with broken permission inheritance |
| useNotifications | `spfx-toolkit/utilities/notifications` | Subscribe to / trigger toasts inside React |
| Component-local hooks | with their component | e.g. `useConflictDetection` (ConflictDetector), `useCardController` (Card), `useDocumentMetadata` (DocumentLink), `useGroupUsers` (GroupUsersPicker) |

> Pass a stable `sp` (e.g. `SPContext.sp`) and memoized options to the data hooks; unstable references re-trigger fetches.

### Utilities

| Name | Import path | Purpose |
|---|---|---|
| SPContext | `spfx-toolkit/utilities/context` | SPFx context, PnP instances, logging, multi-site |
| PnP import bundles | `spfx-toolkit/utilities/context/pnpImports/<key>` | Register PnP typings once: `core`, `lists`, `content`, `files`, `search`, `taxonomy`, `security` |
| BatchBuilder | `spfx-toolkit/utilities/batchBuilder` | Batched SharePoint operations |
| PermissionHelper | `spfx-toolkit/utilities/permissionHelper` | Permission validation helpers |
| ListItemHelper | `spfx-toolkit/utilities/listItemHelper` | `createSPExtractor`, `createSPUpdater` |
| StringUtils | `spfx-toolkit/utilities/stringUtils` | String helpers |
| DateUtils | `spfx-toolkit/utilities/dateUtils` | Date helpers |
| HtmlUtils | `spfx-toolkit/utilities/htmlUtils` | `sanitizeHtml` |
| CssLoader | `spfx-toolkit/utilities/CssLoader` | `loadCss` |
| LazyLoader | `spfx-toolkit/utilities/lazyLoader` | `createLazyComponent` |
| DialogService | `spfx-toolkit/utilities/dialogService` | Imperative dialogs |
| BrowserStorage | `spfx-toolkit/utilities/browserStorage` | Typed local/session storage |
| UserPhotoHelper | `spfx-toolkit/utilities/userPhotoHelper` | User photo URLs |
| SPHelper | `spfx-toolkit/utilities/spHelper` | Misc SharePoint helpers |
| CamlBuilder | `spfx-toolkit/utilities/camlBuilder` | Fluent CAML query builder |
| Notifications (imperative) | `spfx-toolkit/utilities/notifications` | `notify`, `dismiss`, `dismissAll` (works outside React) |
| userAccess service/types | `spfx-toolkit/utilities/userAccess` | `userAccessService`, `UserAccessError`, types |

> Never use `spfx-toolkit/utils` or `spfx-toolkit/utilities` (whole-barrel) — import the specific utility.

### Debug (SPDebug panel — opt-in, dev/staging)

| Name | Import path | Purpose |
|---|---|---|
| SPDebugProvider | `spfx-toolkit/components/debug` | Wrap web part root; renders the diagnostic panel |
| useSPDebugEnabled | `spfx-toolkit/components/debug` | Is the panel open? |
| useSPDebugValue | `spfx-toolkit/components/debug` | Push a key/value into the Data tab |
| useSPDebugTable | `spfx-toolkit/components/debug` | Push a table into the Data tab |
| useSPDebugTimer | `spfx-toolkit/components/debug` | Time a span |
| useSPDebugTrace | `spfx-toolkit/components/debug` | Structured async trace |
| useSPDebugSession | `spfx-toolkit/components/debug` | Export / clear the session |
| useSPDebugPermission | `spfx-toolkit/components/debug` | Feed the Permissions tab |
| useSPDebugFormFields | `spfx-toolkit/components/debug` | Feed the Fields tab (for `SPDynamicForm onResolvedField`) |
| attachHttpInspector | `spfx-toolkit/utilities/debug` | Attach REST inspector to `SPContext.http` (Network tab) |
| SPDebug | `spfx-toolkit/utilities/debug` | Debug bridge utility |

---

## 5. Copy-paste starter patterns

**Web part `onInit` + SPContext init (always first):**
```typescript
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPContext } from 'spfx-toolkit/utilities/context';

export default class MyWebPart extends BaseClientSideWebPart<{}> {
  protected async onInit(): Promise<void> {
    await super.onInit();
    await SPContext.smart(this.context, 'MyWebPart'); // before render()
  }
  public render(): void { /* ReactDom.render(...) */ }
}
```

**Reading a list with `useListItems` + a `CamlBuilder` filter:**
```typescript
import { useListItems } from 'spfx-toolkit/lib/hooks/useListItems';
import { CamlBuilder } from 'spfx-toolkit/utilities/camlBuilder';

const caml = CamlBuilder.where()
  .field('Status').neq('Completed')
  .orderBy('Created', false)
  .rowLimit(50)
  .build();

const { items, loading, error, refresh } = useListItems<ITask>({ listId: 'Tasks', caml });
```

**Dynamic / complex forms** — import via the deep subpath (not the barrel):
```typescript
import { SPDynamicForm } from 'spfx-toolkit/components/SPDynamicForm';
// or hand-built forms: import { FormContainer, FormItem, DevExtremeTextBox } from 'spfx-toolkit/components/spForm';
// remember: import 'devextreme/dist/css/dx.light.css'; once, and install react-hook-form + zustand + devextreme(-react)
```

**Toasts with `useNotifications` + `<SPNotificationBar />`:**
```typescript
// Place the bar once at the web part root:
import { SPNotificationBar } from 'spfx-toolkit/components/SPNotificationBar';
<SPNotificationBar position="top" maxVisible={5} />

// Trigger from anywhere (no React context needed):
import { notify, dismissAll } from 'spfx-toolkit/utilities/notifications';
notify({ type: 'success', message: 'Item saved.' });
notify({ type: 'error', message: 'Failed to load.' }); // sticky

// Or inside a component:
import { useNotifications } from 'spfx-toolkit/utilities/notifications';
const { notifications, notify, dismiss } = useNotifications();
```

**SPDebug panel + Network tab (REST inspection):**
```typescript
import { SPDebugProvider } from 'spfx-toolkit/components/debug';
import { SPContext } from 'spfx-toolkit/utilities/context';

// Pass http to enable the Network tab. slowThresholdMs flags slow calls.
<SPDebugProvider http={SPContext.http} httpInspector={{ slowThresholdMs: 1000 }}>
  <App />
</SPDebugProvider>

// Or attach programmatically after SPContext init:
import { attachHttpInspector } from 'spfx-toolkit/utilities/debug';
attachHttpInspector(SPContext.http, { slowThresholdMs: 1000 });
```

---

## 6. Common mistakes to avoid

| Don't | Do |
|---|---|
| `import { Card } from 'spfx-toolkit'` | `import { Card } from 'spfx-toolkit/components/Card'` |
| Render components before `SPContext` init | `await SPContext.smart(this.context, 'MyWebPart')` in `onInit()` |
| `import { Button } from '@fluentui/react'` | `import { Button } from '@fluentui/react/lib/Button'` |
| `import { VersionHistory } from 'spfx-toolkit/components'` (barrel) | `import { VersionHistory } from 'spfx-toolkit/components/VersionHistory'` |
| `import { SPLookupField } from 'spfx-toolkit/components/spFields'` | `import { SPLookupField } from 'spfx-toolkit/lib/components/spFields/SPLookupField'` |
| Use `Comments`/`VersionHistory`/`spForm` without their peer deps | Install per-feature peer deps from §3 (`react-mentions`, `devextreme*`, `react-hook-form`, …) |
| Pass a new `sp`/options object each render to data hooks | Pass `SPContext.sp` + memoized options |
| `import { x } from 'spfx-toolkit/utils'` (whole barrel) | Import the specific `spfx-toolkit/utilities/<name>` |

---

## 7. How to wire this into an AI assistant

- Copy the **Golden rules (§2)** and the **per-feature peer-dep matrix (§3)** into the consuming project's `CLAUDE.md` and/or `.github/copilot-instructions.md`.
- Point the assistant at `node_modules/spfx-toolkit/docs/Importing-Components.md` as the **authoritative** source for import paths — instruct it to copy paths from there rather than guessing deep subpaths.
- These rules are tool-agnostic: they apply equally to Claude Code, Claude, GitHub Copilot, Cursor, and any other LLM coding assistant.
- When the assistant proposes an import, it should verify the subpath exists in `spfx-toolkit`'s `package.json` `exports` (or is a valid `./lib/*` path). If unsure of a path or signature, prefer the canonical `spfx-toolkit/components/<Name>` form and check the doc.
