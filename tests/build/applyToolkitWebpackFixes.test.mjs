import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import {
  rewriteControlScssRequest,
  applyToolkitWebpackFixes,
} from '../../lib/build/index.js';

const sep = (p) => p.split('/').join(path.sep);
const topLevelCtx = sep('/app/node_modules/@pnp/spfx-controls-react/lib/controls/errorMessage');
const nestedCtx = sep('/app/node_modules/spfx-toolkit/node_modules/@pnp/spfx-controls-react/lib/controls/dragDropFiles');
const unrelatedCtx = sep('/app/src/webparts/foo');

// fileExists fake: control which artifact "exists" for a given request base.
const existsFor = (exts) => (abs) => exts.some((e) => abs.endsWith('.module.scss' + e));
const CSS_CHAIN_PREFIX = `!!style-loader!css-loader?${JSON.stringify({ modules: { localIdentName: '[local]' } })}!`;

describe('rewriteControlScssRequest (pure, artifact-aware)', () => {
  test('top-level @pnp controls path rewrites to inline .css chain when .css exists (v3.24+)', () => {
    const out = rewriteControlScssRequest('./ErrorMessage.module.scss', topLevelCtx, existsFor(['.css']));
    assert.equal(out, `${CSS_CHAIN_PREFIX}./ErrorMessage.module.scss.css`);
  });

  test('nested @pnp controls path rewrites to inline .css chain when .css exists', () => {
    const out = rewriteControlScssRequest('./DragDropFiles.module.scss', nestedCtx, existsFor(['.css']));
    assert.ok(out && out.startsWith(CSS_CHAIN_PREFIX));
    assert.ok(out.endsWith('!./DragDropFiles.module.scss.css'));
  });

  test('rewrites to .js when only .js exists (v3.22)', () => {
    const out = rewriteControlScssRequest('./ErrorMessage.module.scss', topLevelCtx, existsFor(['.js']));
    assert.equal(out, './ErrorMessage.module.scss.js');
  });

  test('prefers .css when BOTH .css and .js exist', () => {
    const out = rewriteControlScssRequest('./ErrorMessage.module.scss', topLevelCtx, existsFor(['.css', '.js']));
    assert.ok(out.endsWith('!./ErrorMessage.module.scss.css'), 'should pick .css over .js');
  });

  test('does NOT rewrite an unrelated (non-@pnp-controls) context', () => {
    assert.equal(rewriteControlScssRequest('./X.module.scss', unrelatedCtx, existsFor(['.css', '.js'])), undefined);
  });

  test('does NOT rewrite when neither artifact exists (never touch a real .scss)', () => {
    assert.equal(rewriteControlScssRequest('./X.module.scss', topLevelCtx, existsFor([])), undefined);
  });

  test('does NOT rewrite non-.module.scss requests', () => {
    assert.equal(rewriteControlScssRequest('./X.css', topLevelCtx, existsFor(['.css'])), undefined);
  });
});

describe('applyToolkitWebpackFixes (narrow: scss rewrite + form-customizer lodash shim)', () => {
  test('adds the scss plugin and only the lodash-subset shim alias; no symlink/dedupe aliases', () => {
    class FakeNMRP {
      constructor(re, cb) {
        this.re = re;
        this.cb = cb;
      }
    }
    const original = {
      mode: 'production',
      resolve: { alias: { existing: '/x' } },
      plugins: [{ name: 'keep' }],
      module: { rules: [] },
    };
    const out = applyToolkitWebpackFixes(original, { webpack: { NormalModuleReplacementPlugin: FakeNMRP } });

    assert.equal(out, original, 'returns same config (in place)');
    assert.equal(out.mode, 'production', 'unrelated keys untouched');
    assert.deepEqual(out.module, { rules: [] }, 'module untouched');
    assert.equal(out.plugins[0].name, 'keep', 'existing plugin preserved');

    // No dedupe behavior returns:
    assert.equal(out.resolve.symlinks, undefined, 'must NOT set resolve.symlinks');
    assert.equal(out.resolve.alias.existing, '/x', 'existing alias preserved');
    assert.match(
      out.resolve.alias['@microsoft/sp-lodash-subset'],
      /spLodashSubsetShim\.js$/,
      'only framework shim alias should be added'
    );
    assert.deepEqual(
      Object.keys(out.resolve.alias).sort(),
      ['@microsoft/sp-lodash-subset', 'existing'].sort(),
      'must not add broad peer aliases'
    );

    // Exactly one plugin added, and it is the scss NMRP:
    assert.equal(out.plugins.length, 2);
    const added = out.plugins.find((p) => p instanceof FakeNMRP);
    assert.ok(added, 'NormalModuleReplacementPlugin should be added');
    assert.equal(added.re.source, '\\.module\\.scss$');
  });

  test('the added plugin runs its callback without throwing for a @pnp controls request', () => {
    class FakeNMRP {
      constructor(re, cb) {
        this.cb = cb;
      }
    }
    const out = applyToolkitWebpackFixes({}, { webpack: { NormalModuleReplacementPlugin: FakeNMRP } });
    const plugin = out.plugins[0];
    // Real fs is consulted here; the fake path won't exist, so the request stays unchanged — we just
    // assert the callback is wired and runs safely.
    const resource = { request: './ErrorMessage.module.scss', context: topLevelCtx };
    assert.doesNotThrow(() => plugin.cb(resource));
    assert.equal(typeof resource.request, 'string');
  });

  test('no-ops gracefully when webpack.NormalModuleReplacementPlugin is unavailable (no plugin, warns)', () => {
    const warnings = [];
    const out = applyToolkitWebpackFixes({ plugins: [] }, {
      webpack: {},
      onWarn: (m) => warnings.push(m),
    });
    assert.equal(out.plugins.length, 0, 'no plugin added when NMRP unavailable');
    assert.match(out.resolve.alias['@microsoft/sp-lodash-subset'], /spLodashSubsetShim\.js$/);
    assert.ok(warnings.some((w) => w.includes('NormalModuleReplacementPlugin')), 'should warn');
  });

  test('can disable the lodash-subset shim alias explicitly', () => {
    class FakeNMRP {
      constructor(re, cb) {
        this.cb = cb;
      }
    }
    const out = applyToolkitWebpackFixes({ resolve: { alias: {} } }, {
      webpack: { NormalModuleReplacementPlugin: FakeNMRP },
      shimSpLodashSubset: false,
    });
    assert.equal(out.resolve.alias['@microsoft/sp-lodash-subset'], undefined);
  });
});
