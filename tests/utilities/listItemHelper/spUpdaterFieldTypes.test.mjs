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
 *                    (the hidden `${FieldName}_0` Note field is intentionally
 *                    NOT emitted — it fails on document libraries and on
 *                    fields with non-conventional hidden field names. Use
 *                    `validateUpdateListItem` for full taxonomy save.)
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

  test('multi-taxonomy emits ONLY the structured field (no _0 hidden write)', () => {
    // Regression: previously emitted `${field}_0` per the legacy PnP recipe,
    // but that fails on document libraries (file items) and on fields with
    // non-conventional hidden Note field names — SP returns
    // "property '_0' does not exist". The recommended path for taxonomy is
    // `validateUpdateListItem`, which the autoSave helpers route to via
    // `VALIDATE_PREFERRED_TYPES`. Direct `update()` callers get a partial
    // save (visible field updated) but no longer hit the _0 error.
    const u = createSPUpdater().setTaxonomyMulti('Topics', [
      { label: 'Cats', termId: 't1' },
      { label: 'Dogs', termId: 't2' },
    ]);
    const out = u.getUpdates();
    assert.deepEqual(out, {
      Topics: [
        { Label: 'Cats', TermGuid: 't1', WssId: -1 },
        { Label: 'Dogs', TermGuid: 't2', WssId: -1 },
      ],
    });
    assert.equal(
      'Topics_0' in out,
      false,
      'must NOT emit Topics_0 — that breaks libraries / non-conventional hidden fields'
    );
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

  test('boolean → "Yes" / "No" (canonical FieldValue, not 1/0)', () => {
    // Documented `validateUpdateListItem` FieldValue for Yes/No columns is
    // the literal display string ('Yes' or 'No'). '1'/'0' works on some
    // tenants but isn't the canonical form.
    const out = createSPUpdater()
      .setBoolean('A', true)
      .setBoolean('B', false)
      .getValidateUpdates();
    const map = Object.fromEntries(out.map((e) => [e.FieldName, e.FieldValue]));
    assert.equal(map.A, 'Yes');
    assert.equal(map.B, 'No');
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

  test('taxonomy single → "Label|TermGuid" (no trailing semicolon)', () => {
    // Documented FieldValue: pipe-separated, NO trailing `;`. The earlier
    // trailing-semicolon form is accepted on some tenants but isn't the
    // canonical form per SP REST docs.
    const out = createSPUpdater()
      .setTaxonomy('Topic', { label: 'Cats', termId: 'a' })
      .getValidateUpdates();
    assert.deepEqual(out, [{ FieldName: 'Topic', FieldValue: 'Cats|a' }]);
  });

  test('multiChoice → "Choice1;#Choice2" (NO leading/trailing markers)', () => {
    // Documented MultiChoice FieldValue is `<choice1>;#<choice2>` — joined
    // by `;#` with no leading/trailing marker. The earlier `;#A;#B;#` form
    // is parsed by SP as an empty initial choice (silent drop / corrupt).
    const out = createSPUpdater()
      .setMultiChoice('Cats', ['A', 'B', 'C'])
      .getValidateUpdates();
    assert.deepEqual(out, [{ FieldName: 'Cats', FieldValue: 'A;#B;#C' }]);
  });

  test('lookupMulti via number array → "1;#;#2;#;#3" (no trailing ;#)', () => {
    // Documented MultiLookup FieldValue: IDs joined by literal `;#;#`,
    // NO trailing marker. Verified against the live tenant where the
    // previous formats produced ErrorCode 0 but silently dropped values.
    const out = createSPUpdater()
      .set('CategoriesId', [1, 2, 3])
      .getValidateUpdates();
    assert.deepEqual(out, [{ FieldName: 'CategoriesId', FieldValue: '1;#;#2;#;#3' }]);
  });

  test('lookupMulti via {Id,Title} array → "1;#;#2;#;#3" (no trailing ;#)', () => {
    const out = createSPUpdater()
      .setLookupMulti('Categories', [
        { Id: 1, Title: 'A' },
        { Id: 2, Title: 'B' },
        { Id: 3, Title: 'C' },
      ])
      .getValidateUpdates();
    assert.deepEqual(out, [
      { FieldName: 'Categories', FieldValue: '1;#;#2;#;#3' },
    ]);
  });

  test('Date → "M/D/YYYY h:mm AM/PM" (SP locale format, NOT ISO)', () => {
    // REGRESSION: `validateUpdateListItem` rejects ISO date formats with the
    // generic "must specify a valid date within the range of 1/1/1900 and
    // 12/31/8900" error (reproduced on dodgeandcox.sharepoint.com against
    // TargetReturnDate with BOTH `2026-06-06T07:00:00.000Z` and
    // `2026-06-06T07:00:00Z`). SP expects the locale-formatted date string
    // matching what a user would type into the form input. For US English
    // (LocaleId 1033) sites that is `M/D/YYYY h:mm AM/PM`.
    // Source: SP MVP Phil Harding,
    // https://gist.github.com/phillipharding/30714d4ee245bfc0cba5699b6bb4193e
    //
    // Local-time constructor so the formatter's local-component output is
    // deterministic regardless of the test runner's timezone.
    const date = new Date(2018, 5, 23, 22, 15, 0); // 6/23/2018 10:15 PM local
    const out = createSPUpdater()
      .set('Due', date)
      .getValidateUpdates();
    assert.equal(out[0].FieldName, 'Due');
    assert.equal(out[0].FieldValue, '6/23/2018 10:15 PM');
  });

  test('user single without loginName/value → throws (email is not accepted as Key)', () => {
    // SP requires the claims-formatted login name as `Key` —
    // `i:0#.f|membership|user@x.com`. Email alone produces a silent invalid
    // write. We fail fast instead.
    const u = createSPUpdater().setUser('AssignedTo', {
      id: '5',
      email: 'a@b.com',
      title: 'A',
    });
    assert.throws(
      () => u.getValidateUpdates(),
      /missing 'loginName' \/ 'value'/
    );
  });

  test('user single with loginName → JSON [{ Key: <claim> }]', () => {
    const out = createSPUpdater()
      .setUser('AssignedTo', {
        id: '5',
        email: 'a@b.com',
        loginName: 'i:0#.f|membership|a@b.com',
        title: 'A',
      })
      .getValidateUpdates();
    const parsed = JSON.parse(out[0].FieldValue);
    assert.deepEqual(parsed, [{ Key: 'i:0#.f|membership|a@b.com' }]);
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

// ----------------------------------------------------------------------------
// REGRESSION: typed setters override value-shape detection
// ----------------------------------------------------------------------------

describe('spUpdater — typed setter overrides value-shape detection', () => {
  test('setUserMulti with {Id,Title} objects writes user id list (not the ;# lookup form)', () => {
    // BUG REGRESSION: previously, when a user-multi value lacked
    // `email`/`loginName`/`value` and only had `{Id, Title}` (e.g. fetched
    // from an expanded lookup-shaped source), structure detection routed it
    // through the lookup branch and produced `;#1;#2;#` for the validate
    // path and a lookup-shaped update. The typed setter now wins.
    const out = createSPUpdater()
      .setUserMulti('Reviewers', [
        { Id: 1, Title: 'Alice' },
        { Id: 2, Title: 'Bob' },
      ])
      .getUpdates();
    assert.deepEqual(out, { ReviewersId: [1, 2] });
  });

  test('setLookupMulti with email-bearing objects still writes lookup ids (not user)', () => {
    // Inverse case: a lookup-multi value with `email` on the items (unusual
    // but possible from an expanded user-typed lookup) used to detect as
    // user-multi. Typed setter now wins.
    const out = createSPUpdater()
      .setLookupMulti('Categories', [
        { Id: 5, Title: 'Cat5', email: 'noise@x.com' },
        { Id: 6, Title: 'Cat6' },
      ])
      .getUpdates();
    assert.deepEqual(out, { CategoriesId: [5, 6] });
  });

  test('setUser validate: throws when login claim missing — even for {Id,Title} input', () => {
    // Validate path requires the claims-formatted login name. The typed
    // setter routes to the user branch where the claim check fires.
    const u = createSPUpdater().setUser('AssignedTo', { Id: 5, Title: 'Alice' });
    assert.throws(() => u.getValidateUpdates(), /missing 'loginName' \/ 'value'/);
  });

  test('setUserMulti validate: emits [{Key}] JSON for objects with loginName', () => {
    const out = createSPUpdater()
      .setUserMulti('Reviewers', [
        { id: 1, email: 'a@b.com', loginName: 'i:0#.f|membership|a@b.com', title: 'A' },
        { id: 2, email: 'c@d.com', loginName: 'i:0#.f|membership|c@d.com', title: 'C' },
      ])
      .getValidateUpdates();
    assert.equal(out[0].FieldName, 'Reviewers');
    const parsed = JSON.parse(out[0].FieldValue);
    assert.deepEqual(parsed, [
      { Key: 'i:0#.f|membership|a@b.com' },
      { Key: 'i:0#.f|membership|c@d.com' },
    ]);
  });

  test('setUser with id alone fails fast on PnP path (no silent undefined write)', () => {
    // Previous behaviour: would silently write `{ AssignedToId: undefined }`
    // and serialize to nothing — field would not update with no error.
    const u = createSPUpdater().setUser('AssignedTo', {
      email: 'a@b.com',
      // id intentionally missing
    });
    assert.throws(() => u.getUpdates(), /missing 'id' \/ 'Id'/);
  });
});

// ----------------------------------------------------------------------------
// setDateOnly: TZ-safe date-only writes
// ----------------------------------------------------------------------------

describe('spUpdater — setDateOnly (Date Only column)', () => {
  test('setDateOnly with Date instance → YYYY-MM-DD using local components', () => {
    // Construct a Date that's clearly "Jan 15" in the runtime's local TZ
    // by using the local-time constructor (no UTC).
    const d = new Date(2024, 0, 15); // local midnight Jan 15
    const out = createSPUpdater().setDateOnly('DueDate', d).getUpdates();
    assert.equal(out.DueDate, '2024-01-15');
  });

  test('setDateOnly with YYYY-MM-DD string passes through unchanged', () => {
    const out = createSPUpdater().setDateOnly('DueDate', '2024-01-15').getUpdates();
    assert.equal(out.DueDate, '2024-01-15');
  });

  test('setDateOnly validate path emits "M/D/YYYY" (SP locale format)', () => {
    // SP `validateUpdateListItem` for Date Only columns expects M/D/YYYY
    // locale format (US English), same as DateTime. The PnP `update()` path
    // keeps YYYY-MM-DD since Edm.DateTime accepts ISO date.
    const d = new Date(2024, 0, 15);
    const out = createSPUpdater().setDateOnly('DueDate', d).getValidateUpdates();
    assert.deepEqual(out, [{ FieldName: 'DueDate', FieldValue: '1/15/2024' }]);
  });

  test('setDateOnly with null clears the field', () => {
    const out = createSPUpdater().setDateOnly('DueDate', null).getUpdates(true);
    assert.deepEqual(out, { DueDate: null });
  });

  test('setDateOnly change detection: same YYYY-MM-DD shapes do not appear in updates', () => {
    const u = createSPUpdater().setDateOnly('DueDate', '2024-01-15', new Date(2024, 0, 15));
    assert.deepEqual(u.getUpdates(), {});
    assert.equal(u.hasChanges(), false);
  });
});
