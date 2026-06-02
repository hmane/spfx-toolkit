// src/hooks/useSPFieldMetadata.ts
import * as React from 'react';
import type { SPFI } from '@pnp/sp';
import '../utilities/context/pnpImports/core';
import '../utilities/context/pnpImports/lists';
import { SPContext } from '../utilities/context';
import { readBrowserStorageValue, writeBrowserStorageValue } from '../utilities/browserStorage';

/**
 * Minimal field-metadata shape for useSPFieldMetadata.
 *
 * Decision: SPDynamicForm already exports IFieldMetadata (re-exported as
 * IDynamicFormFieldMetadata) but that type depends on SPFieldType from
 * src/components/spFields/types.ts which imports react-hook-form — a heavy
 * peer dependency that would be unnecessarily pulled into any bundle that only
 * needs field metadata. We define a lightweight local interface here that
 * covers the common properties. Consumers who need the rich SPDynamicForm
 * shape can cast or import from 'spfx-toolkit/lib/components/SPDynamicForm'.
 */
export interface ISPFieldMetadata {
  /** Internal (programmatic) name of the field */
  internalName: string;
  /** Display title */
  displayName: string;
  /** SharePoint TypeAsString (e.g. 'Text', 'DateTime', 'Lookup') */
  typeAsString: string;
  /** SharePoint FieldTypeKind numeric enum */
  fieldTypeKind: number;
  /** Whether the field is required */
  required: boolean;
  /** Whether the field is read-only */
  readOnly: boolean;
  /** Whether the field is hidden */
  hidden: boolean;
  /** Field description */
  description: string;
  /** Default value (raw from SharePoint) */
  defaultValue: unknown;
  /** ContentType / list group */
  group: string;
  /** SharePoint field GUID */
  fieldId: string;
}

// ─── Raw SP field type (subset of what PnP returns) ──────────────────────────

