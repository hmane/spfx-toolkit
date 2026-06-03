# Local Development & the `@pnp` SCSS Helper

This covers two things for consumers of **spfx-toolkit**:

1. How to test an unreleased toolkit change in a consuming SPFx project **without publishing**.
2. The one optional build helper the toolkit ships (`spfx-toolkit/build`) and exactly when you need it.

> **TL;DR — the toolkit needs no build config in normal use.** A published / Artifacts install, a
> production build (`gulp bundle --ship`), and stock `gulp serve` all work with **zero** webpack changes.
> The helper below is **only** relevant if you use `@pnp/spfx-controls-react` controls under
> **spfx-fast-serve** (and possibly Heft), which has a SCSS-resolution gap unrelated to this toolkit.

---

## Testing a local toolkit build without publishing

**Use a flat tarball install — not `npm link`.** `npm link` (and a bare `npm install ../path` / `file:`
dependency) symlinks the toolkit, giving it its own nested `node_modules`. Under SPFx that produces
duplicate copies of framework libraries and brittle module-resolution failures. A flat install behaves
exactly like a published install — one deduped copy of everything — so it's the truest pre-publish test
and needs no webpack workarounds.

```bash
# in your spfx-toolkit clone:
npm run build
npm pack                 # -> spfx-toolkit-<version>.tgz (identical to what `npm publish` uploads)

# in the consuming app:
npm install /path/to/spfx-toolkit-<version>.tgz
```

Iterate by re-running `npm run build && npm pack` in the clone, then re-installing the tarball
(delete `node_modules/spfx-toolkit` first to avoid a stale cache). `npm install <folder> --install-links`
is an equivalent one-step alternative — just don't omit `--install-links` (that symlinks).

---

## The `@pnp/spfx-controls-react` SCSS helper (fast-serve / Heft only)

`@pnp/spfx-controls-react` controls do `import styles from './X.module.scss'`, but the package ships a
**precompiled** artifact, not a raw `.module.scss`:

- v3.24+ ships `X.module.scss.css` (real CSS)
- v3.22 ships `X.module.scss.js` (a styles module)

SPFx's normal build (`gulp bundle` / `gulp serve`) resolves the bare `.module.scss` request to that
artifact. **spfx-fast-serve's webpack does not**, so the import fails with `Can't resolve './X.module.scss'`.
This affects **any** app using `@pnp@3.24` controls under fast-serve — with or without spfx-toolkit. If you
hit it, apply the helper:

### fast-serve (`config/fast-serve/webpack.extend.js`)
```js
const { applyToolkitWebpackFixes } = require('spfx-toolkit/build');

const webpackConfig = {};
const transformConfig = function (initialWebpackConfig) {
  return applyToolkitWebpackFixes(initialWebpackConfig);
};

module.exports = { webpackConfig, transformConfig };
```

### Heft (`heft-webpack5-plugin` `configureWebpack`)
```js
const { applyToolkitWebpackFixes } = require('spfx-toolkit/build');
module.exports = {
  configureWebpack: async (config) => applyToolkitWebpackFixes(config),
};
```

The helper adds **one** `NormalModuleReplacementPlugin` that rewrites `@pnp/spfx-controls-react`
`.module.scss` requests to whichever precompiled artifact actually exists — `.module.scss.css` (3.24+) or
`.module.scss.js` (3.22) — for **both** the top-level `node_modules/@pnp/spfx-controls-react/lib` copy and a
nested one. If neither artifact exists it leaves the request alone (so it never touches a real `.scss`).

## Options — `ToolkitWebpackFixOptions`

| Option | Type | Default | Purpose |
|---|---|---|---|
| `webpack` | `{ NormalModuleReplacementPlugin }` | `require('webpack')` | Inject the webpack instance for the plugin. If omitted, webpack is resolved from the consumer build. |
| `onWarn` | `(message: string) => void` | no-op | Warning sink (e.g. if webpack can't be resolved and the fix is skipped). |

## What the helper intentionally does NOT do
This helper is **deliberately narrow**. It does **not**:
- change `resolve.symlinks`
- add any `resolve.alias` / dedupe peers
- touch anything other than `@pnp/spfx-controls-react` `.module.scss` requests

Earlier versions tried to "fix" `npm link` by deduping peers and disabling symlinks; that caused more
problems than it solved (framework-lib resolution failures, exports-map breakage). The flat-install
workflow above replaces all of that. **Never wire this helper into a production build.**

## See also
- [`../fixtures/BASELINE.md`](../fixtures/BASELINE.md) — fixture measurements.
- The toolkit no longer imports `@microsoft/sp-lodash-subset` (uses an internal equality helper), so
  consuming it never forces that SPFx framework external to load.
