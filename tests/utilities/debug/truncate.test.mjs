import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { prepareForCapture } from '../../../lib/utilities/debug/index.js';

const NO_REDACT = { urls: 'none', userDisplayNames: false };

describe('truncation — strings', () => {
  test('strings longer than 4KB get truncated with marker', () => {
    const huge = 'a'.repeat(8 * 1024);
    const result = prepareForCapture(huge, NO_REDACT, 64 * 1024);
    assert.ok(result.truncated);
    assert.match(result.value, /\[truncated \d+ chars\]$/);
    // Head ~ 4096 chars + marker.
    assert.ok(result.value.length < 4500);
  });

  test('strings under 4KB pass through unchanged', () => {
    const s = 'hello world';
    const result = prepareForCapture(s, NO_REDACT, 64 * 1024);
    assert.equal(result.value, s);
    assert.equal(result.truncated, false);
  });
});

describe('truncation — arrays', () => {
  test('arrays larger than head limit get summary marker', () => {
    const arr = new Array(250).fill(0).map((_, i) => i);
    const result = prepareForCapture(arr, NO_REDACT, 64 * 1024);
    assert.ok(result.truncated);
    assert.equal(result.value.length, 101); // 100 head + 1 summary
    assert.match(result.value[100], /\.\.\. 150 more items/);
  });

  test('small arrays pass through', () => {
    const arr = [1, 2, 3];
    const result = prepareForCapture(arr, NO_REDACT, 64 * 1024);
    assert.deepEqual(result.value, [1, 2, 3]);
    assert.equal(result.truncated, false);
  });
});

describe('truncation — objects', () => {
  test('objects with more than head-keys get summary marker', () => {
    const obj = {};
    for (let i = 0; i < 100; i += 1) obj['k' + i] = i;
    const result = prepareForCapture(obj, NO_REDACT, 64 * 1024);
    assert.ok(result.truncated);
    assert.ok('…' in result.value);
    assert.match(result.value['…'], /50 more keys/);
  });
});

describe('truncation — circular references', () => {
  test('circular self-reference becomes [Circular] without crashing', () => {
    const a = { foo: 'bar' };
    a.self = a;
    let result;
    assert.doesNotThrow(() => {
      result = prepareForCapture(a, NO_REDACT, 64 * 1024);
    });
    assert.equal(result.value.foo, 'bar');
    assert.equal(result.value.self, '[Circular]');
  });

  test('mutual circular reference does not crash', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };
    a.b = b;
    b.a = a;
    let result;
    assert.doesNotThrow(() => {
      result = prepareForCapture(a, NO_REDACT, 64 * 1024);
    });
    assert.equal(result.value.name, 'a');
    assert.equal(result.value.b.name, 'b');
    assert.equal(result.value.b.a, '[Circular]');
  });
});

describe('truncation — non-serializable values', () => {
  test('functions become [Function name]', () => {
    function helper() {}
    const result = prepareForCapture({ fn: helper }, NO_REDACT, 64 * 1024);
    assert.equal(result.value.fn, '[Function helper]');
  });

  test('anonymous functions become [Function]', () => {
    const result = prepareForCapture({ fn: () => 1 }, NO_REDACT, 64 * 1024);
    // Arrow functions sometimes get an inferred name — accept either form.
    assert.match(result.value.fn, /^\[Function( .*)?\]$/);
  });

  test('DOM-node-shaped objects are summarized', () => {
    const fakeNode = {
      nodeType: 1,
      nodeName: 'DIV',
      tagName: 'DIV',
      id: 'main',
      className: 'app container',
    };
    const result = prepareForCapture(fakeNode, NO_REDACT, 64 * 1024);
    assert.equal(result.value, '[HTMLElement div#main.app.container]');
  });

  test('Errors are normalized to { name, message, stack }', () => {
    const err = new Error('boom');
    const result = prepareForCapture(err, NO_REDACT, 64 * 1024);
    assert.equal(result.value.name, 'Error');
    assert.equal(result.value.message, 'boom');
    assert.ok(typeof result.value.stack === 'string');
  });

  test('Errors nested inside objects are normalized too', () => {
    const err = new Error('boom');
    const result = prepareForCapture({ err, status: 'fail' }, NO_REDACT, 64 * 1024);
    assert.equal(result.value.err.name, 'Error');
    assert.equal(result.value.err.message, 'boom');
    assert.equal(result.value.status, 'fail');
  });

  test('bigint, symbol survive without crashing', () => {
    const result = prepareForCapture(
      { big: 12345678901234567890n, sym: Symbol('s') },
      NO_REDACT,
      64 * 1024
    );
    assert.equal(typeof result.value.big, 'string');
    assert.match(result.value.sym, /^Symbol\(/);
  });
});

describe('truncation — overall byte cap', () => {
  test('payload exceeding maxPayloadBytes after structural truncation gets a top-level marker', () => {
    // Build many medium-sized strings so per-element truncation alone can't fit.
    const arr = [];
    for (let i = 0; i < 90; i += 1) arr.push('m'.repeat(2000));
    const result = prepareForCapture(arr, NO_REDACT, 1024);
    assert.ok(result.truncated);
    assert.equal(typeof result.value, 'string');
    assert.match(result.value, /^\[truncated: payload exceeded 1024 bytes/);
  });
});
