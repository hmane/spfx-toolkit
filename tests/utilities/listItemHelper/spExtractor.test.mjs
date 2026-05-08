/**
 * Regression tests for `createSPExtractor` against realistic SharePoint REST
 * payloads.
 *
 * Root cause this fixture protects against: SP REST returns `Id`
 * (PascalCase, capital `I` only). The previous extractor only checked `ID`
 * (all-caps) and `id` (camelCase), so PnP v3 expanded user/lookup payloads
 * silently produced `id: ''` and the extractor returned `undefined`. The
 * SPDynamicForm then arrived at the picker with `null`, and edit-mode user
 * fields appeared empty.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createSPExtractor } from '../../../lib/utilities/listItemHelper/spExtractor.js';

// ---------------------------------------------------------------------------
// Realistic PnP v3 expanded payloads. Source-of-truth shape from SP REST
// `?$select=AssignedTo/Id,AssignedTo/Title,AssignedTo/EMail,AssignedTo/Name
//  &$expand=AssignedTo`
// ---------------------------------------------------------------------------

const realUserExpansion = {
  Id: 5,
  Title: 'Alice Anderson',
  EMail: 'alice@contoso.com',
  Name: 'i:0#.f|membership|alice@contoso.com',
};

const realMultiUserExpansion = [
  {
    Id: 7,
    Title: 'Alice',
    EMail: 'alice@x.com',
    Name: 'i:0#.f|membership|alice@x.com',
  },
  {
    Id: 9,
    Title: 'Bob',
    EMail: 'bob@x.com',
    Name: 'i:0#.f|membership|bob@x.com',
  },
];

const realLookupExpansion = {
  Id: 42,
  Title: 'Project Roadmap',
};

// ---------------------------------------------------------------------------
// user() — single user field
// ---------------------------------------------------------------------------

describe('extractor.user — PascalCase Id (regression: previously dropped)', () => {
  test('PnP v3 expanded shape `{ Id, Title, EMail, Name }` extracts correctly', () => {
    const extractor = createSPExtractor({ AssignedTo: realUserExpansion });
    const principal = extractor.user('AssignedTo');

    assert.ok(principal, 'principal should not be undefined');
    assert.equal(principal.id, '5');
    assert.equal(principal.email, 'alice@contoso.com');
    assert.equal(principal.title, 'Alice Anderson');
    assert.equal(principal.loginName, 'i:0#.f|membership|alice@contoso.com');
  });

  test('all-caps `ID` fallback still works (legacy compat)', () => {
    const extractor = createSPExtractor({
      AssignedTo: { ID: 5, Title: 'A', EMail: 'a@b.com' },
    });
    assert.equal(extractor.user('AssignedTo').id, '5');
  });

  test('camelCase `id` fallback still works (form-shaped payload)', () => {
    const extractor = createSPExtractor({
      AssignedTo: { id: 5, title: 'A', email: 'a@b.com' },
    });
    assert.equal(extractor.user('AssignedTo').id, '5');
  });

  test('PascalCase wins when multiple key casings are present (canonical first)', () => {
    const extractor = createSPExtractor({
      AssignedTo: { Id: 5, ID: 6, id: 7, Title: 'A' },
    });
    assert.equal(extractor.user('AssignedTo').id, '5');
  });

  test('user array (SP returns array even for single field) extracts first', () => {
    const extractor = createSPExtractor({
      AssignedTo: [realUserExpansion],
    });
    const principal = extractor.user('AssignedTo');
    assert.ok(principal);
    assert.equal(principal.id, '5');
    assert.equal(principal.email, 'alice@contoso.com');
  });

  test('null user field returns undefined', () => {
    const extractor = createSPExtractor({ AssignedTo: null });
    assert.equal(extractor.user('AssignedTo'), undefined);
  });

  test('missing field returns undefined', () => {
    const extractor = createSPExtractor({});
    assert.equal(extractor.user('AssignedTo'), undefined);
  });

  test('user object without any id flavor returns undefined', () => {
    const extractor = createSPExtractor({
      AssignedTo: { Title: 'No id here' },
    });
    assert.equal(extractor.user('AssignedTo'), undefined);
  });
});

// ---------------------------------------------------------------------------
// userMulti() — multi user field
// ---------------------------------------------------------------------------

describe('extractor.userMulti — PascalCase Id', () => {
  test('PnP v3 expanded array of `{ Id, ... }` extracts all', () => {
    const extractor = createSPExtractor({ Reviewers: realMultiUserExpansion });
    const principals = extractor.userMulti('Reviewers');
    assert.equal(principals.length, 2);
    assert.deepEqual(
      principals.map((p) => p.id),
      ['7', '9']
    );
    assert.equal(principals[0].email, 'alice@x.com');
    assert.equal(principals[1].email, 'bob@x.com');
  });

  test('legacy `{ results: [...] }` wrapper still unwrapped', () => {
    const extractor = createSPExtractor({
      Reviewers: { results: realMultiUserExpansion },
    });
    const principals = extractor.userMulti('Reviewers');
    assert.equal(principals.length, 2);
    assert.equal(principals[0].id, '7');
  });

  test('users without any id are dropped (legacy filter still active)', () => {
    const extractor = createSPExtractor({
      Reviewers: [
        { Id: 7, Title: 'Alice' },
        { Title: 'Orphan with no id' },
        { Id: 9, Title: 'Bob' },
      ],
    });
    const principals = extractor.userMulti('Reviewers');
    assert.equal(principals.length, 2);
    assert.deepEqual(
      principals.map((p) => p.id),
      ['7', '9']
    );
  });

  test('empty / missing field returns []', () => {
    assert.deepEqual(createSPExtractor({}).userMulti('Reviewers'), []);
    assert.deepEqual(createSPExtractor({ Reviewers: null }).userMulti('Reviewers'), []);
    assert.deepEqual(createSPExtractor({ Reviewers: [] }).userMulti('Reviewers'), []);
  });
});

// ---------------------------------------------------------------------------
// lookup() / lookupMulti()
// ---------------------------------------------------------------------------

describe('extractor.lookup — PascalCase Id', () => {
  test('PnP v3 expanded shape `{ Id, Title }` extracts correctly', () => {
    const extractor = createSPExtractor({ Project: realLookupExpansion });
    const lookup = extractor.lookup('Project');
    assert.ok(lookup);
    assert.equal(lookup.id, 42);
    assert.equal(lookup.title, 'Project Roadmap');
  });

  test('PascalCase Id of value 0 is treated as a real id (rare but valid)', () => {
    // Note: the user/multi paths use `||` and reject id=0; lookup uses `??`
    // so 0 is preserved. This is current behavior — documented for clarity.
    const extractor = createSPExtractor({ Project: { Id: 0, Title: 'X' } });
    const lookup = extractor.lookup('Project');
    assert.ok(lookup);
    assert.equal(lookup.id, 0);
  });

  test('null returns undefined', () => {
    assert.equal(createSPExtractor({ Project: null }).lookup('Project'), undefined);
  });
});

describe('extractor.lookupMulti — PascalCase Id', () => {
  test('PnP v3 expanded array `[{ Id, Title }]` extracts all', () => {
    const extractor = createSPExtractor({
      Tags: [
        { Id: 1, Title: 'A' },
        { Id: 2, Title: 'B' },
      ],
    });
    const lookups = extractor.lookupMulti('Tags');
    assert.equal(lookups.length, 2);
    assert.deepEqual(
      lookups.map((l) => l.id),
      [1, 2]
    );
  });

  test('legacy `{ results }` wrapper unwrapped', () => {
    const extractor = createSPExtractor({
      Tags: {
        results: [
          { Id: 1, Title: 'A' },
          { Id: 2, Title: 'B' },
        ],
      },
    });
    const lookups = extractor.lookupMulti('Tags');
    assert.equal(lookups.length, 2);
  });

  test('lookups without id are dropped', () => {
    const extractor = createSPExtractor({
      Tags: [{ Id: 1, Title: 'A' }, { Title: 'orphan' }, { Id: 3, Title: 'C' }],
    });
    const lookups = extractor.lookupMulti('Tags');
    assert.equal(lookups.length, 2);
    assert.deepEqual(
      lookups.map((l) => l.id),
      [1, 3]
    );
  });
});
