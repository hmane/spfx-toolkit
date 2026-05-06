/**
 * Phase 4: trace lifecycle, status escalation, abandoned/corrupted, unknown
 * no-op behavior, traceId vs correlationId semantics, primitive guard.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SPDebug,
  debugStore,
} from '../../../lib/utilities/debug/index.js';

let originalConsoleWarn;
let warnings;

beforeEach(() => {
  SPDebug.reset();
  warnings = [];
  originalConsoleWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
});

afterEach(() => {
  console.warn = originalConsoleWarn;
});

describe('Trace lifecycle', () => {
  test('startTrace registers a running trace and returns a handle', () => {
    SPDebug.enable();
    const handle = SPDebug.startTrace('Save', { correlationId: 42 });
    assert.match(handle.traceId, /^tr_/);
    assert.equal(handle.name, 'Save');
    assert.equal(handle.correlationId, 42);
    const t = debugStore.getState().traces.get(handle.traceId);
    assert.ok(t);
    assert.equal(t.status, 'running');
    assert.equal(t.endedAt, null);
  });

  test('handle.step appends steps with prepared data', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('Save');
    h.step('validated', { fields: 5, Email: 'a@b.com' });
    const t = debugStore.getState().traces.get(h.traceId);
    assert.equal(t.steps.length, 1);
    assert.equal(t.steps[0].label, 'validated');
    assert.equal(t.steps[0].data.fields, 5);
    assert.equal(t.steps[0].data.Email, 'a@b.com');
  });

  test('warning step escalates running trace status to warning', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('Save');
    h.step('a');
    h.step('soft fail', { status: 'warning' });
    const t = debugStore.getState().traces.get(h.traceId);
    assert.equal(t.status, 'warning');
  });

  test('endTrace derives terminal status from worst-step-seen', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('Save');
    h.step('ok');
    h.step('soft fail', { status: 'warning' });
    h.end();
    const t = debugStore.getState().traces.get(h.traceId);
    assert.equal(t.status, 'warning');
    assert.ok(t.endedAt !== null);
  });

  test('endTrace with explicit status overrides derivation', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('Save');
    h.step('warn step', { status: 'warning' });
    h.end();
    SPDebug.endTrace(h.traceId, { status: 'error' }); // already ended; no-op
    const t = debugStore.getState().traces.get(h.traceId);
    assert.equal(t.status, 'warning');

    const h2 = SPDebug.startTrace('Save');
    SPDebug.endTrace(h2.traceId, { status: 'error' });
    const t2 = debugStore.getState().traces.get(h2.traceId);
    assert.equal(t2.status, 'error');
  });

  test('handle.fail records an error step and ends the trace as error', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('Save');
    h.fail(new Error('boom'));
    const t = debugStore.getState().traces.get(h.traceId);
    assert.equal(t.status, 'error');
    assert.equal(t.steps.length, 1);
    assert.equal(t.steps[0].status, 'error');
    assert.equal(t.steps[0].data.message, 'boom');
  });
});

describe('Trace invalid-call behavior', () => {
  test('step on unknown traceId is no-op + warn', () => {
    SPDebug.enable();
    SPDebug.step('tr_unknown', 'x');
    assert.equal(debugStore.getState().traces.size, 0);
    assert.ok(warnings.some((w) => /unknown traceId/.test(w)));
  });

  test('endTrace on unknown traceId is no-op + warn', () => {
    SPDebug.enable();
    SPDebug.endTrace('tr_unknown');
    assert.equal(debugStore.getState().traces.size, 0);
    assert.ok(warnings.some((w) => /unknown traceId/.test(w)));
  });

  test('endTrace twice warns on second call', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('x');
    h.end();
    SPDebug.endTrace(h.traceId);
    assert.ok(warnings.some((w) => /already ended/.test(w)));
  });

  test('step after endTrace appends step and marks trace corrupted', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('x');
    h.end();
    h.step('post-end');
    const t = debugStore.getState().traces.get(h.traceId);
    assert.equal(t.steps.length, 1);
    assert.equal(t.corrupted, true);
    assert.ok(t.corruptionReasons && t.corruptionReasons.length > 0);
  });
});

describe('correlationId — distinct from traceId, primitive-only', () => {
  test('correlationId is stored on the trace and indexed', () => {
    SPDebug.enable();
    SPDebug.startTrace('Save', { correlationId: 'doc-7' });
    SPDebug.startTrace('Save', { correlationId: 'doc-7' }); // 2nd active trace, same correlation
    const idx = debugStore.getState().correlationIndex.get('Save|doc-7');
    assert.ok(idx);
    assert.equal(idx.length, 2);
  });

  test('stepByCorrelation finds the latest active trace', () => {
    SPDebug.enable();
    const a = SPDebug.startTrace('Save', { correlationId: 1 });
    const b = SPDebug.startTrace('Save', { correlationId: 1 }); // newer
    SPDebug.stepByCorrelation('Save', 1, 'continued');
    const tA = debugStore.getState().traces.get(a.traceId);
    const tB = debugStore.getState().traces.get(b.traceId);
    assert.equal(tA.steps.length, 0);
    assert.equal(tB.steps.length, 1);
    assert.equal(tB.steps[0].label, 'continued');
  });

  test('stepByCorrelation with no active trace warns and does not auto-start', () => {
    SPDebug.enable();
    SPDebug.stepByCorrelation('Save', 'missing', 'noop');
    assert.equal(debugStore.getState().traces.size, 0);
    assert.ok(warnings.some((w) => /no active trace/.test(w)));
  });

  test('object correlationId throws in dev (non-prod)', () => {
    SPDebug.enable();
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      environment: 'dev',
    });
    assert.throws(
      () => SPDebug.startTrace('Save', { correlationId: { id: 1 } }),
      /must be a string or number/
    );
  });

  test('object correlationId in prod warns and falls through (no trace)', () => {
    SPDebug.enable();
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      environment: 'prod',
      allowInProduction: true,
    });
    SPDebug.startTrace('Save', { correlationId: { id: 1 } });
    // Trace was still created (correlationId becomes undefined), but warned.
    const t = Array.from(debugStore.getState().traces.values())[0];
    assert.equal(t.correlationId, undefined);
    assert.ok(warnings.some((w) => /string or number/.test(w)));
  });
});

describe('abandonRunningTraces (pagehide simulation)', () => {
  test('marks all running traces as abandoned with endedAt', () => {
    SPDebug.enable();
    SPDebug.startTrace('a');
    SPDebug.startTrace('b');
    const ended = SPDebug.startTrace('c');
    ended.end();

    const count = SPDebug.abandonRunningTraces();
    assert.equal(count, 2);
    const traces = Array.from(debugStore.getState().traces.values());
    const abandoned = traces.filter((t) => t.status === 'abandoned');
    assert.equal(abandoned.length, 2);
    abandoned.forEach((t) => assert.ok(t.endedAt !== null));
  });
});

describe('disabled-cost', () => {
  test('startTrace returns a no-op handle while disabled', () => {
    const trap = {};
    Object.defineProperty(trap, 'sensitive', {
      enumerable: true,
      get() {
        throw new Error('walked');
      },
    });
    const h = SPDebug.startTrace('x');
    assert.doesNotThrow(() => h.step('s', trap));
    assert.doesNotThrow(() => h.warn('w', trap));
    assert.doesNotThrow(() => h.fail(new Error('e'), trap));
    assert.doesNotThrow(() => h.end());
    assert.equal(debugStore.getState().traces.size, 0);
  });

  test('startTrace does not validate object correlationId while disabled', () => {
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      environment: 'dev',
    });
    assert.doesNotThrow(() => SPDebug.startTrace('x', { correlationId: { id: 1 } }));
    assert.equal(debugStore.getState().traces.size, 0);
  });
});
