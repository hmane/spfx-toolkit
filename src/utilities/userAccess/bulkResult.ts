import type { IBulkResult, IBulkResultItem } from './types';

/**
 * Returns an empty bulk result (succeeded: [], failed: [], items: []).
 * This is considered a full success by vacuity (no operations failed).
 */
export function emptyBulkResult(): IBulkResult {
  return { succeeded: [], failed: [], items: [] };
}

/**
 * Creates a IBulkResult from an array of IBulkResultItem.
 * Separates items into succeeded (by groupId) and failed (with error details).
 */
export function fromItems(items: ReadonlyArray<IBulkResultItem>): IBulkResult {
  const succeeded: number[] = [];
  const failed: Array<{ groupId: number; error: string }> = [];

  for (const item of items) {
    if (item.success) {
      succeeded.push(item.groupId);
    } else {
      failed.push({ groupId: item.groupId, error: item.error ?? 'unknown' });
    }
  }

  return { succeeded, failed, items: [...items] };
}

/**
 * Merges multiple IBulkResult objects into a single result.
 * Concatenates succeeded, failed, and items arrays.
 */
export function mergeBulkResults(
  ...results: ReadonlyArray<IBulkResult>
): IBulkResult {
  const out = emptyBulkResult();

  for (const r of results) {
    out.succeeded.push(...r.succeeded);
    out.failed.push(...r.failed);
    out.items.push(...r.items);
  }

  return out;
}

/**
 * Returns true if all operations succeeded (failed.length === 0).
 * Empty results are considered fully successful (by vacuity).
 */
export function isFullSuccess(r: IBulkResult): boolean {
  return r.failed.length === 0;
}

/**
 * Returns true if all operations failed (items.length > 0 && succeeded.length === 0).
 * Empty results are NOT considered a full failure.
 */
export function isFullFailure(r: IBulkResult): boolean {
  return r.items.length > 0 && r.succeeded.length === 0;
}
