/**
 * Singleton SPDebug zustand store.
 *
 * State ownership: this store is the single source of truth. The `SPDebug` static
 * facade and the `SPDebugProvider` bootstrap component both interact with it.
 *
 * Per the spec, the provider does NOT own state in React. It only applies config,
 * attaches sinks, binds shortcuts, and lazy-renders the panel. The store works
 * from React and non-React code.
 *
 * See `docs/SPDebug-Requirements.md` "State Ownership" and "Memory, Limits,
 * and Persistence Budget".
 */

import { createStore } from 'zustand/vanilla';
import {
  addRedactionCounters,
  emptyRedactionCounters,
  estimateBytes,
} from './redaction';
import type { RedactionCounters } from './redaction';
import type {
  ResolvedDebugConfig,
  ResolvedDebugLimits,
  SPDebugEntry,
  SPDebugMetric,
  SPDebugSession,
  SPDebugSnapshot,
  SPDebugStepStatus,
  SPDebugTable,
  SPDebugTrace,
  SPDebugTraceStatus,
  SPDebugTraceStep,
} from './SPDebugTypes';

export type { RedactionCounters } from './redaction';

export interface DebugStoreState {
  // Activation
  captureEnabled: boolean;
  panelVisible: boolean;

  // Provider primary claim — first mounted provider wins; others no-op their bootstrap.
  // See spec "State Ownership".
  primaryProviderId: string | null;

  // Resolved configuration. Defaults until the primary provider applies its config.
  config: ResolvedDebugConfig;

  // Capture
  entries: SPDebugEntry[];
  evictedCount: number;
  evictedBytes: number;
  estimatedBytesInMemory: number;

  // Sessions — at most one active at a time per spec.
  activeSession: SPDebugSession | null;
  sessionHistory: SPDebugSession[];

  // Cumulative redaction summary across all captured entries.
  // See `docs/SPDebug-Requirements.md` "Redaction Summary".
  redactionSummary: RedactionCounters;

  // Persistence-side warnings (e.g. quota errors) recorded in memory but never
  // raised to the host app. See spec "Persistence" / "Never crash the host app".
  persistenceWarnings: string[];

  // Rich runtime stores. Snapshots/tables/metrics are keyed latest-wins maps
  // (no timeline duplication). Traces are stored by traceId and additionally
  // indexed by `(name, correlationId)` for `stepByCorrelation` lookups.
  snapshots: Map<string, SPDebugSnapshot>;
  tables: Map<string, SPDebugTable>;
  metrics: Map<string, SPDebugMetric>;
  traces: Map<string, SPDebugTrace>;
  /** `name|correlationId` → ordered traceIds (most recent last). */
  correlationIndex: Map<string, string[]>;

  // ----- actions -----
  pushEntry: (entry: SPDebugEntry, counters?: RedactionCounters) => void;
  recordRedaction: (counters: RedactionCounters) => void;
  recordPersistenceWarning: (message: string) => void;
  setCaptureEnabled: (enabled: boolean) => void;
  setPanelVisible: (visible: boolean) => void;
  setConfig: (config: ResolvedDebugConfig) => void;
  claimPrimary: (providerId: string) => boolean;
  releasePrimary: (providerId: string) => void;
  startSession: (label: string) => SPDebugSession;
  stopSession: (note: string | undefined) => SPDebugSession | null;
  clearSession: () => void;
  reset: () => void;

  // Rich runtime actions
  setSnapshot: (snapshot: SPDebugSnapshot, counters?: RedactionCounters) => void;
  setTable: (table: SPDebugTable, counters?: RedactionCounters) => void;
  setMetric: (metric: SPDebugMetric, counters?: RedactionCounters) => void;
  startTrace: (trace: SPDebugTrace) => void;
  appendStep: (
    traceId: string,
    step: SPDebugTraceStep,
    counters?: RedactionCounters
  ) => 'ok' | 'unknown' | 'corrupted';
  endTrace: (
    traceId: string,
    status?: Exclude<SPDebugTraceStatus, 'pending' | 'running'>
  ) => 'ok' | 'unknown' | 'already-ended';
  abandonRunningTraces: () => number;
  findLatestActiveTraceByCorrelation: (
    name: string,
    correlationId: string | number
  ) => SPDebugTrace | undefined;
}

