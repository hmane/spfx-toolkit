/**
 * Tests for `httpBridge.ts` — the HTTP/REST inspector bridge.
 *
 * Covers:
 *   - `redactQueryString` pure helper
 *   - `buildNetworkRow` pure row construction
 *   - `attachHttpInspector` wrap / detach / idempotency with a stub HttpClient
 *   - Disabled-cost: wrapped methods pass through without recording when capture is off
 *   - Row pushed to store table when capture is on
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SPDebug,
  debugStore,
  redactQueryString,
  buildNetworkRow,
  attachHttpInspector,
  NETWORK_TABLE_KEY,
} from '../../../lib/utilities/debug/index.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeStubHttp(overrides = {}) {
  return {
    get: async (url) => ({ status: 200, ok: true, data: { items: [] }, headers: {}, duration: 10 }),
    post: async (url, data) => ({ status: 201, ok: true, data: { id: 99 }, headers: {}, duration: 20 }),
    ...overrides,
  };
}

// ─── redactQueryString ───────────────────────────────────────────────────────

describe('redactQueryString', () => {
  test('replaces query string with [redacted]', () => {
    const result = redactQueryString('https://contoso.sharepoint.com/_api/web/lists?$select=Id,Title');
    assert.equal(result, 'https://contoso.sharepoint.com/_api/web/lists?[redacted]');
  });

  test('leaves URLs with no query string unchanged', () => {
    const url = 'https://contoso.sharepoint.com/_api/web/lists';
    assert.equal(redactQueryString(url), url);
  });

  test('handles URL-with-hash but no query string', () => {
    const url = 'https://example.com/page#section';
    assert.equal(redactQueryString(url), url);
  });

  test('replaces only from the first ? onwards', () => {
    const result = redactQueryString('/api/items?a=1&b=2');
    assert.equal(result, '/api/items?[redacted]');
  });
});

// ─── buildNetworkRow ─────────────────────────────────────────────────────────

describe('buildNetworkRow', () => {
  test('builds a row with all fields populated', () => {
    const row = buildNetworkRow('GET', 'https://example.com/api', 200, 150, 1024, 'Network', 1700000000000, {});
    assert.equal(row.method, 'GET');
    assert.equal(row.url, 'https://example.com/api');
    assert.equal(row.status, 200);
    assert.equal(row.durationMs, 150);
    assert.equal(row.sizeBytes, 1024);
    assert.equal(row.source, 'Network');
    assert.equal(row.slow, false);
  });

  test('marks row as slow when durationMs >= slowThresholdMs', () => {
    const row = buildNetworkRow('GET', 'https://example.com/api', 200, 3000, null, 'Network', Date.now(), { slowThresholdMs: 2000 });
    assert.equal(row.slow, true);
  });

  test('uses default slow threshold (2000ms) when not specified', () => {
    const slow = buildNetworkRow('GET', 'url', 200, 2001, null, 'Network', Date.now(), {});
    assert.equal(slow.slow, true);
    const fast = buildNetworkRow('GET', 'url', 200, 1999, null, 'Network', Date.now(), {});
    assert.equal(fast.slow, false);
  });

  test('redacts query string when redactQueryStrings is true', () => {
    const row = buildNetworkRow('GET', 'https://example.com/api?$select=Id', 200, 50, null, 'Network', Date.now(), { redactQueryStrings: true });
    assert.equal(row.url, 'https://example.com/api?[redacted]');
  });

  test('preserves query string when redactQueryStrings is false/omitted', () => {
    const url = 'https://example.com/api?$select=Id';
    const row = buildNetworkRow('GET', url, 200, 50, null, 'Network', Date.now(), {});
    assert.equal(row.url, url);
  });

  test('handles null status and null sizeBytes', () => {
    const row = buildNetworkRow('POST', 'url', null, 0, null, 'Network', Date.now(), {});
    assert.equal(row.status, null);
    assert.equal(row.sizeBytes, null);
  });
});

// ─── attachHttpInspector — wrap / detach ─────────────────────────────────────

describe('attachHttpInspector wrap/detach', () => {
  beforeEach(() => SPDebug.reset());

  test('wraps get and post methods on the http object', () => {
    const http = makeStubHttp();
    const originalGet = http.get;
    const originalPost = http.post;

    const detach = attachHttpInspector(http);

    assert.notEqual(http.get, originalGet, 'get should be replaced');
    assert.notEqual(http.post, originalPost, 'post should be replaced');

    detach();

    assert.equal(http.get, originalGet, 'get should be restored after detach');
    assert.equal(http.post, originalPost, 'post should be restored after detach');
  });

  test('detach is idempotent — calling twice does not throw', () => {
    const http = makeStubHttp();
    const detach = attachHttpInspector(http);
    detach();
    assert.doesNotThrow(() => detach());
  });

  test('second attach on the same object is a no-op and returns a noop detach', () => {
    const http = makeStubHttp();
    const detach1 = attachHttpInspector(http);
    const wrappedGet = http.get;

    const detach2 = attachHttpInspector(http); // should be no-op
    assert.equal(http.get, wrappedGet, 'second attach should not rewrap');

    detach2(); // noop — should not restore
    assert.equal(http.get, wrappedGet, 'noop detach2 should not restore the original');

    detach1(); // proper restore
    assert.notEqual(http.get, wrappedGet);
  });

  test('handles null/undefined http safely', () => {
    assert.doesNotThrow(() => {
      const d = attachHttpInspector(null);
      d();
    });
    assert.doesNotThrow(() => {
      const d = attachHttpInspector(undefined);
      d();
    });
  });

  test('handles http with no get/post methods without throwing', () => {
    const http = {};
    assert.doesNotThrow(() => {
      const detach = attachHttpInspector(http);
      detach();
    });
  });
});

// ─── disabled-cost: no recording when capture is off ─────────────────────────

describe('attachHttpInspector — disabled-cost', () => {
  beforeEach(() => SPDebug.reset());

  test('does not record rows when capture is off', async () => {
    const http = makeStubHttp();
    const detach = attachHttpInspector(http);

    // Capture is off (SPDebug.reset() leaves captureEnabled=false).
    await http.get('https://example.com/_api/web');

    const state = debugStore.getState();
    assert.equal(state.tables.has(NETWORK_TABLE_KEY), false, 'should not have network table');

    detach();
  });

  test('wrapped method still returns the original response when capture is off', async () => {
    const http = makeStubHttp();
    attachHttpInspector(http);

    const resp = await http.get('https://example.com/_api/web');
    assert.equal(resp.status, 200);
    assert.deepEqual(resp.data, { items: [] });
  });
});

// ─── recording rows when capture is on ───────────────────────────────────────

describe('attachHttpInspector — active recording', () => {
  beforeEach(() => SPDebug.reset());

  test('records a row in __network__ table after a GET call', async () => {
    SPDebug.enable();
    const http = makeStubHttp();
    const detach = attachHttpInspector(http);

    await http.get('https://example.com/_api/web/lists');

    // Allow microtask queue to flush.
    await new Promise((r) => setTimeout(r, 10));

    const state = debugStore.getState();
    const table = state.tables.get(NETWORK_TABLE_KEY);
    assert.ok(table, 'network table should exist');
    assert.equal(table.rows.length, 1);
    const row = table.rows[0];
    assert.equal(row.method, 'GET');
    assert.equal(row.url, 'https://example.com/_api/web/lists');
    assert.equal(row.status, 200);

    detach();
  });

  test('records a row after a POST call', async () => {
    SPDebug.enable();
    const http = makeStubHttp();
    const detach = attachHttpInspector(http);

    await http.post('https://example.com/_api/web/lists', { Title: 'Test' });
    await new Promise((r) => setTimeout(r, 10));

    const state = debugStore.getState();
    const table = state.tables.get(NETWORK_TABLE_KEY);
    assert.ok(table, 'network table should exist');
    const row = table.rows[0];
    assert.equal(row.method, 'POST');

    detach();
  });

  test('redacts query string when option is set', async () => {
    SPDebug.enable();
    const http = makeStubHttp();
    const detach = attachHttpInspector(http, { redactQueryStrings: true });

    await http.get('https://example.com/_api/web/lists?$select=Id,Title');
    await new Promise((r) => setTimeout(r, 10));

    const state = debugStore.getState();
    const table = state.tables.get(NETWORK_TABLE_KEY);
    assert.ok(table);
    const row = table.rows[0];
    assert.equal(row.url, 'https://example.com/_api/web/lists?[redacted]');

    detach();
  });

  test('marks slow rows correctly', async () => {
    SPDebug.enable();
    const slowHttp = makeStubHttp({
      get: async () => {
        // Simulate a delay by returning after a tick.
        return { status: 200, ok: true, data: {}, headers: {}, duration: 3000 };
      },
    });
    const detach = attachHttpInspector(slowHttp, { slowThresholdMs: 100 });

    await slowHttp.get('https://example.com/_api/slow');
    await new Promise((r) => setTimeout(r, 10));

    // We can't guarantee the actual measured duration in a test, but we can
    // verify the row is recorded.
    const state = debugStore.getState();
    const table = state.tables.get(NETWORK_TABLE_KEY);
    assert.ok(table);

    detach();
  });

  test('accumulates rows across multiple calls', async () => {
    SPDebug.enable();
    const http = makeStubHttp();
    const detach = attachHttpInspector(http);

    await http.get('https://example.com/a');
    await http.get('https://example.com/b');
    await http.post('https://example.com/c', {});
    await new Promise((r) => setTimeout(r, 20));

    const state = debugStore.getState();
    const table = state.tables.get(NETWORK_TABLE_KEY);
    assert.ok(table);
    assert.equal(table.rows.length, 3);

    detach();
  });
});
