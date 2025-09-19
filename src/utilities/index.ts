// ========================================
// Utilities - Main Index
// src/utilities/index.ts
// ========================================

// Batch Builder exports
export {
  BatchBuilder,
  addOperationToBatch,
  executeBatch,
  ListOperationBuilder,
  splitIntoBatches,
} from './batchBuilder';

// Permission Helper exports
export { PermissionHelper, BatchPermissionChecker, PermissionError } from './permissionHelper';

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
  validateRequiredFields,
} from './listItemHelper';

// String utilities
export { StringUtils, applyStringExtensions, type StringExtensionMethod } from './stringUtils';

// Date utilities
export { DateUtils, applyDateExtensions, type DateExtensionMethod } from './dateUtils';

// Grouped exports for organized imports
export * as BatchUtils from './batchBuilder';
export * as ListItemUtils from './listItemHelper';
export * as PermissionUtils from './permissionHelper';
export * as StringExtensionUtils from './stringUtils';
export * as DateExtensionUtils from './dateUtils';
