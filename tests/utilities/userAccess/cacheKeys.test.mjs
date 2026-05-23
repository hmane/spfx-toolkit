import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  level1Key,
  level2Key,
  level3Key,
  siteGroupsKey,
  groupMembersKey,
  brokenInheritanceKey,
} from '../../../lib/utilities/userAccess/cacheKeys.js';

describe('cacheKeys', () => {
  test('level1Key normalizes login casing', () => {
    assert.equal(
      level1Key('Alice@Contoso.com'),
      level1Key('alice@contoso.com')
    );
  });

  test('level2Key includes listRef id when provided', () => {
    assert.equal(
      level2Key('a@x.com', { id: 'ABC-123' }),
      'l2:a@x.com:id=ABC-123'
    );
  });

  test('level2Key falls back to title when id absent', () => {
    assert.equal(
      level2Key('a@x.com', { title: 'Documents' }),
      'l2:a@x.com:title=Documents'
    );
  });

  test('level2Key throws if neither id nor title is provided', () => {
    assert.throws(() => level2Key('a@x.com', {}), /listRef/i);
  });

  test('level3Key includes itemId', () => {
    assert.equal(
      level3Key('a@x.com', { id: 'L1' }, 42),
      'l3:a@x.com:id=L1:item=42'
    );
  });

  test('siteGroupsKey is constant', () => {
    assert.equal(siteGroupsKey(), 'siteGroups');
  });

  test('groupMembersKey uses id when present, else name', () => {
    assert.equal(groupMembersKey({ id: 5 }), 'groupMembers:id=5');
    assert.equal(
      groupMembersKey({ name: 'Site Owners' }),
      'groupMembers:name=Site Owners'
    );
  });

  test('brokenInheritanceKey is constant', () => {
    assert.equal(brokenInheritanceKey(), 'brokenInheritance');
  });
});
