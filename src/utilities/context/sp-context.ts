/**
 * Updated sp-context.ts with fixes and PeoplePicker support
 */

import type { SPFI } from '@pnp/sp';
import type { PageContext } from '@microsoft/sp-page-context';
import type { IPeoplePickerContext } from '@pnp/spfx-controls-react/lib/PeoplePicker';
import type {
  SPFxContextInput,
  ContextConfig,
  ContextHealthCheck,
  SPFxContext,
  Logger,
  HttpClient,
  PerformanceTracker,
  IMultiSiteAPI,
} from './types';
import { IPrincipal } from '../../types';

/**
 * Enhanced SPContext with comprehensive SharePoint properties
 */
export class SPContext {
  private static contextModule: any = null;
  private static multiSiteManager: any = null;

  /**
   * Initialize the context with lazy loading
   */
  static async initialize(
    spfxContext: SPFxContextInput,
    config: ContextConfig = {}
  ): Promise<SPFxContext> {
    if (!SPContext.contextModule) {
      SPContext.contextModule = await import('./core/context-manager');
    }

    const context = await SPContext.contextModule.Context.initialize(spfxContext, config);

    // Initialize multi-site manager
    await SPContext.initializeMultiSiteManager(spfxContext, config);

    return context;
  }

  /**
   * Initialize the multi-site manager (internal)
   */
  private static async initializeMultiSiteManager(
    spfxContext: SPFxContextInput,
    config: ContextConfig
  ): Promise<void> {
    if (!SPContext.multiSiteManager) {
      const { MultiSiteContextManager } = await import('./core/multi-site-manager');
      const { SimpleLogger } = await import('./modules/logger');

      // Get the logger instance - it's a SimpleLogger internally
      const loggerInstance = SPContext.context.logger as any;

      SPContext.multiSiteManager = new MultiSiteContextManager(
        spfxContext,
        loggerInstance,
        config.cache
      );
    }
  }

  /**
   * Basic setup - good for most scenarios
   */
  static async basic(spfxContext: SPFxContextInput, componentName: string): Promise<SPFxContext> {
    return SPContext.initialize(spfxContext, {
      componentName,
      logging: {
        level: 1, // Info
        enableConsole: true,
        enablePerformance: false,
      },
      cache: {
        strategy: 'memory',
        ttl: 300000, // 5 minutes
      },
      http: {
        timeout: 30000,
        retries: 2,
        enableAuth: true,
      },
    });
  }

  /**
   * Production setup - optimized for performance and minimal logging
   */
  static async production(
    spfxContext: SPFxContextInput,
    componentName: string
  ): Promise<SPFxContext> {
    return SPContext.initialize(spfxContext, {
      componentName,
      logging: {
        level: 2, // Warning
        enableConsole: false,
        enablePerformance: true,
      },
      cache: {
        strategy: 'storage',
        ttl: 600000, // 10 minutes
      },
      http: {
        timeout: 20000,
        retries: 3,
        enableAuth: true,
      },
    });
  }

  /**
   * Development setup - verbose logging, no caching
   */
  static async development(
    spfxContext: SPFxContextInput,
    componentName: string
  ): Promise<SPFxContext> {
    return SPContext.initialize(spfxContext, {
      componentName,
      logging: {
        level: 0, // Verbose
        enableConsole: true,
        enablePerformance: true,
      },
      cache: {
        strategy: 'none',
      },
      http: {
        timeout: 60000,
        retries: 1,
        enableAuth: true,
      },
    });
  }

  /**
   * Smart setup - detects environment automatically
   */
  static async smart(spfxContext: SPFxContextInput, componentName: string): Promise<SPFxContext> {
    const { EnvironmentDetector } = await import('./utils/environment');
    const environment = EnvironmentDetector.detect(spfxContext.pageContext);

    switch (environment) {
      case 'dev':
        return SPContext.development(spfxContext, componentName);
      case 'uat':
        return SPContext.initialize(spfxContext, {
          componentName,
          logging: { level: 1, enablePerformance: true },
          cache: { strategy: 'memory', ttl: 300000 },
        });
      case 'prod':
      default:
        return SPContext.production(spfxContext, componentName);
    }
  }

  /**
   * Teams-optimized setup
   */
  static async teams(spfxContext: SPFxContextInput, componentName: string): Promise<SPFxContext> {
    return SPContext.initialize(spfxContext, {
      componentName,
      logging: {
        level: 1,
        enablePerformance: true,
      },
      cache: {
        strategy: 'memory',
        ttl: 120000, // 2 minutes
      },
      http: {
        timeout: 20000,
        retries: 2,
        enableAuth: true,
      },
    });
  }

