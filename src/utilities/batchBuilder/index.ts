// ========================================
// CORE EXPORTS - Main classes and functions
// ========================================

// Main batch builder class and factory
export { BatchBuilder, createBatchBuilder } from './BatchBuilder';
export { ListOperationBuilder } from './ListOperationBuilder';

// ========================================
// UTILITY FUNCTIONS - Individual exports for tree-shaking
// ========================================

// Batch execution functions
export { addOperationToBatch } from './addOperationToBatch';
export { executeBatch } from './executeBatch';
export { splitIntoBatches } from './splitIntoBatches';

// ========================================
// CONVENIENCE FUNCTIONS - Ready-to-use utilities
// ========================================

import { SPFI } from '@pnp/sp';
import {
  IBatchBuilderConfig,
  IBatchOperation,
  OperationType,
} from '../../types/batchOperationTypes';
import { BatchBuilder } from './BatchBuilder';
import { executeBatch } from './executeBatch';

/**
 * Quick batch execution without builder pattern
 * Useful for simple, one-off batch operations
 */
export const executeBatchOperations = async (
  sp: SPFI,
  operations: IBatchOperation[],
  config?: IBatchBuilderConfig
) => {
  const builder = new BatchBuilder(sp, config);

  // Add all operations to builder
  operations.forEach(op => {
    const listBuilder = builder.list(op.listName);

    switch (op.operationType) {
      case 'add':
        if (op.data) listBuilder.add(op.data);
        break;
      case 'update':
        if (op.itemId && op.data) listBuilder.update(op.itemId, op.data, op.eTag);
        break;
      case 'delete':
        if (op.itemId) listBuilder.delete(op.itemId, op.eTag);
        break;
      case 'addValidateUpdateItemUsingPath':
        if (op.formValues && op.path)
          listBuilder.addValidateUpdateItemUsingPath(op.formValues, op.path);
        break;
      case 'validateUpdateListItem':
        if (op.itemId && op.formValues)
          listBuilder.validateUpdateListItem(op.itemId, op.formValues);
        break;
    }
  });

  return builder.execute();
};

/**
 * Execute a single batch directly (bypass BatchBuilder)
 * Most performant option for single batch operations
 */
export const executeSingleBatch = (sp: SPFI, operations: IBatchOperation[]) => {
  return executeBatch(sp, operations);
};

/**
 * Utility to create multiple list builders at once
 * Useful for complex multi-list operations
 */
export const createMultiListBuilder = (
  sp: SPFI,
  listNames: string[],
  config?: IBatchBuilderConfig
) => {
  const builder = new BatchBuilder(sp, config);
  const listBuilders: Record<string, ReturnType<typeof builder.list>> = {};

  listNames.forEach(listName => {
    listBuilders[listName] = builder.list(listName);
  });

  return {
    builders: listBuilders,
    execute: () => builder.execute(),
    getConfig: () => builder.getConfig(),
    updateConfig: (newConfig: Partial<IBatchBuilderConfig>) => builder.updateConfig(newConfig),
  };
};

// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * Validate batch operations before execution
 */
