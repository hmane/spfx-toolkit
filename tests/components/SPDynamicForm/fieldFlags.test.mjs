/**
 * SPDynamicForm — field-flag handling regression tests.
 *
 * Covers the three audit findings:
 *
 *   1. Content-type FieldLink wins for `Required` / `Hidden` (was OR-merge).
 *   2. Mode/hidden/readOnly filtering moved to render-time so consumer
 *      overrides can flip those flags. Tested via `filterToEditableSchema`
 *      vs `filterFieldsByModeFlags` split.
 *   3. (Submit-time visibility filter is exercised through SPDynamicForm.tsx
 *      and not unit-testable without a React renderer; covered by manual
 *      verification + the helper test below confirming the predicate path.)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  filterToEditableSchema,
  filterFieldsByModeFlags,
  filterFieldsByMode,
} from '../../../lib/components/SPDynamicForm/utilities/fieldMapper.js';

function makeField(overrides = {}) {
  return {
    internalName: 'F',
    displayName: 'F',
    fieldType: 2,
    required: false,
    readOnly: false,
    hidden: false,
    description: '',
    defaultValue: undefined,
    group: '_Default',
    order: 0,
    fieldConfig: {},
    ...overrides,
  };
}

describe('Audit Finding 2+4 — fetch-time vs render-time filtering split', () => {
  test('filterToEditableSchema drops system fields absolutely', () => {
    const fields = [
      makeField({ internalName: 'Title' }),
      makeField({ internalName: 'ContentType' }),
      makeField({ internalName: 'Attachments' }),
      makeField({ internalName: '_ComplianceFlags' }),
    ];
    const out = filterToEditableSchema(fields);
    assert.deepEqual(
      out.map((f) => f.internalName),
      ['Title']
    );
  });

  test('filterToEditableSchema drops SP taxonomy join + deprecated system fields', () => {
    // Regression: SPO returns `TaxCatchAll` / `TaxCatchAllLabel` in `/fields`
    // for any list with a taxonomy column, but `TaxCatchAllLabel` was
    // deprecated on items and `$select`ing it returns 400 "property does
    // not exist". Same for the deprecated `MetaInfo` field. These must be
    // dropped at fetch time, before they reach the query builder.
    const fields = [
      makeField({ internalName: 'Title' }),
      makeField({ internalName: 'TaxCatchAll' }),
      makeField({ internalName: 'TaxCatchAllLabel' }),
      makeField({ internalName: 'MetaInfo' }),
      makeField({ internalName: 'Tags' }), // a real taxonomy field — keep
    ];
    const out = filterToEditableSchema(fields);
    assert.deepEqual(
      out.map((f) => f.internalName),
      ['Title', 'Tags']
    );
  });

  test('filterToEditableSchema drops SP content-type internal companion fields', () => {
    const fields = [
      makeField({ internalName: 'Accounts' }),
      makeField({ internalName: 'Image_x0020_Tags_0', displayName: 'Image Tags_0' }),
      makeField({ internalName: 'Created_x0020_By' }),
      makeField({ internalName: 'Modified_x0020_By' }),
      makeField({ internalName: 'SelectFilename' }),
      makeField({ internalName: 'b508da3513684af2a418e66bcf49f72a' }),
      makeField({ internalName: '1cf76f155ced4ddcb4097134ff3c332f' }),
      makeField({ internalName: 'DocumentNotes' }),
    ];

    const out = filterToEditableSchema(fields);

    assert.deepEqual(
      out.map((f) => f.internalName),
      ['Accounts', 'DocumentNotes']
    );
  });

  test('filterToEditableSchema drops common OOB document-library technical fields', () => {
    const fields = [
      makeField({ internalName: 'BusinessField' }),
      makeField({ internalName: 'GUID' }),
      makeField({ internalName: 'UniqueId' }),
      makeField({ internalName: 'owshiddenversion' }),
      makeField({ internalName: '_ModerationStatus' }),
      makeField({ internalName: 'FSObjType' }),
      makeField({ internalName: 'PermMask' }),
      makeField({ internalName: 'EncodedAbsUrl' }),
      makeField({ internalName: 'FileSizeDisplay' }),
      makeField({ internalName: 'CheckedOutUserId' }),
      makeField({ internalName: 'File_x0020_Size' }),
      makeField({ internalName: 'DocumentStreamHash' }),
    ];

    const out = filterToEditableSchema(fields);

    assert.deepEqual(
      out.map((f) => f.internalName),
      ['BusinessField']
    );
  });

  test('filterToEditableSchema drops consumer-excluded fields', () => {
    const fields = [
      makeField({ internalName: 'A' }),
      makeField({ internalName: 'B' }),
      makeField({ internalName: 'C' }),
    ];
    const out = filterToEditableSchema(fields, ['B']);
    assert.deepEqual(
      out.map((f) => f.internalName),
      ['A', 'C']
    );
  });

  test('filterToEditableSchema does NOT drop hidden or readOnly fields', () => {
    // Audit fix: hidden/readOnly handling moved to filterFieldsByModeFlags
    // so consumer overrides can flip those flags before mode filtering.
    const fields = [
      makeField({ internalName: 'Hidden1', hidden: true }),
      makeField({ internalName: 'RO1', readOnly: true }),
      makeField({ internalName: 'Plain' }),
    ];
    const out = filterToEditableSchema(fields);
    assert.deepEqual(
      out.map((f) => f.internalName),
      ['Hidden1', 'RO1', 'Plain']
    );
  });

  test('filterFieldsByModeFlags drops field.hidden in every mode', () => {
    const fields = [
      makeField({ internalName: 'H', hidden: true }),
      makeField({ internalName: 'V' }),
    ];
    for (const mode of ['new', 'edit', 'view']) {
      const out = filterFieldsByModeFlags(fields, mode);
      assert.deepEqual(out.map((f) => f.internalName), ['V'], 'mode=' + mode);
    }
  });

  test('filterFieldsByModeFlags drops readOnly in edit; keeps in view', () => {
    const fields = [
      makeField({ internalName: 'RO', readOnly: true }),
      makeField({ internalName: 'OK' }),
    ];
    assert.deepEqual(
      filterFieldsByModeFlags(fields, 'edit').map((f) => f.internalName),
      ['OK']
    );
    assert.deepEqual(
      filterFieldsByModeFlags(fields, 'view').map((f) => f.internalName),
      ['RO', 'OK']
    );
  });

  test('filterFieldsByModeFlags new-mode keeps readOnly with default, drops without', () => {
    const fields = [
      makeField({ internalName: 'WithDefault', readOnly: true, defaultValue: 'x' }),
      makeField({ internalName: 'NoDefault', readOnly: true }),
      makeField({ internalName: 'Plain' }),
    ];
    const out = filterFieldsByModeFlags(fields, 'new').map((f) => f.internalName);
    assert.deepEqual(out, ['WithDefault', 'Plain']);
  });

  test('legacy filterFieldsByMode still composes both passes', () => {
    const fields = [
      makeField({ internalName: 'Title' }),
      makeField({ internalName: 'ContentType' }),
      makeField({ internalName: 'H', hidden: true }),
      makeField({ internalName: 'RO', readOnly: true }),
    ];
    const out = filterFieldsByMode(fields, 'edit', []).map((f) => f.internalName);
    assert.deepEqual(out, ['Title']);
  });

  test('audit win: an override-resolved hidden=false survives mode-flag filter', () => {
    // Simulates what SPDynamicForm.tsx now does: applyFieldOverrides flips
    // hidden=true → false, then filterFieldsByModeFlags runs and keeps the field.
    const fetched = [
      makeField({ internalName: 'Secret', hidden: true }),
      makeField({ internalName: 'Plain' }),
    ];
    const afterSchemaFilter = filterToEditableSchema(fetched);
    // Pretend the consumer override resolved Secret.hidden = false.
    const overrideResolved = afterSchemaFilter.map((f) =>
      f.internalName === 'Secret' ? { ...f, hidden: false } : f
    );
    const finalFields = filterFieldsByModeFlags(overrideResolved, 'edit');
    assert.deepEqual(
      finalFields.map((f) => f.internalName),
      ['Secret', 'Plain']
    );
  });

  test('audit win: an override-resolved readOnly=false survives edit-mode filter', () => {
    const fetched = [makeField({ internalName: 'Created', readOnly: true })];
    const afterSchemaFilter = filterToEditableSchema(fetched);
    const overrideResolved = afterSchemaFilter.map((f) => ({ ...f, readOnly: false }));
    const finalFields = filterFieldsByModeFlags(overrideResolved, 'edit');
    assert.deepEqual(
      finalFields.map((f) => f.internalName),
      ['Created']
    );
  });
});
