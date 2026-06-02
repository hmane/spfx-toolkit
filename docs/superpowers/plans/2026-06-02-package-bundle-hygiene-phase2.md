# Package Bundle & Styling Hygiene — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> **DO NOT IMPLEMENT OR COMMIT YET.** This plan is for review. The plan doc itself must not be committed until Codex validates it. When execution is later authorized, the user requires **Codex validation of every change before any commit**.

**Goal:** Ship a build-tool-agnostic helper (`spfx-toolkit/build` → `applyToolkitWebpackFixes(config, options?)`) so a consumer debugging the toolkit via `npm link` can dedupe heavy peer deps and resolve the nested `@pnp/spfx-controls-react` `.module.scss` without hand-rolling a `webpack.extend.js`.

**Architecture:** A dependency-light CommonJS helper authored in `src/build/` (compiled to `lib/build/` by the existing tsc/gulp build). `buildPeerAliases` and `rewriteControlScssRequest` are **pure** functions; `applyToolkitWebpackFixes` is an **additive in-place** webpack-config transform that returns the **same** config object with only two changes layered on: (1) dedupe heavy peers to the consumer's single copy (`resolve.symlinks = false` + version-stable aliases), (2) a `NormalModuleReplacementPlugin` that rewrites nested linked-toolkit-controls `.module.scss` requests to their precompiled `.module.scss.js`. It touches nothing else in the config. Usable verbatim from fast-serve `webpack.extend.js` and a Heft webpack hook. The Phase 0 `npm-link` fixture is extended to exercise the helper and prove the dedup.

**Tech Stack:** TypeScript→CommonJS (`module: commonjs`, `target: es5`), Node 22.14, `node --test`, gulp build + generated proxy dirs, webpack 5 (consumer-provided).

**Spec:** [docs/superpowers/specs/2026-06-01-package-bundle-and-styling-hygiene-design.md](../specs/2026-06-01-package-bundle-and-styling-hygiene-design.md) · **Phase 0/1 plan:** [2026-06-01-package-bundle-hygiene-phase0-phase1.md](./2026-06-01-package-bundle-hygiene-phase0-phase1.md)

**Prerequisite:** Phase 0 (`e0cc1b8`) and Phase 1 (`b2beaf7`) are committed on `package-bundle-hygiene`. This plan builds on that state.

---

## Resolved design decisions (Codex review — locked for implementation)

1. **Dedup strategy + alias hazard (`@pnp/sp` v2/v3).** `@pnp/spfx-controls-react@3.22` depends on `@pnp/sp@2.5` (PnP **v2**), installed nested. A blanket `resolve.alias['@pnp/sp'] = <consumer v3 dir>` rewrites the request for **every** importer — including the controls' internal v2 imports — redirecting v2→v3 and likely breaking the controls. **Decision:**
   - **Primary dedup mechanism = `resolve.symlinks = false`.** Under `npm link` this makes the linked toolkit resolve its peers from the *consumer's* `node_modules` (deduping same-version copies) while the controls' genuinely-nested v2 still resolves via normal nested resolution — no v2→v3 hazard.
   - **Default aliases = version-stable peers + `@pnp/spfx-controls-react`**, i.e. `DEFAULT_ALIAS_PEERS` (see Task 1). **`@pnp/sp` and `@pnp/queryable` are intentionally EXCLUDED** from the default and explicitly tested as excluded — aliasing core PnP to consumer v3 can break the controls' nested v2.
   - Users may opt into additional aliases via `options.aliasPeers`; the docs (Task 4) must warn about the PnP v2/v3 hazard. Task 3's fixture build is the empirical safety net.
