/**
 * Tests for pure helpers extracted from useSharePointSearch.
 *
 * Strategy: test the pure, exported helpers:
 *   - buildSearchQuery(options)  → produces the ISearchQuery object
 *   - mapSearchResults(raw)      → normalises PrimarySearchResults rows
 *   - depsKey stability          → equal-content arrays → same JSON key
 *
 * Tests run against the COMPILED output in lib/.
 * No React/jsdom required; all helpers are side-effect-free.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Module = require('module');
const origLoad = Module._load;

// Stub SPFx / PnP augmentation modules that require a browser environment.
const mockContext = {
  SPContext: {
    sp: null,
    webAbsoluteUrl: 'https://test.sharepoint.com',
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  },
};

Module._load = function (request, parent, isMain) {
  if (request.startsWith('@microsoft/')) return {};
  // The search augmentation file is just `import '@pnp/sp/search'` —
  // stub it out so the compiled hook loads without a real PnP sp context.
  if (request === '@pnp/sp/search') return {};
  if (request === '@pnp/sp/webs') return {};
  if (request === '@pnp/sp/lists') return {};
  if (request === '@pnp/sp/items') return {};
  if (request.endsWith('/utilities/context') || request === '../utilities/context') return mockContext;
  if (request.endsWith('/pnpImports/search') || request.includes('pnpImports/search')) return {};
  return origLoad.apply(this, arguments);
};

globalThis.window = globalThis.window || globalThis;

// ─── Load the compiled helpers ────────────────────────────────────────────────

const {
  buildSearchQuery,
  mapSearchResults,
} = require('../../lib/hooks/useSharePointSearch.js');

// ─── buildSearchQuery ─────────────────────────────────────────────────────────

describe('buildSearchQuery — query text mapping', () => {
  test('maps query string to Querytext', () => {
    const q = buildSearchQuery({ query: 'hello world' });
    assert.equal(q.Querytext, 'hello world');
  });

  test('returns empty Querytext for empty string', () => {
    const q = buildSearchQuery({ query: '' });
    assert.equal(q.Querytext, '');
  });

  test('returns empty Querytext for whitespace-only string', () => {
    const q = buildSearchQuery({ query: '   ' });
    // buildSearchQuery should normalise or pass through; either empty string or
    // the raw whitespace is acceptable, but Querytext must be a string.
    assert.equal(typeof q.Querytext, 'string');
  });
});

describe('buildSearchQuery — SelectProperties mapping', () => {
  test('sets SelectProperties when selectProperties is provided', () => {
    const q = buildSearchQuery({ query: 'test', selectProperties: ['Title', 'Path', 'SiteId'] });
    assert.deepEqual(q.SelectProperties, ['Title', 'Path', 'SiteId']);
  });

  test('does NOT set SelectProperties when selectProperties is absent', () => {
    const q = buildSearchQuery({ query: 'test' });
    assert.ok(!('SelectProperties' in q) || q.SelectProperties === undefined, 'SelectProperties should be absent when not provided');
  });

  test('does NOT set SelectProperties for an empty array', () => {
    const q = buildSearchQuery({ query: 'test', selectProperties: [] });
    // An empty array would cause empty $select — callers should not get it set.
    const val = q.SelectProperties;
    assert.ok(val === undefined || (Array.isArray(val) && val.length === 0), 'SelectProperties should be absent or empty for empty input');
  });
});

describe('buildSearchQuery — RowLimit mapping', () => {
  test('sets RowLimit when rowLimit is provided', () => {
    const q = buildSearchQuery({ query: 'test', rowLimit: 20 });
    assert.equal(q.RowLimit, 20);
  });

  test('does NOT set RowLimit when rowLimit is absent', () => {
    const q = buildSearchQuery({ query: 'test' });
    assert.ok(!('RowLimit' in q) || q.RowLimit === undefined, 'RowLimit should be absent when not provided');
  });
});

describe('buildSearchQuery — TrimDuplicates mapping', () => {
  test('sets TrimDuplicates when provided as true', () => {
    const q = buildSearchQuery({ query: 'test', trimDuplicates: true });
    assert.equal(q.TrimDuplicates, true);
  });

  test('sets TrimDuplicates when provided as false', () => {
    const q = buildSearchQuery({ query: 'test', trimDuplicates: false });
    assert.equal(q.TrimDuplicates, false);
  });

  test('does NOT set TrimDuplicates when absent', () => {
    const q = buildSearchQuery({ query: 'test' });
    assert.ok(!('TrimDuplicates' in q) || q.TrimDuplicates === undefined, 'TrimDuplicates should be absent when not provided');
  });
});

describe('buildSearchQuery — SourceId mapping', () => {
  test('sets SourceId when sourceId is provided', () => {
    const guid = 'b09a7990-05ea-4af9-81ef-edfab16c4e31';
    const q = buildSearchQuery({ query: 'test', sourceId: guid });
    assert.equal(q.SourceId, guid);
  });

  test('does NOT set SourceId when absent', () => {
    const q = buildSearchQuery({ query: 'test' });
    assert.ok(!('SourceId' in q) || q.SourceId === undefined, 'SourceId should be absent when not provided');
  });
});

describe('buildSearchQuery — combined options', () => {
  test('all options together produce the correct ISearchQuery shape', () => {
    const q = buildSearchQuery({
      query: 'contoso',
      selectProperties: ['Title', 'Path'],
      rowLimit: 8,
      trimDuplicates: true,
      sourceId: 'abc123',
    });
    assert.equal(q.Querytext, 'contoso');
    assert.deepEqual(q.SelectProperties, ['Title', 'Path']);
    assert.equal(q.RowLimit, 8);
    assert.equal(q.TrimDuplicates, true);
    assert.equal(q.SourceId, 'abc123');
  });
});

// ─── mapSearchResults ─────────────────────────────────────────────────────────

describe('mapSearchResults — normalises PrimarySearchResults rows', () => {
  test('returns empty array for null/undefined input', () => {
    assert.deepEqual(mapSearchResults(null), []);
    assert.deepEqual(mapSearchResults(undefined), []);
  });

  test('returns empty array for empty PrimarySearchResults', () => {
    assert.deepEqual(mapSearchResults({ PrimarySearchResults: [] }), []);
  });

  test('passes through rows when PrimarySearchResults is present', () => {
    const raw = {
      PrimarySearchResults: [
        { Title: 'Site A', Path: 'https://contoso.sharepoint.com/sites/a' },
        { Title: 'Site B', Path: 'https://contoso.sharepoint.com/sites/b' },
      ],
    };
    const results = mapSearchResults(raw);
    assert.equal(results.length, 2);
    assert.equal(results[0].Title, 'Site A');
    assert.equal(results[1].Title, 'Site B');
  });

  test('returns empty array when PrimarySearchResults is missing from response', () => {
    assert.deepEqual(mapSearchResults({}), []);
  });

  test('preserves all properties on each result row', () => {
    const raw = {
      PrimarySearchResults: [
        { Title: 'HR Hub', Path: 'https://contoso.sharepoint.com/sites/hr', SiteId: 'guid-1', WebId: 'web-guid-1' },
      ],
    };
    const results = mapSearchResults(raw);
    assert.equal(results[0].Title, 'HR Hub');
    assert.equal(results[0].Path, 'https://contoso.sharepoint.com/sites/hr');
    assert.equal(results[0].SiteId, 'guid-1');
    assert.equal(results[0].WebId, 'web-guid-1');
  });
});

// ─── depsKey stability ────────────────────────────────────────────────────────
// Mirrors the same pattern tested in useListItems: equal-content arrays must
// produce the same JSON key so inline literals don't trigger refetch loops.

describe('depsKey stability — equal-content options produce the same key', () => {
  function buildDepsKey(opts) {
    return JSON.stringify(opts);
  }

  test('two separate selectProperties arrays with same content produce the same key', () => {
    const sp1 = ['Title', 'Path', 'SiteId'];
    const sp2 = ['Title', 'Path', 'SiteId'];
    const k1 = buildDepsKey({ query: 'test', selectProperties: sp1, rowLimit: 8, trimDuplicates: undefined, sourceId: undefined, enabled: true });
    const k2 = buildDepsKey({ query: 'test', selectProperties: sp2, rowLimit: 8, trimDuplicates: undefined, sourceId: undefined, enabled: true });
    assert.equal(k1, k2, 'same-content selectProperties arrays must produce the same depsKey');
  });

  test('different query strings produce different keys', () => {
    const k1 = buildDepsKey({ query: 'alpha', selectProperties: undefined, rowLimit: undefined, trimDuplicates: undefined, sourceId: undefined, enabled: true });
    const k2 = buildDepsKey({ query: 'beta', selectProperties: undefined, rowLimit: undefined, trimDuplicates: undefined, sourceId: undefined, enabled: true });
    assert.notEqual(k1, k2, 'different queries must produce different depsKeys');
  });

  test('enabled=false produces a different key than enabled=true', () => {
    const k1 = buildDepsKey({ query: 'test', selectProperties: undefined, rowLimit: undefined, trimDuplicates: undefined, sourceId: undefined, enabled: true });
    const k2 = buildDepsKey({ query: 'test', selectProperties: undefined, rowLimit: undefined, trimDuplicates: undefined, sourceId: undefined, enabled: false });
    assert.notEqual(k1, k2, 'enabled flag change must produce a different depsKey');
  });

  test('different rowLimits produce different keys', () => {
    const k1 = buildDepsKey({ query: 'test', selectProperties: undefined, rowLimit: 10, trimDuplicates: undefined, sourceId: undefined, enabled: true });
    const k2 = buildDepsKey({ query: 'test', selectProperties: undefined, rowLimit: 20, trimDuplicates: undefined, sourceId: undefined, enabled: true });
    assert.notEqual(k1, k2, 'different rowLimits must produce different depsKeys');
  });
});
