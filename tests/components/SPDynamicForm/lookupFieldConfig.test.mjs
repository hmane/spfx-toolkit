/**
 * SPDynamicForm — `ILookupFieldConfig.searchFields` / `.cacheResults` wiring.
 *
 * Regression: both were declared in the public `ILookupFieldConfig` type but
 * never forwarded to `SPLookupField` (its `dataSource.searchFields` /
 * `useCache` props go unused). `optimizeLookupField` now stamps them onto the
 * field metadata (`lookupSearchFields` / `lookupCacheResults`) and
 * `buildFieldProps` forwards them. These tests cover the `buildFieldProps`
 * half — the part that was missing — since `optimizeLookupField` needs the
 * SPFx runtime to unit-test.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { buildFieldProps } from '../../../lib/components/SPDynamicForm/utilities/fieldConfigBuilder.js';

function makeLookupField(overrides = {}) {
  return {
    internalName: 'Customer',
    displayName: 'Customer',
    fieldType: 'Lookup',
    required: false,
    readOnly: false,
    hidden: false,
    description: '',
    defaultValue: undefined,
    group: '_Default',
    order: 0,
    fieldConfig: { lookupListId: 'list-guid', lookupField: 'Title' },
    isLookup: true,
    lookupListId: 'list-guid',
    ...overrides,
  };
}

describe('lookupFieldConfig — buildFieldProps forwarding', () => {
  test('lookupSearchFields → dataSource.searchFields', () => {
    const field = makeLookupField({ lookupSearchFields: ['Title', 'Email', 'Code'] });
    const props = buildFieldProps(field, 'edit', null, 'list-id', undefined);
    assert.deepEqual(props.dataSource.searchFields, ['Title', 'Email', 'Code']);
  });

  test('lookupCacheResults=false → useCache=false', () => {
    const field = makeLookupField({ lookupCacheResults: false });
    const props = buildFieldProps(field, 'edit', null, 'list-id', undefined);
    assert.equal(props.useCache, false);
  });

  test('lookupCacheResults=true → useCache=true', () => {
    const field = makeLookupField({ lookupCacheResults: true });
    const props = buildFieldProps(field, 'edit', null, 'list-id', undefined);
    assert.equal(props.useCache, true);
  });

  test('no config → no searchFields, useCache untouched (component default applies)', () => {
    const props = buildFieldProps(makeLookupField(), 'edit', null, 'list-id', undefined);
    assert.equal('searchFields' in props.dataSource, false);
    assert.equal('useCache' in props, false);
  });

  test('empty searchFields array → not forwarded', () => {
    const field = makeLookupField({ lookupSearchFields: [] });
    const props = buildFieldProps(field, 'edit', null, 'list-id', undefined);
    assert.equal('searchFields' in props.dataSource, false);
  });

  test('LookupMulti also forwards the config', () => {
    const field = makeLookupField({
      fieldType: 'LookupMulti',
      lookupSearchFields: ['Title'],
      lookupCacheResults: false,
    });
    const props = buildFieldProps(field, 'edit', null, 'list-id', undefined);
    assert.deepEqual(props.dataSource.searchFields, ['Title']);
    assert.equal(props.useCache, false);
    assert.equal(props.allowMultiple, true);
  });
});
