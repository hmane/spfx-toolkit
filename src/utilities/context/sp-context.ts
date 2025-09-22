/**
 * Focused sp-context.ts with essential enhancements only
 */

import type { SPFI } from '@pnp/sp';
import type { PageContext } from '@microsoft/sp-page-context';
import type {
  SPFxContextInput,
  ContextConfig,
  ContextHealthCheck,
  SPFxContext,
  Logger,
  HttpClient,
  PerformanceTracker,
} from './types';
import { IPrincipal } from '../../types';

/**
 * Enhanced SPContext with comprehensive SharePoint properties
 */
export class SPContext {
  private static contextModule: any = null;

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

    return SPContext.contextModule.Context.initialize(spfxContext, config);
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
  // CORE ACCESS METHODS
  // ========================================

  static get context(): SPFxContext {
    if (!SPContext.contextModule) {
      throw new Error('SPContext not initialized. Call SPContext.initialize() first.');
    }
    return SPContext.contextModule.getCurrentContext();
  }

  static get sp(): SPFI {
    return SPContext.context.sp;
  }

  static get spCached(): SPFI | undefined {
    return SPContext.context.spCached;
  }

  static get spPessimistic(): SPFI | undefined {
    return SPContext.context.spPessimistic;
  }

  static get logger(): Logger {
    return SPContext.context.logger;
  }

  static get http(): HttpClient {
    return SPContext.context.http;
  }

  static get performance(): PerformanceTracker {
    return SPContext.context.performance;
  }

  static get spfxContext(): SPFxContextInput {
    return SPContext.context.context;
  }

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
  // UTILITY METHODS
  // ========================================

  static isReady(): boolean {
    try {
      return SPContext.contextModule?.Context?.isReady() ?? false;
    } catch {
      return false;
    }
  }

  static reset(): void {
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
  } {
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
    };
  }
}
