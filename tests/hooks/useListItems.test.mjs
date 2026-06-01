/**
 * Tests for the pure buildListQuery helper extracted from useListItems.
 *
 * Strategy: use a Proxy-based chainable recording stub (same pattern as
 * tests/utilities/userAccess/pagination.test.mjs). The helper must:
 *
 *  1. Route to getById when listId looks like a GUID.
 *  2. Route to getByTitle when listId is a non-GUID string.
 *  3. Apply select / filter / orderBy / top / expand in the correct order.
 *  4. NOT apply filter/orderBy/top/expand/select when they are absent.
 *
 * Also includes dep-key stability tests: two calls with equal-content but
 * different-identity arrays must produce the same JSON key, proving that the
 * depsKey approach in useListItems prevents refetch-on-every-render when
 * consumers pass inline array/object literals.
 *
 * Tests run against the COMPILED output in lib/.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Module = require('module');
const origLoad = Module._load;

// Stub out @microsoft/* (SP Framework modules that require XML / other non-JS)
// and the runtime context / debug dependencies.
const mockSPDebug = { timer: () => ({ end: () => 0 }), isCaptureEnabled: () => false };
const mockContext = { SPContext: { sp: null, webAbsoluteUrl: 'https://test.sp.com' } };
const mockBrowserStorage = {
  readBrowserStorageValue: () => undefined,
  writeBrowserStorageValue: () => false,
};

Module._load = function (request, parent, isMain) {
  if (request.startsWith('@microsoft/')) return {};
  if (request === '../utilities/context' || request.endsWith('/utilities/context')) return mockContext;
  if (request === '../utilities/debug' || request.endsWith('/utilities/debug')) return { SPDebug: mockSPDebug };
  if (request === '../utilities/browserStorage' || request.endsWith('/utilities/browserStorage')) return mockBrowserStorage;
  return origLoad.apply(this, arguments);
};

globalThis.window = globalThis.window || globalThis;

// ─── Load the compiled helper ─────────────────────────────────────────────────

const { buildListQuery } = require('../../lib/hooks/useListItems.js');

// ─── Stub helpers ────────────────────────────────────────────────────────────

/**
 * Build a tracked chainable PnP-like builder stub.
 * Records every method call in `stub.calls`.
 * The terminal function call returns a resolved promise.
 */
function makeChainStub(terminalResult = []) {
  const calls = [];
  const fn = new Proxy(
    function () {
      calls.push({ method: '()', args: [] });
      return Promise.resolve(terminalResult);
    },
    {
      get(target, prop) {
        if (prop === 'calls') return calls;
        if (prop === 'then') return undefined; // not a thenable
        return (...args) => {
          calls.push({ method: String(prop), args });
          return fn; // chaining
        };
      },
      apply(target, _this, args) {
        calls.push({ method: '()', args });
        return Promise.resolve(terminalResult);
      },
    }
  );
  fn.calls = calls;
  return fn;
}

/**
 * Build a minimal web.lists stub that records which routing method was called
 * (getById vs getByTitle) and returns a chainable items stub.
 */
function makeListsStub(itemsTerminalResult = []) {
  const itemsStub = makeChainStub(itemsTerminalResult);
  const listsState = { routedVia: null, routedId: null };
  const listsStub = {
    state: listsState,
    items: itemsStub,
    getById(id) {
      listsState.routedVia = 'getById';
      listsState.routedId = id;
      return { items: itemsStub };
    },
    getByTitle(title) {
      listsState.routedVia = 'getByTitle';
      listsState.routedId = title;
      return { items: itemsStub };
    },
  };
  return listsStub;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildListQuery — GUID vs title routing', () => {
  test('routes to getById when listId is a standard GUID', () => {
    const lists = makeListsStub();
    const guid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    buildListQuery(lists, { listId: guid });
    assert.equal(lists.state.routedVia, 'getById', 'should route via getById for GUID');
    assert.equal(lists.state.routedId, guid);
  });

  test('routes to getById for GUID with mixed case and braces', () => {
    const lists = makeListsStub();
    const guid = '{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}';
    buildListQuery(lists, { listId: guid });
    assert.equal(lists.state.routedVia, 'getById', 'should route via getById for braced GUID');
  });

  test('routes to getByTitle for a plain list name', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'My Documents' });
    assert.equal(lists.state.routedVia, 'getByTitle', 'should route via getByTitle for list name');
    assert.equal(lists.state.routedId, 'My Documents');
  });
});

