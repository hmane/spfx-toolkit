/**
 * Shared "hydration key" helper for SP field components that wrap PnP pickers
 * with one-time-only init props (`<PeoplePicker defaultSelectedUsers>`,
 * `<ModernTaxonomyPicker initialValues>`).
 *
 * Background — the audit problem:
 *
 * SPDynamicForm in edit/view mode loads field metadata first, then loads the
 * item data. While both are loading the form shows a spinner, but pickers
 * mount as soon as data appears. The PnP pickers consume their init props
 * exactly once on mount, so if the consumed value was empty (or stale, e.g.
 * the user navigated to a new item on the same form instance) the picker
 * visually stays empty even after RHF's `reset(itemData)` updates
 * `field.value`.
 *
 * Fix: stamp a `key` on the picker that bumps when `field.value` transitions
 * from "empty" to "non-empty" (or vice versa). One forced remount per
 * transition; React reads the new init prop fresh.
 *
 * `isEmptyFieldValue` is the pure predicate that drives the transition. It
 * lives here so the user/taxonomy field components share the same definition
 * and can be unit-tested without React.
 */

/**
 * True when the value should be treated as "no selection" for a SP field.
 *
 * - `null` / `undefined` → empty
 * - `''` → empty
 * - `[]` → empty
 * - everything else (including `{}` and `0` and `false`) → not empty
 *
 * Note: `0` and `false` are valid scalar values for some fields, so they are
 * NOT treated as empty.
 */
export function isEmptyFieldValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.length === 0;
  return false;
}
