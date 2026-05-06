/**
 * SPDebug bounded persistence.
 *
 * Tiered strategy:
 *
 * 1. Persist newest entries that fit within `persistenceMaxBytes`.
 * 2. For entries whose `bytes` exceed `persistenceStripPayloadOver`, persist a
 *    payload-stripped copy (the in-memory copy keeps its capped value).
 * 3. On `QuotaExceededError`, drop the oldest persisted entries and retry up
 *    to a small bounded number of times — never crash the host app.
 * 4. Record a warning string into the store on quota / serialization errors so
 *    the export can surface it.
 *
 * Modes: `'session'` and `'local'` use the matching `Storage`. `'none'` skips
 * persistence entirely.
 *
 * **TODO**: `'custom'` mode currently no-ops. A pluggable storage adapter
 * (`{ getItem, setItem, removeItem }`) would be a small additive change but
 * is not yet wired through the provider config.
 *
 * See `docs/SPDebug-Requirements.md` "Memory, Limits, and Persistence Budget".
 */

import { debugStore } from './SPDebugStore';
import type {
  SPDebugEntry,
  SPDebugPersistenceMode,
  SPDebugSession,
} from './SPDebugTypes';

const STORAGE_KEY = 'spfx-toolkit:spdebug:state:v1';

export interface PersistedDebugState {
  /** Schema version. Bump if the persisted shape changes incompatibly. */
  v: 1;
  /** Wall-clock time of persistence. Compared against `maxAgeMinutes` on load. */
  persistedAt: number;
  entries: SPDebugEntry[];
  evictedCount: number;
  evictedBytes: number;
  activeSession: SPDebugSession | null;
}

function getStorage(mode: SPDebugPersistenceMode): Storage | null {
  if (typeof window === 'undefined') return null;
  if (mode === 'session') return window.sessionStorage || null;
  if (mode === 'local') return window.localStorage || null;
  // 'none' skips persistence; 'custom' is a documented TODO (see file header).
  return null;
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: number };
  if (e.name === 'QuotaExceededError') return true;
  if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
  if (e.code === 22 || e.code === 1014) return true;
  return false;
}

function recordWarning(message: string): void {
  // Best-effort: surface to in-memory ring so the export can show what happened.
  try {
    const recorder = debugStore.getState().recordPersistenceWarning;
    if (typeof recorder === 'function') recorder(message);
  } catch {
    /* ignore */
  }
}

function stripEntryPayload(entry: SPDebugEntry, threshold: number): SPDebugEntry {
  if (entry.bytes === undefined || entry.bytes <= threshold) return entry;
  return {
    ...entry,
    data: `[stripped: payload ~${entry.bytes} bytes exceeded persistence threshold ${threshold} bytes]`,
    bytes: threshold,
  };
}

function applyStripping(state: PersistedDebugState, threshold: number): PersistedDebugState {
  if (threshold <= 0) return state;
  let mutated = false;
  const next: SPDebugEntry[] = new Array(state.entries.length);
  for (let i = 0; i < state.entries.length; i += 1) {
    const stripped = stripEntryPayload(state.entries[i], threshold);
    next[i] = stripped;
    if (stripped !== state.entries[i]) mutated = true;
  }
  return mutated ? { ...state, entries: next } : state;
}

function trimToBudget(state: PersistedDebugState, maxBytes: number): {
  state: PersistedDebugState;
  serialized: string | null;
} {
  // Try whole state. If it fits, ship it.
  let working = state;
  let serialized: string;
  try {
    serialized = JSON.stringify(working);
  } catch {
    return { state: working, serialized: null };
  }

  // Drop oldest entries until under the byte budget OR no more entries.
  while (serialized.length > maxBytes && working.entries.length > 0) {
    working = {
      ...working,
      entries: working.entries.slice(1),
      evictedCount: working.evictedCount + 1,
    };
    try {
      serialized = JSON.stringify(working);
    } catch {
      return { state: working, serialized: null };
    }
  }

  return { state: working, serialized };
}

export function persistState(
  mode: SPDebugPersistenceMode,
  state: PersistedDebugState,
  persistenceMaxBytes: number,
  persistenceStripPayloadOver?: number
): void {
  const storage = getStorage(mode);
  if (!storage) return;

  // 1. Strip large payloads first so the byte budget is spent on more entries
  //    rather than fewer.
  const stripThreshold =
    typeof persistenceStripPayloadOver === 'number' ? persistenceStripPayloadOver : 8 * 1024;
  const stripped = applyStripping(state, stripThreshold);

  // 2. Trim to byte budget by dropping oldest.
  const { state: trimmed, serialized } = trimToBudget(stripped, persistenceMaxBytes);
  if (serialized === null) {
    recordWarning('persist: payload not serializable');
    return;
  }

  // 3. Write. On quota error, halve and retry; never crash.
  let payload = serialized;
  let working = trimmed;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      storage.setItem(STORAGE_KEY, payload);
      return;
    } catch (err) {
      if (!isQuotaError(err)) {
        recordWarning('persist: storage write failed');
        return;
      }
      if (working.entries.length === 0) {
        recordWarning('persist: quota exceeded with no entries to drop');
        return;
      }
      const halfPoint = Math.max(1, Math.floor(working.entries.length / 2));
      const dropped = working.entries.length - halfPoint;
      working = {
        ...working,
        entries: working.entries.slice(-halfPoint),
        evictedCount: working.evictedCount + dropped,
      };
      try {
        payload = JSON.stringify(working);
      } catch {
        recordWarning('persist: payload not serializable after quota retry');
        return;
      }
    }
  }
  recordWarning('persist: gave up after 4 quota retries');
}

export function loadPersistedState(
  mode: SPDebugPersistenceMode,
  maxAgeMinutes: number
): PersistedDebugState | null {
  const storage = getStorage(mode);
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: PersistedDebugState;
  try {
    parsed = JSON.parse(raw) as PersistedDebugState;
  } catch {
    return null;
  }

  if (!parsed || parsed.v !== 1) return null;

  const ageMs = Date.now() - parsed.persistedAt;
  if (ageMs > maxAgeMinutes * 60 * 1000) {
    // Expired. Best-effort cleanup.
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }

  return parsed;
}

export function clearPersistedState(mode: SPDebugPersistenceMode): void {
  const storage = getStorage(mode);
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
