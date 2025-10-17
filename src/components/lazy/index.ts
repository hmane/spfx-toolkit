/**
 * Lazy-loaded versions of heavy components for optimal bundle size
 *
 * Import these instead of the regular components when:
 * - Component is not needed on initial page load
 * - Component is used in modals/panels
 * - Component has heavy dependencies (DevExtreme, etc.)
 *
 * @example
 * ```tsx
 * import { LazyVersionHistory } from 'spfx-toolkit/lib/components/lazy';
 *
 * // Use exactly like the regular component
 * <LazyVersionHistory itemId={123} listId="abc" itemType="document" />
 * ```
 */

import { createLazyComponent } from '../../utilities/lazyLoader';

/**
 * Lazy-loaded VersionHistory component (~200-300KB)
 *
 * Use for document/list item version tracking when not needed immediately on page load.
 */
export const LazyVersionHistory = createLazyComponent(
  () => import('../VersionHistory').then(m => ({ default: m.VersionHistory })),
  {
    errorMessage: 'Failed to load Version History component',
    minLoadingTime: 200,
  }
);

/**
 * Lazy-loaded ManageAccessComponent (~150-250KB)
 *
 * Use for permission management UI when not needed immediately on page load.
 */
export const LazyManageAccessComponent = createLazyComponent(
  () => import('../ManageAccess').then(m => ({ default: m.ManageAccessComponent })),
  {
    errorMessage: 'Failed to load Manage Access component',
    minLoadingTime: 200,
  }
);

/**
 * Lazy-loaded ManageAccessPanel (~150-250KB)
 *
 * Panel version of ManageAccess - ideal for lazy loading since it's modal content.
 */
export const LazyManageAccessPanel = createLazyComponent(
  () => import('../ManageAccess').then(m => ({ default: m.ManageAccessPanel })),
  {
    errorMessage: 'Failed to load Manage Access panel',
    minLoadingTime: 200,
  }
);

/**
 * Lazy-loaded ConflictDetector (~100-150KB)
 *
 * Use when conflict detection is not needed immediately on page load.
 */
export const LazyConflictDetector = createLazyComponent(
  () => import('../ConflictDetector').then((m: any) => ({ default: m.ConflictDetector })),
  {
    errorMessage: 'Failed to load Conflict Detector component',
    minLoadingTime: 200,
  }
);

/**
 * Lazy-loaded WorkflowStepper (~80-120KB)
 *
 * Use when workflow visualization is not needed immediately.
 */
export const LazyWorkflowStepper = createLazyComponent(
  () => import('../WorkflowStepper').then(m => ({ default: m.WorkflowStepper })),
  {
    errorMessage: 'Failed to load Workflow Stepper component',
    minLoadingTime: 150,
  }
);

// Re-export the preload utilities for convenience
export { preloadComponent, useLazyPreload } from '../../utilities/lazyLoader';
