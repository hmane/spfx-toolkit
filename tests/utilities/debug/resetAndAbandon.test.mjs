/**
 * Phase 6: hardening regressions.
 *
 * - `SPDebug.reset()` clears the rich runtime maps (snapshots/tables/metrics/
 *   traces/correlationIndex) and the preparation summary, not just
 *   the entries timeline.
 * - `SPDebug.abandonRunningTraces()` (called by the provider on `pagehide`)
 *   transitions every running trace to `abandoned` with an `endedAt`
 *   timestamp.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SPDebug, debugStore } from '../../../lib/utilities/debug/index.js';

describe('SPDebug.reset — rich runtime coverage', () => {
  beforeEach(() => SPDebug.reset());

  test('clears snapshots, tables, metrics, traces, correlation index', () => {
    SPDebug.enable();
    SPDebug.set('snap', { v: 1 });
    SPDebug.table('rows', [{ a: 1 }]);
    SPDebug.metric('m', 7);
    const t = SPDebug.startTrace('Flow', { correlationId: 'c-1' });
    t.step('s');
    t.end();

    let s = debugStore.getState();
    assert.equal(s.snapshots.size, 1);
    assert.equal(s.tables.size, 1);
    assert.equal(s.metrics.size, 1);
    assert.equal(s.traces.size, 1);
    assert.equal(s.correlationIndex.size, 1);

    SPDebug.reset();
    s = debugStore.getState();
    assert.equal(s.snapshots.size, 0);
    assert.equal(s.tables.size, 0);
    assert.equal(s.metrics.size, 0);
    assert.equal(s.traces.size, 0);
    assert.equal(s.correlationIndex.size, 0);
    assert.equal(s.captureEnabled, false);
    assert.equal(s.panelVisible, false);
  });

  test('clears cumulative preparation summary and persistence warnings', () => {
    SPDebug.enable();
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      redact: { enabled: true, urls: 'queryAndFragment' },
    });
    SPDebug.info('App', 'redact me', { Email: 'a@b.com' });
    debugStore.getState().recordPersistenceWarning('test warning');

    let s = debugStore.getState();
    assert.ok(s.redactionSummary.keysByName > 0);
    assert.equal(s.persistenceWarnings.length, 1);

    SPDebug.reset();
    s = debugStore.getState();
    assert.equal(s.redactionSummary.keysByName, 0);
    assert.equal(s.persistenceWarnings.length, 0);
  });

  test('clears primary-provider claim', () => {
    debugStore.getState().claimPrimary('prov_X');
    assert.equal(debugStore.getState().primaryProviderId, 'prov_X');
    SPDebug.reset();
    assert.equal(debugStore.getState().primaryProviderId, null);
  });
});

describe('pagehide simulation: abandonRunningTraces', () => {
  beforeEach(() => SPDebug.reset());

  test('only transitions running traces; ended traces keep their status', () => {
    SPDebug.enable();
    const a = SPDebug.startTrace('A');
    const b = SPDebug.startTrace('B');
    const ok = SPDebug.startTrace('Done');
    ok.end();

    const before = debugStore.getState().traces.size;
    const count = SPDebug.abandonRunningTraces();
    assert.equal(count, 2);
    const traces = Array.from(debugStore.getState().traces.values());
    assert.equal(traces.length, before);
    const byId = new Map(traces.map((t) => [t.traceId, t]));
    assert.equal(byId.get(a.traceId).status, 'abandoned');
    assert.equal(byId.get(b.traceId).status, 'abandoned');
    assert.equal(byId.get(ok.traceId).status, 'success');
    assert.ok(byId.get(a.traceId).endedAt !== null);
    assert.ok(byId.get(b.traceId).endedAt !== null);
  });

  test('idempotent: running once then again returns 0 the second time', () => {
    SPDebug.enable();
    SPDebug.startTrace('X');
    assert.equal(SPDebug.abandonRunningTraces(), 1);
    assert.equal(SPDebug.abandonRunningTraces(), 0);
  });
});
