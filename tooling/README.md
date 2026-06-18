# spfx-toolkit / tooling — shared SPFx webpack customizer

Build-time helpers for SPFx (Heft) solutions. The headline export,
`customizeWebpack`, centralizes the webpack patches that **every** SPFx 1.2x
solution using `@pnp/spfx-controls-react`, `@pnp/spfx-property-controls`,
`spfx-toolkit` (and optionally DevExtreme) needs — so each app stops copy‑pasting
a fragile `config/spfx-customize-webpack.js` and fixing the same issues N times.

> ⚠️ **Build-time only.** This code runs in Node during the build (it uses
> `webpack`, `fs`, `path`). **Never** `import` it from a web part / runtime
> component — that would drag the build toolchain into your bundle.

---

## What it fixes

| Symptom | Cause | Fix applied |
|---|---|---|
| `Module not found: Can't resolve './X.module.scss.js'` from `@pnp/spfx-controls-react` (RichText, RteColorPicker, …) | @pnp ships pre-compiled controls whose CSS is `*.module.scss.css` (no `.js`). SPFx's `devtool:'source-map'` injects a `source-map-loader` (`enforce:'pre'`) that walks compiled `node_modules` JS and tries to resolve that non-existent `.module.scss.js`. | Disables the internal source-map-loader (`devtool:false`) and emits source maps via a plugin instead. Also excludes `@pnp` from any source-map-loader rule. |
| @pnp controls render **unstyled** / `PropertyFieldCollectionData` renders fields **vertically** | SPFx's `sp-css-loader` re-hashes @pnp's pre-compiled `.module.*` class names, breaking the shipped JS→class mapping. | Excludes `node_modules/@pnp` from the SPFx `.module.*` rule and adds a rule that injects @pnp CSS with `localIdentName:'[local]'` (no re-hash). |
| `Module parse failed: Unexpected character` on `.woff2`/`.ttf` | css-loader follows `url()` in package CSS and imports binary fonts as JS modules. | Routes spfx-toolkit / DevExtreme CSS through dedicated `css-loader` rules + a generic font asset safety-net. |
| Duplicate React / "Invalid hook call" with a linked toolkit | `file:../spfx-toolkit` resolves its own React copy. | `dedupeReact` aliases react/react-dom/@fluentui/tslib to the app's `node_modules`. |

---

## Quick start (each app)

The SPFx rig (`@microsoft/spfx-web-build-rig`) auto-loads
`config/spfx-customize-webpack.js` **by filename convention**. Reduce that file to
a thin shim that delegates here:

```js
// config/spfx-customize-webpack.js
module.exports = require('spfx-toolkit/tooling/customize-webpack')();
```

That's it for a plain `@pnp` + `spfx-toolkit` app. Re-run your serve/build.

### With options

```js
// config/spfx-customize-webpack.js
const path = require('path');

module.exports = require('spfx-toolkit/tooling/customize-webpack')({
  devextreme: true,          // only if the app uses DevExtreme
  dedupeReact: true,         // if spfx-toolkit is a file:../ link
  alias: {                   // app-specific tsconfig path aliases (optional)
    '@store': path.resolve(__dirname, '../lib/libraries/myStore'),
  },
  // extraCssPackages: ['some-other-lib'],  // bundle another package's CSS like the toolkit's
});
```

### Older gulp-based build (no `config/rig.json`)

If the app still uses `gulpfile.js` (not Heft), call the same factory inside the
build config merge:

```js
const build = require('@microsoft/sp-build-web');
const customize = require('spfx-toolkit/tooling/customize-webpack')(/* options */);
build.configureWebpack.mergeConfig({
  additionalConfiguration: (cfg) => customize(cfg),
});
build.initialize(require('gulp'));
```

---

## Options

`customizeWebpack(options)` returns the `(webpackConfig) => webpackConfig` function
the rig expects. All options are optional.

