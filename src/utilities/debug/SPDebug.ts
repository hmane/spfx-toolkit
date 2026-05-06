/**
 * `SPDebug` static facade.
 *
 * Public entry point for the debug runtime. The facade is a thin wrapper over
 * the singleton store and the bridges. It works in React and non-React code,
 * and from any file in the consuming app.
 *
 * Surface:
 *
 * - **Activation**: `enable`/`disable`/`isCaptureEnabled`,
 *   `showPanel`/`hidePanel`/`togglePanel`/`toggleCapture`/`isPanelVisible`
 * - **Base capture**: `log`/`info`/`warn`/`error`/`event`
 * - **Rich runtime**: `set`/`json`/`table`/`metric`/`timer`/`startTrace`/`step`/
 *   `stepByCorrelation`/`endTrace`/`abandonRunningTraces`/`scope`
 * - **Sessions**: `session.start`/`stop`/`clear`/`current`
 * - **Bridge**: `attachLogger`
 * - **Export**: `export.markdown`/`export.json`
 * - **Tests**: `reset`
 *
 * **Disabled-cost contract**: every capture method early-returns BEFORE
 * walking caller payloads when `captureEnabled === false`. Callers can leave
 * `SPDebug.*` calls in production code with negligible overhead.
 *
 * **Production gating**: `SPDebug.enable()` and `SPDebug.toggleCapture()` are
 * blocked when `config.environment === 'prod'` unless the provider opts in
 * via `allowInProduction` or `allowProgrammaticInProduction`.
 * `enabled={false}` on the provider is a hard kill switch that overrides
 * everything else.
 *
 * See `docs/SPDebug-Requirements.md`.
 */

import { LogLevel } from '@pnp/logging';
import type { Logger } from '../context/types';
import { attachLoggerToStore } from './loggerBridge';
import { debugStore } from './SPDebugStore';
import type {
  SPDebugCorrelationId,
  SPDebugEndTraceOptions,
  SPDebugEntry,
  SPDebugJsonOptions,
  SPDebugLevel,
  SPDebugLoggerAttachOptions,
  SPDebugMetricOptions,
  SPDebugScope,
  SPDebugSession,
  SPDebugSessionStartOptions,
  SPDebugSessionStopOptions,
  SPDebugSetOptions,
  SPDebugStartTraceOptions,
  SPDebugStepOptions,
  SPDebugStepStatus,
  SPDebugTableOptions,
  SPDebugTimerHandle,
  SPDebugTimerOptions,
  SPDebugTraceHandle,
  SPDebugTraceStep,
} from './SPDebugTypes';
import {
  estimateBytes,
  prepareForCapture,
  type RedactionCounters,
} from './redaction';
import { exportMarkdown, exportJson } from './exportSession';

const DEFAULT_SOURCE = 'App';

function makeId(): string {
  return 'e_' + Math.random().toString(36).slice(2, 10);
}

/**
 * Monotonic clock for duration measurements; falls back to `Date.now()` in
 * environments without `performance`.
 */
function nowPerf(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Validate a correlationId per spec: must be a primitive `string` or `number`.
 * Throws in dev-like environments and warn-and-ignores in production. Used
 * by `startTrace` and `stepByCorrelation`.
 */
function guardCorrelationId(
  raw: SPDebugCorrelationId | undefined
): SPDebugCorrelationId | undefined {
  if (raw === undefined) return undefined;
  const t = typeof raw;
  if (t === 'string' || t === 'number') return raw;
  const env = debugStore.getState().config.environment;
  const message =
    'SPDebug: correlationId must be a string or number, received ' + t + '.';
  if (env !== 'prod') {
    throw new TypeError(message);
  }
  warnInternal(message);
  return undefined;
}

function warnInternal(message: string): void {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn('[SPDebug] ' + message);
  }
}

function normalizeStepOptions(
  dataOrOptions: unknown | SPDebugStepOptions | undefined
): SPDebugStepOptions {
  if (
    dataOrOptions !== null &&
    typeof dataOrOptions === 'object' &&
    !Array.isArray(dataOrOptions) &&
    ('status' in (dataOrOptions as object) ||
      'data' in (dataOrOptions as object) ||
      'subSteps' in (dataOrOptions as object))
  ) {
    return dataOrOptions as SPDebugStepOptions;
  }
  return { data: dataOrOptions };
}

