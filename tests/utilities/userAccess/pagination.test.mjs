/**
 * Tests for pagination / paging in userAccessService and brokenInheritance
 *
 * Verifies that:
 * 1. getListsWithUniqueRoleAssignments uses .top() to avoid the default
 *    100-item SharePoint page limit (both filtered and fallback branches).
 * 2. getGroupMembers uses .top() or .getAll() on the users collection.
 * 3. getUserSiteGroupsRaw uses .top() on the groups collection.
 *
 * Strategy: stub the PnP chainable API and verify that .top() is called on
 * the right collection before the terminal invocation.  We also verify that
 * stub returning multi-"page" data (i.e. more than would fit in the default
 * 100-row page) returns ALL rows.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Module = require('module');
const origLoad = Module._load;

// Will be swapped per test
const mockLogger = { warn: () => {}, error: () => {}, info: () => {}, success: () => {}, verbose: () => {}, debug: () => {} };
let spStub = { sp: null, logger: mockLogger };

Module._load = function (request, parent, isMain) {
  if (request.startsWith('@microsoft/')) return {};
  if (request === '../context') return { SPContext: spStub };
  return origLoad.apply(this, arguments);
};

globalThis.window = globalThis.window || globalThis;

const { userAccessService } = require('../../../lib/utilities/userAccess/userAccessService.js');

// brokenInheritance imports ../context too — same stub applies
const { getListsWithUniqueRoleAssignments } = require('../../../lib/utilities/userAccess/brokenInheritance.js');
const { clearAll } = require('../../../lib/utilities/userAccess/userAccessCache.js');

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a tracked chainable PnP-like builder stub.
 * Records which methods were called and in what order.
 * The terminal `()` call returns `terminalResult`.
 */
function makeChainStub(terminalResult = []) {
  const calls = [];
  const proxy = new Proxy({}, {
    get(_, prop) {
      if (prop === 'calls') return calls;
      if (prop === 'then') return undefined; // not a promise itself
      // record call
      return (...args) => {
        calls.push({ method: String(prop), args });
        return proxy; // chaining
      };
    },
    apply(_, __, args) {
      calls.push({ method: '()', args });
      return Promise.resolve(terminalResult);
    },
  });
  // Make it callable as a function (terminal invocation)
  const fn = new Proxy(function () {
    calls.push({ method: '()', args: [] });
    return Promise.resolve(terminalResult);
  }, {
    get(target, prop) {
      if (prop === 'calls') return calls;
      if (prop === 'then') return undefined;
      return (...args) => {
        calls.push({ method: String(prop), args });
        return fn; // chaining
      };
    },
  });
  return fn;
}

function wasTopCalled(stub) {
  return stub.calls.some(c => c.method === 'top');
}

// ─── getListsWithUniqueRoleAssignments ───────────────────────────────────────

describe('getListsWithUniqueRoleAssignments — uses .top() to avoid truncation', () => {
  before(() => clearAll());

  test('filtered branch calls .top() before terminal invocation', async () => {
    // 15 rows all with HasUniqueRoleAssignments=true (pass sanity check)
    const mockLists = Array.from({ length: 15 }, (_, i) => ({
      Id: `id-${i}`, Title: `List ${i}`, Hidden: false, HasUniqueRoleAssignments: true,
    }));

    const listsStub = makeChainStub(mockLists);
    spStub.sp = {
      web: {
        lists: listsStub,
      },
    };

    const result = await getListsWithUniqueRoleAssignments();
    assert.equal(result.length, 15, 'all 15 lists returned');
    assert.ok(wasTopCalled(listsStub), '.top() must be called on lists collection');
  });

  test('fallback branch (filter rejected) also calls .top()', async () => {
    // First call (filtered) throws; second call (fallback) returns data.
    const mockLists = Array.from({ length: 12 }, (_, i) => ({
      Id: `id-${i}`, Title: `List ${i}`, Hidden: false, HasUniqueRoleAssignments: i % 3 === 0,
    }));

    let callCount = 0;
    const listsStub = new Proxy(function () {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('filter not supported'));
      return Promise.resolve(mockLists);
    }, {
      get(target, prop) {
        if (prop === 'calls') return target.calls || [];
        if (prop === 'then') return undefined;
        return (...args) => {
          if (!target.calls) target.calls = [];
          target.calls.push({ method: String(prop), args });
          return listsStub;
        };
      },
    });
    if (!listsStub.calls) listsStub.calls = [];

    spStub.sp = {
      web: {
        lists: listsStub,
      },
    };

    // Should not throw even though filter branch fails
    const result = await getListsWithUniqueRoleAssignments();
    // 12 / 3 = 4 with HasUniqueRoleAssignments=true (indices 0, 3, 6, 9)
    assert.equal(result.length, 4, 'fallback filters client-side correctly');
    // top() should be in the recorded calls
    assert.ok(wasTopCalled(listsStub), '.top() must be called on fallback lists branch too');
  });
});

// ─── getGroupMembers ─────────────────────────────────────────────────────────

describe('getGroupMembers — uses .top() on group.users', () => {
  before(() => clearAll());

  test('calls .top() on the users collection', async () => {
    // 150 users — more than the default 100-row SP page
    const mockUsers = Array.from({ length: 150 }, (_, i) => ({
      Id: i + 1, LoginName: `user${i}@test.com`, Title: `User ${i}`,
      Email: `user${i}@test.com`, IsHiddenInUI: false,
    }));

    const usersStub = makeChainStub(mockUsers);
    const groupStub = {
      users: usersStub,
    };

    spStub.sp = {
      web: {
        siteGroups: {
          getById: () => groupStub,
        },
      },
    };

    const result = await userAccessService.getGroupMembers({ id: 1 });
    assert.equal(result.length, 150, 'all 150 users returned');
    assert.ok(wasTopCalled(usersStub), '.top() must be called on users collection');
  });
});

// ─── getUserSiteGroupsRaw (via getUserAccessLevel1) ───────────────────────────

describe('getUserSiteGroupsRaw — uses .top() on groups collection', () => {
  before(() => clearAll());

  test('calls .top() on siteUser.groups when fetching user groups', async () => {
    // 120 groups — more than default page
    const mockGroups = Array.from({ length: 120 }, (_, i) => ({
      Id: i + 1, LoginName: `group${i}`, Title: `Group ${i}`, Description: '',
    }));

    const groupsStub = makeChainStub(mockGroups);
    const siteUserStub = {
      groups: groupsStub,
    };

    spStub.sp = {
      web: {
        currentUser: () => Promise.resolve({ Id: 1, LoginName: 'user@test.com', Title: 'U', Email: 'u@t.com', IsHiddenInUI: false }),
        siteUsers: {
          getById: () => siteUserStub,
        },
        siteGroups: {
          getById: () => ({ roleAssignments: { filter: () => ({ select: () => () => Promise.resolve([]) }) } }),
        },
        // lists stub must support .top().filter().select()() and .top().select()() chains
        lists: makeChainStub([]),
      },
    };

    // getUserAccessLevel1 calls getUserSiteGroupsRaw internally
    // We just want to verify .top() is called on groups
    const result = await userAccessService.getUserAccessLevel1('current');
    assert.ok(wasTopCalled(groupsStub), '.top() must be called on siteUser.groups collection');
  });
});
