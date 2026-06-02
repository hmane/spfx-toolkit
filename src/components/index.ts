/**
 * spfx-toolkit component barrel — LIGHTWEIGHT COMPONENTS ONLY
 *
 * This barrel intentionally exposes only the lightweight, low-dependency components
 * to protect consumer bundle size. Importing from 'spfx-toolkit/components' will NOT
 * pull DevExtreme, react-mentions, or heavy PnP people-picker modules.
 *
 * Heavy components (DevExtreme-bound, people-picker-bound, or PnP-augmentation-bound)
 * are intentionally excluded. Import those via their deep subpaths, e.g.:
 *   import { Comments }              from 'spfx-toolkit/lib/components/Comments';
 *   import { VersionHistory }        from 'spfx-toolkit/lib/components/VersionHistory';
 *   import { ManageAccess }          from 'spfx-toolkit/lib/components/ManageAccess';
 *   import { GroupUsersPicker }      from 'spfx-toolkit/lib/components/GroupUsersPicker';
 *   import { SPDynamicForm }         from 'spfx-toolkit/lib/components/SPDynamicForm';
 *   import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';
 *   import { ... }                   from 'spfx-toolkit/lib/components/spForm';
 *   import { ... }                   from 'spfx-toolkit/lib/components/spFields';
 *   import { ... }                   from 'spfx-toolkit/lib/components/userAccess';
 *
 * See docs/Importing-Components.md for the authoritative import reference.
 */

// --- Lightweight components (safe to import from this barrel) ---
export * from './Card';
export * from './SPNotificationBar';
export * from './ConflictDetector';
export * from './DocumentLink';
export * from './ErrorBoundary';
export * from './GroupViewer';
export * from './UserPersona';
export * from './WorkflowStepper';

// Lazy-loaded versions of heavy components (for optimal bundle size)
// Note: Import from 'spfx-toolkit/lib/components/lazy' for tree-shaking
export * from './lazy';
