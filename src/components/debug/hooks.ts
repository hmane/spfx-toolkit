/**
 * SPDebug React hooks.
 *
 * **Disabled-state contract** — the most important property of these hooks:
 * each subscribes ONLY to `captureEnabled`. While capture is off they perform
 * no serialization, truncation, object walking, or store writes.
 * Hooks are safe to leave in production code.
 *
 * **Closure-pinning footgun** — even when capture is off, an effect's closure
 * captures values passed in. Consumers should pass existing references rather
 * than synthetic objects:
 *
 * ```ts
 * // ❌ creates a new object every render and pins it in the closure
 * useSPDebugValue('snapshot', { items, selected }, [items, selected]);
 *
 * // ✅ pass existing references; the runtime tree-shakes per-call
 * useSPDebugValue('items', items, [items]);
 * useSPDebugValue('selected', selected, [selected]);
 * ```
 *
 * `useSPDebugStore` is intentionally NOT exported — keeping zustand off the
 * consumer's bundle interface is part of the spec.
 *
 * See `docs/SPDebug-Requirements.md` "Hook Contracts" and "Trace Lifecycle and
 * Identity → Hook Contract".
 */

import * as React from 'react';
import { debugStore, SPDebug } from '../../utilities/debug';
import type {
  SPDebugCorrelationId,
  SPDebugSession,
  SPDebugSetOptions,
  SPDebugStepOptions,
  SPDebugStepStatus,
  SPDebugTableOptions,
  SPDebugTimerOptions,
} from '../../utilities/debug/SPDebugTypes';
import type { IFieldMetadata } from '../SPDynamicForm/types/fieldMetadata';

/** Reserved table key for `useSPDebugPermission`. */
const PERMISSIONS_TABLE_KEY = '__permissions__';

/** Reserved table key for `useSPDebugFormFields`. */
const FORM_FIELDS_TABLE_KEY = '__form_fields__';

// ----------------------------------------------------------------------------
// Internal store-slice subscription (works in React 17 / 18 without
// `useSyncExternalStore` from React 18 only).
// ----------------------------------------------------------------------------

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

const selectCaptureEnabled = (
  s: ReturnType<typeof debugStore.getState>
): boolean => s.captureEnabled;

const selectActiveSession = (
  s: ReturnType<typeof debugStore.getState>
): SPDebugSession | null => s.activeSession;

// ----------------------------------------------------------------------------
// Public hooks
// ----------------------------------------------------------------------------

/**
 * Whether SPDebug is currently capturing. Re-renders only on flag change.
 * Useful for app code that wants to conditionally render dev-only UI.
 */
export function useSPDebugEnabled(): boolean {
  return useStoreSlice(selectCaptureEnabled);
}

/**
 * Publish a keyed snapshot when `deps` change. No-op while capture is off.
 *
 * The effect closure pins `value` until the next render — pass existing
 * references rather than synthetic objects (see file-level docstring).
 */