  // ========================================
  // CORE ACCESS METHODS - FIXED
  // ========================================

  static get context(): SPFxContext {
    if (!SPContext.contextModule) {
      throw new Error('SPContext not initialized. Call SPContext.initialize() first.');
    }
    // FIX: Use the correct method name that exists in context-manager
    return SPContext.contextModule.Context.getCurrentContext();
  }

  /**
   * Get the default PnP SP instance with standard caching
   *
   * This is the most commonly used instance for SharePoint operations.
   * Uses default caching strategy (memory cache with TTL).
   *
   * @returns SPFI instance for SharePoint operations
   *
   * @example
   * ```typescript
   * // Fetch list items
   * const items = await SPContext.sp.web.lists.getByTitle('MyList').items();
   *
   * // Get current user
   * const user = await SPContext.sp.web.currentUser();
   * ```
   */
  static get sp(): SPFI {
    return SPContext.context.sp;
  }

  /**
   * Get PnP SP instance with aggressive memory caching
   *
   * Uses in-memory caching for frequently accessed data that changes infrequently.
   * Best for site metadata, user info, and list schemas.
   *
   * @returns SPFI instance with memory caching enabled
   *
   * @example
   * ```typescript
   * // Cache-friendly operations
   * const lists = await SPContext.spCached.web.lists();
   * const fields = await SPContext.spCached.web.lists.getByTitle('MyList').fields();
   * ```
   */
  static get spCached(): SPFI {
    return SPContext.context.spCached;
  }

  /**
   * Get PnP SP instance with no caching (pessimistic mode)
   *
   * Bypasses all caching to always fetch fresh data from SharePoint.
   * Use for real-time data, permission checks, or when cache invalidation is critical.
   *
   * @returns SPFI instance with caching disabled
   *
   * @example
   * ```typescript
   * // Always get fresh data
   * const currentPermissions = await SPContext.spPessimistic.web.lists
   *   .getByTitle('MyList')
   *   .currentUserHasPermissions(PermissionKind.EditListItems);
   * ```
   */
  static get spPessimistic(): SPFI {
    return SPContext.context.spPessimistic;
  }

  /**
   * Get the centralized logger instance
   *
   * Provides structured logging with multiple levels (info, warn, error, success).
   * Automatically categorizes errors and sanitizes sensitive data.
   *
   * @returns Logger instance
   *
   * @example
   * ```typescript
   * // Log various levels
   * SPContext.logger.info('User action', { action: 'submit', formId: 123 });
   * SPContext.logger.warn('API rate limit approaching', { remaining: 10 });
   * SPContext.logger.error('Failed to save', error, { itemId: 456 });
   * SPContext.logger.success('Operation completed', { duration: 1500 });
   *
   * // Performance timing
   * const timer = SPContext.logger.startTimer('operation');
   * // ... do work
   * const duration = timer(); // Returns duration in ms
   * ```
   */
  static get logger(): Logger {
    return SPContext.context.logger;
  }

  /**
   * Get the HTTP client for custom API calls
   *
   * Configured with authentication and retry logic.
   * Use for calling custom APIs, Azure Functions, or third-party services.
   *
   * @returns HttpClient instance
   *
   * @example
   * ```typescript
   * const response = await SPContext.http.get('https://api.example.com/data');
   * const data = await response.json();
   * ```
   */
  static get http(): HttpClient {
    return SPContext.context.http;
  }

  /**
   * Get the performance tracker
   *
   * Monitors operation performance and provides metrics.
   *
   * @returns PerformanceTracker instance
   */
  static get performance(): PerformanceTracker {
    return SPContext.context.performance;
  }

  /**
   * Get the original SPFx context
   *
   * Access to the raw SharePoint Framework context object.
   *
   * @returns SPFx context input
   */
  static get spfxContext(): SPFxContextInput {
    return SPContext.context.context;
  }

  /**
   * Get the page context from SPFx
   *
   * Contains site, web, user, and page information.
   *
   * @returns PageContext from SPFx
   *
   * @example
   * ```typescript
   * const siteUrl = SPContext.pageContext.web.absoluteUrl;
   * const userName = SPContext.pageContext.user.displayName;
   * ```
   */
  static get pageContext(): PageContext {
    return SPContext.context.pageContext;
  }

