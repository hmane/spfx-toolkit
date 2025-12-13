/**
 * src/context/modules/cache.ts
 * Simple caching module with PnP integration
 */

import { Caching } from '@pnp/queryable';
import type { CacheStrategy, ContextConfig, ContextModule, SPFxContextInput } from '../types';

/**
 * Cache module for PnP behaviors
 */
export class CacheModule implements ContextModule {
  name = 'cache';
  private defaultTtl = 5 * 60 * 1000; // 5 minutes

  async initialize(context: SPFxContextInput, config: ContextConfig): Promise<any> {
    // Cache module doesn't need async initialization
    // Just returns methods for creating cache behaviors
    return {
      createBehavior: this.createBehavior.bind(this),
      clearCache: this.clearCache.bind(this),
    };
  }

  createBehavior(strategy: CacheStrategy, ttl?: number): any {
    const cacheConfig = this.getCacheConfig(strategy, ttl);

    if (!cacheConfig) {
      return undefined; // No caching
    }

    return Caching({
      store: cacheConfig.store,
      keyFactory: (url: string) => this.normalizeKey(url),
      expireFunc: () => new Date(Date.now() + cacheConfig.ttl),
    });
  }

  private getCacheConfig(
    strategy: CacheStrategy,
    ttl?: number
  ): { store: 'local' | 'session'; ttl: number } | undefined {
    const cacheTtl = ttl || this.defaultTtl;

    switch (strategy) {
      case 'memory':
        return {
          store: 'session', // Use session storage for memory-like behavior
          ttl: cacheTtl,
        };
      case 'storage':
        return {
          store: 'local', // Use local storage for persistence
          ttl: cacheTtl,
        };
      case 'none':
      default:
        return undefined;
    }
  }

  private normalizeKey(url: string): string {
    try {
      // Create consistent cache keys by normalizing URLs
      const urlObj = new URL(url);

      // Sort query parameters for consistency
      const params = new URLSearchParams(urlObj.search);
      const sortedParams = new URLSearchParams();

      const paramKeys: string[] = [];
      params.forEach((value, key) => {
        paramKeys.push(key);
      });

      paramKeys.sort().forEach(key => {
        sortedParams.set(key, params.get(key) || '');
      });

      return `${urlObj.origin}${urlObj.pathname}${
        sortedParams.toString() ? '?' + sortedParams.toString() : ''
      }`.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  private clearCache(): void {
    try {
      // Clear both session and local storage items that look like PnP cache keys
      const clearStorage = (storage: Storage) => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && (key.startsWith('pnp') || key.includes('_api'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => storage.removeItem(key));
      };

      clearStorage(localStorage);
      clearStorage(sessionStorage);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}

/**
 * Simple in-memory cache provider (alternative to browser storage)
 */
export class MemoryCacheProvider {
  private cache = new Map<string, { value: any; expiry: number }>();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs: number = 60000) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = 300000): Promise<void> {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    void this.clear();
  }
}
