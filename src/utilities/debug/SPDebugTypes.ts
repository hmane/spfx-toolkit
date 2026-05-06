/**
 * Public types for the SPDebug runtime.
 *
 * See `docs/SPDebug-Requirements.md` for the contract these implement.
 */

import type { LogEntry, Logger } from '../context/types';

// ----------------------------------------------------------------------------
// Activation / config
// ----------------------------------------------------------------------------

export type SPDebugRequireReview = 'always' | 'production' | 'never';

export type SPDebugDockMode = 'right' | 'bottom';

export type SPDebugPersistenceMode = 'none' | 'session' | 'local' | 'custom';

export type SPDebugUrlRedactionMode = 'queryAndFragment' | 'queryOnly' | 'all' | 'none';

export interface SPDebugLimits {
  /** Max entries retained in the in-memory ring buffer. Default 1000. */
  maxEvents?: number;
  /** Max bytes retained in memory (estimate). Default 8MB. */
  maxBytesInMemory?: number;
  /** Max bytes per single entry payload before truncation. Default 64KB. */
  maxPayloadBytes?: number;
  /** Max bytes persisted to storage. Default 2MB. */
  persistenceMaxBytes?: number;
  /** Per-entry payload threshold for stripping in persisted form. Default 8KB. */
  persistenceStripPayloadOver?: number;
}

export interface SPDebugActivationConfig {
  queryParams?: string[];
  shortcuts?: boolean | { togglePanel?: string; toggleCapture?: string };
}

export interface SPDebugPanelConfig {
  defaultDock?: SPDebugDockMode;
  allowDockSwitch?: boolean;
}

export interface SPDebugPersistenceConfig {
  mode?: SPDebugPersistenceMode;
  /**
   * How long persisted state remains restorable on next load. Older state is discarded.
   */
  maxAgeMinutes?: number;
  warnBeforeUnload?: boolean;
}

export interface SPDebugRedactionConfig {
  /**
   * Optional privacy pass. Defaults to false because SPDebug is primarily a
   * developer console; applications that need support-safe exports can opt in.
   */
  enabled?: boolean;
  /** Additional case-insensitive key substrings to redact. */
  keys?: string[];
  urls?: SPDebugUrlRedactionMode;
  userDisplayNames?: boolean;
  phoneNumbers?: boolean;
  /**
   * Custom redaction function applied per value during capture. See spec:
   * "Custom Redaction Function" in `docs/SPDebug-Requirements.md`.
   *
   * Return semantics:
   * - `KEEP` — bypass default redaction at this path (truncation still applies)
   * - `REDACT` — replace with the standard redaction marker
   * - any other value — replace the captured value (still walked structurally
   *   so pattern redaction and truncation apply to the replacement)
   * - `undefined` — fall through to default behavior
   */
  custom?: (
    path: string,
    value: unknown,
    defaultBehavior: 'keep' | 'redact'
  ) => unknown;
}

export interface SPDebugExportConfig {
  requireReview?: SPDebugRequireReview;
}

export interface SPDebugProviderConfig {
  /** Tri-state activation. `false` is hard kill; `true` is force on; `undefined` defers. */
  enabled?: boolean;
  allowInProduction?: boolean;
  allowProgrammaticInProduction?: boolean;
  activation?: SPDebugActivationConfig;
  panel?: SPDebugPanelConfig;
  persistence?: SPDebugPersistenceConfig;
  limits?: SPDebugLimits;
  redact?: SPDebugRedactionConfig;
  export?: SPDebugExportConfig;
  /**
   * Optional environment hint. When set, overrides URL/heuristic detection for
   * `allowInProduction` gating. Apps wiring this from `SPContext.environment`
   * gives the runtime an authoritative answer.
   */
  environment?: 'dev' | 'uat' | 'prod';
}

// ----------------------------------------------------------------------------
// Resolved (post-bootstrap) config — defaults filled in
// ----------------------------------------------------------------------------

