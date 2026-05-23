/**
 * Window-level cache for user access data.
 * Uses window object to share cache across all bundles/modules.
 * This prevents duplicate API calls even when code is bundled separately.
 *
 * Pattern follows PermissionHelper.ts:47 — per-entry TTL, no instance state.
 */

interface IEntry {
  value: unknown;
  expiresAt: number;
}

const CACHE_KEY = '__spfx_toolkit_user_access_cache__';

/**
 * Get the window-level cache storage.
 * Lazily initializes on first access.
 */
function store(): Map<string, IEntry> {
  const w = window as unknown as Record<string, Map<string, IEntry>>;
  if (!w[CACHE_KEY]) {
    w[CACHE_KEY] = new Map();
  }
  return w[CACHE_KEY];
}

/**
 * Returns the cached value for `key`, or `undefined` if missing/expired.
 * The return type `T` is an asserted cast — the cache stores `unknown`,
 * so callers that store heterogeneous values under one key must validate
 * shape themselves.
 */
export function getCache<T = unknown>(key: string): T | undefined {
  const s = store();
  const entry = s.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt < Date.now()) {
    s.delete(key);
    return undefined;
  }

  return entry.value as T;
}

/**
 * Set a cached value with a per-entry TTL.
 *
 * @template T - The type of the value being cached
 * @param key - The cache key
 * @param value - The value to cache
 * @param ttlMs - Time-to-live in milliseconds (must be > 0)
 * @throws Error if ttlMs is <= 0
 */
export function setCache<T>(key: string, value: T, ttlMs: number): void {
  if (ttlMs <= 0) throw new Error(`setCache: ttlMs must be > 0, got ${ttlMs}`);
  store().set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Invalidate a specific cache key.
 *
 * @param key - The cache key to invalidate
 */
export function invalidate(key: string): void {
  store().delete(key);
}

/**
 * Invalidate all cache keys starting with a given prefix.
 * Useful for invalidating related cached entries (e.g., all level-1 data for a user).
 *
 * @param prefix - The cache key prefix to invalidate
 */
export function invalidatePrefix(prefix: string): void {
  const s = store();
  for (const k of Array.from(s.keys())) {
    if (k.startsWith(prefix)) {
      s.delete(k);
    }
  }
}

/**
 * Clear all cached entries.
 */
export function clearAll(): void {
  store().clear();
}

/**
 * Default TTLs (in milliseconds) per the User Access Toolkit specification §5.
 * These values align with cache eviction policy: higher tiers have longer TTLs
 * to balance freshness with performance.
 */
export const TTL = {
  /** Level 1 (user's site groups): 5 minutes */
  level1: 5 * 60_000,
  /** Level 2 (user's list permissions): 2 minutes */
  level2: 2 * 60_000,
  /** Level 3 (user's item permissions): 1 minute */
  level3: 1 * 60_000,
  /** Site groups list: 10 minutes */
  siteGroups: 10 * 60_000,
  /** Group members: 5 minutes */
  groupMembers: 5 * 60_000,
  /** Broken inheritance checks: 5 minutes */
  brokenInheritance: 5 * 60_000,
} as const;