interface IRawSPField {
  Id?: string;
  InternalName?: string;
  Title?: string;
  TypeAsString?: string;
  FieldTypeKind?: number;
  Required?: boolean;
  ReadOnlyField?: boolean;
  Hidden?: boolean;
  Description?: string;
  DefaultValue?: unknown;
  Group?: string;
  [key: string]: unknown;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'spfx_toolkit_fmd_';
/** Default TTL: 5 minutes */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface ICachedEntry {
  fields: ISPFieldMetadata[];
  expiresAt: number;
}

/**
 * Build a deterministic session-storage cache key for a specific field
 * metadata query. `internalNames` is sorted before hashing so that
 * `['B','A']` and `['A','B']` produce the same key.
 *
 * Exported for unit-testing.
 */
export function buildFieldMetadataCacheKey(
  webUrl: string,
  listId: string,
  internalNames: string[] | undefined,
  includeHidden: boolean
): string {
  const normalized = internalNames && internalNames.length > 0
    ? [...internalNames].sort().join(',')
    : '';
  const hidden = includeHidden ? '1' : '0';
  return `${CACHE_KEY_PREFIX}${webUrl}|${listId}|${normalized}|${hidden}`;
}

/**
 * Normalize a raw PnP field object to the ISPFieldMetadata shape.
 * Exported for unit-testing.
 */
export function normalizeField(raw: IRawSPField): ISPFieldMetadata {
  return {
    internalName: raw.InternalName ?? '',
    displayName: raw.Title ?? '',
    typeAsString: raw.TypeAsString ?? '',
    fieldTypeKind: raw.FieldTypeKind ?? 0,
    required: !!raw.Required,
    readOnly: !!raw.ReadOnlyField,
    hidden: !!raw.Hidden,
    description: raw.Description ?? '',
    defaultValue: raw.DefaultValue ?? null,
    group: raw.Group ?? '',
    fieldId: raw.Id ?? '',
  };
}

/**
 * Filter a list of raw fields according to includeHidden / internalNames
 * options. Exported for unit-testing.
 */
export function filterFields(
  fields: IRawSPField[],
  options: { includeHidden?: boolean; internalNames?: string[] }
): IRawSPField[] {
  const { includeHidden = false, internalNames } = options;

  // If internalNames is explicitly an empty array, return nothing.
  if (internalNames !== undefined && internalNames.length === 0) {
    return [];
  }

  const nameSet =
    internalNames && internalNames.length > 0
      ? new Set(internalNames)
      : null;

  return fields.filter(f => {
    if (!includeHidden && f.Hidden) return false;
    if (nameSet && !nameSet.has(f.InternalName ?? '')) return false;
    return true;
  });
}

// ─── Hook types ───────────────────────────────────────────────────────────────

export interface IUseSPFieldMetadataOptions {
  /** List GUID or title */
  listId: string;
  /** If provided, only these internal names are returned */
  internalNames?: string[];
  /** Whether to include hidden fields (default: false) */
  includeHidden?: boolean;
  /** PnP SPFI instance (defaults to SPContext.sp) */
  sp?: SPFI;
  /** Cache TTL in milliseconds (default: 300000 = 5 min) */
  ttlMs?: number;
}

export interface IUseSPFieldMetadataResult {
  fields: ISPFieldMetadata[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Loads field metadata for a SharePoint list. Results are cached in
 * sessionStorage (keyed by webUrl + listId + internalNames + includeHidden)
 * with a configurable TTL (default 5 min). Cancellation-safe.
 *
 * **Stable reference note**: `internalNames` is compared by value via an
 * internal JSON key — passing an inline array literal does NOT cause a
 * refetch on every parent render. The `sp` instance is compared by reference;
 * pass a stable (memoized) instance to avoid unintended refetches.
 *
 * @example
 * const { fields, loading, error } = useSPFieldMetadata({
 *   listId: 'Tasks',
 *   internalNames: ['Title', 'Status', 'AssignedTo'],
 * });
 */
export function useSPFieldMetadata(
  options: IUseSPFieldMetadataOptions
): IUseSPFieldMetadataResult {
  const {
    listId,
    internalNames,
    includeHidden = false,
    sp: spProp,
    ttlMs = DEFAULT_TTL_MS,
  } = options;

  const [fields, setFields] = React.useState<ISPFieldMetadata[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [tick, setTick] = React.useState(0);

  // Derive a stable string key from all serializable inputs so that passing
  // an inline `internalNames` array literal does NOT cause a refetch on every
  // parent render. `ttlMs` is included because it affects cache behaviour.
  const depsKey = React.useMemo(
    () => JSON.stringify({ listId, internalNames, includeHidden, ttlMs }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listId, internalNames, includeHidden, ttlMs]
  );

  React.useEffect(() => {
    let cancelled = false;

    // Parse the serializable inputs back from the stable key.
    const { listId: lid, internalNames: inames, includeHidden: incHid, ttlMs: ttl } =
      JSON.parse(depsKey) as {
        listId: string; internalNames?: string[];
        includeHidden: boolean; ttlMs: number;
      };

    const run = async (): Promise<void> => {
      const spInstance = spProp ?? SPContext.sp;

      // Attempt to resolve the web URL for the cache key.
      // SPContext.webAbsoluteUrl may throw if not initialized; default gracefully.
      let webUrl: string;
      try {
        webUrl = SPContext.webAbsoluteUrl;
      } catch {
        webUrl = '';
      }

      const cacheKey = buildFieldMetadataCacheKey(webUrl, lid, inames, incHid);

      // ── Check cache ──────────────────────────────────────────────────────
      if (tick === 0) {
        const cached = readBrowserStorageValue<ICachedEntry>(cacheKey, {
          preferred: ['sessionStorage'],
        });
        if (cached && cached.expiresAt > Date.now()) {
          if (!cancelled) {
            setFields(cached.fields);
            setLoading(false);
            setError(null);
          }
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const listRef = (() => {
          const guid_re = /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i;
          return guid_re.test(lid.trim())
            ? spInstance.web.lists.getById(lid)
            : spInstance.web.lists.getByTitle(lid);
        })();

        const rawFields: IRawSPField[] = await listRef.fields();

        if (cancelled) return;

        const filtered = filterFields(rawFields, { includeHidden: incHid, internalNames: inames });
        const normalized = filtered.map(normalizeField);

        // Write to session storage cache
        const entry: ICachedEntry = { fields: normalized, expiresAt: Date.now() + ttl };
        writeBrowserStorageValue(cacheKey, entry, { preferred: ['sessionStorage'] });

        setFields(normalized);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [depsKey, spProp, tick]);

  const refresh = React.useCallback(() => setTick(t => t + 1), []);

  return { fields, loading, error, refresh };
}
