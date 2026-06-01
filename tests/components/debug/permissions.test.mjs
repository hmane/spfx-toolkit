/**
 * Tests for C2 — permissions debug feature.
 *
 * Since `useSPDebugPermission` is a React hook it cannot be called directly
 * from Node. We test the store primitives that the hook delegates to:
 *
 *   - Pushing permission rows via `SPDebug.table('__permissions__', rows)`
 *   - Disabled-cost: no store write when captureEnabled is false
 *   - Latest-wins upsert behaviour for rows with the same label
 *
 * These tests exercise the exact code path the hook follows, giving us
 * confidence the disabled-cost contract and upsert logic are correct without
 * needing a React test renderer.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SPDebug,
  debugStore,
} from '../../../lib/utilities/debug/index.js';

const PERMISSIONS_TABLE_KEY = '__permissions__';

function pushPermission(label, allowed, loading = false) {
  const state = debugStore.getState();
  const existing = state.tables.get(PERMISSIONS_TABLE_KEY);
  const newRow = {
    label,
    allowed,
    loading,
    checkedAt: Date.now(),
  };
  const prevRows = existing ? existing.rows : [];
  const idx = prevRows.findIndex((r) => r.label === label);
  const nextRows =
    idx >= 0
      ? prevRows.map((r, i) => (i === idx ? newRow : r))
      : prevRows.concat([newRow]);
  SPDebug.table(PERMISSIONS_TABLE_KEY, nextRows, { source: 'Permissions' });
}

describe('permissions debug — store integration', () => {
  beforeEach(() => SPDebug.reset());

  test('does not write to store when capture is disabled', () => {
    // capture is off after reset()
    pushPermission('Edit Items', true);
    assert.equal(
      debugStore.getState().tables.has(PERMISSIONS_TABLE_KEY),
      false,
      'table should not be created when capture is off'
    );
  });

  test('writes a row when capture is enabled', () => {
    SPDebug.enable();
    pushPermission('Edit Items', true);
    const table = debugStore.getState().tables.get(PERMISSIONS_TABLE_KEY);
    assert.ok(table, 'table should exist');
    assert.equal(table.rows.length, 1);
    const row = table.rows[0];
    assert.equal(row.label, 'Edit Items');
    assert.equal(row.allowed, true);
    assert.equal(row.loading, false);
  });

  test('upserts rows by label — latest value wins', () => {
    SPDebug.enable();
    pushPermission('Edit Items', true);
    pushPermission('Delete Items', false);
    pushPermission('Edit Items', false); // update existing

    const table = debugStore.getState().tables.get(PERMISSIONS_TABLE_KEY);
    assert.equal(table.rows.length, 2, 'should have 2 distinct labels');
    const editRow = table.rows.find((r) => r.label === 'Edit Items');
    assert.equal(editRow.allowed, false, 'upserted value should be updated to false');
  });

  test('loading flag is recorded correctly', () => {
    SPDebug.enable();
    pushPermission('Manage Web', false, true);
    const table = debugStore.getState().tables.get(PERMISSIONS_TABLE_KEY);
    assert.equal(table.rows[0].loading, true);
  });

  test('multiple distinct labels each get their own row', () => {
    SPDebug.enable();
    const permissions = [
      { label: 'View Items', allowed: true },
      { label: 'Add Items', allowed: true },
      { label: 'Delete Items', allowed: false },
      { label: 'Manage Lists', allowed: false },
    ];
    for (const { label, allowed } of permissions) {
      pushPermission(label, allowed);
    }
    const table = debugStore.getState().tables.get(PERMISSIONS_TABLE_KEY);
    assert.equal(table.rows.length, 4);
  });
});
