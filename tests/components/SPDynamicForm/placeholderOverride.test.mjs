/**
 * SPDynamicForm — `IFieldOverride.placeholder` wiring.
 *
 * Regression: `placeholder` was declared in the public `IFieldOverride` type
 * but never resolved by `applyFieldOverrides` nor surfaced by `buildFieldProps`,
 * so it was a dead prop for every field type (taxonomy, user, text, lookup, …).
 * These tests lock in that:
 *   - a static-string `placeholder` lands on `field.placeholder` and on
 *     `buildFieldProps(...).placeholder`
 *   - a function-form `placeholder` (LabelTransform) is evaluated against the
 *     override context
 *   - no override → `field.placeholder` stays undefined and props.placeholder
 *     is undefined (no accidental empty-string placeholder)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyFieldOverrides,
  buildFieldProps,
} from '../../../lib/components/SPDynamicForm/utilities/fieldConfigBuilder.js';

function makeField(overrides = {}) {
  return {
    internalName: 'Topic',
    displayName: 'Topic',
    fieldType: 'TaxonomyFieldType',
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

const ctx = (field) => ({ field, formValues: {}, mode: 'edit' });

describe('placeholder override — applyFieldOverrides', () => {
  test('static string placeholder lands on field.placeholder', () => {
    const [f] = applyFieldOverrides(
      [makeField()],
      [{ field: 'Topic', placeholder: 'Pick a topic…' }],
      ctx(makeField())
    );
    assert.equal(f.placeholder, 'Pick a topic…');
  });

  test('function-form placeholder is evaluated with the override context', () => {
    const [f] = applyFieldOverrides(
      [makeField()],
      [
        {
          field: 'Topic',
          placeholder: (_current, c) =>
            c.mode === 'edit' ? 'Edit the topic' : 'Set the topic',
        },
      ],
      ctx(makeField())
    );
    assert.equal(f.placeholder, 'Edit the topic');
  });

  test('function returning undefined keeps the prior value (chained overrides)', () => {
    const [f] = applyFieldOverrides(
      [makeField()],
      [
        { field: 'Topic', placeholder: 'First' },
        { field: /^Topic$/, placeholder: () => undefined },
      ],
      ctx(makeField())
    );
    assert.equal(f.placeholder, 'First');
  });

  test('no override → field.placeholder stays undefined', () => {
    const [f] = applyFieldOverrides([makeField()], [], ctx(makeField()));
    assert.equal(f.placeholder, undefined);
  });
});

describe('placeholder override — buildFieldProps', () => {
  test('resolved field.placeholder flows into props.placeholder', () => {
    const field = makeField({ placeholder: 'Pick a topic…' });
    const props = buildFieldProps(field, 'edit', null, 'list-id', {
      field: 'Topic',
      placeholder: 'Pick a topic…',
    });
    assert.equal(props.placeholder, 'Pick a topic…');
  });

  test('static-string override alone (no applyFieldOverrides pass) still works', () => {
    // Legacy callers that never ran applyFieldOverrides — buildFieldProps falls
    // back to the static-string override.
    const props = buildFieldProps(makeField(), 'edit', null, 'list-id', {
      field: 'Topic',
      placeholder: 'Type to search',
    });
    assert.equal(props.placeholder, 'Type to search');
  });

  test('no override → props.placeholder is undefined (not empty string)', () => {
    const props = buildFieldProps(makeField(), 'edit', null, 'list-id', undefined);
    assert.equal(props.placeholder, undefined);
  });

  test('works for a text field too (not taxonomy-specific)', () => {
    const field = makeField({
      internalName: 'Title',
      displayName: 'Title',
      fieldType: 'Text',
      placeholder: 'Enter a title',
    });
    const props = buildFieldProps(field, 'new', null, 'list-id', {
      field: 'Title',
      placeholder: 'Enter a title',
    });
    assert.equal(props.placeholder, 'Enter a title');
  });
});
