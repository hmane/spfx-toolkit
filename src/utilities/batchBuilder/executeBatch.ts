import { SPFI } from '@pnp/sp';
import '@pnp/sp/batching';
import {
  ExecuteBatchReturn,
  IBatchedOperationTracker,
  IBatchError,
  IBatchOperation,
  IOperationResult,
} from '../../types/batchOperationTypes';
import { SPContext } from '../context';
import { addOperationToBatch } from './addOperationToBatch';

/**
 * Executes a single batch of operations (using PnP.js v3+ .batched()) and returns results/errors.
 */
export async function executeBatch(
  sp: SPFI,
  operations: IBatchOperation[]
): Promise<ExecuteBatchReturn> {
  const results: IOperationResult[] = [];
  const errors: IBatchError[] = [];

  SPContext.logger.info('executeBatch: Starting batch execution', {
    operationCount: operations.length,
  });

  try {
    const [batchedSP, execute] = sp.batched();
    const trackers: IBatchedOperationTracker[] = [];

    // queue all ops
    for (const operation of operations) {
      try {
        const tracker: IBatchedOperationTracker = { operation, resultContainer: {} };
        addOperationToBatch(operation, batchedSP, tracker.resultContainer);
        trackers.push(tracker);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to add operation to batch';
        SPContext.logger.warn('executeBatch: Failed to queue operation', {
          operationType: operation.operationType,
          listName: operation.listName,
          itemId: operation.itemId,
          error: msg,
        });
        results.push({
          operationType: operation.operationType,
          listName: operation.listName,
          success: false,
          error: msg,
          itemId: operation.itemId,
          operationId: operation.operationId,
        });
        errors.push({
          listName: operation.listName,
          operationType: operation.operationType,
          error: msg,
          itemId: operation.itemId,
          operationId: operation.operationId,
        });
      }
    }

    // execute batch
    await execute();

    // collect results
    for (const { operation, resultContainer } of trackers) {
      if (resultContainer.error) {
        const msg =
          resultContainer.error instanceof Error
            ? resultContainer.error.message
            : 'Operation failed';
        results.push({
          operationType: operation.operationType,
          listName: operation.listName,
          success: false,
          error: msg,
          itemId: operation.itemId,
          operationId: operation.operationId,
        });
        errors.push({
          listName: operation.listName,
          operationType: operation.operationType,
          error: msg,
          itemId: operation.itemId,
          operationId: operation.operationId,
        });
      } else {
        results.push({
          operationType: operation.operationType,
          listName: operation.listName,
          success: true,
          data: resultContainer.result,
          itemId: operation.itemId,
          operationId: operation.operationId,
        });
      }
    }
  } catch (batchErr) {
    const msg = batchErr instanceof Error ? batchErr.message : 'Batch execution failed';
    SPContext.logger.error('executeBatch: Batch execution failed', batchErr, {
      operationCount: operations.length,
      error: msg,
    });
    for (const operation of operations) {
      results.push({
        operationType: operation.operationType,
        listName: operation.listName,
        success: false,
        error: msg,
        itemId: operation.itemId,
        operationId: operation.operationId,
      });
      errors.push({
        listName: operation.listName,
        operationType: operation.operationType,
        error: msg,
        itemId: operation.itemId,
        operationId: operation.operationId,
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  if (failureCount > 0) {
    SPContext.logger.warn('executeBatch: Completed with failures', {
      totalOperations: results.length,
      successful: successCount,
      failed: failureCount,
    });
  } else {
    SPContext.logger.info('executeBatch: All operations successful', {
      totalOperations: results.length,
    });
  }

  return { results, errors };
}
