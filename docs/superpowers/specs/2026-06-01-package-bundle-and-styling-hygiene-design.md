# SPFx Toolkit — Bundle & Styling Hygiene (Consumer Friction Removal)

**Date:** 2026-06-01
**Status:** Draft for review
**Author:** (toolkit maintainer) + Claude
**Scope:** Eliminate the consumer-side friction (bundle bloat, broken third-party control styles, hand-rolled webpack/`sideEffects`/tsconfig changes) when consuming `spfx-toolkit`, and establish standards + tooling so it stays clean — including under a future Heft build.

---

## 1. Problem statement

Consuming `spfx-toolkit` in an SPFx solution currently requires manual, repeated workarounds:

1. **Bundle size grows** more than the features used would suggest.
2. **Third-party control styles break** — `@pnp/spfx-controls-react` PeoplePicker / FilePicker / RichText toolbar render unstyled.
3. **The consumer must hand-edit build config** every time: a fast-serve `webpack.extend.js` `NormalModuleReplacementPlugin` for `.module.scss`, extra `sideEffects` entries in the app `package.json`, and `tsconfig` tweaks. (Copilot re-adds these.)

The maintainer wants: **drop-in simplicity** (minimal/zero consumer config), **small bundle impact**, **standard guidelines** so current and future components stay clean, and **forward-compatibility with Heft** (the gulp/fast-serve hacks won't carry over).

### Consumption model (important context)
- **`npm link`** while actively debugging the toolkit.
- **Published ADO Artifacts install** (normal `dependency`) otherwise.

This split matters: several symptoms are specific to the `npm link` path.

---

## 2. Root-cause analysis (evidence-based)

### 2.1 What is NOT broken — the toolkit's own styles
The toolkit ships **25 plain global `.css` files** (no SCSS, no CSS modules). The build copies them verbatim to `lib/`; compiled components emit bare `require('./X.css')`, which the standard SPFx webpack handles automatically. **Importing a toolkit component loads its CSS with zero consumer config.** None of the consumer's style hacks are needed for the toolkit's own styles. (Minor: `ErrorBoundary.css` is orphaned/never imported; a few components `require` their CSS from both the component and the barrel — webpack dedupes, harmless.)

### 2.2 Problem 1 — Bundle bloat → primarily an `npm link` artifact
- The published tarball ships **no `node_modules`** (verified via `files` whitelist + `npm pack --dry-run`). On a normal registry install, npm dedupes heavy deps against the consumer's copies → no duplication.
- Under **`npm link`** (or any non-deduped local install), `spfx-toolkit/node_modules` carries its own copies of **devextreme (~108 MB), @fluentui/react (~53 MB), @pnp/spfx-controls-react (~26 MB)** (they are peer **and** devDependencies). Webpack then bundles **two physical copies** — the toolkit's nested copy *and* the consumer's — exploding the bundle during debugging.
- **Residual cost even on clean install (the toolkit's own choice):** ~29 source files carry top-level side-effect augmentation imports (`import '@pnp/sp/webs'`, `'@pnp/sp/lists'`, `'@pnp/sp/items'`, `'@pnp/sp/security'`, …). These are side-effect imports, so they survive tree-shaking by design; importing one small component drags a slice of the `@pnp/sp` surface into the bundle even if unused.

### 2.3 Problem 2 — Broken PnP control styles → nested `@pnp/spfx-controls-react` + PnP v2/v3 skew
- `@pnp/spfx-controls-react` controls import styles **extensionless**, e.g. `PeoplePickerComponent.js` → `import styles from './PeoplePickerComponent.module.scss'`. No raw `.module.scss` ships; the on-disk file is the SPFx-precompiled `*.module.scss.js` (+ `*.module.css` + `.d.ts`). The specifier `./X.module.scss` must resolve to `X.module.scss.js`.
- SPFx's SCSS resolution/loader rules only fire for the consumer's `src` and its **top-level** `node_modules/@pnp/spfx-controls-react`. When the control resolves from the **nested** `spfx-toolkit/node_modules/@pnp/spfx-controls-react/...` path (the `npm link` case), the loader doesn't fire → missing styles → hence the consumer's `.module.scss` rewrite plugin.
- Aggravators: `@pnp/spfx-controls-react@3.22` depends on `@pnp/sp@2.5` (PnP **v2**), which cannot dedupe with the v3 the toolkit/consumer use → a nested `@pnp/sp@2.5` is structurally forced. The toolkit also **hard-codes** `require('@pnp/spfx-controls-react/node_modules/@pnp/sp')` ([src/utilities/context/urlSanitizer.ts:88](../../../src/utilities/context/urlSanitizer.ts#L88)), which is brittle and reinforces the nested layout.
- **On a published install**, the toolkit's dynamic `import('@pnp/spfx-controls-react/lib/PeoplePicker')` resolves to the consumer's **top-level** control copy, so the SCSS loader fires and styles work — the breakage is essentially the `npm link` path.

### 2.4 Problem 3 — `sideEffects` + tsconfig churn → downstream symptoms
- The app-side `sideEffects` entries (`devextreme/dist/css/**`, `**/node_modules/@pnp/**`) exist because the toolkit's augmentation imports + DevExtreme CSS are side-effect-only; without marking them the consumer's tree-shaker prunes them → runtime `.lists is not a function` errors or unstyled DevExtreme. The toolkit's own `sideEffects` list does not propagate to the nested `@pnp` copy in the consumer graph, so the consumer re-declares it.
- tsconfig churn (`skipLibCheck`, `moduleResolution`, `esModuleInterop`, `types` narrowing) stems from the PnP v2/v3 **type** skew (control types pull v2 typings alongside v3) and the extensionless SCSS shipping.

### 2.5 Heft implications
The fast-serve `webpack.extend.js` rewrite and gulp-specific `sideEffects` injection do **not** carry to Heft. Any durable fix must be **build-tool-agnostic** — ideally removing the *cause* (nesting + scattered augmentation) so no build hook is needed, with an optional build helper that works identically under gulp/fast-serve and Heft.

### 2.6 Root-cause summary (prioritized)
| # | Symptom | Root cause | Category |
|---|---|---|---|
| 1 | Broken PnP control styles + `.module.scss` hack | Nested `@pnp/spfx-controls-react` (PnP v2/v3 skew) under `npm link`; brittle deep-require | npm link + 3rd-party SCSS |
| 2 | Bundle bloat | `npm link` duplicating devextreme/Fluent/controls; + scattered `@pnp/sp` augmentation imports | npm link + toolkit choice |
| 3 | `sideEffects`/tsconfig churn | Augmentation side-effect imports + v2/v3 type skew | toolkit choice + 3rd-party |

---

## 3. Resolution — three sequenced sub-projects

Each phase is its own spec → plan → build cycle. Phase 1 first (it changes what later phases enforce and shrinks what the build helper must paper over).

### Phase 0 — Acceptance fixtures *(prerequisite; build before measuring anything)*
**Goal:** make every "it works / it shrank" claim *measured*, not inferred. Stand up two minimal consumer harnesses, kept in the repo (e.g. under `fixtures/`), each importing a representative mix (one lightweight component, one PnP-backed feature, one heavy/DevExtreme feature, one `@pnp/spfx-controls-react`-backed control):
1. **Published-style install** harness — installs the toolkit the way ADO consumers do (from a packed tarball, not `npm link`), on the supported SPFx 1.21 / Node 22.14 toolchain.
2. **`npm link` harness** — reproduces the debugging scenario (nested `node_modules`).

All Phase 1–3 acceptance criteria are evaluated against these fixtures (bundle deltas, style rendering, required consumer config). The fixtures also become the doctor CLI's test target.

### Phase 1 — Refactor the toolkit to remove friction at the source *(foundation)*
**Goal:** a published install needs **zero toolkit-induced** app-side `sideEffects`/tsconfig/webpack changes on the supported SPFx 1.21 / Node 22.14 toolchain, and a smaller baseline bundle. (External factors like the `@pnp/spfx-controls-react` v2/v3 type skew are bounded by what the Phase 0 fixtures prove, not promised away.)

1. **Centralize PnP augmentation behind one bootstrap.** Replace the ~29 scattered per-file `import '@pnp/sp/*'` side-effect imports with a single shared, idempotent bootstrap module — `ensurePnPAugmentations()` (a side-effect import of the agreed preset set, guarded to run once).
   - **Not every toolkit feature needs PnP.** Lightweight components (Card, WorkflowStepper, etc.) touch no PnP and must not pull augmentation. The correct framing is: **PnP-backed toolkit features require the central PnP augmentation bootstrap before first use** — *not* "every consumer must call SPContext."
   - **Two entry points must guarantee the bootstrap**, because some utilities operate on a **caller-provided `SPFI`** rather than `SPContext.sp` (e.g. [addOperationToBatch.ts](../../../src/utilities/batchBuilder/addOperationToBatch.ts#L9), [ConflictDetector.ts](../../../src/components/ConflictDetector/ConflictDetector.ts#L25)):
     1. `SPContext.initialize()/smart()` calls the bootstrap (covers SPContext-backed features).
     2. Direct-`SPFI` utility modules import the bootstrap at their top (covers features used without SPContext). This replaces their individual `@pnp/sp/*` imports with one bootstrap import — still self-sufficient, just centralized.
   - **Augmentation set (decided):** `core + lists + content + files + security + search + taxonomy` — composed from the existing `pnpImports/*` **presets**, not individual submodule imports (the `lists` preset already pulls `items`/`batching`/`views`; `content` pulls `content-types`/`fields`). Skip `apps`, `features`, `pages`, `social`, `hubsites` unless the audit (below) proves toolkit runtime code needs them.
   - **Tradeoff:** any consumer of a PnP-backed feature pulls the full agreed augmentation set once (deduped), regardless of which PnP feature they use — slightly larger but predictable, and it removes the consumer's `@pnp/**` `sideEffects` requirement. Given the simplicity priority, this is the chosen trade.
   - **Audit task (required before removing any import):** enumerate all ~29 `import '@pnp/sp/*'` sites; for **each removed import**, prove it maps to either (a) the central bootstrap's preset coverage, or (b) an explicit initialization guard + test on the entry point that uses it. No import is removed without one of those two. This guards the direct-`SPFI` utilities that do **not** route through `SPContext`.
2. **Drop the brittle nested deep-require** at [urlSanitizer.ts:88](../../../src/utilities/context/urlSanitizer.ts#L88) (decided). Remove the `require('@pnp/spfx-controls-react/node_modules/@pnp/sp')` entirely — keep `installSharePointApiUrlFetchSanitizer()` and any **non-nested** best-effort setup (no reference to `@pnp/spfx-controls-react/node_modules/...`). Add/adjust tests proving dirty `/_layouts/15` API URLs are rewritten by fetch interception (the fetch sanitizer is the real guarantee). This is an accepted behavior change.
3. **CSS/sideEffects cleanup.** Remove the orphaned `ErrorBoundary.css` (or wire it up if intended); keep `**/*.css` + `pnpImports/*` in `sideEffects`; re-verify the list is minimal after the augmentation centralization (the per-file augmentation removal should let us tighten it).
4. **Acceptance (measured against the Phase 0 fixtures, not inferred):** the published-style consumer harness imports components with **no toolkit-induced** app-side `sideEffects`/tsconfig/webpack edits on the supported SPFx 1.21 / Node 22.14 toolchain; baseline bundle for a light component drops (no incidental `@pnp/sp` surface); `npm test`/build/type-check stay green; PnP-backed features still work at runtime in both harnesses.

### Phase 2 — Shipped build helper + clean `npm link` debug workflow *(immediate relief, Heft-safe)*
**Goal:** debugging via `npm link` behaves like a published install, with a one-line, build-tool-agnostic config — no hand-rolled webpack.

1. **Ship a config transform** (e.g. `spfx-toolkit/build` → `applyToolkitWebpackFixes(config)`), a pure `(webpackConfig) => webpackConfig` function usable from fast-serve `webpack.extend.js` **and** Heft's webpack hook:
   - `resolve.alias` forcing `devextreme`, `devextreme-react`, `@fluentui/react`, `@pnp/sp` (and `react`/`react-dom`) to the **consumer's** copy → eliminates the `npm link` duplicate-bundle problem.
   - The `.module.scss` → precompiled-output rewrite for the nested `@pnp/spfx-controls-react`, replacing the consumer's hand-rolled `NormalModuleReplacementPlugin`.
2. **Document a clean debug workflow:** the helper above, plus an alternative that avoids nesting entirely (`npm pack` + install, or `yalc`), so contributors can pick.
3. **Acceptance:** with the helper added in one line, `npm link` debugging shows no duplicate devextreme/Fluent in the bundle and PnP control styles render; the same helper works unchanged when the app moves to Heft.

### Phase 3 — Guardrails *(lock it in)*
**Goal:** correct usage is automatically verifiable; the standard is documented; Heft-readiness is confirmed.

1. **Doctor CLI** (`npx spfx-toolkit doctor`, shipped via `bin`) — **minimal first**: scans a consuming project and reports (1) required peer deps + version ranges present; (2) Node / toolchain version vs supported (22.14); (3) lockfile present + install mode (registry vs `npm link` symlink detection); (4) forbidden imports — package-root `spfx-toolkit`, bulk `@fluentui/react`; (5) presence/use of the Phase 2 build helper when `npm link` is detected. Exits non-zero for CI gating. **Bundle-size hints are deferred** until there is a stable consumer fixture to measure against.
2. **Authoring-guidelines doc** (maintainer-facing): the package-hygiene standard — tree-shakable subpath imports, plain global CSS (no node_modules SCSS imports), lazy-load heavy controls via dynamic `import()`, no per-file `@pnp` augmentation (use the central path), peers never bundled, no deep-requires into nested deps. So future components don't regress.
3. **Heft-readiness checklist:** verify zero gulp/fast-serve-specific requirements remain; the build helper is the only (optional) integration point and it's build-tool-agnostic.
4. **Explicitly out of scope (YAGNI):** a separate ESLint plugin (the doctor CLI covers the same ground with less maintenance); changing the toolkit's CSS strategy (plain CSS already works); supporting `require()` from CommonJS Node < 22.12 (covered by the prior packaging commit).

---

## 4. Resolved decisions (reviewer calls)
1. **Augmentation set:** `core + lists + content + files + security + search + taxonomy`, composed from `pnpImports/*` **presets**. Rationale: current toolkit runtime touches lists/items/batching/views, fields/content-types, file versions/downloads, security, search, and taxonomy-adjacent controls. `apps`/`features`/`pages`/`social`/`hubsites` are excluded unless the §3 Phase 1 audit proves a runtime need.
2. **`urlSanitizer.ts:88`:** drop the nested deep-require entirely; keep `installSharePointApiUrlFetchSanitizer()` + non-nested best-effort; add tests proving fetch interception rewrites dirty `/_layouts/15` API URLs. Accepted behavior change.
3. **Build helper packaging:** ship under `spfx-toolkit/build`. A separate package is unnecessary until there is independent versioning or broad non-toolkit reuse.
4. **Doctor CLI depth:** minimal first (peer deps, Node/toolchain, lockfile/install mode, forbidden root/bulk imports, `npm link` detection, build-helper presence/use). Bundle-size hints wait for a stable consumer fixture.

## 5. Non-goals
- Rewriting the toolkit's CSS to CSS modules (plain CSS already works config-free).
- Forcing consumers off `npm link` (we make link behave; we don't ban it).
- Bundling peer dependencies.

## 6. Success criteria *(all measured against the Phase 0 fixtures)*
- The published-style fixture imports components with **zero toolkit-induced** app-side `sideEffects`/tsconfig/webpack edits **on the supported SPFx 1.21 / Node 22.14 toolchain**. (We do not promise to absorb external issues like the `@pnp/spfx-controls-react` v2/v3 **type** skew beyond what the fixture proves.)
- The `npm link` fixture needs only the one-line build helper; no hand-maintained `NormalModuleReplacementPlugin`; no duplicate heavy deps in the bundle.
- Light-component bundle cost drops measurably (no incidental `@pnp/sp` surface) — quantified via a before/after bundle measurement on the fixtures.
- The same setup works under gulp/fast-serve today and Heft later.
- `npx spfx-toolkit doctor` flags the common misuse patterns and can gate CI.
