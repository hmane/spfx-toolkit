/**
 * Main SPDebug panel.
 *
 * Loaded only via dynamic import from `SPDebugProvider` when
 * `panelVisible === true`. The panel is bootstrap-only chrome around the
 * singleton store — it owns no debug state itself, only UI preferences.
 *
 * Per spec: Fluent UI only, right + bottom dock, lazy-loaded, no DevExtreme,
 * no floating mode in v1.
 *
 * Tabs:
 *  - Console   — timeline entries (existing DebugConsoleList)
 *  - Data      — snapshots + tables (existing DebugTablesPane / DebugSnapshotsPane)
 *  - Workflows — traces (existing DebugWorkflowsPane)
 *  - Network   — REST/fetch inspector (new DebugNetworkPane)
 *  - Perms     — permission checks (new DebugPermissionsPane)
 *  - Fields    — SPDynamicForm field inspector (new DebugFieldInspectorPane)
 */

import * as React from 'react';
import { DefaultButton, IconButton } from '@fluentui/react/lib/Button';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Text } from '@fluentui/react/lib/Text';
import './SPDebugPanel.css';

import { SPDebug, debugStore } from '../../utilities/debug';
import type {
  SPDebugDockMode,
  SPDebugEntry,
} from '../../utilities/debug/SPDebugTypes';

import { NETWORK_TABLE_KEY } from '../../utilities/debug/httpBridge';

import { useDebugStore } from './hooks/useDebugStore';
import {
  PanelFilters,
  clampBottomHeight,
  clampRightWidth,
  emptyFilters,
  loadPanelPrefs,
  normalizeSelectedTab,
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
import { DebugTablesPane } from './components/DebugTablesPane';
import { DebugSnapshotsPane } from './components/DebugSnapshotsPane';
import { DebugWorkflowsPane } from './components/DebugWorkflowsPane';
import { DebugNetworkPane } from './components/DebugNetworkPane';
import { DebugPermissionsPane, PERMISSIONS_TABLE_KEY } from './components/DebugPermissionsPane';
import { DebugFieldInspectorPane, FORM_FIELDS_TABLE_KEY } from './components/DebugFieldInspectorPane';

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

function uniqueSorted(values: ReadonlyArray<string | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) =>
    a.localeCompare(b)
  );
}

