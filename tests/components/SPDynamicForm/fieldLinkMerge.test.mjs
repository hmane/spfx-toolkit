/**
 * Audit Finding 1 — content-type FieldLink wins for Hidden / Required.
 *
 * Previously the merge was `metadata.hidden = metadata.hidden || fieldLink.Hidden`,
 * which could only escalate. SP's actual semantics: the FieldLink determines
 * the flag within that content type, so a fieldLink can flip a site-required
 * column to optional within the CT (and vice versa).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { applyFieldLinkToMetadata } from '../../../lib/components/SPDynamicForm/utilities/fieldMapper.js';

function makeMeta(overrides = {}) {
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

describe('applyFieldLinkToMetadata — Hidden semantics', () => {
  test('site=hidden + fieldLink=visible → visible (CT wins)', () => {
    const m = makeMeta({ hidden: true });
    applyFieldLinkToMetadata(m, { Hidden: false, Required: false });
    assert.equal(m.hidden, false);
  });

  test('site=visible + fieldLink=hidden → hidden (CT wins)', () => {
    const m = makeMeta({ hidden: false });
    applyFieldLinkToMetadata(m, { Hidden: true, Required: false });
    assert.equal(m.hidden, true);
  });

  test('site=visible + fieldLink=visible → visible', () => {
    const m = makeMeta({ hidden: false });
    applyFieldLinkToMetadata(m, { Hidden: false, Required: false });
    assert.equal(m.hidden, false);
  });

  test('fieldLink.Hidden missing → keep site column value', () => {
    const m = makeMeta({ hidden: true });
    applyFieldLinkToMetadata(m, { Required: false });
    assert.equal(m.hidden, true);
  });
});

describe('applyFieldLinkToMetadata — Required semantics', () => {
  test('site=required + fieldLink=optional → optional (CT wins) — was broken', () => {
    const m = makeMeta({ required: true });
    applyFieldLinkToMetadata(m, { Required: false });
    assert.equal(m.required, false);
  });

  test('site=optional + fieldLink=required → required', () => {
    const m = makeMeta({ required: false });
    applyFieldLinkToMetadata(m, { Required: true });
    assert.equal(m.required, true);
  });

  test('fieldLink.Required missing → keep site column value', () => {
    const m = makeMeta({ required: true });
    applyFieldLinkToMetadata(m, {});
    assert.equal(m.required, true);
  });
});

describe('applyFieldLinkToMetadata — DisplayName rebrand', () => {
  test('non-empty CT display name overrides site title', () => {
    const m = makeMeta({ displayName: 'Title' });
    applyFieldLinkToMetadata(m, { DisplayName: 'Project Name' });
    assert.equal(m.displayName, 'Project Name');
  });

  test('empty/whitespace CT display name keeps site title', () => {
    const m = makeMeta({ displayName: 'Title' });
    applyFieldLinkToMetadata(m, { DisplayName: '   ' });
    assert.equal(m.displayName, 'Title');
  });

  test('matching CT display name is a no-op', () => {
    const m = makeMeta({ displayName: 'Title' });
    applyFieldLinkToMetadata(m, { DisplayName: 'Title' });
    assert.equal(m.displayName, 'Title');
  });
});
