import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  chunk,
  clone,
  cloneDeep,
  escape,
  findIndex,
  groupBy,
  has,
  isEmpty,
  isEqual,
  sortBy,
} from '../../lib/build/spLodashSubsetShim.js';

describe('spLodashSubsetShim', () => {
  test('array helpers used by PnP controls', () => {
    assert.deepEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
    assert.equal(findIndex([{ id: 1 }, { id: 2 }], { id: 2 }), 1);
    assert.equal(findIndex([{ id: 1 }, { id: 2 }], item => item.id === 1), 0);
    assert.deepEqual(sortBy([{ title: 'b' }, { title: 'a' }], 'title'), [{ title: 'a' }, { title: 'b' }]);
    assert.deepEqual(groupBy([{ type: 'a' }, { type: 'b' }, { type: 'a' }], 'type'), {
      a: [{ type: 'a' }, { type: 'a' }],
      b: [{ type: 'b' }],
    });
  });

  test('object helpers used by PnP controls', () => {
    const original = { a: { b: 1 }, arr: [{ x: 1 }] };
    assert.equal(has(original, 'a.b'), true);
    assert.equal(has(original, ['arr', 0, 'x']), true);
    assert.equal(has(original, 'missing.value'), false);

    assert.deepEqual(clone(original), original);
    assert.notEqual(clone(original), original);

    const copied = cloneDeep(original);
    assert.deepEqual(copied, original);
    assert.notEqual(copied.a, original.a);
    assert.notEqual(copied.arr, original.arr);
  });

  test('value helpers used by PnP controls', () => {
    assert.equal(isEmpty([]), true);
    assert.equal(isEmpty({}), true);
    assert.equal(isEmpty({ a: 1 }), false);
    assert.equal(isEqual({ a: [1, 2] }, { a: [1, 2] }), true);
    assert.equal(isEqual({ a: [1, 2] }, { a: [2, 1] }), false);
    assert.equal(escape('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});