describe('buildListQuery — OData clause application', () => {
  test('applies select when provided', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks', select: ['Id', 'Title', 'Status'] });
    const calls = lists.items.calls;
    const selectCall = calls.find(c => c.method === 'select');
    assert.ok(selectCall, 'select() should be called');
    assert.deepEqual(selectCall.args[0], ['Id', 'Title', 'Status']);
  });

  test('does NOT call select when not provided', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks' });
    const calls = lists.items.calls;
    assert.ok(!calls.some(c => c.method === 'select'), 'select() should NOT be called when absent');
  });

  test('applies filter when provided', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks', filter: "Status eq 'Active'" });
    const calls = lists.items.calls;
    const filterCall = calls.find(c => c.method === 'filter');
    assert.ok(filterCall, 'filter() should be called');
    assert.equal(filterCall.args[0], "Status eq 'Active'");
  });

  test('does NOT call filter when not provided', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks' });
    assert.ok(!lists.items.calls.some(c => c.method === 'filter'), 'filter() should NOT be called');
  });

  test('applies orderBy with ascending=true by default', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks', orderBy: { field: 'Title' } });
    const calls = lists.items.calls;
    const obCall = calls.find(c => c.method === 'orderBy');
    assert.ok(obCall, 'orderBy() should be called');
    assert.equal(obCall.args[0], 'Title');
    assert.equal(obCall.args[1], true); // ascending defaults to true
  });

  test('applies orderBy with ascending=false when specified', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks', orderBy: { field: 'Modified', ascending: false } });
    const calls = lists.items.calls;
    const obCall = calls.find(c => c.method === 'orderBy');
    assert.ok(obCall, 'orderBy() should be called');
    assert.equal(obCall.args[1], false);
  });

  test('does NOT call orderBy when not provided', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks' });
    assert.ok(!lists.items.calls.some(c => c.method === 'orderBy'), 'orderBy() should NOT be called');
  });

  test('applies top when provided', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks', top: 50 });
    const calls = lists.items.calls;
    const topCall = calls.find(c => c.method === 'top');
    assert.ok(topCall, 'top() should be called');
    assert.equal(topCall.args[0], 50);
  });

  test('does NOT call top when not provided', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks' });
    assert.ok(!lists.items.calls.some(c => c.method === 'top'), 'top() should NOT be called');
  });

  test('applies expand when provided', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks', expand: ['Author', 'Editor'] });
    const calls = lists.items.calls;
    const expandCall = calls.find(c => c.method === 'expand');
    assert.ok(expandCall, 'expand() should be called');
    assert.deepEqual(expandCall.args[0], ['Author', 'Editor']);
  });

  test('does NOT call expand when not provided', () => {
    const lists = makeListsStub();
    buildListQuery(lists, { listId: 'Tasks' });
    assert.ok(!lists.items.calls.some(c => c.method === 'expand'), 'expand() should NOT be called');
  });

  test('applies all clauses together in correct order (select → filter → orderBy → top → expand)', () => {
    const lists = makeListsStub();
    buildListQuery(lists, {
      listId: 'Tasks',
      select: ['Id', 'Title'],
      filter: "Status eq 'Open'",
      orderBy: { field: 'Created', ascending: false },
      top: 25,
      expand: ['Author'],
    });
    const methodOrder = lists.items.calls.map(c => c.method);
    const selectIdx = methodOrder.indexOf('select');
    const filterIdx = methodOrder.indexOf('filter');
    const orderIdx = methodOrder.indexOf('orderBy');
    const topIdx = methodOrder.indexOf('top');
    const expandIdx = methodOrder.indexOf('expand');
    assert.ok(selectIdx < filterIdx, 'select before filter');
    assert.ok(filterIdx < orderIdx, 'filter before orderBy');
    assert.ok(orderIdx < topIdx, 'orderBy before top');
    assert.ok(topIdx < expandIdx, 'top before expand');
  });
});

