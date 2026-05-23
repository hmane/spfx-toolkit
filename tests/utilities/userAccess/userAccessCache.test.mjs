import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getCache,
  setCache,
  invalidate,
  invalidatePrefix,
  clearAll,
} from '../../../lib/utilities/userAccess/userAccessCache.js';

// Stub window for the Node test environment
globalThis.window = globalThis.window || globalThis;

describe('userAccessCache', () => {
  beforeEach(() => clearAll());

  test('returns undefined when key missing', () => {
    assert.equal(getCache('missing'), undefined);
  });

  test('returns value within TTL', () => {
    setCache('k', { x: 1 }, 60_000);
    assert.deepEqual(getCache('k'), { x: 1 });
  });

  test('returns undefined when TTL has expired', async () => {
    setCache('k', { x: 1 }, 1); // 1ms TTL
    await new Promise(r => setTimeout(r, 10));
    assert.equal(getCache('k'), undefined);
  });

  test('invalidate removes the key', () => {
    setCache('k', 1, 60_000);
    invalidate('k');
    assert.equal(getCache('k'), undefined);
  });

  test('invalidatePrefix removes matching keys only', () => {
    setCache('l1:a@x.com', 1, 60_000);
    setCache('l2:a@x.com:id=L1', 2, 60_000);
    setCache('l1:b@x.com', 3, 60_000);
    invalidatePrefix('l1:a@x.com');
    assert.equal(getCache('l1:a@x.com'), undefined);
    assert.equal(getCache('l2:a@x.com:id=L1'), 2);
    assert.equal(getCache('l1:b@x.com'), 3);
  });

  test('clearAll empties the cache', () => {
    setCache('k', 1, 60_000);
    setCache('k2', 2, 60_000);
    clearAll();
    assert.equal(getCache('k'), undefined);
    assert.equal(getCache('k2'), undefined);
  });

  test('multiple prefixes can be invalidated', () => {
    setCache('l1:a@x.com', 1, 60_000);
    setCache('l2:a@x.com:id=L1', 2, 60_000);
    setCache('l3:a@x.com:id=L1:item=42', 3, 60_000);
    invalidatePrefix('l1:');
    invalidatePrefix('l2:');
    assert.equal(getCache('l1:a@x.com'), undefined);
    assert.equal(getCache('l2:a@x.com:id=L1'), undefined);
    assert.equal(getCache('l3:a@x.com:id=L1:item=42'), 3);
  });

  test('allows storing and retrieving complex objects', () => {
    const obj = { id: 1, groups: ['A', 'B'], meta: { timestamp: 123 } };
    setCache('complex', obj, 60_000);
    assert.deepEqual(getCache('complex'), obj);
  });

  test('preserves generic type information', () => {
    const typed = { id: 1 };
    setCache('typed', typed, 60_000);
    const result = getCache('typed');
    assert.deepEqual(result, typed);
  });
});
