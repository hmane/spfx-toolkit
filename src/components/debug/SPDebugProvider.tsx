/**
 * `SPDebugProvider` — bootstrap-only.
 *
 * Per the spec, this component does NOT own debug state. The singleton store
 * (in `utilities/debug`) is the source of truth. The provider's job is to:
 *
 * 1. Apply activation rules and production gating.
 * 2. Apply config to the store.
 * 3. Attach the primary logger sink (and, when supplied, multi-site loggers).
 * 4. Bind keyboard shortcuts (configurable; subject to `enabled={false}` and
 *    production gating).
 * 5. Register page lifecycle handlers — `pagehide` calls
 *    `SPDebug.abandonRunningTraces()` to honor the refresh boundary, then
 *    persists bounded state.
 * 6. Claim primary-provider role; secondary providers no-op all bootstrap so
 *    multi-webpart pages share one panel.
 *
 * The panel chunk is loaded only when `panelVisible === true`. Closing the
 * panel does NOT stop capture — capture and panel visibility are independent
 * states.
 *
 * **Hard kill switch**: passing `enabled={false}` overrides every other
 * activation method (URL flag, session storage, programmatic
 * `SPDebug.enable()`, shortcuts). It is intended for app-level kill switches
 * triggered by feature flags or auth checks.
 */

import * as React from 'react';
import {
  attachLoggerToStore,
  attachMultiSiteToStore,
  clearPersistedState,
  debugStore,
  DEFAULT_CONFIG,
  DEFAULT_LIMITS,
  loadPersistedState,
  persistState,
  SPDebug,
} from '../../utilities/debug';
import type {
  ResolvedDebugConfig,
  SPDebugProviderConfig,
} from '../../utilities/debug/SPDebugTypes';
import type {
  ISiteContext,
  Logger,
  SiteLifecycleEvent,
} from '../../utilities/context/types';

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------

interface SitesAPILike {
  list(): string[];
  get(siteUrlOrAlias: string): ISiteContext;
  onSiteChange(listener: (event: SiteLifecycleEvent) => void): () => void;
}

export interface SPDebugProviderProps extends SPDebugProviderConfig {
  /**
   * Primary logger to attach. Typically `SPContext.logger`. Optional — apps
   * without SPContext can omit this; logger-bridged entries simply won't appear.
   */
  logger?: Logger;
  /**
   * Multi-site API to auto-attach against. Typically `SPContext.sites`.
   */
  sites?: SitesAPILike;
  children?: React.ReactNode;
}

// ----------------------------------------------------------------------------
// Config resolution
// ----------------------------------------------------------------------------

function resolveConfig(props: SPDebugProviderConfig): ResolvedDebugConfig {
  const limits = { ...DEFAULT_LIMITS, ...(props.limits || {}) };
  const activationProps = props.activation || {};
  const queryParams =
    activationProps.queryParams && activationProps.queryParams.length > 0
      ? activationProps.queryParams
      : DEFAULT_CONFIG.activation.queryParams;

  let shortcuts: ResolvedDebugConfig['activation']['shortcuts'];
  if (activationProps.shortcuts === false) {
    shortcuts = null;
  } else if (
    activationProps.shortcuts &&
    typeof activationProps.shortcuts === 'object'
  ) {
    shortcuts = {
      togglePanel:
        activationProps.shortcuts.togglePanel ||
        (DEFAULT_CONFIG.activation.shortcuts as { togglePanel: string; toggleCapture: string })
          .togglePanel,
      toggleCapture:
        activationProps.shortcuts.toggleCapture ||
        (DEFAULT_CONFIG.activation.shortcuts as { togglePanel: string; toggleCapture: string })
          .toggleCapture,
    };
  } else {
    shortcuts = DEFAULT_CONFIG.activation.shortcuts;
  }

  return {
    enabled: props.enabled,
    allowInProduction:
      props.allowInProduction ?? DEFAULT_CONFIG.allowInProduction,
    allowProgrammaticInProduction:
      props.allowProgrammaticInProduction ?? DEFAULT_CONFIG.allowProgrammaticInProduction,
    activation: { queryParams, shortcuts },
    panel: {
      defaultDock: props.panel?.defaultDock || DEFAULT_CONFIG.panel.defaultDock,
      allowDockSwitch:
        props.panel?.allowDockSwitch ?? DEFAULT_CONFIG.panel.allowDockSwitch,
    },
    persistence: {
      mode: props.persistence?.mode || DEFAULT_CONFIG.persistence.mode,
      maxAgeMinutes:
        props.persistence?.maxAgeMinutes ?? DEFAULT_CONFIG.persistence.maxAgeMinutes,
      warnBeforeUnload:
        props.persistence?.warnBeforeUnload ?? DEFAULT_CONFIG.persistence.warnBeforeUnload,
    },
    limits,
    redact: { ...DEFAULT_CONFIG.redact, ...(props.redact || {}) },
    export: {
      requireReview:
        props.export?.requireReview || DEFAULT_CONFIG.export.requireReview,
    },
    environment: props.environment,
  };
}

