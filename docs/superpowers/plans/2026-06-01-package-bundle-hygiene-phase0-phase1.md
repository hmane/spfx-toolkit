# Package Bundle & Styling Hygiene — Phase 0 + Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> **DO NOT IMPLEMENT OR COMMIT YET.** This plan is for review. When execution is authorized, the user requires **Codex validation of every change before any commit** — so treat each task's "Commit" step as gated on that external validation.

**Goal:** Establish measurable consumer fixtures (Phase 0), then refactor the toolkit so PnP augmentation is centralized behind one idempotent bootstrap and the brittle nested deep-require is removed (Phase 1) — without breaking public API or the direct-`SPFI` utilities.

**Architecture:** A single shared `ensurePnPAugmentations()` side-effect bootstrap (composed from existing `pnpImports/*` presets) is called by `SPContext.initialize()` and imported by the handful of utilities that operate on a caller-provided `SPFI` (so they stay self-sufficient). The ~scattered per-file `import '@pnp/sp/*'` lines are removed only after an audit proves each is covered. The `urlSanitizer` legacy nested deep-require is dropped; the runtime fetch sanitizer remains the guarantee.

**Tech Stack:** TypeScript (CommonJS out), React 17, PnP v3 (ESM), Node 22.14 + `node --test`, gulp build.

**Spec:** [docs/superpowers/specs/2026-06-01-package-bundle-and-styling-hygiene-design.md](../specs/2026-06-01-package-bundle-and-styling-hygiene-design.md)

---

## ⛔ Execution prerequisite (resolved — read first)

**Decision (recorded):** execute **after PR #1 merges to `main`**, then **rebase `package-bundle-hygiene` onto updated `main`** before implementing.

This plan was authored on branch `package-bundle-hygiene`, which is branched from **`main`** and therefore **predates PR #1** (`spdebug-export-fixes`). PR #1 contains work this refactor depends on:
- The Node `22.14` engines + **build devDependencies** — without them a clean `npm install` cannot `tsc`/build/test the toolkit at all.
- Additional augmentation-importing source files (the new hooks `useListItems`, `useSPPagedQuery`, `useSPFieldMetadata`, `useSharePointSearch`) that are part of the audit set.

**Therefore: do not execute this plan on bare `main`.** Rebase `package-bundle-hygiene` onto `main` **after PR #1 merges**, or branch the implementation from the PR #1 tip. Every verification command below assumes the PR #1 toolchain (Node 22.14, build devDeps present). The audit in Task 1.3 is **grep-driven** so it stays correct regardless of which exact files exist on the execution base.

---

## File Structure (what changes)

**Phase 0 (new, all additive — no toolkit source touched):**
- `fixtures/consumer-published/` — minimal consumer that installs the packed tarball.
- `fixtures/consumer-link/` — minimal consumer that consumes via `npm link`.
- `fixtures/verify.mjs` — Node script that builds both fixtures and emits assertions.
- `fixtures/BASELINE.md` — recorded pre-refactor measurements.
- `package.json` — add a `fixtures:verify` script (no other changes).

**Phase 1 (toolkit source):**
- Create: `src/utilities/context/ensurePnPAugmentations.ts` (the bootstrap).
- Modify: `src/utilities/context/index.ts` (export it), `src/utilities/context/sp-context.ts` (call it in `initialize`).
- Modify (remove scattered imports → single bootstrap import), per the Task 1.3 audit, e.g.: `src/utilities/spHelper/spHelper.ts`, `src/utilities/userAccess/userAccessService.ts`, `src/utilities/userAccess/brokenInheritance.ts`, `src/utilities/permissionHelper/PermissionHelper.ts`, `src/utilities/batchBuilder/addOperationToBatch.ts`, `src/utilities/batchBuilder/executeBatch.ts`, `src/components/SPDynamicForm/utilities/autoSave.ts`, `src/components/VersionHistory/VersionHistory.tsx`, `src/components/ConflictDetector/ConflictDetector.ts`, `src/hooks/useGroupMembershipEditor.ts`, `src/hooks/useHasPermission.ts`, plus any new-hook files present on the execution base.
- Modify: `src/utilities/context/urlSanitizer.ts` (drop nested deep-require), `tests/utilities/context/urlSanitization.test.mjs` (rework legacy test).
- Delete: `src/components/ErrorBoundary/ErrorBoundary.css` (orphan).
- Modify: `package.json` `sideEffects` (add `**/context/ensurePnPAugmentations.js`; tighten existing entries only if a fixture proves it safe).