2. **`NormalModuleReplacementPlugin` source.** `ToolkitWebpackFixOptions` gains `webpack?: { NormalModuleReplacementPlugin: any }`. If `options.webpack` is provided, use it; otherwise lazy-resolve `webpack` from `consumerRoot` (try/catch → skip + warn). Keeps the helper dependency-light and makes tests / nonstandard build hooks cleaner.
3. **`consumerRoot` default = `process.cwd()`** (fast-serve/Heft run from the consumer root); overridable.
4. **Rewrite target = `.module.scss.js`** (not `.css`) for the nested linked-toolkit controls path. `@pnp/spfx-controls-react` ships `X.module.scss.js` (+ `X.module.css`) for each `X.module.scss`.
5. **Generated proxy dirs are tracked** in this repo, so Task 2 commits the generated `build/package.json` after `npm run build`, AND adds `"build/"` to `package.json.files` so the proxy ships in `npm pack`.

---

## File Structure

**New (toolkit source — compiled to `lib/build/` by tsc; `tsconfig.include` already globs `src/**/*.ts`):**
- `src/build/applyToolkitWebpackFixes.ts` — the helper + pure sub-functions (`buildPeerAliases`, `rewriteControlScssRequest`, `DEFAULT_ALIAS_PEERS`).
- `src/build/index.ts` — public surface (`export { applyToolkitWebpackFixes, buildPeerAliases, rewriteControlScssRequest, DEFAULT_ALIAS_PEERS } …` + types).
- `tests/build/applyToolkitWebpackFixes.test.mjs` — unit tests (alias generation, scss rewrite, in-place transform / unrelated config preservation — `applyToolkitWebpackFixes` mutates and returns the same config object).

**Modified:**
- `package.json` — add `./build` to `exports`.
- `gulpfile.js:11` — add `'build'` to `GENERATED_PROXY_DIRS` (generates `build/package.json` proxy for classic `spfx-toolkit/build` resolution).
- `fixtures/consumer-link/webpack.config.js` — apply the helper behind an env flag so `verify.mjs` can measure with/without.
- `fixtures/verify.mjs` — add a "link + helper" measurement and assert single heavy-peer roots.
- `fixtures/BASELINE.md` — add a Phase 2 section (link fixture: helper-off vs helper-on copy counts).

**New docs:**
- `docs/NPM-Link-Debug-Workflow.md` — npm-link workflow + fast-serve and Heft usage examples; linked from `README.md`.

