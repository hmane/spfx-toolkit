// src/hooks/useDebouncedValue.ts
import * as React from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delayMs`
 * milliseconds of inactivity. The pending timer is cleared on unmount or
 * when `value` / `delayMs` change.
 *
 * React-only; no SharePoint dependency.
 *
 * @example
 * const [search, setSearch] = React.useState('');
 * const debouncedSearch = useDebouncedValue(search, 300);
 * // debouncedSearch lags 300 ms behind `search`
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(id);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Returns a stable debounced wrapper around `fn`. The callback reference is
 * stable across renders (uses `useRef` to capture the latest `fn`). Any
 * pending invocation is cancelled on unmount.
 *
 * @example
 * const save = useDebouncedCallback((text: string) => saveToServer(text), 500);
 * // `save` is stable; calling it resets the 500 ms timer each time.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number
): (...args: A) => void {
  // Store the latest fn in a ref so the debounced wrapper never captures a
  // stale closure — callers can change `fn` without affecting the timer.
  const fnRef = React.useRef<(...args: A) => void>(fn);
  React.useEffect(() => {
    fnRef.current = fn;
  });

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any pending invocation on unmount.
  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // The debounced wrapper is stable (empty dep array) because it reads the
  // latest values through refs.
  const debouncedFn = React.useCallback(
    (...args: A): void => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        fnRef.current(...args);
      }, delayMs);
    },
    // delayMs is intentionally included — if the delay changes a new debounced
    // wrapper is appropriate so in-flight timers do not fire with the old delay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delayMs]
  );

  return debouncedFn;
}
