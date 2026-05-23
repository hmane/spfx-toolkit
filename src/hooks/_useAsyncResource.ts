// src/hooks/_useAsyncResource.ts
// Private helper for userAccess hooks. Do NOT export from src/hooks/index.ts.
import * as React from 'react';
import { UserAccessError } from '../utilities/userAccess';

export interface IAsyncResourceState<T> {
  data: T | null;
  loading: boolean;
  error: UserAccessError | null;
}

export interface IAsyncResource<T> extends IAsyncResourceState<T> {
  refresh: () => void;
}

export function toUserAccessError(err: unknown): UserAccessError {
  if (err instanceof UserAccessError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  return new UserAccessError('UNKNOWN', msg, { cause: err });
}

/**
 * Generic async resource hook. Returns idle ({ data: null, loading: false })
 * when `enabled === false`. Caller controls when to fetch.
 */
export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  enabled: boolean
): IAsyncResource<T> {
  const [state, setState] = React.useState<IAsyncResourceState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState(s => ({ data: s.data, loading: true, error: null }));
    fetcher().then(
      data => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      err => {
        if (!cancelled)
          setState(s => ({ data: s.data, loading: false, error: toUserAccessError(err) }));
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  const refresh = React.useCallback(() => setTick(t => t + 1), []);
  return { ...state, refresh };
}
