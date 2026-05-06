import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { MultiSiteContextManager } from '../../../lib/utilities/context/core/multi-site-manager.js';
import { SimpleLogger } from '../../../lib/utilities/context/modules/logger.js';

const baseLoggerConfig = {
  level: 0,
  componentName: 'TestPrimary',
  environment: 'dev',
  correlationId: 'test-correlation',
  enableConsole: false,
};

function makeManager() {
  const primaryLogger = new SimpleLogger(baseLoggerConfig);
  // primaryContext is unused for the lifecycle paths under test (no PnP calls).
  const primaryContext = {};
  return new MultiSiteContextManager(primaryContext, primaryLogger);
}

function makeFakeSiteContext({
  alias = 'hr',
  siteUrl = 'https://contoso.sharepoint.com/sites/hr',
} = {}) {
  const logger = new SimpleLogger({ ...baseLoggerConfig, componentName: alias });
  return {
    sp: {},
    spCached: {},
    spPessimistic: {},
    siteUrl,
    webAbsoluteUrl: siteUrl,
    webServerRelativeUrl: '/sites/' + alias,
    webTitle: alias.toUpperCase(),
    webId: '00000000-0000-0000-0000-000000000000',
    alias,
    config: {},
    logger,
    cache: {},
  };
}

describe('MultiSiteContextManager.onSiteChange', () => {
  test('listener receives added event when site is registered', () => {
    const manager = makeManager();
    const events = [];
    manager.onSiteChange(e => events.push(e));

    const ctx = makeFakeSiteContext({ alias: 'hr' });
    // Internal notify is the unit under test: invoke it directly with shape from spec.
    manager.notifySiteChange({
      type: 'added',
      alias: ctx.alias,
      siteUrl: ctx.siteUrl,
      logger: ctx.logger,
      context: ctx,
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'added');
    assert.equal(events[0].alias, 'hr');
    assert.equal(events[0].siteUrl, ctx.siteUrl);
    assert.ok(events[0].logger);
    assert.ok(events[0].context);
  });

  test('listener receives removed event when site is removed', () => {
    const manager = makeManager();
    const ctx = makeFakeSiteContext({ alias: 'finance' });
    // Seed internal map so removeSite can find it.
    manager.siteContexts.set(ctx.siteUrl, ctx);

    const events = [];
    manager.onSiteChange(e => events.push(e));

    manager.removeSite(ctx.siteUrl);

    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'removed');
    assert.equal(events[0].alias, 'finance');
    assert.equal(events[0].siteUrl, ctx.siteUrl);
  });

  test('unsubscribe stops further events', () => {
    const manager = makeManager();
    const ctx = makeFakeSiteContext({ alias: 'a' });
    manager.siteContexts.set(ctx.siteUrl, ctx);

    const events = [];
    const unsub = manager.onSiteChange(e => events.push(e));
    unsub();

    manager.removeSite(ctx.siteUrl);
    assert.equal(events.length, 0);
  });

  test('listener exception is isolated and other listeners still receive', () => {
    const manager = makeManager();
    const ctx = makeFakeSiteContext({ alias: 'b' });
    manager.siteContexts.set(ctx.siteUrl, ctx);

    const received = [];
    manager.onSiteChange(() => {
      throw new Error('boom');
    });
    manager.onSiteChange(e => received.push(e));

    assert.doesNotThrow(() => manager.removeSite(ctx.siteUrl));
    assert.equal(received.length, 1);
    assert.equal(received[0].type, 'removed');
  });

  test('cleanup emits removed for every connected site', () => {
    const manager = makeManager();
    const a = makeFakeSiteContext({ alias: 'a', siteUrl: 'https://x/a' });
    const b = makeFakeSiteContext({ alias: 'b', siteUrl: 'https://x/b' });
    manager.siteContexts.set(a.siteUrl, a);
    manager.siteContexts.set(b.siteUrl, b);

    const events = [];
    manager.onSiteChange(e => events.push(e));

    manager.cleanup();

    assert.equal(events.length, 2);
    const aliases = events.map(e => e.alias).sort();
    assert.deepEqual(aliases, ['a', 'b']);
    assert.ok(events.every(e => e.type === 'removed'));
    // Map cleared after.
    assert.equal(manager.siteContexts.size, 0);
  });

  test('multiple listeners all receive the same event', () => {
    const manager = makeManager();
    const ctx = makeFakeSiteContext({ alias: 'c' });
    manager.siteContexts.set(ctx.siteUrl, ctx);

    const a = [];
    const b = [];
    manager.onSiteChange(e => a.push(e.type));
    manager.onSiteChange(e => b.push(e.type));

    manager.removeSite(ctx.siteUrl);
    assert.deepEqual(a, ['removed']);
    assert.deepEqual(b, ['removed']);
  });

  test('removeSite for unknown site does not emit', () => {
    const manager = makeManager();
    const events = [];
    manager.onSiteChange(e => events.push(e));

    manager.removeSite('https://contoso.sharepoint.com/sites/unknown');
    assert.equal(events.length, 0);
  });
});
