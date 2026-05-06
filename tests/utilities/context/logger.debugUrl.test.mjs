import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { SimpleLogger } from '../../../lib/utilities/context/modules/logger.js';

const baseConfig = {
  level: 0,
  componentName: 'TestComponent',
  environment: 'dev',
  correlationId: 'test-correlation',
  enableConsole: false,
};

let originalWindow;

function setWindowSearch(search) {
  globalThis.window = { location: { search } };
}

beforeEach(() => {
  originalWindow = globalThis.window;
});

afterEach(() => {
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

describe('SimpleLogger debug URL maxEntries bump', () => {
  test('bumps default maxEntries to 1000 when ?isDebug=true', () => {
    setWindowSearch('?isDebug=true');
    const logger = new SimpleLogger({ ...baseConfig });

    for (let i = 0; i < 250; i++) logger.info(`msg-${i}`);

    assert.equal(logger.getEntries().length, 250);
  });

  test('also recognizes ?isDebug=1', () => {
    setWindowSearch('?isDebug=1');
    const logger = new SimpleLogger({ ...baseConfig });
    for (let i = 0; i < 150; i++) logger.info(`msg-${i}`);
    assert.equal(logger.getEntries().length, 150);
  });

  test('also recognizes ?debug=true', () => {
    setWindowSearch('?debug=true');
    const logger = new SimpleLogger({ ...baseConfig });
    for (let i = 0; i < 150; i++) logger.info(`msg-${i}`);
    assert.equal(logger.getEntries().length, 150);
  });

  test('also recognizes ?debug=1 anywhere in querystring', () => {
    setWindowSearch('?other=foo&debug=1');
    const logger = new SimpleLogger({ ...baseConfig });
    for (let i = 0; i < 150; i++) logger.info(`msg-${i}`);
    assert.equal(logger.getEntries().length, 150);
  });

  test('does NOT bump for arbitrary debug-like params', () => {
    setWindowSearch('?debugMode=true');
    const logger = new SimpleLogger({ ...baseConfig });
    for (let i = 0; i < 250; i++) logger.info(`msg-${i}`);
    // Stays at default 100 cap.
    assert.equal(logger.getEntries().length, 100);
  });

  test('does NOT bump when no window is present', () => {
    delete globalThis.window;
    const logger = new SimpleLogger({ ...baseConfig });
    for (let i = 0; i < 250; i++) logger.info(`msg-${i}`);
    assert.equal(logger.getEntries().length, 100);
  });

  test('explicit maxEntries config is respected over the URL bump', () => {
    setWindowSearch('?isDebug=true');
    const logger = new SimpleLogger({ ...baseConfig, maxEntries: 50 });
    for (let i = 0; i < 100; i++) logger.info(`msg-${i}`);
    assert.equal(logger.getEntries().length, 50);
  });

  test('case-insensitive on flag values', () => {
    setWindowSearch('?isDebug=TRUE');
    const logger = new SimpleLogger({ ...baseConfig });
    for (let i = 0; i < 150; i++) logger.info(`msg-${i}`);
    assert.equal(logger.getEntries().length, 150);
  });
});