export interface ResolvedDebugLimits {
  maxEvents: number;
  maxBytesInMemory: number;
  maxPayloadBytes: number;
  persistenceMaxBytes: number;
  persistenceStripPayloadOver: number;
}

export interface ResolvedDebugConfig {
  enabled?: boolean;
  allowInProduction: boolean;
  allowProgrammaticInProduction: boolean;
  activation: {
    queryParams: string[];
    shortcuts: { togglePanel: string; toggleCapture: string } | null;
  };
  panel: {
    defaultDock: SPDebugDockMode;
    allowDockSwitch: boolean;
  };
  persistence: {
    mode: SPDebugPersistenceMode;
    maxAgeMinutes: number;
    warnBeforeUnload: boolean;
  };
  limits: ResolvedDebugLimits;
  redact: SPDebugRedactionConfig;
  export: { requireReview: SPDebugRequireReview };
  environment?: 'dev' | 'uat' | 'prod';
}

// ----------------------------------------------------------------------------
// Entries
// ----------------------------------------------------------------------------

export type SPDebugLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export type SPDebugEntryType =
  | 'log'
  | 'event'
  | 'json'
  | 'table'
  | 'timer'
  | 'workflow'
  | 'metric'
  | 'error';

export interface SPDebugEntry {
  id: string;
  timestamp: number;
  type: SPDebugEntryType;
  level: SPDebugLevel;
  source: string;
  message: string;
  data?: unknown;
  /** Approximate serialized size, used for byte-budget enforcement. */
  bytes?: number;
  /** Optional metadata for multi-site / correlation. */
  meta?: Record<string, unknown>;
}