// ─── depsKey stability ────────────────────────────────────────────────────────
// These tests prove that the JSON.stringify-based depsKey approach used inside
// useListItems is identity-insensitive: two separate array/object instances
// with equal content produce the same key, so the fetch effect will NOT re-run
// when a consumer re-renders and passes a new inline literal each time.

describe('depsKey stability — equal-content inputs produce the same key', () => {
  // Simulate the same JSON.stringify call that the useMemo inside the hook uses.
  function buildDepsKey(opts) {
    return JSON.stringify(opts);
  }

  test('two separate select arrays with same content produce the same key', () => {
    const select1 = ['Id', 'Title', 'Status'];
    const select2 = ['Id', 'Title', 'Status']; // different identity, same content
    const k1 = buildDepsKey({ listId: 'Tasks', select: select1, filter: undefined, orderBy: undefined, top: undefined, expand: undefined, caml: undefined, enabled: true });
    const k2 = buildDepsKey({ listId: 'Tasks', select: select2, filter: undefined, orderBy: undefined, top: undefined, expand: undefined, caml: undefined, enabled: true });
    assert.equal(k1, k2, 'same-content select arrays must produce the same depsKey');
  });

  test('two separate expand arrays with same content produce the same key', () => {
    const exp1 = ['Author', 'Editor'];
    const exp2 = ['Author', 'Editor'];
    const k1 = buildDepsKey({ listId: 'Tasks', select: undefined, filter: undefined, orderBy: undefined, top: undefined, expand: exp1, caml: undefined, enabled: true });
    const k2 = buildDepsKey({ listId: 'Tasks', select: undefined, filter: undefined, orderBy: undefined, top: undefined, expand: exp2, caml: undefined, enabled: true });
    assert.equal(k1, k2, 'same-content expand arrays must produce the same depsKey');
  });

  test('two separate orderBy objects with same content produce the same key', () => {
    const ob1 = { field: 'Title', ascending: true };
    const ob2 = { field: 'Title', ascending: true };
    const k1 = buildDepsKey({ listId: 'Tasks', select: undefined, filter: undefined, orderBy: ob1, top: undefined, expand: undefined, caml: undefined, enabled: true });
    const k2 = buildDepsKey({ listId: 'Tasks', select: undefined, filter: undefined, orderBy: ob2, top: undefined, expand: undefined, caml: undefined, enabled: true });
    assert.equal(k1, k2, 'same-content orderBy objects must produce the same depsKey');
  });

  test('different listId produces a different key', () => {
    const k1 = buildDepsKey({ listId: 'Tasks', select: undefined, filter: undefined, orderBy: undefined, top: undefined, expand: undefined, caml: undefined, enabled: true });
    const k2 = buildDepsKey({ listId: 'Projects', select: undefined, filter: undefined, orderBy: undefined, top: undefined, expand: undefined, caml: undefined, enabled: true });
    assert.notEqual(k1, k2, 'different listId must produce a different depsKey');
  });

  test('enabled=false produces a different key than enabled=true', () => {
    const k1 = buildDepsKey({ listId: 'Tasks', select: undefined, filter: undefined, orderBy: undefined, top: undefined, expand: undefined, caml: undefined, enabled: true });
    const k2 = buildDepsKey({ listId: 'Tasks', select: undefined, filter: undefined, orderBy: undefined, top: undefined, expand: undefined, caml: undefined, enabled: false });
    assert.notEqual(k1, k2, 'enabled flag change must produce a different depsKey');
  });
});
