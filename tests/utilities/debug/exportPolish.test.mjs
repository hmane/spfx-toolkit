/**
 * Phase 6: hardened export sections — grouped-by-source, snapshots, tables,
 * workflows. The skeleton tests in `export.test.mjs` already cover the basic
 * summary/timeline; this file exercises the new sections and the keyed
 * latest-wins reflection of rich runtime state.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SPDebug } from '../../../lib/utilities/debug/index.js';

describe('SPDebug.export — grouped sections', () => {
  beforeEach(() => SPDebug.reset());

  test('Markdown export includes "Entries grouped by source" with sub-headers', () => {
    SPDebug.enable();
    SPDebug.info('App/Save', 'click');
    SPDebug.info('App/Save', 'submit');
    SPDebug.warn('Service/Search', 'slow', { ms: 1500 });
    const md = SPDebug.export.markdown();
    assert.match(md, /## Entries grouped by source/);
    assert.match(md, /### App\/Save \(2\)/);
    assert.match(md, /### Service\/Search \(1\)/);
  });

  test('Markdown export includes Snapshots section with JSON code blocks', () => {
    SPDebug.enable();
    SPDebug.set('App/CurrentItem', { id: 1, status: 'Draft' });
    const md = SPDebug.export.markdown();
    assert.match(md, /## Snapshots/);
    assert.match(md, /### App\/CurrentItem/);
    assert.match(md, /```json/);
    assert.match(md, /"status": "Draft"/);
  });

  test('Markdown export includes Tables section with row counts', () => {
    SPDebug.enable();
    SPDebug.table('Search results', [{ id: 1 }, { id: 2 }, { id: 3 }], {
      source: 'Service/Search',
    });
    const md = SPDebug.export.markdown();
    assert.match(md, /## Tables/);
    assert.match(md, /\| Search results \| Service\/Search \| 3 \|/);
  });

  test('Markdown export includes Workflows grouped by correlationId', () => {
    SPDebug.enable();
    const a = SPDebug.startTrace('Save', { correlationId: 'doc-1' });
    a.step('validated');
    a.end();
    const b = SPDebug.startTrace('Save', { correlationId: 'doc-1' });
    b.step('round 2');
    b.end();
    const c = SPDebug.startTrace('Save', { correlationId: 'doc-2' });
    c.end();

    const md = SPDebug.export.markdown();
    assert.match(md, /## Workflows/);
    assert.match(md, /### Save · doc-1/);
    assert.match(md, /### Save · doc-2/);
    assert.match(md, /\*\*Save\*\* \[success\]/);
  });

  test('Markdown export shows status flag for corrupted traces', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('Bad');
    h.end();
    h.step('after-end'); // marks corrupted
    const md = SPDebug.export.markdown();
    assert.match(md, /_\(corrupted\)_/);
  });

  test('JSON export exposes snapshots, tables, traces, metrics', () => {
    SPDebug.enable();
    SPDebug.set('a', 1);
    SPDebug.table('rows', [{ x: 1 }]);
    SPDebug.metric('count', 7);
    SPDebug.startTrace('Flow', { correlationId: 1 }).end();

    const out = SPDebug.export.json();
    assert.equal(out.snapshots.length, 1);
    assert.equal(out.tables.length, 1);
    assert.equal(out.traces.length, 1);
    assert.equal(out.metrics.length, 1);
    assert.equal(out.snapshots[0].key, 'a');
    assert.equal(out.metrics[0].value, 7);
  });

  test('Markdown export still works with no entries (smoke test)', () => {
    const md = SPDebug.export.markdown();
    assert.match(md, /# SPDebug Session Export/);
    assert.match(md, /## Timeline/);
    assert.match(md, /_\(no entries\)_/);
  });
});
