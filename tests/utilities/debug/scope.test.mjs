/**
 * Phase 4: SPDebug.scope(source) — bound source for ergonomic capture.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SPDebug,
  debugStore,
} from '../../../lib/utilities/debug/index.js';

describe('SPDebug.scope(source)', () => {
  beforeEach(() => SPDebug.reset());

  test('binds source on info/warn/error/event/log', () => {
    SPDebug.enable();
    const dbg = SPDebug.scope('App/SaveButton');
    dbg.info('clicked');
    dbg.warn('slow');
    dbg.error(new Error('boom'));
    dbg.event('emitted');
    dbg.log('plain');
    const sources = debugStore.getState().entries.map((e) => e.source);
    assert.deepEqual(sources, [
      'App/SaveButton',
      'App/SaveButton',
      'App/SaveButton',
      'App/SaveButton',
      'App/SaveButton',
    ]);
  });

  test('binds source on json/set/table/metric', () => {
    SPDebug.enable();
    const dbg = SPDebug.scope('App/Form');
    dbg.json('Payload', { x: 1 });
    dbg.set('CurrentItem', { id: 1 });
    dbg.table('Rows', [{ a: 1 }]);
    dbg.metric('Count', 5);

    const jsonEntry = debugStore
      .getState()
      .entries.find((e) => e.message === 'Payload' && e.type === 'json');
    assert.equal(jsonEntry.source, 'App/Form');
    assert.equal(debugStore.getState().snapshots.get('CurrentItem').source, 'App/Form');
    assert.equal(debugStore.getState().tables.get('Rows').source, 'App/Form');
    assert.equal(debugStore.getState().metrics.get('Count').source, 'App/Form');
  });

  test('binds source on timer and startTrace', () => {
    SPDebug.enable();
    const dbg = SPDebug.scope('Service/Loader');
    dbg.timer('Load X').end();
    const trace = dbg.startTrace('Workflow', { correlationId: 7 });
    trace.step('s');
    trace.end();

    const timerEntry = debugStore
      .getState()
      .entries.find((e) => e.type === 'timer');
    assert.equal(timerEntry.source, 'Service/Loader');
    const t = debugStore.getState().traces.get(trace.traceId);
    assert.equal(t.source, 'Service/Loader');
  });

  test('explicit options.source on scope methods is overridden by the bound source', () => {
    // Per design: scope binds source. Per-call options can carry meta but
    // source comes from the scope.
    SPDebug.enable();
    const dbg = SPDebug.scope('A');
    dbg.json('k', { v: 1 }, { meta: { a: 1 } });
    const e = debugStore.getState().entries[0];
    assert.equal(e.source, 'A');
    assert.equal(e.meta.a, 1);
  });
});
