import { spfi, SPFI, SPFx } from '@pnp/sp';
import { CacheModule } from '../modules/cache';
import { SimpleLogger } from '../modules/logger';
import type { ISiteContext, ISiteConfig, ContextConfig, SPFxContextInput, CacheStrategy } from '../types';
import '@pnp/sp/webs';

/**
 * Internal manager for multi-site connections
 * Handles creation, storage, and lifecycle of site contexts
 */
export class MultiSiteContextManager {
  // Map of normalized URLs to site contexts
  private siteContexts: Map<string, ISiteContext> = new Map();

  // Map of aliases to normalized URLs
  private aliases: Map<string, string> = new Map();

  // Primary SPFx context (for authentication)
  private primaryContext: SPFxContextInput;

  // Primary cache configuration (for hybrid cache strategy)
  private primaryCacheConfig?: ContextConfig['cache'];

  // Primary logger for multi-site operations
  private logger: SimpleLogger;

  constructor(
    primaryContext: SPFxContextInput,
    logger: SimpleLogger,
    primaryCacheConfig?: ContextConfig['cache']
  ) {
    this.primaryContext = primaryContext;
    this.logger = logger;
    this.primaryCacheConfig = primaryCacheConfig;
  }

  /**
   * Add a connection to another SharePoint site
   */
  async addSite(siteUrl: string, config?: ISiteConfig): Promise<void> {
    // 1. Normalize URL
    const normalized = this.normalizeUrl(siteUrl);

    // 2. Check if already connected
    if (this.siteContexts.has(normalized)) {
      throw new Error(`Site already connected: ${siteUrl}. Use SPContext.sites.get() to access it.`);
    }

    // 3. Check if alias already in use
    if (config?.alias && this.aliases.has(config.alias)) {
      throw new Error(
        `Alias '${config.alias}' is already in use for site: ${this.aliases.get(config.alias)}`
      );
    }

    try {
      this.logger.info(`Connecting to site: ${normalized}`, { config });

      // 4. Create PnP instance for the site using primary context auth
      const sp = spfi(normalized).using(SPFx(this.primaryContext));

      // 5. Fetch site properties to validate access (fail-fast approach)
      let web: any;
      try {
        web = await sp.web.select('Title', 'Id', 'ServerRelativeUrl', 'Url')();
      } catch (error: any) {
        // Parse error and provide helpful message
        if (error.status === 403) {
          throw new Error(
            `Access denied to site: ${normalized}. You may not have permission to access this site.`
          );
        } else if (error.status === 404) {
          throw new Error(`Site not found: ${normalized}. Please check the URL and try again.`);
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error(
            `Network error while connecting to site: ${normalized}. Please check your connection.`
          );
        } else {
          throw new Error(
            `Failed to connect to site: ${normalized}. Error: ${error.message || 'Unknown error'}`
          );
        }
      }

      // 6. Determine cache configuration (hybrid approach)
      const cacheConfig = this.resolveCacheConfig(config);

      // 7. Create cached instances based on configuration
      let spCached: SPFI = sp;
      let spPessimistic: SPFI = sp;

      if (cacheConfig.strategy && cacheConfig.strategy !== 'none') {
        // Create cache module for this site
        const cacheModule = new CacheModule();
        await cacheModule.initialize(this.primaryContext, { cache: cacheConfig as ContextConfig['cache'] });

        const cacheBehavior = cacheModule.createBehavior(cacheConfig.strategy as CacheStrategy, cacheConfig.ttl);

        if (cacheBehavior) {
          spCached = sp.using(cacheBehavior);
        }

        // Always create pessimistic instance (no cache)
        const pessimisticBehavior = cacheModule.createBehavior('none' as CacheStrategy, 0);
        if (pessimisticBehavior) {
          spPessimistic = sp.using(pessimisticBehavior);
        }
      }

      // 8. Create site-specific logger
      const siteLogger = new SimpleLogger({
        level: (this.logger as any).config.level, // Inherit log level from primary
        componentName: config?.logger?.prefix || this.getSiteNameFromUrl(normalized),
        environment: (this.logger as any).config.environment, // Inherit environment
        correlationId: (this.logger as any).config.correlationId, // Share correlation ID
        enableConsole: config?.logger?.enabled ?? true,
      });

      // 9. Create site-specific cache module
      const siteCache = new CacheModule();
      await siteCache.initialize(this.primaryContext, { cache: cacheConfig as ContextConfig['cache'] });

      // 10. Create site context object
      const siteContext: ISiteContext = {
        sp,
        spCached,
        spPessimistic,
        siteUrl: normalized,
        webAbsoluteUrl: web.Url || normalized,
        webServerRelativeUrl: web.ServerRelativeUrl,
        webTitle: web.Title,
        webId: web.Id?.toString() || '',
        alias: config?.alias,
        config: config || {},
        logger: siteLogger,
        cache: siteCache,
      };

      // 11. Store in maps
      this.siteContexts.set(normalized, siteContext);
      if (config?.alias) {
        this.aliases.set(config.alias, normalized);
      }

      this.logger.success(`Connected to site: ${web.Title}`, {
        url: normalized,
        alias: config?.alias,
        cacheStrategy: cacheConfig.strategy,
      });
    } catch (error: any) {
      this.logger.error(`Failed to connect to site: ${normalized}`, error);
      throw error;
    }
  }

