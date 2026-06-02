<!--
  SAMPLE — copy this into YOUR consuming SPFx solution as `.github/copilot-instructions.md`
  (or merge it into an existing one). It tells GitHub Copilot / Claude / Cursor how to use the
  `spfx-toolkit` package correctly: tree-shaking, import paths, peer deps, SPContext, and PnP
  augmentation. It is NOT for developing the toolkit itself.

  After copying, keep the two reference docs reachable in your repo (they ship inside the package):
    - node_modules/spfx-toolkit/docs/AI-Assistant-Guide.md     (full rules + import index)
    - node_modules/spfx-toolkit/docs/Importing-Components.md    (authoritative import paths)
-->

# Project AI rules — using the `spfx-toolkit` package

When writing code that uses `spfx-toolkit`, follow these rules exactly. The authoritative,
always-up-to-date sources ship inside the installed package — prefer them over guessing:

- **Rules + import index:** `node_modules/spfx-toolkit/docs/AI-Assistant-Guide.md`
- **Exact import paths (copy, don't invent):** `node_modules/spfx-toolkit/docs/Importing-Components.md`

If a path or signature is uncertain, open those files and copy from them. Do not guess deep subpaths.

## Golden rules (non-negotiable)

1. **Initialize `SPContext` first.** Call `await SPContext.smart(this.context, '<WebPartName>')` in the
   web part's `onInit()` **before** `render()`. Toolkit components and data hooks throw or no-op without it.
2. **Never import from the package root** `spfx-toolkit`. It defeats tree-shaking and pulls the whole library.
3. **Import from canonical subpaths only:**
   - Components: `spfx-toolkit/components/<Name>`
   - Hooks: `spfx-toolkit/hooks`
   - Utilities: `spfx-toolkit/utilities/<name>`
   - For maximum tree-shaking, the deep `spfx-toolkit/lib/...` paths are also valid.
4. **The `spfx-toolkit/components` barrel is LIGHTWEIGHT-ONLY** (Card, ConflictDetector, DocumentLink,
   ErrorBoundary, GroupViewer, UserPersona, WorkflowStepper, SPNotificationBar). **Heavy components are NOT
   in the barrel** and MUST use their deep subpath: `Comments`, `spForm`, `spFields`, `SPDynamicForm`,
   `VersionHistory`, `ManageAccess`, `SPListItemAttachments`, `GroupUsersPicker`, `userAccess`, `SPSiteSelector`.
5. **Tree-shakable Fluent UI imports only:** `import { Button } from '@fluentui/react/lib/Button'` —
   never the bare barrel `import { Button } from '@fluentui/react'` (pulls 200–500KB+).
6. **Install only the peer deps a feature needs** (see matrix below). `@microsoft/sp-*` are host-injected by
   SPFx — never install them. Never add a non-peer-dependency package; the toolkit has zero runtime deps.
7. **Pass stable references to data hooks.** Use `SPContext.sp` and a memoized options object — never a
   freshly-created instance or inline object literal each render (it re-fires the query).
8. **Load `pnpImports` only when you call raw `SPContext.sp` yourself** (see "PnP augmentation" below).
9. **Never add a `sideEffects` field to this app's `package.json` to fix toolkit styles.** The toolkit
   declares its own `sideEffects` (CSS/SCSS + augmentation); toolkit CSS bundles automatically on a published
   install with zero config. Adding `sideEffects` here — especially `sideEffects: false` — can *drop* your own
   side-effect imports (`import './pnpImports'`, `import 'devextreme/dist/css/dx.light.css'`). Leave it absent.
   Unstyled `@pnp/spfx-controls-react` controls are an **`npm link`-only** problem fixed by the build helper
   (see last section), not by `sideEffects`.

## Per-feature peer dependencies

Install these only when you use the matching feature. (`@pnp/sp`, `@pnp/queryable`, `@fluentui/react`,
`react`, `react-dom` are the always-needed core.)

| Feature / component | Extra peer deps |
|---|---|
| `SPContext`, most hooks, Card, UserPersona, GroupViewer, ErrorBoundary, ConflictDetector, WorkflowStepper, DocumentLink | none extra |
| `DocumentLink` file icons, `ManageAccess`, PnP people pickers | `@pnp/spfx-controls-react@^3.22.0` |
| `Comments` (@-mentions) | `react-mentions@^4.4.0` (install explicitly — not transitive) |
| `VersionHistory`, `GroupUsersPicker`, `spForm`, `spFields` (DevExtreme) | `devextreme@^22.2.3`, `devextreme-react@^22.2.3` (+ `import 'devextreme/dist/css/dx.light.css'` once) |
| `spForm`, `SPDynamicForm`, `spFields`, RHF pickers | `react-hook-form@^7.45.4`, `zustand@^4.3.9` |
| taxonomy/people pickers in `spForm` | `@pnp/spfx-controls-react@^3.22.0` |

CSS: toolkit components ship their own CSS automatically; Fluent UI CSS is loaded by SPFx; DevExtreme CSS
must be imported once globally if any DevExtreme wrapper is used.

## SPContext + a typical web part

```typescript
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPContext } from 'spfx-toolkit/utilities/context';

export default class MyWebPart extends BaseClientSideWebPart<{}> {
  protected async onInit(): Promise<void> {
    await super.onInit();
    await SPContext.smart(this.context, 'MyWebPart'); // MUST be before render()
    // If you call raw PnP yourself, also: await import('./pnpImports');  (see below)
  }
  public render(): void { /* ReactDom.render(<App />, this.domElement) */ }
}
```

```typescript
// Read a list with a hook + CamlBuilder filter (stable refs!)
import { useListItems } from 'spfx-toolkit/lib/hooks/useListItems';
import { CamlBuilder } from 'spfx-toolkit/utilities/camlBuilder';

const caml = CamlBuilder.where().field('Status').neq('Completed').orderBy('Created', false).rowLimit(50).build();
const { items, loading, error, refresh } = useListItems<ITask>({ listId: 'Tasks', caml });
```

## PnP augmentation (`pnpImports`)

`@pnp/sp` is modular — `.lists`, `.items`, `.fields`, `.search`, `.attachments`, `.taxonomy` exist only
after their augmentation is imported. **Toolkit features register what they need automatically.** You load
augmentation yourself **only** when your own code calls raw PnP (`SPContext.sp.web.lists…`) and no
PnP-backed toolkit feature is mounted in that web part. If you only consume toolkit components/hooks, skip this.

```typescript
// src/webparts/<yourWebPart>/pnpImports.ts — side-effect imports, load only the keys you use
import 'spfx-toolkit/utilities/context/pnpImports/core';     // .web, site users/groups, profiles (first)
import 'spfx-toolkit/utilities/context/pnpImports/lists';    // .lists, .items, .fields, .views, batching
import 'spfx-toolkit/utilities/context/pnpImports/content';  // content types, columns
import 'spfx-toolkit/utilities/context/pnpImports/files';    // files, folders, attachments
import 'spfx-toolkit/utilities/context/pnpImports/security'; // role assignments, sharing
import 'spfx-toolkit/utilities/context/pnpImports/search';   // .search (KQL)
import 'spfx-toolkit/utilities/context/pnpImports/taxonomy'; // term store
import 'spfx-toolkit/utilities/context/pnpImports/siteGroups'; // group-membership editing
```

## Common mistakes to avoid

| Don't | Do |
|---|---|
| `import { Card } from 'spfx-toolkit'` | `import { Card } from 'spfx-toolkit/components/Card'` |
| Render before `SPContext` init | `await SPContext.smart(...)` in `onInit()` first |
| `import { Button } from '@fluentui/react'` | `import { Button } from '@fluentui/react/lib/Button'` |
| `import { VersionHistory } from 'spfx-toolkit/components'` (barrel) | `import { VersionHistory } from 'spfx-toolkit/components/VersionHistory'` |
| Call `SPContext.sp.web.lists…` with no augmentation loaded | Import the matching `pnpImports/*` once at the entry |
| New `sp`/options object each render into a data hook | `SPContext.sp` + a memoized options object |
| `import { x } from 'spfx-toolkit/utils'` (whole barrel) | `import { x } from 'spfx-toolkit/utilities/<name>'` |
| Add `sideEffects` to this app's `package.json` to fix toolkit/PnP styles | Leave it absent — toolkit CSS auto-bundles; under `npm link` use the build helper instead |
| "Fix" unstyled `@pnp/spfx-controls-react` controls with a manual webpack/`sideEffects` edit | Published: no fix needed. `npm link`: apply `applyToolkitWebpackFixes` from `spfx-toolkit/build` |

## Debugging a local toolkit checkout via `npm link` only

For a **published install you need none of this.** If you `npm link` a local `spfx-toolkit` checkout to debug
it, add the shipped webpack helper to your build so duplicated heavy peers and broken nested
`@pnp/spfx-controls-react` styles are fixed automatically:

```js
// config/fast-serve/webpack.extend.js
const { applyToolkitWebpackFixes } = require('spfx-toolkit/build');
module.exports = { transformConfig: (cfg) => applyToolkitWebpackFixes(cfg, { consumerRoot: __dirname }) };
```

See `node_modules/spfx-toolkit/docs/NPM-Link-Debug-Workflow.md` for Heft usage and options. **Never** wire
this into a production build.
