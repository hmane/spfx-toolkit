/**
 * Unified console stream.
 *
 * Every captured diagnostic is rendered as a chronological console row. The
 * runtime can still keep keyed maps internally, but the UI presents one mental
 * model: logs with different row templates.
 */

import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { IconButton } from '@fluentui/react/lib/Button';
import { Text } from '@fluentui/react/lib/Text';
import type {
  SPDebugEntry,
  SPDebugLevel,
  SPDebugMetric,
  SPDebugSnapshot,
  SPDebugTable,
  SPDebugTrace,
  SPDebugTraceStatus,
} from '../../../utilities/debug/SPDebugTypes';
import type { PanelFilters } from '../panelLogic';
import { formatBytes, formatDuration } from '../panelLogic';
import { DebugJsonViewer } from './DebugJsonViewer';
import { writeToClipboard } from '../clipboard';

type ConsoleKind = 'log' | 'snapshot' | 'table' | 'metric' | 'workflow';

export interface ConsoleItem {
  id: string;
  kind: ConsoleKind;
  timestamp: number;
  source: string;
  file?: string;
  level: SPDebugLevel;
  title: string;
  subtitle: string;
  searchText: string;
  entry?: SPDebugEntry;
  snapshot?: SPDebugSnapshot;
  table?: SPDebugTable;
  metric?: SPDebugMetric;
  trace?: SPDebugTrace;
}

