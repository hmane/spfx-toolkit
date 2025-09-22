// ========================================
// SPFx Toolkit - Main Entry Point
// ========================================

import {
  Card,
  ConflictDetector,
  ErrorBoundary,
  GroupViewer,
  ManageAccessComponent,
  ManageAccessPanel,
  SafeCard,
  useCardController,
  useConflictDetection,
  useErrorHandler,
  WorkflowStepper,
} from './components';
import { useLocalStorage, useViewport } from './hooks';
import {
  BatchBuilder,
  DateUtils,
  PermissionHelper,
  StringUtils,
  Context,
  QuickStart,
  getCurrentContext,
  getSp,
  getLogger,
  getHttp,
  CacheModule,
  LinksModule,
} from './utilities';

// Version information
export const TOOLKIT_VERSION = '0.0.1-alpha.0';

// ========================================
// CORE EXPORTS - Most commonly used
// ========================================

// Essential components (likely to be imported together)
export { Card, SafeCard, useCardController } from './components/Card';
export { ConflictDetector, useConflictDetection } from './components/ConflictDetector';
export { ErrorBoundary, useErrorHandler, withErrorBoundary } from './components/ErrorBoundary';
export { WorkflowStepper } from './components/WorkflowStepper';
export { GroupViewer } from './components/GroupViewer';
export { ManageAccessComponent, ManageAccessPanel } from './components/ManageAccess';

// Core hooks
export { useLocalStorage, useViewport } from './hooks';

// Essential utilities
export { BatchBuilder, PermissionHelper } from './utilities';

// String and Date utilities
export { StringUtils, applyStringExtensions } from './utilities/stringUtils';
export { DateUtils, applyDateExtensions } from './utilities/dateUtils';

// ========================================
// CONTEXT UTILITIES - SPFx Context Management
// ========================================

// Core context exports
export {
  Context,
  QuickStart,
  getCurrentContext,
  getSp,
  getLogger,
  getHttp,
  getSpfxContext,
  getPageContext,
} from './utilities';

// Context modules for advanced usage
export {
  LinksModule,
  CacheModule,
  MemoryCacheProvider,
  SimpleLogger,
  SimpleHttpClient,
  SimplePerformanceTracker,
} from './utilities';

// Context convenience helpers
export { ContextQuickStart, ContextHelpers } from './utilities';

// Context types
export type {
  SPFxContext,
  ContextConfig,
  ContextLogger,
  ContextHttpClient,
  ContextPerformanceTracker,
  LinkBuilder,
  ContextModule,
  CacheStrategy,
  EnvironmentName,
  BuildMode,
  SPFxContextInput,
  RequestOptions,
  FunctionCallOptions,
  FlowCallOptions,
  HttpResponse as ContextHttpResponse,
  PerformanceMetric,
} from './utilities';

// ========================================
// COMPONENT EXPORTS - Import individually for tree-shaking
// ========================================

// Card components
export {
  Accordion,
  ActionButtons,
  BadgeHeader,
  CardLoading,
  Content,
  Footer,
  Header,
  IconHeader,
  MaximizedView,
  SimpleHeader,
  SpinnerLoading,
  SubtitleHeader,
} from './components/Card';

// Conflict detection components
export {
  ConflictDetectionProvider,
  ConflictNotificationBar,
  ConflictResolutionDialog,
  useConflictContext,
} from './components/ConflictDetector';

// Workflow components
export { ContentArea, StepItem } from './components/WorkflowStepper';

// ========================================
// HOOK EXPORTS - Individual for tree-shaking
// ========================================

// Storage and UI hooks
export { useIsTouchDevice, useMediaQuery } from './hooks/useViewport';

// Card-specific hooks
export { useCardState, useMaximize, usePersistence } from './components/Card';

// Conflict detection hooks
export { useConflictMonitor, usePreSaveConflictCheck } from './components/ConflictDetector';

// ========================================
// UTILITY EXPORTS - Import on-demand
// ========================================

// Batch operations
export {
  addOperationToBatch,
  executeBatch,
  ListOperationBuilder,
  splitIntoBatches,
} from './utilities/batchBuilder';

// Permission utilities
export { BatchPermissionChecker, PermissionError } from './utilities/permissionHelper';

// List item helpers (enhanced exports)
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
  validateRequiredFields,
} from './utilities/listItemHelper';

// Context environment utilities
export { EnvironmentDetector } from './utilities';

// ========================================
// TYPE EXPORTS - Individual for better tree-shaking
// ========================================

// Component types
export type {
  CardAction,
  CardProps,
  CardState,
  ConflictDetectionOptions,
  ConflictInfo,
  ContentProps,
  HeaderProps,
  StepData,
  StepStatus,
  WorkflowStepperProps,
} from './components';

