/**
 * Predicate that drives the empty ↔ non-empty hydration-key bump in
 * `SPUserField` and `SPTaxonomyField`.
 *
 * The actual hook lives inside the components and needs a React renderer to
 * test. This file covers the pure predicate so we don't regress the empty
 * definition when adding new field types.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { isEmptyFieldValue } from '../../../lib/components/spFields/hydrationKey.js';

describe('isEmptyFieldValue', () => {
  test('null and undefined are empty', () => {
    assert.equal(isEmptyFieldValue(null), true);
    assert.equal(isEmptyFieldValue(undefined), true);
  });

  test('empty string is empty', () => {
    assert.equal(isEmptyFieldValue(''), true);
  });

  test('empty array is empty', () => {
    assert.equal(isEmptyFieldValue([]), true);
  });

  test('non-empty array is NOT empty', () => {
    assert.equal(isEmptyFieldValue([1]), false);
    assert.equal(isEmptyFieldValue([{ id: 1 }]), false);
  });

  test('non-empty string is NOT empty', () => {
    assert.equal(isEmptyFieldValue('x'), false);
  });

  test('plain object is NOT empty (a single user/lookup/term IS a selection)', () => {
    assert.equal(isEmptyFieldValue({ id: 1 }), false);
    assert.equal(isEmptyFieldValue({}), false); // intentional: any object means "set"
  });

  test('zero and false are NOT empty (valid scalars for some fields)', () => {
    assert.equal(isEmptyFieldValue(0), false);
    assert.equal(isEmptyFieldValue(false), false);
  });

  test('IPrincipal-shaped value is NOT empty', () => {
    const principal = { id: '5', email: 'a@b.com', title: 'Alice', loginName: 'a' };
    assert.equal(isEmptyFieldValue(principal), false);
  });

  test('IPrincipal[] with one entry is NOT empty', () => {
    const principals = [{ id: '5', email: 'a@b.com', title: 'A', loginName: 'a' }];
    assert.equal(isEmptyFieldValue(principals), false);
  });

  test('taxonomy-shaped value is NOT empty', () => {
    const term = { Label: 'Cats', TermGuid: 'g', WssId: -1 };
    assert.equal(isEmptyFieldValue(term), false);
  });
});

describe('isEmptyFieldValue — drives a transition for the hydration-key bump', () => {
  // These cases simulate the SPUserField / SPTaxonomyField flow:
  //   1. picker mounts with empty field value (initial render before data arrives)
  //   2. RHF reset fires after item data loads
  //   3. predicate flips false → triggers a one-time key bump → picker remounts with init prop honored

  test('empty → non-empty triggers a bump', () => {
    const before = isEmptyFieldValue(null);
    const after = isEmptyFieldValue([{ id: '5', email: 'a@b.com', title: 'A', loginName: 'a' }]);
    assert.equal(before, true);
    assert.equal(after, false);
    assert.notEqual(before, after);
  });

  test('non-empty → empty also triggers a bump (e.g. user navigates to item with no value)', () => {
    const before = isEmptyFieldValue({ id: '5', email: 'a@b.com', title: 'A', loginName: 'a' });
    const after = isEmptyFieldValue(null);
    assert.notEqual(before, after);
  });

  test('non-empty → non-empty does NOT trigger a bump', () => {
    const before = isEmptyFieldValue([{ id: '1', email: 'a@b.com', title: 'A', loginName: 'a' }]);
    const after = isEmptyFieldValue([{ id: '2', email: 'b@b.com', title: 'B', loginName: 'b' }]);
    assert.equal(before, false);
    assert.equal(after, false);
    // Both non-empty — no remount needed; PnP picker manages its own onChange flow.
  });

  test('empty → empty does NOT trigger a bump', () => {
    const before = isEmptyFieldValue(null);
    const after = isEmptyFieldValue([]);
    assert.equal(before, true);
    assert.equal(after, true);
  });
});
