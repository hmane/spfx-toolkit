# Phase 0 Baseline — package bundle & styling hygiene

Pre-refactor measurements captured by `npm run fixtures:verify` on the supported toolchain.
Phase 1 re-runs the same command and compares against these numbers (see the plan's Task 1.6 go/no-go gate).

- **Toolchain:** Node `v22.14.0`, base = PR #1 merge commit `6b73d96` (so engines `>=22.14.0 <23.0.0`, build devDependencies present, no `@pnp/logging` peer).
- **How to reproduce:** `node fixtures/verify.mjs` (or `npm run fixtures:verify`). Machine-readable output: `fixtures/last-verify-report.json`.
- **Fixture entries:** `light.js` = `Card` only (lightweight, no PnP); `app.js` = `Card + SPContext + BatchBuilder` (a PnP-backed feature + a direct-`SPFI` PnP utility).

> Numbers are environment-relative (webpack 5.95 + production mode on this machine). What matters for Phase 1 is the **delta** when the same fixture is re-measured in the same environment, not the absolute bytes.

## 1. Published-style consumer (tarball install) — the clean baseline

| Metric | Value |
|---|---|
| Install + webpack build | ok / **0 errors** |
| Built with the committed minimal `tsconfig.json` + `webpack.config.js`, nothing added | **yes** (`noExtraConfigNeeded: true`) |
| Toolkit CSS bundled (Card `--spfx-card` marker present in output) | **yes** |
| `light.js` (Card-only) bytes | **884,502** |
| `app.js` (Card + SPContext + BatchBuilder) bytes | **915,666** |
| Distinct `devextreme` copies in bundle | 0 (installed, but not imported by these entries) |
| Distinct `devextreme-react` copies in bundle | 0 |
| Distinct `@fluentui/react` copies in bundle | 1 |
| Distinct `@pnp/sp` copies in bundle | **3** ⚠️ |
| Distinct `@pnp/spfx-controls-react` copies in bundle | **2** ⚠️ |

> Fixture deps now mirror the toolkit peer set (incl. `@pnp/spfx-controls-react`, `devextreme`, `devextreme-react`, `react-hook-form`, `react-mentions`, `zustand`), so duplication detection covers them even when the chosen entries don't import them. `verify.mjs` is a hard gate: it exits non-zero if toolkit build/pack, either fixture install, either webpack build (0 errors), CSS-bundled, or the no-extra-config published build fails. This run: **GATE: PASS**.

**Assertions proven:**
- **No toolkit-induced consumer config.** The fixture builds with only the standard SPFx-style `tsconfig.json` and a webpack config that externalizes `@microsoft/sp-*` exactly as the real SPFx build does (see Limitations §A). No `sideEffects` edits, no extra tsconfig options, no `.module.scss` plugin were needed for the toolkit's own surface.
- **Toolkit CSS loads with zero config.** The `--spfx-card` custom property from `Card`'s plain `.css` is present in the emitted bundle — confirming the spec's claim that the toolkit's own styles "just work."
- **Card-only baseline = 884,502 B.** This is the number Phase 1's augmentation centralization must **not regress** (ideally improves, since light paths should stop pulling incidental `@pnp/sp` surface).
- **PnP-feature baseline = 915,666 B.** The ~31 KB delta over Card-only is the `@pnp/sp` + SPContext surface. Phase 1's full-preset bootstrap may move this; Task 1.6 records the new value and applies the per-file-minimal-preset fallback if it regresses beyond tolerance.

**⚠️ Observation to re-measure in Phase 1:** `@pnp/sp` resolves to **3 distinct `node_modules/@pnp/sp/` roots** in the bundle even in the clean published-style build. This is a recorded baseline signal (its cause — version/resolution fan-out — is not diagnosed here; Phase 1 re-measures and we learn whether the augmentation centralization changes it). Not acted on in Phase 0.

## 2. npm-link consumer — current debugging pain (precondition captured)

The fixture reproduces `npm link` by symlinking the toolkit (with its own `node_modules`) into the consumer.

| Heavy dep | At consumer top-level | Inside linked toolkit `node_modules` | Duplication precondition |
|---|---|---|---|
| `devextreme` (~108 MB) | yes | **yes** | **DUPLICATED** |
| `devextreme-react` | yes | **yes** | **DUPLICATED** |
| `@fluentui/react` | yes | **yes** | **DUPLICATED** |
| `@pnp/sp` | yes | **yes** | **DUPLICATED** |
| `@pnp/spfx-controls-react` | yes | **yes** | **DUPLICATED** |

| Metric | Value |
|---|---|
| Install + webpack build | ok / 0 errors |
| `light.js` bytes | 884,453 |
| `app.js` bytes | 915,605 |
| `@pnp/sp` copies in bundle | 3 |
| `@pnp/spfx-controls-react` copies in bundle | 2 |

**What this shows:** the **structural precondition** for `npm link` double-bundling is present for **all five** heavy deps — `devextreme` (~108 MB), `devextreme-react`, `@fluentui/react`, `@pnp/sp`, and `@pnp/spfx-controls-react` each exist *both* at the consumer top-level *and* inside the linked toolkit's `node_modules` (the toolkit lists them as devDependencies). A bundler resolving toolkit imports to the nested copies while resolving consumer imports to the top-level copies bundles two physical copies — `devextreme` is the worst case. For the *light/PnP* entries measured here the in-bundle copy counts did not increase over published-style (these specific imports resolved consistently), so the **measurable bundle blow-up is feature-dependent** — it manifests when a consumer uses the heavy DevExtreme / `@pnp/spfx-controls-react` toolkit features, the path covered by Limitation §B (documented manual SPFx repro) rather than an automated build here.

## Limitations (fixture fidelity — accepted in the spec)

**§A — Plain webpack externalizes `@microsoft/sp-*` (required, and faithful).** Outside the real SPFx build, `@microsoft/sp-core-library` (and siblings) fail to resolve because they import SPFx-runtime-internal packages (`@ms/odsp-core-bundle`, `@msinternal/ecs-flight`) and `.resx` resources that only exist inside the SPFx bundler/runtime. The fixture webpack therefore externalizes `@microsoft/sp-*` / `@ms/*` / `@msinternal/*` — which is exactly what the real SPFx build does (those are provided by the page runtime, not bundled). `@pnp/*` and `@fluentui/react` remain bundled so the toolkit's pull-through is measurable.

**§B — The `@pnp/spfx-controls-react` `.module.scss` failure is NOT automatable here.** That failure depends on SPFx's SCSS-loader **path scoping**. Plain webpack has no such scoped SCSS rule, so it can't reproduce the exact symptom. The fixture instead detects the **precondition** (nested duplicate controls/PnP copies under link). This is retained as diagnostic evidence only; the package no longer ships a consumer build helper.

**§C — No generated SPFx fixture.** Per the recorded decision, no `yo @microsoft/sharepoint` project is created; plain-webpack fixtures + the documented manual repro are accepted.

**§D — Numbers are environment-relative.** Compare Phase 1 deltas in the same environment; do not treat absolute bytes as portable.

## Phase 1 result / delta (final, measured 2026-06-02, Node v22.14.0)

`npm run fixtures:verify` after the Phase 1 refactor implemented as **Option 1 — per-feature minimal preset imports** (the central full-preset bootstrap was **rejected**, see below). **GATE: PASS.** Card-only did not regress — it improved. (A `verify.mjs` fix was also required: the fixture `package-lock.json` pinned the previous tarball's integrity, so the published fixture had been installing stale toolkit code; fixture lockfiles are now removed before install and git-ignored.)

| Metric (published-style) | Phase 0 | Phase 1 (Option 1) | Delta |
|---|---|---|---|
| `light.js` (Card-only) | 884,502 | **836,190** | **−48,312 (−5.5%) — improved, no regression ✓** |
| `app.js` (PnP feature) | 915,666 | **879,503** | **−36,163 (−3.9%) — improved** |
| CSS bundled | true | true | ✓ |
| no-extra-config build | true | true | ✓ |
| `@pnp/sp` copies in bundle | 3 | **2** | improved |
| `@pnp/spfx-controls-react` copies | 2 | **0** | improved |
| `@fluentui/react` copies | 1 | 1 | — |

`light.js` now contains **zero** PnP augmentation (`TermStore`/`siteGroups`/`taxonomy` all absent) — `Card` (PnP-free) pulls no augmentation.

**Why the central full-preset bootstrap was rejected (recorded for posterity).** The first Phase 1 attempt centralized augmentation behind a single `ensurePnPAugmentations()` (full preset set) called from `SPContext.initialize()`. It regressed Card-only by ~+61 KB. Root cause (traced via webpack `reasons`): the toolkit compiles to **`module: commonjs`**, and tsc downlevels dynamic `await import('./x')` into an eager `require('./x')`, which webpack bundles into the same chunk (only a *true* surviving `import()` code-splits). Because `Card` imports `SPContext` (for `.logger`), and `sp-context.js` `require`d the bootstrap, the full preset graph landed in `Card`'s bundle. Three tuning fixes (lazy `import()`, dropping the `sideEffects` entry, removing the barrel re-export) all failed for the same reason — the constraint is the CJS compile target, not the import style. **Conclusion:** in a CJS library, reaching a full-preset bootstrap from `SPContext` necessarily bundles it into every `SPContext` consumer. So the bootstrap was deleted and each feature module now imports only the preset(s) it needs.

**Accepted trade-off (Option 1):** raw `SPContext.sp.web.lists(...)` usage by a consumer who imports **no** PnP-backed toolkit feature still relies on the consumer loading the documented `pnpImports` bundle (the pre-existing status quo). The toolkit's own PnP-backed features each load their needed presets, so they work without consumer config.

## Phase 2 / 2.1 update — public build helper removed

The Phase 2 public build helper was removed because app-level webpack/gulp transforms caused more confusion
than value. The toolkit should behave as a library: published/tarball installs, stock `gulp serve`, and
production builds should not require toolkit-specific build configuration. `fixtures:verify` now gates only
the package itself plus the published-style and npm-link-equivalent consumers.

Recommended local-dev consumption is a **flat tarball install**, not `npm link`.

The toolkit no longer imports `@microsoft/sp-lodash-subset` (replaced by
`src/utilities/internal/isEqual.ts`), so consuming the toolkit never forces that SPFx framework external to
load — which was the root cause of the form-customizer `relative-path.invalid/@microsoft/sp-lodash-subset.js`
failures. A hygiene test (`tests/hygiene/no-sp-lodash-subset.test.mjs`) guards against reintroduction.

## Files
- `fixtures/consumer-published/` — tarball-install consumer (minimal `tsconfig` + webpack + `light`/`app` entries).
- `fixtures/consumer-link/` — npm-link-equivalent consumer (toolkit symlinked by `verify.mjs`).
- `fixtures/verify.mjs` — orchestrator (build+pack toolkit → install/build both fixtures → measure → report).
- `fixtures/last-verify-report.json` — machine-readable result of the latest run (regenerated each run; git-ignored).