const levelIcon: Record<SPDebugLevel, { name: string; color: string }> = {
  debug: { name: 'Bug', color: '#737373' },
  info: { name: 'Info', color: '#0078d4' },
  warn: { name: 'Warning', color: '#a4262c' },
  error: { name: 'StatusErrorFull', color: '#a80000' },
  success: { name: 'CheckMark', color: '#107c10' },
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function stringifyForSearch(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function areaOf(source: string): string {
  const slash = source.indexOf('/');
  if (slash < 0) return 'Other';
  return source.slice(0, slash);
}

function levelFromTrace(status: SPDebugTraceStatus): SPDebugLevel {
  if (status === 'error') return 'error';
  if (status === 'warning' || status === 'abandoned') return 'warn';
  if (status === 'success') return 'success';
  return 'info';
}

function traceDuration(trace: SPDebugTrace): string {
  return formatDuration((trace.endedAt ?? Date.now()) - trace.startedAt);
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function sourceFileFrom(
  data: unknown,
  meta?: Record<string, unknown>
): string | undefined {
  const obj =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : undefined;

  return (
    pickString(meta?.file) ||
    pickString(meta?.fileName) ||
    pickString(meta?.sourceFile) ||
    pickString(meta?.sourcePath) ||
    pickString(meta?.componentFile) ||
    pickString(obj?.file) ||
    pickString(obj?.fileName) ||
    pickString(obj?.sourceFile) ||
    pickString(obj?.sourcePath) ||
    pickString(obj?.componentFile)
  );
}

export function buildConsoleItems(input: {
  entries: ReadonlyArray<SPDebugEntry>;
  snapshots: ReadonlyArray<SPDebugSnapshot>;
  tables: ReadonlyArray<SPDebugTable>;
  metrics: ReadonlyArray<SPDebugMetric>;
  traces: ReadonlyArray<SPDebugTrace>;
}): ConsoleItem[] {
  const items: ConsoleItem[] = [];

  for (const entry of input.entries) {
    const file = sourceFileFrom(entry.data, entry.meta);
    items.push({
      id: 'entry:' + entry.id,
      kind: 'log',
      timestamp: entry.timestamp,
      source: entry.source,
      file,
      level: entry.level,
      title: entry.message,
      subtitle: entry.type,
      searchText: [
        entry.message,
        entry.source,
        file,
        entry.type,
        entry.level,
        stringifyForSearch(entry.data),
        stringifyForSearch(entry.meta),
      ].join(' '),
      entry,
    });
  }

  for (const snapshot of input.snapshots) {
    const file = sourceFileFrom(snapshot.value, snapshot.meta);
    items.push({
      id: 'snapshot:' + snapshot.key,
      kind: 'snapshot',
      timestamp: snapshot.updatedAt,
      source: snapshot.source,
      file,
      level: 'info',
      title: snapshot.key,
      subtitle: 'snapshot · ' + formatBytes(snapshot.bytes),
      searchText: [
        snapshot.key,
        snapshot.source,
        file,
        stringifyForSearch(snapshot.value),
        stringifyForSearch(snapshot.meta),
      ].join(' '),
      snapshot,
    });
  }

  for (const table of input.tables) {
    const file = sourceFileFrom(undefined, table.meta);
    items.push({
      id: 'table:' + table.key,
      kind: 'table',
      timestamp: table.updatedAt,
      source: table.source,
      file,
      level: 'info',
      title: table.key,
      subtitle: 'table · ' + table.rows.length + ' rows · ' + formatBytes(table.bytes),
      searchText: [
        table.key,
        table.source,
        file,
        stringifyForSearch(table.rows),
        stringifyForSearch(table.meta),
      ].join(' '),
      table,
    });
  }

  for (const metric of input.metrics) {
    const file = sourceFileFrom(undefined, metric.meta);
    items.push({
      id: 'metric:' + metric.key,
      kind: 'metric',
      timestamp: metric.updatedAt,
      source: metric.source,
      file,
      level: 'info',
      title: metric.key,
      subtitle: 'metric · ' + String(metric.value),
      searchText: [
        metric.key,
        metric.source,
        file,
        String(metric.value),
        stringifyForSearch(metric.meta),
      ].join(' '),
      metric,
    });
  }

  for (const trace of input.traces) {
    const file = trace.steps
      .map((step) => sourceFileFrom(step.data))
      .find((value): value is string => !!value);
    items.push({
      id: 'trace:' + trace.traceId,
      kind: 'workflow',
      timestamp: trace.endedAt ?? trace.startedAt,
      source: trace.source,
      file,
      level: levelFromTrace(trace.status),
      title: trace.name,
      subtitle:
        'workflow · ' +
        trace.status +
        ' · ' +
        traceDuration(trace) +
        ' · ' +
        trace.steps.length +
        ' steps',
      searchText: [
        trace.name,
        trace.source,
        file,
        trace.status,
        String(trace.correlationId ?? ''),
        stringifyForSearch(trace.steps),
      ].join(' '),
      trace,
    });
  }

  items.sort((a, b) => a.timestamp - b.timestamp);
  return items;
}

export function filterConsoleItems(
  items: ReadonlyArray<ConsoleItem>,
  filters: PanelFilters
): ConsoleItem[] {
  return items.filter((item) => {
    if (filters.errorsOnly && item.level !== 'error') return false;
    if (filters.levels.length > 0 && filters.levels.indexOf(item.level) < 0) {
      return false;
    }
    if (filters.types.length > 0) {
      const type = item.entry?.type ?? item.kind;
      if (filters.types.indexOf(type as never) < 0) return false;
    }
    if (filters.areas.length > 0 && filters.areas.indexOf(areaOf(item.source)) < 0) {
      return false;
    }
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      if (item.searchText.toLowerCase().indexOf(needle) < 0) return false;
    }
    return true;
  });
}

function copyValue(value: unknown): void {
  void writeToClipboard(typeof value === 'string' ? value : safeJson(value));
}

function TablePreview({ table }: { table: SPDebugTable }): React.ReactElement {
  const rows = table.rows.slice(0, 8);
  const first = rows[0];
  const columns =
    table.columns && table.columns.length > 0
      ? table.columns.map((c) => c.key)
      : first && typeof first === 'object' && !Array.isArray(first)
      ? Object.keys(first as Record<string, unknown>).slice(0, 8)
      : ['value'];

  return (
    <div className="spdebug-console-table-wrap">
      <table className="spdebug-console-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => {
                const value =
                  row && typeof row === 'object' && !Array.isArray(row)
                    ? (row as Record<string, unknown>)[column]
                    : row;
                return <td key={column}>{stringifyForSearch(value)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {table.rows.length > rows.length && (
        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
          Showing {rows.length} of {table.rows.length} rows
        </Text>
      )}
    </div>
  );
}

function TracePreview({ trace }: { trace: SPDebugTrace }): React.ReactElement {
  return (
    <ol className="spdebug-console-steps">
      {trace.steps.length === 0 ? (
        <li className="spdebug-console-muted">(no steps)</li>
      ) : (
        trace.steps.map((step, index) => (
          <li key={index}>
            <span className="spdebug-console-time">+{step.timestamp - trace.startedAt}ms</span>
            <span>{step.label}</span>
          </li>
        ))
      )}
    </ol>
  );
}

function ConsoleDetails({ item }: { item: ConsoleItem }): React.ReactElement | null {
  if (item.entry) {
    if (item.entry.data === undefined && !item.entry.meta) return null;
    return (
      <div className="spdebug-console-details">
        {item.entry.data !== undefined && (
          <DebugJsonViewer
            value={item.entry.data}
            rootLabel="data"
            onCopyPath={(path) => void writeToClipboard(path)}
            onCopyValue={copyValue}
          />
        )}
        {item.entry.meta && (
          <DebugJsonViewer
            value={item.entry.meta}
            rootLabel="meta"
            onCopyPath={(path) => void writeToClipboard(path)}
            onCopyValue={copyValue}
          />
        )}
      </div>
    );
  }
  if (item.snapshot) {
    return (
      <div className="spdebug-console-details">
        <DebugJsonViewer
          value={item.snapshot.value}
          rootLabel={item.snapshot.key}
          onCopyPath={(path) => void writeToClipboard(path)}
          onCopyValue={copyValue}
        />
      </div>
    );
  }
  if (item.table) {
    return <TablePreview table={item.table} />;
  }
  if (item.metric) {
    return (
      <div className="spdebug-console-details">
        <DebugJsonViewer
          value={{ value: item.metric.value, meta: item.metric.meta }}
          rootLabel={item.metric.key}
          onCopyPath={(path) => void writeToClipboard(path)}
          onCopyValue={copyValue}
        />
      </div>
    );
  }
  if (item.trace) {
    return <TracePreview trace={item.trace} />;
  }
  return null;
}

function ConsoleRow({ item }: { item: ConsoleItem }): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);
  const icon = levelIcon[item.level] || levelIcon.info;
  const kind = item.entry?.type ?? item.kind;
  const meta = [
    item.source,
    item.file,
    kind !== 'log' ? kind : undefined,
    item.subtitle,
  ].filter(Boolean).join(' · ');

  return (
    <div className={'spdebug-console-row spdebug-console-' + item.level}>
      <button
        type="button"
        className="spdebug-console-summary"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <Icon
          iconName={icon.name}
          aria-hidden="true"
          styles={{ root: { color: icon.color, fontSize: 14 } }}
        />
        <span className="spdebug-console-main">
          <span className="spdebug-console-title">{item.title}</span>
          <span className="spdebug-console-meta">{meta}</span>
        </span>
      </button>
      <IconButton
        className="spdebug-console-copy"
        iconProps={{ iconName: 'Copy' }}
        title="Copy row JSON"
        ariaLabel="Copy row JSON"
        onClick={() =>
          copyValue(item.entry || item.snapshot || item.table || item.metric || item.trace)
        }
      />
      {expanded && <ConsoleDetails item={item} />}
    </div>
  );
}

export const DebugConsoleList: React.FC<{
  items: ReadonlyArray<ConsoleItem>;
}> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="spdebug-empty">
        <Text variant="medium">No console entries match the current filters.</Text>
      </div>
    );
  }
  return (
    <div className="spdebug-console-list">
      {items.map((item) => (
        <ConsoleRow key={item.id} item={item} />
      ))}
    </div>
  );
};
