// Phase 0 fixture webpack config — approximates the relevant parts of the SPFx
// pipeline that affect this toolkit: ts-loader for .ts(x), style-loader+css-loader
// for the toolkit's plain .css side-effect imports.
//
// LIMITATION (documented in fixtures/BASELINE.md): SPFx's real pipeline also adds
// @microsoft/loader-load-themed-styles and SCSS-module scoping rules whose path
// scoping is what triggers the @pnp/spfx-controls-react .module.scss failure under
// npm link. That exact failure is NOT reproducible in plain webpack; we detect its
// precondition (nested duplicate copies) via filesystem inspection in verify.mjs.
//
// ts-loader runs in transpileOnly mode: this is a bundle-measurement fixture, not a
// type-check gate, so we don't need every peer's .d.ts resolvable.
const path = require('path');

const config = {
  entry: {
    // Card only — the lightweight-component baseline Phase 1 must not regress.
    light: './src/light.ts',
    // Card + SPContext + BatchBuilder — a PnP-backed feature baseline.
    app: './src/app.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: { extensions: ['.ts', '.tsx', '.js'] },
  // SPFx provides @microsoft/sp-* (and their @ms/@msinternal internals) from the
  // page runtime and externalizes them at build time — they are NOT bundled, and
  // outside the real SPFx build they can't even resolve (they import SPFx-internal
  // packages + .resx). Mirror SPFx by externalizing them. @pnp/* and @fluentui/react
  // stay bundled (SPFx bundles those), so we can measure the toolkit's pull-through.
  externals: [
    function ({ request }, callback) {
      if (/^@microsoft\/sp-/.test(request) || /^@ms\//.test(request) || /^@msinternal\//.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: { loader: 'ts-loader', options: { transpileOnly: true } }
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
  stats: { modules: true, assets: true, modulesSpace: 9999 }
};

// When TOOLKIT_FIX=1, route the config through the shipped build helper. The helper is now a narrow
// @pnp/spfx-controls-react .module.scss resolver (no alias/dedupe); this just proves it doesn't break
// the build. `webpack` is injected because this fixture uses plain webpack rather than fast-serve/Heft.
module.exports =
  process.env.TOOLKIT_FIX === '1'
    ? require('spfx-toolkit/build').applyToolkitWebpackFixes(config, { webpack: require('webpack') })
    : config;
