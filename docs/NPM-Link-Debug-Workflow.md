# npm-link Debug Workflow

When you need to debug an unreleased change to **spfx-toolkit** from inside a consuming
SPFx web part, the fastest loop is to `npm link` (or `npm install ../spfx-toolkit`) the
local toolkit checkout instead of publishing a throw-away version. That linked layout has
two well-known hazards — this toolkit ships a one-call helper that fixes both.

> **This helper is ONLY for `npm link` debugging.** A normal **published install needs no
> helper** and no `webpack.extend.js` / Heft change — the toolkit resolves its peers from
> the consumer's flat `node_modules` like any other package. Do **not** wire the helper into
> a production build.

---

## Why `npm link` needs a fix

A linked toolkit keeps its **own** `node_modules`, so the consumer ends up with two
physical copies of every heavy peer — one at the consumer top level and one nested under
`node_modules/spfx-toolkit/node_modules/`. Two problems follow:

1. **Duplicate heavy peers in the bundle.** A bundler resolving the toolkit's imports to
   the nested copies while resolving the consumer's imports to the top-level copies bundles
   **both** — `devextreme` (~108 MB on disk), `@fluentui/react`, `react`, etc. get double-bundled.
   This is the duplication precondition captured in [`fixtures/BASELINE.md`](../fixtures/BASELINE.md)
   (§2): under link, all the heavy peers exist *both* at the consumer top level *and* inside
   the linked toolkit.
2. **Broken `@pnp/spfx-controls-react` styles.** SPFx's SCSS-module loader is **path-scoped**
   — it only fires for the consumer `src` and the *top-level* controls copy, not for a nested
   one. So `@pnp/spfx-controls-react` controls imported through the linked toolkit (PeoplePicker,
   FilePicker, RichText toolbar) render **unstyled** because their `.module.scss` requests are
   never compiled. The control already ships a precompiled `X.module.scss.js` next to each
   `X.module.scss`; the fix is to rewrite the nested request to it.

The helper resolves #1 by deduping linked peers to the consumer's single copy and #2 by
rewriting the nested `.module.scss` request — without any toolkit source change in the consumer.

---

## Usage

The helper is a plain `(config) => config` transform with no SPFx or runtime dependency, so
it works from any webpack-based SPFx build. It mutates the passed config in place **and**
returns it, so either `applyToolkitWebpackFixes(config)` or `return applyToolkitWebpackFixes(config)`
is fine.

### fast-serve (`spfx-fast-serve`)

Create or edit `config/fast-serve/webpack.extend.js`:

```js
const { applyToolkitWebpackFixes } = require('spfx-toolkit/build');

const transformConfig = function (initialWebpackConfig) {
  return applyToolkitWebpackFixes(initialWebpackConfig, { consumerRoot: __dirname });
};

module.exports = { transformConfig };
```

### Heft (`@rushstack/heft-webpack5-plugin`)

Apply the same helper from a Heft webpack config hook (`configureWebpack`). Because the
helper is build-tool-agnostic, the only difference from fast-serve is where you get the
config object:

```js
const { applyToolkitWebpackFixes } = require('spfx-toolkit/build');

module.exports = {
  configureWebpack: async (config) => {
    return applyToolkitWebpackFixes(config, { consumerRoot: __dirname });
  },
};
```

---

## Options — `ToolkitWebpackFixOptions`

| Option | Type | Default | Purpose |
|---|---|---|---|
| `aliasPeers` | `string[] \| false` | `DEFAULT_ALIAS_PEERS` | Peers to alias to the consumer's single copy. `false` disables aliasing entirely. |
| `dedupeSymlinks` | `boolean` | `true` | Sets `resolve.symlinks = false` so a linked toolkit resolves peers from the consumer tree (primary dedup mechanism). |
| `rewriteControlScss` | `boolean` | `true` | Rewrites nested `@pnp/spfx-controls-react` `.module.scss` → `.module.scss.js`. |
| `consumerRoot` | `string` | `process.cwd()` | Root to resolve the consumer's peers (and webpack) from. Pass `__dirname` from the config file to be explicit. |
| `webpack` | `{ NormalModuleReplacementPlugin }` | lazy-resolved from `consumerRoot` | Inject the webpack instance for the SCSS-rewrite plugin. If omitted, webpack is resolved from `consumerRoot`; if that fails the rewrite is skipped with a warning. |
| `onWarn` | `(message: string) => void` | no-op | Warning sink for unresolvable peers / missing webpack. Wire to your logger to see what was skipped. |

---

## Alias defaults — and the PnP v2/v3 hazard

`DEFAULT_ALIAS_PEERS` aliases the version-stable peers **and** `@pnp/spfx-controls-react`:

```
react, react-dom, @fluentui/react, @pnp/spfx-controls-react,
devextreme, devextreme-react, react-hook-form, react-mentions, zustand
```

**`@pnp/sp` and `@pnp/queryable` are intentionally NOT aliased by default.**
`@pnp/spfx-controls-react` carries nested PnP **v2** dependencies. Aliasing the bare core
PnP packages (`@pnp/sp` / `@pnp/queryable`) to the consumer's **v3** copy would redirect the
controls' nested **v2** imports to v3 and break them. The default therefore leaves core PnP
to resolve normally; `resolve.symlinks = false` already collapses most of the link-induced
duplication for them.

> ⚠️ You **can** opt them in via `options.aliasPeers: [...DEFAULT_ALIAS_PEERS, '@pnp/sp', '@pnp/queryable']`,
> but only if you understand the v2/v3 hazard above and have verified your build still renders
> `@pnp/spfx-controls-react` controls correctly.

---

## See also

- [`fixtures/BASELINE.md`](../fixtures/BASELINE.md) — measured helper-off vs helper-on copy counts under link.
- [`fixtures/verify.mjs`](../fixtures/verify.mjs) — the automated check that exercises the helper (`TOOLKIT_FIX=1`).
