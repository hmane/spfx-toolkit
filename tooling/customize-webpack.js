'use strict';

/**
 * spfx-toolkit — shared SPFx (Heft / webpack) build customizer.
 *
 * Centralizes the webpack patches that every SPFx 1.2x solution using
 * `@pnp/spfx-controls-react`, `@pnp/spfx-property-controls`, `spfx-toolkit`
 * (and optionally DevExtreme) needs, so each app stops duplicating a fragile,
 * version-sensitive `config/spfx-customize-webpack.js`.
 *
 * WHY THIS EXISTS — the problems it fixes:
 *  1. `Module not found: Can't resolve './X.module.scss.js'` from
 *     `@pnp/spfx-controls-react` controls (RichText, RteColorPicker, …).
 *     @pnp ships pre-compiled controls whose CSS is `*.module.scss.css` (no
 *     `.js`). SPFx sets `devtool:'source-map'`, which injects a
 *     `source-map-loader` (enforce:'pre') that walks compiled node_modules JS
 *     and tries to resolve that non-existent `.module.scss.js`. We disable the
 *     internal loader and emit source maps via a plugin instead.
 *  2. SPFx's `sp-css-loader` re-hashes @pnp's pre-compiled `.module.*` class
 *     names (breaking the shipped JS→class mapping, e.g. PropertyFieldCollectionData
 *     renders vertically) and tries to import `url()` fonts from package CSS as
 *     JS modules ("Module parse failed: Unexpected character"). We route @pnp and
 *     spfx-toolkit (and DevExtreme) CSS through dedicated, correct rules.
 *
 * IMPORTANT: this is BUILD-TIME code (runs in Node during the build). It is NOT
 * part of the runtime component bundle — never `import` it from a web part.
 *
 * Usage — in each app's `config/spfx-customize-webpack.js` (loaded by convention
 * by the `@microsoft/spfx-web-build-rig`):
 *
 *   module.exports = require('spfx-toolkit/tooling/customize-webpack')({
 *     devextreme: true,                 // opt-in, only if the app uses DevExtreme
 *     dedupeReact: true,                // if spfx-toolkit is a file:../ link
 *     alias: { '@store': require('path').resolve(__dirname, '../lib/...') },
 *   });
 *
 * @typedef {Object} CustomizerOptions
 * @property {string}  [projectRoot]      App root (default: process.cwd()).
 * @property {*}       [webpack]          Explicit webpack instance (default: resolved from projectRoot).
 * @property {boolean} [sourceMaps=true]  Apply the source-map-loader fix (THE @pnp `.module.scss.js` fix).
 * @property {boolean} [pnp=true]         Handle @pnp pre-compiled `.module.*` CSS.
 * @property {boolean} [spfxToolkit=true] Handle spfx-toolkit package CSS.
 * @property {boolean} [fonts=true]       Add a generic woff/ttf/eot asset safety-net rule.
 * @property {boolean} [devextreme=false] Handle DevExtreme CSS + icon fonts + ignore non-en locales.
 * @property {boolean} [dedupeReact=false] Alias react/react-dom/@fluentui/tslib to the app's node_modules.
 * @property {Object}  [alias={}]         Extra `resolve.alias` entries to merge (e.g. tsconfig path aliases).
 * @property {string[]} [extraCssPackages=[]] Other node_modules package names whose non-module CSS should be bundled like spfx-toolkit.
 * @property {boolean} [verbose=true]     Log what was patched.
 * @property {string}  [logPrefix]        Log prefix (default '[spfx-toolkit:webpack]').
 */

const path = require('path');
const fs = require('fs');

/** Resolve a module from the APP's node_modules first, then fall back to here. */
function resolveFrom(projectRoot, request) {
  try {
    return require.resolve(request, { paths: [path.join(projectRoot, 'node_modules'), projectRoot] });
  } catch (e) {
    return require.resolve(request);
  }
}

