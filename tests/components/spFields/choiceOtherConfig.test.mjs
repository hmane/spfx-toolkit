import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { shouldCollectOtherValue } from '../../../lib/components/spFields/SPChoiceField/utils/otherConfig.js';

describe('SPChoiceField otherConfig.collectOtherValue', () => {
  test('keeps existing custom Other behavior by default', () => {
    assert.equal(shouldCollectOtherValue(), true);
    assert.equal(shouldCollectOtherValue({}), true);
    assert.equal(shouldCollectOtherValue({ collectOtherValue: true }), true);
  });

  test('can treat Other as a literal choice instead of a custom-value trigger', () => {
    assert.equal(shouldCollectOtherValue({ collectOtherValue: false }), false);
  });
});
