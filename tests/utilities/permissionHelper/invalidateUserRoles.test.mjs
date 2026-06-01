/**
 * Tests for PermissionHelper.invalidateUserRoles()
 *
 * Verifies that:
 * - invalidateUserRoles(userId) removes ONLY that user's user_groups_{userId} entry
 *   and leaves other users' entries AND shared user_role_{groupName} entries intact.
 * - invalidateUserRoles() (no args) clears all user_role_* AND user_groups_* entries.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// We need CommonJS interop to set up module stubs before loading PermissionHelper.
// PermissionHelper transitively loads @microsoft/sp-core-library (via ../context)
// which is an XML file and crashes in Node. Stub just those.
const require = createRequire(import.meta.url);
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.startsWith('@microsoft/') || request === '../context') {
    // Return a minimal stub — PermissionHelper only uses SPContext.logger in error paths
    return { SPContext: { logger: { warn: () => {} } } };
  }
  return origLoad.apply(this, arguments);
};

// window is referenced by the global permission cache in PermissionHelper
globalThis.window = globalThis.window || globalThis;

const { PermissionHelper } = require('../../../lib/utilities/permissionHelper/PermissionHelper.js');

/**
 * Seed the PermissionHelper's internal LRU cache directly by accessing
 * the private 'cache' property (private in TS but a plain property in compiled JS).
 */
function seedCache(helper, entries) {
  const cache = helper.cache;
  const future = Date.now() + 60_000;
  for (const [key, data] of entries) {
    cache.set(key, { data, timestamp: Date.now(), expiresAt: future });
  }
}

function cacheKeys(helper) {
  return helper.cache.keys();
}

// Minimal SPFI stub — cache operations don't hit the network
const spStub = { web: {} };

describe('PermissionHelper.invalidateUserRoles', () => {
  test('invalidateUserRoles(userId) removes only that user\'s user_groups entry', () => {
    const helper = new PermissionHelper(spStub);
    seedCache(helper, [
      ['user_groups_10', [{ Title: 'Owners' }]],
      ['user_groups_20', [{ Title: 'Members' }]],
      ['user_role_Owners', { hasPermission: true }],
      ['user_role_Members', { hasPermission: false }],
    ]);

    const removed = helper.invalidateUserRoles(10);

    // Only user_groups_10 should be removed
    assert.equal(removed, 1, 'should remove exactly 1 entry');
    const keys = cacheKeys(helper);
    assert.ok(!keys.includes('user_groups_10'), 'user_groups_10 must be gone');
    assert.ok(keys.includes('user_groups_20'), 'user_groups_20 must remain');
    assert.ok(keys.includes('user_role_Owners'), 'user_role_Owners must remain');
    assert.ok(keys.includes('user_role_Members'), 'user_role_Members must remain');
  });

  test('invalidateUserRoles() with no args clears all user_role_* and user_groups_* entries', () => {
    const helper = new PermissionHelper(spStub);
    seedCache(helper, [
      ['user_groups_10', [{ Title: 'Owners' }]],
      ['user_groups_20', [{ Title: 'Members' }]],
      ['user_role_Owners', { hasPermission: true }],
      ['user_role_Members', { hasPermission: false }],
      ['list_permission_Tasks_read', { hasPermission: true }], // unrelated — must stay
    ]);

    const removed = helper.invalidateUserRoles();

    assert.equal(removed, 4, 'should remove 4 entries (2 user_groups + 2 user_role)');
    const keys = cacheKeys(helper);
    assert.ok(!keys.some(k => k.startsWith('user_groups_')), 'all user_groups_ must be gone');
    assert.ok(!keys.some(k => k.startsWith('user_role_')), 'all user_role_ must be gone');
    assert.ok(keys.includes('list_permission_Tasks_read'), 'unrelated entries must remain');
  });

  test('invalidateUserRoles(userId) when userId has no entry removes 0 entries', () => {
    const helper = new PermissionHelper(spStub);
    seedCache(helper, [
      ['user_groups_99', [{ Title: 'Visitors' }]],
      ['user_role_Visitors', { hasPermission: false }],
    ]);

    const removed = helper.invalidateUserRoles(42);
    assert.equal(removed, 0);
    // Both original entries should remain
    assert.equal(cacheKeys(helper).length, 2);
  });
});
