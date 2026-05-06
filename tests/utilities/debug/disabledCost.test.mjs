/**
 * Regression: when capture is disabled, the runtime must NOT walk caller
 * payloads. We verify by passing an object whose property getter throws if
 * read — if any redaction/truncation walked the payload, the test would
 * throw.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SPDebug } from '../../../lib/utilities/debug/index.js';

function tripwirePayload() {
  const trap = {};
  Object.defineProperty(trap, 'sensitive', {
    enumerable: true,
    get() {
      throw new Error('payload was walked while capture was disabled');
    },
  });
  return trap;
}

describe('disabled-cost: payloads are not walked when capture is off', () => {
  beforeEach(() => SPDebug.reset());

  test('SPDebug.log does not walk payload while disabled', () => {
    assert.doesNotThrow(() => SPDebug.log('m', tripwirePayload()));
  });

  test('SPDebug.info does not walk payload while disabled', () => {
    assert.doesNotThrow(() => SPDebug.info('App/X', 'm', tripwirePayload()));
  });

  test('SPDebug.warn does not walk payload while disabled', () => {
    assert.doesNotThrow(() => SPDebug.warn('App/X', 'm', tripwirePayload()));
  });

  test('SPDebug.error does not walk payload while disabled', () => {
    assert.doesNotThrow(() =>
      SPDebug.error('App/X', new Error('boom'), tripwirePayload())
    );
  });

  test('SPDebug.event does not walk payload while disabled', () => {
    assert.doesNotThrow(() => SPDebug.event('App/X', 'm', tripwirePayload()));
  });

  test('SPDebug.log walks payload normally when enabled', () => {
    SPDebug.enable();
    assert.throws(() => SPDebug.log('m', tripwirePayload()), /walked/);
  });
});
