/**
 * Phase 4: rich runtime APIs.
 *
 * Covers `set`/`json`/`table`/`metric`/`timer` capture-time semantics,
 * disabled-cost no-walk guarantees, optional redaction at capture time, and
 * keyed latest-wins behavior.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SPDebug,
  debugStore,
} from '../../../lib/utilities/debug/index.js';

function tripwirePayload() {
  const trap = {};
  Object.defineProperty(trap, 'sensitive', {
    enumerable: true,
    get() {
      throw new Error('payload was walked while capture was disabled');
    },
  });
  return trap;
}

describe('SPDebug.set — keyed snapshots', () => {
  beforeEach(() => SPDebug.reset());

  test('captures a snapshot and stores it in the snapshots map', () => {
    SPDebug.enable();
    SPDebug.set('App/CurrentItem', { id: 1, status: 'Draft' });
    const map = debugStore.getState().snapshots;
    const snap = map.get('App/CurrentItem');
    assert.ok(snap);
    assert.equal(snap.source, 'App');
    assert.deepEqual(snap.value, { id: 1, status: 'Draft' });
  });

  test('latest value wins for the same key', () => {
    SPDebug.enable();
    SPDebug.set('k', { v: 1 });
    SPDebug.set('k', { v: 2 });
    SPDebug.set('k', { v: 3 });
    const snap = debugStore.getState().snapshots.get('k');
    assert.deepEqual(snap.value, { v: 3 });
    // No timeline entries for snapshots.
    assert.equal(debugStore.getState().entries.length, 0);
  });

  test('keeps sensitive-looking keys by default', () => {
    SPDebug.enable();
    SPDebug.set('user', { LoginName: 'i:0#.f|membership|alice@contoso.com', name: 'Alice' });
    const snap = debugStore.getState().snapshots.get('user');
    assert.equal(snap.value.LoginName, 'i:0#.f|membership|alice@contoso.com');
    assert.equal(snap.value.name, 'Alice');
  });

  test('does not walk payload while disabled', () => {
    assert.doesNotThrow(() => SPDebug.set('k', tripwirePayload()));
    assert.equal(debugStore.getState().snapshots.size, 0);
  });

  test('source defaults to "App" but options.source overrides', () => {
    SPDebug.enable();
    SPDebug.set('a', 1);
    SPDebug.set('b', 2, { source: 'App/Form' });
    const aMap = debugStore.getState().snapshots;
    assert.equal(aMap.get('a').source, 'App');
    assert.equal(aMap.get('b').source, 'App/Form');
  });
});

describe('SPDebug.json — timeline JSON entry', () => {
  beforeEach(() => SPDebug.reset());

  test('emits a timeline entry of type "json"', () => {
    SPDebug.enable();
    SPDebug.json('Form values', { firstName: 'A', last: 'B' });
    const entries = debugStore.getState().entries;
    assert.equal(entries.length, 1);
    assert.equal(entries[0].type, 'json');
    assert.equal(entries[0].message, 'Form values');
    assert.deepEqual(entries[0].data, { firstName: 'A', last: 'B' });
  });

  test('does not walk payload while disabled', () => {
    assert.doesNotThrow(() => SPDebug.json('k', tripwirePayload()));
    assert.equal(debugStore.getState().entries.length, 0);
  });
});

describe('SPDebug.table — keyed tables', () => {
  beforeEach(() => SPDebug.reset());

  test('captures rows in the tables map', () => {
    SPDebug.enable();
    SPDebug.table('Search results', [{ id: 1 }, { id: 2 }]);
    const tbl = debugStore.getState().tables.get('Search results');
    assert.ok(tbl);
    assert.equal(tbl.rows.length, 2);
  });

  test('latest rows win for the same key', () => {
    SPDebug.enable();
    SPDebug.table('k', [{ a: 1 }]);
    SPDebug.table('k', [{ a: 2 }, { a: 3 }]);
    const tbl = debugStore.getState().tables.get('k');
    assert.equal(tbl.rows.length, 2);
  });

  test('does not walk rows while disabled', () => {
    const trap = [tripwirePayload()];
    assert.doesNotThrow(() => SPDebug.table('k', trap));
    assert.equal(debugStore.getState().tables.size, 0);
  });

  test('options.columns is preserved for the panel renderer', () => {
    SPDebug.enable();
    SPDebug.table('docs', [{ name: 'a', size: 100 }], {
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'size', label: 'Size', format: 'fileSize' },
      ],
    });
    const tbl = debugStore.getState().tables.get('docs');
    assert.equal(tbl.columns.length, 2);
    assert.equal(tbl.columns[1].format, 'fileSize');
  });
});

describe('SPDebug.metric — keyed metrics', () => {
  beforeEach(() => SPDebug.reset());

  test('captures number and string metrics latest-wins', () => {
    SPDebug.enable();
    SPDebug.metric('selectedCount', 5);
    SPDebug.metric('selectedCount', 7);
    SPDebug.metric('mode', 'edit');
    const m = debugStore.getState().metrics;
    assert.equal(m.get('selectedCount').value, 7);
    assert.equal(m.get('mode').value, 'edit');
  });

  test('can redact string metric values when opt-in redaction is enabled', () => {
    SPDebug.enable();
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      redact: { enabled: true, urls: 'queryAndFragment' },
    });
    SPDebug.metric('owner', 'alice@example.com');
    const metric = debugStore.getState().metrics.get('owner');
    assert.equal(metric.value, '[redacted:email]');
    assert.equal(debugStore.getState().redactionSummary.emails, 1);
  });

  test('does nothing while disabled', () => {
    SPDebug.metric('x', 1);
    assert.equal(debugStore.getState().metrics.size, 0);
  });

  test('does not walk string metric while disabled', () => {
    assert.doesNotThrow(() => SPDebug.metric('owner', 'alice@example.com'));
    assert.equal(debugStore.getState().metrics.size, 0);
    assert.equal(debugStore.getState().redactionSummary.emails, 0);
  });
});

describe('SPDebug.timer — duration capture', () => {
  beforeEach(() => SPDebug.reset());

  test('end() emits one timer entry per cycle', () => {
    SPDebug.enable();
    const t = SPDebug.timer('Load X', { source: 'Service/Loader' });
    t.end();
    const entries = debugStore.getState().entries;
    assert.equal(entries.length, 1);
    assert.equal(entries[0].type, 'timer');
    assert.equal(entries[0].source, 'Service/Loader');
    assert.equal(entries[0].message, 'Load X');
  });

  test('second end() is a no-op', () => {
    SPDebug.enable();
    const t = SPDebug.timer('x');
    t.end();
    t.end();
    t.end();
    assert.equal(debugStore.getState().entries.length, 1);
  });

  test('end() with status maps to entry level', () => {
    SPDebug.enable();
    SPDebug.timer('a').end({ status: 'error' });
    SPDebug.timer('b').end({ status: 'warning' });
    const entries = debugStore.getState().entries;
    assert.equal(entries[0].level, 'error');
    assert.equal(entries[1].level, 'warn');
  });

  test('disabled timer is a no-op stub', () => {
    const t = SPDebug.timer('x');
    assert.doesNotThrow(() => t.end({ data: tripwirePayload() }));
    assert.equal(debugStore.getState().entries.length, 0);
  });
});
