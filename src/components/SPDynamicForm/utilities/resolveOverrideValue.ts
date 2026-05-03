import { IFieldMetadata } from '../types/fieldMetadata';

/**
 * Context passed to a function-form override value. Designed to be additive —
 * future fields (e.g. theme) can be added without breaking callers.
 */
export interface IOverrideContext {
  field: IFieldMetadata;
  formValues: Record<string, unknown>;
  mode: 'new' | 'edit' | 'view';
  user?: { loginName?: string; email?: string; displayName?: string };
  contentTypeId?: string;
}

/**
 * A "ValueOrFn<T>" prop: either a literal value or a function that computes
 * the value from the override context. Returning `undefined` from a function
 * means "no opinion — fall back to the default."
 */
export type ValueOrFn<T> = T | ((ctx: IOverrideContext) => T | undefined);

export function resolveOverrideValue<T>(
  v: ValueOrFn<T> | undefined,
  ctx: IOverrideContext
): T | undefined {
  if (v === undefined) return undefined;
  if (typeof v === 'function') {
    try {
      return (v as (c: IOverrideContext) => T | undefined)(ctx);
    } catch {
      return undefined;
    }
  }
  return v as T;
}

/**
 * Specialised resolver for `label` (and `description`/`placeholder`) — the
 * function form additionally receives the *current* label so callers can do
 * "if it looks like X, replace; else keep" logic without introspecting the
 * field themselves. Returns `undefined` to keep the original.
 */
export type LabelTransform = string | ((currentLabel: string, ctx: IOverrideContext) => string | undefined);

export function resolveLabelTransform(
  v: LabelTransform | undefined,
  currentLabel: string,
  ctx: IOverrideContext
): string {
  if (v === undefined) return currentLabel;
  if (typeof v === 'string') return v;
  try {
    const out = v(currentLabel, ctx);
    return out ?? currentLabel;
  } catch {
    return currentLabel;
  }
}
