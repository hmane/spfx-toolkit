import type { SPFI } from '@pnp/sp';
import type { CacheModule } from '../modules/cache';
import type { Logger } from '../types';

/**
 * Configuration options for connecting to a SharePoint site
 */
export interface ISiteConfig {
  /**
   * Cache configuration for the site
   * If not specified, inherits from primary site's configuration
   */
  cache?: {
    /**
     * Cache strategy: 'none' (no caching), 'memory' (session storage), 'storage' (local storage)
     * @default Inherited from primary site
     */
    strategy?: 'none' | 'memory' | 'storage';

    /**
     * Time-to-live for cached items in milliseconds
     * @default Inherited from primary site
     */
    ttl?: number;
  };

  /**
   * Logger configuration for the site
   */
  logger?: {
    /**
     * Enable/disable logging for this site
     * @default true
     */
    enabled?: boolean;

    /**
     * Prefix for log messages from this site
     * @default Site URL
     */
    prefix?: string;
  };

  /**
   * Optional friendly name/alias for the site
   * Allows using SPContext.sites.get('alias') instead of full URL
   * @example 'hr', 'finance', 'projects'
   */
  alias?: string;
}

/**
 * Context object for a connected SharePoint site
 * Contains PnP instances and site properties
 */
export interface ISiteContext {
  /**
   * Standard PnP SP instance for this site
   * Use for general SharePoint operations
   */
  sp: SPFI;

  /**
   * Memory-cached PnP SP instance for this site
   * Use for frequently accessed data to improve performance
   */
  spCached: SPFI;

  /**
   * No-cache (pessimistic) PnP SP instance for this site
   * Use when you need always-fresh data
   */
  spPessimistic: SPFI;

  /**
   * Full URL of the site (normalized)
   * @example 'https://contoso.sharepoint.com/sites/hr'
   */
  siteUrl: string;

  /**
   * Absolute URL of the web
   * @example 'https://contoso.sharepoint.com/sites/hr'
   */
  webAbsoluteUrl: string;

  /**
   * Server-relative URL of the web
   * @example '/sites/hr'
   */
  webServerRelativeUrl: string;

  /**
   * Title of the web
   * @example 'Human Resources'
   */
  webTitle: string;

  /**
   * GUID of the web
   */
  webId: string;

  /**
   * Friendly alias for the site (if provided during add)
   * @example 'hr'
   */
  alias?: string;

  /**
   * Configuration used for this site
   */
  config: ISiteConfig;

  /**
   * Logger instance for this site
   * Automatically prefixed with site information
   */
  logger: Logger;

  /**
   * Cache module for this site
   * Isolated cache per site
   */
  cache: CacheModule;
}

/**
 * API for managing multi-site connections
 */
export interface IMultiSiteAPI {
  /**
   * Add a connection to another SharePoint site
   *
   * @param siteUrl - Full URL of the site (e.g., 'https://tenant.sharepoint.com/sites/hr')
   * @param config - Optional configuration for caching, logging, and alias
   * @returns Promise that resolves when site is connected
   * @throws Error if site is unreachable, authentication fails, or already connected
   *
   * @example
   * ```typescript
   * // Simple connection with default config
   * await SPContext.sites.add('https://contoso.sharepoint.com/sites/projects');
   *
   * // With custom caching and alias
   * await SPContext.sites.add('https://contoso.sharepoint.com/sites/archive', {
   *   cache: {
   *     strategy: 'memory',
   *     ttl: 3600000 // 1 hour
   *   },
   *   alias: 'archive'
   * });
   * ```
   */
  add(siteUrl: string, config?: ISiteConfig): Promise<void>;

  /**
   * Get a connected site context by URL or alias
   *
   * @param siteUrlOrAlias - Full site URL or alias name
   * @returns Site context with sp instances and properties
   * @throws Error if site is not connected
   *
   * @example
   * ```typescript
   * // Get by URL
   * const hrSite = SPContext.sites.get('https://contoso.sharepoint.com/sites/hr');
   * const lists = await hrSite.sp.web.lists();
   *
   * // Get by alias
   * const archiveSite = SPContext.sites.get('archive');
   * console.log(archiveSite.webTitle);
   * ```
   */
  get(siteUrlOrAlias: string): ISiteContext;

  /**
   * Remove a site connection and clean up resources
   *
   * @param siteUrlOrAlias - Full site URL or alias name
   *
   * @example
   * ```typescript
   * SPContext.sites.remove('https://contoso.sharepoint.com/sites/temp');
   * // Or by alias
   * SPContext.sites.remove('archive');
   * ```
   */
  remove(siteUrlOrAlias: string): void;

  /**
   * List all connected sites
   *
   * @returns Array of site URLs (normalized)
   *
   * @example
   * ```typescript
   * const sites = SPContext.sites.list();
   * // ['https://contoso.sharepoint.com/sites/hr',
   * //  'https://contoso.sharepoint.com/sites/projects']
   * ```
   */
  list(): string[];

  /**
   * Check if a site is already connected
   *
   * @param siteUrlOrAlias - Full site URL or alias name
   * @returns true if site is connected, false otherwise
   *
   * @example
   * ```typescript
   * if (!SPContext.sites.has('https://contoso.sharepoint.com/sites/hr')) {
   *   await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr');
   * }
   * ```
   */
  has(siteUrlOrAlias: string): boolean;
}
