import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SPDebug, debugStore } from '../../../lib/utilities/debug/index.js';

describe('SPDebug.export skeletons', () => {
  beforeEach(() => SPDebug.reset());

  test('json export includes preparation summary and eviction summary', () => {
    SPDebug.enable();
    SPDebug.info('App/X', 'hello', { Email: 'a@b.com' });
    SPDebug.info('App/X', 'plain', 'Bearer abc.def.ghijklmn.op');

    const out = SPDebug.export.json();
    assert.equal(typeof out, 'object');
    assert.ok(out.redactionSummary);
    assert.equal(out.redactionSummary.keysByName, 0);
    assert.equal(out.redactionSummary.bearerTokens, 0);
    assert.ok(Array.isArray(out.entries));
    assert.equal(out.entries.length, 2);
  });

  test('markdown export includes summary headers and a timeline', () => {
    SPDebug.enable();
    SPDebug.session.start({ label: 'reproduction X' });
    SPDebug.info('App/Save', 'clicked');
    SPDebug.warn('App/Save', 'validation issue');

    const md = SPDebug.export.markdown();
    assert.match(md, /# SPDebug Session Export/);
    assert.match(md, /## Eviction Summary/);
    assert.match(md, /## Timeline/);
    assert.match(md, /reproduction X/);
    assert.match(md, /clicked/);
    assert.match(md, /validation issue/);
  });

  test('markdown export marks active sessions as still running', () => {
    SPDebug.enable();
    SPDebug.session.start({ label: 'live' });
    SPDebug.info('App/X', 'hi');
    const md = SPDebug.export.markdown();
    assert.match(md, /Session was active at export time/);
  });
});
