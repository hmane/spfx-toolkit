import { IFieldMetadata } from '../types/fieldMetadata';
import { normaliseFieldValue } from './changeDetection';

/**
 * Reconcile a single field's value across N items.
 *  - All items share a value (after normalisation) → return that value.
 *  - Items disagree → return `undefined` (caller treats as "leave blank").
 */
export function reconcileFieldValue(
  field: IFieldMetadata,
  itemValues: Array<unknown>
): { value: unknown; allShared: boolean } {
  if (itemValues.length === 0) return { value: undefined, allShared: false };
  const norms = itemValues.map((v) => normaliseFieldValue(field, v));
  const first = norms[0];
  const allShared = norms.every((n) => n === first);
  if (!allShared) return { value: undefined, allShared: false };
  // Return the original (un-normalised) first value so the form receives the right shape.
  return { value: itemValues[0], allShared: true };
}

export function reconcileAllFields(
  fields: IFieldMetadata[],
  items: Record<number, Record<string, unknown>>,
  itemIds: number[],
  mode: 'shared' | 'first' = 'shared'
): { values: Record<string, unknown>; sharedFields: Set<string> } {
  const values: Record<string, unknown> = {};
  const sharedFields = new Set<string>();
  fields.forEach((f) => {
    const itemValues = itemIds.map((id) => items[id]?.[f.internalName]);
    if (mode === 'first') {
      values[f.internalName] = itemValues[0];
      sharedFields.add(f.internalName);
      return;
    }
    const { value, allShared } = reconcileFieldValue(f, itemValues);
    values[f.internalName] = allShared ? value : '';
    if (allShared) sharedFields.add(f.internalName);
  });
  return { values, sharedFields };
}
