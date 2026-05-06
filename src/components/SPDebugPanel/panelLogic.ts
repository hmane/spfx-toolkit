/**
 * Pure logic helpers for the debug panel.
 *
 * Extracted from the React components so they can be unit tested without
 * a JSDOM environment. The panel UI consumes these directly.
 *
 * See `docs/SPDebug-Requirements.md` "Panel UX" and "Search, Copy, and Export".
 */

import type {
  SPDebugDockMode,
  SPDebugEntry,
  SPDebugEntryType,
  SPDebugLevel,
  SPDebugRequireReview,
} from '../../utilities/debug/SPDebugTypes';

// ----------------------------------------------------------------------------
// Source parsing — Area / Detail
// ----------------------------------------------------------------------------

/**
 * Spec-recommended areas. The panel offers these as the area filter dropdown
 * (any other prefix lands in `Other`).
 */
export const KNOWN_AREAS: ReadonlyArray<string> = [
  'Toolkit',
  'App',
  'User',
  'Service',
  'Site',
  'Other',
];

export interface ParsedSource {
  area: string;
  detail: string;
}

export function parseSource(source: string): ParsedSource {
  if (!source) return { area: 'Other', detail: '' };
  const slash = source.indexOf('/');
  if (slash < 0) return { area: 'Other', detail: source };
  return { area: source.slice(0, slash), detail: source.slice(slash + 1) };
}

// ----------------------------------------------------------------------------
// Filtering
// ----------------------------------------------------------------------------

export interface PanelFilters {
  search: string;
  levels: ReadonlyArray<SPDebugLevel>;
  types: ReadonlyArray<SPDebugEntryType>;
  areas: ReadonlyArray<string>;
  errorsOnly: boolean;
}

export function emptyFilters(): PanelFilters {
  return { search: '', levels: [], types: [], areas: [], errorsOnly: false };
}

function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Test whether an entry matches all active filters.
 *
 * Search is case-insensitive substring match across message, source, type,
 * stringified data, and any string `meta` values.
 */
export function entryMatches(entry: SPDebugEntry, f: PanelFilters): boolean {
  if (f.errorsOnly && entry.level !== 'error' && entry.type !== 'error') {
    return false;
  }
  if (f.levels.length > 0 && f.levels.indexOf(entry.level) < 0) return false;
  if (f.types.length > 0 && f.types.indexOf(entry.type) < 0) return false;
  if (f.areas.length > 0) {
    const area = parseSource(entry.source).area;
    if (f.areas.indexOf(area) < 0) return false;
  }
  if (f.search) {
    const needle = f.search.toLowerCase();
    const haystack: string[] = [
      entry.message,
      entry.source,
      entry.type,
      safeStringify(entry.data),
    ];
    if (entry.meta) {
      for (const v of Object.values(entry.meta)) {
        if (typeof v === 'string') haystack.push(v);
        else if (typeof v === 'number' || typeof v === 'boolean') haystack.push(String(v));
      }
    }
    const text = haystack.join(' ').toLowerCase();
    if (text.indexOf(needle) < 0) return false;
  }
  return true;
}

export function filterEntries(
  entries: ReadonlyArray<SPDebugEntry>,
  f: PanelFilters
): SPDebugEntry[] {
  return entries.filter((e) => entryMatches(e, f));
}

// ----------------------------------------------------------------------------
// Review-before-export gating
// ----------------------------------------------------------------------------

export function shouldRequireReview(
  requireReview: SPDebugRequireReview,
  environment?: 'dev' | 'uat' | 'prod'
): boolean {
  if (requireReview === 'always') return true;
  if (requireReview === 'never') return false;
  return environment === 'prod';
}

// ----------------------------------------------------------------------------
// Panel preferences (dock mode + sizes + selected tab)
// ----------------------------------------------------------------------------

export const PREFS_STORAGE_KEY = 'spfx-toolkit:spdebug:panel-prefs:v1';

export interface PanelPrefs {
  dock: SPDebugDockMode;
  rightWidth: number;
  bottomHeight: number;
  selectedTab: string;
}

export const DEFAULT_PANEL_PREFS: PanelPrefs = {
  dock: 'right',
  rightWidth: 640,
  bottomHeight: 420,
  selectedTab: 'console',
};

export const RIGHT_WIDTH_MIN = 320;
export const RIGHT_WIDTH_MAX = 1200;
export const BOTTOM_HEIGHT_MIN = 200;
export const BOTTOM_HEIGHT_MAX = 800;

const VALID_TABS = ['console', 'data', 'workflows', 'settings'];