const SPDebugPanel: React.FC = () => {
  const entries = useDebugStore(selectEntries);
  const activeSession = useDebugStore(selectActiveSession);
  const config = useDebugStore(selectConfig);
  const snapshotsMap = useDebugStore(selectSnapshotsMap);
  const tablesMap = useDebugStore(selectTablesMap);
  const tracesMap = useDebugStore(selectTracesMap);
  const metricsMap = useDebugStore(selectMetricsMap);
  const snapshots = React.useMemo(() => Array.from(snapshotsMap.values()), [snapshotsMap]);
  const tables = React.useMemo(
    () => Array.from(tablesMap.values()).filter(
      (t) => t.key !== NETWORK_TABLE_KEY && t.key !== PERMISSIONS_TABLE_KEY && t.key !== FORM_FIELDS_TABLE_KEY
    ),
    [tablesMap]
  );
  const traces = React.useMemo(() => Array.from(tracesMap.values()), [tracesMap]);
  const metrics = React.useMemo(() => Array.from(metricsMap.values()), [metricsMap]);

  // Dedicated store slices for special tabs.
  const networkTable = React.useMemo(() => tablesMap.get(NETWORK_TABLE_KEY), [tablesMap]);
  const permissionsTable = React.useMemo(() => tablesMap.get(PERMISSIONS_TABLE_KEY), [tablesMap]);
  const fieldInspectorTable = React.useMemo(() => tablesMap.get(FORM_FIELDS_TABLE_KEY), [tablesMap]);

  // Local UI state — preferences persisted in session storage.
  const initialPrefs = React.useMemo(loadPanelPrefs, []);
  const [dock, setDock] = React.useState<SPDebugDockMode>(initialPrefs.dock);
  const [rightWidth, setRightWidth] = React.useState<number>(initialPrefs.rightWidth);
  const [bottomHeight, setBottomHeight] = React.useState<number>(
    initialPrefs.bottomHeight
  );
  const [filters, setFilters] = React.useState<PanelFilters>(initialPrefs.filters || emptyFilters());
  const [selectedTab, setSelectedTab] = React.useState<string>(
    normalizeSelectedTab(initialPrefs.selectedTab)
  );
  const [exportOpen, setExportOpen] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);

  // Persist UI prefs whenever they change.
  React.useEffect(() => {
    savePanelPrefs({ dock, rightWidth, bottomHeight, selectedTab, filters });
  }, [dock, rightWidth, bottomHeight, selectedTab, filters]);

  const consoleItems = React.useMemo(
    () => buildConsoleItems({ entries, snapshots, tables: Array.from(tablesMap.values()), metrics, traces }),
    [entries, snapshots, tablesMap, metrics, traces]
  );
  const filtered = React.useMemo(
    () => filterConsoleItems(consoleItems, filters),
    [consoleItems, filters]
  );
  const originOptions = React.useMemo(
    () => uniqueSorted(consoleItems.map((item) => item.origin)),
    [consoleItems]
  );
  const sourceOptions = React.useMemo(
    () => uniqueSorted(consoleItems.map((item) => item.source)),
    [consoleItems]
  );
  const componentOptions = React.useMemo(
    () => uniqueSorted(consoleItems.map((item) => item.component)),
    [consoleItems]
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

  // Network row count for badge.
  const networkRowCount = networkTable ? networkTable.rows.length : 0;
  const permissionsRowCount = permissionsTable ? permissionsTable.rows.length : 0;
  const fieldRowCount = fieldInspectorTable ? fieldInspectorTable.rows.length : 0;

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

      {selectedTab === 'console' && (
        <DebugToolbar
          filters={filters}
          onFiltersChange={setFilters}
          entryCount={consoleItems.length}
          filteredCount={filtered.length}
          origins={originOptions}
          sources={sourceOptions}
          components={componentOptions}
        />
      )}

      <div className="spdebug-panel-content">
        <Pivot
          selectedKey={selectedTab}
          onLinkClick={(item) => {
            if (item?.props.itemKey) setSelectedTab(item.props.itemKey);
          }}
          aria-label="Debug panel tabs"
          styles={{ root: { borderBottom: '1px solid #edebe9', flexShrink: 0 } }}
        >
          <PivotItem headerText="Console" itemKey="console" />
          <PivotItem headerText="Data" itemKey="data" />
          <PivotItem headerText="Workflows" itemKey="workflows" />
          <PivotItem
            headerText={'Network' + (networkRowCount > 0 ? ' (' + networkRowCount + ')' : '')}
            itemKey="network"
          />
          <PivotItem
            headerText={'Perms' + (permissionsRowCount > 0 ? ' (' + permissionsRowCount + ')' : '')}
            itemKey="permissions"
          />
          <PivotItem
            headerText={'Fields' + (fieldRowCount > 0 ? ' (' + fieldRowCount + ')' : '')}
            itemKey="fields"
          />
        </Pivot>

        <div className="spdebug-tab-pane">
          {selectedTab === 'console' && <DebugConsoleList items={filtered} />}
          {selectedTab === 'data' && (
            <div className="spdebug-data-pane">
              <div className="spdebug-data-section">
                <div className="spdebug-section-heading">
                  <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                    Snapshots
                  </Text>
                  <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                    {snapshots.length}
                  </Text>
                </div>
                <DebugSnapshotsPane snapshots={snapshots} />
              </div>
              <div className="spdebug-data-section">
                <div className="spdebug-section-heading">
                  <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                    Tables
                  </Text>
                  <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                    {tables.length}
                  </Text>
                </div>
                <DebugTablesPane tables={tables} />
              </div>
            </div>
          )}
          {selectedTab === 'workflows' && (
            <DebugWorkflowsPane traces={traces} />
          )}
          {selectedTab === 'network' && (
            <DebugNetworkPane networkTable={networkTable} />
          )}
          {selectedTab === 'permissions' && (
            <DebugPermissionsPane permissionsTable={permissionsTable} />
          )}
          {selectedTab === 'fields' && (
            <DebugFieldInspectorPane fieldInspectorTable={fieldInspectorTable} />
          )}
        </div>
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