export const validateBatchOperations = (
  operations: IBatchOperation[]
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  operations.forEach((op, index) => {
    if (!op.listName?.trim()) {
      errors.push(`Operation ${index}: listName is required`);
    }

    if (!op.operationType) {
      errors.push(`Operation ${index}: operationType is required`);
    }

    switch (op.operationType) {
      case 'add':
        if (!op.data) errors.push(`Operation ${index}: data is required for add operation`);
        break;
      case 'update':
        if (!op.itemId) errors.push(`Operation ${index}: itemId is required for update operation`);
        if (!op.data) errors.push(`Operation ${index}: data is required for update operation`);
        break;
      case 'delete':
        if (!op.itemId) errors.push(`Operation ${index}: itemId is required for delete operation`);
        break;
      case 'addValidateUpdateItemUsingPath':
        if (!op.formValues) errors.push(`Operation ${index}: formValues is required`);
        if (!op.path) errors.push(`Operation ${index}: path is required`);
        break;
      case 'validateUpdateListItem':
        if (!op.itemId) errors.push(`Operation ${index}: itemId is required`);
        if (!op.formValues) errors.push(`Operation ${index}: formValues is required`);
        break;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ========================================
// BATCH STATISTICS AND MONITORING
// ========================================

/**
 * Analyze batch operations and provide statistics
 */
export const analyzeBatchOperations = (operations: IBatchOperation[]) => {
  const stats = {
    totalOperations: operations.length,
    operationsByType: {} as Record<OperationType, number>,
    operationsByList: {} as Record<string, number>,
    hasEtagOperations: 0,
    hasFormValueOperations: 0,
    estimatedBatches: (batchSize: number) => Math.ceil(operations.length / batchSize),
  };

  operations.forEach(op => {
    // Count by operation type
    stats.operationsByType[op.operationType] = (stats.operationsByType[op.operationType] || 0) + 1;

    // Count by list
    stats.operationsByList[op.listName] = (stats.operationsByList[op.listName] || 0) + 1;

    // Count special operations
    if (op.eTag) stats.hasEtagOperations++;
    if (op.formValues) stats.hasFormValueOperations++;
  });

  return stats;
};

// ========================================
// PERFORMANCE UTILITIES
// ========================================

/**
 * Get optimal batch size recommendation based on operations
 */
export const getOptimalBatchSize = (operations: IBatchOperation[]): number => {
  const stats = analyzeBatchOperations(operations);

  // Conservative batch sizes for complex operations
  if (stats.hasFormValueOperations > 0) return 25;
  if (stats.operationsByType.addValidateUpdateItemUsingPath > 0) return 50;
  if (Object.keys(stats.operationsByList).length > 5) return 75; // Many lists

  return 100; // Default
};

/**
 * Estimate execution time based on operations
 */
export const estimateExecutionTime = (
  operations: IBatchOperation[],
  batchSize = 100
): {
  estimatedSeconds: number;
  estimatedBatches: number;
  factors: string[];
} => {
  const stats = analyzeBatchOperations(operations);
  const estimatedBatches = stats.estimatedBatches(batchSize);
  const factors: string[] = [];

  // Base time per batch (seconds)
  let timePerBatch = 2;

  // Adjust for operation complexity
  if (stats.hasFormValueOperations > 0) {
    timePerBatch += 1;
    factors.push('Form validation operations increase time');
  }

  if (Object.keys(stats.operationsByList).length > 3) {
    timePerBatch += 0.5;
    factors.push('Multiple lists increase complexity');
  }

  if (stats.operationsByType.delete > stats.totalOperations * 0.3) {
    timePerBatch += 0.5;
    factors.push('Many delete operations may require additional processing');
  }

  return {
    estimatedSeconds: Math.ceil(estimatedBatches * timePerBatch),
    estimatedBatches,
    factors,
  };
};

// ========================================
// CONSTANTS AND DEFAULTS
// ========================================

export const BATCH_CONSTANTS = {
  DEFAULT_BATCH_SIZE: 100,
  CONSERVATIVE_BATCH_SIZE: 25,
  MAX_RECOMMENDED_BATCH_SIZE: 200,
  MIN_BATCH_SIZE: 1,

  // Operation timeouts (milliseconds)
  DEFAULT_TIMEOUT: 30000,
  COMPLEX_OPERATION_TIMEOUT: 60000,

  // Retry configuration
  DEFAULT_MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// ========================================
// BACKWARD COMPATIBILITY
// ========================================

// Keep the original simple exports for existing code
/** @deprecated Use named exports for better tree-shaking */
export * from './BatchBuilder';
/** @deprecated Use named exports for better tree-shaking */
export * from './ListOperationBuilder';
