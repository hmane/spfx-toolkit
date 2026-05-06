/**
 * Logger -> SPDebug bridge.
 *
 * Subscribes to a `Logger.addSink` and translates `LogEntry` into `SPDebugEntry`
 * pushed onto the store. Atomic replay (`{ replay: true }`) ensures pre-attach
 * entries are delivered before new entries arrive on the same sink, so no
 * deduplication is needed.
 *
 * See `docs/SPDebug-Requirements.md` "Logger Integration".
 */

import { LogLevel } from '@pnp/logging';
import type { LogEntry, Logger } from '../context/types';
import { debugStore } from './SPDebugStore';
import type {
  SPDebugEntry,
  SPDebugLevel,
  SPDebugLoggerAttachOptions,
} from './SPDebugTypes';
import {
  estimateBytes,
  prepareForCapture,
  type RedactionCounters,
} from './redaction';

function levelFromLogLevel(level: LogLevel): SPDebugLevel {
  switch (level) {
    case LogLevel.Error:
      return 'error';
    case LogLevel.Warning:
      return 'warn';
    case LogLevel.Info:
      return 'info';
    case LogLevel.Verbose:
    default:
      return 'debug';
  }
}

function makeId(): string {
  return 'e_' + Math.random().toString(36).slice(2, 10);
}

export interface LogEntryToDebugEntryResult {
  entry: SPDebugEntry;
  counters: RedactionCounters;
}

export function logEntryToDebugEntry(
  entry: LogEntry,
  options?: SPDebugLoggerAttachOptions
): LogEntryToDebugEntryResult {
  // The logger has its own light-touch sanitization. SPDebug then prepares the
  // payload for storage in the same walk that performs structural truncation.
  const config = debugStore.getState().config;
  const prepared = prepareForCapture(entry.data, config.redact, config.limits.maxPayloadBytes);

  const source = options?.source ?? entry.component ?? 'Other';
  const meta: Record<string, unknown> = {
    correlationId: entry.correlationId,
    ...options?.meta,
  };

  return {
    entry: {
      id: makeId(),
      timestamp: entry.timestamp,
      type: 'log',
      level: levelFromLogLevel(entry.level),
      source,
      message: entry.message,
      data: prepared.value,
      bytes: prepared.bytes + estimateBytes(entry.message),
      meta,
    },
    counters: prepared.counters,
  };
}

/**
 * Attach the bridge to a logger. Returns an unsubscribe function.
 *
 * Spec contract: calls `logger.addSink(sink, { replay: true })`. The logger
 * delivers all currently buffered entries to `sink` synchronously before any
 * new entries arrive on the same sink.
 */
export function attachLoggerToStore(
  logger: Logger,
  options?: SPDebugLoggerAttachOptions
): () => void {
  if (typeof logger.addSink !== 'function') {
    // The logger pre-dates the sink contract — see "Logger Integration → SimpleLogger
    // Sink Contract" in the spec. There is nothing to bridge; return a noop
    // detacher so callers can keep the same try/finally shape.
    return () => {
      /* noop */
    };
  }

  const sink = (entry: LogEntry): void => {
    const state = debugStore.getState();
    if (!state.captureEnabled) return;
    const result = logEntryToDebugEntry(entry, options);
    state.pushEntry(result.entry, result.counters);
  };

  return logger.addSink(sink, { replay: true });
}
