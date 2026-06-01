import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SPDebug } from '../../../lib/utilities/debug/index.js';

describe('SPDebug.export — data inclusion', () => {
  beforeEach(() => SPDebug.reset());

  test('entry json payloads are rendered in grouped-by-source section', () => {
    SPDebug.enable();
    SPDebug.json('PayloadKey', { status: 'Draft', id: 42 }, { source: 'App/Save' });
    const md = SPDebug.export.markdown();
    assert.match(md, /PayloadKey/);
    assert.match(md, /"status": "Draft"/);
    assert.match(md, /"id": 42/);
  });

  test('table rows are rendered as a markdown table using provided columns', () => {
    SPDebug.enable();
    SPDebug.table(
      'Results',
      [{ id: 1, title: 'Alpha' }, { id: 2, title: 'Beta' }],
      {
        source: 'Service/Search',
        columns: [{ key: 'id', label: 'ID' }, { key: 'title', label: 'Title' }],
      }
    );
    const md = SPDebug.export.markdown();
    assert.match(md, /\| ID \| Title \|/);
    assert.match(md, /\| 1 \| Alpha \|/);
    assert.match(md, /\| 2 \| Beta \|/);
  });

  test('table rows render with inferred columns when none provided', () => {
    SPDebug.enable();
    SPDebug.table('Rows', [{ name: 'x', count: 5 }]);
    const md = SPDebug.export.markdown();
    assert.match(md, /\| name \| count \|/);
    assert.match(md, /\| x \| 5 \|/);
  });

  test('large tables are capped with a "more rows" marker', () => {
    SPDebug.enable();
    const rows = Array.from({ length: 60 }, (_, i) => ({ i }));
    SPDebug.table('Big', rows);
    const md = SPDebug.export.markdown();
    assert.match(md, /… 10 more rows — see JSON export for full data/);
  });

  test('metrics section is present with values', () => {
    SPDebug.enable();
    SPDebug.metric('count', 7, { source: 'Service/Search' });
    const md = SPDebug.export.markdown();
    assert.match(md, /## Metrics/);
    assert.match(md, /\| count \| 7 \| Service\/Search \|/);
  });

  test('trace step data is rendered as fenced json', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('Save', { correlationId: 'doc-1' });
    h.step('validated', { fields: 3 });
    h.end();
    const md = SPDebug.export.markdown();
    assert.match(md, /"fields": 3/);
  });

  test('primitive rows under provided columns surface the value, not blank cells', () => {
    SPDebug.enable();
    SPDebug.table('Prims', [1, 2], { columns: [{ key: 'v', label: 'Value' }] });
    const md = SPDebug.export.markdown();
    assert.match(md, /\| 1 \|/);
    assert.match(md, /\| 2 \|/);
  });

  test('trace sub-step labels and data are rendered', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('Save', { correlationId: 'doc-2' });
    h.step('parent', {
      subSteps: [{ label: 'child step', timestamp: Date.now(), bytes: 0, data: { ok: true } }],
    });
    h.end();
    const md = SPDebug.export.markdown();
    assert.match(md, /child step/);
    assert.match(md, /"ok": true/);
  });

  test('export.json round-trips through JSON.stringify', () => {
    SPDebug.enable();
    SPDebug.set('a', { nested: { x: 1 } });
    SPDebug.table('t', [{ id: 1 }]);
    SPDebug.metric('m', 5);
    const out = SPDebug.export.json();
    const parsed = JSON.parse(JSON.stringify(out));
    assert.equal(parsed.snapshots.length, 1);
    assert.equal(parsed.tables.length, 1);
    assert.equal(parsed.metrics.length, 1);
  });
});