/** Realpath a dir (handles `file:` symlinks); returns the input on failure. */
function realDir(p) {
  try {
    return fs.existsSync(p) ? fs.realpathSync(p) : p;
  } catch (e) {
    return p;
  }
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

/** Does the rule's test match a PLAIN `.css` file (not `.module.css`)? */
function ruleMatchesPlainCss(rule) {
  if (!rule || !rule.test) return false;
  try {
    if (rule.test instanceof RegExp) return rule.test.test('x.css');
    if (typeof rule.test === 'string') return rule.test.indexOf('css') >= 0;
  } catch (e) { /* ignore */ }
  return false;
}

/** Does the rule's test match `.module.(css|scss|scss.css)` files? */
function ruleMatchesModuleCss(rule) {
  if (!rule || !(rule.test instanceof RegExp)) return false;
  try {
    return rule.test.test('x.module.css')
      || rule.test.test('x.module.scss')
      || rule.test.test('x.module.scss.css');
  } catch (e) {
    return false;
  }
}

/** Append dir(s) to a rule's exclude list (preserving existing excludes). */
function addExclude(rule, dirs) {
  const arr = Array.isArray(dirs) ? dirs : [dirs];
  if (!rule.exclude) {
    rule.exclude = arr.slice();
  } else if (Array.isArray(rule.exclude)) {
    rule.exclude = rule.exclude.concat(arr);
  } else {
    rule.exclude = [rule.exclude].concat(arr);
  }
}

/** Does this rule reference source-map-loader (string / use[] / use.loader)? */
function hasSourceMapLoader(rule) {
  if (!rule) return false;
  if (typeof rule.loader === 'string' && rule.loader.indexOf('source-map-loader') >= 0) return true;
  if (typeof rule.use === 'string' && rule.use.indexOf('source-map-loader') >= 0) return true;
  if (rule.use && typeof rule.use === 'object' && !Array.isArray(rule.use) &&
      typeof rule.use.loader === 'string' && rule.use.loader.indexOf('source-map-loader') >= 0) return true;
  if (Array.isArray(rule.use)) {
    return rule.use.some(function (u) {
      const loader = typeof u === 'string' ? u : (u && u.loader) || '';
      return loader.indexOf('source-map-loader') >= 0;
    });
  }
  return false;
}

/**
 * Factory: returns the `(webpackConfig) => webpackConfig` function the SPFx rig
 * expects from `config/spfx-customize-webpack.js`.
 *
 * @param {CustomizerOptions} [userOptions]
 * @returns {(webpackConfig: any) => any}
 */
module.exports = function createSpfxWebpackCustomizer(userOptions) {
  const options = userOptions || {};
  const projectRoot = options.projectRoot || process.cwd();
  const verbose = options.verbose !== false;
  const logPrefix = options.logPrefix || '[spfx-toolkit:webpack]';
  const log = function (msg) { if (verbose) { console.log(logPrefix + ' ' + msg); } };

  const enableSourceMapFix = options.sourceMaps !== false;
  const enablePnp = options.pnp !== false;
  const enableToolkit = options.spfxToolkit !== false;
  const enableFonts = options.fonts !== false;
  const enableDevextreme = options.devextreme === true;
  const dedupeReact = options.dedupeReact === true;
  const userAlias = options.alias || {};
  const extraCssPackages = options.extraCssPackages || [];

  // Resolve the APP's webpack instance so plugins match the running build.
  let webpack = options.webpack;
  if (!webpack) {
    try {
      webpack = require(resolveFrom(projectRoot, 'webpack'));
    } catch (e) {
      webpack = require('webpack');
    }
  }

  const nodeModules = path.join(projectRoot, 'node_modules');
  const pnpDir = path.join(nodeModules, '@pnp'); // covers spfx-controls-react AND spfx-property-controls

  const toolkitDir = path.join(nodeModules, 'spfx-toolkit');
  const toolkitReal = realDir(toolkitDir);
  const baseToolkitCssDirs = uniq([
    path.join(toolkitDir, 'lib'), path.join(toolkitDir, 'esm'),
    path.join(toolkitReal, 'lib'), path.join(toolkitReal, 'esm'),
  ]);

  // extraCssPackages → treat their lib/esm (and root) CSS like spfx-toolkit CSS.
  const extraCssDirs = [];
  extraCssPackages.forEach(function (pkg) {
    const d = path.join(nodeModules, pkg);
    const real = realDir(d);
    [path.join(d, 'lib'), path.join(d, 'esm'), path.join(real, 'lib'), path.join(real, 'esm'), d, real]
      .forEach(function (x) { extraCssDirs.push(x); });
  });
  const toolkitCssDirs = uniq(baseToolkitCssDirs.concat(extraCssDirs));

  const dxCssDir = path.join(nodeModules, 'devextreme/dist/css');
  const dxCssIconsDir = path.join(nodeModules, 'devextreme/dist/css/icons');

  function loader(name) { return resolveFrom(projectRoot, name); }

  return function customize(webpackConfig) {
    if (!webpackConfig) { return webpackConfig; }
    webpackConfig.module = webpackConfig.module || {};
    webpackConfig.module.rules = webpackConfig.module.rules || [];
    webpackConfig.plugins = webpackConfig.plugins || [];
    webpackConfig.resolve = webpackConfig.resolve || {};

    const isProduction = webpackConfig.mode === 'production';

    // ─── resolve.alias (single React/Fluent instance + user aliases) ───
    const alias = Object.assign({}, webpackConfig.resolve.alias);
    if (dedupeReact) {
      ['react', 'react-dom', '@fluentui/react', '@fluentui/utilities',
        '@fluentui/merge-styles', '@fluentui/react-focus', 'tslib'].forEach(function (dep) {
        const p = path.join(nodeModules, dep);
        if (fs.existsSync(p)) { alias[dep] = p; }
      });
      log('dedupeReact: aliased react/react-dom/@fluentui/tslib to the app node_modules');
    }
    Object.assign(alias, userAlias);
    webpackConfig.resolve.alias = alias;

    // ─── (1) source-map fix — THE @pnp `.module.scss.js` fix ───
    if (enableSourceMapFix) {
      webpackConfig.devtool = false;
      webpackConfig.plugins.push(
        isProduction
          ? new webpack.SourceMapDevToolPlugin({ filename: '[file].map', append: false })
          : new webpack.EvalSourceMapDevToolPlugin({ moduleFilenameTemplate: '[resource-path]' })
      );
      // Belt-and-suspenders: also exclude @pnp from any explicit source-map-loader rule.
      webpackConfig.module.rules.forEach(function (rule) {
        if (hasSourceMapLoader(rule)) { addExclude(rule, [pnpDir]); }
        if (Array.isArray(rule.oneOf)) {
          rule.oneOf.forEach(function (inner) { if (hasSourceMapLoader(inner)) { addExclude(inner, [pnpDir]); } });
        }
      });
      log('source-map: internal source-map-loader disabled (devtool plugin used instead)');
    }

    // ─── exclude external package CSS from SPFx's plain-CSS (sp-css-loader) rule ───
    const plainCssExcludes = [];
    if (enableToolkit) { plainCssExcludes.push.apply(plainCssExcludes, toolkitCssDirs); }
    if (enableDevextreme) { plainCssExcludes.push(dxCssDir); }
    if (plainCssExcludes.length) {
      webpackConfig.module.rules.forEach(function (r) {
        if (ruleMatchesPlainCss(r)) { addExclude(r, plainCssExcludes); }
        if (Array.isArray(r.oneOf)) {
          r.oneOf.forEach(function (inner) { if (ruleMatchesPlainCss(inner)) { addExclude(inner, plainCssExcludes); } });
        }
      });
      log('excluded external package CSS from the SPFx plain-css rule');
    }

    // ─── (2) @pnp pre-compiled module CSS (preserve baked-in class names) ───
    if (enablePnp) {
      const moduleCssRule = webpackConfig.module.rules.find(function (r) {
        return ruleMatchesModuleCss(r) && !ruleMatchesPlainCss(r);
      });
      if (moduleCssRule) {
        addExclude(moduleCssRule, [pnpDir]);
        webpackConfig.module.rules.push({
          test: /\.module\.(?:css|scss|scss\.css)$/i,
          include: [pnpDir],
          use: [
            loader('style-loader'),
            {
              loader: loader('css-loader'),
              options: {
                esModule: true,
                modules: { localIdentName: '[local]', namedExport: false, exportLocalsConvention: 'as-is' },
              },
            },
          ],
        });
        log('@pnp: pre-compiled .module.* CSS handled (class names preserved, no re-hash)');
      } else {
        log('WARNING: could not find the SPFx .module.* CSS rule to patch for @pnp — the SPFx webpack config shape may have changed; verify against this SPFx version');
      }
    }

    // ─── (3) spfx-toolkit (+ extraCssPackages) package CSS ───
    if (enableToolkit) {
      webpackConfig.module.rules.push({
        test: /\.css$/,
        include: toolkitCssDirs,
        sideEffects: true,
        use: [
          loader('style-loader'),
          { loader: loader('css-loader'), options: { url: true, import: true } },
        ],
      });
      log('spfx-toolkit: package CSS rule added');
    }

    // ─── DevExtreme CSS + icon fonts + locale ignore (opt-in) ───
    if (enableDevextreme) {
      const dxIconFontRule = {
        test: /\.(woff2?|ttf|eot|svg)(\?.*)?$/i,
        include: [dxCssIconsDir],
        type: 'asset/resource',
        generator: { filename: 'devextreme-icons/[name]_[contenthash][ext]' },
      };
      webpackConfig.module.rules.unshift(dxIconFontRule);
      webpackConfig.module.rules.push({
        test: /\.css$/,
        include: [dxCssDir],
        use: [
          loader('style-loader'),
          { loader: loader('css-loader'), options: { url: true, import: false } },
        ],
      });
      webpackConfig.plugins.push(new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/, contextRegExp: /devextreme/,
      }));
      webpackConfig.module.rules.forEach(function (r) {
        if (Array.isArray(r.oneOf)) { r.oneOf.unshift(dxIconFontRule); }
      });
      log('devextreme: CSS + icon fonts handled, non-en locales ignored');
    }

    // ─── (4) generic font safety-net ───
    if (enableFonts) {
      const fontRule = { test: /\.(woff2?|ttf|eot)(\?.*)?$/i, type: 'asset/resource' };
      webpackConfig.module.rules.unshift(fontRule);
      webpackConfig.module.rules.forEach(function (r) {
        if (Array.isArray(r.oneOf)) { r.oneOf.unshift(fontRule); }
      });
      log('font safety-net rule added');
    }

    return webpackConfig;
  };
};
