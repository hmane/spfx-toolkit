import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isEqual } from '../../../lib/utilities/internal/isEqual.js';

describe('internal isEqual', () => {
  test('primitives', () => {
    assert.equal(isEqual(1, 1), true);
    assert.equal(isEqual(1, 2), false);
    assert.equal(isEqual('a', 'a'), true);
    assert.equal(isEqual('a', 'b'), false);
    assert.equal(isEqual(true, true), true);
    assert.equal(isEqual(true, false), false);
    assert.equal(isEqual(1, '1'), false); // different types
  });

  test('null / undefined', () => {
    assert.equal(isEqual(null, null), true);
    assert.equal(isEqual(undefined, undefined), true);
    assert.equal(isEqual(null, undefined), false);
    assert.equal(isEqual(null, {}), false);
    assert.equal(isEqual(undefined, 0), false);
  });

  test('NaN equals NaN (SameValueZero)', () => {
    assert.equal(isEqual(NaN, NaN), true);
    assert.equal(isEqual(NaN, 1), false);
  });

  test('arrays (incl. order + length)', () => {
    assert.equal(isEqual([1, 2, 3], [1, 2, 3]), true);
    assert.equal(isEqual([1, 2], [1, 2, 3]), false);
    assert.equal(isEqual([1, 2, 3], [3, 2, 1]), false);
    assert.equal(isEqual([], []), true);
    assert.equal(isEqual([{ a: 1 }], [{ a: 1 }]), true);
    assert.equal(isEqual([{ a: 1 }], [{ a: 2 }]), false);
  });

  test('plain objects (key set + values)', () => {
    assert.equal(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
    assert.equal(isEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true); // key order irrelevant
    assert.equal(isEqual({ a: 1 }, { a: 1, b: 2 }), false);
    assert.equal(isEqual({ a: 1 }, { a: 2 }), false);
    assert.equal(isEqual({}, {}), true);
  });

  test('nested objects/arrays (form-value + person/taxonomy array shapes)', () => {
    const a = { title: 'X', people: [{ id: 1, email: 'a@b.c' }], tags: ['t1', 't2'] };
    const b = { title: 'X', people: [{ id: 1, email: 'a@b.c' }], tags: ['t1', 't2'] };
    assert.equal(isEqual(a, b), true);
    const c = { title: 'X', people: [{ id: 2, email: 'a@b.c' }], tags: ['t1', 't2'] };
    assert.equal(isEqual(a, c), false);
  });

  test('Dates compare by time', () => {
    assert.equal(isEqual(new Date('2026-01-01'), new Date('2026-01-01')), true);
    assert.equal(isEqual(new Date('2026-01-01'), new Date('2026-01-02')), false);
    assert.equal(isEqual(new Date('2026-01-01'), '2026-01-01'), false); // date vs string
    assert.equal(isEqual({ d: new Date('2026-01-01') }, { d: new Date('2026-01-01') }), true);
  });

  test('array vs object of same shape are not equal', () => {
    assert.equal(isEqual([], {}), false);
    assert.equal(isEqual({ 0: 'a', length: 1 }, ['a']), false);
  });

  test('cyclic structures do not throw and compare equal when mirrored', () => {
    const a = { name: 'n' };
    a.self = a;
    const b = { name: 'n' };
    b.self = b;
    assert.doesNotThrow(() => isEqual(a, b));
    assert.equal(isEqual(a, b), true);
  });
});
