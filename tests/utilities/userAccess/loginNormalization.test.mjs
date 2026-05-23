import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeLoginForCacheKey } from '../../../lib/utilities/userAccess/loginNormalization.js';

describe('normalizeLoginForCacheKey', () => {
  test('lowercases and trims plain email', () => {
    assert.equal(
      normalizeLoginForCacheKey('  Alice@Contoso.com  '),
      'alice@contoso.com'
    );
  });

  test('preserves claim format but lowercases', () => {
    assert.equal(
      normalizeLoginForCacheKey('i:0#.f|membership|Alice@Contoso.com'),
      'i:0#.f|membership|alice@contoso.com'
    );
  });

  test('returns "current" sentinel unchanged', () => {
    assert.equal(normalizeLoginForCacheKey('current'), 'current');
  });

  test('throws on empty string', () => {
    assert.throws(() => normalizeLoginForCacheKey(''), /empty login/i);
  });

  test('throws on null/undefined', () => {
    // @ts-expect-error testing runtime guard
    assert.throws(() => normalizeLoginForCacheKey(null), /invalid login/i);
    // @ts-expect-error testing runtime guard
    assert.throws(() => normalizeLoginForCacheKey(undefined), /invalid login/i);
  });
});
