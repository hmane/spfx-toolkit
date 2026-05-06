/**
 * SPDebug session export.
 *
 * Produces a structured snapshot (`exportJson`) and a Markdown report
 * (`exportMarkdown`) that the panel review modal and `SPDebug.export.*`
 * surface to consumers. The Markdown report is the primary support artifact
 * — designed for users to review and developers to read on a ticket.
 *
 * Sections (Markdown):
 *
 * 1. Summary (timestamps, session label/note, active-at-export marker)
 * 2. Eviction Summary
 * 3. Persistence Warnings (only when present)
 * 4. Timeline (chronological, all entries)
 * 5. Entries grouped by source (same data, different lens)
 * 6. Snapshots (key → JSON)
 * 7. Tables (key → row count + meta)
 * 8. Workflows (traces grouped by `(name, correlationId)`)
 *
 * Originals are never referenced — captured/truncated values are exported.
 *
 * See `docs/SPDebug-Requirements.md` "Search, Copy, and Export".
 */

import { debugStore } from './SPDebugStore';
import type { RedactionCounters } from './redaction';
import type {
  SPDebugEntry,
  SPDebugMetric,
  SPDebugSession,
  SPDebugSnapshot,
  SPDebugTable,
  SPDebugTrace,
} from './SPDebugTypes';

export interface ExportedSession {
  version: string;
  exportedAt: number;
  activeAtExport: boolean;
  app: {
    captureEnabled: boolean;
    panelVisible: boolean;
  };
  session: SPDebugSession | null;
  sessionHistory: SPDebugSession[];
  redactionSummary: RedactionCounters;
  evictionSummary: { evictedCount: number; evictedBytes: number };
  persistenceWarnings: string[];
  entries: SPDebugEntry[];
  snapshots: SPDebugSnapshot[];
  tables: SPDebugTable[];
  metrics: SPDebugMetric[];
  traces: SPDebugTrace[];
}

function snapshotState(): ExportedSession {
  const s = debugStore.getState();
  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    activeAtExport: s.activeSession !== null && s.activeSession.endedAt === null,
    app: {
      captureEnabled: s.captureEnabled,
      panelVisible: s.panelVisible,
    },
    session: s.activeSession,
    sessionHistory: s.sessionHistory,
    redactionSummary: s.redactionSummary,
    evictionSummary: { evictedCount: s.evictedCount, evictedBytes: s.evictedBytes },
    persistenceWarnings: s.persistenceWarnings.slice(),
    entries: s.entries.slice(),
    snapshots: Array.from(s.snapshots.values()),
    tables: Array.from(s.tables.values()),
    metrics: Array.from(s.metrics.values()),
    traces: Array.from(s.traces.values()),
  };
}

export function exportJson(): ExportedSession {
  return snapshotState();
}

// ----------------------------------------------------------------------------
// Markdown helpers — kept private. Markdown export is one function so the
// section order can't drift via accidental reordering of helpers.
// ----------------------------------------------------------------------------

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function fmtBytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  if (ms < 60_000) return (ms / 1000).toFixed(1) + 's';
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return m + 'm ' + s + 's';
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function timelineRow(entry: SPDebugEntry, t0: number): string {
  const dt = entry.timestamp - t0;
  return [
    '| ' + dt,
    entry.level,
    entry.type,
    escapeCell(entry.source),
    escapeCell(entry.message),
  ].join(' | ') + ' |';
}

interface SourceGroup {
  source: string;
  entries: SPDebugEntry[];
}

function groupBySource(entries: SPDebugEntry[]): SourceGroup[] {
  const map = new Map<string, SourceGroup>();
  for (const e of entries) {
    const key = e.source || 'Other';
    if (!map.has(key)) map.set(key, { source: key, entries: [] });
    map.get(key)!.entries.push(e);
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => a.source.localeCompare(b.source));
  return groups;
}

interface CorrelationGroup {
  label: string;
  traces: SPDebugTrace[];
}

function groupTracesByCorrelation(traces: SPDebugTrace[]): CorrelationGroup[] {
  const map = new Map<string, CorrelationGroup>();
  for (const t of traces) {
    const key =
      t.correlationId !== undefined
        ? t.name + ' · ' + String(t.correlationId)
        : t.name + ' · #' + t.traceId.slice(0, 8);
    if (!map.has(key)) map.set(key, { label: key, traces: [] });
    map.get(key)!.traces.push(t);
  }
  const groups = Array.from(map.values());
  groups.forEach((g) => g.traces.sort((a, b) => a.startedAt - b.startedAt));
  groups.sort((a, b) => a.label.localeCompare(b.label));
  return groups;
}

