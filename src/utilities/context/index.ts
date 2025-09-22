/**
 * src/utilities/context/index.ts
 * Context utility main exports - clean version
 */

// ========================================
// CORE CONTEXT EXPORTS (only what exists)
// ========================================

// Main context API - only export if these exist in your context-manager.ts
export {
  Context,
  getCurrentContext,
  getHttp,
  getLogger,
  getPageContext,
  getSp,
  getSpfxContext
} from './core/context-manager';

// Quick start helpers - only if this file exists
export { QuickStart } from './quick-start';

// ========================================
// LIBRARY CONTEXT - Import from separate file
// ========================================

export { getSPContextSetupInstructions, SPContext, validateSPContextSetup } from './sp-context';

// ========================================
// MODULES - Uncomment only what you actually have
// ========================================

// Check your modules folder and uncomment only existing files:
export { CacheModule } from './modules/cache';
export { SimpleHttpClient } from './modules/http';
export { LinksModule } from './modules/links';
export { SimpleLogger } from './modules/logger';
export { SimplePerformanceTracker } from './modules/performance';

// ========================================
// UTILITIES - Uncomment only what exists
// ========================================

// Check your utils folder:
// export { EnvironmentDetector } from './utils/environment';

// ========================================
// TYPES - Only export what exists in your types/index.ts
// ========================================

export type {
  BuildMode,
  CacheStrategy,
  ContextConfig,
  EnvironmentName,
  HttpClient,
  Logger,
  PerformanceTracker,
  SPFxContext,
  SPFxContextInput
} from './types';

// ========================================
// VERSION
// ========================================

export const VERSION = '3.0.0';

// ========================================
// DEFAULT EXPORT - Use LibraryContext for library distribution
// ========================================

export { SPContext as default } from './sp-context';
