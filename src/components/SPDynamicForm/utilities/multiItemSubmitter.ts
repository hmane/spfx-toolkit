import { SPContext } from '../../../utilities/context';
import { BatchBuilder } from '../../../utilities/batchBuilder';
import { IOperationResult } from '../../../types/batchOperationTypes';
import { formatValueForPnP, SPUpdateFieldType } from '../../../utilities/listItemHelper';
import { IFieldMetadata } from '../types/fieldMetadata';
import { IMultiItemSubmitOutcome, IMultiItemSubmitResult } from '../SPDynamicForm.types';

/**
 * Bridge SPField fieldType (PascalCase, sourced from SP REST `TypeAsString`) to
 * the SPUpdateFieldType enum that `formatValueForPnP` accepts (lowercase).
 * Returns undefined for unmapped types so the formatter falls back to value-shape detection.
 */
function mapSPFieldTypeToUpdateFieldType(t: string): SPUpdateFieldType | undefined {
  const m: Record<string, SPUpdateFieldType> = {
    Text: 'string',
    Note: 'string',
    Choice: 'choice',
    MultiChoice: 'multiChoice',
    Number: 'number',
    Currency: 'number',
    Boolean: 'boolean',
    DateTime: 'date',
    User: 'user',
    UserMulti: 'userMulti',
    Lookup: 'lookup',
    LookupMulti: 'lookupMulti',
    TaxonomyFieldType: 'taxonomy',
    TaxonomyFieldTypeMulti: 'taxonomyMulti',
    URL: 'url',
  };
  return m[t];
}

/**
 * Construct the bulk-update executor. `dirtyValues` carries RAW form values;
 * this function bridges field-type names and runs each through `formatValueForPnP`
 * (the same converter single-item save uses) so taxonomy/user/lookup/URL/multi
 * fields get the right server payload.
 *
 * Sequential execution (`enableConcurrency: false`) — BatchBuilder doesn't
 * support a bounded concurrency cap today, so unbounded Promise.all over many
 * batches risks SPO throttling. Sequential is slower for huge item counts but
 * safe and correct.
 */
export function buildMultiItemSubmitter(
  listIdOrTitle: string,
  itemIds: number[],
  dirtyValues: Record<string, unknown>,
  fields: IFieldMetadata[]
): IMultiItemSubmitResult {
  const fieldsByName = new Map(fields.map((f) => [f.internalName, f]));
  const updates: Record<string, unknown> = {};
  const changedFieldNames = Object.keys(dirtyValues);

  changedFieldNames.forEach((name) => {
    const field = fieldsByName.get(name);
    if (!field) {
      // Unknown field — pass raw and let SP reject loudly. Don't silently drop.
      updates[name] = dirtyValues[name];
      return;
    }
    const explicitType = mapSPFieldTypeToUpdateFieldType(field.fieldType);
    const formatted = formatValueForPnP(name, dirtyValues[name], explicitType);
    // formatValueForPnP may return either:
    //   - a single value (string, number, boolean, Date) → assign to field name
    //   - an object containing one or more SP REST keys (e.g. { OwnerId: 5 } for lookup,
    //     or taxonomy multi shapes) → merge so SP receives the correct property names.
    if (formatted && typeof formatted === 'object' && !Array.isArray(formatted) && !(formatted instanceof Date)) {
      Object.assign(updates, formatted);
    } else {
      updates[name] = formatted;
    }
  });

  return {
    itemIds,
    updates,
    changedFieldNames,
    apply: async (): Promise<IMultiItemSubmitOutcome[]> => {
      const sp = SPContext.tryGetSP();
      if (!sp) throw new Error('SPContext not initialized');

      const builder = new BatchBuilder(sp);
      builder.updateConfig({ batchSize: 100, enableConcurrency: false });

      itemIds.forEach((id) => {
        builder.list(listIdOrTitle).update(id, updates);
      });

      const batchResult = await builder.execute();
      // Map back by itemId where set; positional fallback otherwise.
      const byItemId = new Map<number, IOperationResult>();
      batchResult.results.forEach((r) => {
        if (typeof r.itemId === 'number') byItemId.set(r.itemId, r);
      });

      return itemIds.map((id, i) => {
        const r = byItemId.get(id) ?? batchResult.results[i];
        return {
          itemId: id,
          success: r?.success ?? false,
          error: r?.error,
        };
      });
    },
  };
}
