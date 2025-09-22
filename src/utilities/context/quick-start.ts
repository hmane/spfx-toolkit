/**
 * src/context/quick-start.ts
 * Simplified quick start configurations
 */

import { LogLevel } from '@pnp/logging';
import { Context } from './core/context-manager';
import { LinksModule } from './modules/links';
import type { ContextConfig, SPFxContextInput } from './types';

export class QuickStart {
  /**
   * Basic setup - minimal configuration
   */
  static async basic(context: SPFxContextInput, componentName: string) {
    return Context.initialize(context, {
      componentName,
      logging: {
        level: LogLevel.Info,
        enableConsole: true,
      },
    });
  }

  /**
   * Development setup - verbose logging, no caching
   */
  static async development(context: SPFxContextInput, componentName: string) {
    return Context.initialize(context, {
      componentName,
      logging: {
        level: LogLevel.Verbose,
        enableConsole: true,
        enablePerformance: true,
      },
      cache: {
        strategy: 'none',
      },
    });
  }

  /**
   * Production setup - minimal logging, with caching
   */
  static async production(context: SPFxContextInput, componentName: string) {
    return Context.initialize(context, {
      componentName,
      logging: {
        level: LogLevel.Warning,
        enableConsole: false,
        enablePerformance: false,
      },
      cache: {
        strategy: 'storage',
        ttl: 10 * 60 * 1000, // 10 minutes
      },
      http: {
        timeout: 20000,
        retries: 3,
      },
    });
  }

  /**
   * Full setup - includes optional modules
   */
  static async withLinks(context: SPFxContextInput, componentName: string, config?: ContextConfig) {
    const spfxContext = await Context.initialize(context, {
      componentName,
      ...config,
    });

    // Add links module
    await Context.addModule(new LinksModule());

    return spfxContext;
  }
}