  // ========================================
  // ESSENTIAL URL PROPERTIES (web-only)
  // ========================================

  static get webAbsoluteUrl(): string {
    return SPContext.context.webAbsoluteUrl;
  }

  static get webServerRelativeUrl(): string {
    return SPContext.context.webServerRelativeUrl;
  }

  // ========================================
  // WEB METADATA
  // ========================================

  static get webTitle(): string {
    return SPContext.context.webTitle;
  }

  static get webId(): string | undefined {
    return SPContext.context.webId;
  }

  // ========================================
  // LIST CONTEXT (when available)
  // ========================================

  static get listId(): string | undefined {
    return SPContext.context.listId;
  }

  static get listTitle(): string | undefined {
    return SPContext.context.listTitle;
  }

  static get listServerRelativeUrl(): string | undefined {
    return SPContext.context.listServerRelativeUrl;
  }

  // ========================================
  // CULTURE AND LOCALIZATION
  // ========================================

  static get currentUICultureName(): string {
    return SPContext.context.currentUICultureName;
  }

  static get currentCultureName(): string {
    return SPContext.context.currentCultureName;
  }

  static get isRightToLeft(): boolean {
    return SPContext.context.isRightToLeft;
  }

  // ========================================
  // USER INFORMATION (Simple)
  // ========================================

  static get currentUser(): IPrincipal {
    return SPContext.context.currentUser;
  }

  // ========================================
  // APPLICATION AND ENVIRONMENT
  // ========================================

  static get applicationName(): string {
    return SPContext.context.applicationName;
  }

  static get tenantUrl(): string {
    return SPContext.context.tenantUrl;
  }

  static get environment(): string {
    return SPContext.context.environment;
  }

  static get correlationId(): string {
    return SPContext.context.correlationId;
  }

  static get isTeamsContext(): boolean {
    return SPContext.context.isTeamsContext;
  }

  // ========================================
  // PEOPLEPICKER CONTEXT - Uses IPeoplePickerContext from PnP
  // ========================================

  static get peoplepickerContext(): IPeoplePickerContext {
    return SPContext.context.peoplepickerContext;
  }

  // ========================================
  // MULTI-SITE CONNECTIVITY
  // ========================================