export function exportMarkdown(): string {
  const e = snapshotState();
  const lines: string[] = [];

  // ---- 1. Summary ----
  lines.push('# SPDebug Session Export');
  lines.push('');
  lines.push('Exported at: ' + new Date(e.exportedAt).toISOString());
  lines.push('Toolkit version (export schema): ' + e.version);
  if (e.session) {
    lines.push('Session: ' + e.session.label + ' (' + e.session.id + ')');
    lines.push('Started: ' + new Date(e.session.startedAt).toISOString());
    if (e.session.endedAt) {
      lines.push('Ended: ' + new Date(e.session.endedAt).toISOString());
      lines.push('Duration: ' + fmtDuration(e.session.endedAt - e.session.startedAt));
    } else {
      lines.push(
        '> Session was active at export time. Additional events may have occurred after this export.'
      );
    }
    if (e.session.note) {
      lines.push('');
      lines.push('### User Notes');
      lines.push('');
      lines.push(e.session.note);
    }
  }
  lines.push('');

  // ---- 2. Eviction Summary ----
  lines.push('## Eviction Summary');
  lines.push('- Earlier entries evicted: ' + e.evictionSummary.evictedCount);
  lines.push('- Bytes evicted: ' + fmtBytes(e.evictionSummary.evictedBytes));
  lines.push('');

  // ---- 3. Persistence Warnings ----
  if (e.persistenceWarnings.length > 0) {
    lines.push('## Persistence Warnings');
    for (const w of e.persistenceWarnings) lines.push('- ' + w);
    lines.push('');
  }

  // ---- 4. Timeline ----
  lines.push('## Timeline');
  lines.push('');
  if (e.entries.length === 0) {
    lines.push('_(no entries)_');
  } else {
    lines.push('| +ms | Level | Type | Source | Message |');
    lines.push('|---:|---|---|---|---|');
    const t0 = e.entries[0].timestamp;
    for (const entry of e.entries) lines.push(timelineRow(entry, t0));
  }
  lines.push('');

  // ---- 5. Entries grouped by source ----
  if (e.entries.length > 0) {
    lines.push('## Entries grouped by source');
    lines.push('');
    const t0 = e.entries[0].timestamp;
    for (const group of groupBySource(e.entries)) {
      lines.push('### ' + group.source + ' (' + group.entries.length + ')');
      lines.push('');
      lines.push('| +ms | Level | Type | Message |');
      lines.push('|---:|---|---|---|');
      for (const entry of group.entries) {
        const dt = entry.timestamp - t0;
        const cells = [
          '| ' + dt,
          entry.level,
          entry.type,
          escapeCell(entry.message),
        ].join(' | ');
        lines.push(cells + ' |');
      }
      lines.push('');
    }
  }

  // ---- 6. Snapshots ----
  if (e.snapshots.length > 0) {
    lines.push('## Snapshots');
    lines.push('');
    for (const snap of e.snapshots) {
      lines.push(
        '### ' +
          snap.key +
          '   _(' +
          snap.source +
          ' · ' +
          fmtBytes(snap.bytes) +
          ')_'
      );
      lines.push('');
      lines.push('```json');
      lines.push(safeJson(snap.value));
      lines.push('```');
      lines.push('');
    }
  }

  // ---- 7. Tables ----
  if (e.tables.length > 0) {
    lines.push('## Tables');
    lines.push('');
    lines.push('| Key | Source | Rows | Bytes | Updated |');
    lines.push('|---|---|---:|---:|---|');
    for (const tbl of e.tables) {
      lines.push(
        '| ' +
          escapeCell(tbl.key) +
          ' | ' +
          escapeCell(tbl.source) +
          ' | ' +
          tbl.rows.length +
          ' | ' +
          fmtBytes(tbl.bytes) +
          ' | ' +
          new Date(tbl.updatedAt).toISOString() +
          ' |'
      );
    }
    lines.push('');
  }

  // ---- 8. Workflows ----
  if (e.traces.length > 0) {
    lines.push('## Workflows');
    lines.push('');
    for (const group of groupTracesByCorrelation(e.traces)) {
      lines.push('### ' + group.label);
      lines.push('');
      for (const trace of group.traces) {
        const duration = (trace.endedAt ?? Date.now()) - trace.startedAt;
        const flags: string[] = [];
        if (trace.corrupted) flags.push('corrupted');
        const flagStr = flags.length ? '   _(' + flags.join(', ') + ')_' : '';
        lines.push(
          '- **' +
            trace.name +
            '** [' +
            trace.status +
            '] · ' +
            trace.source +
            ' · ' +
            fmtDuration(duration) +
            ' · ' +
            trace.steps.length +
            ' steps' +
            flagStr
        );
        for (const step of trace.steps) {
          const dt = step.timestamp - trace.startedAt;
          const status = step.status ? ' [' + step.status + ']' : '';
          lines.push('  - +' + dt + 'ms' + status + ' ' + step.label);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
