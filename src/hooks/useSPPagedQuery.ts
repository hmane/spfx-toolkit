// src/hooks/useSPPagedQuery.ts
import * as React from 'react';
import type { SPFI } from '@pnp/sp';
import '../utilities/context/pnpImports/core';
import '../utilities/context/pnpImports/lists';
import { SPContext } from '../utilities/context';
import { buildListQuery, isGuid, IListQueryOptions } from './useListItems';

// ─── Reducer ──────────────────────────────────────────────────────────────────

export interface IPagedState<T> {
  pages: T[][];
  items: T[];
  hasMore: boolean;
  loading: boolean;
  error: Error | null;
  /** Opaque cursor: the stored IPagedResult or null when we are on page 0 */
  nextPage: unknown | null;
}

export type PagedAction<T> =
  | { type: 'FETCH_START' }
  | { type: 'APPEND_PAGE'; items: T[]; hasMore: boolean; nextPage: unknown | null }
  | { type: 'SET_ERROR'; error: Error }
  | { type: 'RESET' };

/**
 * Pure reducer for paged query state. Exported for unit-testing.
 */
export function pagedReducer<T>(
  state: IPagedState<T>,
  action: PagedAction<T>
): IPagedState<T> {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'APPEND_PAGE': {
      const pages = [...state.pages, action.items];
      const items = ([] as T[]).concat(...pages);
      return {
        ...state,
        pages,
        items,
        hasMore: action.hasMore,
        loading: false,
        error: null,
        nextPage: action.nextPage,
      };
    }

    case 'SET_ERROR':
      return { ...state, loading: false, error: action.error };

    case 'RESET':
      return {
        pages: [],
        items: [],
        hasMore: false,
        loading: false,
        error: null,
        nextPage: null,
      };

    default:
      return state;
  }
}

// ─── Hook types ───────────────────────────────────────────────────────────────

export interface IUseSPPagedQueryOptions extends Omit<IListQueryOptions, 'top'> {
  pageSize?: number;
  sp?: SPFI;
}

export interface IUseSPPagedQueryResult<T> {
  pages: T[][];
  items: T[];
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

function initialPagedState<T>(): IPagedState<T> {
  return {
    pages: [],
    items: [],
    hasMore: false,
    loading: false,
    error: null,
    nextPage: null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a SharePoint list in pages using PnP v3 getPaged() / getNext().
 *
 * `loadMore()` fetches the next page and appends it to `items`.
 * `reset()` clears all accumulated pages and re-fetches page 1.
 * `hasMore` reflects whether there are additional pages available.
 *
 * Cancellation-safe: in-flight page fetches that complete after a reset or
 * unmount are silently discarded via a monotonic request-id.
 *
 * **Stable reference note**: array/object options (`select`, `expand`,
 * `orderBy`) are compared by value via an internal JSON key — passing inline
 * literals does NOT cause a reset/refetch on every parent render. The `sp`
 * instance is compared by reference; pass a stable (memoized) instance.
 *
 * @example
 * const { items, loadMore, hasMore, loading } = useSPPagedQuery<ITask>({
 *   listId: 'Tasks',
 *   select: ['Id', 'Title'],
 *   pageSize: 50,
 * });
 */
export function useSPPagedQuery<T = unknown>(
  options: IUseSPPagedQueryOptions
): IUseSPPagedQueryResult<T> {
  const { listId, select, filter, orderBy, expand, pageSize = 100, sp: spProp } = options;

  const [state, dispatch] = React.useReducer(pagedReducer<T>, undefined, initialPagedState);

  // Each time this counter changes we fetch the FIRST page (reset or init).
  const [resetTick, setResetTick] = React.useState(0);

  // Whether a loadMore() was requested while no fetch was in flight.
  const [loadMoreTick, setLoadMoreTick] = React.useState(0);

  // Keep a ref to the current IPagedResult so loadMore can call getNext()
  // without creating a new effect each time.
  const pagedResultRef = React.useRef<any>(null);

  // Monotonic request id — each fetch operation captures its id and only
  // dispatches results if it is still the latest. This prevents an in-flight
  // loadMore from landing on freshly-reset state, and avoids the shared
  // cancelledRef race where both effects reset the flag to false on entry.
  const requestIdRef = React.useRef(0);

  // Derive a stable string key from all serializable query inputs so that
  // passing inline array/object literals does NOT trigger the reset effect
  // on every parent render.
  const queryDepsKey = React.useMemo(
    () => JSON.stringify({ listId, select, filter, orderBy, expand, pageSize }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listId, select, filter, orderBy, expand, pageSize]
  );

  // ── Initial / reset fetch ──────────────────────────────────────────────────
  React.useEffect(() => {
    const myId = ++requestIdRef.current;
    pagedResultRef.current = null;
    dispatch({ type: 'RESET' });
    dispatch({ type: 'FETCH_START' });

    // Parse the serializable query inputs back out of the stable key.
    const { listId: lid, select: sel, filter: fil, orderBy: ob,
            expand: exp, pageSize: ps } =
      JSON.parse(queryDepsKey) as {
        listId: string; select?: string[]; filter?: string;
        orderBy?: { field: string; ascending?: boolean };
        expand?: string[]; pageSize: number;
      };

    const run = async (): Promise<void> => {
      try {
        const spInstance = spProp ?? SPContext.sp;
        const baseQuery = buildListQuery(spInstance.web.lists, {
          listId: lid,
          select: sel,
          filter: fil,
          orderBy: ob,
          expand: exp,
          top: ps,
        });

        const result = await baseQuery.getPaged();
        if (requestIdRef.current !== myId) return;

        pagedResultRef.current = result;
        dispatch({
          type: 'APPEND_PAGE',
          items: result.results as T[],
          hasMore: result.hasNext,
          nextPage: result,
        });
      } catch (err) {
        if (requestIdRef.current === myId) {
          dispatch({
            type: 'SET_ERROR',
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    };

    run();

    return () => {
      // Invalidate this request so any in-flight fetch result is discarded.
      requestIdRef.current = myId + 1;
    };
  }, [queryDepsKey, spProp, resetTick]);

  // ── Load-more fetch ────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (loadMoreTick === 0) return; // skip initial mount

    const currentResult = pagedResultRef.current;
    if (!currentResult?.hasNext) return;

    const myId = ++requestIdRef.current;
    dispatch({ type: 'FETCH_START' });

    const run = async (): Promise<void> => {
      try {
        const nextResult = await currentResult.getNext();
        if (requestIdRef.current !== myId) return;

        pagedResultRef.current = nextResult;
        dispatch({
          type: 'APPEND_PAGE',
          items: nextResult.results as T[],
          hasMore: nextResult.hasNext,
          nextPage: nextResult,
        });
      } catch (err) {
        if (requestIdRef.current === myId) {
          dispatch({
            type: 'SET_ERROR',
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    };

    run();

    return () => {
      // Invalidate this load-more request on cleanup (e.g. unmount or newer
      // load-more tick fired before this one completed).
      requestIdRef.current = myId + 1;
    };
  }, [loadMoreTick]);

  const loadMore = React.useCallback(() => {
    setLoadMoreTick(t => t + 1);
  }, []);

  const reset = React.useCallback(() => {
    setLoadMoreTick(0);
    setResetTick(t => t + 1);
  }, []);

  return {
    pages: state.pages,
    items: state.items,
    loadMore,
    hasMore: state.hasMore,
    loading: state.loading,
    error: state.error,
    reset,
  };
}
