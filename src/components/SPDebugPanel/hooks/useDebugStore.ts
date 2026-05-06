/**
 * React subscription hook for the SPDebug zustand store.
 *
 * Internal to the panel — the store itself stays the source of truth and lives
 * in `utilities/debug`. Consumers should NOT import this hook; the panel is
 * not a public v1 export per `docs/SPDebug-Requirements.md`.
 */

import * as React from 'react';
import { debugStore } from '../../../utilities/debug';
import type { DebugStoreState } from '../../../utilities/debug/SPDebugStore';

/**
 * Subscribe to a slice of the SPDebug store. The selector should be a pure
 * function returning a stable value — strict equality is used to detect
 * changes, matching zustand semantics.
 */
export function useDebugStore<T>(selector: (state: DebugStoreState) => T): T {
  const subscribe = React.useCallback(
    (listener: () => void) => debugStore.subscribe(listener),
    []
  );
  const getSnapshot = React.useCallback(() => selector(debugStore.getState()), [
    selector,
  ]);
  return useSyncExternalStoreShim(subscribe, getSnapshot);
}

// React 17 does not ship `useSyncExternalStore`. Implement the minimal shim
// the panel needs. See React docs for the official version we mirror.
function useSyncExternalStoreShim<T>(
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => T
): T {
  const [value, setValue] = React.useState(getSnapshot);
  const lastValueRef = React.useRef(value);
  // Keep the ref synchronized with the most recent snapshot we rendered with.
  lastValueRef.current = value;

  React.useEffect(() => {
    const checkAndUpdate = (): void => {
      const next = getSnapshot();
      if (!Object.is(next, lastValueRef.current)) {
        lastValueRef.current = next;
        setValue(next);
      }
    };
    // Run once in case the store changed between render and effect.
    checkAndUpdate();
    return subscribe(checkAndUpdate);
  }, [subscribe, getSnapshot]);

  return value;
}