**Do NOT touch:** `src/utilities/context/pnpImports/*` (these presets are the bootstrap's building blocks), `src/types/pnp-augmentations.d.ts` (compile-time only).

---

## Phase 0 — Acceptance fixtures (build BEFORE refactoring)

> Goal: make every Phase 1 "it shrank / still works" claim *measured*. These fixtures are additive and touch no toolkit source.

### Task 0.1 — Published-style (tarball) consumer fixture

**Files:**
- Create: `fixtures/consumer-published/package.json`
- Create: `fixtures/consumer-published/tsconfig.json`
- Create: `fixtures/consumer-published/webpack.config.js`
- Create: `fixtures/consumer-published/src/index.ts`

- [ ] **Step 1: Create the consumer manifest** (`fixtures/consumer-published/package.json`). It installs the toolkit from a tarball path produced by `npm pack`, plus the peer deps a real consumer would have. Mirror the toolkit's peer set (Node 22.14 toolchain).

```json
{
  "name": "consumer-published",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "build": "webpack --mode production --json stats.json"
  },
  "dependencies": {
    "spfx-toolkit": "file:../../spfx-toolkit-fixture.tgz",
    "@fluentui/react": "8.106.4",
    "@pnp/sp": "3.26.0",
    "@pnp/queryable": "3.26.0",
    "@pnp/spfx-controls-react": "3.22.0",
    "devextreme": "22.2.3",
    "devextreme-react": "22.2.3",
    "react": "17.0.1",
    "react-dom": "17.0.1",
    "react-hook-form": "7.45.4",
    "zustand": "4.3.9"
  },
  "devDependencies": {
    "webpack": "5.95.0",
    "webpack-cli": "5.1.4",
    "ts-loader": "9.5.1",
    "css-loader": "6.11.0",
    "style-loader": "3.3.4",
    "typescript": "4.7.4"
  }
}
```

- [ ] **Step 2: Baseline tsconfig** — the MINIMAL tsconfig a consumer needs. This file IS the assertion for "no toolkit-induced tsconfig edits": it contains only the standard SPFx-style options; the build must pass without adding more.

```jsonc
// fixtures/consumer-published/tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "module": "esnext",
    "moduleResolution": "node",
    "jsx": "react",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["es2017", "dom"],
    "types": []
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Webpack config approximating SPFx loaders** — `.css` via style/css-loader, `.tsx?` via ts-loader. (Note in a comment that SPFx's real pipeline adds `@microsoft/loader-load-themed-styles` + SCSS scoping; this fixture covers the parts we can automate and the plan documents the SPFx-only gap in Task 0.4.)

```js
// fixtures/consumer-published/webpack.config.js
const path = require('path');
module.exports = {
  entry: './src/index.ts',
  output: { path: path.resolve(__dirname, 'dist'), filename: 'bundle.js' },
  resolve: { extensions: ['.ts', '.tsx', '.js'] },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
  stats: { modules: true, assets: true }
};
```

- [ ] **Step 4: Representative import entry** — one lightweight component, one PnP-backed feature, one DevExtreme-heavy feature, one `@pnp/spfx-controls-react`-backed control. (Adjust paths to those that exist on the execution base.)

```ts
// fixtures/consumer-published/src/index.ts
import { Card } from 'spfx-toolkit/components/Card';                 // lightweight
import { SPContext } from 'spfx-toolkit/utilities/context';          // PnP-backed
import { BatchBuilder } from 'spfx-toolkit/utilities/batchBuilder';  // direct-SPFI PnP util
import { VersionHistory } from 'spfx-toolkit/components/VersionHistory'; // DevExtreme + PnP control

export const used = { Card, SPContext, BatchBuilder, VersionHistory };
```

- [ ] **Step 5: Document how to build it** (no run yet — wiring is exercised by Task 0.3). Acceptance for this task: the four files exist and are internally consistent.

### Task 0.2 — `npm link` consumer fixture (captures current pain)

**Files:**
- Create: `fixtures/consumer-link/` (same four files as 0.1, except `package.json` omits the `spfx-toolkit` dependency — it will be linked).

- [ ] **Step 1: Create the link consumer** — identical `tsconfig.json`, `webpack.config.js`, `src/index.ts` to 0.1; `package.json` lists only the peer/dev deps (no `spfx-toolkit` entry). The verify script (0.3) will `npm link spfx-toolkit` into it to reproduce the nested-`node_modules` scenario.

```json
{
  "name": "consumer-link",
  "private": true,
  "version": "0.0.0",
  "scripts": { "build": "webpack --mode production --json stats.json" },
  "dependencies": {
    "@fluentui/react": "8.106.4", "@pnp/sp": "3.26.0", "@pnp/queryable": "3.26.0",
    "@pnp/spfx-controls-react": "3.22.0", "devextreme": "22.2.3", "devextreme-react": "22.2.3",
    "react": "17.0.1", "react-dom": "17.0.1", "react-hook-form": "7.45.4", "zustand": "4.3.9"
  },
  "devDependencies": {
    "webpack": "5.95.0", "webpack-cli": "5.1.4", "ts-loader": "9.5.1",
    "css-loader": "6.11.0", "style-loader": "3.3.4", "typescript": "4.7.4"
  }
}
```

### Task 0.3 — Verification script + npm script

**Files:**
- Create: `fixtures/verify.mjs`
- Modify: `package.json` (add `"fixtures:verify": "node fixtures/verify.mjs"`)

- [ ] **Step 1: Write `fixtures/verify.mjs`** that: (a) `npm run build` of the toolkit, then `npm pack` → copies tgz to `spfx-toolkit-fixture.tgz`; (b) installs + builds `consumer-published`; (c) `npm link` + builds `consumer-link`; (d) parses each `stats.json` and emits a report with the assertions in Task 0.4. Use only Node built-ins + `child_process`. (Full script body to be completed in the implementation step — it is mechanical: spawn npm/webpack, read `stats.json`, count modules whose `name` matches `devextreme`, `@fluentui/react`, `@pnp/sp` to detect duplicate physical copies, and grep emitted assets for known toolkit CSS class prefixes.)

- [ ] **Step 2: Add the npm script** to the toolkit `package.json`:

```json
"fixtures:verify": "node fixtures/verify.mjs"
```

- [ ] **Step 3: Run it** on Node 22.14:

Run: `node -v` (expect v22.14.x) then `npm run fixtures:verify`
Expected: both fixtures build; the script prints a JSON report (bundle bytes per fixture, duplicate-copy counts, CSS-present booleans).

### Task 0.4 — Record baseline assertions

**Files:**
- Create: `fixtures/BASELINE.md`

- [ ] **Step 1: Capture the pre-refactor numbers/observations** the `verify` report produces, as the baseline Phase 1 is measured against:
  1. **Published-style:** builds with the minimal `tsconfig.json` and webpack config from 0.1 — **no extra** tsconfig/webpack/`sideEffects` entries required. Record total `bundle.js` bytes and the set of toolkit CSS class prefixes present in output (asserts CSS loads).
  2. **npm-link:** record (a) whether `>1` physical copy of `devextreme`/`@fluentui/react`/`@pnp/sp` appears in the module list (duplication detection); (b) total bundle bytes (expected larger than published-style).
  3. **PnP control style issue:** the fixture detects the **precondition** — presence of a nested `spfx-toolkit/node_modules/@pnp/spfx-controls-react` under link. Because the exact failure depends on SPFx's SCSS-loader path scoping (not reproducible in plain webpack), **document the manual SPFx repro steps** here rather than asserting them automatically (spec explicitly allows this).
  4. **Light-component baseline:** record the bundle bytes for a build whose entry imports ONLY `spfx-toolkit/components/Card` — this is the number Phase 1 must not regress (and ideally improves once augmentation stops leaking into light paths).

- [ ] **Step 2: Commit Phase 0** (gated on Codex validation):

```bash
git add fixtures package.json
git commit -m "test(fixtures): add published + npm-link consumer fixtures and baseline"
```

**Phase 0 acceptance:** `npm run fixtures:verify` runs green on Node 22.14 and `fixtures/BASELINE.md` records the four baselines. No toolkit source changed.

---

## Phase 1 — Refactor (measured against Phase 0 baselines)

### Task 1.1 — Create the `ensurePnPAugmentations()` bootstrap

**Files:**
- Create: `src/utilities/context/ensurePnPAugmentations.ts`
- Test: `tests/utilities/context/ensurePnPAugmentations.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/utilities/context/ensurePnPAugmentations.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ensurePnPAugmentations } from '../../../lib/utilities/context/ensurePnPAugmentations.js';

