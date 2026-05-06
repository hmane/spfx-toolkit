import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SPDebug, debugStore } from '../../../lib/utilities/debug/index.js';

describe('SPDebug facade — base runtime', () => {
  beforeEach(() => SPDebug.reset());

  test('starts disabled', () => {
    assert.equal(SPDebug.isCaptureEnabled(), false);
    assert.equal(SPDebug.isPanelVisible(), false);
  });

  test('enable()/disable() flip captureEnabled (non-prod)', () => {
    SPDebug.enable();
    assert.equal(SPDebug.isCaptureEnabled(), true);
    SPDebug.disable();
    assert.equal(SPDebug.isCaptureEnabled(), false);
  });

  test('log/info/warn/error/event are no-ops while disabled', () => {
    SPDebug.log('m1');
    SPDebug.info('App/X', 'm2');
    SPDebug.warn('App/X', 'm3');
    SPDebug.error('App/X', new Error('m4'));
    SPDebug.event('App/X', 'm5');
    assert.equal(debugStore.getState().entries.length, 0);
  });

  test('log/info/warn/error/event do not walk payloads while disabled', () => {
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      redact: {
        custom: () => {
          throw new Error('custom redaction should not run while disabled');
        },
      },
    });

    SPDebug.log('m1', { email: 'alice@example.com' });
    SPDebug.info('App/X', 'm2', { email: 'alice@example.com' });
    SPDebug.warn('App/X', 'm3', { email: 'alice@example.com' });
    SPDebug.error('App/X', new Error('m4'), { email: 'alice@example.com' });
    SPDebug.event('App/X', 'm5', { email: 'alice@example.com' });

    assert.equal(debugStore.getState().entries.length, 0);
  });

  test('log/info/warn/error/event capture entries when enabled', () => {
    SPDebug.enable();
    SPDebug.log('m1');
    SPDebug.info('App/X', 'm2', { k: 1 });
    SPDebug.warn('App/X', 'm3');
    SPDebug.error('App/X', new Error('boom'));
    SPDebug.event('App/X', 'm5', { y: true });

    const entries = debugStore.getState().entries;
    assert.equal(entries.length, 5);
    assert.equal(entries[0].source, 'App'); // default for log()
    assert.equal(entries[1].source, 'App/X');
    assert.equal(entries[2].level, 'warn');
    assert.equal(entries[3].type, 'error');
    assert.equal(entries[3].level, 'error');
    assert.equal(entries[4].type, 'event');
  });

  test('panel visibility toggles independently of capture', () => {
    SPDebug.showPanel();
    assert.equal(SPDebug.isPanelVisible(), true);
    assert.equal(SPDebug.isCaptureEnabled(), false);
    SPDebug.hidePanel();
    assert.equal(SPDebug.isPanelVisible(), false);
  });

  test('togglePanel toggles panelVisible', () => {
    SPDebug.togglePanel();
    assert.equal(SPDebug.isPanelVisible(), true);
    SPDebug.togglePanel();
    assert.equal(SPDebug.isPanelVisible(), false);
  });

  test('toggleCapture flips captureEnabled (non-prod)', () => {
    SPDebug.toggleCapture();
    assert.equal(SPDebug.isCaptureEnabled(), true);
    SPDebug.toggleCapture();
    assert.equal(SPDebug.isCaptureEnabled(), false);
  });

  test('reset() clears entries and resets state', () => {
    SPDebug.enable();
    SPDebug.log('keep');
    SPDebug.log('keep2');
    assert.equal(debugStore.getState().entries.length, 2);

    SPDebug.reset();
    assert.equal(SPDebug.isCaptureEnabled(), false);
    assert.equal(debugStore.getState().entries.length, 0);
  });

  test('session.start creates an active session with given label', () => {
    const session = SPDebug.session.start({ label: 'User reported X' });
    assert.equal(session.label, 'User reported X');
    assert.equal(session.endedAt, null);
    assert.equal(SPDebug.session.current()?.id, session.id);
  });

  test('session.start auto-ends prior active session (end-and-replace)', () => {
    const a = SPDebug.session.start({ label: 'first' });
    const b = SPDebug.session.start({ label: 'second' });
    assert.notEqual(a.id, b.id);
    const current = SPDebug.session.current();
    assert.equal(current?.label, 'second');
    // Prior session should be in history with endedAt populated.
    const history = debugStore.getState().sessionHistory;
    assert.equal(history.length, 1);
    assert.equal(history[0].id, a.id);
    assert.ok(history[0].endedAt !== null);
  });

  test('session.stop closes the active session and stores the note', () => {
    SPDebug.session.start({ label: 'x' });
    const stopped = SPDebug.session.stop({ note: 'broke at step 2' });
    assert.ok(stopped);
    assert.equal(stopped.note, 'broke at step 2');
    assert.ok(stopped.endedAt !== null);
    assert.equal(SPDebug.session.current(), null);
  });

  test('session.stop without active session returns null', () => {
    const stopped = SPDebug.session.stop({ note: 'x' });
    assert.equal(stopped, null);
  });
});

describe('SPDebug production gating (programmatic)', () => {
  beforeEach(() => SPDebug.reset());

  test('SPDebug.enable() is ignored when env=prod and gates are false', () => {
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      environment: 'prod',
      allowInProduction: false,
      allowProgrammaticInProduction: false,
    });
    SPDebug.enable();
    assert.equal(SPDebug.isCaptureEnabled(), false);
  });

  test('SPDebug.enable() is ignored when provider config has enabled=false', () => {
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      enabled: false,
      environment: 'dev',
      allowInProduction: true,
      allowProgrammaticInProduction: true,
    });
    SPDebug.enable();
    assert.equal(SPDebug.isCaptureEnabled(), false);
  });

  test('SPDebug.toggleCapture() is ignored when provider config has enabled=false', () => {
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      enabled: false,
      environment: 'dev',
      allowInProduction: true,
      allowProgrammaticInProduction: true,
    });
    SPDebug.toggleCapture();
    assert.equal(SPDebug.isCaptureEnabled(), false);
  });

  test('SPDebug.enable() works in prod when allowProgrammaticInProduction=true', () => {
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      environment: 'prod',
      allowInProduction: false,
      allowProgrammaticInProduction: true,
    });
    SPDebug.enable();
    assert.equal(SPDebug.isCaptureEnabled(), true);
  });

  test('SPDebug.enable() works in prod when allowInProduction=true', () => {
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      environment: 'prod',
      allowInProduction: true,
      allowProgrammaticInProduction: false,
    });
    SPDebug.enable();
    assert.equal(SPDebug.isCaptureEnabled(), true);
  });
});