export function normalizeSelectedTab(tab: unknown): string {
  if (tab === 'timeline' || tab === 'errors') return 'console';
  if (tab === 'snapshots' || tab === 'tables') return 'data';
  if (tab === 'overview' || tab === 'context') return 'settings';
  return typeof tab === 'string' && VALID_TABS.indexOf(tab) >= 0
    ? tab
    : DEFAULT_PANEL_PREFS.selectedTab;
}

export function clampRightWidth(px: number): number {
  if (Number.isNaN(px)) return DEFAULT_PANEL_PREFS.rightWidth;
  return Math.max(RIGHT_WIDTH_MIN, Math.min(RIGHT_WIDTH_MAX, Math.round(px)));
}

export function clampBottomHeight(px: number): number {
  if (Number.isNaN(px)) return DEFAULT_PANEL_PREFS.bottomHeight;
  return Math.max(BOTTOM_HEIGHT_MIN, Math.min(BOTTOM_HEIGHT_MAX, Math.round(px)));
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

export function loadPanelPrefs(): PanelPrefs {
  const storage = getStorage();
  if (!storage) return DEFAULT_PANEL_PREFS;
  let raw: string | null;
  try {
    raw = storage.getItem(PREFS_STORAGE_KEY);
  } catch {
    return DEFAULT_PANEL_PREFS;
  }
  if (!raw) return DEFAULT_PANEL_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<PanelPrefs>;
    return {
      dock: parsed.dock === 'bottom' ? 'bottom' : 'right',
      rightWidth: clampRightWidth(
        typeof parsed.rightWidth === 'number'
          ? parsed.rightWidth
          : DEFAULT_PANEL_PREFS.rightWidth
      ),
      bottomHeight: clampBottomHeight(
        typeof parsed.bottomHeight === 'number'
          ? parsed.bottomHeight
          : DEFAULT_PANEL_PREFS.bottomHeight
      ),
      selectedTab: normalizeSelectedTab(parsed.selectedTab),
    };
  } catch {
    return DEFAULT_PANEL_PREFS;
  }
}

export function savePanelPrefs(prefs: PanelPrefs): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage may be full or disabled. Never crash the host app.
  }
}

// ----------------------------------------------------------------------------
// Misc helpers
// ----------------------------------------------------------------------------

export function formatDuration(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + 'm ' + s + 's';
}

export function formatBytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

export function relTime(timestamp: number, t0: number): string {
  const dt = timestamp - t0;
  if (dt < 1000) return '+' + dt + 'ms';
  return '+' + (dt / 1000).toFixed(2) + 's';
}

// ----------------------------------------------------------------------------
// Workflow grouping helpers (pure logic, testable)
// ----------------------------------------------------------------------------

import type {
  SPDebugTrace,
  SPDebugTraceStatus,
} from '../../utilities/debug/SPDebugTypes';

export interface TraceGroup {
  key: string;
  label: string;
  traces: SPDebugTrace[];
}

// Worst-first: still-running and failures appear at the top of the list.
export const TRACE_STATUS_ORDER: SPDebugTraceStatus[] = [
  'running',
  'error',
  'warning',
  'abandoned',
  'success',
  'pending',
];

export function traceStatusRank(status: SPDebugTraceStatus): number {
  const idx = TRACE_STATUS_ORDER.indexOf(status);
  return idx < 0 ? TRACE_STATUS_ORDER.length : idx;
}

export function groupTracesByCorrelation(
  traces: ReadonlyArray<SPDebugTrace>
): TraceGroup[] {
  const map = new Map<string, TraceGroup>();
  for (const t of traces) {
    const key =
      t.correlationId !== undefined
        ? t.name + ' · ' + String(t.correlationId)
        : t.name + ' · #' + t.traceId.slice(0, 8);
    if (!map.has(key)) map.set(key, { key, label: key, traces: [] });
    map.get(key)!.traces.push(t);
  }
  const list: TraceGroup[] = [];
  map.forEach((g) => {
    g.traces.sort((a, b) => b.startedAt - a.startedAt);
    list.push(g);
  });
  list.sort((a, b) => {
    const ar = Math.min(...a.traces.map((t) => traceStatusRank(t.status)));
    const br = Math.min(...b.traces.map((t) => traceStatusRank(t.status)));
    if (ar !== br) return ar - br;
    const at = Math.max(...a.traces.map((t) => t.startedAt));
    const bt = Math.max(...b.traces.map((t) => t.startedAt));
    return bt - at;
  });
  return list;
}
