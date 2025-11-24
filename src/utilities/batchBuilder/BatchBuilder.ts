import { SPFI } from '@pnp/sp';
import {
  IBatchBuilderConfig,
  IBatchError,
  IBatchOperation,
  IBatchResult,
  IOperationResult,
} from '../../types/batchOperationTypes';
import { SPContext } from '../context';
import { executeBatch } from './executeBatch';
import { ListOperationBuilder } from './ListOperationBuilder';
import { splitIntoBatches } from './splitIntoBatches';

/**
 * Builder for creating and executing batched SharePoint operations
 *
 * Provides a fluent API for queuing multiple SharePoint operations and executing
 * them efficiently in batches to minimize network requests.
 *
 * @example
 * ```typescript
 * const batch = new BatchBuilder(SPContext.sp, { batchSize: 50 });
 *
 * batch
 *   .list('Tasks')
 *   .create({ Title: 'Task 1', Status: 'Active' })
 *   .create({ Title: 'Task 2', Status: 'Pending' })
 *   .update(10, { Status: 'Complete' });
 *
 * const result = await batch.execute();
 * console.log(`Success: ${result.successfulOperations}, Failed: ${result.failedOperations}`);
 * ```
 */
export class BatchBuilder {
  private operations: IBatchOperation[] = [];
  private currentListBuilder?: ListOperationBuilder;

  constructor(private readonly sp: SPFI, private config: IBatchBuilderConfig = {}) {
    this.config = { batchSize: 100, enableConcurrency: false, ...config };
  }

  /**
   * Begin queuing operations on a specific SharePoint list
   *
   * Returns a ListOperationBuilder for chaining create/update/delete operations.
   * Automatically commits pending operations from any previous list.
   *
   * @param listName - Title or GUID of the SharePoint list
   * @returns ListOperationBuilder for chaining operations
   *
   * @example
   * ```typescript
   * batch.list('Tasks')
   *   .create({ Title: 'New Task' })
   *   .update(5, { Status: 'Complete' })
   *   .delete(10);
   * ```
   */
  list(listName: string): ListOperationBuilder {
    if (this.currentListBuilder) {
      this.operations.push(...this.currentListBuilder.getOperations());
    }
    this.currentListBuilder = new ListOperationBuilder(listName);
    return this.currentListBuilder;
  }

