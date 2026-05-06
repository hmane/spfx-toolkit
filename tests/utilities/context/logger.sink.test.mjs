import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { SimpleLogger } from '../../../lib/utilities/context/modules/logger.js';

const baseConfig = {
  level: 0,
  componentName: 'TestComponent',
  environment: 'dev',
  correlationId: 'test-correlation',
  enableConsole: false,
};

function makeLogger(overrides) {
  return new SimpleLogger({ ...baseConfig, ...overrides });
}

describe('SimpleLogger.addSink', () => {
  test('sink receives new log entries', () => {
    const logger = makeLogger();
    const received = [];

    logger.addSink(entry => received.push(entry));

    logger.info('hello');
    logger.warn('there');

    assert.equal(received.length, 2);
    assert.equal(received[0].message, 'hello');
    assert.equal(received[1].message, 'there');
    assert.equal(received[0].component, 'TestComponent');
  });

  test('unsubscribe stops further delivery', () => {
    const logger = makeLogger();
    const received = [];

    const unsubscribe = logger.addSink(entry => received.push(entry));
    logger.info('first');
    unsubscribe();
    logger.info('second');

    assert.equal(received.length, 1);
    assert.equal(received[0].message, 'first');
  });

  test('sink exception is isolated and does not break logging or other sinks', () => {
    const logger = makeLogger();
    const received = [];

    logger.addSink(() => {
      throw new Error('boom');
    });
    logger.addSink(entry => received.push(entry));

    assert.doesNotThrow(() => logger.info('survives'));
    assert.equal(received.length, 1);
    assert.equal(received[0].message, 'survives');
  });

  test('replay: true delivers existing entries before new ones, atomically', () => {
    const logger = makeLogger();
    logger.info('pre-1');
    logger.info('pre-2');

    const received = [];
    logger.addSink(entry => received.push(entry.message), { replay: true });

    logger.info('post-1');

    assert.deepEqual(received, ['pre-1', 'pre-2', 'post-1']);
  });

  test('replay: true with no prior entries still delivers new entries', () => {
    const logger = makeLogger();
    const received = [];

    logger.addSink(entry => received.push(entry.message), { replay: true });
    logger.info('only');

    assert.deepEqual(received, ['only']);
  });

  test('replay: false (default) does not deliver pre-existing entries', () => {
    const logger = makeLogger();
    logger.info('pre');

    const received = [];
    logger.addSink(entry => received.push(entry.message));
    logger.info('post');

    assert.deepEqual(received, ['post']);
  });

  test('multiple sinks all receive the same entry', () => {
    const logger = makeLogger();
    const a = [];
    const b = [];

    logger.addSink(e => a.push(e.message));
    logger.addSink(e => b.push(e.message));

    logger.info('shared');

    assert.deepEqual(a, ['shared']);
    assert.deepEqual(b, ['shared']);
  });
});
