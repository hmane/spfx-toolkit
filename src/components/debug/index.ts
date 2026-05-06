/**
 * Debug provider + hooks entrypoint.
 *
 * `<SPDebugProvider>` is a bootstrap-only component — it does NOT own debug
 * state. The singleton store in `utilities/debug` is the source of truth and
 * works from React and non-React code.
 *
 * Hooks (`useSPDebugValue`, `useSPDebugTable`, `useSPDebugTimer`,
 * `useSPDebugTrace`, `useSPDebugSession`, `useSPDebugEnabled`) all subscribe
 * ONLY to `captureEnabled`. While capture is off they perform no serialization,
 * truncation, object walking, or store writes — so they are safe to leave in
 * production code. See `hooks.ts` for the closure-pinning footgun documentation.
 *
 * **Note**: `components/SPDebugPanel` is intentionally NOT a public package
 * export. It is loaded internally by `SPDebugProvider` via dynamic `import()`
 * when `panelVisible === true`, so consumers cannot accidentally bypass the
 * lazy-load boundary.
 *
 * See `docs/SPDebug-Requirements.md` and the SPDebug section of
 * `SPFX-Toolkit-Usage-Guide.md`.
 */

export { SPDebugProvider } from './SPDebugProvider';
export type { SPDebugProviderProps } from './SPDebugProvider';

export {
  useSPDebugEnabled,
  useSPDebugValue,
  useSPDebugTable,
  useSPDebugTimer,
  useSPDebugTrace,
  useSPDebugSession,
} from './hooks';
export type { UseSPDebugTraceApi, UseSPDebugSessionApi } from './hooks';