  /**
   * Multi-site connection management API
   *
   * Provides methods to connect to and manage multiple SharePoint sites.
   * Each connected site gets its own PnP instances (sp, spCached, spPessimistic).
   *
   * @returns Multi-site API with add, get, remove, list, and has methods
   *
   * @example
   * ```typescript
   * // Connect to another site
   * await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', {
   *   alias: 'hr',
   *   cache: { strategy: 'memory', ttl: 300000 }
   * });
   *
   * // Use the connected site
   * const hrSite = SPContext.sites.get('hr');
   * const employees = await hrSite.sp.web.lists
   *   .getByTitle('Employees')
   *   .items();
   *
   * console.log(`Site: ${hrSite.webTitle}`);
   * console.log(`Found ${employees.length} employees`);
   *
   * // Clean up when done
   * SPContext.sites.remove('hr');
   * ```
   */
  static get sites(): IMultiSiteAPI {
    if (!SPContext.multiSiteManager) {
      throw new Error(
        'SPContext not initialized. Call SPContext.smart() or SPContext.initialize() first.'
      );
    }

    return {
      add: (siteUrl: string, config?: any) => SPContext.multiSiteManager.addSite(siteUrl, config),
      get: (siteUrlOrAlias: string) => SPContext.multiSiteManager.getSite(siteUrlOrAlias),
      remove: (siteUrlOrAlias: string) => SPContext.multiSiteManager.removeSite(siteUrlOrAlias),
      list: () => SPContext.multiSiteManager.listSites(),
      has: (siteUrlOrAlias: string) => SPContext.multiSiteManager.hasSite(siteUrlOrAlias),
    };
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Check if SPContext has been initialized
   *
   * Use this method to verify context initialization before accessing SPContext properties.
   * Particularly useful in components that may render before initialization completes.
   *
   * @returns True if context is initialized and ready to use, false otherwise
   *
   * @example
   * ```typescript
   * // Guard against uninitialized context
   * if (!SPContext.isReady()) {
   *   console.warn('SPContext not yet initialized');
   *   return;
   * }
   *
   * // Safe to use SPContext
   * const user = await SPContext.sp.web.currentUser();
   * ```
   */
  static isReady(): boolean {
    try {
      return SPContext.contextModule?.Context?.isReady() ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Reset SPContext to allow reinitialization
   *
   * Cleans up all context resources including multi-site connections, cache, and modules.
   * After calling reset(), you must call one of the initialization methods again before
   * using SPContext.
   *
   * @remarks
   * This method is primarily useful for:
   * - Testing scenarios where you need to reinitialize with different configuration
   * - Handling context errors that require full reinitialization
   * - Cleaning up resources when unmounting root components
   *
   * @example
   * ```typescript
   * // Reinitialize with different configuration
   * SPContext.reset();
   * await SPContext.development(this.context, 'MyWebPart');
   * ```
   *
   * @example Testing scenario
   * ```typescript
   * afterEach(() => {
   *   // Clean up after each test
   *   SPContext.reset();
   * });
   *
   * it('should initialize in development mode', async () => {
   *   await SPContext.development(mockContext, 'TestComponent');
   *   expect(SPContext.isReady()).toBe(true);
   * });
   * ```
   */
  static reset(): void {
    // Clean up multi-site connections
    if (SPContext.multiSiteManager) {
      SPContext.multiSiteManager.cleanup();
      SPContext.multiSiteManager = null;
    }

    // Clean up main context
    if (SPContext.contextModule) {
      SPContext.contextModule.Context.reset();
    }
    SPContext.contextModule = null;
  }

  static async addModule(module: any, config?: any): Promise<void> {
    if (!SPContext.contextModule) {
      throw new Error('SPContext not initialized. Call initialize() first.');
    }
    return SPContext.contextModule.Context.addModule(module, config);
  }

  /**
   * Get context health check - focuses on performance and configuration
   */
  static async getHealthCheck(): Promise<ContextHealthCheck> {
    if (!SPContext.isReady()) {
      return {
        isHealthy: false,
        issues: [
          {
            severity: 'critical',
            type: 'configuration',
            message: 'SPContext not initialized',
            resolution: 'Call SPContext.initialize() first',
          },
        ],
        recommendations: ['Initialize SPContext before using'],
        performance: {
          averageResponseTime: 0,
          slowOperations: 0,
          errorRate: 1.0,
        },
      };
    }

    const issues: any[] = [];
    const recommendations: string[] = [];
    const performanceMetrics = SPContext.performance.getMetrics();

    // Check performance metrics
    const slowOps = SPContext.performance.getSlowOperations(1000);
    const failedOps = SPContext.performance.getFailedOperations();
    const avgTime = SPContext.performance.getAverageTime();

    // Performance issues
    if (slowOps.length > 0) {
      issues.push({
        severity: 'medium',
        type: 'performance',
        message: `${slowOps.length} slow operations detected (>1000ms)`,
        details: {
          slowestOperations: slowOps.slice(0, 3).map(op => ({
            name: op.name,
            duration: op.duration,
            timestamp: new Date(op.timestamp).toISOString(),
          })),
        },
        resolution: 'Consider optimizing queries or implementing caching',
      });
      recommendations.push('Enable caching for frequently accessed data');
    }

    // Error rate check
    if (failedOps.length > 0 && performanceMetrics.length > 0) {
      const errorRate = failedOps.length / performanceMetrics.length;
      if (errorRate > 0.1) {
        issues.push({
          severity: 'high',
          type: 'network',
          message: `High error rate: ${Math.round(errorRate * 100)}%`,
          details: {
            totalOperations: performanceMetrics.length,
            failedOperations: failedOps.length,
            recentFailures: failedOps.slice(-3).map(op => ({
              name: op.name,
              timestamp: new Date(op.timestamp).toISOString(),
            })),
          },
          resolution: 'Check network connectivity and API endpoints',
        });
        recommendations.push('Review failed operations and implement retry logic');
      }
    }

    // Cache configuration check
    if (!SPContext.context.spCached && !SPContext.context.spPessimistic) {
      recommendations.push('Consider enabling caching for better performance');
    }

    // Very high average response time
    if (avgTime > 2000) {
      issues.push({
        severity: 'medium',
        type: 'performance',
        message: `High average response time: ${avgTime}ms`,
        resolution: 'Review query complexity and consider implementing caching',
      });
    }

    // No recent activity (potential configuration issue)
    if (performanceMetrics.length === 0) {
      issues.push({
        severity: 'low',
        type: 'configuration',
        message: 'No performance metrics recorded',
        details: {
          performanceTrackingEnabled: SPContext.context.performance !== undefined,
        },
        resolution: 'Ensure operations are being tracked through SPContext.performance.track()',
      });
    }

    // PeoplePicker context health check
    const ppContext = SPContext.context.peoplepickerContext;
    if (!ppContext.msGraphClientFactory || !ppContext.spHttpClient) {
      issues.push({
        severity: 'medium',
        type: 'configuration',
        message: 'PeoplePicker context may be incomplete',
        details: {
          hasAbsoluteUrl: !!ppContext.absoluteUrl,
          hasMSGraphFactory: !!ppContext.msGraphClientFactory,
          hasSPHttpClient: !!ppContext.spHttpClient,
        },
        resolution: 'Check service scope configuration for MSGraph and SPHttpClient',
      });
    }

    return {
      isHealthy:
        issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues,
      recommendations,
      performance: {
        averageResponseTime: avgTime,
        slowOperations: slowOps.length,
        errorRate: performanceMetrics.length > 0 ? failedOps.length / performanceMetrics.length : 0,
      },
    };
  }

  /**
   * Build SharePoint API URL with proper formatting
   */
  static buildApiUrl(endpoint: string): string {
    const baseUrl = SPContext.webAbsoluteUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

    if (!cleanEndpoint.startsWith('_api/')) {
      return `${baseUrl}/_api/${cleanEndpoint}`;
    }

    return `${baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Get user-friendly environment display name
   */
  static getEnvironmentDisplayName(): string {
    switch (SPContext.environment) {
      case 'dev':
        return 'Development';
      case 'uat':
        return 'User Acceptance Testing';
      case 'prod':
        return 'Production';
      default:
        return SPContext.environment;
    }
  }

  /**
   * Get formatted tenant information
   */
  static getTenantInfo(): {
    name: string;
    url: string;
  } {
    const tenantUrl = SPContext.tenantUrl;
    let tenantName = 'Unknown';

    try {
      const url = new URL(tenantUrl);
      const hostParts = url.hostname.split('.');
      tenantName = hostParts[0];
    } catch {
      tenantName = 'SharePoint Online';
    }

    return {
      name: tenantName,
      url: tenantUrl,
    };
  }

  /**
   * Create a formatted context summary for debugging
   */
  static getContextSummary(): {
    basic: {
      webTitle: string;
      applicationName: string;
      correlationId: string;
    };
    urls: {
      webAbsoluteUrl: string;
      webServerRelativeUrl: string;
      tenantUrl: string;
    };
    user: {
      title?: string;
      loginName?: string;
      email?: string;
    };
    environment: {
      name: string;
      displayName: string;
      isTeams: boolean;
      culture: string;
      isRTL: boolean;
    };
    performance: {
      averageTime: number;
      totalOperations: number;
      slowOperations: number;
      failedOperations: number;
    };
    peoplepicker: {
      hasAbsoluteUrl: boolean;
      hasMSGraphFactory: boolean;
      hasSPHttpClient: boolean;
    };
  } {
    const ppContext = SPContext.peoplepickerContext;

    return {
      basic: {
        webTitle: SPContext.webTitle,
        applicationName: SPContext.applicationName,
        correlationId: SPContext.correlationId.slice(-8),
      },
      urls: {
        webAbsoluteUrl: SPContext.webAbsoluteUrl,
        webServerRelativeUrl: SPContext.webServerRelativeUrl,
        tenantUrl: SPContext.tenantUrl,
      },
      user: {
        title: SPContext.currentUser.title,
        loginName: SPContext.currentUser.loginName,
        email: SPContext.currentUser.email,
      },
      environment: {
        name: SPContext.environment,
        displayName: SPContext.getEnvironmentDisplayName(),
        isTeams: SPContext.isTeamsContext,
        culture: SPContext.currentUICultureName,
        isRTL: SPContext.isRightToLeft,
      },
      performance: {
        averageTime: SPContext.performance.getAverageTime(),
        totalOperations: SPContext.performance.getMetrics().length,
        slowOperations: SPContext.performance.getSlowOperations().length,
        failedOperations: SPContext.performance.getFailedOperations().length,
      },
      peoplepicker: {
        hasAbsoluteUrl: !!ppContext.absoluteUrl,
        hasMSGraphFactory: !!ppContext.msGraphClientFactory,
        hasSPHttpClient: !!ppContext.spHttpClient,
      },
    };
  }
}
