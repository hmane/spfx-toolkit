import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  shouldCommitRadioGroupValueChange,
  usesSimpleRadioOptions,
} from '../../../lib/components/spForm/DevExtremeControls/DevExtremeRadioGroup.js';
import {
  isDevExtremeUserValueChange,
} from '../../../lib/components/spForm/DevExtremeControls/validation.js';

describe('DevExtremeRadioGroup option binding helpers', () => {
  test('detects the documented simple { text, value } items shape', () => {
    assert.equal(
      usesSimpleRadioOptions([
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ]),
      true
    );
  });

  test('does not force valueExpr/displayExpr defaults for custom dataSource binding', () => {
    assert.equal(
      usesSimpleRadioOptions(
        [
          { text: 'Active', value: 'active' },
        ],
        [
          { label: 'Active', id: 'active' },
        ]
      ),
      false
    );
  });
});

describe('shouldCommitRadioGroupValueChange', () => {
  test('commits changed user-triggered radio selections', () => {
    assert.equal(shouldCommitRadioGroupValueChange('active', 'inactive', true), true);
  });

  test('ignores unchanged user-triggered radio selections', () => {
    assert.equal(shouldCommitRadioGroupValueChange('active', 'active', true), false);
  });

  test('ignores DevExtreme programmatic sync events from sibling re-renders', () => {
    assert.equal(shouldCommitRadioGroupValueChange('active', undefined, false), false);
    assert.equal(shouldCommitRadioGroupValueChange('active', { text: 'Active', value: 'active' }, false), false);
  });
});

describe('isDevExtremeUserValueChange', () => {
  test('distinguishes user events from DevExtreme option synchronization', () => {
    assert.equal(isDevExtremeUserValueChange({ event: { type: 'click' } }), true);
    assert.equal(isDevExtremeUserValueChange({}), false);
    assert.equal(isDevExtremeUserValueChange(undefined), false);
  });
});