export function useSPDebugValue(
  key: string,
  value: unknown,
  deps: React.DependencyList = [],
  options?: SPDebugSetOptions
): void {
  const enabled = useStoreSlice(selectCaptureEnabled);
  React.useEffect(() => {
    if (!enabled) return;
    SPDebug.set(key, value, options);
    // We deliberately mirror the consumer's `deps` array. `key`/`enabled` are
    // tracked explicitly so a change to either flushes a fresh snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, ...deps]);
}

/**
 * Publish a keyed table snapshot when `deps` change. No-op while disabled.
 */
export function useSPDebugTable(
  key: string,
  rows: ReadonlyArray<unknown>,
  deps: React.DependencyList = [],
  options?: SPDebugTableOptions
): void {
  const enabled = useStoreSlice(selectCaptureEnabled);
  React.useEffect(() => {
    if (!enabled) return;
    SPDebug.table(key, rows, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, ...deps]);
}

/**
 * Drive a timer from a loading flag. Spec semantics:
 *
 * - Mounted with `isLoading === true` → start.
 * - `false → true` transition → start a new cycle.
 * - `true → false` transition → end and emit one timer entry.
 * - Unmount while loading → end with `interrupted: true`.
 */
export function useSPDebugTimer(
  name: string,
  isLoading: boolean,
  options?: SPDebugTimerOptions
): void {
  const enabled = useStoreSlice(selectCaptureEnabled);
  const handleRef = React.useRef<{ end: (o?: { status?: SPDebugStepStatus; data?: unknown }) => number } | null>(
    null
  );

  React.useEffect(() => {
    if (!enabled) return;
    if (isLoading && !handleRef.current) {
      handleRef.current = SPDebug.timer(name, options);
    } else if (!isLoading && handleRef.current) {
      handleRef.current.end();
      handleRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isLoading, name]);

  React.useEffect(() => {
    return () => {
      if (handleRef.current) {
        handleRef.current.end({ data: { interrupted: true } });
        handleRef.current = null;
      }
    };
  }, []);
}

export interface UseSPDebugTraceApi {
  readonly traceId: string;
  step(label: string, dataOrOptions?: unknown | SPDebugStepOptions): void;
  warn(label: string, data?: unknown): void;
  fail(error: unknown, data?: unknown): void;
  end(): void;
}

/**
 * Manage a workflow trace tied to a component lifecycle.
 *
 * - Starts on mount when capture is enabled.
 * - Ends on unmount if not already ended.
 * - When `correlationId` changes, ends the previous trace and starts a new
 *   one with the new id.
 * - `correlationId` must be a primitive string or number (spec). Object ids
 *   throw in dev and warn-and-ignore in production.
 */
export function useSPDebugTrace(
  name: string,
  correlationId?: SPDebugCorrelationId
): UseSPDebugTraceApi {
  const enabled = useStoreSlice(selectCaptureEnabled);
  const handleRef = React.useRef<ReturnType<typeof SPDebug.startTrace> | null>(null);

  // Stable handle returned to callers. Methods always read the current
  // `handleRef.current`, so callers can safely cache the returned object.
  const apiRef = React.useRef<UseSPDebugTraceApi | null>(null);
  if (!apiRef.current) {
    apiRef.current = {
      get traceId(): string {
        return handleRef.current?.traceId ?? '';
      },
      step(label, dataOrOptions) {
        handleRef.current?.step(label, dataOrOptions);
      },
      warn(label, data) {
        handleRef.current?.warn(label, data);
      },
      fail(error, data) {
        handleRef.current?.fail(error, data);
      },
      end() {
        handleRef.current?.end();
      },
    };
  }

  React.useEffect(() => {
    if (!enabled) return;
    handleRef.current = SPDebug.startTrace(name, { correlationId });
    return () => {
      handleRef.current?.end();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, name, correlationId]);

  return apiRef.current;
}

export interface UseSPDebugSessionApi {
  readonly active: SPDebugSession | null;
  start(label?: string): void;
  stop(note?: string): void;
  clear(): void;
}

/**
 * React-friendly view of the current session. Re-renders only when the
 * session reference changes.
 */
export function useSPDebugSession(): UseSPDebugSessionApi {
  const active = useStoreSlice(selectActiveSession);
  return React.useMemo<UseSPDebugSessionApi>(
    () => ({
      active,
      start(label) {
        SPDebug.session.start({ label });
      },
      stop(note) {
        SPDebug.session.stop({ note });
      },
      clear() {
        SPDebug.session.clear();
      },
    }),
    [active]
  );
}

// ----------------------------------------------------------------------------
// C2: useSPDebugPermission
// ----------------------------------------------------------------------------

/**
 * Record a permission check result into the `__permissions__` store table.
 *
 * **Disabled-cost contract**: performs no work (no store writes, no object
 * construction) while capture is off.
 *
 * Composable with `useHasPermission` — pass the resulting `allowed` flag:
 *
 * ```tsx
 * const canEdit = useHasPermission(PermissionKind.EditListItems);
 * useSPDebugPermission('Edit Items', canEdit);
 * ```
 *
 * Each call upserts a row keyed by `label` — the latest value for a given
 * label wins (same semantics as `SPDebug.table` latest-rows-win at the table
 * level: we read existing rows and merge).
 */
export function useSPDebugPermission(
  label: string,
  allowed: boolean,
  loading?: boolean
): void {
  const enabled = useStoreSlice(selectCaptureEnabled);
  React.useEffect(() => {
    if (!enabled) return;
    const state = debugStore.getState();
    const existing = state.tables.get(PERMISSIONS_TABLE_KEY);
    const newRow = {
      label,
      allowed,
      loading: loading ?? false,
      checkedAt: Date.now(),
    };
    // Upsert: replace an existing row with the same label, or append.
    const prevRows = existing
      ? (existing.rows as Array<{ label: string; allowed: boolean; loading: boolean; checkedAt: number }>)
      : [];
    const idx = prevRows.findIndex((r) => r.label === label);
    const nextRows =
      idx >= 0
        ? prevRows.map((r, i) => (i === idx ? newRow : r))
        : prevRows.concat([newRow]);
    SPDebug.table(PERMISSIONS_TABLE_KEY, nextRows, { source: 'Permissions' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, label, allowed, loading]);
}

// ----------------------------------------------------------------------------
// C3: useSPDebugFormFields
// ----------------------------------------------------------------------------

/**
 * Returns a callback suitable for `SPDynamicForm`'s `onResolvedField` prop.
 *
 * When capture is enabled, each resolved field is recorded (upserted by
 * `internalName`) into the `__form_fields__` store table.
 *
 * **Disabled-cost contract**: the returned callback is a stable no-op
 * function while capture is off.
 *
 * Usage:
 * ```tsx
 * const onResolvedField = useSPDebugFormFields();
 * <SPDynamicForm ... onResolvedField={onResolvedField} />
 * ```
 *
 * The `resolved` parameter contains the field after override application;
 * `original` is the unmodified field. `overrideApplied` is true when any
 * presentation property differs between the two.
 */
export function useSPDebugFormFields(): (
  resolved: IFieldMetadata,
  original: IFieldMetadata
) => void {
  const enabled = useStoreSlice(selectCaptureEnabled);

  // Stable ref so the returned callback identity is stable even when
  // `enabled` changes — matching `useSPDebugTrace`'s apiRef pattern.
  const enabledRef = React.useRef(enabled);
  enabledRef.current = enabled;

  return React.useCallback(
    (resolved: IFieldMetadata, original: IFieldMetadata) => {
      if (!enabledRef.current) return;
      try {
        const state = debugStore.getState();
        if (!state.captureEnabled) return;

        // `IFieldMetadata` carries required/readOnly/hidden but NOT disabled —
        // the disabled state is computed at render time from form-level props.
        const overrideApplied =
          resolved.required !== original.required ||
          resolved.hidden !== original.hidden ||
          resolved.readOnly !== original.readOnly ||
          resolved.displayName !== original.displayName ||
          resolved.description !== original.description;

        const newRow = {
          fieldName: resolved.internalName,
          type: String(resolved.fieldType),
          label: resolved.displayName,
          required: resolved.required,
          hidden: resolved.hidden,
          readOnly: resolved.readOnly,
          overrideApplied,
        };

        const existing = state.tables.get(FORM_FIELDS_TABLE_KEY);
        const prevRows = existing
          ? (existing.rows as Array<{ fieldName: string }>)
          : [];
        const idx = prevRows.findIndex((r) => r.fieldName === newRow.fieldName);
        const nextRows =
          idx >= 0
            ? prevRows.map((r, i) => (i === idx ? newRow : r))
            : prevRows.concat([newRow]);

        SPDebug.table(FORM_FIELDS_TABLE_KEY, nextRows, {
          source: 'FieldInspector',
          columns: [
            { key: 'fieldName', label: 'Internal Name' },
            { key: 'type', label: 'Type' },
            { key: 'label', label: 'Label' },
            { key: 'required', label: 'Required' },
            { key: 'hidden', label: 'Hidden' },
            { key: 'readOnly', label: 'Read Only' },
            { key: 'overrideApplied', label: 'Override Applied' },
          ],
        });
      } catch {
        /* never throw into the host app */
      }
    },
    [] // stable — reads enabledRef at call time
  );
}
