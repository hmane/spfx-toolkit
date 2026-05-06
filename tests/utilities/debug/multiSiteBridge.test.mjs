import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SPDebug,
  debugStore,
  attachMultiSiteToStore,
} from '../../../lib/utilities/debug/index.js';
import { MultiSiteContextManager } from '../../../lib/utilities/context/core/multi-site-manager.js';
import { SimpleLogger } from '../../../lib/utilities/context/modules/logger.js';

const baseLoggerConfig = {
  level: 0,
  componentName: 'Primary',
  environment: 'dev',
  correlationId: 'corr-1',
  enableConsole: false,
};

function makeManager() {
  const primaryLogger = new SimpleLogger(baseLoggerConfig);
  return new MultiSiteContextManager({}, primaryLogger);
}

function makeFakeSiteContext({ alias, siteUrl }) {
  const logger = new SimpleLogger({
    ...baseLoggerConfig,
    componentName: alias || 'Site',
  });
  return {
    sp: {},
    spCached: {},
    spPessimistic: {},
    siteUrl,
    webAbsoluteUrl: siteUrl,
    webServerRelativeUrl: '/',
    webTitle: alias?.toUpperCase() || 'Site',
    webId: '00000000-0000-0000-0000-000000000000',
    alias,
    config: {},
    logger,
    cache: {},
  };
}

function makeApi(manager) {
  return {
    list: () => manager.listSites(),
    get: (urlOrAlias) => manager.getSite(urlOrAlias),
    onSiteChange: (listener) => manager.onSiteChange(listener),
  };
}

describe('attachMultiSiteToStore', () => {
  beforeEach(() => SPDebug.reset());

  test('attaches loggers for all currently connected sites', () => {
    const manager = makeManager();
    const hr = makeFakeSiteContext({ alias: 'hr', siteUrl: 'https://x/hr' });
    const fin = makeFakeSiteContext({ alias: 'finance', siteUrl: 'https://x/finance' });
    manager.siteContexts.set(hr.siteUrl, hr);
    manager.siteContexts.set(fin.siteUrl, fin);

    SPDebug.enable();
    const detach = attachMultiSiteToStore(makeApi(manager));

    hr.logger.info('hr msg');
    fin.logger.info('finance msg');

    const sources = debugStore.getState().entries.map((e) => e.source).sort();
    assert.deepEqual(sources, ['Site/finance', 'Site/hr']);

    detach();
  });

  test('site entries carry siteAlias and siteUrl metadata', () => {
    const manager = makeManager();
    const hr = makeFakeSiteContext({ alias: 'hr', siteUrl: 'https://x/hr' });
    manager.siteContexts.set(hr.siteUrl, hr);

    SPDebug.enable();
    const detach = attachMultiSiteToStore(makeApi(manager));
    hr.logger.info('hi');

    const entry = debugStore.getState().entries[0];
    assert.equal(entry.meta?.siteAlias, 'hr');
    assert.equal(entry.meta?.siteUrl, 'https://x/hr');

    detach();
  });

  test('attaches logger for sites added after initial attach', () => {
    const manager = makeManager();

    SPDebug.enable();
    const detach = attachMultiSiteToStore(makeApi(manager));

    const future = makeFakeSiteContext({ alias: 'future', siteUrl: 'https://x/future' });
    manager.siteContexts.set(future.siteUrl, future);
    manager.notifySiteChange({
      type: 'added',
      alias: future.alias,
      siteUrl: future.siteUrl,
      logger: future.logger,
      context: future,
    });

    future.logger.info('hi from future');

    const entry = debugStore.getState().entries[0];
    assert.equal(entry.source, 'Site/future');

    detach();
  });

  test('detaches logger when site is removed', () => {
    const manager = makeManager();
    const hr = makeFakeSiteContext({ alias: 'hr', siteUrl: 'https://x/hr' });
    manager.siteContexts.set(hr.siteUrl, hr);

    SPDebug.enable();
    const detach = attachMultiSiteToStore(makeApi(manager));

    hr.logger.info('first');
    manager.removeSite(hr.siteUrl);
    hr.logger.info('after removal');

    const messages = debugStore.getState().entries.map((e) => e.message);
    assert.deepEqual(messages, ['first']);

    detach();
  });

  test('cleanup detaches all sinks', () => {
    const manager = makeManager();
    const hr = makeFakeSiteContext({ alias: 'hr', siteUrl: 'https://x/hr' });
    manager.siteContexts.set(hr.siteUrl, hr);

    SPDebug.enable();
    const detach = attachMultiSiteToStore(makeApi(manager));
    hr.logger.info('first');
    detach();
    hr.logger.info('after detach');

    const messages = debugStore.getState().entries.map((e) => e.message);
    assert.deepEqual(messages, ['first']);
  });

  test('uses URL-derived source when alias is missing', () => {
    const manager = makeManager();
    const noAlias = makeFakeSiteContext({
      alias: undefined,
      siteUrl: 'https://contoso.sharepoint.com/sites/projects',
    });
    manager.siteContexts.set(noAlias.siteUrl, noAlias);

    SPDebug.enable();
    const detach = attachMultiSiteToStore(makeApi(manager));
    noAlias.logger.info('hi');

    const entry = debugStore.getState().entries[0];
    // Last URL segment is `projects`.
    assert.equal(entry.source, 'Site/projects');

    detach();
  });
});