// ----------------------------------------------------------------------------
// Activation evaluation
// ----------------------------------------------------------------------------

function readQueryFlag(queryParams: string[]): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const search = window.location.search || '';
  if (!search) return false;
  // Match `?<name>=true|1` (case-insensitive on value).
  const escaped = queryParams.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp('[?&](' + escaped.join('|') + ')=(1|true)\\b', 'i');
  return pattern.test(search);
}

const SESSION_FLAG_KEY = 'spfx-toolkit:spdebug:session-flag';

function readSessionFlag(): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) return false;
  try {
    return window.sessionStorage.getItem(SESSION_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSessionFlag(active: boolean): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    if (active) window.sessionStorage.setItem(SESSION_FLAG_KEY, '1');
    else window.sessionStorage.removeItem(SESSION_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

interface ActivationDecision {
  capture: boolean;
  /** Whether this decision was made by app code via `enabled={true|false}`. */
  fromAppCode: boolean;
}

function decideActivation(config: ResolvedDebugConfig): ActivationDecision {
  // 1. Provider prop kill-switch.
  if (config.enabled === false) return { capture: false, fromAppCode: true };
  // 2. Provider prop force-on.
  if (config.enabled === true) return { capture: true, fromAppCode: true };

  const isProd = config.environment === 'prod';
  const blockedInProd = isProd && !config.allowInProduction;

  // 3. Programmatic activation already reflected in store.
  // The store's current `captureEnabled` represents either default (false) or
  // a programmatic `SPDebug.enable()` call made before the provider mounted.
  // We honor it unless prod gating blocks programmatic activation.
  if (debugStore.getState().captureEnabled) {
    if (blockedInProd && !config.allowProgrammaticInProduction) {
      return { capture: false, fromAppCode: false };
    }
    return { capture: true, fromAppCode: false };
  }

  // 4. Query string.
  if (!blockedInProd && readQueryFlag(config.activation.queryParams)) {
    return { capture: true, fromAppCode: false };
  }

  // 5. Session storage flag (from a prior tab visit).
  if (!blockedInProd && readSessionFlag()) {
    return { capture: true, fromAppCode: false };
  }

  // 6. Default off.
  return { capture: false, fromAppCode: false };
}

function shortcutsAllowed(config: ResolvedDebugConfig): boolean {
  if (!config.activation.shortcuts) return false;
  if (config.enabled === false) return false;
  if (config.environment !== 'prod') return true;
  return config.allowInProduction || config.enabled === true;
}

// ----------------------------------------------------------------------------
// Shortcut matching
// ----------------------------------------------------------------------------

function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+').map((s) => s.trim());
  const wantCtrl = parts.includes('ctrl');
  const wantAlt = parts.includes('alt');
  const wantShift = parts.includes('shift');
  const wantMeta = parts.includes('meta') || parts.includes('cmd');
  const key = parts.find(
    (p) => !['ctrl', 'alt', 'shift', 'meta', 'cmd'].includes(p)
  );
  if (!key) return false;
  return (
    e.ctrlKey === wantCtrl &&
    e.altKey === wantAlt &&
    e.shiftKey === wantShift &&
    e.metaKey === wantMeta &&
    e.key.toLowerCase() === key
  );
}

// ----------------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------------

let providerCounter = 0;
function makeProviderId(): string {
  providerCounter += 1;
  return 'prov_' + providerCounter + '_' + Math.random().toString(36).slice(2, 6);
}

export const SPDebugProvider: React.FC<SPDebugProviderProps> = (props) => {
  const providerIdRef = React.useRef<string>('');
  if (!providerIdRef.current) providerIdRef.current = makeProviderId();

  React.useEffect(() => {
    const providerId = providerIdRef.current;
    const isPrimary = debugStore.getState().claimPrimary(providerId);

    // Secondary providers do nothing — no sinks, no shortcuts, no lifecycle
    // bindings. Only the primary provider performs side effects.
    // See `docs/SPDebug-Requirements.md` "State Ownership".
    if (!isPrimary) {
      return () => {
        debugStore.getState().releasePrimary(providerId);
      };
    }

    const cleanup: Array<() => void> = [];
    const config = resolveConfig(props);
    debugStore.getState().setConfig(config);

    // Activation
    const decision = decideActivation(config);
    debugStore.getState().setCaptureEnabled(decision.capture);

    // Restore persisted state if applicable.
    if (config.persistence.mode === 'session' || config.persistence.mode === 'local') {
      const restored = loadPersistedState(
        config.persistence.mode,
        config.persistence.maxAgeMinutes
      );
      if (restored) {
        // We restore eviction counters and the active session only. Replaying
        // entries onto the live ring buffer is a nuanced merge — the spec is
        // explicit that traces don't continue across refresh by `traceId`,
        // and the same logic applies to entries: if the developer wants
        // continuity for a flow, they should use `correlationId` grouping.
        // Future work: optional opt-in entry replay with deduplication.
        debugStore.setState({
          evictedCount: restored.evictedCount,
          evictedBytes: restored.evictedBytes,
          activeSession: restored.activeSession,
        });
      }
    }

    // Reflect activation into session storage so refreshes within the tab keep it on.
    if (decision.capture && !decision.fromAppCode && config.persistence.mode === 'session') {
      writeSessionFlag(true);
    } else if (!decision.capture && decision.fromAppCode) {
      writeSessionFlag(false);
    }

    // Logger sink — primary `SPContext.logger` typically.
    if (props.logger) {
      const detach = attachLoggerToStore(props.logger);
      cleanup.push(detach);
    }

    // Multi-site auto-attach.
    if (props.sites) {
      const detach = attachMultiSiteToStore(props.sites);
      cleanup.push(detach);
    }

    // Keyboard shortcuts.
    if (shortcutsAllowed(config)) {
      const handler = (e: KeyboardEvent): void => {
        if (matchesShortcut(e, config.activation.shortcuts!.togglePanel)) {
          e.preventDefault();
          SPDebug.togglePanel();
        } else if (matchesShortcut(e, config.activation.shortcuts!.toggleCapture)) {
          e.preventDefault();
          SPDebug.toggleCapture();
        }
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handler);
        cleanup.push(() => window.removeEventListener('keydown', handler));
      }
    }

    // Page lifecycle persistence.
    if (
      typeof window !== 'undefined' &&
      (config.persistence.mode === 'session' || config.persistence.mode === 'local')
    ) {
      const persist = (): void => {
        const s = debugStore.getState();
        if (!s.captureEnabled) return;
        // Mark any running traces as `abandoned` before persisting so the
        // lifecycle is honest about the page reload boundary. Without this
        // step a refreshed user would see traces stuck in `running` forever.
        // See `docs/SPDebug-Requirements.md` "Trace Lifecycle and Identity".
        s.abandonRunningTraces();
        persistState(
          config.persistence.mode,
          {
            v: 1,
            persistedAt: Date.now(),
            entries: s.entries,
            evictedCount: s.evictedCount,
            evictedBytes: s.evictedBytes,
            activeSession: s.activeSession,
          },
          config.limits.persistenceMaxBytes,
          config.limits.persistenceStripPayloadOver
        );
      };
      const beforeUnload = (e: BeforeUnloadEvent): void => {
        persist();
        if (config.persistence.warnBeforeUnload && debugStore.getState().captureEnabled) {
          e.preventDefault();
          e.returnValue = '';
        }
      };
      window.addEventListener('pagehide', persist);
      window.addEventListener('beforeunload', beforeUnload);
      cleanup.push(() => window.removeEventListener('pagehide', persist));
      cleanup.push(() => window.removeEventListener('beforeunload', beforeUnload));
    }

    return () => {
      cleanup.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
      // If the user has explicitly disabled debug via prop, drop persisted state too.
      if (props.enabled === false && props.persistence?.mode) {
        clearPersistedState(props.persistence.mode);
      }
      debugStore.getState().releasePrimary(providerId);
    };
    // The provider is intended to be configured once at app boot. We deliberately
    // do not rebind on every prop change — that would thrash sinks/shortcuts and
    // is not part of the v1 contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {props.children}
      <SPDebugPanelOverlay providerId={providerIdRef.current} />
    </>
  );
};

// ----------------------------------------------------------------------------
// Lazy-loaded panel + launcher overlay
// ----------------------------------------------------------------------------

/**
 * Subscribes to the singleton store for `captureEnabled` and `panelVisible`
 * and renders either the launcher pill or the lazily-loaded panel chunk. The
 * panel module is dynamically imported only when first opened, so a debug
 * build that never opens the panel doesn't pay for the chunk download.
 */
const LazyPanel = React.lazy(() =>
  import(/* webpackChunkName: "spdebug-panel" */ '../SPDebugPanel').then((m) => ({
    default: m.default,
  }))
);

function useStoreSlice<T>(selector: (state: ReturnType<typeof debugStore.getState>) => T): T {
  const sub = React.useCallback(
    (l: () => void) => debugStore.subscribe(l),
    []
  );
  const get = React.useCallback(() => selector(debugStore.getState()), [selector]);
  const [value, setValue] = React.useState(get);
  const ref = React.useRef(value);
  ref.current = value;
  React.useEffect(() => {
    const check = (): void => {
      const next = get();
      if (!Object.is(next, ref.current)) {
        ref.current = next;
        setValue(next);
      }
    };
    check();
    return sub(check);
  }, [sub, get]);
  return value;
}

interface OverlayProps {
  providerId: string;
}

const SPDebugPanelOverlay: React.FC<OverlayProps> = ({ providerId }) => {
  // Only the primary provider renders overlay UI to avoid duplicate panels in
  // multi-webpart pages.
  const primaryProviderId = useStoreSlice((s) => s.primaryProviderId);
  const captureEnabled = useStoreSlice((s) => s.captureEnabled);
  const panelVisible = useStoreSlice((s) => s.panelVisible);
  const entryCount = useStoreSlice((s) => s.entries.length);

  const [LauncherCmp, setLauncherCmp] = React.useState<React.ComponentType<{
    entryCount: number;
    onOpen: () => void;
  }> | null>(null);

  // Lazy-load the launcher only when capture is enabled. We keep it as a
  // micro-import so the launcher icon doesn't ship with the main bundle.
  React.useEffect(() => {
    if (!captureEnabled || panelVisible || LauncherCmp) return;
    let cancelled = false;
    import(/* webpackChunkName: "spdebug-launcher" */ '../SPDebugPanel/components/DebugLauncher').then(
      (m) => {
        if (!cancelled) setLauncherCmp(() => m.DebugLauncher);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [captureEnabled, panelVisible, LauncherCmp]);

  if (primaryProviderId !== providerId) return null;
  if (!captureEnabled) return null;

  if (panelVisible) {
    return (
      <React.Suspense fallback={null}>
        <LazyPanel />
      </React.Suspense>
    );
  }

  if (LauncherCmp) {
    return <LauncherCmp entryCount={entryCount} onOpen={() => SPDebug.showPanel()} />;
  }
  return null;
};