function appendStepInternal(
  traceId: string,
  label: string,
  dataOrOptions: unknown | SPDebugStepOptions | undefined
): void {
  const state = debugStore.getState();
  if (!state.captureEnabled) return;
  const opts = normalizeStepOptions(dataOrOptions);
  const cfg = state.config;
  const prepared = prepareForCapture(opts.data, cfg.redact, cfg.limits.maxPayloadBytes);
  const step: SPDebugTraceStep = {
    label,
    timestamp: Date.now(),
    status: opts.status,
    data: prepared.value,
    bytes: prepared.bytes + estimateBytes(label),
    subSteps: opts.subSteps,
  };
  const result = state.appendStep(traceId, step, prepared.counters);
  if (result === 'unknown') {
    warnInternal('step: unknown traceId ' + traceId);
  }
}

function makeNoopTraceHandle(
  traceId: string,
  name: string,
  source: string,
  correlationId: SPDebugCorrelationId | undefined
): SPDebugTraceHandle {
  return {
    traceId,
    name,
    source,
    correlationId,
    step(): void {
      /* disabled: no-op */
    },
    warn(): void {
      /* disabled: no-op */
    },
    fail(): void {
      /* disabled: no-op */
    },
    end(): void {
      /* disabled: no-op */
    },
  };
}

function makeTraceHandle(
  traceId: string,
  name: string,
  source: string,
  correlationId: SPDebugCorrelationId | undefined
): SPDebugTraceHandle {
  return {
    traceId,
    name,
    source,
    correlationId,
    step(label, dataOrOptions) {
      appendStepInternal(traceId, label, dataOrOptions);
    },
    warn(label, data) {
      appendStepInternal(traceId, label, { status: 'warning', data });
    },
    fail(error, data) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'failed';
      const errData =
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack, data }
          : { error, data };
      appendStepInternal(traceId, message, { status: 'error', data: errData });
      // Auto-end on fail with explicit error status — matches the spec's
      // "Lifecycle Rules" example where `fail` terminates the trace.
      const state = debugStore.getState();
      const result = state.endTrace(traceId, 'error');
      if (result === 'already-ended') {
        // Already ended; the caller may have called `.end()` then `.fail()`.
        // The step we just appended is now flagged corrupted by the store.
      }
    },
    end(options) {
      const state = debugStore.getState();
      if (!state.captureEnabled) return;
      const result = state.endTrace(traceId, options?.status);
      if (result === 'already-ended') {
        warnInternal('end: trace already ended ' + traceId);
      }
    },
  };
}

interface BuiltEntry {
  entry: SPDebugEntry;
  counters: RedactionCounters;
}

function buildEntry(
  type: SPDebugEntry['type'],
  level: SPDebugLevel,
  source: string,
  message: string,
  data?: unknown
): BuiltEntry {
  const config = debugStore.getState().config;
  const prepared = prepareForCapture(data, config.redact, config.limits.maxPayloadBytes);
  return {
    entry: {
      id: makeId(),
      timestamp: Date.now(),
      type,
      level,
      source,
      message,
      data: prepared.value,
      bytes: prepared.bytes + estimateBytes(message),
    },
    counters: prepared.counters,
  };
}

function pushBuiltEntry(built: BuiltEntry): void {
  const state = debugStore.getState();
  state.pushEntry(built.entry, built.counters);
}

function captureIfEnabled(
  type: SPDebugEntry['type'],
  level: SPDebugLevel,
  source: string,
  message: string,
  data?: unknown
): void {
  const state = debugStore.getState();
  if (!state.captureEnabled) return;
  pushBuiltEntry(buildEntry(type, level, source, message, data));
}

// ----------------------------------------------------------------------------
// Activation guards
// ----------------------------------------------------------------------------

/**
 * Whether programmatic `SPDebug.enable()` is permitted in the current environment.
 *
 * Spec: in production with `allowInProduction === false`, programmatic activation
 * is also ignored unless `allowProgrammaticInProduction === true` OR the provider
 * was rendered with `enabled={true}`. The provider applies the explicit
 * `enabled={true}` directly via `setCaptureEnabled`, so this guard only governs
 * `SPDebug.enable()` calls from arbitrary code.
 */
function programmaticActivationAllowed(): boolean {
  const state = debugStore.getState();
  const cfg = state.config;
  if (cfg.enabled === false) return false;
  if (cfg.environment !== 'prod') return true;
  if (cfg.allowInProduction) return true;
  if (cfg.allowProgrammaticInProduction) return true;
  return false;
}

