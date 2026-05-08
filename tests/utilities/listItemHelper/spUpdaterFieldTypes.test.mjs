/**
 * Field-type coverage audit for `createSPUpdater` + `formatValueForPnP`.
 *
 * Verifies that every SharePoint field type the form might touch produces
 * a correctly-shaped PnP `update`-style payload (and where applicable, a
 * correct `validateUpdateListItem` form value).
 *
 * Reference: SharePoint REST conventions for list item writes —
 * - lookup / user → `{FieldName}Id: number`
 * - multi-lookup / multi-user → `{FieldName}Id: number[]`
 * - taxonomy single → `{FieldName}: { Label, TermGuid, WssId }`
 * - taxonomy multi → `{FieldName}: [{Label, TermGuid, WssId}, ...]`
 *                   plus hidden `{FieldName}_0` Note field with
 *                   `-1;#Label|Guid;#-1;#Label|Guid` serialization
 * - URL → `{FieldName}: { Url, Description }`
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSPUpdater,
  formatValueForPnP,
} from '../../../lib/utilities/listItemHelper/spUpdater.js';

// ----------------------------------------------------------------------------
// PRIMITIVE field types
// ----------------------------------------------------------------------------

describe('spUpdater — primitive field types', () => {
  test('text/string', () => {
    const u = createSPUpdater().set('Title', 'Hello');
    assert.deepEqual(u.getUpdates(), { Title: 'Hello' });
  });

  test('number', () => {
    const u = createSPUpdater().set('Amount', 42);
    assert.deepEqual(u.getUpdates(), { Amount: 42 });
  });

  test('currency (number)', () => {
    // Currency uses the number path — same shape on the wire.
    const u = createSPUpdater().setNumber('Price', 19.99);
    assert.deepEqual(u.getUpdates(), { Price: 19.99 });
  });

  test('boolean', () => {
    const u = createSPUpdater().setBoolean('IsActive', true);
    assert.deepEqual(u.getUpdates(), { IsActive: true });
  });

  test('date', () => {
    const d = new Date('2024-05-01T00:00:00.000Z');
    const u = createSPUpdater().setDate('DueDate', d);
    const out = u.getUpdates();
    assert.ok(out.DueDate instanceof Date);
    assert.equal(out.DueDate.toISOString(), d.toISOString());
  });

  test('null clears the field', () => {
    const u = createSPUpdater().set('Title', null);
    assert.deepEqual(u.getUpdates(true), { Title: null });
  });
});

// ----------------------------------------------------------------------------
// CHOICE field types
// ----------------------------------------------------------------------------

describe('spUpdater — choice / multi-choice', () => {
  test('choice (single string)', () => {
    const u = createSPUpdater().setChoice('Status', 'Active');
    assert.deepEqual(u.getUpdates(), { Status: 'Active' });
  });

  test('multiChoice (array of strings)', () => {
    const u = createSPUpdater().setMultiChoice('Categories', ['A', 'B', 'C']);
    assert.deepEqual(u.getUpdates(), { Categories: ['A', 'B', 'C'] });
  });

  test('multiChoice (empty array)', () => {
    const u = createSPUpdater().setMultiChoice('Categories', []);
    assert.deepEqual(u.getUpdates(true), { Categories: [] });
  });
});

// ----------------------------------------------------------------------------
// USER / multi-user
// ----------------------------------------------------------------------------

describe('spUpdater — user fields', () => {
  test('user single → {FieldName}Id: number', () => {
    const u = createSPUpdater().setUser('AssignedTo', {
      id: '5',
      email: 'a@b.com',
      title: 'Alice',
      loginName: 'i:0#.f|membership|a@b.com',
    });
    assert.deepEqual(u.getUpdates(), { AssignedToId: 5 });
  });

  test('user single accepts numeric id', () => {
    const u = createSPUpdater().setUser('AssignedTo', {
      id: 7,
      email: 'a@b.com',
      title: 'A',
      loginName: 'a',
    });
    assert.deepEqual(u.getUpdates(), { AssignedToId: 7 });
  });

  test('multi-user → {FieldName}Id: number[]', () => {
    const u = createSPUpdater().setUserMulti('Reviewers', [
      { id: '1', email: 'a@b.com', title: 'A', loginName: 'a' },
      { id: '2', email: 'c@d.com', title: 'C', loginName: 'c' },
    ]);
    assert.deepEqual(u.getUpdates(), { ReviewersId: [1, 2] });
  });

  test('multi-user empty array → {FieldName}Id: []', () => {
    const u = createSPUpdater().setUserMulti('Reviewers', []);
    assert.deepEqual(u.getUpdates(true), { ReviewersId: [] });
  });

  test('user field whose name already ends with Id is not double-suffixed', () => {
    const out = formatValueForPnP('OwnerId', { id: 3, email: 'x', loginName: 'x', title: 'x' });
    assert.deepEqual(out, { OwnerId: 3 });
  });
});

// ----------------------------------------------------------------------------
// LOOKUP / multi-lookup
// ----------------------------------------------------------------------------

describe('spUpdater — lookup fields', () => {
  test('lookup single → {FieldName}Id: number', () => {
    const u = createSPUpdater().setLookup('Category', { Id: 3, Title: 'Books' });
    assert.deepEqual(u.getUpdates(), { CategoryId: 3 });
  });

  test('lookup accepts lowercase keys', () => {
    const u = createSPUpdater().setLookup('Category', { id: 5, title: 'X' });
    assert.deepEqual(u.getUpdates(), { CategoryId: 5 });
  });

  test('multi-lookup (objects) → {FieldName}Id: number[]', () => {
    const u = createSPUpdater().setLookupMulti('Tags', [
      { Id: 1, Title: 'A' },
      { Id: 2, Title: 'B' },
    ]);
    assert.deepEqual(u.getUpdates(), { TagsId: [1, 2] });
  });

  test('multi-lookup (numeric ids) → {FieldName}Id: number[]', () => {
    // The dispatch detects numeric arrays as lookup IDs by default.
    const out = formatValueForPnP('Tags', [10, 20]);
    assert.deepEqual(out, { TagsId: [10, 20] });
  });

  test('multi-lookup empty array → {FieldName}Id: []', () => {
    const u = createSPUpdater().setLookupMulti('Tags', []);
    assert.deepEqual(u.getUpdates(true), { TagsId: [] });
  });
});

// ----------------------------------------------------------------------------
// TAXONOMY / multi-taxonomy
// ----------------------------------------------------------------------------

describe('spUpdater — taxonomy fields', () => {
  test('taxonomy single → {Label, TermGuid, WssId}', () => {
    const u = createSPUpdater().setTaxonomy('Topic', {
      label: 'Cats',
      termId: 'a-b-c-d',
    });
    const out = u.getUpdates();
    assert.deepEqual(out, {
      Topic: { Label: 'Cats', TermGuid: 'a-b-c-d', WssId: -1 },
    });
  });

  test('taxonomy single accepts WssId override', () => {
    const u = createSPUpdater().setTaxonomy('Topic', {
      label: 'Cats',
      termId: 'a',
      wssId: 17,
    });
    assert.deepEqual(u.getUpdates(), {
      Topic: { Label: 'Cats', TermGuid: 'a', WssId: 17 },
    });
  });

  test('multi-taxonomy emits BOTH the structured field and the hidden _0 note field', () => {
    const u = createSPUpdater().setTaxonomyMulti('Topics', [
      { label: 'Cats', termId: 't1' },
      { label: 'Dogs', termId: 't2' },
    ]);
    const out = u.getUpdates();
    // Structured value
    assert.deepEqual(out.Topics, [
      { Label: 'Cats', TermGuid: 't1', WssId: -1 },
      { Label: 'Dogs', TermGuid: 't2', WssId: -1 },
    ]);
    // Hidden Note companion — `-1;#Label|Guid;#-1;#Label|Guid` semicolon-hash format
    assert.equal(out.Topics_0, '-1;#Cats|t1;#-1;#Dogs|t2');
  });
});

// ----------------------------------------------------------------------------
// URL / hyperlink
// ----------------------------------------------------------------------------

describe('spUpdater — URL fields', () => {
  test('url with description → {Url, Description}', () => {
    const u = createSPUpdater().setUrl('Homepage', {
      url: 'https://example.com',
      description: 'Home',
    });
    assert.deepEqual(u.getUpdates(), {
      Homepage: { Url: 'https://example.com', Description: 'Home' },
    });
  });

  test('url without description → empty Description', () => {
    const u = createSPUpdater().setUrl('Homepage', { url: 'https://example.com' });
    assert.deepEqual(u.getUpdates(), {
      Homepage: { Url: 'https://example.com', Description: '' },
    });
  });
});

// ----------------------------------------------------------------------------
// validateUpdateListItem path
// ----------------------------------------------------------------------------

describe('spUpdater — validateUpdateListItem (FormUpdateValue) format', () => {
  test('text', () => {
    const out = createSPUpdater().setText('Title', 'X').getValidateUpdates();
    assert.deepEqual(out, [{ FieldName: 'Title', FieldValue: 'X' }]);
  });

  test('number → string', () => {
    const out = createSPUpdater().setNumber('Amount', 42).getValidateUpdates();
    assert.deepEqual(out, [{ FieldName: 'Amount', FieldValue: '42' }]);
  });

  test('boolean → "1" / "0"', () => {
    const out = createSPUpdater()
      .setBoolean('A', true)
      .setBoolean('B', false)
      .getValidateUpdates();
    const map = Object.fromEntries(out.map((e) => [e.FieldName, e.FieldValue]));
    assert.equal(map.A, '1');
    assert.equal(map.B, '0');
  });

  test('user single → JSON [{Key}]', () => {
    const out = createSPUpdater()
      .setUser('AssignedTo', {
        id: '5',
        email: 'a@b.com',
        loginName: 'i:0#.f|membership|a@b.com',
        title: 'A',
      })
      .getValidateUpdates();
    assert.equal(out[0].FieldName, 'AssignedTo');
    const parsed = JSON.parse(out[0].FieldValue);
    assert.equal(parsed.length, 1);
    // Key prefers value > loginName > email — implementation detail, just assert it's set.
    assert.ok(parsed[0].Key);
  });

  test('lookup single → "id"', () => {
    const out = createSPUpdater()
      .setLookup('Category', { Id: 5, Title: 'X' })
      .getValidateUpdates();
    assert.deepEqual(out, [{ FieldName: 'Category', FieldValue: '5' }]);
  });

  test('taxonomy single → "Label|TermGuid;"', () => {
    const out = createSPUpdater()
      .setTaxonomy('Topic', { label: 'Cats', termId: 'a' })
      .getValidateUpdates();
    assert.deepEqual(out, [{ FieldName: 'Topic', FieldValue: 'Cats|a;' }]);
  });

  test('multiChoice → ";#"-joined', () => {
    const out = createSPUpdater()
      .setMultiChoice('Cats', ['A', 'B', 'C'])
      .getValidateUpdates();
    assert.deepEqual(out, [{ FieldName: 'Cats', FieldValue: 'A;#B;#C' }]);
  });
});

// ----------------------------------------------------------------------------
// hasChanged / change-detection sanity
// ----------------------------------------------------------------------------

describe('spUpdater — change detection', () => {
  test('same primitive value → not in default getUpdates()', () => {
    const u = createSPUpdater().set('Title', 'Same', 'Same');
    assert.deepEqual(u.getUpdates(), {});
    assert.equal(u.hasChanges(), false);
  });

  test('different primitive value → included', () => {
    const u = createSPUpdater().set('Title', 'New', 'Old');
    assert.deepEqual(u.getUpdates(), { Title: 'New' });
  });

  test('AUDIT: spUpdater change detection is shape-sensitive (current behavior)', () => {
    // spUpdater's `isEqual` is a deep-compare. When the form-extracted shape
    // differs from the server-expanded shape (extra `__metadata`, snake_case
    // vs PascalCase keys, extra fields), `hasChanged` flips to true even when
    // the IDs are identical.
    //
    // This is the documented pain point that SPDynamicForm works around via
    // `fieldValueChanged` in `useDynamicFormValidation.ts:84-99`. Any
    // standalone autosave that uses spUpdater directly must apply the same
    // shape-aware comparison BEFORE calling `set`, or accept spurious writes.
    const u = createSPUpdater().setLookup(
      'Category',
      { Id: 5, Title: 'X' },
      { Id: 5, Title: 'X', __metadata: {} }
    );
    // Documents current behavior — flag if it changes (could be improvement
    // OR regression depending on intent).
    assert.deepEqual(u.getUpdates(), { CategoryId: 5 });
  });

  test('AUDIT: taxonomy change detection is also shape-sensitive', () => {
    const u = createSPUpdater().setTaxonomy(
      'Topic',
      { label: 'Cats', termId: 't1' },
      { Label: 'Cats', TermGuid: 't1', WssId: 7 }
    );
    // Same shape-sensitivity. Workaround in SPDynamicForm via
    // `fieldValueChanged`.
    assert.ok('Topic' in u.getUpdates());
  });

  test('exact-shape match short-circuits (sanity check)', () => {
    const same = { Id: 5, Title: 'X' };
    const u = createSPUpdater().setLookup('Category', same, same);
    assert.deepEqual(u.getUpdates(), {});
    assert.equal(u.hasChanges(), false);
  });
});

// ----------------------------------------------------------------------------
// Auto-detection from raw values (no explicit type)
// ----------------------------------------------------------------------------

describe('spUpdater — auto-detection from value shape', () => {
  test('plain object { Id, Title } detected as lookup', () => {
    const out = formatValueForPnP('Cat', { Id: 1, Title: 'A' });
    assert.deepEqual(out, { CatId: 1 });
  });

  test('plain object with email detected as user', () => {
    const out = formatValueForPnP('Owner', { id: 2, email: 'a@b.com' });
    assert.deepEqual(out, { OwnerId: 2 });
  });

  test('plain object with TermGuid detected as taxonomy', () => {
    const out = formatValueForPnP('Topic', { Label: 'X', TermGuid: 't' });
    assert.deepEqual(out.Topic, { Label: 'X', TermGuid: 't', WssId: -1 });
  });
});