// ----------------------------------------------------------------------------
// Defaults
// ----------------------------------------------------------------------------

export const DEFAULT_LIMITS: ResolvedDebugLimits = {
  maxEvents: 1000,
  maxBytesInMemory: 8 * 1024 * 1024,
  maxPayloadBytes: 64 * 1024,
  persistenceMaxBytes: 2 * 1024 * 1024,
  persistenceStripPayloadOver: 8 * 1024,
};

export const DEFAULT_CONFIG: ResolvedDebugConfig = {
  enabled: undefined,
  allowInProduction: false,
  allowProgrammaticInProduction: false,
  activation: {
    queryParams: ['isDebug', 'debug'],
    shortcuts: { togglePanel: 'Ctrl+Alt+D', toggleCapture: 'Ctrl+Alt+Shift+D' },
  },
  panel: { defaultDock: 'right', allowDockSwitch: true },
  persistence: { mode: 'session', maxAgeMinutes: 60, warnBeforeUnload: false },
  limits: DEFAULT_LIMITS,
  redact: { enabled: false, urls: 'none', userDisplayNames: false, phoneNumbers: false },
  export: { requireReview: 'production' },
};

// Conservative caps for the rich-runtime collections. Spec doesn't pin numbers
// for snapshots/tables/metrics/traces, but the in-memory budget rule still
// applies — we evict by oldest-update once these caps are hit.
export const MAX_SNAPSHOTS = 200;
export const MAX_TABLES = 50;
export const MAX_METRICS = 200;
export const MAX_TRACES = 200;

function initialState(): {
  captureEnabled: boolean;
  panelVisible: boolean;
  primaryProviderId: string | null;
  config: ResolvedDebugConfig;
  entries: SPDebugEntry[];
  evictedCount: number;
  evictedBytes: number;
  estimatedBytesInMemory: number;
  activeSession: SPDebugSession | null;
  sessionHistory: SPDebugSession[];
  redactionSummary: RedactionCounters;
  persistenceWarnings: string[];
  snapshots: Map<string, SPDebugSnapshot>;
  tables: Map<string, SPDebugTable>;
  metrics: Map<string, SPDebugMetric>;
  traces: Map<string, SPDebugTrace>;
  correlationIndex: Map<string, string[]>;
} {
  return {
    captureEnabled: false,
    panelVisible: false,
    primaryProviderId: null,
    config: DEFAULT_CONFIG,
    entries: [],
    evictedCount: 0,
    evictedBytes: 0,
    estimatedBytesInMemory: 0,
    activeSession: null,
    sessionHistory: [],
    redactionSummary: emptyRedactionCounters(),
    persistenceWarnings: [],
    snapshots: new Map(),
    tables: new Map(),
    metrics: new Map(),
    traces: new Map(),
    correlationIndex: new Map(),
  };
}

function correlationKeyFor(name: string, correlationId: string | number): string {
  return name + '|' + String(correlationId);
}

const STATUS_RANK: Record<SPDebugStepStatus, number> = {
  success: 0,
  warning: 1,
  error: 2,
};