  /**
   * Execute all queued operations in batches
   *
   * Splits operations into batches based on configured size and executes them
   * sequentially or concurrently. Returns detailed results including successes
   * and failures.
   *
   * @param signal - Optional AbortSignal to cancel batch execution
   * @returns Promise resolving to batch execution results with operation counts and errors
   * @throws Error if execution is cancelled via AbortSignal
   *
   * @example
   * ```typescript
   * const result = await batch.execute();
   *
   * if (result.success) {
   *   console.log(`All ${result.totalOperations} operations successful`);
   * } else {
   *   console.error(`${result.failedOperations} operations failed`);
   *   result.errors.forEach(err => console.error(err.error));
   * }
   * ```
   *
   * @example With cancellation support
   * ```typescript
   * const controller = new AbortController();
   * const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
   *
   * try {
   *   const result = await batch.execute(controller.signal);
   *   clearTimeout(timeoutId);
   * } catch (error) {
   *   if (error.message.includes('cancelled')) {
   *     console.log('Batch execution was cancelled');
   *   }
   * }
   * ```
   */
  async execute(signal?: AbortSignal): Promise<IBatchResult> {
    if (this.currentListBuilder) {
      this.operations.push(...this.currentListBuilder.getOperations());
      this.currentListBuilder = undefined;
    }

    if (this.operations.length === 0) {
      SPContext.logger.info('BatchBuilder: No operations to execute');
      return {
        success: true,
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        results: [],
        errors: [],
      };
    }

    // Check for cancellation before starting
    if (signal?.aborted) {
      throw new Error('Batch execution cancelled before starting');
    }

    const batches = splitIntoBatches(this.operations, this.config.batchSize || 100);
    const timer = SPContext.logger.startTimer('BatchBuilder.execute');

    SPContext.logger.info('BatchBuilder: Starting execution', {
      totalOperations: this.operations.length,
      batchCount: batches.length,
      batchSize: this.config.batchSize || 100,
      concurrency: this.config.enableConcurrency || false,
      cancellable: !!signal,
    });

    const allResults: IOperationResult[] = [];
    const allErrors: IBatchError[] = [];

    if (this.config.enableConcurrency) {
      const promises = batches.map(b => executeBatch(this.sp, b));
      const settled = await Promise.allSettled(promises);
      settled.forEach((s, idx) => {
        if (s.status === 'fulfilled') {
          allResults.push(...s.value.results);
          allErrors.push(...s.value.errors);
        } else {
          // mark entire batch as failed
          const batch = batches[idx];
          const msg = s.reason?.message || 'Batch execution failed';
          batch.forEach(op => {
            allResults.push({
              operationType: op.operationType,
              listName: op.listName,
              success: false,
              error: msg,
              itemId: op.itemId,
              operationId: op.operationId,
            });
            allErrors.push({
              listName: op.listName,
              operationType: op.operationType,
              error: msg,
              itemId: op.itemId,
              operationId: op.operationId,
            });
          });
        }
      });
    } else {
      for (const b of batches) {
        // Check for cancellation before each batch
        if (signal?.aborted) {
          SPContext.logger.warn('BatchBuilder: Execution cancelled mid-operation', {
            completedBatches: allResults.length > 0 ? Math.ceil(allResults.length / (this.config.batchSize || 100)) : 0,
            totalBatches: batches.length,
          });
          throw new Error('Batch execution cancelled');
        }

        try {
          const { results, errors } = await executeBatch(this.sp, b);
          allResults.push(...results);
          allErrors.push(...errors);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Batch execution failed';
          b.forEach(op => {
            allResults.push({
              operationType: op.operationType,
              listName: op.listName,
              success: false,
              error: msg,
              itemId: op.itemId,
              operationId: op.operationId,
            });
            allErrors.push({
              listName: op.listName,
              operationType: op.operationType,
              error: msg,
              itemId: op.itemId,
              operationId: op.operationId,
            });
          });
        }
      }
    }

    const successfulOperations = allResults.filter(r => r.success).length;
    const failedOperations = allResults.length - successfulOperations;

    const duration = timer();

    // Log results
    if (failedOperations > 0) {
      SPContext.logger.warn('BatchBuilder: Execution completed with failures', {
        totalOperations: allResults.length,
        successfulOperations,
        failedOperations,
        duration,
        sampleErrors: allErrors.slice(0, 3).map(e => ({
          list: e.listName,
          operation: e.operationType,
          error: e.error,
        })),
      });
    } else {
      SPContext.logger.success('BatchBuilder: All operations successful', {
        totalOperations: allResults.length,
        successfulOperations,
        duration,
      });
    }

    // reset state for reuse
    this.operations = [];

    return {
      success: failedOperations === 0,
      totalOperations: allResults.length,
      successfulOperations,
      failedOperations,
      results: allResults,
      errors: allErrors,
    };
  }

  /**
   * Get the current batch configuration
   *
   * Returns a copy of the configuration to prevent external modifications.
   *
   * @returns Current batch builder configuration
   */
  getConfig(): IBatchBuilderConfig {
    return { ...this.config };
  }

  /**
   * Update the batch configuration
   *
   * Merges provided config with existing configuration.
   * Returns this for method chaining.
   *
   * @param config - Partial configuration to merge with existing config
   * @returns This BatchBuilder instance for chaining
   *
   * @example
   * ```typescript
   * batch
   *   .updateConfig({ batchSize: 50, enableConcurrency: true })
   *   .list('Tasks')
   *   .create({ Title: 'Task 1' });
   * ```
   */
  updateConfig(config: Partial<IBatchBuilderConfig>): this {
    this.config = { ...this.config, ...config };
    return this;
  }
}

/**
 * Factory function to create a new BatchBuilder instance
 *
 * Convenient alternative to using `new BatchBuilder()`.
 *
 * @param sp - PnP SPFI instance configured for the target site
 * @param config - Optional batch configuration (batchSize, enableConcurrency)
 * @returns New BatchBuilder instance
 *
 * @example
 * ```typescript
 * const batch = createBatchBuilder(SPContext.sp, {
 *   batchSize: 100,
 *   enableConcurrency: false
 * });
 * ```
 */
export function createBatchBuilder(sp: SPFI, config?: IBatchBuilderConfig): BatchBuilder {
  return new BatchBuilder(sp, config);
}
