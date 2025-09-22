/**
 * src/context/core/context-manager.ts
 * Simplified, modular context manager
 */

import { LogLevel } from '@pnp/logging';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import { CacheModule } from '../modules/cache';
import { SimpleHttpClient } from '../modules/http';
import { SimpleLogger } from '../modules/logger';
import { SimplePerformanceTracker } from '../modules/performance';
import type {
  ContextConfig,
  ContextModule,
  EnvironmentName,
  SPFxContext,
  SPFxContextInput,
} from '../types';
import { EnvironmentDetector } from '../utils/environment';

/**
 * Main context manager - simplified and focused
 */
export class ContextManager {
  private static instance: ContextManager | null = null;
  private context: SPFxContext | null = null;
  private modules: Map<string, ContextModule> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Initialize context with minimal configuration
   */
  static async initialize(
    spfxContext: SPFxContextInput,
    config: ContextConfig = {}
  ): Promise<SPFxContext> {
    const manager = ContextManager.getInstance();

    if (manager.isInitialized) {
      return manager.context!;
    }

    return manager.doInitialize(spfxContext, config);
  }

  static current(): SPFxContext {
    const manager = ContextManager.getInstance();
    if (!manager.context) {
      throw new Error('Context not initialized. Call ContextManager.initialize() first.');
    }
    return manager.context;
  }

  static isReady(): boolean {
    return ContextManager.getInstance().isInitialized;
  }

  static reset(): void {
    const manager = ContextManager.getInstance();
    manager.cleanup();
    manager.context = null;
    manager.isInitialized = false;
  }

  private async doInitialize(
    spfxContext: SPFxContextInput,
    config: ContextConfig
  ): Promise<SPFxContext> {
    try {
      // Environment detection
      const environment = EnvironmentDetector.detect(spfxContext.pageContext);
      const correlationId = this.generateCorrelationId();

      // Create core logger
      const logger = new SimpleLogger({
        level: config.logging?.level ?? this.getDefaultLogLevel(environment),
        componentName: config.componentName ?? 'SPFxApp',
        environment,
        correlationId,
        enableConsole: config.logging?.enableConsole ?? true,
      });

      // Create HTTP client
      const http = new SimpleHttpClient(spfxContext, {
        logger,
        timeout: config.http?.timeout ?? 30000,
        retries: config.http?.retries ?? 2,
        enableAuth: config.http?.enableAuth ?? true,
      });

      // Create performance tracker
      const performance = new SimplePerformanceTracker({
        enabled: config.logging?.enablePerformance ?? true,
        logger,
      });

      // Create base SP instance
      const sp = spfi().using(SPFx(spfxContext));

      // Optional cached SP instance
      let spCached: SPFI | undefined;
      let spPessimistic: SPFI | undefined;

      if (config.cache?.strategy && config.cache.strategy !== 'none') {
        const cacheModule = new CacheModule();
        await cacheModule.initialize(spfxContext, config);
        this.modules.set('cache', cacheModule);

        const cacheBehavior = cacheModule.createBehavior(config.cache.strategy, config.cache.ttl);

        if (cacheBehavior) {
          if (config.cache.strategy === 'pessimistic') {
            spPessimistic = sp.using(cacheBehavior);
          } else {
            spCached = sp.using(cacheBehavior);
          }
        }
      }

      // Build simplified context
      this.context = {
        // Core SPFx objects
        context: spfxContext,
        pageContext: spfxContext.pageContext,

        // Core properties
        siteUrl: spfxContext.pageContext.site.absoluteUrl,
        webUrl: spfxContext.pageContext.web.absoluteUrl,
        currentUser: {
          loginName: spfxContext.pageContext.user.loginName,
          displayName: spfxContext.pageContext.user.displayName,
          email: spfxContext.pageContext.user.email,
        },
        environment,
        correlationId,

        // Core utilities
        sp,
        logger,
        http,
        performance,

        // Optional features
        ...(spCached && { spCached }),
        ...(spPessimistic && { spPessimistic }),
      };

      this.isInitialized = true;

      // Log initialization
      logger.success('Context initialized', {
        component: config.componentName,
        environment,
        correlationId,
        modules: Array.from(this.modules.keys()),
      });

      return this.context;
    } catch (error) {
      console.error('Failed to initialize SPFx context:', error);
      throw error;
    }
  }

  /**
   * Add optional modules
   */
  async addModule(module: ContextModule, config?: any): Promise<void> {
    if (!this.context) {
      throw new Error('Context must be initialized before adding modules');
    }

    try {
      const result = await module.initialize(
        this.context as any, // Safe cast since we control the interface
        config || {}
      );

      this.modules.set(module.name, module);

      // Extend context with module result if it's an object
      if (result && typeof result === 'object') {
        Object.assign(this.context, { [module.name]: result });
      }

      this.context.logger.info(`Module '${module.name}' loaded`);
    } catch (error) {
      this.context.logger.error(`Failed to load module '${module.name}'`, error);
      throw error;
    }
  }

  private cleanup(): void {
    Array.from(this.modules.values()).forEach(module => {
      try {
        module.cleanup?.();
      } catch (error) {
        console.warn(`Error cleaning up module ${module.name}:`, error);
      }
    });
    this.modules.clear();
  }

  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `spfx-${timestamp}-${random}`;
  }

  private getDefaultLogLevel(environment: EnvironmentName): LogLevel {
    switch (environment) {
      case 'dev':
        return LogLevel.Verbose;
      case 'uat':
        return LogLevel.Info;
      case 'prod':
      default:
        return LogLevel.Warning;
    }
  }
}

/**
 * Simplified public API
 */
export const Context = {
  initialize: ContextManager.initialize,
  current: ContextManager.current,
  isReady: ContextManager.isReady,
  reset: ContextManager.reset,

  // Module management
  addModule: (module: ContextModule, config?: any) =>
    ContextManager.getInstance().addModule(module, config),
};

// Convenience exports
export const getCurrentContext = (): SPFxContext => Context.current();
export const getSp = (): SPFI => Context.current().sp;
export const getLogger = () => Context.current().logger;
export const getHttp = () => Context.current().http;
export const getSpfxContext = () => Context.current().context;
export const getPageContext = () => Context.current().pageContext;