**Not touched:** `lib/` (generated), Phase 1 source, `pnpImports/*`. The helper is build-time only and is **not** added to `sideEffects` (it's a pure function module, imported + called, never bare).

---

## Task 1 — The helper module (pure core + assembly)

**Files:**
- Create: `src/build/applyToolkitWebpackFixes.ts`, `src/build/index.ts`
- Test: `tests/build/applyToolkitWebpackFixes.test.mjs`

> Implements Decision 1 (locked): `resolve.symlinks = false` + alias version-stable peers **and** `@pnp/spfx-controls-react`; `@pnp/sp`/`@pnp/queryable` excluded from the default (opt-in only).

- [ ] **Step 1: Write the failing tests** (`tests/build/applyToolkitWebpackFixes.test.mjs`):

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import {
  buildPeerAliases,
  rewriteControlScssRequest,
  applyToolkitWebpackFixes,
  DEFAULT_ALIAS_PEERS,
} from '../../lib/build/index.js';

describe('buildPeerAliases (pure)', () => {
  test('maps each resolvable peer to its resolved dir; skips unresolvable', () => {
    const resolved = buildPeerAliases(['react', 'devextreme', 'missing-xyz'], (p) =>
      p === 'missing-xyz' ? undefined : `/consumer/node_modules/${p}`
    );
    assert.equal(resolved['react'], '/consumer/node_modules/react');
    assert.equal(resolved['devextreme'], '/consumer/node_modules/devextreme');
    assert.equal('missing-xyz' in resolved, false);
  });
});

describe('DEFAULT_ALIAS_PEERS', () => {
  test('includes version-stable peers + @pnp/spfx-controls-react', () => {
    for (const p of ['react', 'react-dom', '@fluentui/react', '@pnp/spfx-controls-react',
      'devextreme', 'devextreme-react', 'react-hook-form', 'react-mentions', 'zustand']) {
      assert.equal(DEFAULT_ALIAS_PEERS.includes(p), true, `${p} should be aliased by default`);
    }
  });
  test('EXCLUDES @pnp/sp and @pnp/queryable (v2/v3 hazard — controls bundle PnP v2)', () => {
    assert.equal(DEFAULT_ALIAS_PEERS.includes('@pnp/sp'), false);
    assert.equal(DEFAULT_ALIAS_PEERS.includes('@pnp/queryable'), false);
  });
});

describe('rewriteControlScssRequest (pure)', () => {
  const sep = (p) => p.split('/').join(path.sep);
  const nestedToolkitCtx = sep('/app/node_modules/spfx-toolkit/node_modules/@pnp/spfx-controls-react/lib/controls/peoplePicker');
  const topLevelCtx = sep('/app/node_modules/@pnp/spfx-controls-react/lib/controls/peoplePicker');
  test('rewrites .module.scss -> .module.scss.js ONLY for the nested linked-toolkit controls path', () => {
    assert.equal(rewriteControlScssRequest('./X.module.scss', nestedToolkitCtx), './X.module.scss.js');
  });
  test('does NOT rewrite a top-level consumer @pnp/spfx-controls-react context', () => {
    assert.equal(rewriteControlScssRequest('./X.module.scss', topLevelCtx), undefined);
  });
  test('does NOT rewrite an unrelated context', () => {
    assert.equal(rewriteControlScssRequest('./X.module.scss', sep('/app/src/webparts')), undefined);
  });
  test('does NOT rewrite non-.module.scss requests', () => {
    assert.equal(rewriteControlScssRequest('./X.css', nestedToolkitCtx), undefined);
  });
});

describe('applyToolkitWebpackFixes (additive in-place transform)', () => {
  test('returns the SAME config object, adds dedup/aliases, preserves unrelated keys', () => {
    const warnings = [];
    const original = { mode: 'production', resolve: { alias: { existing: '/x' } }, plugins: [{ name: 'keep' }], module: { rules: [] } };
    const out = applyToolkitWebpackFixes(original, {
      aliasPeers: ['react'],
      rewriteControlScss: false,
      consumerRoot: process.cwd(),
      onWarn: (m) => warnings.push(m),
    });
    assert.equal(out, original);                        // in-place: same reference returned
    assert.equal(out.mode, 'production');               // unrelated keys untouched
    assert.equal(out.resolve.alias.existing, '/x');     // existing alias preserved
    assert.equal(typeof out.resolve.alias.react, 'string'); // react resolved (devDep present)
    assert.deepEqual(out.module, { rules: [] });        // module untouched
    assert.equal(out.plugins[0].name, 'keep');          // existing plugin preserved
    assert.equal(out.resolve.symlinks, false);          // primary dedup mechanism applied
  });
  test('warns and skips a peer that cannot be resolved', () => {
    const warnings = [];
    const out = applyToolkitWebpackFixes({}, { aliasPeers: ['definitely-not-installed-xyz'], rewriteControlScss: false, onWarn: (m) => warnings.push(m) });
    assert.equal('definitely-not-installed-xyz' in (out.resolve.alias || {}), false);
    assert.equal(warnings.some((w) => w.includes('definitely-not-installed-xyz')), true);
  });
  test('uses an injected webpack.NormalModuleReplacementPlugin when provided', () => {
    const pushed = [];
    class FakeNMRP { constructor(re, cb) { this.re = re; this.cb = cb; } }
    const out = applyToolkitWebpackFixes({}, {
      aliasPeers: false,
      webpack: { NormalModuleReplacementPlugin: FakeNMRP },
      consumerRoot: process.cwd(),
    });
    const plugin = out.plugins.find((p) => p instanceof FakeNMRP);
    assert.ok(plugin, 'NormalModuleReplacementPlugin from options.webpack should be added');
    assert.equal(plugin.re.source, '\\.module\\.scss$');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && node --test --test-reporter=spec tests/build/applyToolkitWebpackFixes.test.mjs`
Expected: FAIL — `lib/build/index.js` not found.

- [ ] **Step 3: Implement `src/build/applyToolkitWebpackFixes.ts`**

```typescript
/**
 * Build-tool-agnostic webpack fixes for consuming spfx-toolkit via `npm link`.
 *
 * `buildPeerAliases` and `rewriteControlScssRequest` are PURE. `applyToolkitWebpackFixes`
 * is an ADDITIVE IN-PLACE transform: it mutates the passed webpack config (adding
 * `resolve.symlinks=false`, dedup aliases, and one NormalModuleReplacementPlugin) and
 * returns the SAME object. Unrelated config keys are preserved. No SPFx/runtime
 * dependency; safe to call from fast-serve `webpack.extend.js` and a Heft webpack hook.
 */
import * as path from 'path';

export interface ToolkitWebpackFixOptions {
  /** Peers to alias to the consumer's single copy. `false` disables aliasing. Default: DEFAULT_ALIAS_PEERS. */
  aliasPeers?: ReadonlyArray<string> | false;
  /** Set `resolve.symlinks = false` so a linked toolkit resolves peers from the consumer tree. Default: true. */
  dedupeSymlinks?: boolean;
  /** Rewrite nested @pnp/spfx-controls-react `.module.scss` -> `.module.scss.js`. Default: true. */
  rewriteControlScss?: boolean;
  /** Root to resolve the consumer's peers (and webpack) from. Default: process.cwd(). */
  consumerRoot?: string;
  /** Inject the webpack instance to use for the plugin. If omitted, webpack is lazy-resolved from consumerRoot. */
  webpack?: { NormalModuleReplacementPlugin: any };
  /** Optional warning sink. Default: no-op. */
  onWarn?: (message: string) => void;
}

/** Default alias set: version-stable peers + `@pnp/spfx-controls-react`.
 *  `@pnp/sp` and `@pnp/queryable` are intentionally EXCLUDED — `@pnp/spfx-controls-react`
 *  bundles @pnp/sp v2, so aliasing the bare core PnP packages to the consumer's v3 copy
 *  would redirect the controls' nested v2 imports to v3 and break them. Opt in via
 *  `options.aliasPeers` only if you understand that hazard. */
export const DEFAULT_ALIAS_PEERS: ReadonlyArray<string> = [
  'react',
  'react-dom',
  '@fluentui/react',
  '@pnp/spfx-controls-react',
  'devextreme',
  'devextreme-react',
  'react-hook-form',
  'react-mentions',
  'zustand',
];

/** PURE: build a `resolve.alias` map pointing each resolvable peer at the consumer's package dir. */
export function buildPeerAliases(
  peers: ReadonlyArray<string>,
  resolvePeer: (peer: string) => string | undefined
): Record<string, string> {
  const alias: Record<string, string> = {};
  for (const peer of peers) {
    const dir = resolvePeer(peer);
    if (dir) {
      alias[peer] = dir; // bare name → consumer dir (also covers subpath imports)
    }
  }
  return alias;
}

/** PURE: given a webpack request + importing context, return the rewritten request
 *  (or undefined to leave it alone). Rewrites ONLY `.module.scss` imported from the
 *  NESTED linked-toolkit controls copy (`.../node_modules/spfx-toolkit/node_modules/@pnp/spfx-controls-react/...`),
 *  never a top-level consumer copy of `@pnp/spfx-controls-react`. */
export function rewriteControlScssRequest(request: string, context: string): string | undefined {
  if (!request.endsWith('.module.scss')) return undefined;
  const needle =
    `${path.sep}node_modules${path.sep}spfx-toolkit${path.sep}node_modules${path.sep}` +
    `@pnp${path.sep}spfx-controls-react${path.sep}`;
  if (!context || context.indexOf(needle) < 0) return undefined;
  return `${request}.js`;
}

export function applyToolkitWebpackFixes<T extends { resolve?: any; plugins?: any[] }>(
  config: T,
  options: ToolkitWebpackFixOptions = {}
): T {
  const consumerRoot = options.consumerRoot || process.cwd();
  const onWarn = options.onWarn || (() => undefined);

  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  config.plugins = config.plugins || [];

  // 1. dedupe linked-toolkit peers to the consumer tree (primary mechanism)
  if (options.dedupeSymlinks !== false) {
    config.resolve.symlinks = false;
  }

  // 2. alias version-stable peers to the consumer's single copy
  if (options.aliasPeers !== false) {
    const peers = Array.isArray(options.aliasPeers) ? options.aliasPeers : DEFAULT_ALIAS_PEERS;
    const resolvePeer = (peer: string): string | undefined => {
      try {
        return path.dirname((require as any).resolve(`${peer}/package.json`, { paths: [consumerRoot] }));
      } catch {
        onWarn(`spfx-toolkit/build: peer '${peer}' not resolvable from ${consumerRoot}; skipping alias`);
        return undefined;
      }
    };
    Object.assign(config.resolve.alias, buildPeerAliases(peers, resolvePeer));
  }

  // 3. rewrite nested linked-toolkit @pnp/spfx-controls-react .module.scss -> precompiled .module.scss.js
  if (options.rewriteControlScss !== false) {
    let webpack = options.webpack;
    if (!webpack) {
      try {
        // webpack is provided by the consumer build (fast-serve / Heft); resolve from consumerRoot.
        webpack = require((require as any).resolve('webpack', { paths: [consumerRoot] }));
      } catch {
        onWarn('spfx-toolkit/build: webpack not resolvable; skipping .module.scss rewrite');
      }
    }
    if (webpack && webpack.NormalModuleReplacementPlugin) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/\.module\.scss$/, (resource: any) => {
          const rewritten = rewriteControlScssRequest(resource.request, resource.context || '');
          if (rewritten) resource.request = rewritten;
        })
      );
    }
  }

  return config;
}
```

- [ ] **Step 4: Implement `src/build/index.ts`**

```typescript
export {
  applyToolkitWebpackFixes,
  buildPeerAliases,
  rewriteControlScssRequest,
  DEFAULT_ALIAS_PEERS,
} from './applyToolkitWebpackFixes';
export type { ToolkitWebpackFixOptions } from './applyToolkitWebpackFixes';
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run build && node --test --test-reporter=spec tests/build/applyToolkitWebpackFixes.test.mjs`
Expected: PASS (all assertions).

- [ ] **Step 6: Commit** (gated on Codex): `git add src/build tests/build && git commit -m "feat(build): add applyToolkitWebpackFixes helper for npm-link consumers"`

**Rollback risk:** the helper is additive and isolated under `src/build`; nothing imports it internally. The only cross-cutting behavior is `resolve.symlinks=false` (Decision 1) — verified by Task 3's fixture build.

---

## Task 2 — Packaging: `./build` export + proxy dir

**Files:** `package.json`, `gulpfile.js`

- [ ] **Step 1: Add the `./build` export** to `package.json` `exports` (place after `./hooks`):

```json
"./build": {
  "types": "./lib/build/index.d.ts",
  "import": "./lib/build/index.js",
  "require": "./lib/build/index.js"
},
```

- [ ] **Step 2: Add the proxy dir** so classic resolution (`spfx-toolkit/build`) works. In `gulpfile.js:11`:

```javascript
const GENERATED_PROXY_DIRS = ['build', 'components', 'hooks', 'types', 'utilities', 'utils'].map(dir =>
  path.join(ROOT_DIR, dir)
);
```

- [ ] **Step 2b: Add `"build/"` to `package.json` `files`** so the generated proxy dir ships in `npm pack` (otherwise `spfx-toolkit/build` resolves locally but is OMITTED from the published tarball). Place it alongside the existing proxy-dir entries (`components/`, `hooks/`, `utilities/`, `utils/`, `types/`); mirror their exact form. Verify with `node -e "console.log(require('./package.json').files)"` after editing.

- [ ] **Step 3: Build + verify both resolution styles**

Run: `npm run build`
Then:
```bash
node -e "require('./lib/build/index.js').applyToolkitWebpackFixes && console.log('lib/build ok')"
node -e "const e=require('./package.json').exports; console.log('./build ->', JSON.stringify(e['./build']))"
node -e "const fs=require('fs'); console.log('proxy build/package.json present:', fs.existsSync('./build/package.json'))"
```
Expected: `lib/build ok`; the export prints; `proxy build/package.json present: true`.

- [ ] **Step 4: Confirm `sideEffects` unchanged** — the helper must NOT be added (pure, used-binding). `grep -n "build" package.json` should show only the export + scripts, no `sideEffects` entry for build.

- [ ] **Step 5: `npm run validate`** — Expected: PASS (validation accepts the new export/proxy).

- [ ] **Step 6: Commit** (gated). Generated proxy dirs are **tracked** in this repo (e.g. `hooks/package.json`, `components/package.json` are committed), so commit the generated `build/package.json` too (after `npm run build` produced it): `git add package.json gulpfile.js build/package.json && git commit -m "build(pkg): expose spfx-toolkit/build export + proxy dir"`

**Rollback risk:** adding a proxy dir name that collides with an existing top-level dir would clobber it — confirm no `build/` dir exists pre-generation (`ls -d build 2>/dev/null` → none). Generated proxy dirs are tracked here (confirm with `git ls-files hooks/package.json`), so `build/package.json` must be committed (Step 6) and `"build/"` must be in `files` (Step 2b) for the tarball.

---

## Task 3 — Fixture wiring + dedup proof

**Files:** `fixtures/consumer-link/webpack.config.js`, `fixtures/verify.mjs`, `fixtures/BASELINE.md`

- [ ] **Step 1: Make the link fixture apply the helper behind an env flag.** Append to `fixtures/consumer-link/webpack.config.js` (so `verify.mjs` can build it both ways):

```javascript
// (at the end, replacing `module.exports = { ... };`)
const config = { /* existing config object */ };
if (process.env.TOOLKIT_FIX === '1') {
  // Resolve the helper from the linked toolkit; apply its webpack fixes.
  const { applyToolkitWebpackFixes } = require('spfx-toolkit/build');
  module.exports = applyToolkitWebpackFixes(config, { consumerRoot: __dirname });
} else {
  module.exports = config;
}
```
(Implementer: refactor the existing `module.exports = {…}` into `const config = {…}` then the conditional. Keep the existing rules/externals/entries intact.)

- [ ] **Step 2: Extend `fixtures/verify.mjs`** to add a third measurement — the link fixture built **with** the helper — and assert dedup. After the existing link build, add a "link + helper" build:

```js
// inside the link stage, after the helper exists in the linked toolkit:
const buildWithFix = sh('npm run build', LINK, { env: { ...process.env, TOOLKIT_FIX: '1' } });
const statsFix = join(LINK, 'stats.json');
stage.withHelper = {
  webpackBuild: (statsErrors(statsFix) || []).length === 0,
  heavyDepCopiesInBundle: Object.fromEntries(HEAVY_DEPS.map(d => [d, duplicateCopiesFromStats(statsFix, d)])),
  symlinksAliasApplied: true, // helper sets resolve.symlinks=false + aliases
};
```
(Implementer: `sh()` must accept an `env` option — extend its `execSync` opts with `env`. The "with helper" build overwrites `stats.json`; read it before the next run. Ensure the non-helper measurement is captured first.)

Add the gate assertions, scoped to the **default-aliased** deps only:
- `withHelper.webpackBuild === true` — aliasing did not break the build (the empirical check for Decision 1).
- For **every** `DEFAULT_ALIAS_PEERS` dep that appears in the bundle, `withHelper.heavyDepCopiesInBundle[dep] <= 1` (no duplicated roots). Iterate `DEFAULT_ALIAS_PEERS` (not a hardcoded subset) so the assertion stays in sync if the default set changes.
- **Do NOT assert `<= 1` for `@pnp/sp` or `@pnp/queryable`** — they are intentionally not aliased (v2/v3 coexistence may be legitimate). Add `@pnp/queryable` to the measured set and **report** `@pnp/sp` + `@pnp/queryable` counts separately (`withHelper.pnpCoreCopies = { '@pnp/sp': …, '@pnp/queryable': … }`) without asserting on them.
- Published-style metrics unchanged vs the Phase 1 baseline (Card-only ≈ 836,190; CSS bundled; no-extra-config).

- [ ] **Step 3: Run the fixture gate**

Run: `npm run build && npm run fixtures:verify`
Expected: GATE PASS. `report.stages.link.withHelper.webpackBuild === true`; `withHelper.heavyDepCopiesInBundle` shows ≤1 root per bundled **default-aliased** dep; `withHelper.pnpCoreCopies` is reported (not gated); **published-style metrics unchanged** vs the Phase 1 baseline (Card-only ≈ 836,190; CSS bundled; no-extra-config).

- [ ] **Step 4: Record results in `fixtures/BASELINE.md`** — add a "Phase 2" section: link fixture heavy-dep copies helper-off vs helper-on (default-aliased deps), the separately-reported `@pnp/sp`/`@pnp/queryable` counts, and confirmation the build still succeeds with aliasing (the Decision-1 empirical result).

- [ ] **Step 5: Commit** (gated): `git add fixtures && git commit -m "test(fixtures): exercise applyToolkitWebpackFixes in the npm-link fixture"`

**Rollback risk:** the default alias set already excludes `@pnp/sp`/`@pnp/queryable`, so the residual hazard is `@pnp/spfx-controls-react` aliasing. If Step 3's helper-on build fails, drop `@pnp/spfx-controls-react` from `DEFAULT_ALIAS_PEERS` and rely on `resolve.symlinks=false` for it. The fixture is the empirical safety net; do not proceed to Task 4 until Step 3 is green.

---

## Task 4 — Documentation

**Files:** `docs/NPM-Link-Debug-Workflow.md` (new), `README.md` (link), `docs/AI-Assistant-Guide.md` (one-line pointer)

- [ ] **Step 1: Write `docs/NPM-Link-Debug-Workflow.md`** covering:
  - Why `npm link` duplicates heavy peers + breaks nested `@pnp/spfx-controls-react` styles (cite the BASELINE precondition).
  - **fast-serve usage** — exact `config/fast-serve/webpack.extend.js`:
    ```js
    const { applyToolkitWebpackFixes } = require('spfx-toolkit/build');
    const transformConfig = function (initialWebpackConfig) {
      return applyToolkitWebpackFixes(initialWebpackConfig, { consumerRoot: __dirname });
    };
    module.exports = { transformConfig };
    ```
  - **Heft usage** — applying the same helper from a Heft webpack config hook (`heft-webpack5-plugin` `configureWebpack`), with a short note that the helper is a plain `(config) => config` transform so it is build-tool-agnostic.
  - The `ToolkitWebpackFixOptions` table (`aliasPeers`, `dedupeSymlinks`, `rewriteControlScss`, `consumerRoot`, `webpack`, `onWarn`).
  - **Explicitly document the alias defaults:** `@pnp/spfx-controls-react` **is** aliased by default; `@pnp/sp` and `@pnp/queryable` are **intentionally NOT** aliased by default, because `@pnp/spfx-controls-react` carries nested PnP **v2** deps and aliasing core PnP to the consumer's v3 can break the controls. Warn that opting them in via `options.aliasPeers` carries that v2/v3 hazard.
  - **State clearly:** the helper is **only for `npm link` debugging**; a normal **published install needs no helper** (and no `webpack.extend.js`/Heft change).

- [ ] **Step 2: Link it** from `README.md` (near the existing import-rules section) and add a one-line pointer in `docs/AI-Assistant-Guide.md`.

- [ ] **Step 3: Commit** (gated): `git add docs README.md && git commit -m "docs: npm-link debug workflow + build helper usage"`

**Rollback risk:** docs-only; none.

---

## Task 5 — Full acceptance gate

- [ ] **Step 1: Run the full gate on Node 22.14**

Run, expecting all green:
```bash
node -v                       # v22.14.x
npm run build
npm run type-check
npm run validate
npm test                      # existing suite + new tests/build/*
npm run fixtures:verify       # GATE PASS
```

- [ ] **Step 2: Confirm acceptance criteria**
  - `lib/build/index.js` exists; `spfx-toolkit/build` resolves via both the `exports` map and the proxy dir.
  - **Published fixture unchanged / no regression** (Card-only ≈ 836,190; CSS bundled; no-extra-config build true).
  - **Link fixture with helper:** `webpackBuild` true and no duplicated roots for bundled default-aliased deps; `@pnp/sp` and `@pnp/queryable` are reported separately (`pnpCoreCopies`) and not gated.
  - No new `sideEffects` entry; no change to Phase 1 source.

---

## Self-Review (against the spec + task brief)

- **New export `spfx-toolkit/build`** → Task 2. ✓
- **`applyToolkitWebpackFixes(config, options?)`** → Task 1 (exact signature + options). ✓
- **Aliases heavy peers to consumer copy** → Task 1 `buildPeerAliases` + `resolve.symlinks=false`. **Decision 1 locked:** default aliases = version-stable peers + `@pnp/spfx-controls-react`; `@pnp/sp` + `@pnp/queryable` excluded (v2/v3 break) and explicitly tested as excluded; opt-in via `options.aliasPeers`. ✓
- **Nested `.module.scss` → `.module.scss.js` rewrite** → Task 1 `rewriteControlScssRequest` + plugin. ✓
- **Does not mutate unrelated config** → Task 1 Step 1 test asserts `mode`/`module`/existing alias/plugins preserved. ✓
- **fast-serve + Heft usable; pure, no SPFx runtime dep** → Task 1 design + Task 4 examples. ✓
- **Tests: alias generation, scss rule, fixture update** → Task 1 (unit) + Task 3 (fixture). ✓
- **Packaging: export, proxy, sideEffects expectation** → Task 2. ✓
- **Docs: npm-link workflow, fast-serve, Heft** → Task 4. ✓
- **Acceptance commands** → Task 5. ✓
- **Placeholder scan:** Task 3 Step 1/2 say "refactor the existing config object" + "`sh()` must accept env" rather than pasting the whole regenerated fixture/verify files — these are precise, localized instructions against known files, not vague placeholders, but the implementer should paste the full resulting files when executing. Flagged.
- **Type consistency:** `applyToolkitWebpackFixes`, `buildPeerAliases`, `rewriteControlScssRequest`, `DEFAULT_ALIAS_PEERS`, `ToolkitWebpackFixOptions` are named identically across Tasks 1/3/4. ✓

## Decisions (locked per Codex review — no open questions remain)
1. Dedup = `resolve.symlinks=false`; default aliases = version-stable peers + `@pnp/spfx-controls-react`; `@pnp/sp` + `@pnp/queryable` excluded by default (v2/v3 hazard), opt-in via `options.aliasPeers`.
2. Plugin source = `options.webpack` if provided, else lazy-resolve `webpack` from `consumerRoot`.
3. `consumerRoot` default = `process.cwd()`.
4. Rewrite target = `.module.scss.js`, scoped to the **nested linked-toolkit** controls path only (`…/node_modules/spfx-toolkit/node_modules/@pnp/spfx-controls-react/…`).
5. Proxy dirs are tracked → commit generated `build/package.json`; add `"build/"` to `package.json.files`.

Residual empirical check (not a blocker): Task 3's helper-on link build proves aliasing — including `@pnp/spfx-controls-react` — does not break the build; if it does, drop `@pnp/spfx-controls-react` from `DEFAULT_ALIAS_PEERS` and rely on `resolve.symlinks=false`.
