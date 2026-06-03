let ensured = false;

/**
 * DevExtreme's SelectBox/TagBox create an internal List with selection controls.
 * In optimized SPFx bundles, DevExtreme's side-effect-only selection decorator
 * registration can be dropped because its subpath packages declare
 * `sideEffects: false`. Keep this as an explicit runtime require so List
 * selection is registered before any toolkit SelectBox/TagBox renders.
 */
export function ensureDevExtremeListSelection(): void {
  if (ensured) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('devextreme/ui/list/modules/selection');
  ensured = true;
}