// GroupViewer Types
export type { IGroupViewerProps, IGroupMember, IGroupInfo } from './components/GroupViewer';

// ManageAccess Types
export type {
  IManageAccessComponentProps,
  IManageAccessComponentState,
  IPermissionPrincipal,
  IActivityFeedItem,
  IPermissionLevelOption,
  ISPRoleAssignment,
  ISPMember,
  ISPRoleDefinition,
} from './components/ManageAccess';

// Error Boundary Types
export type {
  IErrorBoundaryProps,
  IErrorBoundaryState,
  IErrorDetails,
  IErrorFallbackProps,
  IErrorInfo,
  IUserFriendlyMessages,
} from './components/ErrorBoundary';

// Hook types
export type {
  BreakpointKey,
  Breakpoints,
  UseLocalStorageOptions,
  UseLocalStorageReturn,
  ViewportInfo,
} from './hooks';

// Utility types
export type { StringExtensionMethod } from './utilities/stringUtils';
export type { DateExtensionMethod } from './utilities/dateUtils';

// ONLY export types from typeUtilities to avoid duplicates
export type {
  BatchError as ToolkitBatchError,
  BatchExecutionResult as ToolkitBatchExecutionResult,
  BatchOperation as ToolkitBatchOperation,
  BatchResult as ToolkitBatchResult,
  ItemPermissions as ToolkitItemPermissions,
  OperationResult as ToolkitOperationResult,
  PermissionResult as ToolkitPermissionResult,
  Principal as ToolkitPrincipal,
  SharePointImage as ToolkitSharePointImage,
  SharePointLookup as ToolkitSharePointLookup,
  SharePointPermissionLevel as ToolkitSharePointPermissionLevel,
  SharePointTaxonomy as ToolkitSharePointTaxonomy,
  UserPermissions as ToolkitUserPermissions,
} from './types';

// ========================================
// GROUPED EXPORTS - For convenience
// ========================================

// All components in organized groups
export * as CardComponents from './components/Card';
export * as ConflictComponents from './components/ConflictDetector';
export * as ErrorBoundaryComponents from './components/ErrorBoundary';
export * from './components/spForm';
export * as WorkflowComponents from './components/WorkflowStepper';

// Permission and SharePoint integration components
export * as GroupViewerComponents from './components/GroupViewer';
export * as ManageAccessComponents from './components/ManageAccess';

// All hooks organized
export * as Hooks from './hooks';

// All utilities organized (including context)
export * as BatchUtils from './utilities/batchBuilder';
export * as ListItemUtils from './utilities/listItemHelper';
export * as PermissionUtils from './utilities/permissionHelper';
export * as StringExtensionUtils from './utilities/stringUtils';
export * as DateExtensionUtils from './utilities/dateUtils';
export * as ContextUtils from './utilities/context';

// ========================================
// ENHANCED TYPE EXPORTS - Namespaces only
// ========================================

// Namespace exports for organized imports
export type { BatchTypes, PermissionTypes, SharePointTypes } from './types';

// Type guards and utilities
export { TypeGuards } from './types';

// ========================================
// COMPONENT COLLECTIONS
// ========================================

// Permission management components
export const PermissionComponents = {
  GroupViewer,
  ManageAccessComponent,
  ManageAccessPanel,
} as const;

// SharePoint integration components
export const SharePointComponents = {
  GroupViewer,
  ManageAccessComponent,
  ManageAccessPanel,
} as const;

// Display components
export const DisplayComponents = {
  Card,
  SafeCard,
  GroupViewer,
} as const;

// Management components
export const ManagementComponents = {
  ManageAccessComponent,
  ManageAccessPanel,
  ConflictDetector,
  WorkflowStepper,
} as const;

// Context components
export const ContextComponents = {
  Context,
  QuickStart,
  LinksModule,
  CacheModule,
} as const;

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

