/**
 * SPDynamicForm built-in writer (autoSave) — pure-helper coverage.
 *
 * The orchestrators (`saveItem`, `saveItemsBatch`) talk to PnP and are
 * exercised end-to-end by app integration tests. The helpers in this file
 * are the dispatch logic that determines correctness of the writer:
 *
 *   - `pickSaveMethod`              — auto picks `validate` for typed fields,
 *                                     `update` for plain scalars
 *   - `applyFieldToUpdater`         — typed dispatch into spUpdater so the
 *                                     wire shape is correct per `field.fieldType`
 *   - `mapValidateResponseToFieldErrors` — SP response → RHF-shaped errors
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  pickSaveMethod,
  applyFieldToUpdater,
  mapValidateResponseToFieldErrors,
  extractNewItemId,
  VALIDATE_PREFERRED_TYPES,
} from '../../../lib/components/SPDynamicForm/utilities/autoSave.helpers.js';
import { createSPUpdater } from '../../../lib/utilities/listItemHelper/spUpdater.js';

function makeField(internalName, fieldType) {
  return {
    internalName,
    displayName: internalName,
    fieldType,
    required: false,
    readOnly: false,
    hidden: false,
    description: '',
    defaultValue: undefined,
    group: '_Default',
    order: 0,
    fieldConfig: {},
  };
}

// ============================================================================
// pickSaveMethod
// ============================================================================

describe('pickSaveMethod', () => {
  test('explicit method=update always returns update', () => {
    const fieldsByName = new Map([['Topic', makeField('Topic', 'TaxonomyFieldType')]]);
    const out = pickSaveMethod({
      method: 'update',
      changedFieldNames: ['Topic'],
      fieldsByName,
    });
    assert.equal(out, 'update');
  });

  test('explicit method=validate always returns validate', () => {
    const fieldsByName = new Map([['Title', makeField('Title', 'Text')]]);
    const out = pickSaveMethod({
      method: 'validate',
      changedFieldNames: ['Title'],
      fieldsByName,
    });
    assert.equal(out, 'validate');
  });

  test('auto + only scalar changes → update', () => {
    const fieldsByName = new Map([
      ['Title', makeField('Title', 'Text')],
      ['Amount', makeField('Amount', 'Number')],
      ['DueDate', makeField('DueDate', 'DateTime')],
      ['IsActive', makeField('IsActive', 'Boolean')],
    ]);
    const out = pickSaveMethod({
      method: 'auto',
      changedFieldNames: ['Title', 'Amount', 'DueDate', 'IsActive'],
      fieldsByName,
    });
    assert.equal(out, 'update');
  });

  test('auto + a User field present → validate', () => {
    const fieldsByName = new Map([
      ['Title', makeField('Title', 'Text')],
      ['AssignedTo', makeField('AssignedTo', 'User')],
    ]);
    const out = pickSaveMethod({
      method: 'auto',
      changedFieldNames: ['Title', 'AssignedTo'],
      fieldsByName,
    });
    assert.equal(out, 'validate');
  });

  test('auto + multi-user → validate', () => {
    const fieldsByName = new Map([['Reviewers', makeField('Reviewers', 'UserMulti')]]);
    const out = pickSaveMethod({
      method: 'auto',
      changedFieldNames: ['Reviewers'],
      fieldsByName,
    });
    assert.equal(out, 'validate');
  });

  test('auto + taxonomy → validate', () => {
    const fieldsByName = new Map([['Topic', makeField('Topic', 'TaxonomyFieldType')]]);
    const out = pickSaveMethod({
      method: 'auto',
      changedFieldNames: ['Topic'],
      fieldsByName,
    });
    assert.equal(out, 'validate');
  });

  test('auto + multi-taxonomy → validate', () => {
    const fieldsByName = new Map([['Topics', makeField('Topics', 'TaxonomyFieldTypeMulti')]]);
    const out = pickSaveMethod({
      method: 'auto',
      changedFieldNames: ['Topics'],
      fieldsByName,
    });
    assert.equal(out, 'validate');
  });

  test('auto + multi-choice → validate', () => {
    const fieldsByName = new Map([['Categories', makeField('Categories', 'MultiChoice')]]);
    const out = pickSaveMethod({
      method: 'auto',
      changedFieldNames: ['Categories'],
      fieldsByName,
    });
    assert.equal(out, 'validate');
  });

  test('auto + lookup → validate', () => {
    const fieldsByName = new Map([['Category', makeField('Category', 'Lookup')]]);
    const out = pickSaveMethod({
      method: 'auto',
      changedFieldNames: ['Category'],
      fieldsByName,
    });
    assert.equal(out, 'validate');
  });

  test('auto + unknown changed field → ignores it (no metadata = no upgrade)', () => {
    const fieldsByName = new Map([['Title', makeField('Title', 'Text')]]);
    const out = pickSaveMethod({
      method: 'auto',
      changedFieldNames: ['Title', 'OrphanField'],
      fieldsByName,
    });
    assert.equal(out, 'update');
  });

  test('auto + empty change set → update (nothing to upgrade)', () => {
    const fieldsByName = new Map();
    const out = pickSaveMethod({
      method: 'auto',
      changedFieldNames: [],
      fieldsByName,
    });
    assert.equal(out, 'update');
  });

  test('VALIDATE_PREFERRED_TYPES covers all the typed-shape fields', () => {
    // Defensive — if someone adds a new typed field type they should also
    // add it to the preferred set.
    assert.ok(VALIDATE_PREFERRED_TYPES.has('User'));
    assert.ok(VALIDATE_PREFERRED_TYPES.has('UserMulti'));
    assert.ok(VALIDATE_PREFERRED_TYPES.has('Lookup'));
    assert.ok(VALIDATE_PREFERRED_TYPES.has('LookupMulti'));
    assert.ok(VALIDATE_PREFERRED_TYPES.has('TaxonomyFieldType'));
    assert.ok(VALIDATE_PREFERRED_TYPES.has('TaxonomyFieldTypeMulti'));
    assert.ok(VALIDATE_PREFERRED_TYPES.has('MultiChoice'));
    assert.equal(VALIDATE_PREFERRED_TYPES.has('Text'), false);
    assert.equal(VALIDATE_PREFERRED_TYPES.has('Number'), false);
    assert.equal(VALIDATE_PREFERRED_TYPES.has('Boolean'), false);
    assert.equal(VALIDATE_PREFERRED_TYPES.has('DateTime'), false);
  });
});

// ============================================================================
// applyFieldToUpdater — typed dispatch by fieldType
// ============================================================================

describe('applyFieldToUpdater — typed dispatch produces correct wire shapes', () => {
  test('Text → setText path → { Field: string }', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Title', 'Text'), 'Hello');
    assert.deepEqual(updater.getUpdates(), { Title: 'Hello' });
  });

  test('Note → setText path', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Body', 'Note'), 'long text');
    assert.deepEqual(updater.getUpdates(), { Body: 'long text' });
  });

  test('Number → setNumber → { Field: number }', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Amount', 'Number'), 42);
    assert.deepEqual(updater.getUpdates(), { Amount: 42 });
  });

  test('Boolean → setBoolean', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Active', 'Boolean'), true);
    assert.deepEqual(updater.getUpdates(), { Active: true });
  });

  test('User → setUser → { FieldId: number }', () => {
    const updater = createSPUpdater();
    const principal = { id: '5', email: 'a@b.com', loginName: 'a', title: 'A' };
    applyFieldToUpdater(updater, makeField('AssignedTo', 'User'), principal);
    assert.deepEqual(updater.getUpdates(), { AssignedToId: 5 });
  });

  test('UserMulti → setUserMulti → { FieldId: number[] }', () => {
    const updater = createSPUpdater();
    const principals = [
      { id: '1', email: 'a@b.com', loginName: 'a', title: 'A' },
      { id: '2', email: 'c@d.com', loginName: 'c', title: 'C' },
    ];
    applyFieldToUpdater(updater, makeField('Reviewers', 'UserMulti'), principals);
    assert.deepEqual(updater.getUpdates(), { ReviewersId: [1, 2] });
  });

  test('UserMulti with undefined value → empty array', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Reviewers', 'UserMulti'), undefined);
    assert.deepEqual(updater.getUpdates(true), { ReviewersId: [] });
  });

  test('Lookup → setLookup → { FieldId: number }', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Category', 'Lookup'), { Id: 7, Title: 'X' });
    assert.deepEqual(updater.getUpdates(), { CategoryId: 7 });
  });

  test('LookupMulti → setLookupMulti → { FieldId: number[] }', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Tags', 'LookupMulti'), [
      { Id: 1, Title: 'A' },
      { Id: 2, Title: 'B' },
    ]);
    assert.deepEqual(updater.getUpdates(), { TagsId: [1, 2] });
  });

  test('MultiChoice → setMultiChoice', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Cats', 'MultiChoice'), ['A', 'B']);
    assert.deepEqual(updater.getUpdates(), { Cats: ['A', 'B'] });
  });

  test('TaxonomyFieldType → setTaxonomy → { Label, TermGuid, WssId }', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(
      updater,
      makeField('Topic', 'TaxonomyFieldType'),
      { label: 'Cats', termId: 'g-1' }
    );
    assert.deepEqual(updater.getUpdates(), {
      Topic: { Label: 'Cats', TermGuid: 'g-1', WssId: -1 },
    });
  });

  test('TaxonomyFieldTypeMulti → setTaxonomyMulti → main + hidden _0 note field', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Topics', 'TaxonomyFieldTypeMulti'), [
      { label: 'Cats', termId: 'g-1' },
      { label: 'Dogs', termId: 'g-2' },
    ]);
    const out = updater.getUpdates();
    assert.deepEqual(out.Topics, [
      { Label: 'Cats', TermGuid: 'g-1', WssId: -1 },
      { Label: 'Dogs', TermGuid: 'g-2', WssId: -1 },
    ]);
    assert.equal(out.Topics_0, '-1;#Cats|g-1;#-1;#Dogs|g-2');
  });

  test('URL → setUrl', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Homepage', 'URL'), {
      url: 'https://example.com',
      description: 'Home',
    });
    assert.deepEqual(updater.getUpdates(), {
      Homepage: { Url: 'https://example.com', Description: 'Home' },
    });
  });

  test('DateTime → setDate', () => {
    const updater = createSPUpdater();
    const d = new Date('2024-05-01T00:00:00.000Z');
    applyFieldToUpdater(updater, makeField('DueDate', 'DateTime'), d);
    const out = updater.getUpdates();
    assert.equal(out.DueDate.toISOString(), d.toISOString());
  });

  test('Currency / Integer / Counter all route through setNumber', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Price', 'Currency'), 19.99);
    applyFieldToUpdater(updater, makeField('Count', 'Integer'), 5);
    applyFieldToUpdater(updater, makeField('Hits', 'Counter'), 100);
    assert.deepEqual(updater.getUpdates(), { Price: 19.99, Count: 5, Hits: 100 });
  });

  test('Calculated / Computed / Attachments / Guid are skipped silently', () => {
    const updater = createSPUpdater();
    applyFieldToUpdater(updater, makeField('Calc', 'Calculated'), 'ignore me');
    applyFieldToUpdater(updater, makeField('AttachField', 'Attachments'), 'ignore me');
    assert.deepEqual(updater.getUpdates(true), {});
  });

  test('returns the same updater for fluent chaining', () => {
    const updater = createSPUpdater();
    const same = applyFieldToUpdater(updater, makeField('Title', 'Text'), 'X');
    assert.equal(same, updater);
  });
});

// ============================================================================
// mapValidateResponseToFieldErrors
// ============================================================================

describe('mapValidateResponseToFieldErrors', () => {
  test('extracts only entries flagged HasException', () => {
    const errors = mapValidateResponseToFieldErrors([
      { FieldName: 'Title', HasException: false },
      { FieldName: 'Topic', HasException: true, ErrorMessage: 'Term archived' },
      { FieldName: 'AssignedTo', HasException: true, ErrorMessage: 'User not found' },
    ]);
    assert.deepEqual(errors, [
      { fieldName: 'Topic', message: 'Term archived' },
      { fieldName: 'AssignedTo', message: 'User not found' },
    ]);
  });

  test('falls back to a generic message when ErrorMessage missing', () => {
    const errors = mapValidateResponseToFieldErrors([
      { FieldName: 'Topic', HasException: true },
    ]);
    assert.deepEqual(errors, [
      { fieldName: 'Topic', message: 'Server validation failed' },
    ]);
  });

  test('drops entries with no FieldName even if HasException', () => {
    const errors = mapValidateResponseToFieldErrors([
      { FieldName: '', HasException: true, ErrorMessage: 'broken' },
    ]);
    assert.deepEqual(errors, []);
  });

  test('empty / all-success response → empty errors', () => {
    assert.deepEqual(mapValidateResponseToFieldErrors([]), []);
    assert.deepEqual(
      mapValidateResponseToFieldErrors([
        { FieldName: 'Title', HasException: false },
      ]),
      []
    );
  });
});

// ============================================================================
// extractNewItemId — Issue 4 fix: items.add response must yield a real id.
// ============================================================================

describe('extractNewItemId', () => {
  test('PnP v3 shape `{ data: { Id } }` resolves', () => {
    assert.equal(extractNewItemId({ data: { Id: 42 } }), 42);
  });

  test('top-level `Id` resolves (alternate http behavior)', () => {
    assert.equal(extractNewItemId({ Id: 7 }), 7);
  });

  test('uppercase `ID` resolves', () => {
    assert.equal(extractNewItemId({ data: { ID: 9 } }), 9);
    assert.equal(extractNewItemId({ ID: 11 }), 11);
  });

  test('string id is parsed', () => {
    assert.equal(extractNewItemId({ data: { Id: '42' } }), 42);
  });

  test('returns null for missing id', () => {
    assert.equal(extractNewItemId({}), null);
    assert.equal(extractNewItemId({ data: {} }), null);
  });

  test('returns null for zero / negative / NaN', () => {
    assert.equal(extractNewItemId({ data: { Id: 0 } }), null);
    assert.equal(extractNewItemId({ data: { Id: -3 } }), null);
    assert.equal(extractNewItemId({ data: { Id: 'not-a-number' } }), null);
  });

  test('returns null for non-object response', () => {
    assert.equal(extractNewItemId(null), null);
    assert.equal(extractNewItemId(undefined), null);
    assert.equal(extractNewItemId('string'), null);
    assert.equal(extractNewItemId(42), null);
  });

  test('prefers `data.Id` over fallbacks', () => {
    // If data.Id is valid, ID/Id elsewhere should not override it.
    assert.equal(extractNewItemId({ data: { Id: 1 }, Id: 99, ID: 50 }), 1);
  });

  test('falls through fallbacks until a valid id is found', () => {
    // data.Id missing, fall to top-level Id.
    assert.equal(extractNewItemId({ data: { Title: 'X' }, Id: 5 }), 5);
    // top-level Id zero → fall to data.ID.
    assert.equal(extractNewItemId({ Id: 0, data: { ID: 7 } }), 7);
  });
});
