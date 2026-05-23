import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { diffUserAccess } from '../../../lib/utilities/userAccess/userAccessDiff.js';

const user = (id, title) => ({ id, loginName: `${title}@x`, title });
const group = (id, title) => ({ id, loginName: `g-${id}`, title });
const list = (id, title) => ({ id, title, hidden: false });
const dlp = (listId, groupId, level = 'Member') => ({
  list: list(listId, `List-${listId}`),
  source: groupId ? { viaGroupId: groupId, viaGroupTitle: `G-${groupId}` } : 'Direct',
  roleDefinitions: [{ id: 1073741828, name: level }],
  permissionLevel: level,
});

describe('diffUserAccess', () => {
  test('common groups land in common; unique groups in onlyA/onlyB', () => {
    const a = {
      user: user(1, 'Alice'),
      siteGroups: [group(10, 'Owners'), group(20, 'Members')],
      directListPermissions: [],
    };
    const b = {
      user: user(2, 'Bob'),
      siteGroups: [group(20, 'Members'), group(30, 'Visitors')],
      directListPermissions: [],
    };

    const d = diffUserAccess(a, b);
    assert.deepEqual(d.common.groups.map(g => g.id), [20]);
    assert.deepEqual(d.onlyA.groups.map(g => g.id), [10]);
    assert.deepEqual(d.onlyB.groups.map(g => g.id), [30]);
    assert.equal(d.userA.id, 1);
    assert.equal(d.userB.id, 2);
  });

  test('direct list permissions are bucketed by listId + source identity', () => {
    const sameViaOwners = dlp('L1', 10, 'Owner');
    const sameViaOwners2 = dlp('L1', 10, 'Owner');
    const onlyA = dlp('L1', 20, 'Member');
    const onlyB = dlp('L2', 10, 'Owner');
    const a = { user: user(1, 'A'), siteGroups: [], directListPermissions: [sameViaOwners, onlyA] };
    const b = { user: user(2, 'B'), siteGroups: [], directListPermissions: [sameViaOwners2, onlyB] };
    const d = diffUserAccess(a, b);
    assert.equal(d.common.directListPermissions.length, 1);
    assert.equal(d.common.directListPermissions[0].list.id, 'L1');
    assert.equal(d.onlyA.directListPermissions.length, 1);
    assert.equal(d.onlyA.directListPermissions[0].list.id, 'L1');
    assert.equal(d.onlyB.directListPermissions.length, 1);
    assert.equal(d.onlyB.directListPermissions[0].list.id, 'L2');
  });

  test('empty inputs yield empty diff', () => {
    const a = { user: user(1, 'A'), siteGroups: [], directListPermissions: [] };
    const b = { user: user(2, 'B'), siteGroups: [], directListPermissions: [] };
    const d = diffUserAccess(a, b);
    assert.deepEqual(d.common.groups, []);
    assert.deepEqual(d.onlyA.groups, []);
    assert.deepEqual(d.onlyB.groups, []);
    assert.deepEqual(d.common.directListPermissions, []);
  });

  test('two different custom role-definition sets both labeled "Custom" do NOT collapse to common', () => {
    // Same list, same source (Direct), same derived label ('Custom'), but
    // different actual role definitions. Must remain distinguishable.
    const customA = {
      list: list('L1', 'List-L1'),
      source: 'Direct',
      roleDefinitions: [{ id: 1001, name: 'CustomRoleA' }],
      permissionLevel: 'Custom',
    };
    const customB = {
      list: list('L1', 'List-L1'),
      source: 'Direct',
      roleDefinitions: [{ id: 1002, name: 'CustomRoleB' }],
      permissionLevel: 'Custom',
    };
    const a = { user: user(1, 'A'), siteGroups: [], directListPermissions: [customA] };
    const b = { user: user(2, 'B'), siteGroups: [], directListPermissions: [customB] };
    const d = diffUserAccess(a, b);
    assert.equal(d.common.directListPermissions.length, 0);
    assert.equal(d.onlyA.directListPermissions.length, 1);
    assert.equal(d.onlyA.directListPermissions[0].roleDefinitions[0].id, 1001);
    assert.equal(d.onlyB.directListPermissions.length, 1);
    assert.equal(d.onlyB.directListPermissions[0].roleDefinitions[0].id, 1002);
  });

  test('same custom role-definition sets in different order DO collapse to common', () => {
    // Sorting in dlpKey ensures order-independence for multi-role bindings.
    const a = {
      user: user(1, 'A'),
      siteGroups: [],
      directListPermissions: [{
        list: list('L1', 'L1'),
        source: 'Direct',
        roleDefinitions: [{ id: 5, name: 'X' }, { id: 1, name: 'Y' }],
        permissionLevel: 'Custom',
      }],
    };
    const b = {
      user: user(2, 'B'),
      siteGroups: [],
      directListPermissions: [{
        list: list('L1', 'L1'),
        source: 'Direct',
        roleDefinitions: [{ id: 1, name: 'Y' }, { id: 5, name: 'X' }],
        permissionLevel: 'Custom',
      }],
    };
    const d = diffUserAccess(a, b);
    assert.equal(d.common.directListPermissions.length, 1);
    assert.equal(d.onlyA.directListPermissions.length, 0);
    assert.equal(d.onlyB.directListPermissions.length, 0);
  });
});
