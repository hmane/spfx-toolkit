import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  emptyBulkResult,
  fromItems,
  mergeBulkResults,
  isFullSuccess,
  isFullFailure,
} from '../../../lib/utilities/userAccess/bulkResult.js';

describe('bulkResult helpers', () => {
  test('emptyBulkResult is empty and fullSuccess by definition', () => {
    const r = emptyBulkResult();
    assert.deepEqual(r.succeeded, []);
    assert.deepEqual(r.failed, []);
    assert.deepEqual(r.items, []);
    assert.equal(isFullSuccess(r), true);
    assert.equal(isFullFailure(r), false);
  });

  test('fromItems separates succeeded vs. failed by item.success', () => {
    const items = [
      { groupId: 1, success: true },
      { groupId: 2, success: false, error: 'denied' },
      { groupId: 3, success: true, idempotent: true },
    ];
    const r = fromItems(items);
    assert.deepEqual(r.succeeded.sort(), [1, 3]);
    assert.deepEqual(r.failed, [{ groupId: 2, error: 'denied' }]);
    assert.equal(r.items.length, 3);
    // fallback error message when item.error is missing
    const fallbackResult = fromItems([{ groupId: 99, success: false }]);
    assert.deepEqual(fallbackResult.failed, [{ groupId: 99, error: 'unknown' }]);
  });

  test('mergeBulkResults concatenates', () => {
    const a = fromItems([{ groupId: 1, success: true }]);
    const b = fromItems([{ groupId: 2, success: false, error: 'x' }]);
    const m = mergeBulkResults(a, b);
    assert.deepEqual(m.succeeded, [1]);
    assert.deepEqual(m.failed, [{ groupId: 2, error: 'x' }]);
    assert.equal(m.items.length, 2);
    const empty = mergeBulkResults();
    assert.deepEqual(empty, { succeeded: [], failed: [], items: [] });
  });

  test('isFullSuccess / isFullFailure correctly classify mixed results', () => {
    const mixed = fromItems([
      { groupId: 1, success: true },
      { groupId: 2, success: false, error: 'x' },
    ]);
    assert.equal(isFullSuccess(mixed), false);
    assert.equal(isFullFailure(mixed), false);

    const allFail = fromItems([{ groupId: 1, success: false, error: 'x' }]);
    assert.equal(isFullFailure(allFail), true);
  });
});
