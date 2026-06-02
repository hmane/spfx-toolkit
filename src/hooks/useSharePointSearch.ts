// src/hooks/useSharePointSearch.ts
import * as React from 'react';
import type { SPFI } from '@pnp/sp';

// Load the PnP search augmentation so that sp.search() is available.
// This is a module-level side-effect import — same pattern as how VersionHistory
// loads '@pnp/sp/files' via the pnpImports bundles.
import '../utilities/context/pnpImports/search';

import { SPContext } from '../utilities/context';

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * A single row from the search results, typed generically so callers
 * can overlay their own property shapes.
 */
export interface ISearchResultItem {
  /** The display title of the item */
  Title?: string;
  /** The URL/path of the item */
  Path?: string;
  /** All other properties returned by the query */
  [key: string]: unknown;
}

export interface IUseSharePointSearchOptions {
  /** The search query text */
  query: string;
  /** Properties to include in results (maps to SelectProperties) */
  selectProperties?: string[];
  /** Maximum number of rows to return (maps to RowLimit) */
  rowLimit?: number;
  /** Whether to trim near-duplicate results (maps to TrimDuplicates) */
  trimDuplicates?: boolean;
  /** Search result source GUID (maps to SourceId) */
  sourceId?: string;
  /** When false the hook stays idle and returns empty state (default: true) */
  enabled?: boolean;
  /** Custom PnP SPFI instance — falls back to SPContext.sp when absent */
  sp?: SPFI;
}

export interface IUseSharePointSearchResult<T> {
  results: T[];
  totalRows: number;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

// ─── PnP ISearchQuery type (local minimal shape) ─────────────────────────────
// We declare only the fields we use to avoid pulling in the full PnP typings.

interface ISearchQuery {
  Querytext: string;
  SelectProperties?: string[];
  RowLimit?: number;
  TrimDuplicates?: boolean;
  SourceId?: string;
}

interface ISearchResults {
  PrimarySearchResults: Record<string, unknown>[];
  TotalRows: number;
  RowCount: number;
}

// ─── Pure helpers (exported for unit tests) ───────────────────────────────────

/**
 * Builds the PnP `ISearchQuery` object from the hook options.
 *
 * Pure function — no side effects. Exported for unit testing.
 */
export function buildSearchQuery(
  options: Pick<IUseSharePointSearchOptions, 'query' | 'selectProperties' | 'rowLimit' | 'trimDuplicates' | 'sourceId'>
): ISearchQuery {
  const { query, selectProperties, rowLimit, trimDuplicates, sourceId } = options;

  const searchQuery: ISearchQuery = {
    Querytext: query,
  };

  if (selectProperties && selectProperties.length > 0) {
    searchQuery.SelectProperties = selectProperties;
  }

  if (rowLimit !== undefined) {
    searchQuery.RowLimit = rowLimit;
  }

  if (trimDuplicates !== undefined) {
    searchQuery.TrimDuplicates = trimDuplicates;
  }

  if (sourceId !== undefined) {
    searchQuery.SourceId = sourceId;
  }

  return searchQuery;
}

/**
 * Normalises a raw PnP search response into a typed result array.
 *
 * Pure function — no side effects. Exported for unit testing.
 */
export function mapSearchResults<T = ISearchResultItem>(
  raw: ISearchResults | null | undefined
): T[] {
  if (!raw || !raw.PrimarySearchResults) {
    return [];
  }
  return raw.PrimarySearchResults as T[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Searches SharePoint using the PnP Search API.
 *
 * When `enabled !== false` and `query` is non-empty, runs a search via
 * `(sp ?? SPContext.sp).search(...)` and maps `PrimarySearchResults` to typed
 * rows. The fetch is cancellation-safe: stale responses after unmount or after
 * a newer fetch supersedes them are discarded.
 *
 * **Stable reference note**: array options (`selectProperties`) are compared by
 * value via a serialized JSON key — passing inline literals does NOT cause a
 * refetch on every render. The `sp` instance is compared by reference.
 *
 * @example
 * const { results, loading, error } = useSharePointSearch<ISiteResult>({
 *   query: 'contentclass:STS_Site contoso',
 *   selectProperties: ['Title', 'Path', 'SiteId'],
 *   rowLimit: 8,
 * });
 */
export function useSharePointSearch<T = ISearchResultItem>(
  options: IUseSharePointSearchOptions
): IUseSharePointSearchResult<T> {
  const {
    query,
    selectProperties,
    rowLimit,
    trimDuplicates,
    sourceId,
    sp: spProp,
    enabled = true,
  } = options;

  const [state, setState] = React.useState<{
    results: T[];
    totalRows: number;
    loading: boolean;
    error: Error | null;
  }>({ results: [], totalRows: 0, loading: false, error: null });

  // Tick drives manual refresh()
  const [tick, setTick] = React.useState(0);

  // Derive a stable string key from all serializable inputs so that passing
  // inline array/object literals (e.g. selectProperties: ['Title','Path']) does
  // NOT cause the fetch effect to re-run on every parent render.
  const depsKey = React.useMemo(
    () =>
      JSON.stringify({
        query,
        selectProperties,
        rowLimit,
        trimDuplicates,
        sourceId,
        enabled,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, selectProperties, rowLimit, trimDuplicates, sourceId, enabled]
  );

  React.useEffect(() => {
    // Parse inputs back from the stable key so the effect closure always has
    // the correct values without capturing the raw arrays directly.
    const parsed = JSON.parse(depsKey) as {
      query: string;
      selectProperties?: string[];
      rowLimit?: number;
      trimDuplicates?: boolean;
      sourceId?: string;
      enabled: boolean;
    };

    if (!parsed.enabled || !parsed.query || !parsed.query.trim()) {
      setState({ results: [], totalRows: 0, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState(s => ({ results: s.results, totalRows: s.totalRows, loading: true, error: null }));

    const run = async (): Promise<void> => {
      const spInstance = spProp ?? SPContext.sp;
      const startMs = Date.now();

      try {
        const searchQuery = buildSearchQuery({
          query: parsed.query,
          selectProperties: parsed.selectProperties,
          rowLimit: parsed.rowLimit,
          trimDuplicates: parsed.trimDuplicates,
          sourceId: parsed.sourceId,
        });

        // PnP v3: sp.search() accepts an ISearchQuery or string.
        // The augmentation loaded at module level adds .search to SPFI.
        const raw = await (spInstance as any).search(searchQuery) as ISearchResults;
        const results = mapSearchResults<T>(raw);
        const totalRows = raw?.TotalRows ?? results.length;

        SPContext.logger.debug(
          `useSharePointSearch: fetched ${results.length} result(s) of ${totalRows} total in ${Date.now() - startMs}ms`,
          { query: parsed.query }
        );

        if (!cancelled) {
          setState({ results, totalRows, loading: false, error: null });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        SPContext.logger.error(
          'useSharePointSearch: search failed',
          error,
          { query: parsed.query }
        );
        if (!cancelled) {
          setState(s => ({ results: s.results, totalRows: s.totalRows, loading: false, error }));
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
    results: state.results,
    totalRows: state.totalRows,
    loading: state.loading,
    error: state.error,
    refresh,
  };
}
