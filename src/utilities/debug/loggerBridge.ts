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

const KNOWN_SOURCE_AREAS = new Set(['Toolkit', 'App', 'User', 'Service', 'Site', 'Other']);
const TOOLKIT_COMPONENTS = [
  'SPDynamicForm',
  'DocumentLink',
  'SPListItemAttachments',
  'VersionHistory',
  'ManageAccess',
  'GroupUsersPicker',
  'GroupViewer',
  'UserPersona',
  'SPTaxonomyField',
  'SPChoiceField',
  'SPLookupField',
  'SPUserField',
  'SPField',
  'NoteHistory',
  'SpfxCard',
  'CssLoader',
  'DialogService',
  'BatchBuilder',
  'PermissionHelper',
  'ConflictDetector',
  'Comments',
];

function firstSourceSegment(source: string): string {
  const slash = source.indexOf('/');
  return slash >= 0 ? source.slice(0, slash) : source;
}

function detailSourceSegment(source: string): string {
  const slash = source.indexOf('/');
  return slash >= 0 ? source.slice(slash + 1) : source;
}

function inferComponent(message: string, source: string): string {
  const sourceArea = firstSourceSegment(source);
  if (KNOWN_SOURCE_AREAS.has(sourceArea)) {
    return detailSourceSegment(source) || sourceArea;
  }

  const prefix = message.match(/^([A-Za-z][A-Za-z0-9]+):\s*/)?.[1];
  if (prefix && TOOLKIT_COMPONENTS.includes(prefix)) {
    return prefix;
  }

  const bracketed = message.match(/^\[([A-Za-z][A-Za-z0-9]+)\]/)?.[1];
  if (bracketed && TOOLKIT_COMPONENTS.includes(bracketed)) {
    return bracketed;
  }

  return source || 'Logger';
}

function inferFeature(message: string): string | undefined {
  const lower = message.toLowerCase();
  if (lower.includes('content type') || lower.includes('contenttype')) return 'content-types';
  if (lower.includes('field')) return 'fields';
  if (lower.includes('attachment')) return 'attachments';
  if (lower.includes('validation')) return 'validation';
  if (lower.includes('submit') || lower.includes('save')) return 'submit';
  if (lower.includes('load') || lower.includes('fetch')) return 'loading';
  if (lower.includes('cache')) return 'cache';
  if (lower.includes('permission')) return 'permissions';
  return undefined;
}

export interface DebugLogClassification {
  origin: 'Toolkit' | 'App' | 'Site' | 'Service' | 'User' | 'Other';
  component: string;
  feature?: string;
  source: string;
}

export function classifyLogEntry(entry: LogEntry, options?: SPDebugLoggerAttachOptions): DebugLogClassification {
  const rawSource = options?.source ?? entry.component ?? 'Other';
  const explicitArea = firstSourceSegment(rawSource);
  const messageComponent = inferComponent(entry.message, rawSource);
  const isKnownToolkitComponent = TOOLKIT_COMPONENTS.includes(messageComponent);
  const origin = KNOWN_SOURCE_AREAS.has(explicitArea)
    ? (explicitArea as DebugLogClassification['origin'])
    : isKnownToolkitComponent
    ? 'Toolkit'
    : 'App';
  const component = isKnownToolkitComponent ? messageComponent : detailSourceSegment(rawSource);
  const source = options?.source ?? `${origin}/${component || 'Logger'}`;

  return {
    origin,
    component: component || origin,
    feature: inferFeature(entry.message),
    source,
  };
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

  const classification = classifyLogEntry(entry, options);
  const meta: Record<string, unknown> = {
    origin: classification.origin,
    component: classification.component,
    feature: classification.feature,
    correlationId: entry.correlationId,
    ...options?.meta,
  };

  return {
    entry: {
      id: makeId(),
      timestamp: entry.timestamp,
      type: 'log',
      level: levelFromLogLevel(entry.level),
      source: classification.source,
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
