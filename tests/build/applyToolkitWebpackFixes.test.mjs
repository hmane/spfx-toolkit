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
