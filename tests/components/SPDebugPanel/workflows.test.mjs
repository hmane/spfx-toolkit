/**
 * Phase 4: workflow grouping pure logic.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  groupTracesByCorrelation,
  traceStatusRank,
  TRACE_STATUS_ORDER,
} from '../../../lib/components/SPDebugPanel/panelLogic.js';

function trace({
  id,
  name,
  correlationId,
  status,
  startedAt = 1000,
}) {
  return {
    traceId: id,
    name,
    source: 'App/X',
    correlationId,
    status,
    startedAt,
    endedAt: status === 'running' ? null : startedAt + 100,
    steps: [],
  };
}

describe('groupTracesByCorrelation', () => {
  test('groups by name and correlationId', () => {
    const traces = [
      trace({ id: 'tr_1', name: 'Save', correlationId: 'doc-1', status: 'success' }),
      trace({ id: 'tr_2', name: 'Save', correlationId: 'doc-1', status: 'error' }),
      trace({ id: 'tr_3', name: 'Save', correlationId: 'doc-2', status: 'success' }),
    ];
    const groups = groupTracesByCorrelation(traces);
    assert.equal(groups.length, 2);
    const doc1 = groups.find((g) => g.label.indexOf('doc-1') >= 0);
    assert.equal(doc1.traces.length, 2);
  });

  test('traces without correlationId are grouped per-traceId', () => {
    const traces = [
      trace({ id: 'tr_a', name: 'Save', status: 'success' }),
      trace({ id: 'tr_b', name: 'Save', status: 'success' }),
    ];
    const groups = groupTracesByCorrelation(traces);
    // Two groups since there's no correlationId to share.
    assert.equal(groups.length, 2);
  });

  test('worst-status groups bubble to the top', () => {
    const traces = [
      trace({ id: 'tr_ok', name: 'A', correlationId: 1, status: 'success' }),
      trace({ id: 'tr_err', name: 'B', correlationId: 1, status: 'error' }),
      trace({ id: 'tr_run', name: 'C', correlationId: 1, status: 'running' }),
    ];
    const groups = groupTracesByCorrelation(traces);
    // running > error > success per TRACE_STATUS_ORDER.
    assert.equal(groups[0].label.indexOf('C') >= 0, true);
    assert.equal(groups[1].label.indexOf('B') >= 0, true);
    assert.equal(groups[2].label.indexOf('A') >= 0, true);
  });

  test('within a group, traces are sorted newest-first', () => {
    const traces = [
      trace({ id: 'old', name: 'X', correlationId: 1, status: 'success', startedAt: 1 }),
      trace({ id: 'new', name: 'X', correlationId: 1, status: 'success', startedAt: 100 }),
    ];
    const groups = groupTracesByCorrelation(traces);
    assert.equal(groups[0].traces[0].traceId, 'new');
    assert.equal(groups[0].traces[1].traceId, 'old');
  });
});

describe('traceStatusRank', () => {
  test('matches TRACE_STATUS_ORDER index', () => {
    TRACE_STATUS_ORDER.forEach((status, i) => {
      assert.equal(traceStatusRank(status), i);
    });
  });
});
