/**
 * SPDynamicForm built-in writer (opt-in via the `autoSave` prop).
 *
 * Layered structure so the dispatch logic is unit-testable without React or
 * a real SP backend:
 *
 *   - `pickSaveMethod`         — pure: which write API to call
 *   - `applyFieldToUpdater`    — pure-ish: typed dispatch into spUpdater
 *   - `mapValidateResponseToFieldErrors` — pure: SP `validateUpdateListItem`
 *                                response → RHF-shaped field errors
 *   - `saveItem` / `saveItemsBatch` — orchestrators that talk to PnP
 *
 * Per the audit:
 *   - We always go through `field.fieldType` to pick the typed setter rather
 *     than relying on auto-detection — auto-detect can't disambiguate
 *     numeric arrays as `lookupMulti` vs `userMulti`.
 *   - Change detection is the responsibility of `prepareSubmitResult` (which
 *     uses `fieldValueChanged`); this module trusts the `updates` it receives.
 */

import { SPFI } from '@pnp/sp';
import '@pnp/sp/items';
import '@pnp/sp/lists';
import '@pnp/sp/webs';
import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { createSPUpdater } from '../../../utilities/listItemHelper';
import { BatchBuilder } from '../../../utilities/batchBuilder';
import { IAutoSaveResult } from '../SPDynamicForm.types';
import { IListItemFormUpdateValue } from '../../../types';
import {
  ValidateResponseEntry,
  extractNewItemId,
  mapValidateResponseToFieldErrors,
} from './autoSave.helpers';

// Re-export pure helpers so consumers / SPDynamicForm.tsx can import from a
// single location. The helpers themselves live in `autoSave.helpers.ts` so
// they can be unit-tested without SPFx transitive imports.
export {
  pickSaveMethod,
  applyFieldToUpdater,
  mapValidateResponseToFieldErrors,
  extractNewItemId,
  VALIDATE_PREFERRED_TYPES,
} from './autoSave.helpers';
export type {
  PickSaveMethodArgs,
  ValidateResponseEntry,
} from './autoSave.helpers';

// ----------------------------------------------------------------------------
// saveItem — single-item NEW or EDIT
// ----------------------------------------------------------------------------

export interface SaveItemArgs {
  sp: SPFI;
  listId: string;
  mode: 'new' | 'edit';
  itemId?: number;
  /** PnP-shaped updates already produced by `prepareSubmitResult`. */
  updates: Record<string, unknown>;
  /** Updater (used to obtain the validate-form values when method='validate'). */
  updater: ReturnType<typeof createSPUpdater>;
  /** Effective method to use — already resolved from `pickSaveMethod`. */
  method: 'update' | 'validate';
  /** Effective content type id (for NEW mode item creation). */
  contentTypeId?: string;
}

export async function saveItem(args: SaveItemArgs): Promise<IAutoSaveResult> {
  const { sp, listId, mode, itemId, updates, updater, method, contentTypeId } = args;
  const list = getListByNameOrId(sp, listId);

  if (mode === 'new') {
    // NEW mode always uses items.add(). The validate path for new items
    // (`addValidateUpdateItemUsingPath`) requires a folder path and is not
    // included in v1.
    const payload: Record<string, unknown> = { ...updates };
    if (contentTypeId && !('ContentTypeId' in payload)) {
      payload.ContentTypeId = contentTypeId;
    }
    const result = await list.items.add(payload as any);
    const newId = extractNewItemId(result);
    if (newId === null) {
      // Fail loud — without a real id, downstream work (attachments,
      // navigation, refetch) silently misbehaves. Better to surface the
      // unexpected response shape immediately.
      throw new Error(
        'SPDynamicForm: autoSave created the item but could not extract its Id from the PnP response.'
      );
    }
    SPContext.logger.success('SPDynamicForm: autoSave created item', {
      listId,
      itemId: newId,
      fieldCount: Object.keys(updates).length,
    });
    return {
      action: 'created',
      ok: true,
      itemId: newId,
      updates,
      response: result,
    };
  }

  // EDIT
  if (typeof itemId !== 'number') {
    throw new Error('SPDynamicForm: autoSave requires `itemId` for edit mode');
  }
  const item = list.items.getById(itemId);

  if (method === 'update') {
    const response = await item.update(updates as any);
    SPContext.logger.success('SPDynamicForm: autoSave updated item', {
      listId,
      itemId,
      method,
      fieldCount: Object.keys(updates).length,
    });
    return {
      action: 'updated',
      ok: true,
      itemId,
      updates,
      response,
    };
  }

  // method === 'validate'
  const formValues: IListItemFormUpdateValue[] = updater.getValidateUpdates();
  const response = (await item.validateUpdateListItem(
    formValues
  )) as ValidateResponseEntry[];
  const fieldErrors = mapValidateResponseToFieldErrors(response);

  if (fieldErrors.length > 0) {
    SPContext.logger.warn('SPDynamicForm: autoSave validate had field errors', {
      listId,
      itemId,
      fieldErrorCount: fieldErrors.length,
      fields: fieldErrors.map((e) => e.fieldName),
    });
    return {
      action: 'updated',
      ok: false,
      itemId,
      fieldErrors,
      response,
    };
  }

  SPContext.logger.success('SPDynamicForm: autoSave validated item', {
    listId,
    itemId,
    method,
    fieldCount: formValues.length,
  });
  return {
    action: 'updated',
    ok: true,
    itemId,
    updates,
    response,
  };
}

// ----------------------------------------------------------------------------
// saveItemsBatch — multi-item via BatchBuilder
// ----------------------------------------------------------------------------

export interface SaveItemsBatchArgs {
  sp: SPFI;
  listName: string; // BatchBuilder takes Title or GUID via list()
  itemIds: ReadonlyArray<number>;
  /** Same `updates` payload applied to every item. */
  updates: Record<string, unknown>;
}

export async function saveItemsBatch(
  args: SaveItemsBatchArgs
): Promise<IAutoSaveResult> {
  const { sp, listName, itemIds, updates } = args;
  const batch = new BatchBuilder(sp);
  const builder = batch.list(listName);
  for (const id of itemIds) {
    builder.update(id, updates);
  }
  const result = await batch.execute();
  // Map per-operation outcomes back to per-item outcomes.
  const itemResults = result.results.map((r, i) => ({
    itemId: itemIds[i],
    success: r.success,
    error: r.error,
  }));
  const ok = result.failedOperations === 0;
  SPContext.logger.info('SPDynamicForm: autoSave multi-item complete', {
    listName,
    itemCount: itemIds.length,
    successful: result.successfulOperations,
    failed: result.failedOperations,
  });
  return {
    action: 'multi',
    ok,
    itemResults,
  };
}
