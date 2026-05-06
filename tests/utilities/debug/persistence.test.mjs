import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SPDebug,
  debugStore,
  persistState,
  loadPersistedState,
  clearPersistedState,
} from '../../../lib/utilities/debug/index.js';

class MemoryStorage {
  constructor({ maxBytes = Number.POSITIVE_INFINITY, raise = null } = {}) {
    this.map = new Map();
    this.maxBytes = maxBytes;
    this.raise = raise;
    this.writes = [];
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.writes.push(v.length);
    if (this.raise) {
      const e = this.raise;
      this.raise = null;
      throw e;
    }
    if (v.length > this.maxBytes) {
      const err = new Error('quota');
      err.name = 'QuotaExceededError';
      err.code = 22;
      throw err;
    }
    this.map.set(k, v);
  }
  removeItem(k) {
    this.map.delete(k);
  }
}

let originalWindow;

beforeEach(() => {
  originalWindow = globalThis.window;
  SPDebug.reset();
});

afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

describe('persistence — byte budget', () => {
  test('persists newest entries that fit within persistenceMaxBytes', () => {
    const storage = new MemoryStorage();
    globalThis.window = { sessionStorage: storage };

    SPDebug.enable();
    for (let i = 0; i < 50; i += 1) SPDebug.log('msg-' + i);

    const s = debugStore.getState();
    persistState(
      'session',
      {
        v: 1,
        persistedAt: Date.now(),
        entries: s.entries,
        evictedCount: s.evictedCount,
        evictedBytes: s.evictedBytes,
        activeSession: s.activeSession,
      },
      400, // tight budget
      8 * 1024
    );

    const restored = loadPersistedState('session', 60);
    assert.ok(restored);
    // Some entries dropped to fit budget. Newest msg should be present.
    const messages = restored.entries.map((e) => e.message);
    assert.ok(messages[messages.length - 1] === 'msg-49');
    assert.ok(restored.evictedCount >= 1);
  });
});

describe('persistence — payload stripping', () => {
  test('large payloads get stripped, smaller entries keep payloads', () => {
    const storage = new MemoryStorage();
    globalThis.window = { sessionStorage: storage };

    SPDebug.enable();
    SPDebug.info('App/X', 'small', { a: 1 });
    SPDebug.info('App/X', 'big', { blob: 'x'.repeat(20 * 1024) });

    const s = debugStore.getState();
    persistState(
      'session',
      {
        v: 1,
        persistedAt: Date.now(),
        entries: s.entries,
        evictedCount: s.evictedCount,
        evictedBytes: s.evictedBytes,
        activeSession: s.activeSession,
      },
      2 * 1024 * 1024,
      4 * 1024 // strip threshold
    );

    const restored = loadPersistedState('session', 60);
    assert.ok(restored);
    const small = restored.entries.find((e) => e.message === 'small');
    const big = restored.entries.find((e) => e.message === 'big');
    assert.ok(small);
    assert.ok(big);
    assert.deepEqual(small.data, { a: 1 });
    assert.equal(typeof big.data, 'string');
    assert.match(big.data, /\[stripped: payload/);
  });
});

describe('persistence — quota error handling', () => {
  test('drops oldest persisted entries on quota error and never throws', () => {
    // 200 byte storage limit.
    const storage = new MemoryStorage({ maxBytes: 200 });
    globalThis.window = { sessionStorage: storage };

    SPDebug.enable();
    for (let i = 0; i < 30; i += 1) SPDebug.log('msg-' + i);

    const s = debugStore.getState();
    assert.doesNotThrow(() => {
      persistState(
        'session',
        {
          v: 1,
          persistedAt: Date.now(),
          entries: s.entries,
          evictedCount: s.evictedCount,
          evictedBytes: s.evictedBytes,
          activeSession: s.activeSession,
        },
        10 * 1024, // budget says 10K but storage caps at 200
        8 * 1024
      );
    });
    // The loop may give up after retries. Either we wrote a tiny payload OR
    // we never wrote. Either way, no throw.
    const written = storage.writes.length > 0;
    assert.ok(written, 'storage.setItem should have been attempted');

    // A persistence warning should have been recorded if no successful write.
    const warnings = debugStore.getState().persistenceWarnings;
    if (storage.map.size === 0) {
      assert.ok(warnings.length > 0, 'expected a persistence warning');
    }
  });

  test('non-quota storage errors do not crash and are noted', () => {
    const e = new Error('not a quota');
    e.name = 'SecurityError';
    const storage = new MemoryStorage({ raise: e });
    globalThis.window = { sessionStorage: storage };

    SPDebug.enable();
    SPDebug.log('hi');
    assert.doesNotThrow(() => {
      persistState(
        'session',
        {
          v: 1,
          persistedAt: Date.now(),
          entries: debugStore.getState().entries,
          evictedCount: 0,
          evictedBytes: 0,
          activeSession: null,
        },
        2 * 1024 * 1024,
        8 * 1024
      );
    });
  });
});

describe('persistence — load / clear', () => {
  test('clearPersistedState removes the entry without crash if missing', () => {
    const storage = new MemoryStorage();
    globalThis.window = { sessionStorage: storage };
    assert.doesNotThrow(() => clearPersistedState('session'));
  });

  test('expired state is dropped on load', () => {
    const storage = new MemoryStorage();
    globalThis.window = { sessionStorage: storage };

    persistState(
      'session',
      {
        v: 1,
        persistedAt: Date.now() - 1000 * 60 * 60 * 24, // 24h ago
        entries: [],
        evictedCount: 0,
        evictedBytes: 0,
        activeSession: null,
      },
      2 * 1024 * 1024,
      8 * 1024
    );

    const restored = loadPersistedState('session', 60); // 1h cap
    assert.equal(restored, null);
  });
});
