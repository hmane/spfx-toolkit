/**
 * LRU (Least Recently Used) Cache Implementation
 *
 * Provides a memory-bounded cache with automatic eviction of least recently used entries.
 * Used by PermissionHelper to prevent unbounded memory growth in long-running SPFx applications.
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string, IPermissionResult>(100);
 * cache.set('user_role_owners', { hasPermission: true });
 * const result = cache.get('user_role_owners'); // Returns cached value and marks as recently used
 * ```
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  /**
   * Create a new LRU cache
   * @param maxSize - Maximum number of entries to store (default: 100)
   */
  constructor(maxSize: number = 100) {
    if (maxSize <= 0) {
      throw new Error('LRU Cache maxSize must be greater than 0');
    }
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns The cached value, or undefined if not found
   *
   * @remarks
   * If the key exists, it is moved to the end (marked as most recently used)
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);

    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }

    return value;
  }

  /**
   * Set a value in the cache
   * @param key - The cache key
   * @param value - The value to cache
   *
   * @remarks
   * If the cache is at capacity, the least recently used entry is evicted.
   * The new entry is added at the end (most recently used position).
   */
  set(key: K, value: V): void {
    // Remove if exists (to re-add at end)
    this.cache.delete(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * Check if a key exists in the cache
   * @param key - The cache key
   * @returns True if the key exists, false otherwise
   *
   * @remarks
   * Does not affect the LRU order (does not mark as recently used)
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a specific key from the cache
   * @param key - The cache key to delete
   * @returns True if the key existed and was deleted, false otherwise
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current number of entries in the cache
   * @returns The number of cached entries
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get the maximum size of the cache
   * @returns The maximum number of entries the cache can hold
   */
  get capacity(): number {
    return this.maxSize;
  }

  /**
   * Get all keys in the cache (oldest to newest)
   * @returns Array of cache keys in LRU order
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values in the cache (oldest to newest)
   * @returns Array of cached values in LRU order
   */
  values(): V[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get all entries in the cache (oldest to newest)
   * @returns Array of [key, value] tuples in LRU order
   */
  entries(): [K, V][] {
    return Array.from(this.cache.entries());
  }

  /**
   * Delete entries matching a predicate
   * @param predicate - Function that returns true for entries to delete
   * @returns Number of entries deleted
   *
   * @example
   * ```typescript
   * // Delete all permission checks for a specific list
   * const deleted = cache.deleteWhere(([key]) => key.startsWith('list_permission_MyList'));
   * ```
   */
  deleteWhere(predicate: (entry: [K, V]) => boolean): number {
    let deleted = 0;
    const entriesToDelete: K[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (predicate([key, value])) {
        entriesToDelete.push(key);
      }
    }

    for (const key of entriesToDelete) {
      if (this.cache.delete(key)) {
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Get cache statistics
   * @returns Object containing cache usage statistics
   */
  getStats(): {
    size: number;
    capacity: number;
    utilizationPercent: number;
    isFull: boolean;
  } {
    return {
      size: this.cache.size,
      capacity: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
      isFull: this.cache.size >= this.maxSize,
    };
  }

  /**
   * Execute a callback for each entry in the cache (oldest to newest)
   * @param callback - Function to execute for each entry
   *
   * @remarks
   * Does not affect the LRU order
   */
  forEach(callback: (value: V, key: K, cache: LRUCache<K, V>) => void): void {
    for (const [key, value] of this.cache.entries()) {
      callback(value, key, this);
    }
  }
}