function escalateStepStatus(
  current: SPDebugStepStatus | undefined,
  next: SPDebugStepStatus | undefined
): SPDebugStepStatus | undefined {
  if (!next) return current;
  if (!current) return next;
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

/**
 * Bounded keyed-map setter. Inserts/updates `next` and evicts the oldest entry
 * (insertion-order via `Map`'s natural ordering) when over `cap`. Updating an
 * existing key refreshes its position by deleting + re-inserting.
 */
function boundedMapSet<T>(
  map: Map<string, T>,
  key: string,
  next: T,
  cap: number
): Map<string, T> {
  const out = new Map(map);
  if (out.has(key)) out.delete(key);
  out.set(key, next);
  while (out.size > cap) {
    const firstKey = out.keys().next().value;
    if (firstKey === undefined) break;
    out.delete(firstKey);
  }
  return out;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function evictUntilUnderLimits(
  entries: SPDebugEntry[],
  bytes: number,
  limits: ResolvedDebugLimits
): { entries: SPDebugEntry[]; bytes: number; evictedCount: number; evictedBytes: number } {
  let evictedCount = 0;
  let evictedBytes = 0;
  let workingEntries = entries;
  let workingBytes = bytes;

  while (
    workingEntries.length > limits.maxEvents ||
    workingBytes > limits.maxBytesInMemory
  ) {
    const head = workingEntries[0];
    if (!head) break;
    workingEntries = workingEntries.slice(1);
    const headBytes = head.bytes ?? 0;
    workingBytes -= headBytes;
    evictedCount += 1;
    evictedBytes += headBytes;
  }

  return {
    entries: workingEntries,
    bytes: Math.max(0, workingBytes),
    evictedCount,
    evictedBytes,
  };
}

// ----------------------------------------------------------------------------
// Store
// ----------------------------------------------------------------------------

export const debugStore = createStore<DebugStoreState>((set, get) => ({
  ...initialState(),

  pushEntry: (entry, counters) => {
    const state = get();
    if (!state.captureEnabled) return;

    const bytes = entry.bytes ?? estimateBytes(entry.data) + estimateBytes(entry.message);
    const entryWithBytes: SPDebugEntry = { ...entry, bytes };
    const limits = state.config.limits;

    const candidateEntries = [...state.entries, entryWithBytes];
    const candidateBytes = state.estimatedBytesInMemory + bytes;
    const result = evictUntilUnderLimits(candidateEntries, candidateBytes, limits);

    if (counters) {
      const merged = { ...state.redactionSummary };
      addRedactionCounters(merged, counters);
      set({
        entries: result.entries,
        estimatedBytesInMemory: result.bytes,
        evictedCount: state.evictedCount + result.evictedCount,
        evictedBytes: state.evictedBytes + result.evictedBytes,
        redactionSummary: merged,
      });
    } else {
      set({
        entries: result.entries,
        estimatedBytesInMemory: result.bytes,
        evictedCount: state.evictedCount + result.evictedCount,
        evictedBytes: state.evictedBytes + result.evictedBytes,
      });
    }
  },

  recordRedaction: (counters) => {
    const state = get();
    const merged = { ...state.redactionSummary };
    addRedactionCounters(merged, counters);
    set({ redactionSummary: merged });
  },

  recordPersistenceWarning: (message) => {
    const state = get();
    // Cap to a reasonable buffer so a quota loop can't grow without bound.
    const next = state.persistenceWarnings.concat(message).slice(-20);
    set({ persistenceWarnings: next });
  },

  setCaptureEnabled: (enabled) => set({ captureEnabled: enabled }),

  setPanelVisible: (visible) => set({ panelVisible: visible }),

  setConfig: (config) => set({ config }),

  claimPrimary: (providerId) => {
    const state = get();
    if (state.primaryProviderId && state.primaryProviderId !== providerId) {
      return false;
    }
    set({ primaryProviderId: providerId });
    return true;
  },

  releasePrimary: (providerId) => {
    const state = get();
    if (state.primaryProviderId === providerId) {
      set({ primaryProviderId: null });
    }
  },

  startSession: (label) => {
    const state = get();
    const now = Date.now();
    // End-and-replace: if active, close it before starting a new one.
    let history = state.sessionHistory;
    if (state.activeSession && state.activeSession.endedAt === null) {
      const ended: SPDebugSession = { ...state.activeSession, endedAt: now };
      history = [...history, ended];
    }
    const session: SPDebugSession = {
      id: 'ses_' + Math.random().toString(36).slice(2, 10),
      label,
      startedAt: now,
      endedAt: null,
    };
    set({ activeSession: session, sessionHistory: history });
    return session;
  },

  stopSession: (note) => {
    const state = get();
    if (!state.activeSession) return null;
    const stopped: SPDebugSession = {
      ...state.activeSession,
      endedAt: Date.now(),
      note,
    };
    set({
      activeSession: null,
      sessionHistory: [...state.sessionHistory, stopped],
    });
    return stopped;
  },

  clearSession: () => set({ activeSession: null }),

  reset: () => set({ ...initialState() }),

  // ---- snapshots / tables / metrics / traces ----

  setSnapshot: (snapshot, counters) => {
    const state = get();
    if (!state.captureEnabled) return;
    const snapshots = boundedMapSet(state.snapshots, snapshot.key, snapshot, MAX_SNAPSHOTS);
    if (counters) {
      const merged = { ...state.redactionSummary };
      addRedactionCounters(merged, counters);
      set({ snapshots, redactionSummary: merged });
    } else {
      set({ snapshots });
    }
  },

  setTable: (table, counters) => {
    const state = get();
    if (!state.captureEnabled) return;
    const tables = boundedMapSet(state.tables, table.key, table, MAX_TABLES);
    if (counters) {
      const merged = { ...state.redactionSummary };
      addRedactionCounters(merged, counters);
      set({ tables, redactionSummary: merged });
    } else {
      set({ tables });
    }
  },

  setMetric: (metric, counters) => {
    const state = get();
    if (!state.captureEnabled) return;
    const metrics = boundedMapSet(state.metrics, metric.key, metric, MAX_METRICS);
    if (counters) {
      const merged = { ...state.redactionSummary };
      addRedactionCounters(merged, counters);
      set({ metrics, redactionSummary: merged });
    } else {
      set({ metrics });
    }
  },

  startTrace: (trace) => {
    const state = get();
    if (!state.captureEnabled) return;
    const traces = boundedMapSet(state.traces, trace.traceId, trace, MAX_TRACES);
    let correlationIndex = state.correlationIndex;
    if (trace.correlationId !== undefined) {
      correlationIndex = new Map(correlationIndex);
      const ck = correlationKeyFor(trace.name, trace.correlationId);
      const existing = correlationIndex.get(ck) || [];
      correlationIndex.set(ck, [...existing, trace.traceId]);
    }
    set({ traces, correlationIndex });
  },

  appendStep: (traceId, step, counters) => {
    const state = get();
    if (!state.captureEnabled) return 'unknown';
    const trace = state.traces.get(traceId);
    if (!trace) return 'unknown';
    const corrupted = trace.endedAt !== null;
    const nextWorst = escalateStepStatus(trace.worstStepStatus, step.status);
    const next: SPDebugTrace = {
      ...trace,
      steps: [...trace.steps, step],
      worstStepStatus: nextWorst,
      // Step warning/error escalates a still-running trace's status. Per spec
      // "Lifecycle Rules" — final classification happens on `endTrace`.
      status:
        trace.status === 'running' && step.status && step.status !== 'success'
          ? step.status
          : trace.status,
      ...(corrupted
        ? {
            corrupted: true,
            corruptionReasons: [
              ...(trace.corruptionReasons || []),
              'step appended after end',
            ],
          }
        : {}),
    };
    const traces = new Map(state.traces);
    traces.set(traceId, next);
    if (counters) {
      const merged = { ...state.redactionSummary };
      addRedactionCounters(merged, counters);
      set({ traces, redactionSummary: merged });
    } else {
      set({ traces });
    }
    return corrupted ? 'corrupted' : 'ok';
  },

  endTrace: (traceId, status) => {
    const state = get();
    const trace = state.traces.get(traceId);
    if (!trace) return 'unknown';
    if (trace.endedAt !== null) return 'already-ended';
    const derived: SPDebugTraceStatus =
      status ??
      (trace.worstStepStatus === 'error'
        ? 'error'
        : trace.worstStepStatus === 'warning'
        ? 'warning'
        : 'success');
    const next: SPDebugTrace = {
      ...trace,
      status: derived,
      endedAt: Date.now(),
    };
    const traces = new Map(state.traces);
    traces.set(traceId, next);
    set({ traces });
    return 'ok';
  },

  abandonRunningTraces: () => {
    const state = get();
    let count = 0;
    let traces = state.traces;
    let mutated = false;
    state.traces.forEach((trace, id) => {
      if (trace.endedAt === null) {
        if (!mutated) {
          traces = new Map(traces);
          mutated = true;
        }
        traces.set(id, { ...trace, status: 'abandoned', endedAt: Date.now() });
        count += 1;
      }
    });
    if (mutated) set({ traces });
    return count;
  },

  findLatestActiveTraceByCorrelation: (name, correlationId) => {
    const state = get();
    const ck = correlationKeyFor(name, correlationId);
    const ids = state.correlationIndex.get(ck);
    if (!ids || ids.length === 0) return undefined;
    // Walk from newest to oldest looking for an active (running) trace.
    for (let i = ids.length - 1; i >= 0; i -= 1) {
      const t = state.traces.get(ids[i]);
      if (t && t.endedAt === null) return t;
    }
    return undefined;
  },
}));
