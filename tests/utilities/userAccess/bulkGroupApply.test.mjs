/**
 * Tests for userAccessService.addUserToGroups / removeUserFromGroups
 *
 * Critical scenario: when execute() REJECTS, the per-op thenables are never
 * settled by PnP.  The methods must NOT await those unsettled promises — they
 * must return quickly (< 500 ms) and report all group IDs as failed.
 *
 * Also covers the success path: execute resolves, per-op thenables all succeed.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Module = require('module');
const origLoad = Module._load;

// We will inject a fresh SPContext stub before each scenario by replacing the
// module cache entry for '../context'.  Build a factory so tests can
// swap the sp stub at will.
let spContextStub = { sp: null, logger: { warn: () => {}, error: () => {}, info: () => {} } };

Module._load = function (request, parent, isMain) {
  if (request.startsWith('@microsoft/')) return {};
  if (request === '../context') return { SPContext: spContextStub };
  return origLoad.apply(this, arguments);
};

globalThis.window = globalThis.window || globalThis;

// Load the service once — it captures the SPContext reference at call-time,
// so swapping spContextStub.sp before each call is enough.
const { userAccessService } = require('../../../lib/utilities/userAccess/userAccessService.js');

// ─── helpers ────────────────────────────────────────────────────────────────

/** Creates an sp stub where execute() rejects and per-op promises NEVER settle. */
function makeHangingBatchStub() {
  const promises = [];
  const spBatch = {
    web: {
      siteGroups: {
        getById: () => ({
          users: {
            add: () => {
              const p = new Promise(() => {}); // never settles
              promises.push(p);
              return p;
            },
            removeByLoginName: () => {
              const p = new Promise(() => {}); // never settles
              promises.push(p);
              return p;
            },
          },
        }),
      },
    },
  };
  const execute = () => Promise.reject(new Error('batch network error'));
  return {
    sp: {
      batched: () => [spBatch, execute],
      web: {
        ensureUser: () => Promise.resolve({ data: { Id: 1, LoginName: 'user@test.com', Title: 'User', Email: 'user@test.com', IsHiddenInUI: false } }),
        siteUsers: {
          getById: () => ({ groups: { select: () => ({ then: () => {} }) } }),
        },
      },
    },
    ensureSiteUser: () => Promise.resolve({ id: 1, loginName: 'user@test.com' }),
  };
}

/** Creates an sp stub where execute() resolves and per-op thenables succeed. */
function makeSuccessBatchStub() {
  const resolvers = [];
  const spBatch = {
    web: {
      siteGroups: {
        getById: () => ({
          users: {
            add: () => {
              return new Promise((resolve) => resolvers.push(resolve));
            },
            removeByLoginName: () => {
              return new Promise((resolve) => resolvers.push(resolve));
            },
          },
        }),
      },
    },
  };
  const execute = async () => {
    // PnP resolves the per-op promises when execute runs
    for (const r of resolvers) r(undefined);
  };
  return {
    sp: {
      batched: () => [spBatch, execute],
      web: {
        ensureUser: () => Promise.resolve({ data: { Id: 1, LoginName: 'user@test.com', Title: 'User', Email: 'user@test.com', IsHiddenInUI: false } }),
        siteUsers: {
          getById: () => ({ groups: { select: () => () => Promise.resolve([]) } }),
        },
      },
    },
  };
}

/** Race the promise against a 500 ms timeout that rejects with 'TIMEOUT'. */
function withTimeout(promise, ms = 500) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT — method hung waiting for unsettled promises')), ms)
    ),
  ]);
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('addUserToGroups — batch-failure path does not hang', () => {
  before(() => {
    // Clear the userAccess cache so ensureSiteUser works
    const { clearAll } = require('../../../lib/utilities/userAccess/userAccessCache.js');
    clearAll();
  });

  test('resolves quickly and reports all groups as failed when execute() rejects', async () => {
    const stub = makeHangingBatchStub();
    spContextStub.sp = stub.sp;

    const resultP = userAccessService.addUserToGroups('user@test.com', [1, 2, 3]);
    const result = await withTimeout(resultP);

    assert.deepEqual(result.succeeded.sort(), [], 'no successes expected');
    assert.equal(result.failed.length, 3, 'all 3 groups should be failed');
    for (const f of result.failed) {
      assert.ok(f.error.includes('batch network error'), `failed entry should carry error msg: ${f.error}`);
    }
  });
});

describe('addUserToGroups — success path', () => {
  before(() => {
    const { clearAll } = require('../../../lib/utilities/userAccess/userAccessCache.js');
    clearAll();
  });

  test('reports all groups as succeeded when execute resolves and ops complete', async () => {
    const stub = makeSuccessBatchStub();
    spContextStub.sp = stub.sp;

    const result = await userAccessService.addUserToGroups('user@test.com', [10, 20]);

    assert.deepEqual(result.succeeded.sort((a, b) => a - b), [10, 20]);
    assert.deepEqual(result.failed, []);
  });
});

describe('removeUserFromGroups — batch-failure path does not hang', () => {
  before(() => {
    const { clearAll } = require('../../../lib/utilities/userAccess/userAccessCache.js');
    clearAll();
  });

  test('resolves quickly and reports all groups as failed when execute() rejects', async () => {
    const stub = makeHangingBatchStub();
    spContextStub.sp = stub.sp;

    const resultP = userAccessService.removeUserFromGroups('user@test.com', [5, 6]);
    const result = await withTimeout(resultP);

    assert.deepEqual(result.succeeded, []);
    assert.equal(result.failed.length, 2, 'all 2 groups should be failed');
  });
});

describe('removeUserFromGroups — success path', () => {
  before(() => {
    const { clearAll } = require('../../../lib/utilities/userAccess/userAccessCache.js');
    clearAll();
  });

  test('reports all groups as succeeded when execute resolves and ops complete', async () => {
    const stub = makeSuccessBatchStub();
    spContextStub.sp = stub.sp;

    const result = await userAccessService.removeUserFromGroups('user@test.com', [30, 40]);

    assert.deepEqual(result.succeeded.sort((a, b) => a - b), [30, 40]);
    assert.deepEqual(result.failed, []);
  });
});
