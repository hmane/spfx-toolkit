import { SPFI } from '@pnp/sp';
import {
  IBatchBuilderConfig,
  IBatchError,
  IBatchOperation,
  IBatchResult,
  IOperationResult,
} from '../../types/batchOperationTypes';
import { executeBatch } from './executeBatch';
import { ListOperationBuilder } from './ListOperationBuilder';
import { splitIntoBatches } from './splitIntoBatches';

export class BatchBuilder {
  private operations: IBatchOperation[] = [];
  private currentListBuilder?: ListOperationBuilder;

  constructor(private readonly sp: SPFI, private config: IBatchBuilderConfig = {}) {
    this.config = { batchSize: 100, enableConcurrency: false, ...config };
  }

  /** Begin operations on a specific list */
  list(listName: string): ListOperationBuilder {
    if (this.currentListBuilder) {
      this.operations.push(...this.currentListBuilder.getOperations());
    }
    this.currentListBuilder = new ListOperationBuilder(listName);
    return this.currentListBuilder;
  }

  /** Execute all queued operations */
  async execute(): Promise<IBatchResult> {
    if (this.currentListBuilder) {
      this.operations.push(...this.currentListBuilder.getOperations());
      this.currentListBuilder = undefined;
    }

    if (this.operations.length === 0) {
      return {
        success: true,
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        results: [],
        errors: [],
      };
    }

    const batches = splitIntoBatches(this.operations, this.config.batchSize || 100);
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

  getConfig(): IBatchBuilderConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<IBatchBuilderConfig>): this {
    this.config = { ...this.config, ...config };
    return this;
  }
}

/** Factory */
export function createBatchBuilder(sp: SPFI, config?: IBatchBuilderConfig): BatchBuilder {
  return new BatchBuilder(sp, config);
}
