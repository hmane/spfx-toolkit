/**
 * Narrow webpack fix for consuming `@pnp/spfx-controls-react` controls in build pipelines that do
 * NOT replicate SPFx's SCSS-module resolution (notably spfx-fast-serve, and potentially Heft).
 *
 * `@pnp/spfx-controls-react` controls do `import styles from './X.module.scss'` but ship a precompiled
 * artifact instead of a raw `.module.scss`:
 *   - v3.24+ ships `X.module.scss.css` (real CSS)
 *   - v3.22  ships `X.module.scss.js` (a styles module)
 * SPFx's normal gulp build resolves the bare `.module.scss` request to that artifact; fast-serve's webpack
 * does not, so the import fails ("Can't resolve './X.module.scss'"). This helper adds a single
 * `NormalModuleReplacementPlugin` that rewrites the request to whichever artifact actually exists.
 * It also aliases `@microsoft/sp-lodash-subset` to a tiny local shim for fast-serve form customizers,
 * where SharePoint can otherwise try to load that SPFx framework external from `relative-path.invalid`.
 *
 * INTENTIONALLY NARROW: no dependency dedupe, no broad peer aliasing, no `resolve.symlinks` changes.
 * Production builds and stock `gulp serve` need none of this.
 */
import * as path from 'path';
import * as fs from 'fs';

export interface ToolkitWebpackFixOptions {
  /** Inject the webpack instance for the plugin. If omitted, webpack is resolved via require('webpack'). */
  webpack?: { NormalModuleReplacementPlugin: any };
  /** Optional warning sink. Default: no-op. */
  onWarn?: (message: string) => void;
  /** Alias `@microsoft/sp-lodash-subset` to a local shim. Default: true. */
  shimSpLodashSubset?: boolean;
}

/** Path fragment identifying the `@pnp/spfx-controls-react` compiled controls dir, at ANY nesting depth —
 *  matches both the top-level `node_modules/@pnp/spfx-controls-react/lib/` and a nested
 *  `node_modules/spfx-toolkit/node_modules/@pnp/spfx-controls-react/lib/`. */
const CONTROLS_LIB_NEEDLE =
  `${path.sep}node_modules${path.sep}@pnp${path.sep}spfx-controls-react${path.sep}lib${path.sep}`;

/** css-loader options for the precompiled `.module.scss.css` (real CSS) case. `[local]` preserves the
 *  control's own class names so `styles.x` lines up with the shipped CSS. */
const CSS_LOADER_QUERY = JSON.stringify({ modules: { localIdentName: '[local]' } });

/**
 * PURE: given a webpack request + importing context, return the rewritten request (or `undefined` to
 * leave it alone). Rewrites ONLY `.module.scss` imported from a `@pnp/spfx-controls-react/lib` directory,
 * artifact/version aware:
 *   - if `<request>.css` exists  -> inline-loader chain for that CSS (v3.24+)
 *   - else if `<request>.js` exists -> `<request>.js` (v3.22)
 *   - else -> undefined (never touch a real `.scss` or an unknown layout)
 *
 * `fileExists` is injected so this stays pure and testable. The `.css` case is pinned to an inline loader
 * chain (leading `!!`) so a consumer's own `.css` rule (e.g. fast-serve's) does not ALSO process it — that
 * double pass is what produces the css-loader "Unknown word: import" error.
 */
export function rewriteControlScssRequest(
  request: string,
  context: string,
  fileExists: (absolutePath: string) => boolean
): string | undefined {
  if (!request.endsWith('.module.scss')) {
    return undefined;
  }
  if (!context || context.indexOf(CONTROLS_LIB_NEEDLE) < 0) {
    return undefined;
  }
  const base = path.resolve(context, request);
  if (fileExists(base + '.css')) {
    return `!!style-loader!css-loader?${CSS_LOADER_QUERY}!${request}.css`;
  }
  if (fileExists(base + '.js')) {
    return `${request}.js`;
  }
  return undefined;
}

/**
 * Add the `@pnp/spfx-controls-react` `.module.scss` resolver plugin to a webpack config, in place, and
 * return the same config object. Adds nothing else — no aliases, no `resolve.symlinks`, no dedupe.
 */
export function applyToolkitWebpackFixes<T extends { plugins?: any[] }>(
  config: T,
  options: ToolkitWebpackFixOptions = {}
): T {
  const onWarn = options.onWarn || ((): void => undefined);
  if (options.shimSpLodashSubset !== false) {
    const cfg = config as T & { resolve?: { alias?: Record<string, string> } };
    cfg.resolve = cfg.resolve || {};
    cfg.resolve.alias = cfg.resolve.alias || {};
    cfg.resolve.alias['@microsoft/sp-lodash-subset'] = path.join(__dirname, 'spLodashSubsetShim.js');
  }

  let webpack = options.webpack;
  if (!webpack) {
    try {
      // Provided by the consumer's build (fast-serve / Heft both bundle webpack).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      webpack = require('webpack');
    } catch {
      onWarn('spfx-toolkit/build: webpack not resolvable; skipping @pnp/spfx-controls-react .module.scss fix');
      return config;
    }
  }
  if (!webpack || !webpack.NormalModuleReplacementPlugin) {
    onWarn('spfx-toolkit/build: webpack.NormalModuleReplacementPlugin unavailable; skipping fix');
    return config;
  }

  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(/\.module\.scss$/, (resource: any) => {
      const rewritten = rewriteControlScssRequest(
        resource.request,
        resource.context || '',
        (p: string): boolean => {
          try {
            return fs.existsSync(p);
          } catch {
            return false;
          }
        }
      );
      if (rewritten) {
        resource.request = rewritten;
      }
    })
  );

  return config;
}
