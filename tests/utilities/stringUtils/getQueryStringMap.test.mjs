/**
 * Tests for StringUtils.getQueryStringMap
 *
 * Critical bug: the old implementation split on '=' and required exactly 2
 * parts, so any value containing '=' (e.g. redirect URLs, base64, SAML tokens)
 * was silently DROPPED.  Also dropped params with empty values (flag=).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { StringUtils } = require('../../../lib/utilities/stringUtils/stringExtensions.js');

const { getQueryStringMap } = StringUtils;

describe('StringUtils.getQueryStringMap', () => {
  test('simple two-param query string still works', () => {
    const result = getQueryStringMap('param1=value1&param2=value2');
    assert.deepEqual(result, { param1: 'value1', param2: 'value2' });
  });

  test('accepts leading ? and strips it', () => {
    const result = getQueryStringMap('?id=123&name=test');
    assert.deepEqual(result, { id: '123', name: 'test' });
  });

  test('value containing = (redirect URL) is preserved — was dropped before fix', () => {
    const result = getQueryStringMap('redirect=https://x/?a=1&b=2');
    assert.deepEqual(result, { redirect: 'https://x/?a=1', b: '2' });
  });

  test('value with multiple = chars is fully preserved', () => {
    const result = getQueryStringMap('token=abc=def=ghi&other=val');
    assert.deepEqual(result, { token: 'abc=def=ghi', other: 'val' });
  });

  test('empty value (flag=) is included as empty string — was dropped before fix', () => {
    const result = getQueryStringMap('flag=');
    assert.deepEqual(result, { flag: '' });
  });

  test('empty value alongside other params', () => {
    const result = getQueryStringMap('a=1&empty=&b=2');
    assert.deepEqual(result, { a: '1', empty: '', b: '2' });
  });

  test('URL-encoded characters are decoded in both key and value', () => {
    const result = getQueryStringMap('my%20key=hello%20world');
    assert.deepEqual(result, { 'my key': 'hello world' });
  });

  test('params without = are ignored (no key, no value)', () => {
    const result = getQueryStringMap('noequalssign&key=val');
    assert.deepEqual(result, { key: 'val' });
  });

  test('empty query string returns empty object', () => {
    assert.deepEqual(getQueryStringMap(''), {});
    assert.deepEqual(getQueryStringMap('?'), {});
  });

  // I1 regression: full-URL input must strip everything before (and including) '?'
  test('full URL with query string extracts params correctly', () => {
    const result = getQueryStringMap('https://site.com/page?a=1&b=2');
    assert.deepEqual(result, { a: '1', b: '2' });
  });

  test('full URL with redirect param containing its own "?" is fully preserved', () => {
    const result = getQueryStringMap('https://site.com/page?redirect=https://x.com/?z=9&b=2');
    assert.deepEqual(result, { redirect: 'https://x.com/?z=9', b: '2' });
  });

  test('full URL with no query string returns empty object', () => {
    const result = getQueryStringMap('https://site.com/page');
    assert.deepEqual(result, {});
  });
});