describe('ensurePnPAugmentations', () => {
  test('is idempotent — repeated calls are a no-op and do not throw', () => {
    assert.equal(typeof ensurePnPAugmentations, 'function');
    ensurePnPAugmentations();
    ensurePnPAugmentations();
    ensurePnPAugmentations();
    // Reaching here without throwing is the assertion (augmentation modules loaded once).
    assert.ok(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/context/ensurePnPAugmentations.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the bootstrap** (composed from presets, idempotent guard)

```typescript
// src/utilities/context/ensurePnPAugmentations.ts
/**
 * Single, idempotent PnP augmentation bootstrap for the toolkit's runtime.
 *
 * Centralizes the @pnp/sp module augmentations that toolkit features rely on,
 * composed from the existing pnpImports presets. Called by SPContext init and
 * imported by utilities that operate on a caller-provided SPFI (so they stay
 * self-sufficient without scattering `import '@pnp/sp/*'` across the codebase).
 *
 * Set (decided in the spec): core + lists + content + files + security + search + taxonomy.
 */
import './pnpImports/core';
import './pnpImports/lists';
import './pnpImports/content';
import './pnpImports/files';
import './pnpImports/security';
import './pnpImports/search';
import './pnpImports/taxonomy';

let done = false;

/** Ensure the toolkit's PnP augmentations are registered. Safe to call many times. */
export function ensurePnPAugmentations(): void {
  // The augmentations are applied by the side-effect imports above at module load;
  // this guarded function exists so callers have an explicit, intention-revealing
  // entry point and so future additions remain centralized + run-once.
  if (done) return;
  done = true;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/context/ensurePnPAugmentations.test.mjs`
Expected: PASS

- [ ] **Step 5: Export it** from `src/utilities/context/index.ts` (add after the `LogLevel` export):

```typescript
export { ensurePnPAugmentations } from './ensurePnPAugmentations';
```

- [ ] **Step 6: Commit** (gated): `git add src/utilities/context/ensurePnPAugmentations.ts src/utilities/context/index.ts tests/utilities/context/ensurePnPAugmentations.test.mjs && git commit -m "feat(context): add idempotent ensurePnPAugmentations bootstrap"`

**Rollback risk:** none beyond the new module; nothing else references it yet.

### Task 1.2 — Call the bootstrap from SPContext initialization

**Files:**
- Modify: `src/utilities/context/sp-context.ts` (the `initialize` method, ~line 62)
- Test: `tests/utilities/context/*` (existing context tests must still pass)

- [ ] **Step 1: Add the call** at the very start of `SPContext.initialize(...)` (before `Context.initialize`), so all preset → `smart/basic/development/production/teams` paths (which route through `initialize`) get augmentation:

```typescript
import { ensurePnPAugmentations } from './ensurePnPAugmentations';
// ... inside initialize(), first line of the body:
ensurePnPAugmentations();
```

- [ ] **Step 2: Build + run the full context suite**

Run: `npm run build && node --test --test-reporter=spec 'tests/utilities/context/**/*.test.mjs'`
Expected: PASS (no regressions).

- [ ] **Step 3: Commit** (gated): `git add src/utilities/context/sp-context.ts && git commit -m "feat(context): bootstrap PnP augmentations from SPContext.initialize"`

**Rollback risk:** low — adding a call; if augmentation ordering matters, ensure it runs before any `SPContext.sp` use (it does — it's first in `initialize`).

### Task 1.3 — Audit & remove scattered `@pnp/sp` imports (one file at a time)

**Files:** the utility/component/hook files listed in "File Structure" (use the grep below to enumerate on the actual execution base).

- [ ] **Step 1: Enumerate the audit set** (excludes presets + the `.d.ts`):

Run: `grep -rl "^import '@pnp/sp/" src | grep -v 'pnpImports/' | grep -v 'pnp-augmentations.d.ts'`
Record the list. For EACH file, list its current `@pnp/sp/*` imports.

- [ ] **Step 2: Per-file audit table** — for each file, confirm every submodule it imports is covered by the bootstrap preset set (core=webs/site-users/profiles/site-groups; lists=lists/items/fields/batching/views; content=content-types/fields/column-defaults; files=files/folders/attachments; security=security/sharing; search=search; taxonomy=taxonomy). **If a file imports a submodule NOT in the set** (e.g. something only in `features`/`pages`/`apps`/`social`/`hubsites`), do NOT remove it silently — either add that preset to the bootstrap (spec §3 Phase 1 audit clause) or leave that import and note why. Write the table into the task notes.

- [ ] **Step 3 (per file): Replace scattered imports with a named import + explicit call.** Remove the `import '@pnp/sp/*'` lines and add a **named import + call** (NOT a side-effect-only import) so the module stays self-sufficient when used without `SPContext` (covers direct-`SPFI` utils like `addOperationToBatch`, `executeBatch`, `ConflictDetector`):

```typescript
import { ensurePnPAugmentations } from '../context/ensurePnPAugmentations'; // adjust relative depth per file
ensurePnPAugmentations();
```

- **Why named import + call, not a bare `import './ensurePnPAugmentations'`:** the toolkit's `package.json` `sideEffects` is a **whitelist**; a side-effect-only import of a module not on that list can be tree-shaken away by a consumer's bundler, silently dropping the augmentation. A used named export keeps the module (and therefore its preset side-effect imports) in the graph regardless. (Task 1.5 also adds the module to `sideEffects` as belt-and-suspenders.)
- **Where to put the call:** at module load (top-level, right after imports) for utility modules, so augmentation is registered as soon as the module is loaded — matching the previous behavior of the top-level `@pnp/sp/*` imports. Keep the `import type { SPFI }` lines — they are type-only and erased.
- Relative paths: files under `src/utilities/context/` import `'./ensurePnPAugmentations'`; `src/utilities/<x>/` → `'../context/ensurePnPAugmentations'`; `src/components/<x>/` → `'../../utilities/context/ensurePnPAugmentations'`; `src/components/<x>/<sub>/` → `'../../../utilities/context/ensurePnPAugmentations'`; `src/hooks/` → `'../utilities/context/ensurePnPAugmentations'`.

- [ ] **Step 4 (per file): Build + run that file's area tests.** Examples:
  - batchBuilder: `npm run build && node --test --test-reporter=spec 'tests/utilities/batchBuilder/**/*.test.mjs'` (if present) — else build + a smoke import test.
  - userAccess: `node --test --test-reporter=spec 'tests/utilities/userAccess/**/*.test.mjs'`
  - permissionHelper: `node --test --test-reporter=spec 'tests/utilities/permissionHelper/**/*.test.mjs'`
  Expected: PASS. For files with NO area test, add a minimal smoke test that imports the compiled module and asserts a representative method exists on a stubbed SPFI chain, OR document why a guard test is unnecessary (e.g. component covered by build/type-check only).

- [ ] **Step 5: Full suite after all files** `npm run build && node --test --test-reporter=spec 'tests/**/*.test.mjs'` — Expected: all green.

- [ ] **Step 6: Commit** (gated): `git add -A && git commit -m "refactor(pnp): replace scattered @pnp/sp augmentation imports with central bootstrap"`

**Rollback risks (important):**
- A direct-`SPFI` utility used **before** any bootstrap-importing module loads could lose augmentation. Mitigation: each such file does a named import + top-level `ensurePnPAugmentations()` call (Step 3), so loading the util registers the augmentation and the call site can't be tree-shaken. The audit (Step 2) is the gate.
- The bootstrap pulls the **full** preset set, so importing a single small PnP util now pulls more `@pnp/sp` surface than before. This is the spec's accepted tradeoff (predictable, deduped, removes consumer `sideEffects` churn) — **but it could regress the light-PnP-consumer bundle.** Task 1.6 measures this against the Phase 0 baseline and is the go/no-go gate. If it regresses unacceptably, fall back to per-file minimal preset imports (e.g. a util imports only `'./pnpImports/security'`) instead of the full bootstrap.

### Task 1.4 — Drop the nested deep-require in urlSanitizer; keep fetch sanitizer

**Files:**
- Modify: `src/utilities/context/urlSanitizer.ts` (the `configureLegacyPnPBaseUrl` body, lines ~80-92)
- Modify: `tests/utilities/context/urlSanitization.test.mjs`

- [ ] **Step 1: Rework the failing test first.** In `urlSanitization.test.mjs`, the existing test `legacy PnP v2 base URL is forced clean even after dirty pageContext setup` (line ~82) depends on the nested deep-require and must be **removed**. Strengthen the existing fetch-sanitizer test (`fetch sanitizer rewrites late layouts-based SharePoint API requests`, line ~110) to assert the dirty→clean rewrite explicitly:

```js
test('fetch sanitizer rewrites dirty /_layouts/15 API URLs to clean _api URLs', () => {
  const calls = [];
  const fakeTarget = { fetch: (input) => { calls.push(String(input)); return Promise.resolve({ ok: true }); } };
  installSharePointApiUrlFetchSanitizer(fakeTarget);
  fakeTarget.fetch('https://contoso.sharepoint.com/sites/demo/_layouts/15/_api/web/lists');
  assert.equal(calls[0], 'https://contoso.sharepoint.com/sites/demo/_api/web/lists');
});
```

- [ ] **Step 2: Run to verify** the old legacy test is gone and the new fetch test fails or passes as expected against current code.

Run: `npm run build && node --test --test-reporter=spec tests/utilities/context/urlSanitization.test.mjs`
Expected: the fetch-sanitizer assertion passes (fetch interception already exists); confirm no test references the removed legacy behavior.

- [ ] **Step 3: Reduce `configureLegacyPnPBaseUrl` to the fetch sanitizer only.** Delete **both** `require(...)` blocks — the nested `require('@pnp/spfx-controls-react/node_modules/@pnp/sp')` (line ~87-92) **and** the `require('@pnp/common')` best-effort block (line ~80-85). The function body keeps **only** `installSharePointApiUrlFetchSanitizer()` (and the early `cleanWebUrl` guard if it still guards that call). After this, `configureLegacyPnPBaseUrl` references no `@pnp` runtime module at all — the global `fetch` interception is the sole mechanism that rewrites dirty `/_layouts/15/_api` URLs.

```typescript
// resulting shape of configureLegacyPnPBaseUrl (illustrative):
export function configureLegacyPnPBaseUrl(ctx: any): void {
  const cleanWebUrl = sanitizeSharePointSiteUrl(ctx?.pageContext?.web?.absoluteUrl);
  if (!cleanWebUrl) return;
  installSharePointApiUrlFetchSanitizer();
}
```

- [ ] **Step 4: Build + run** `npm run build && node --test --test-reporter=spec tests/utilities/context/urlSanitization.test.mjs` — Expected: PASS.

- [ ] **Step 5: Commit** (gated): `git add src/utilities/context/urlSanitizer.ts tests/utilities/context/urlSanitization.test.mjs && git commit -m "fix(context): drop brittle nested @pnp deep-require; rely on fetch sanitizer"`

**Rollback risk:** behavior change — if any consumer relied on the legacy base being mutated via the nested PnP v2 singleton, that path is gone. The fetch sanitizer covers the actual `/_layouts/15/_api` rewrite (the real goal). Accepted in the spec.

### Task 1.5 — CSS / sideEffects cleanup

**Files:**
- Delete: `src/components/ErrorBoundary/ErrorBoundary.css`
- Modify: `package.json` `sideEffects` (only if proven safe)

- [ ] **Step 1: Confirm the orphan** `grep -rn "ErrorBoundary.css" src` → expect no import. Delete the file.
- [ ] **Step 2: Build + validate + full tests** `npm run build && npm run validate && node --test --test-reporter=spec 'tests/**/*.test.mjs'` — Expected: green (the orphan was never referenced).
- [ ] **Step 3: sideEffects review.**
  - **ADD `**/context/ensurePnPAugmentations.js`** to the `sideEffects` whitelist. The bootstrap module carries the preset side-effect imports; mark it side-effecting so a consumer bundler cannot drop it. Add it **unless** the Phase 0 fixtures prove it is unnecessary (i.e. the named-import+call from Task 1.3 already guarantees retention in the measured builds). Default: **add it**.
  - Keep `**/*.css`, `**/*.scss`, and `**/context/pnpImports/*.js`.
  - Only **tighten** an existing entry if a fixture build proves it safe (e.g. `spHelper.js` — now that its `@pnp/sp` requires are replaced by the named bootstrap call, evaluate whether it still needs to be listed; **leave it unless a fixture build proves it droppable**). Document the decision; default to NO change if unsure.
- [ ] **Step 4: Commit** (gated): `git add -A && git commit -m "chore(css): remove orphan ErrorBoundary.css; sideEffects review"`

**Rollback risk:** deleting a referenced CSS would break styling — Step 1 proves it's unreferenced first.

### Task 1.6 — Acceptance against Phase 0 fixtures (go/no-go gate)

- [ ] **Step 1: Re-pack + re-run fixtures** `npm run fixtures:verify` on Node 22.14.
- [ ] **Step 2: Compare to `fixtures/BASELINE.md`** and assert:
  - Published-style still builds with the **unchanged** minimal `tsconfig.json`/webpack config — no new toolkit-induced config.
  - Light-component (Card-only) bundle **does not regress** vs baseline.
  - A PnP-backed-feature bundle is within an acceptable delta of baseline (record it; the full-preset bootstrap is the known tradeoff).
  - Toolkit CSS class prefixes still present (styles load).
  - npm-link duplication metric unchanged (Phase 1 does not fix link duplication — that's Phase 2; just confirm no regression).
- [ ] **Step 3: Full green** `npm run build && npm run type-check && npm run validate && node --test --test-reporter=spec 'tests/**/*.test.mjs'`.
- [ ] **Step 4: Record results** in `fixtures/BASELINE.md` (append a "Phase 1 result" section). If the PnP bundle regressed beyond tolerance, invoke the Task 1.3 fallback (per-file minimal presets) before proceeding.
- [ ] **Step 5: Commit** (gated): `git add fixtures && git commit -m "test(fixtures): record Phase 1 acceptance deltas"`

---

## Self-Review (against the spec)

- **Spec §3 Phase 0 fixtures** → Tasks 0.1–0.4 (published + link harness, verify script, baselines incl. the documented-not-automated PnP-control caveat). ✓
- **Spec §3 Phase 1 (1) centralize augmentation via bootstrap** → Tasks 1.1–1.3 (shared idempotent `ensurePnPAugmentations`, called by init + imported by direct-SPFI utils, grep-driven audit with coverage mapping). ✓
- **Spec §3 Phase 1 (2) drop urlSanitizer deep-require + fetch test** → Task 1.4. ✓
- **Spec §3 Phase 1 (3) CSS/sideEffects cleanup** → Task 1.5. ✓
- **Spec §4 decided augmentation set** core+lists+content+files+security+search+taxonomy → Task 1.1 Step 3 (exact preset imports). ✓
- **Spec success criteria measured against fixtures** → Task 1.6. ✓
- **Public API compatibility** → only additive export (`ensurePnPAugmentations`); no removed/renamed public exports. ✓
- **No broad refactors** → changes are scoped to import lines + one new module + one orphan delete + tests. ✓
- **Placeholder scan:** one acknowledged deferral — `fixtures/verify.mjs` full body is described mechanically rather than written line-by-line (it is glue around `npm pack`/webpack/`stats.json`); every toolkit-source task has complete code. Flag for the implementer to flesh out `verify.mjs` first.
- **Type consistency:** `ensurePnPAugmentations` name + signature `(): void` used consistently across Tasks 1.1/1.2/1.3.

## Resolved decisions (recorded)
1. **Base branch:** Execute **after PR #1 merges to `main`**, then **rebase `package-bundle-hygiene` onto updated `main`**. All verification assumes that toolchain (Node 22.14, build devDeps present). The Task 1.3 audit is grep-driven so it covers whatever augmentation-importing files exist on the rebased base (including the new hooks from PR #1).
2. **Fixture fidelity:** Plain-webpack fixtures are **accepted**. No real SPFx-generated (`yo @microsoft/sharepoint`) fixture for now. The PnP-control `.module.scss` failure is documented as a manual SPFx repro in `fixtures/BASELINE.md` (Task 0.4 Step 1.3) rather than automated.
3. **Full-preset bootstrap tradeoff:** Accepted, with a **per-file minimal-preset fallback** authorized: if Task 1.6 shows the full-preset bootstrap regresses the PnP-feature bundle beyond tolerance, switch the affected modules to import only the specific preset(s) they need (e.g. a security-only util calls into `'./pnpImports/security'`) instead of the full `ensurePnPAugmentations`. Task 1.6 is the go/no-go gate.
4. **`@pnp/common`:** **Drop it** (along with the nested deep-require) — see Task 1.4 Step 3. `configureLegacyPnPBaseUrl` references no `@pnp` runtime module after the change; the fetch sanitizer is the sole mechanism.

## Open questions / blockers
None outstanding — all four prior open items are resolved above. Execution remains gated on (a) PR #1 merging + rebase, and (b) Codex validating each change before its commit.
