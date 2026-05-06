import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SPDebug, debugStore } from '../../../lib/utilities/debug/index.js';
import { SimpleLogger } from '../../../lib/utilities/context/modules/logger.js';

const baseLoggerConfig = {
  level: 0,
  componentName: 'Toolkit/MyWebPart',
  environment: 'dev',
  correlationId: 'corr-1',
  enableConsole: false,
};

function makeLogger(overrides) {
  return new SimpleLogger({ ...baseLoggerConfig, ...overrides });
}

describe('SPDebug.attachLogger', () => {
  beforeEach(() => SPDebug.reset());

  test('replays existing entries before subscribing for new ones', () => {
    const logger = makeLogger();
    logger.info('pre-1');
    logger.info('pre-2');

    SPDebug.enable();
    SPDebug.attachLogger(logger);

    logger.info('post-1');

    const entries = debugStore.getState().entries;
    const messages = entries.map((e) => e.message);
    assert.deepEqual(messages, ['pre-1', 'pre-2', 'post-1']);
  });

  test('does NOT capture when SPDebug is disabled', () => {
    const logger = makeLogger();
    logger.info('pre');

    // Capture is disabled at attach time.
    SPDebug.attachLogger(logger);
    logger.info('post');

    assert.equal(debugStore.getState().entries.length, 0);
  });

  test('captures live entries after attach when enabled', () => {
    const logger = makeLogger();
    SPDebug.enable();
    SPDebug.attachLogger(logger);
    logger.info('a');
    logger.warn('b');
    const entries = debugStore.getState().entries;
    assert.equal(entries.length, 2);
    assert.equal(entries[1].level, 'warn');
  });

  test('unsubscribe stops further capture', () => {
    const logger = makeLogger();
    SPDebug.enable();
    const detach = SPDebug.attachLogger(logger);
    logger.info('first');
    detach();
    logger.info('second');
    const messages = debugStore.getState().entries.map((e) => e.message);
    assert.deepEqual(messages, ['first']);
  });

  test('source defaults to logger component when no override', () => {
    const logger = makeLogger({ componentName: 'Toolkit/SPDynamicForm' });
    SPDebug.enable();
    SPDebug.attachLogger(logger);
    logger.info('hi');
    const entry = debugStore.getState().entries[0];
    assert.equal(entry.source, 'Toolkit/SPDynamicForm');
  });

  test('source override from attach options is respected', () => {
    const logger = makeLogger();
    SPDebug.enable();
    SPDebug.attachLogger(logger, { source: 'Site/hr', meta: { siteAlias: 'hr' } });
    logger.info('hi');
    const entry = debugStore.getState().entries[0];
    assert.equal(entry.source, 'Site/hr');
    assert.equal(entry.meta?.siteAlias, 'hr');
  });

  test('attaching a logger without addSink does not throw', () => {
    const fakeLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      success: () => {},
      startTimer: () => () => 0,
    };
    assert.doesNotThrow(() => SPDebug.attachLogger(fakeLogger));
  });
});
