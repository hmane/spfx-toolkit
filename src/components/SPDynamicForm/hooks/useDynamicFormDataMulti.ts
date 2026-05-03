import * as React from 'react';
import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { extractItemValues } from '../utilities/extractItemValues';
import { buildItemQueryFields } from '../utilities/itemQueryBuilder';
import { IFieldMetadata } from '../types/fieldMetadata';

export interface IMultiItemDataResult {
  /** Map of itemId → form-shape values (same structure as single-item edit). */
  items: Record<number, Record<string, unknown>>;
  /** Map of itemId → raw SP item (for diagnostics; do NOT use for diffs). */
  rawItems: Record<number, Record<string, unknown>>;
  loading: boolean;
  error: string | null;
}

const CHUNK_SIZE = 50; // SP `$filter Id in (...)` works well below 100 items per chunk

export function useDynamicFormDataMulti(
  listId: string,
  itemIds: number[],
  fields: IFieldMetadata[]
): IMultiItemDataResult {
  const [state, setState] = React.useState<IMultiItemDataResult>({
    items: {},
    rawItems: {},
    loading: true,
    error: null,
  });

  const idsKey = React.useMemo(() => [...itemIds].sort((a, b) => a - b).join(','), [itemIds]);
  const fieldsKey = React.useMemo(() => fields.map((f) => f.internalName).join(','), [fields]);

  React.useEffect(() => {
    let cancelled = false;
    if (!itemIds || itemIds.length === 0 || fields.length === 0) {
      setState({ items: {}, rawItems: {}, loading: false, error: null });
      return;
    }

    const load = async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const sp = SPContext.tryGetSP();
        if (!sp) throw new Error('SPContext not initialized');
        const list = getListByNameOrId(sp, listId);

        const { selectFields, expandFields } = buildItemQueryFields(fields);

        const chunks: number[][] = [];
        for (let i = 0; i < itemIds.length; i += CHUNK_SIZE) {
          chunks.push(itemIds.slice(i, i + CHUNK_SIZE));
        }

        const rawResults: any[] = [];
        for (const chunk of chunks) {
          if (cancelled) return;
          const filter = `Id in (${chunk.join(',')})`;
          let q = list.items.select(...selectFields).filter(filter).top(CHUNK_SIZE);
          if (expandFields.length > 0) q = q.expand(...expandFields) as any;
          const rows = await q();
          if (cancelled) return;
          rawResults.push(...rows);
        }

        const items: Record<number, Record<string, unknown>> = {};
        const rawItems: Record<number, Record<string, unknown>> = {};
        rawResults.forEach((r) => {
          rawItems[r.Id] = r;
          items[r.Id] = extractItemValues(r, fields);
        });

        if (cancelled) return;
        setState({ items, rawItems, loading: false, error: null });
      } catch (err: any) {
        if (cancelled) return;
        SPContext.logger.error('SPDynamicForm: multi-item load failed', err, { listId, itemIds });
        setState({ items: {}, rawItems: {}, loading: false, error: err?.message || 'Failed to load items' });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, idsKey, fieldsKey]);

  return state;
}
