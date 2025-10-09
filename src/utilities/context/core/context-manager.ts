/**
 * Fixed context-manager.ts with essential properties and correct PeoplePicker context
 */

import { LogLevel } from '@pnp/logging';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import type { PageContext } from '@microsoft/sp-page-context';
import { SPHttpClient } from '@microsoft/sp-http';
import type { IPeoplePickerContext } from '@pnp/spfx-controls-react/lib/PeoplePicker';
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
import '@pnp/sp/profiles';
import { IPrincipal } from '../../../types';

/**
 * Focused context manager with essential SharePoint properties
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
   * Initialize context with focused configuration
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

  // FIX: Add the missing getCurrentContext method
  static getCurrentContext(): SPFxContext {
    return ContextManager.current();
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

      // Initialize cached instances (always available, fallback to base sp)
      let spCached: SPFI = sp;
      let spPessimistic: SPFI = sp;

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

      // Create PeoplePicker context with only required properties
      const peoplepickerContext = this.createPeoplePickerContext(spfxContext);

      // Build focused context with essential properties only
      this.context = {
        // Core SPFx objects
        context: spfxContext,
        pageContext: spfxContext.pageContext,

        // Essential SharePoint URL properties (web-only)
        webAbsoluteUrl: spfxContext.pageContext.web.absoluteUrl,
        webServerRelativeUrl: spfxContext.pageContext.web.serverRelativeUrl,

        // Web metadata
        webTitle: this.getWebTitle(spfxContext.pageContext),
        webId: spfxContext.pageContext.web.id?.toString(),

        // List context (if available)
        listId: spfxContext.pageContext.list?.id?.toString(),
        listTitle: spfxContext.pageContext.list?.title,
        listServerRelativeUrl: spfxContext.pageContext.list?.serverRelativeUrl,

        // Culture and locale information
        currentUICultureName: spfxContext.pageContext.cultureInfo.currentUICultureName,
        currentCultureName: spfxContext.pageContext.cultureInfo.currentCultureName,
        isRightToLeft: spfxContext.pageContext.cultureInfo.isRightToLeft,

        // Simple user information (authenticated org users)
        currentUser: await this.fetchUserProfile(sp, spfxContext.pageContext),

        // Application information
        applicationName: this.getApplicationName(spfxContext),
        tenantUrl: this.getTenantUrl(spfxContext.pageContext.web.absoluteUrl),

        // Environment and runtime information
        environment,
        correlationId,
        isTeamsContext: this.isTeamsContext(spfxContext),

        // Core utilities
        sp,
        spCached,
        spPessimistic,
        logger,
        http,
        performance,

        // PeoplePicker context (simplified to 3 required properties only)
        peoplepickerContext,

        // Optional features can be added here
      };

      this.isInitialized = true;

      // Log initialization with focused information
      logger.success('SPContext initialized', {
        component: config.componentName,
        environment,
        correlationId,
        webAbsoluteUrl: this.context.webAbsoluteUrl,
        webTitle: this.context.webTitle,
        isTeamsContext: this.context.isTeamsContext,
        modules: Array.from(this.modules.keys()),
      });

      return this.context;
    } catch (error) {
      console.error('Failed to initialize SPFx context:', error);
      throw error;
    }
  }

  /**
   * Create PeoplePicker context using IPeoplePickerContext from PnP
   * Based on: https://pnp.github.io/sp-dev-fx-controls-react/controls/PeoplePicker/
   */
  private createPeoplePickerContext(spfxContext: SPFxContextInput): IPeoplePickerContext {
    const { MSGraphClientFactory } = require('@microsoft/sp-http');

    return {
      // absoluteUrl - Required
      absoluteUrl: spfxContext.pageContext.web.absoluteUrl,

      // msGraphClientFactory - Required for Graph API calls
      msGraphClientFactory: spfxContext.serviceScope.consume(MSGraphClientFactory.serviceKey),

      // spHttpClient - Required for SharePoint REST API calls
      spHttpClient: spfxContext.spHttpClient as SPHttpClient,
    } as IPeoplePickerContext;
  }

  /**
   * Add optional modules
   */
  async addModule(module: ContextModule, config?: any): Promise<void> {
    if (!this.context) {
      throw new Error('Context must be initialized before adding modules');
    }

    try {
      const startTime = performance.now();
      const result = await module.initialize(this.context as any, config || {});

      this.modules.set(module.name, module);

      // Extend context with module result if it's an object
      if (result && typeof result === 'object') {
        Object.assign(this.context, { [module.name]: result });
      }

      const duration = Math.round(performance.now() - startTime);
      this.context.logger.success(`Module '${module.name}' loaded`, { duration });
    } catch (error) {
      this.context.logger.error(`Failed to load module '${module.name}'`, error);
      throw error;
    }
  }

  // Utility methods
  private getApplicationName(context: SPFxContextInput): string {
    try {
      return (
        (context as any).manifest?.alias ||
        (context as any).manifest?.componentType ||
        (context as any).manifest?.id ||
        'SPFxApp'
      );
    } catch {
      return 'SPFxApp';
    }
  }

  private getTenantUrl(webUrl: string): string {
    try {
      const url = new URL(webUrl);
      const hostname = url.hostname;

      // Extract tenant from SharePoint Online URL
      if (hostname.includes('.sharepoint.com')) {
        const parts = hostname.split('.');
        return `https://${parts[0]}.sharepoint.com`;
      }

      // Fallback to base URL
      return `${url.protocol}//${url.hostname}`;
    } catch {
      return webUrl;
    }
  }

  private isTeamsContext(context: SPFxContextInput): boolean {
    try {
      return (
        !!(context as any).sdks?.microsoftTeams ||
        !!(context as any).microsoftTeams ||
        window.location.ancestorOrigins?.[0]?.includes('teams.microsoft.com')
      );
    } catch {
      return false;
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

  private getWebTitle(pageContext: PageContext): string {
    try {
      // Try different possible properties for web title
      return (
        (pageContext.web as any).title ||
        (pageContext.web as any).displayName ||
        pageContext.web.serverRelativeUrl.split('/').pop() ||
        'Web'
      );
    } catch {
      return 'Web';
    }
  }

  private async fetchUserProfile(sp: SPFI, pageContext: PageContext): Promise<IPrincipal> {
    const basicUser = pageContext.user;

    try {
      // Fetch current user details from SharePoint
      const currentUser = await sp.web.currentUser.select(
        'Id',
        'Title',
        'Email',
        'LoginName',
        'UserPrincipalName'
      )();

      // Try to fetch user profile properties for additional info
      let department: string | undefined;
      let jobTitle: string | undefined;
      let sip: string | undefined;
      let picture: string | undefined;

      try {
        const userProfile = await sp.profiles.myProperties.select(
          'AccountName',
          'UserProfileProperties'
        )();

        // Extract properties from user profile
        const properties = userProfile.UserProfileProperties || [];
        department = this.findProfileProperty(properties, 'Department');
        jobTitle =
          this.findProfileProperty(properties, 'Title') ||
          this.findProfileProperty(properties, 'JobTitle');
        sip =
          this.findProfileProperty(properties, 'SIP') ||
          this.findProfileProperty(properties, 'WorkPhone');

        // Get user photo URL
        try {
          picture = await sp.profiles.getUserProfilePropertyFor(
            currentUser.LoginName,
            'PictureURL'
          );
        } catch {
          // Photo might not be available
        }
      } catch (profileError) {
        // User profile service might not be available or accessible
        console.warn('Could not fetch user profile properties:', profileError);
      }

      return {
        id: currentUser.Id?.toString() || basicUser.loginName || '',
        email: currentUser.Email || basicUser.email,
        title: currentUser.Title || basicUser.displayName,
        value: currentUser.LoginName || basicUser.loginName,
        loginName: currentUser.LoginName || basicUser.loginName,
        department,
        jobTitle,
        sip,
        picture,
      };
    } catch (error) {
      // Fallback to basic user info if API calls fail
      console.warn('Could not fetch complete user profile, using basic info:', error);

      return {
        id: basicUser.loginName || '',
        email: basicUser.email,
        title: basicUser.displayName,
        value: basicUser.loginName,
        loginName: basicUser.loginName,
        // Additional properties will be undefined
      };
    }
  }

  private findProfileProperty(properties: any[], key: string): string | undefined {
    const prop = properties.find((p: any) => p.Key?.toLowerCase() === key.toLowerCase());
    return prop?.Value || undefined;
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
 * Enhanced public API
 */
export const Context = {
  initialize: ContextManager.initialize,
  current: ContextManager.current,
  getCurrentContext: ContextManager.getCurrentContext, // FIX: Add missing method
  isReady: ContextManager.isReady,
  reset: ContextManager.reset,

  // Module management
  addModule: (module: ContextModule, config?: any) =>
    ContextManager.getInstance().addModule(module, config),
};
