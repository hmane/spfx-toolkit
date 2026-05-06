/**
 * Internal entrypoint for the SPDebug panel.
 *
 * NOT a public v1 package export — see `docs/SPDebug-Requirements.md`. The
 * provider in `components/debug` loads this via dynamic `import()` only when
 * `panelVisible === true`, so consumers cannot import it directly without
 * bypassing the lazy-load boundary.
 */

export { SPDebugPanel, default } from './SPDebugPanel';
export { DebugLauncher } from './components/DebugLauncher';