| Option | Type | Default | Purpose |
|---|---|---|---|
| `projectRoot` | `string` | `process.cwd()` | App root; loaders + `node_modules` are resolved from here. |
| `webpack` | `object` | resolved from `projectRoot` | Pass an explicit webpack instance if auto-resolution misses. |
| `sourceMaps` | `boolean` | `true` | The `@pnp` `.module.scss.js` fix (devtool plugin). **Leave on.** |
| `pnp` | `boolean` | `true` | Handle `@pnp` pre-compiled `.module.*` CSS. Covers both `spfx-controls-react` and `spfx-property-controls`. |
| `spfxToolkit` | `boolean` | `true` | Handle `spfx-toolkit` package CSS. |
| `fonts` | `boolean` | `true` | Generic woff/ttf/eot asset safety-net. |
| `devextreme` | `boolean` | `false` | Handle DevExtreme CSS + icon fonts + ignore non-en locales. |
| `dedupeReact` | `boolean` | `false` | Alias react/react-dom/@fluentui/tslib to the app's `node_modules` (use when toolkit is `file:`-linked). |
| `alias` | `object` | `{}` | Extra `resolve.alias` entries merged in (e.g. tsconfig paths). |
| `extraCssPackages` | `string[]` | `[]` | Other `node_modules` package names whose non-module CSS should be bundled like the toolkit's. |
| `verbose` | `boolean` | `true` | Log what was patched. |
| `logPrefix` | `string` | `'[spfx-toolkit:webpack]'` | Log prefix. |

**Always-on** (the universal fixes): `sourceMaps`, `pnp`, `spfxToolkit`, `fonts`.
**Opt-in:** `devextreme`, `dedupeReact`, `alias`, `extraCssPackages`.

---

## Verifying it worked

On `serve`/`build` you should see the customizer's log lines, e.g.:

```
[spfx-toolkit:webpack] source-map: internal source-map-loader disabled (devtool plugin used instead)
[spfx-toolkit:webpack] @pnp: pre-compiled .module.* CSS handled (class names preserved, no re-hash)
[spfx-toolkit:webpack] spfx-toolkit: package CSS rule added
[spfx-toolkit:webpack] font safety-net rule added
```

Then confirm:
- **No** `Can't resolve './*.module.scss.js'` and **no** "Module parse failed: Unexpected character" errors.
- @pnp controls (RichText, PeoplePicker, `PropertyFieldCollectionData`) and spfx-toolkit components render **fully styled** (not unstyled / not vertically stacked).
- A `--production` build also succeeds.

If you see `WARNING: could not find the SPFx .module.* CSS rule to patch for @pnp`,
the SPFx webpack config shape changed for that SPFx version — open an issue /
update the rule matchers in `customize-webpack.js`.

---

## For coding agents — how to adopt this in a solution

> Paste-ready instructions for an agent working **in a consuming app**.

1. **Confirm the build system.** Read `config/rig.json`. If it's
   `@microsoft/spfx-web-build-rig`, the convention file is
   `config/spfx-customize-webpack.js` (Heft). If instead a `gulpfile.js` exists,
   use the `build.configureWebpack.mergeConfig` form (see "Older gulp-based build").
2. **Ensure the dependency.** `spfx-toolkit` must be installed (it usually already
   is). `webpack`, `style-loader`, `css-loader` come transitively with the SPFx
   build toolchain — no extra install needed in normal SPFx solutions.
3. **Replace the convention file** `config/spfx-customize-webpack.js` with the thin
   shim:
   ```js
   module.exports = require('spfx-toolkit/tooling/customize-webpack')({ /* options */ });
   ```
   - Set `devextreme: true` only if `node_modules/devextreme` is present and used.
   - Set `dedupeReact: true` only if `spfx-toolkit` is a `file:` link in `package.json`.
   - Move any existing app-specific `resolve.alias` (tsconfig paths) into `alias`.
   - Do **not** re-implement the @pnp / source-map / toolkit-CSS logic locally — it
     lives here now.
4. **Delete** any now-redundant per-app webpack patching for @pnp / spfx-toolkit /
   fonts (keep only genuinely app-specific bits as options).
5. **Verify** per the "Verifying it worked" section: clean serve, log lines present,
   controls styled, production build green.

---

## Notes & guardrails

- **`webpack` is a (build-time) peer.** Plugins are created from the **app's**
  webpack instance, resolved from `projectRoot`. Do not bundle webpack into the
  toolkit.
- **SPFx-version sensitivity.** Rule matching is by `test`-regex (not rule index)
  and wrapped in guards, but SPFx changes its webpack config shape across versions
  (1.18 / 1.20 / 1.22). Test against each SPFx version your apps use; the `@pnp`
  warning above flags a mismatch.
- **Blast radius.** A change here affects every consuming app on `npm update`.
  Pin a known-good `spfx-toolkit` version per app and bump deliberately.
