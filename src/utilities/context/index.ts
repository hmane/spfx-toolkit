/**
 * src/utilities/context/index.ts
 * Context utility main exports - updated for web-focused SPContext
 */

// ========================================
// CORE CONTEXT EXPORTS
// ========================================

// Main context API
export {
  Context,
  getCurrentContext,
  getHttp,
  getLogger,
  getPageContext,
  getSp,
  getSpfxContext,
  getCurrentUser,
  getWebAbsoluteUrl,
} from './core/context-manager';

// Quick start helpers
export { QuickStart } from './quick-start';

// ========================================
// LIBRARY CONTEXT - Main SPContext API
// ========================================

export { SPContext } from './sp-context';

// ========================================
// MODULES
// ========================================

export { CacheModule } from './modules/cache';
export { SimpleHttpClient } from './modules/http';
export { LinksModule } from './modules/links';
export { SimpleLogger } from './modules/logger';
export { SimplePerformanceTracker } from './modules/performance';

// ========================================
// UTILITIES
// ========================================

export { EnvironmentDetector } from './utils/environment';

// ========================================
// TYPES - Updated for web-focused context
// ========================================

export type {
  BuildMode,
  CacheStrategy,
  ContextConfig,
  ContextError,
  ContextHealthCheck,
  ContextIssue,
  ContextModule,
  EnvironmentName,
  HttpClient,
  HttpResponse,
  Logger,
  LogEntry,
  PerformanceTracker,
  PerformanceMetric,
  RequestOptions,
  FunctionCallOptions,
  FlowCallOptions,
  SPFxContext,
  SPFxContextInput,
  LinkBuilder,
  CacheProvider,
  AuthProvider,
} from './types';

// ========================================
// VERSION
// ========================================

export const VERSION = '3.1.0'; // Bumped for web-focused updates

// ========================================
// DEFAULT EXPORT - Use SPContext for library distribution
// ========================================

export { SPContext as default } from './sp-context';
