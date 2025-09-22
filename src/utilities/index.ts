// ========================================
// Utilities - Main Index
// src/utilities/index.ts
// ========================================

import {
  Context,
  getCurrentContext,
  getHttp,
  getLogger,
  getPageContext,
  getSp,
  getSpfxContext,
  QuickStart,
} from './context';

// ========================================
// CONTEXT EXPORTS - SPFx Context Utility
// ========================================

// Core context exports for tree-shaking
export {
  Context,
  getCurrentContext,
  getHttp,
  getLogger,
  getPageContext,
  getSp,
  getSpfxContext
} from './context/core/context-manager';

export { QuickStart } from './context/quick-start';

// SPContext - Clean API for library usage
export {
  getSPContextSetupInstructions, SPContext, validateSPContextSetup
} from './context/sp-context';

// Clean short imports (new approach)
export const context = () => getCurrentContext();
export const sp = () => getSp();
export const logger = () => getLogger();
export const http = () => getHttp();
export const spfxContext = () => getSpfxContext();
export const pageContext = () => getPageContext();

// Context modules for advanced users
export { CacheModule, MemoryCacheProvider } from './context/modules/cache';
export { SimpleHttpClient } from './context/modules/http';
export { LinksModule } from './context/modules/links';
export { SimpleLogger } from './context/modules/logger';
export { SimplePerformanceTracker } from './context/modules/performance';

// Context types
export type {
  BuildMode,
  CacheStrategy,
  ContextConfig,
  HttpClient as ContextHttpClient,
  Logger as ContextLogger,
  ContextModule,
  PerformanceTracker as ContextPerformanceTracker,
  EnvironmentName,
  FlowCallOptions,
  FunctionCallOptions,
  HttpResponse,
  LinkBuilder,
  PerformanceMetric,
  RequestOptions,
  SPFxContext,
  SPFxContextInput
} from './context/types';

// Environment utilities (only export what exists)
export { EnvironmentDetector } from './context/utils/environment';

// Context version
export { VERSION as CONTEXT_VERSION } from './context';

// ========================================
// EXISTING UTILITIES
// ========================================

// Batch Builder exports
export {
  addOperationToBatch, BatchBuilder, executeBatch, ListOperationBuilder, splitIntoBatches
} from './batchBuilder';

// Permission Helper exports
export { BatchPermissionChecker, PermissionError, PermissionHelper } from './permissionHelper';

// List Item Helper exports
export {
  createSPExtractor,
  createSPUpdater,
  detectFieldType,
  extractField,
  extractFields,
  migrateFields,
  quickUpdate,
  quickValidateUpdate,
  transformItem,
  validateRequiredFields
} from './listItemHelper';

// String utilities
export { applyStringExtensions, StringUtils, type StringExtensionMethod } from './stringUtils';

// Date utilities
export { applyDateExtensions, DateUtils, type DateExtensionMethod } from './dateUtils';

// ========================================
// GROUPED EXPORTS - For organized imports
// ========================================

// Context utilities grouped
export * as ContextUtils from './context';

// Existing utility groups
export * as BatchUtils from './batchBuilder';
export * as DateExtensionUtils from './dateUtils';
export * as ListItemUtils from './listItemHelper';
export * as PermissionUtils from './permissionHelper';
export * as StringExtensionUtils from './stringUtils';

// ========================================
// CONTEXT QUICK ACCESS - For convenience
// ========================================

// Context quick start helpers
export const ContextQuickStart = {
  basic: (context: any, name: string) => QuickStart.basic(context, name),
  development: (context: any, name: string) => QuickStart.development(context, name),
  production: (context: any, name: string) => QuickStart.production(context, name),
  withLinks: (context: any, name: string, config?: any) =>
    QuickStart.withLinks(context, name, config),
} as const;

// Context convenience functions
export const ContextHelpers = {
  getCurrentContext: () => getCurrentContext(),
  getSp: () => getSp(),
  getLogger: () => getLogger(),
  getHttp: () => getHttp(),
  getSpfxContext: () => getSpfxContext(),
  getPageContext: () => getPageContext(),
  isReady: () => Context.isReady(),
  reset: () => Context.reset(),
} as const;
