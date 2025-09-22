/**
 * src/utilities/context/sp-context.ts
 * SPContext - Clean API for SharePoint context management
 */

import type { SPFxContextInput, ContextConfig } from './types';

/**
 * SPContext - SharePoint-focused context wrapper for NPM library distribution
 */
export class SPContext {
  private static contextModule: any = null;

  /**
   * Initialize the context with lazy loading
   */
  static async initialize(spfxContext: SPFxContextInput, config: ContextConfig = {}): Promise<any> {
    if (!SPContext.contextModule) {
      SPContext.contextModule = await import('./core/context-manager');
    }

    return SPContext.contextModule.Context.initialize(spfxContext, config);
  }

  /**
   * Basic setup - good for most scenarios
   */
  static async basic(spfxContext: SPFxContextInput, componentName: string): Promise<any> {
    return SPContext.initialize(spfxContext, {
      componentName,
      logging: {
        level: 1, // Info
        enableConsole: true,
        enablePerformance: false
      },
      cache: {
        strategy: 'memory',
        ttl: 300000 // 5 minutes
      },
      http: {
        timeout: 30000,
        retries: 2,
        enableAuth: true
      }
    });
  }

  /**
   * Production setup - optimized for performance and minimal logging
   */
  static async production(spfxContext: SPFxContextInput, componentName: string): Promise<any> {
    return SPContext.initialize(spfxContext, {
      componentName,
      logging: {
        level: 2, // Warning
        enableConsole: false,
        enablePerformance: true
      },
      cache: {
        strategy: 'storage',
        ttl: 600000 // 10 minutes
      },
      http: {
        timeout: 20000,
        retries: 3,
        enableAuth: true
      }
    });
  }

  /**
   * Development setup - verbose logging, no caching
   */
  static async development(spfxContext: SPFxContextInput, componentName: string): Promise<any> {
    return SPContext.initialize(spfxContext, {
      componentName,
      logging: {
        level: 0, // Verbose
        enableConsole: true,
        enablePerformance: true
      },
      cache: {
        strategy: 'none'
      },
      http: {
        timeout: 60000,
        retries: 1,
        enableAuth: true
      }
    });
  }

  /**
   * Smart setup - detects environment automatically using existing EnvironmentDetector
   */
  static async smart(spfxContext: SPFxContextInput, componentName: string): Promise<any> {
    // Use your existing EnvironmentDetector
    const { EnvironmentDetector } = await import('./utils/environment');
    const environment = EnvironmentDetector.detect(spfxContext.pageContext);

    switch (environment) {
      case 'dev':
        return SPContext.development(spfxContext, componentName);
      case 'uat':
        return SPContext.initialize(spfxContext, {
          componentName,
          logging: { level: 1, enablePerformance: true },
          cache: { strategy: 'memory', ttl: 300000 }
        });
      case 'prod':
      default:
        return SPContext.production(spfxContext, componentName);
    }
  }

  /**
   * Teams-optimized setup
   */
  static async teams(spfxContext: SPFxContextInput, componentName: string): Promise<any> {
    return SPContext.initialize(spfxContext, {
      componentName,
      logging: {
        level: 1,
        enablePerformance: true
      },
      cache: {
        strategy: 'memory',
        ttl: 120000 // 2 minutes
      },
      http: {
        timeout: 20000,
        retries: 2,
        enableAuth: true
      }
    });
  }

  // ========================================
  // ACCESS METHODS - Clean, short names
  // ========================================

  /**
   * Get current context object
   */
  static get context(): any {
    if (!SPContext.contextModule) {
      throw new Error('SPContext not initialized. Call SPContext.initialize() first.');
    }
    return SPContext.contextModule.getCurrentContext();
  }

  /**
   * Get SharePoint PnP instance
   */
  static get sp(): any {
    return SPContext.context.sp;
  }

  /**
   * Get cached SharePoint PnP instance
   */
  static get spCached(): any {
    return SPContext.context.spCached;
  }

  /**
   * Get pessimistic cached SharePoint PnP instance
   */
  static get spPessimistic(): any {
    return SPContext.context.spPessimistic;
  }

  /**
   * Get logger instance
   */
  static get logger(): any {
    return SPContext.context.logger;
  }

  /**
   * Get HTTP client
   */
  static get http(): any {
    return SPContext.context.http;
  }

  /**
   * Get performance tracker
   */
  static get performance(): any {
    return SPContext.context.performance;
  }

  /**
   * Get raw SPFx context
   */
  static get spfxContext(): any {
    return SPContext.context.context;
  }

  /**
   * Get page context
   */
  static get pageContext(): any {
    return SPContext.context.pageContext;
  }

  /**
   * Get current user info
   */
  static get currentUser(): any {
    return SPContext.context.currentUser;
  }

  /**
   * Get environment info
   */
  static get environment(): string {
    return SPContext.context.environment;
  }

  /**
   * Get site URL
   */
  static get siteUrl(): string {
    return SPContext.context.siteUrl;
  }

  /**
   * Get web URL
   */
  static get webUrl(): string {
    return SPContext.context.webUrl;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Check if context is ready
   */
  static isReady(): boolean {
    try {
      return SPContext.contextModule?.Context?.isReady() ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Reset context
   */
  static reset(): void {
    if (SPContext.contextModule) {
      SPContext.contextModule.Context.reset();
    }
    SPContext.contextModule = null;
  }

  /**
   * Add a module to the context
   */
  static async addModule(module: any, config?: any): Promise<void> {
    if (!SPContext.contextModule) {
      throw new Error('SPContext not initialized. Call initialize() first.');
    }
    return SPContext.contextModule.Context.addModule(module, config);
  }
}

/**
 * Get setup instructions for consuming SPFx projects
 */
export function getSPContextSetupInstructions(): string {
  return `
SPContext Setup Instructions:

1. Install spfx-toolkit:
   npm install spfx-toolkit

2. Install PnP dependencies in your SPFx project:
   npm install @pnp/sp@3.20.1 @pnp/logging@3.20.1 @pnp/queryable@3.20.1

3. Create pnp-imports.ts in your SPFx project:

   // src/pnp-imports.ts
   import '@pnp/sp/webs';
   import '@pnp/sp/lists';
   import '@pnp/sp/items';
   import '@pnp/sp/files';
   import '@pnp/sp/folders';
   import '@pnp/sp/site-users';

4. Use in your WebPart:

   // Import PnP side effects first
   import './pnp-imports';
   import { SPContext } from 'spfx-toolkit';

   protected async onInit(): Promise<void> {
     await SPContext.smart(this.context, 'MyWebPart');
     return super.onInit();
   }

5. Access context utilities:

   const items = await SPContext.sp.web.lists.getByTitle('Tasks').items();
   SPContext.logger.info('Items loaded', { count: items.length });

Usage Examples:
---------------
// Smart initialization (auto-detects environment)
await SPContext.smart(this.context, 'MyWebPart');

// Manual environment setup
await SPContext.production(this.context, 'MyWebPart');
await SPContext.development(this.context, 'MyWebPart');

// Clean property access
const sp = SPContext.sp;
const logger = SPContext.logger;
const http = SPContext.http;
const user = SPContext.currentUser;
`;
}

/**
 * Validate SPFx environment setup
 */
export function validateSPContextSetup(): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  try {
    // Check SharePoint environment
    if (typeof window !== 'undefined') {
      if (!(window as any)._spPageContextInfo) {
        issues.push('Not running in SharePoint context');
      }
    } else {
      issues.push('Not running in browser environment');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  } catch (error) {
    issues.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      isValid: false,
      issues
    };
  }
}
