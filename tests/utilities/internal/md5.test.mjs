import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { md5 } from '../../../lib/utilities/internal/md5.js';

describe('internal md5', () => {
  const cases = [
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
    ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
    ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'd174ab98d277d9f5a5611c2c9f419d9f'],
  ];

  for (const [input, expected] of cases) {
    test(`hashes ${JSON.stringify(input)}`, () => {
      assert.equal(md5(input), expected);
    });
  }

  test('matches Node crypto for base64-like photo content', () => {
    const value = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    assert.equal(md5(value), createHash('md5').update(value, 'utf8').digest('hex'));
  });
});
