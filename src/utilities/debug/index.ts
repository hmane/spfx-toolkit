/**
 * Public entry for the SPDebug runtime.
 *
 * Tree-shakable. Importing this module does NOT bring in the panel UI; that
 * lives in `components/SPDebugPanel` and is loaded only by `SPDebugProvider`
 * via dynamic `import()` when the panel becomes visible. The panel module is
 * intentionally not a public package export.
 *
 * **Recommended import paths**:
 *
 * ```ts
 * import { SPDebug } from 'spfx-toolkit/lib/utilities/debug';
 * import { SPDebugProvider, useSPDebugTrace } from 'spfx-toolkit/lib/components/debug';
 * ```
 *
 * The `SPDebug` facade works in React and non-React code. Hooks
 * (`useSPDebugValue`, `useSPDebugTimer`, etc.) are in `components/debug` and
 * subscribe only to `captureEnabled` — they perform no payload walking when
 * capture is off, so they're safe to leave in production code.
 *
 * See `docs/SPDebug-Requirements.md` for the complete specification and the
 * SPDebug section of `SPFX-Toolkit-Usage-Guide.md` for usage examples.
 */

export { SPDebug } from './SPDebug';
export { debugStore, DEFAULT_CONFIG, DEFAULT_LIMITS } from './SPDebugStore';
export type { RedactionCounters } from './SPDebugStore';
export { attachLoggerToStore } from './loggerBridge';
export { attachMultiSiteToStore } from './multiSiteBridge';
export {
  KEEP,
  REDACT,
  REDACTED_MARKER,
  redactValue,
  prepareForCapture,
  estimateBytes,
  emptyRedactionCounters,
  addRedactionCounters,
  DEFAULT_REDACT_KEYS,
} from './redaction';
export type { PreparedPayload } from './redaction';
export { truncatePayload } from './truncate';
export {
  persistState,
  loadPersistedState,
  clearPersistedState,
} from './persistence';
export { exportMarkdown, exportJson } from './exportSession';
export type { ExportedSession } from './exportSession';

export type {
  ResolvedDebugConfig,
  ResolvedDebugLimits,
  SPDebugActivationConfig,
  SPDebugCorrelationId,
  SPDebugDockMode,
  SPDebugEndTraceOptions,
  SPDebugEntry,
  SPDebugEntryType,
  SPDebugExportConfig,
  SPDebugJsonOptions,
  SPDebugLevel,
  SPDebugLimits,
  SPDebugLoggerAttachOptions,
  SPDebugMetric,
  SPDebugMetricOptions,
  SPDebugPanelConfig,
  SPDebugPersistenceConfig,
  SPDebugPersistenceMode,
  SPDebugProviderConfig,
  SPDebugRedactionConfig,
  SPDebugRequireReview,
  SPDebugScope,
  SPDebugSession,
  SPDebugSessionStartOptions,
  SPDebugSessionStopOptions,
  SPDebugSetOptions,
  SPDebugSnapshot,
  SPDebugStartTraceOptions,
  SPDebugStepOptions,
  SPDebugStepStatus,
  SPDebugTable,
  SPDebugTableColumn,
  SPDebugTableOptions,
  SPDebugTimerHandle,
  SPDebugTimerOptions,
  SPDebugTrace,
  SPDebugTraceHandle,
  SPDebugTraceStatus,
  SPDebugTraceStep,
  SPDebugUrlRedactionMode,
} from './SPDebugTypes';
