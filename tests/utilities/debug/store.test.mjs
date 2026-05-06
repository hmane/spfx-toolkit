import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SPDebug, debugStore } from '../../../lib/utilities/debug/index.js';

describe('debugStore primary-claim semantics', () => {
  beforeEach(() => SPDebug.reset());

  test('first claimer becomes primary; second is denied', () => {
    const a = debugStore.getState().claimPrimary('A');
    const b = debugStore.getState().claimPrimary('B');
    assert.equal(a, true);
    assert.equal(b, false);
    assert.equal(debugStore.getState().primaryProviderId, 'A');
  });

  test('release allows re-claim by another provider', () => {
    debugStore.getState().claimPrimary('A');
    debugStore.getState().releasePrimary('A');
    assert.equal(debugStore.getState().primaryProviderId, null);
    const b = debugStore.getState().claimPrimary('B');
    assert.equal(b, true);
  });

  test('release by non-primary is a no-op', () => {
    debugStore.getState().claimPrimary('A');
    debugStore.getState().releasePrimary('X');
    assert.equal(debugStore.getState().primaryProviderId, 'A');
  });

  test('claiming with same id while primary is idempotent', () => {
    debugStore.getState().claimPrimary('A');
    const again = debugStore.getState().claimPrimary('A');
    assert.equal(again, true);
  });
});

describe('debugStore eviction', () => {
  beforeEach(() => SPDebug.reset());

  test('respects maxEvents and increments evictedCount', () => {
    const state = debugStore.getState();
    state.setConfig({
      ...state.config,
      limits: { ...state.config.limits, maxEvents: 3 },
    });
    SPDebug.enable();

    SPDebug.log('a');
    SPDebug.log('b');
    SPDebug.log('c');
    SPDebug.log('d');
    SPDebug.log('e');

    const live = debugStore.getState();
    assert.equal(live.entries.length, 3);
    const messages = live.entries.map((e) => e.message);
    assert.deepEqual(messages, ['c', 'd', 'e']);
    assert.equal(live.evictedCount, 2);
  });
});