export const ToolkitUtils = {
  /**
   * Generate unique IDs for components
   */
  generateId: (prefix = 'spfx'): string => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}`;
  },

  /**
   * Check SharePoint context availability
   */
  isSharePointContext: (): boolean => {
    return typeof window !== 'undefined' && !!(window as any)._spPageContextInfo;
  },

  /**
   * Check if context is initialized
   */
  isContextReady: (): boolean => {
    try {
      return Context.isReady();
    } catch {
      return false;
    }
  },

  /**
   * Get toolkit version info
   */
  getVersionInfo: () => ({
    version: TOOLKIT_VERSION,
    buildDate: new Date().toISOString(),
    dependencies: {
      react: '^17.0.1',
      pnpsp: '^3.20.1',
      devextreme: '^22.2.3',
      zustand: '^4.3.9',
      fluentui: '^8.106.4',
    },
    components: [
      'Card',
      'ConflictDetector',
      'WorkflowStepper',
      'GroupViewer',
      'ManageAccessComponent',
      'ErrorBoundary',
      'spForm Components',
    ],
    utilities: [
      'BatchBuilder',
      'PermissionHelper',
      'ListItemHelper',
      'StringUtils',
      'DateUtils',
      'Context (SPFx Context Management)',
      'QuickStart (Context Quick Setup)',
    ],
    hooks: [
      'useLocalStorage',
      'useViewport',
      'useCardController',
      'useToast',
      'useProgressToast',
      'useBatchToast',
      'useUndoToast',
      'useFormToast',
      'useErrorHandler',
    ],
    extensions: [
      'String Extensions (replaceAll, getFileName, etc.)',
      'Date Extensions (format, addDays, addBusinessDays, isToday)',
    ],
    contextFeatures: [
      'Multiple Cache Strategies (memory, storage, pessimistic)',
      'Azure AD Authentication',
      'Performance Tracking',
      'Environment Detection',
      'Structured Logging',
      'Link Building',
      'Module System',
    ],
  }),

  /**
   * Initialize context with basic setup
   */
  initializeContext: async (spfxContext: any, componentName: string) => {
    try {
      return await QuickStart.basic(spfxContext, componentName);
    } catch (error) {
      console.error('Failed to initialize context:', error);
      throw error;
    }
  },

  /**
   * Initialize all extensions at once
   */
  initializeExtensions: (): void => {
    try {
      const { applyStringExtensions } = require('./utilities/stringUtils');
      const { applyDateExtensions } = require('./utilities/dateUtils');

      applyStringExtensions();
      applyDateExtensions();

      console.log('SPFx Toolkit extensions initialized');
    } catch (error) {
      console.warn('Failed to initialize some extensions:', error);
    }
  },

  /**
   * Initialize everything (context + extensions)
   */
  initializeAll: async (spfxContext: any, componentName: string, contextConfig?: any) => {
    try {
      // Initialize extensions first
      ToolkitUtils.initializeExtensions();

      // Initialize context
      const context = contextConfig
        ? await Context.initialize(spfxContext, contextConfig)
        : await QuickStart.basic(spfxContext, componentName);

      console.log('SPFx Toolkit fully initialized');
      return context;
    } catch (error) {
      console.error('Failed to initialize toolkit:', error);
      throw error;
    }
  },

  /**
   * Get component category
   */
  getComponentCategory: (componentName: string): string => {
    if (['GroupViewer', 'ManageAccessComponent', 'ManageAccessPanel'].includes(componentName)) {
      return 'Permission Management';
    }
    if (['Card', 'SafeCard'].includes(componentName)) {
      return 'Display';
    }
    if (['ConflictDetector', 'WorkflowStepper'].includes(componentName)) {
      return 'Workflow';
    }
    if (['ErrorBoundary'].includes(componentName)) {
      return 'Error Handling';
    }
    if (['Context', 'QuickStart'].includes(componentName)) {
      return 'Context Management';
    }
    return 'General';
  },
} as const;

// ========================================
// LEGACY SUPPORT - Backward compatibility
// ========================================

// Bulk exports for existing codebases (discouraged for new code)
/** @deprecated Use individual imports for better tree-shaking */
export * from './components';
/** @deprecated Use individual imports for better tree-shaking */
export * from './hooks';
/** @deprecated Use individual imports for better tree-shaking */
export * from './utilities';

// ========================================
// DEFAULT EXPORT - Enhanced essential toolkit
// ========================================

const SpfxToolkit = {
  // Essential components
  Card: Card,
  ConflictDetector: ConflictDetector,
  WorkflowStepper: WorkflowStepper,
  ErrorBoundary: ErrorBoundary,
  GroupViewer: GroupViewer,
  ManageAccessComponent: ManageAccessComponent,

  // Essential hooks
  useCardController: useCardController,
  useLocalStorage: useLocalStorage,
  useViewport: useViewport,
  useConflictDetection: useConflictDetection,
  useErrorHandler: useErrorHandler,

  // Essential utilities
  BatchBuilder: BatchBuilder,
  PermissionHelper: PermissionHelper,
  StringUtils: StringUtils,
  DateUtils: DateUtils,

  // Context utilities
  Context: Context,
  QuickStart: QuickStart,
  getCurrentContext: getCurrentContext,
  getSp: getSp,
  getLogger: getLogger,
  getHttp: getHttp,

  // Component collections
  PermissionComponents,
  SharePointComponents,
  DisplayComponents,
  ManagementComponents,
  ContextComponents,

  // Toolkit info
  version: TOOLKIT_VERSION,
  utils: ToolkitUtils,
};

export default SpfxToolkit;
