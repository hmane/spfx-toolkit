/**
 * Tests for C3 — field inspector debug feature.
 *
 * Since `useSPDebugFormFields` returns a callback (not a store read directly),
 * we test:
 *   - The pure row-mapping logic (resolved field → row object)
 *   - Store integration via `SPDebug.table('__form_fields__', ...)`
 *   - Disabled-cost: no store write when capture is off
 *   - Upsert by fieldName: latest resolved wins
 *   - `overrideApplied` detection
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SPDebug,
  debugStore,
} from '../../../lib/utilities/debug/index.js';

const FORM_FIELDS_TABLE_KEY = '__form_fields__';

// Mirror the pure row-mapping logic from the hook so we can unit-test it
// independently of React.
// NOTE: IFieldMetadata does NOT have a `disabled` field — that is a render-
// time concern resolved from form-level props. We only compare what the
// metadata actually exposes.
function buildFieldRow(resolved, original) {
  const overrideApplied =
    resolved.required !== original.required ||
    resolved.hidden !== original.hidden ||
    resolved.readOnly !== original.readOnly ||
    resolved.displayName !== original.displayName ||
    resolved.description !== original.description;

  return {
    fieldName: resolved.internalName,
    type: String(resolved.fieldType),
    label: resolved.displayName,
    required: resolved.required,
    hidden: resolved.hidden,
    readOnly: resolved.readOnly,
    overrideApplied,
  };
}

function pushFieldRow(resolved, original) {
  const state = debugStore.getState();
  const row = buildFieldRow(resolved, original);
  const existing = state.tables.get(FORM_FIELDS_TABLE_KEY);
  const prevRows = existing ? existing.rows : [];
  const idx = prevRows.findIndex((r) => r.fieldName === row.fieldName);
  const nextRows =
    idx >= 0
      ? prevRows.map((r, i) => (i === idx ? row : r))
      : prevRows.concat([row]);
  SPDebug.table(FORM_FIELDS_TABLE_KEY, nextRows, { source: 'FieldInspector' });
}

function makeField(overrides = {}) {
  return {
    internalName: 'Title',
    displayName: 'Title',
    fieldType: 2, // Text
    required: false,
    hidden: false,
    readOnly: false,
    description: '',
    defaultValue: null,
    group: 'Default',
    order: 1,
    fieldConfig: {},
    ...overrides,
  };
}

// ─── pure row-mapping ────────────────────────────────────────────────────────

describe('buildFieldRow — pure row-mapping', () => {
  test('maps all fields correctly', () => {
    const field = makeField({ internalName: 'Status', displayName: 'Status', fieldType: 6 });
    const row = buildFieldRow(field, field);
    assert.equal(row.fieldName, 'Status');
    assert.equal(row.label, 'Status');
    assert.equal(row.type, '6');
    assert.equal(row.required, false);
    assert.equal(row.hidden, false);
    assert.equal(row.readOnly, false);
    assert.equal(row.overrideApplied, false);
  });

  test('overrideApplied is true when required changes', () => {
    const original = makeField({ required: false });
    const resolved = { ...original, required: true };
    const row = buildFieldRow(resolved, original);
    assert.equal(row.overrideApplied, true);
  });

  test('overrideApplied is true when hidden changes', () => {
    const original = makeField({ hidden: false });
    const resolved = { ...original, hidden: true };
    const row = buildFieldRow(resolved, original);
    assert.equal(row.overrideApplied, true);
  });

  test('overrideApplied is true when displayName changes', () => {
    const original = makeField({ displayName: 'Title' });
    const resolved = { ...original, displayName: 'Subject' };
    const row = buildFieldRow(resolved, original);
    assert.equal(row.overrideApplied, true);
  });

  test('overrideApplied is false when nothing changes', () => {
    const field = makeField();
    const row = buildFieldRow(field, field);
    assert.equal(row.overrideApplied, false);
  });
});

// ─── store integration ───────────────────────────────────────────────────────

describe('field inspector — store integration', () => {
  beforeEach(() => SPDebug.reset());

  test('does not write to store when capture is disabled', () => {
    pushFieldRow(makeField(), makeField());
    assert.equal(
      debugStore.getState().tables.has(FORM_FIELDS_TABLE_KEY),
      false,
      'table should not be created when capture is off'
    );
  });

  test('writes a row when capture is enabled', () => {
    SPDebug.enable();
    pushFieldRow(makeField({ internalName: 'Title' }), makeField({ internalName: 'Title' }));
    const table = debugStore.getState().tables.get(FORM_FIELDS_TABLE_KEY);
    assert.ok(table, 'table should exist');
    assert.equal(table.rows.length, 1);
    assert.equal(table.rows[0].fieldName, 'Title');
  });

  test('upserts rows by fieldName — latest required wins', () => {
    SPDebug.enable();
    const original = makeField({ internalName: 'Status', required: false });
    const resolvedV1 = { ...original, required: false };
    const resolvedV2 = { ...original, required: true };

    pushFieldRow(resolvedV1, original);
    pushFieldRow(resolvedV2, original);

    const table = debugStore.getState().tables.get(FORM_FIELDS_TABLE_KEY);
    assert.equal(table.rows.length, 1, 'same fieldName should upsert, not duplicate');
    assert.equal(table.rows[0].required, true, 'latest resolved should win');
    assert.equal(table.rows[0].overrideApplied, true);
  });

  test('multiple distinct fields each get their own row', () => {
    SPDebug.enable();
    const fields = ['Title', 'Status', 'AssignedTo', 'DueDate'];
    for (const name of fields) {
      const f = makeField({ internalName: name, displayName: name });
      pushFieldRow(f, f);
    }
    const table = debugStore.getState().tables.get(FORM_FIELDS_TABLE_KEY);
    assert.equal(table.rows.length, 4);
    const names = table.rows.map((r) => r.fieldName);
    assert.deepEqual(names.sort(), fields.sort());
  });
});