  /**
   * Get a connected site context by URL or alias
   */
  getSite(siteUrlOrAlias: string): ISiteContext {
    // Resolve alias to URL if needed
    const url = this.resolveUrl(siteUrlOrAlias);

    const context = this.siteContexts.get(url);
    if (!context) {
      throw new Error(
        `Site not connected: ${siteUrlOrAlias}. Call SPContext.sites.add('${siteUrlOrAlias}') first.`
      );
    }

    return context;
  }

  /**
   * Remove a site connection and clean up resources
   */
  removeSite(siteUrlOrAlias: string): void {
    const url = this.resolveUrl(siteUrlOrAlias);

    const context = this.siteContexts.get(url);
    if (!context) {
      this.logger.warn(`Site not connected: ${siteUrlOrAlias}. Nothing to remove.`);
      return;
    }

    // Remove from maps
    this.siteContexts.delete(url);
    if (context.alias) {
      this.aliases.delete(context.alias);
    }

    this.logger.info(`Disconnected from site: ${url}`, { alias: context.alias });
  }

  /**
   * List all connected sites
   */
  listSites(): string[] {
    return Array.from(this.siteContexts.keys());
  }

  /**
   * Check if a site is connected
   */
  hasSite(siteUrlOrAlias: string): boolean {
    try {
      const url = this.resolveUrl(siteUrlOrAlias);
      return this.siteContexts.has(url);
    } catch {
      return false;
    }
  }

  /**
   * Resolve URL or alias to normalized URL
   */
  private resolveUrl(siteUrlOrAlias: string): string {
    // Check if it's an alias first
    if (this.aliases.has(siteUrlOrAlias)) {
      return this.aliases.get(siteUrlOrAlias)!;
    }

    // Otherwise normalize as URL
    return this.normalizeUrl(siteUrlOrAlias);
  }

  /**
   * Normalize URL: lowercase, remove trailing slashes
   */
  private normalizeUrl(url: string): string {
    return url.replace(/\/$/, '').toLowerCase();
  }

  /**
   * Resolve cache configuration (hybrid approach)
   * Default to primary site's config, allow per-site override
   */
  private resolveCacheConfig(
    siteConfig?: ISiteConfig
  ): { strategy: CacheStrategy; ttl: number } {
    return {
      strategy:
        (siteConfig?.cache?.strategy as CacheStrategy) || this.primaryCacheConfig?.strategy || 'none',
      ttl: siteConfig?.cache?.ttl || this.primaryCacheConfig?.ttl || 0,
    };
  }

  /**
   * Extract site name from URL for logger prefix
   */
  private getSiteNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      return pathParts[pathParts.length - 1] || 'Site';
    } catch {
      return 'Site';
    }
  }

  /**
   * Clean up all site connections
   */
  cleanup(): void {
    this.siteContexts.clear();
    this.aliases.clear();
  }
}
