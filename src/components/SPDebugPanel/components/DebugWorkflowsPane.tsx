/**
 * Workflows tab — traces grouped by `(name, correlationId)` per spec.
 *
 * Status order in each group: running → abandoned → error → warning →
 * success. Steps render as a list with status icons and per-step duration.
 */

import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import type {
  SPDebugTrace,
  SPDebugTraceStatus,
  SPDebugTraceStep,
} from '../../../utilities/debug/SPDebugTypes';
import { formatDuration } from '../panelLogic';
import { writeToClipboard } from '../clipboard';
import { IconButton } from '@fluentui/react/lib/Button';

export interface DebugWorkflowsPaneProps {
  traces: ReadonlyArray<SPDebugTrace>;
}

const statusIcon: Record<SPDebugTraceStatus, { name: string; color: string }> = {
  pending: { name: 'CircleRing', color: '#605e5c' },
  running: { name: 'ProgressRingDots', color: '#0078d4' },
  success: { name: 'CheckMark', color: '#107c10' },
  warning: { name: 'Warning', color: '#a4262c' },
  error: { name: 'StatusErrorFull', color: '#a80000' },
  abandoned: { name: 'CircleAdditionSolid', color: '#8a8886' },
};

function StepRow({
  step,
  baseTime,
}: {
  step: SPDebugTraceStep;
  baseTime: number;
}): React.ReactElement {
  const ico = step.status ? statusIcon[step.status] : statusIcon.pending;
  const dt = step.timestamp - baseTime;
  return (
    <li style={{ listStyle: 'none', padding: '2px 0', display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <Icon
        iconName={ico.name}
        aria-hidden="true"
        styles={{ root: { color: ico.color, fontSize: 12 } }}
      />
      <span style={{ minWidth: 60, fontSize: 11, color: '#605e5c' }}>+{dt}ms</span>
      <span>{step.label}</span>
      {step.subSteps && step.subSteps.length > 0 && (
        <ul style={{ marginLeft: 16, paddingLeft: 0 }}>
          {step.subSteps.map((s, i) => (
            <StepRow key={i} step={s} baseTime={baseTime} />
          ))}
        </ul>
      )}
    </li>
  );
}

const TraceCard: React.FC<{ trace: SPDebugTrace }> = ({ trace }) => {
  const ico = statusIcon[trace.status];
  const duration = (trace.endedAt ?? Date.now()) - trace.startedAt;
  const handleCopy = (): void => {
    try {
      void writeToClipboard(JSON.stringify(trace, null, 2));
    } catch {
      void writeToClipboard(String(trace.traceId));
    }
  };
  return (
    <div
      style={{
        border: '1px solid #edebe9',
        borderLeft: '3px solid ' + ico.color,
        padding: 8,
      }}
    >
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
        <Icon
          iconName={ico.name}
          aria-hidden="true"
          styles={{ root: { color: ico.color, fontSize: 14 } }}
        />
        <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
          {trace.name}
        </Text>
        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
          {trace.source} · {trace.status} · {formatDuration(duration)} · {trace.steps.length} steps
        </Text>
        {trace.corrupted && (
          <Text variant="small" styles={{ root: { color: '#a4262c' } }}>
            corrupted
          </Text>
        )}
        <span style={{ flexGrow: 1 }} />
        <IconButton
          iconProps={{ iconName: 'Copy' }}
          title="Copy trace JSON"
          ariaLabel="Copy trace JSON"
          onClick={handleCopy}
        />
      </Stack>
      <ul style={{ margin: '6px 0 0 0', padding: 0 }}>
        {trace.steps.length === 0 ? (
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            (no steps)
          </Text>
        ) : (
          trace.steps.map((s, i) => (
            <StepRow key={i} step={s} baseTime={trace.startedAt} />
          ))
        )}
      </ul>
    </div>
  );
};

const STATUS_ORDER: SPDebugTraceStatus[] = [
  'running',
  'error',
  'warning',
  'abandoned',
  'success',
  'pending',
];

function statusRank(status: SPDebugTraceStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx < 0 ? STATUS_ORDER.length : idx;
}

interface Group {
  key: string;
  label: string;
  traces: SPDebugTrace[];
}

export const DebugWorkflowsPane: React.FC<DebugWorkflowsPaneProps> = ({ traces }) => {
  const groups = React.useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const t of traces) {
      const key =
        t.correlationId !== undefined
          ? t.name + ' · ' + String(t.correlationId)
          : t.name + ' · #' + t.traceId.slice(0, 8);
      if (!map.has(key)) map.set(key, { key, label: key, traces: [] });
      map.get(key)!.traces.push(t);
    }
    // Sort traces inside each group by start time descending; sort groups by
    // the worst status of any contained trace.
    const list: Group[] = [];
    map.forEach((g) => {
      g.traces.sort((a, b) => b.startedAt - a.startedAt);
      list.push(g);
    });
    list.sort((a, b) => {
      const ar = Math.min(...a.traces.map((t) => statusRank(t.status)));
      const br = Math.min(...b.traces.map((t) => statusRank(t.status)));
      if (ar !== br) return ar - br;
      const at = Math.max(...a.traces.map((t) => t.startedAt));
      const bt = Math.max(...b.traces.map((t) => t.startedAt));
      return bt - at;
    });
    return list;
  }, [traces]);

  if (traces.length === 0) {
    return (
      <div className="spdebug-empty">
        <Text variant="medium">
          No workflows captured. Use <code>SPDebug.startTrace(name, options)</code> or{' '}
          <code>useSPDebugTrace(name, correlationId)</code>.
        </Text>
      </div>
    );
  }

  return (
    <Stack
      tokens={{ childrenGap: 12 }}
      styles={{ root: { padding: 12, overflow: 'auto', flex: 1, minHeight: 0 } }}
    >
      {groups.map((g) => (
        <Stack key={g.key} tokens={{ childrenGap: 6 }}>
          <Text
            variant="small"
            styles={{
              root: {
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#605e5c',
              },
            }}
          >
            {g.label}
          </Text>
          {g.traces.map((t) => (
            <TraceCard key={t.traceId} trace={t} />
          ))}
        </Stack>
      ))}
    </Stack>
  );
};
