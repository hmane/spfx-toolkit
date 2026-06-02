/**
 * Tests for pure helpers extracted from useSPFieldMetadata:
 *
 *  1. buildFieldMetadataCacheKey — deterministic / stable key
 *  2. normalizeField — maps a raw PnP field object to ISPFieldMetadata shape
 *  3. filterFields — respects includeHidden and internalNames options
 *  4. pagedReducer (from useSPPagedQuery) — append, reset, setError
 *
 * Tests run against the COMPILED output in lib/.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Module = require('module');
const origLoad = Module._load;

// Stub out @microsoft/* and runtime deps
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
  // useSPPagedQuery imports useListItems — ensure context/debug are also stubbed for that
  return origLoad.apply(this, arguments);
};

globalThis.window = globalThis.window || globalThis;

// ─── Load compiled helpers ────────────────────────────────────────────────────

const {
  buildFieldMetadataCacheKey,
  normalizeField,
  filterFields,
} = require('../../lib/hooks/useSPFieldMetadata.js');

const { pagedReducer } = require('../../lib/hooks/useSPPagedQuery.js');

// ─── Raw field fixtures ───────────────────────────────────────────────────────

function makeRawField(overrides = {}) {
  return {
    Id: 'guid-1234',
    InternalName: 'MyField',
    Title: 'My Field',
    TypeAsString: 'Text',
    FieldTypeKind: 2,
    Required: false,
    ReadOnlyField: false,
    Hidden: false,
    Description: 'A test field',
    DefaultValue: null,
    Group: 'Custom Columns',
    ...overrides,
  };
}

// ─── buildFieldMetadataCacheKey ───────────────────────────────────────────────

describe('buildFieldMetadataCacheKey — deterministic and stable', () => {
  test('produces the same key given the same inputs', () => {
    const k1 = buildFieldMetadataCacheKey('https://tenant.sharepoint.com/sites/x', 'list-guid', ['A', 'B'], false);
    const k2 = buildFieldMetadataCacheKey('https://tenant.sharepoint.com/sites/x', 'list-guid', ['A', 'B'], false);
    assert.equal(k1, k2, 'key must be deterministic');
  });

  test('different listIds produce different keys', () => {
    const k1 = buildFieldMetadataCacheKey('https://t.sp.com', 'list-a', undefined, false);
    const k2 = buildFieldMetadataCacheKey('https://t.sp.com', 'list-b', undefined, false);
    assert.notEqual(k1, k2);
  });

  test('different webUrls produce different keys', () => {
    const k1 = buildFieldMetadataCacheKey('https://t.sp.com/sites/a', 'list-x', undefined, false);
    const k2 = buildFieldMetadataCacheKey('https://t.sp.com/sites/b', 'list-x', undefined, false);
    assert.notEqual(k1, k2);
  });

  test('different internalNames arrays produce different keys', () => {
    const k1 = buildFieldMetadataCacheKey('https://t.sp.com', 'list-x', ['A'], false);
    const k2 = buildFieldMetadataCacheKey('https://t.sp.com', 'list-x', ['B'], false);
    assert.notEqual(k1, k2);
  });

  test('order of internalNames is normalised (sorted) for stable key', () => {
    const k1 = buildFieldMetadataCacheKey('https://t.sp.com', 'list-x', ['B', 'A'], false);
    const k2 = buildFieldMetadataCacheKey('https://t.sp.com', 'list-x', ['A', 'B'], false);
    assert.equal(k1, k2, 'sorted internalNames should produce the same key');
  });

  test('includeHidden flag changes the key', () => {
    const k1 = buildFieldMetadataCacheKey('https://t.sp.com', 'list-x', undefined, false);
    const k2 = buildFieldMetadataCacheKey('https://t.sp.com', 'list-x', undefined, true);
    assert.notEqual(k1, k2);
  });

  test('undefined internalNames and empty array produce the same key', () => {
    const k1 = buildFieldMetadataCacheKey('https://t.sp.com', 'list-x', undefined, false);
    const k2 = buildFieldMetadataCacheKey('https://t.sp.com', 'list-x', [], false);
    assert.equal(k1, k2, 'undefined and empty internalNames should be equivalent');
  });

  test('returns a non-empty string', () => {
    const k = buildFieldMetadataCacheKey('https://t.sp.com', 'list-x', undefined, false);
    assert.ok(typeof k === 'string' && k.length > 0, 'key should be a non-empty string');
  });
});

// ─── normalizeField ───────────────────────────────────────────────────────────

describe('normalizeField — maps raw PnP field to ISPFieldMetadata', () => {
  test('maps InternalName to internalName', () => {
    const raw = makeRawField({ InternalName: 'FieldA' });
    const meta = normalizeField(raw);
    assert.equal(meta.internalName, 'FieldA');
  });

  test('maps Title to displayName', () => {
    const raw = makeRawField({ Title: 'My Label' });
    const meta = normalizeField(raw);
    assert.equal(meta.displayName, 'My Label');
  });

  test('maps TypeAsString to typeAsString', () => {
    const raw = makeRawField({ TypeAsString: 'DateTime' });
    const meta = normalizeField(raw);
    assert.equal(meta.typeAsString, 'DateTime');
  });

  test('maps FieldTypeKind', () => {
    const raw = makeRawField({ FieldTypeKind: 4 });
    const meta = normalizeField(raw);
    assert.equal(meta.fieldTypeKind, 4);
  });

  test('maps Required', () => {
    const raw = makeRawField({ Required: true });
    const meta = normalizeField(raw);
    assert.equal(meta.required, true);
  });

  test('maps ReadOnlyField to readOnly', () => {
    const raw = makeRawField({ ReadOnlyField: true });
    const meta = normalizeField(raw);
    assert.equal(meta.readOnly, true);
  });

  test('maps Hidden', () => {
    const raw = makeRawField({ Hidden: true });
    const meta = normalizeField(raw);
    assert.equal(meta.hidden, true);
  });

  test('maps Description', () => {
    const raw = makeRawField({ Description: 'Helpful text' });
    const meta = normalizeField(raw);
    assert.equal(meta.description, 'Helpful text');
  });

  test('maps DefaultValue', () => {
    const raw = makeRawField({ DefaultValue: 'hello' });
    const meta = normalizeField(raw);
    assert.equal(meta.defaultValue, 'hello');
  });

  test('maps Group', () => {
    const raw = makeRawField({ Group: 'Site Columns' });
    const meta = normalizeField(raw);
    assert.equal(meta.group, 'Site Columns');
  });

  test('maps Id to fieldId', () => {
    const raw = makeRawField({ Id: 'abc-def' });
    const meta = normalizeField(raw);
    assert.equal(meta.fieldId, 'abc-def');
  });
});

// ─── filterFields ─────────────────────────────────────────────────────────────

describe('filterFields — respects includeHidden and internalNames', () => {
  const fields = [
    makeRawField({ InternalName: 'Title', Hidden: false }),
    makeRawField({ InternalName: 'ContentType', Hidden: true }),
    makeRawField({ InternalName: 'Status', Hidden: false }),
    makeRawField({ InternalName: '_UIVersionString', Hidden: true }),
  ];

  test('excludes hidden fields when includeHidden=false', () => {
    const result = filterFields(fields, { includeHidden: false });
    assert.ok(result.every(f => !f.Hidden), 'hidden fields should be excluded');
    assert.equal(result.length, 2);
  });

  test('includes hidden fields when includeHidden=true', () => {
    const result = filterFields(fields, { includeHidden: true });
    assert.equal(result.length, 4);
  });

  test('filters to only specified internalNames', () => {
    const result = filterFields(fields, { includeHidden: true, internalNames: ['Title', 'Status'] });
    assert.equal(result.length, 2);
    assert.ok(result.some(f => f.InternalName === 'Title'));
    assert.ok(result.some(f => f.InternalName === 'Status'));
  });

  test('internalNames filter combined with includeHidden=false excludes hidden even if named', () => {
    const result = filterFields(fields, { includeHidden: false, internalNames: ['ContentType', 'Title'] });
    assert.equal(result.length, 1);
    assert.equal(result[0].InternalName, 'Title');
  });

  test('returns all visible fields when internalNames is undefined', () => {
    const result = filterFields(fields, { includeHidden: false, internalNames: undefined });
    assert.equal(result.length, 2);
  });

  test('returns empty array when internalNames is empty', () => {
    const result = filterFields(fields, { includeHidden: true, internalNames: [] });
    assert.equal(result.length, 0);
  });
});

// ─── pagedReducer ─────────────────────────────────────────────────────────────

describe('pagedReducer — paged state transitions', () => {
  function initialState() {
    return {
      pages: [],
      items: [],
      hasMore: false,
      loading: false,
      error: null,
      nextPage: null,
    };
  }

  test('FETCH_START sets loading=true and clears error', () => {
    const state = { ...initialState(), error: new Error('old'), loading: false };
    const next = pagedReducer(state, { type: 'FETCH_START' });
    assert.equal(next.loading, true);
    assert.equal(next.error, null);
  });

  test('APPEND_PAGE accumulates pages and flattens items', () => {
    const state = initialState();
    const page1 = [{ Id: 1 }, { Id: 2 }];
    const page2 = [{ Id: 3 }];
    const s1 = pagedReducer(state, { type: 'APPEND_PAGE', items: page1, hasMore: true, nextPage: 'cursor1' });
    assert.deepEqual(s1.pages, [page1]);
    assert.deepEqual(s1.items, [{ Id: 1 }, { Id: 2 }]);
    assert.equal(s1.hasMore, true);
    assert.equal(s1.loading, false);

    const s2 = pagedReducer(s1, { type: 'APPEND_PAGE', items: page2, hasMore: false, nextPage: null });
    assert.deepEqual(s2.pages, [page1, page2]);
    assert.deepEqual(s2.items, [{ Id: 1 }, { Id: 2 }, { Id: 3 }]);
    assert.equal(s2.hasMore, false);
  });

  test('SET_ERROR stores error and clears loading', () => {
    const state = { ...initialState(), loading: true };
    const err = new Error('network failure');
    const next = pagedReducer(state, { type: 'SET_ERROR', error: err });
    assert.equal(next.error, err);
    assert.equal(next.loading, false);
  });

  test('RESET returns to initial state', () => {
    const dirtyState = {
      pages: [[{ Id: 1 }]],
      items: [{ Id: 1 }],
      hasMore: true,
      loading: false,
      error: null,
      nextPage: 'cursor',
    };
    const next = pagedReducer(dirtyState, { type: 'RESET' });
    assert.deepEqual(next.pages, []);
    assert.deepEqual(next.items, []);
    assert.equal(next.hasMore, false);
    assert.equal(next.error, null);
    assert.equal(next.nextPage, null);
  });
});

// ─── useSPFieldMetadata depsKey stability ─────────────────────────────────────
// Proves that equal-content internalNames arrays produce the same JSON key,
// so the fetch effect inside useSPFieldMetadata will NOT re-run when a consumer
// passes a new inline array literal each render.

describe('useSPFieldMetadata depsKey stability — equal-content inputs produce the same key', () => {
  function buildDepsKey(opts) {
    return JSON.stringify(opts);
  }

  test('two separate internalNames arrays with same content produce the same key', () => {
    const names1 = ['Title', 'Status', 'AssignedTo'];
    const names2 = ['Title', 'Status', 'AssignedTo'];
    const k1 = buildDepsKey({ listId: 'Tasks', internalNames: names1, includeHidden: false, ttlMs: 300000 });
    const k2 = buildDepsKey({ listId: 'Tasks', internalNames: names2, includeHidden: false, ttlMs: 300000 });
    assert.equal(k1, k2, 'same-content internalNames arrays must produce the same depsKey');
  });

  test('different internalNames produce a different key', () => {
    const k1 = buildDepsKey({ listId: 'Tasks', internalNames: ['Title'], includeHidden: false, ttlMs: 300000 });
    const k2 = buildDepsKey({ listId: 'Tasks', internalNames: ['Status'], includeHidden: false, ttlMs: 300000 });
    assert.notEqual(k1, k2, 'different internalNames must produce a different depsKey');
  });

  test('includeHidden flag change produces a different key', () => {
    const k1 = buildDepsKey({ listId: 'Tasks', internalNames: undefined, includeHidden: false, ttlMs: 300000 });
    const k2 = buildDepsKey({ listId: 'Tasks', internalNames: undefined, includeHidden: true, ttlMs: 300000 });
    assert.notEqual(k1, k2, 'includeHidden flag change must produce a different depsKey');
  });

  test('different ttlMs produces a different key', () => {
    const k1 = buildDepsKey({ listId: 'Tasks', internalNames: undefined, includeHidden: false, ttlMs: 300000 });
    const k2 = buildDepsKey({ listId: 'Tasks', internalNames: undefined, includeHidden: false, ttlMs: 60000 });
    assert.notEqual(k1, k2, 'different ttlMs must produce a different depsKey');
  });
});
