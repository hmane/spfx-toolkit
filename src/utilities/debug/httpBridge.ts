/**
 * HTTP / REST inspector bridge.
 *
 * Wraps an `HttpClient`-like object's `get`/`post` methods so every completed
 * request is recorded as a row in the `__network__` store table.
 *
 * Each row shape:
 *   { method, url, status, durationMs, sizeBytes, source, recordedAt }
 *
 * The table key is `__network__` to keep it out of the user's own table
 * namespace (reserved prefix). The panel reads this key to render the Network
 * tab.
 *
 * **Disabled-cost contract**: when capture is off, the wrapped methods call
 * through to the originals with zero extra work — the timing + row-build path
 * is never entered.
 *
 * **Idempotency**: a second `attachHttpInspector` call on the same `http`
 * object detects the already-attached marker and returns a no-op detach.
 *
 * **Safety**: errors thrown by the underlying request are re-thrown; the
 * bridge never swallows host app errors. Internal errors in the bridge itself
 * are silently discarded so the host app is never impacted.
 *
 * See `docs/SPDebug-Requirements.md` "Network Inspector".
 */

import { debugStore } from './SPDebugStore';
import { SPDebug } from './SPDebug';

export const NETWORK_TABLE_KEY = '__network__';
export const DEFAULT_SLOW_THRESHOLD_MS = 2000;

export interface HttpInspectorOptions {
  /**
   * When true, redact query strings from recorded URLs (replace `?...` with
   * `?[redacted]`). Defaults to false.
   */
  redactQueryStrings?: boolean;
  /**
   * Duration in ms above which a row is considered "slow". Passed through as
   * metadata on the row for the panel to highlight. Defaults to 2000.
   */
  slowThresholdMs?: number;
}

export interface NetworkRow {
  method: string;
  url: string;
  status: number | null;
  durationMs: number;
  sizeBytes: number | null;
  source: string;
  recordedAt: number;
  slow: boolean;
}

/**
 * Marker symbol placed on the http object to detect double-attachment.
 */
const ATTACHED_MARKER = Symbol('spfx-toolkit:spdebug:http-attached');

/**
 * Redact the query string from a URL string.
 *
 * Exported for unit-testing the pure transformation.
 */
export function redactQueryString(url: string): string {
  const qIdx = url.indexOf('?');
  if (qIdx < 0) return url;
  return url.slice(0, qIdx) + '?[redacted]';
}

/**
 * Build a network row object from the components of a completed request.
 *
 * Exported for unit-testing the pure row construction.
 */
export function buildNetworkRow(
  method: string,
  rawUrl: string,
  status: number | null,
  durationMs: number,
  sizeBytes: number | null,
  source: string,
  recordedAt: number,
  options: HttpInspectorOptions
): NetworkRow {
  const url =
    options.redactQueryStrings === true ? redactQueryString(rawUrl) : rawUrl;
  const slowThreshold = options.slowThresholdMs ?? DEFAULT_SLOW_THRESHOLD_MS;
  return {
    method,
    url,
    status,
    durationMs,
    sizeBytes,
    source,
    recordedAt,
    slow: durationMs >= slowThreshold,
  };
}

/**
 * Push a network row into the `__network__` store table.
 *
 * Reads the existing rows first so each call appends rather than replaces —
 * `SPDebug.table` is "latest rows win" so we must carry forward existing rows.
 */
function pushNetworkRow(row: NetworkRow): void {
  try {
    const state = debugStore.getState();
    if (!state.captureEnabled) return;
    const existing = state.tables.get(NETWORK_TABLE_KEY);
    const rows: NetworkRow[] = existing
      ? (existing.rows as NetworkRow[]).concat([row])
      : [row];
    SPDebug.table(NETWORK_TABLE_KEY, rows, {
      source: 'Network',
      columns: [
        { key: 'method', label: 'Method' },
        { key: 'url', label: 'URL' },
        { key: 'status', label: 'Status' },
        { key: 'durationMs', label: 'Duration (ms)', format: 'number' },
        { key: 'sizeBytes', label: 'Size', format: 'fileSize' },
        { key: 'slow', label: 'Slow' },
      ],
    });
  } catch {
    /* never throw into the host app */
  }
}

