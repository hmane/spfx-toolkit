/**
 * Main SPDebug panel.
 *
 * Loaded only via dynamic import from `SPDebugProvider` when
 * `panelVisible === true`. The panel is bootstrap-only chrome around the
 * singleton store — it owns no debug state itself, only UI preferences.
 *
 * Per spec: Fluent UI only, right + bottom dock, lazy-loaded, no DevExtreme,
 * no floating mode in v1.
 */

import * as React from 'react';
import { DefaultButton, IconButton } from '@fluentui/react/lib/Button';
import { Text } from '@fluentui/react/lib/Text';
import './SPDebugPanel.css';

import { SPDebug, debugStore } from '../../utilities/debug';
import type {
  SPDebugDockMode,
  SPDebugEntry,
} from '../../utilities/debug/SPDebugTypes';

import { useDebugStore } from './hooks/useDebugStore';
import {
  PanelFilters,
  clampBottomHeight,
  clampRightWidth,
  emptyFilters,
  loadPanelPrefs,
  savePanelPrefs,
  shouldRequireReview,
} from './panelLogic';

import { DebugToolbar } from './components/DebugToolbar';
import { DebugSessionControls } from './components/DebugSessionControls';
import { DebugExportDialog } from './components/DebugExportDialog';
import { DebugResizeHandle } from './components/DebugResizeHandle';
import {
  DebugConsoleList,
  buildConsoleItems,
  filterConsoleItems,
} from './components/DebugConsoleList';

// Selectors: each component reads only what it needs.
const selectEntries = (s: ReturnType<typeof debugStore.getState>): SPDebugEntry[] =>
  s.entries;
const selectActiveSession = (s: ReturnType<typeof debugStore.getState>) =>
  s.activeSession;
const selectConfig = (s: ReturnType<typeof debugStore.getState>) => s.config;
const selectSnapshotsMap = (s: ReturnType<typeof debugStore.getState>) => s.snapshots;
const selectTablesMap = (s: ReturnType<typeof debugStore.getState>) => s.tables;
const selectTracesMap = (s: ReturnType<typeof debugStore.getState>) => s.traces;
const selectMetricsMap = (s: ReturnType<typeof debugStore.getState>) => s.metrics;

const SPDebugPanel: React.FC = () => {
  const entries = useDebugStore(selectEntries);
  const activeSession = useDebugStore(selectActiveSession);
  const config = useDebugStore(selectConfig);
  const snapshotsMap = useDebugStore(selectSnapshotsMap);
  const tablesMap = useDebugStore(selectTablesMap);
  const tracesMap = useDebugStore(selectTracesMap);
  const metricsMap = useDebugStore(selectMetricsMap);
  const snapshots = React.useMemo(() => Array.from(snapshotsMap.values()), [snapshotsMap]);
  const tables = React.useMemo(() => Array.from(tablesMap.values()), [tablesMap]);
  const traces = React.useMemo(() => Array.from(tracesMap.values()), [tracesMap]);
  const metrics = React.useMemo(() => Array.from(metricsMap.values()), [metricsMap]);

  // Local UI state — preferences persisted in session storage.
  const initialPrefs = React.useMemo(loadPanelPrefs, []);
  const [dock, setDock] = React.useState<SPDebugDockMode>(initialPrefs.dock);
  const [rightWidth, setRightWidth] = React.useState<number>(initialPrefs.rightWidth);
  const [bottomHeight, setBottomHeight] = React.useState<number>(
    initialPrefs.bottomHeight
  );
  const [filters, setFilters] = React.useState<PanelFilters>(emptyFilters);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);

  // Persist UI prefs whenever they change.
  React.useEffect(() => {
    savePanelPrefs({ dock, rightWidth, bottomHeight, selectedTab: 'console' });
  }, [dock, rightWidth, bottomHeight]);

  const consoleItems = React.useMemo(
    () => buildConsoleItems({ entries, snapshots, tables, metrics, traces }),
    [entries, snapshots, tables, metrics, traces]
  );
  const filtered = React.useMemo(
    () => filterConsoleItems(consoleItems, filters),
    [consoleItems, filters]
  );

  const reviewRequired = shouldRequireReview(
    config.export.requireReview,
    config.environment
  );

  // Shell positioning.
  const shellStyle: React.CSSProperties = isMaximized
    ? { width: '100vw', height: '100vh' }
    : dock === 'right'
    ? { width: rightWidth, height: '100vh' }
    : { height: bottomHeight, width: '100vw' };

  const close = (): void => SPDebug.hidePanel();
  const clearEntries = (): void => {
    debugStore.setState({
      entries: [],
      snapshots: new Map(),
      tables: new Map(),
      metrics: new Map(),
      traces: new Map(),
      correlationIndex: new Map(),
      estimatedBytesInMemory: 0,
    });
  };

  return (
    <div
      className={
        'spdebug-panel-shell spdebug-dock-' +
        dock +
        (isMaximized ? ' spdebug-maximized' : '')
      }
      style={shellStyle}
      role="dialog"
      aria-label="SPDebug panel"
    >
      {!isMaximized && dock === 'right' && (
        <DebugResizeHandle
          orientation="vertical"
          ariaLabel="Resize panel width"
          startSize={() => rightWidth}
          onResize={(px) => setRightWidth(clampRightWidth(px))}
        />
      )}
      {!isMaximized && dock === 'bottom' && (
        <DebugResizeHandle
          orientation="horizontal"
          ariaLabel="Resize panel height"
          startSize={() => bottomHeight}
          onResize={(px) => setBottomHeight(clampBottomHeight(px))}
        />
      )}

      <div className="spdebug-header">
        <div className="spdebug-title">
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            SPDebug Console
          </Text>
        </div>
        <div className="spdebug-header-actions">
          <DefaultButton
            iconProps={{ iconName: 'Download' }}
            text="Export"
            ariaLabel="Export debug session"
            onClick={() => setExportOpen(true)}
          />
          <IconButton
            iconProps={{ iconName: 'Clear' }}
            title="Clear all entries"
            ariaLabel="Clear all entries"
            onClick={clearEntries}
          />
          <IconButton
            iconProps={{ iconName: dock === 'right' ? 'DockBottom' : 'DockRight' }}
            title={dock === 'right' ? 'Move to bottom' : 'Move to right'}
            ariaLabel={dock === 'right' ? 'Move to bottom' : 'Move to right'}
            onClick={() => {
              setIsMaximized(false);
              setDock(dock === 'right' ? 'bottom' : 'right');
            }}
          />
          <IconButton
            iconProps={{ iconName: isMaximized ? 'BackToWindow' : 'FullScreen' }}
            title={isMaximized ? 'Restore panel' : 'Maximize panel'}
            ariaLabel={isMaximized ? 'Restore panel' : 'Maximize panel'}
            onClick={() => setIsMaximized((v) => !v)}
          />
          <IconButton
            iconProps={{ iconName: 'ChromeClose' }}
            title="Close panel"
            ariaLabel="Close panel"
            onClick={close}
          />
        </div>
      </div>

      <DebugToolbar
        filters={filters}
        onFiltersChange={setFilters}
        entryCount={consoleItems.length}
        filteredCount={filtered.length}
      />

      <div className="spdebug-panel-content">
        <DebugConsoleList items={filtered} />
      </div>

      <DebugSessionControls active={activeSession} entryCount={entries.length} />

      <DebugExportDialog
        hidden={!exportOpen}
        reviewRequired={reviewRequired}
        onDismiss={() => setExportOpen(false)}
      />
    </div>
  );
};

export default SPDebugPanel;
export { SPDebugPanel };
