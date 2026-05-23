import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  initMembershipState,
  membershipReducer,
  selectPendingAdds,
  selectPendingRemoves,
  selectIsDirty,
} from '../../../lib/utilities/userAccess/membershipReducer.js';

describe('membershipReducer', () => {
  test('initMembershipState seeds current and pending equally', () => {
    const s = initMembershipState([1, 2, 3]);
    assert.deepEqual([...s.currentMembership], [1, 2, 3]);
    assert.deepEqual([...s.pendingMembership], [1, 2, 3]);
    assert.equal(selectIsDirty(s), false);
  });

  test('toggle adds an absent groupId and removes a present one', () => {
    let s = initMembershipState([1, 2]);
    s = membershipReducer(s, { type: 'toggle', groupId: 3 });
    assert.equal(s.pendingMembership.has(3), true);
    assert.deepEqual(selectPendingAdds(s), [3]);
    s = membershipReducer(s, { type: 'toggle', groupId: 1 });
    assert.equal(s.pendingMembership.has(1), false);
    assert.deepEqual(selectPendingRemoves(s), [1]);
    assert.equal(selectIsDirty(s), true);
  });

  test('reset restores pending to current', () => {
    let s = initMembershipState([1, 2]);
    s = membershipReducer(s, { type: 'toggle', groupId: 3 });
    s = membershipReducer(s, { type: 'reset' });
    assert.deepEqual([...s.pendingMembership], [1, 2]);
    assert.equal(selectIsDirty(s), false);
  });

  test('setCurrent rebases both current and pending (post-refresh)', () => {
    let s = initMembershipState([1, 2]);
    s = membershipReducer(s, { type: 'toggle', groupId: 3 });
    s = membershipReducer(s, { type: 'setCurrent', current: [1, 3, 4] });
    assert.deepEqual([...s.currentMembership].sort(), [1, 3, 4]);
    assert.deepEqual([...s.pendingMembership].sort(), [1, 3, 4]);
    assert.equal(selectIsDirty(s), false);
  });

  test('selectors do not mutate state', () => {
    const s = initMembershipState([1, 2]);
    const before = [...s.pendingMembership];
    selectPendingAdds(s);
    selectPendingRemoves(s);
    assert.deepEqual([...s.pendingMembership], before);
  });
});