type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Wrap a single HTTP method (e.g. `get` or `post`) so timing and the
 * response status + size are captured on each call.
 *
 * Returns a restore function. Assumes `host[methodName]` is a regular function
 * (not a getter).
 */
function wrapMethod(
  host: Record<string, AnyFunction>,
  methodName: string,
  httpMethod: string,
  options: HttpInspectorOptions
): () => void {
  const original = host[methodName] as AnyFunction | undefined;
  if (typeof original !== 'function') return () => undefined;

  const wrapped = function (this: unknown, ...args: unknown[]): unknown {
    const state = debugStore.getState();
    if (!state.captureEnabled) {
      return original.apply(this, args);
    }

    const url = typeof args[0] === 'string' ? args[0] : String(args[0] ?? '');
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const recordedAt = Date.now();
    let result: unknown;
    try {
      result = original.apply(this, args);
    } catch (syncErr) {
      // Synchronous throw — record as failed and re-throw.
      try {
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
        pushNetworkRow(buildNetworkRow(httpMethod, url, null, Math.round(duration), null, 'Network', recordedAt, options));
      } catch {
        /* ignore bridge error */
      }
      throw syncErr;
    }

    // Async path — attach .then/.catch without breaking callers that expect
    // specific Promise subclasses.
    if (result !== null && typeof result === 'object' && typeof (result as Promise<unknown>).then === 'function') {
      (result as Promise<unknown>).then(
        (resp: unknown) => {
          try {
            const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
            const status =
              resp !== null && typeof resp === 'object' && 'status' in resp
                ? (resp as { status: number }).status
                : null;
            const sizeBytes =
              resp !== null && typeof resp === 'object' && 'data' in resp
                ? (() => {
                    try {
                      const raw = (resp as { data: unknown }).data;
                      return typeof raw === 'string'
                        ? raw.length
                        : raw != null
                        ? JSON.stringify(raw).length
                        : null;
                    } catch {
                      return null;
                    }
                  })()
                : null;
            pushNetworkRow(buildNetworkRow(httpMethod, url, status, Math.round(duration), sizeBytes, 'Network', recordedAt, options));
          } catch {
            /* ignore bridge error */
          }
        },
        () => {
          // Rejection — record with null status; the host app sees the original rejection.
          try {
            const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
            pushNetworkRow(buildNetworkRow(httpMethod, url, null, Math.round(duration), null, 'Network', recordedAt, options));
          } catch {
            /* ignore bridge error */
          }
        }
      );
    }

    return result;
  };

  host[methodName] = wrapped as AnyFunction;

  return () => {
    // Only restore if we're still the installed version (idempotent detach).
    if (host[methodName] === wrapped) {
      host[methodName] = original;
    }
  };
}

/**
 * Attach the HTTP inspector to an `HttpClient`-like object.
 *
 * Wraps `get` and `post` (if present) so completed requests are recorded in
 * the `__network__` store table.
 *
 * Returns a detach function that restores the original methods. Safe to call
 * when `http` is null/undefined — returns a no-op in that case. Idempotent:
 * a second attach on the same object is a no-op.
 */
export function attachHttpInspector(
  http: unknown,
  options?: HttpInspectorOptions
): () => void {
  if (http === null || http === undefined || typeof http !== 'object') {
    return () => undefined;
  }

  const host = http as Record<string, unknown> & { [ATTACHED_MARKER]?: true };

  // Idempotency guard.
  if (host[ATTACHED_MARKER]) {
    return () => undefined;
  }
  host[ATTACHED_MARKER] = true;

  const opts: HttpInspectorOptions = options ?? {};
  const restorers: Array<() => void> = [];

  const methodsToWrap: Array<{ key: string; httpMethod: string }> = [
    { key: 'get', httpMethod: 'GET' },
    { key: 'post', httpMethod: 'POST' },
  ];

  for (const { key, httpMethod } of methodsToWrap) {
    if (typeof (host as Record<string, unknown>)[key] === 'function') {
      restorers.push(
        wrapMethod(host as Record<string, AnyFunction>, key, httpMethod, opts)
      );
    }
  }

  return () => {
    try {
      for (const restore of restorers) {
        restore();
      }
    } catch {
      /* ignore */
    }
    delete host[ATTACHED_MARKER];
  };
}