export interface SPDebugLoggerAttachOptions {
  /**
   * Override source mapping. By default, logger entries map to `source = entry.component`.
   */
  source?: string;
  /**
   * Optional metadata merged onto every entry routed via this logger
   * (e.g. `{ siteAlias, siteUrl }` for multi-site loggers).
   */
  meta?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Sessions
// ----------------------------------------------------------------------------

export interface SPDebugSession {
  id: string;
  label: string;
  startedAt: number;
  endedAt: number | null;
  note?: string;
}

export interface SPDebugSessionStartOptions {
  label?: string;
}

export interface SPDebugSessionStopOptions {
  note?: string;
}

// ----------------------------------------------------------------------------
// Rich runtime types — snapshots, tables, metrics, traces, scope, handles
// ----------------------------------------------------------------------------

/**
 * Caller-stable correlation identifier. Must be a primitive — see spec
 * "Trace Lifecycle and Identity → Hook Contract": object correlationIds throw
 * in dev and are warned/ignored in production.
 */
export type SPDebugCorrelationId = string | number;

export interface SPDebugSnapshot {
  key: string;
  source: string;
  value: unknown;
  bytes: number;
  updatedAt: number;
  meta?: Record<string, unknown>;
}

export interface SPDebugTableColumn {
  key: string;
  label?: string;
  /** Hint for the panel renderer; not enforced at capture time. */
  format?: 'fileSize' | 'dateTime' | 'date' | 'number' | 'string';
}

export interface SPDebugTable {
  key: string;
  source: string;
  rows: ReadonlyArray<unknown>;
  columns?: ReadonlyArray<SPDebugTableColumn>;
  bytes: number;
  updatedAt: number;
  meta?: Record<string, unknown>;
}

export interface SPDebugMetric {
  key: string;
  source: string;
  value: number | string;
  updatedAt: number;
  meta?: Record<string, unknown>;
}

export type SPDebugTraceStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'warning'
  | 'error'
  | 'abandoned';

export type SPDebugStepStatus = 'success' | 'warning' | 'error';

export interface SPDebugTraceStep {
  label: string;
  timestamp: number;
  status?: SPDebugStepStatus;
  data?: unknown;
  bytes: number;
  subSteps?: ReadonlyArray<SPDebugTraceStep>;
}

export interface SPDebugTrace {
  traceId: string;
  name: string;
  source: string;
  correlationId?: SPDebugCorrelationId;
  status: SPDebugTraceStatus;
  startedAt: number;
  endedAt: number | null;
  steps: SPDebugTraceStep[];
  /** Worst-status-seen across steps; used to derive terminal status on `endTrace`. */
  worstStepStatus?: SPDebugStepStatus;
  /** Set when `step` is appended to an already-ended trace, per spec invalid-call rules. */
  corrupted?: boolean;
  corruptionReasons?: string[];
  /** When set, no-step inactivity beyond this duration marks the trace abandoned. */
  timeoutMs?: number;
}

// ----------------------------------------------------------------------------
// Options shapes for the rich runtime API
// ----------------------------------------------------------------------------

export interface SPDebugSetOptions {
  source?: string;
  meta?: Record<string, unknown>;
}

export interface SPDebugJsonOptions {
  source?: string;
  meta?: Record<string, unknown>;
}

export interface SPDebugTableOptions {
  source?: string;
  columns?: ReadonlyArray<SPDebugTableColumn>;
  meta?: Record<string, unknown>;
}

export interface SPDebugMetricOptions {
  source?: string;
  meta?: Record<string, unknown>;
}

export interface SPDebugTimerOptions {
  source?: string;
  meta?: Record<string, unknown>;
}

export interface SPDebugTimerHandle {
  /** Stop the timer and emit a `timer` entry. Idempotent — second `end` is a no-op. */
  end(options?: { status?: SPDebugStepStatus; data?: unknown }): number;
  readonly timerId: string;
  readonly source: string;
  readonly name: string;
}

export interface SPDebugStartTraceOptions {
  source?: string;
  correlationId?: SPDebugCorrelationId;
  /** Optional inactivity timeout (ms). Default off. */
  timeoutMs?: number;
  meta?: Record<string, unknown>;
}

export interface SPDebugStepOptions {
  status?: SPDebugStepStatus;
  data?: unknown;
  subSteps?: ReadonlyArray<SPDebugTraceStep>;
}

export interface SPDebugEndTraceOptions {
  /** Explicit terminal status. If omitted, derived from worst-step-seen. */
  status?: Exclude<SPDebugTraceStatus, 'pending' | 'running'>;
  data?: unknown;
}

export interface SPDebugTraceHandle {
  readonly traceId: string;
  readonly name: string;
  readonly source: string;
  readonly correlationId?: SPDebugCorrelationId;
  step(label: string, dataOrOptions?: unknown | SPDebugStepOptions): void;
  warn(label: string, data?: unknown): void;
  fail(error: unknown, data?: unknown): void;
  end(options?: SPDebugEndTraceOptions): void;
}

// ----------------------------------------------------------------------------
// Source-scoped facade
// ----------------------------------------------------------------------------

export interface SPDebugScope {
  readonly source: string;
  log(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(error: unknown, data?: unknown): void;
  event(message: string, data?: unknown): void;
  json(key: string, value: unknown, options?: Omit<SPDebugJsonOptions, 'source'>): void;
  set(key: string, value: unknown, options?: Omit<SPDebugSetOptions, 'source'>): void;
  table(
    key: string,
    rows: ReadonlyArray<unknown>,
    options?: Omit<SPDebugTableOptions, 'source'>
  ): void;
  metric(
    key: string,
    value: number | string,
    options?: Omit<SPDebugMetricOptions, 'source'>
  ): void;
  timer(
    name: string,
    options?: Omit<SPDebugTimerOptions, 'source'>
  ): SPDebugTimerHandle;
  startTrace(
    name: string,
    options?: Omit<SPDebugStartTraceOptions, 'source'>
  ): SPDebugTraceHandle;
}

// ----------------------------------------------------------------------------
// Re-exports
// ----------------------------------------------------------------------------

export type { LogEntry, Logger };
