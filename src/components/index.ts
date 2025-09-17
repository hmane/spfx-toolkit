// ========================================
// MAIN COMPONENT EXPORTS - Tree-shakable
// ========================================

// Individual component exports for better tree-shaking
export { Card, CardContext, SafeCard, useCardContext } from './Card';
export { ConflictDetector } from './ConflictDetector';
export { GroupViewer } from './GroupViewer';
export { ManageAccessComponent, ManageAccessPanel } from './ManageAccess';
export { WorkflowStepper } from './WorkflowStepper';

// Import for namespace usage
import { Card, SafeCard } from './Card';
import { ConflictDetector } from './ConflictDetector';
import { GroupViewer } from './GroupViewer';
import { ManageAccessComponent, ManageAccessPanel } from './ManageAccess';
import { WorkflowStepper } from './WorkflowStepper';

// ========================================
// GROUPED EXPORTS - For convenience
// ========================================

// Card-related exports
export {
  Accordion,
  ActionButtons,
  BadgeHeader,
  // Services
  cardController,
  // Loading components
  CardLoading,
  Content,
  CustomMaximizedView,
  Footer,
  // Core components
  Header,
  IconHeader,
  MaximizedView,
  ShimmerLoading,
  SimpleHeader,
  SkeletonLoading,
  SpinnerLoading,
  StorageService,
  SubtitleHeader,
  // Hooks
  useCardController,
  useMaximize,
  usePersistence
} from './Card';

export * from './ErrorBoundary';
export * from './spForm';

// Conflict detection exports
export {
  ConflictDetectionProvider,
  ConflictNotificationBar,
  ConflictResolutionDialog,
  useConflictContext,
  useConflictDetection
} from './ConflictDetector';

// Workflow stepper exports
export {
  ContentArea,
  // Utilities
  getStepStatistics,
  isStepClickable,
  StepItem,
  validateStepData
} from './WorkflowStepper';

// GroupViewer exports
export { GroupViewerDefaultSettings } from './GroupViewer';

// ManageAccess exports
export { DefaultProps as ManageAccessDefaults, PermissionLevelOptions } from './ManageAccess';

// ========================================
// TYPE EXPORTS - Individual for tree-shaking
// ========================================

// Card types
export type {
  AnimationConfig,
  CardAction,
  CardProps,
  CardSize,
  CardState,
  ContentProps,
  HeaderProps,
  LoadingType
} from './Card';

// Conflict detector types
export type {
  ConflictDetectionOptions,
  ConflictInfo,
  ConflictSeverity,
  UseConflictDetectionReturn
} from './ConflictDetector';

// Workflow stepper types
export type { StepData, StepperMode, StepStatus, WorkflowStepperProps } from './WorkflowStepper';

// GroupViewer types
export type { IGroupInfo, IGroupMember, IGroupViewerProps } from './GroupViewer';

// ManageAccess types
export type {
  IActivityFeedItem,
  IManageAccessComponentProps,
  IManageAccessComponentState,
  IPermissionLevelOption,
  IPermissionPrincipal,
  ISPMember,
  ISPRoleAssignment,
  ISPRoleDefinition
} from './ManageAccess';

// SPFx Context types (avoiding naming conflicts)
export type { SPFxContext as GroupViewerContext } from './GroupViewer/types';
export type { SPFxContext as ManageAccessContext } from './ManageAccess/types';

// ========================================
// UTILITY NAMESPACES - Optional organized imports
// ========================================

// Card utilities namespace
export * as CardUtils from './Card/utils';
export * as CardConstants from './Card/utils/constants';

// Conflict detection utilities
export { ConflictDetectionUtils } from './ConflictDetector';

// Workflow utilities
export * as WorkflowUtils from './WorkflowStepper/utils';

// ========================================
// COMPONENT COLLECTION NAMESPACES
// ========================================

// Permission-related components namespace
export const PermissionComponents = {
  GroupViewer,
  ManageAccessComponent,
  ManageAccessPanel,
} as const;

// Display components namespace
export const DisplayComponents = {
  Card,
  SafeCard,
  GroupViewer,
} as const;

// Management components namespace
export const ManagementComponents = {
  ManageAccessComponent,
  ManageAccessPanel,
  ConflictDetector,
  WorkflowStepper,
} as const;

// ========================================
// LEGACY SUPPORT - Bulk exports
// ========================================

// For backward compatibility - but consumers should prefer individual imports
/** @deprecated Use individual imports for better tree-shaking */
export * from './Card';
/** @deprecated Use individual imports for better tree-shaking */
export * from './ConflictDetector';
/** @deprecated Use individual imports for better tree-shaking */
export * from './WorkflowStepper';
/** @deprecated Use individual imports for better tree-shaking */
export * from './GroupViewer';
/** @deprecated Use individual imports for better tree-shaking */
export * from './ManageAccess';