// ----------------------------------------------------------------------------
// Facade
// ----------------------------------------------------------------------------

export const SPDebug = {
  // -- activation --------------------------------------------------------

  enable(): void {
    if (!programmaticActivationAllowed()) return;
    debugStore.getState().setCaptureEnabled(true);
  },

  disable(): void {
    debugStore.getState().setCaptureEnabled(false);
  },

  isCaptureEnabled(): boolean {
    return debugStore.getState().captureEnabled;
  },

  isPanelVisible(): boolean {
    return debugStore.getState().panelVisible;
  },

  showPanel(): void {
    debugStore.getState().setPanelVisible(true);
  },

  hidePanel(): void {
    debugStore.getState().setPanelVisible(false);
  },

  togglePanel(): void {
    const state = debugStore.getState();
    state.setPanelVisible(!state.panelVisible);
  },

  toggleCapture(): void {
    const state = debugStore.getState();
    if (state.captureEnabled) {
      state.setCaptureEnabled(false);
      return;
    }
    if (!programmaticActivationAllowed()) return;
    state.setCaptureEnabled(true);
  },

  // -- base runtime methods ---------------------------------------------

  log(message: string, data?: unknown): void {
    captureIfEnabled('log', 'info', DEFAULT_SOURCE, message, data);
  },

  info(source: string, message: string, data?: unknown): void {
    captureIfEnabled('log', 'info', source, message, data);
  },

  warn(source: string, message: string, data?: unknown): void {
    captureIfEnabled('log', 'warn', source, message, data);
  },

  error(source: string, error: unknown, data?: unknown): void {
    if (!debugStore.getState().captureEnabled) return;
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Error';
    const errData =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack, data }
        : { error, data };
    pushBuiltEntry(buildEntry('error', 'error', source, message, errData));
  },

  event(source: string, message: string, data?: unknown): void {
    captureIfEnabled('event', 'info', source, message, data);
  },

  // -- sessions ----------------------------------------------------------

  session: {
    start(options?: SPDebugSessionStartOptions): SPDebugSession {
      const label =
        options?.label && options.label.trim().length > 0
          ? options.label.trim()
          : 'Session ' + new Date().toISOString();
      return debugStore.getState().startSession(label);
    },
    stop(options?: SPDebugSessionStopOptions): SPDebugSession | null {
      return debugStore.getState().stopSession(options?.note);
    },
    clear(): void {
      debugStore.getState().clearSession();
    },
    current(): SPDebugSession | null {
      return debugStore.getState().activeSession;
    },
  },

  // -- attach -----------------------------------------------------------

  attachLogger(logger: Logger, options?: SPDebugLoggerAttachOptions): () => void {
    return attachLoggerToStore(logger, options);
  },

  // -- rich runtime -----------------------------------------------------

  /**
   * Update a keyed snapshot (Snapshots tab). Latest value wins; no timeline
   * entry. Disabled-state contract: payload is not walked when capture is off.
   */
  set(key: string, value: unknown, options?: SPDebugSetOptions): void {
    const state = debugStore.getState();
    if (!state.captureEnabled) return;
    const cfg = state.config;
    const prepared = prepareForCapture(value, cfg.redact, cfg.limits.maxPayloadBytes);
    state.setSnapshot(
      {
        key,
        source: options?.source ?? DEFAULT_SOURCE,
        value: prepared.value,
        bytes: prepared.bytes,
        updatedAt: Date.now(),
        meta: options?.meta,
      },
      prepared.counters
    );
  },

  /**
   * Emit a JSON timeline entry. Used for one-off "here's a payload at this
   * point in time" captures. For sticky keyed state, prefer `set`.
   */
  json(key: string, value: unknown, options?: SPDebugJsonOptions): void {
    const state = debugStore.getState();
    if (!state.captureEnabled) return;
    const cfg = state.config;
    const prepared = prepareForCapture(value, cfg.redact, cfg.limits.maxPayloadBytes);
    const entry: SPDebugEntry = {
      id: makeId(),
      timestamp: Date.now(),
      type: 'json',
      level: 'info',
      source: options?.source ?? DEFAULT_SOURCE,
      message: key,
      data: prepared.value,
      bytes: prepared.bytes + estimateBytes(key),
      meta: options?.meta,
    };
    state.pushEntry(entry, prepared.counters);
  },

  /**
   * Update a keyed table snapshot (Tables tab). Latest rows win. Columns hint
   * the panel renderer.
   */
  table(
    key: string,
    rows: ReadonlyArray<unknown>,
    options?: SPDebugTableOptions
  ): void {
    const state = debugStore.getState();
    if (!state.captureEnabled) return;
    const cfg = state.config;
    const prepared = prepareForCapture(rows, cfg.redact, cfg.limits.maxPayloadBytes);
    state.setTable(
      {
        key,
        source: options?.source ?? DEFAULT_SOURCE,
        rows: (prepared.value as ReadonlyArray<unknown>) ?? [],
        columns: options?.columns,
        bytes: prepared.bytes,
        updatedAt: Date.now(),
        meta: options?.meta,
      },
      prepared.counters
    );
  },

  /**
   * Update a keyed metric (Overview tab compact stats). Latest value wins.
   * Numeric or string values only — pass-through, no payload walking.
   */
  metric(
    key: string,
    value: number | string,
    options?: SPDebugMetricOptions
  ): void {
    const state = debugStore.getState();
    if (!state.captureEnabled) return;
    const cfg = state.config;
    const prepared = prepareForCapture(value, cfg.redact, cfg.limits.maxPayloadBytes);
    state.setMetric(
      {
        key,
        source: options?.source ?? DEFAULT_SOURCE,
        value: typeof prepared.value === 'number' ? prepared.value : String(prepared.value),
        updatedAt: Date.now(),
        meta: options?.meta,
      },
      prepared.counters
    );
  },

  /**
   * Start a duration timer. Returns a handle whose `.end()` emits one timeline
   * entry of type `timer`. Idempotent: a second `end()` is a no-op.
   *
   * Disabled-state contract: when capture is off the handle is a no-op stub.
   */
  timer(name: string, options?: SPDebugTimerOptions): SPDebugTimerHandle {
    const captureEnabled = debugStore.getState().captureEnabled;
    const source = options?.source ?? DEFAULT_SOURCE;
    const meta = options?.meta;
    const timerId = 't_' + Math.random().toString(36).slice(2, 10);
    if (!captureEnabled) {
      return {
        timerId,
        source,
        name,
        end(): number {
          return 0;
        },
      };
    }
    const startedAt = nowPerf();
    let ended = false;
    return {
      timerId,
      source,
      name,
      end(endOptions?: { status?: SPDebugStepStatus; data?: unknown }): number {
        if (ended) return 0;
        ended = true;
        const state = debugStore.getState();
        if (!state.captureEnabled) return 0;
        const duration = Math.max(0, nowPerf() - startedAt);
        const cfg = state.config;
        const prepared = prepareForCapture(
          { duration, status: endOptions?.status, ...(endOptions?.data as object | undefined) },
          cfg.redact,
          cfg.limits.maxPayloadBytes
        );
        const level: SPDebugLevel =
          endOptions?.status === 'error'
            ? 'error'
            : endOptions?.status === 'warning'
            ? 'warn'
            : 'info';
        const entry: SPDebugEntry = {
          id: makeId(),
          timestamp: Date.now(),
          type: 'timer',
          level,
          source,
          message: name,
          data: prepared.value,
          bytes: prepared.bytes + estimateBytes(name),
          meta,
        };
        state.pushEntry(entry, prepared.counters);
        return duration;
      },
    };
  },

  /**
   * Begin a workflow trace. Returns a handle bound to an opaque `traceId`.
   * Use `.step()` / `.warn()` / `.fail()` / `.end()` for fluent capture, or
   * pass `traceId` to `SPDebug.step(traceId, ...)` from non-React code.
   */
  startTrace(
    name: string,
    options?: SPDebugStartTraceOptions
  ): SPDebugTraceHandle {
    const captureEnabled = debugStore.getState().captureEnabled;
    const source = options?.source ?? DEFAULT_SOURCE;
    const traceId = 'tr_' + Math.random().toString(36).slice(2, 10);
    if (!captureEnabled) {
      return makeNoopTraceHandle(traceId, name, source, undefined);
    }
    const correlationId = guardCorrelationId(options?.correlationId);
    debugStore.getState().startTrace({
      traceId,
      name,
      source,
      correlationId,
      status: 'running',
      startedAt: Date.now(),
      endedAt: null,
      steps: [],
      timeoutMs: options?.timeoutMs,
    });
    return makeTraceHandle(traceId, name, source, correlationId);
  },

  /** Append a step to an existing trace. Unknown traces are no-op + warning. */
  step(
    traceId: string,
    label: string,
    dataOrOptions?: unknown | SPDebugStepOptions
  ): void {
    appendStepInternal(traceId, label, dataOrOptions);
  },

  /**
   * Append a step to the most-recent active trace matching `(name,
   * correlationId)`. If none exists, this is a no-op + warning per spec —
   * traces are never auto-started by step calls.
   */
  stepByCorrelation(
    name: string,
    correlationId: SPDebugCorrelationId,
    label: string,
    dataOrOptions?: unknown | SPDebugStepOptions
  ): void {
    const state = debugStore.getState();
    if (!state.captureEnabled) return;
    const id = guardCorrelationId(correlationId);
    if (id === undefined) return;
    const trace = state.findLatestActiveTraceByCorrelation(name, id);
    if (!trace) {
      warnInternal(
        'stepByCorrelation: no active trace for ' + name + '/' + String(id)
      );
      return;
    }
    appendStepInternal(trace.traceId, label, dataOrOptions);
  },

  /** End a trace. Status derives from worst-step-seen unless explicit. */
  endTrace(traceId: string, options?: SPDebugEndTraceOptions): void {
    const state = debugStore.getState();
    if (!state.captureEnabled) return;
    const result = state.endTrace(traceId, options?.status);
    if (result === 'unknown') {
      warnInternal('endTrace: unknown traceId ' + traceId);
    } else if (result === 'already-ended') {
      warnInternal('endTrace: trace already ended ' + traceId);
    }
  },

  /**
   * Mark all running traces as `abandoned`. Called on `pagehide` by the
   * provider; safe to call manually too. Returns the count abandoned.
   */
  abandonRunningTraces(): number {
    return debugStore.getState().abandonRunningTraces();
  },

  /**
   * Bind a source so callers don't have to pass it every time. The returned
   * scope is a thin wrapper — it adds zero state of its own.
   */
  scope(source: string): SPDebugScope {
    const facade = SPDebug;
    return {
      source,
      log(message, data) {
        facade.info(source, message, data);
      },
      info(message, data) {
        facade.info(source, message, data);
      },
      warn(message, data) {
        facade.warn(source, message, data);
      },
      error(error, data) {
        facade.error(source, error, data);
      },
      event(message, data) {
        facade.event(source, message, data);
      },
      json(key, value, options) {
        facade.json(key, value, { ...(options || {}), source });
      },
      set(key, value, options) {
        facade.set(key, value, { ...(options || {}), source });
      },
      table(key, rows, options) {
        facade.table(key, rows, { ...(options || {}), source });
      },
      metric(key, value, options) {
        facade.metric(key, value, { ...(options || {}), source });
      },
      timer(name, options) {
        return facade.timer(name, { ...(options || {}), source });
      },
      startTrace(name, options) {
        return facade.startTrace(name, { ...(options || {}), source });
      },
    };
  },

  // -- export -----------------------------------------------------------

  /**
   * Capture the current debug state as Markdown (`export.markdown()`) or as
   * a structured JSON snapshot (`export.json()`).
   *
   * The Markdown report is the primary support artifact — it includes the
   * eviction summary, persistence warnings, the full timeline, entries grouped
   * by source, snapshots, tables, and workflows grouped by `(name,
   * correlationId)`. See `exportSession.ts` for the section ordering.
   */
  export: {
    markdown(): string {
      return exportMarkdown();
    },
    json(): ReturnType<typeof exportJson> {
      return exportJson();
    },
  },

  // -- test/reset --------------------------------------------------------

  /**
   * Reset the runtime to its initial state.
   *
   * Clears:
   *
   * - capture flag (`captureEnabled` → false) and panel flag
   *   (`panelVisible` → false)
   * - all timeline entries, eviction counters, byte estimate
   * - active session and session history
   * - keyed snapshots, tables, metrics
   * - traces and the correlation index
   * - cumulative preparation summary
   * - persistence warnings buffer
   * - primary-provider claim
   *
   * Does NOT detach external sinks already returned to callers (e.g. the
   * function returned by `attachLogger`). Those cleanup functions remain the
   * caller's — or the provider's — responsibility.
   *
   * Intended for tests and explicit "wipe and start over" flows. Production
   * support sessions should use `session.start/stop/clear` instead.
   */
  reset(): void {
    debugStore.getState().reset();
  },

  // Re-export of LogLevel so apps don't need a direct @pnp/logging import for
  // simple tagging when wiring custom loggers.
  LogLevel,
};
