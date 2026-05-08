/**
 * Pure helpers for the SPDynamicForm built-in writer.
 *
 * Kept separate from `autoSave.ts` so they can be unit-tested without the
 * SPFx context / PnP / BatchBuilder transitive imports.
 */

import { createSPUpdater } from '../../../utilities/listItemHelper';
import { SPFieldType } from '../../spFields/types';
import { IFieldMetadata } from '../types/fieldMetadata';
import {
  AutoSaveMethod,
  IAutoSaveFieldError,
} from '../SPDynamicForm.types';

// ----------------------------------------------------------------------------
// pickSaveMethod
// ----------------------------------------------------------------------------

/**
 * Field types that benefit from `validateUpdateListItem` — SP returns
 * per-field error messages we can pipe into RHF. These are the same field
 * types that have non-trivial wire formats (taxonomy needs hidden Note field
 * sync, multi-user is a person-array, multi-choice has its own joining).
 */
export const VALIDATE_PREFERRED_TYPES: ReadonlySet<string> = new Set<string>([
  SPFieldType.User,
  SPFieldType.UserMulti,
  SPFieldType.Lookup,
  SPFieldType.LookupMulti,
  SPFieldType.TaxonomyFieldType,
  SPFieldType.TaxonomyFieldTypeMulti,
  SPFieldType.MultiChoice,
]);

export interface PickSaveMethodArgs {
  method: AutoSaveMethod;
  changedFieldNames: ReadonlyArray<string>;
  fieldsByName: ReadonlyMap<string, IFieldMetadata>;
}

/**
 * Resolve the user's `method` choice into a concrete `'update' | 'validate'`.
 *
 *   - `'update'`   → always `'update'`
 *   - `'validate'` → always `'validate'`
 *   - `'auto'`     → `'validate'` if any changed field's type is in
 *                    `VALIDATE_PREFERRED_TYPES`, else `'update'`
 */
export function pickSaveMethod(
  args: PickSaveMethodArgs
): 'update' | 'validate' {
  if (args.method === 'update') return 'update';
  if (args.method === 'validate') return 'validate';
  // 'auto'
  for (const name of args.changedFieldNames) {
    const meta = args.fieldsByName.get(name);
    if (!meta) continue;
    if (VALIDATE_PREFERRED_TYPES.has(meta.fieldType)) return 'validate';
  }
  return 'update';
}

// ----------------------------------------------------------------------------
// applyFieldToUpdater — typed dispatch by IFieldMetadata.fieldType
// ----------------------------------------------------------------------------

/**
 * Push a form value into spUpdater using the typed setter that matches
 * `field.fieldType`. The form already knows the type; relying on
 * spUpdater's auto-detection would produce the wrong shape for ambiguous
 * cases (e.g. numeric arrays could be lookup-multi OR user-multi-by-id).
 *
 * Returns the updater for chaining.
 */
export function applyFieldToUpdater(
  updater: ReturnType<typeof createSPUpdater>,
  field: IFieldMetadata,
  value: unknown,
  originalValue?: unknown
): ReturnType<typeof createSPUpdater> {
  const name = field.internalName;
  switch (field.fieldType) {
    case SPFieldType.Text:
    case SPFieldType.Note:
    case SPFieldType.Choice:
      return updater.setText(name, value as string | null, originalValue as string | null);
    case SPFieldType.MultiChoice:
      return updater.setMultiChoice(
        name,
        (value as string[]) || [],
        originalValue as string[] | undefined
      );
    case SPFieldType.Number:
    case SPFieldType.Currency:
    case SPFieldType.Integer:
    case SPFieldType.Counter:
      return updater.setNumber(name, value as number | null, originalValue as number | null);
    case SPFieldType.Boolean:
      return updater.setBoolean(name, value as boolean | null, originalValue as boolean | null);
    case SPFieldType.DateTime:
      return updater.setDate(name, value as Date | null, originalValue as Date | null);
    case SPFieldType.User:
      return updater.setUser(name, value as any, originalValue as any);
    case SPFieldType.UserMulti:
      return updater.setUserMulti(
        name,
        (value as any[]) || [],
        originalValue as any[] | undefined
      );
    case SPFieldType.Lookup:
      return updater.setLookup(name, value as any, originalValue as any);
    case SPFieldType.LookupMulti:
      return updater.setLookupMulti(
        name,
        (value as any[]) || [],
        originalValue as any[] | undefined
      );
    case SPFieldType.URL:
      return updater.setUrl(name, value as any, originalValue as any);
    case SPFieldType.TaxonomyFieldType:
      return updater.setTaxonomy(name, value as any, originalValue as any);
    case SPFieldType.TaxonomyFieldTypeMulti:
      return updater.setTaxonomyMulti(
        name,
        (value as any[]) || [],
        originalValue as any[] | undefined
      );
    case SPFieldType.Image:
      return updater.set(name, value, originalValue, 'image');
    default:
      // Calculated / Computed / Attachments / Guid — read-only or
      // non-list-item-write fields. Skip silently.
      return updater;
  }
}

// ----------------------------------------------------------------------------
// extractNewItemId — pluck the new item's Id from a PnP `items.add` response
// ----------------------------------------------------------------------------

/**
 * PnP v3 `list.items.add(payload)` resolves to `{ data, item }`. The created
 * item's properties live on `data` — so `data.Id` is the canonical path. We
 * also accept top-level `Id` / `data.ID` for robustness against alternate
 * shapes from custom http behaviors or older PnP wrappers.
 *
 * Returns the numeric id, or `null` when none could be extracted. Callers
 * MUST treat `null` as a hard failure (not "id 0") — silently using `0`
 * makes attachment uploads fall back to `props.itemId === undefined` and
 * mask the real problem.
 */
export function extractNewItemId(response: unknown): number | null {
  if (!response || typeof response !== 'object') return null;
  const r = response as Record<string, any>;
  const candidates = [
    r.data?.Id,
    r.Id,
    r.data?.ID,
    r.ID,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) return c;
    if (typeof c === 'string') {
      const n = parseInt(c, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// mapValidateResponseToFieldErrors
// ----------------------------------------------------------------------------

export interface ValidateResponseEntry {
  FieldName: string;
  FieldValue?: unknown;
  HasException?: boolean;
  ErrorMessage?: string | null;
}

/**
 * Convert a `validateUpdateListItem` response into RHF-shaped field errors.
 * SP returns one entry per submitted field; only entries with
 * `HasException === true` matter for error reporting.
 */
export function mapValidateResponseToFieldErrors(
  response: ReadonlyArray<ValidateResponseEntry>
): IAutoSaveFieldError[] {
  const out: IAutoSaveFieldError[] = [];
  for (const entry of response) {
    if (entry?.HasException && entry.FieldName) {
      out.push({
        fieldName: entry.FieldName,
        message: entry.ErrorMessage || 'Server validation failed',
      });
    }
  }
  return out;
}
