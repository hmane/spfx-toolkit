import { IBatchOperation } from '../../types/batchOperationTypes';

export function splitIntoBatches(
  operations: IBatchOperation[],
  batchSize: number = 100
): IBatchOperation[][] {
  const batches: IBatchOperation[][] = [];
  for (let i = 0; i < operations.length; i += batchSize) {
    batches.push(operations.slice(i, i + batchSize));
  }
  return batches;
}
