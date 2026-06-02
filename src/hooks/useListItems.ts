// src/hooks/useListItems.ts
import * as React from 'react';
import type { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { SPContext } from '../utilities/context';

// ─── GUID detection ───────────────────────────────────────────────────────────

/**
 * Regex that matches a standard GUID, with or without surrounding braces.
 * e.g. "a1b2c3d4-e5f6-7890-abcd-ef1234567890" or
 *      "{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}"
 */
const GUID_RE =
  /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i;

export function isGuid(value: string): boolean {
  return GUID_RE.test(value.trim());
}

// ─── Pure query builder ───────────────────────────────────────────────────────

export interface IListQueryOptions {
  listId: string;
  select?: string[];
  filter?: string;
  orderBy?: { field: string; ascending?: boolean };
  top?: number;
  expand?: string[];
}

/**
 * Pure query-building helper: given a `web.lists`-shaped stub (or real PnP
 * lists object) and the query options, returns the final query object with all
 * OData clauses applied in the correct order:
 *
 *   select → filter → orderBy → top → expand
 *
 * GUID detection is used to route to `getById` or `getByTitle`.
 * Exported so it can be unit-tested independently of React.
 */
export function buildListQuery(
  lists: any,
  options: IListQueryOptions
): any {
  const { listId, select, filter, orderBy, top, expand } = options;

  // Route by GUID or title
  const listRef = isGuid(listId)
    ? lists.getById(listId)
    : lists.getByTitle(listId);

  let query = listRef.items as any;

  if (select && select.length > 0) {
    query = query.select(select);
  }
  if (filter) {
    query = query.filter(filter);
  }
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.ascending !== false);
  }
  if (top !== undefined && top > 0) {
    query = query.top(top);
  }
  if (expand && expand.length > 0) {
    query = query.expand(expand);
  }

  return query;
}

// ─── Hook types ───────────────────────────────────────────────────────────────

export interface IUseListItemsOptions extends IListQueryOptions {
  /** If provided, use this PnP instance instead of SPContext.sp */
  sp?: SPFI;
  /** When false the hook stays idle and returns empty state */
  enabled?: boolean;
  /** CAML query string — when provided, uses getItemsByCAMLQuery instead of OData */
  caml?: string;
}

export interface IUseListItemsResult<T> {
  items: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  count: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches list items from a SharePoint list identified by a GUID or title.
 *
 * Supports OData query clauses (select, filter, orderBy, top, expand) and
 * CAML queries. Results are cancellation-safe: stale responses after unmount
 * or after a newer fetch supersedes them are discarded.
 *
 * **Stable reference note**: array/object options (`select`, `expand`,
 * `orderBy`) are compared by value via an internal JSON key — passing inline
 * literals does NOT cause refetch-on-every-render. The `sp` instance is
 * compared by reference, so pass a stable (memoized) instance to avoid
 * unintended refetches.
 *
 * @example
 * const { items, loading, error } = useListItems<ITask>({
 *   listId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   select: ['Id', 'Title', 'Status'],
 *   filter: "Status eq 'Active'",
 *   orderBy: { field: 'Title' },
 *   top: 100,
 * });
 */
export function useListItems<T = unknown>(
  options: IUseListItemsOptions
): IUseListItemsResult<T> {
  const {
    listId,
    select,
    filter,
    orderBy,
    top,
    expand,
    caml,
    sp: spProp,
    enabled = true,
  } = options;

  const [state, setState] = React.useState<{
    items: T[];
    loading: boolean;
    error: Error | null;
  }>({ items: [], loading: false, error: null });

  // Tick drives manual refresh()
  const [tick, setTick] = React.useState(0);

  // Derive a stable string key from all serializable inputs so that passing
  // inline array/object literals (e.g. select: ['Id','Title']) does NOT cause
  // the fetch effect to re-run on every parent render.
  const depsKey = React.useMemo(
    () => JSON.stringify({ listId, select, filter, orderBy, top, expand, caml, enabled }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listId, select, filter, orderBy, top, expand, caml, enabled]
  );

  React.useEffect(() => {
    // Parse back the inputs from the stable key so the effect closure always
    // has the correct values without capturing the raw arrays directly.
    const { listId: lid, select: sel, filter: fil, orderBy: ob,
            top: tp, expand: exp, caml: cml, enabled: ena } =
      JSON.parse(depsKey) as {
        listId: string; select?: string[]; filter?: string;
        orderBy?: { field: string; ascending?: boolean }; top?: number;
        expand?: string[]; caml?: string; enabled: boolean;
      };

    if (!ena) {
      setState({ items: [], loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState(s => ({ items: s.items, loading: true, error: null }));

    const run = async (): Promise<void> => {
      const spInstance = spProp ?? SPContext.sp;
      const startMs = Date.now();

      try {
        let items: T[];

        if (cml) {
          // CAML path: bypass OData helpers
          const listRef = isGuid(lid)
            ? spInstance.web.lists.getById(lid)
            : spInstance.web.lists.getByTitle(lid);
          items = await listRef.getItemsByCAMLQuery({ ViewXml: cml }) as T[];
        } else {
          const query = buildListQuery(spInstance.web.lists, {
            listId: lid,
            select: sel,
            filter: fil,
            orderBy: ob,
            top: tp,
            expand: exp,
          });
          items = await query() as T[];
        }

        SPContext.logger.debug(`useListItems:${lid} fetched ${items.length} item(s) in ${Date.now() - startMs}ms`);

        if (!cancelled) {
          setState({ items, loading: false, error: null });
        }
      } catch (err) {
        SPContext.logger.error(`useListItems:${lid} fetch failed`, err instanceof Error ? err : new Error(String(err)), { listId: lid });
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          setState(s => ({ items: s.items, loading: false, error }));
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [depsKey, spProp, tick]);

  const refresh = React.useCallback(() => setTick(t => t + 1), []);

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    refresh,
    count: state.items.length,
  };
}
