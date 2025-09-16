// ========================================
// MAIN COMPONENT EXPORTS - Tree-shakable
// ========================================

// Individual component exports for better tree-shaking
export { Card, CardContext, SafeCard, useCardContext } from './Card';
export { ConflictDetector } from './ConflictDetector';
export { WorkflowStepper } from './WorkflowStepper';

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
// LEGACY SUPPORT - Bulk exports
// ========================================

// For backward compatibility - but consumers should prefer individual imports
/** @deprecated Use individual imports for better tree-shaking */
export * from './Card';
/** @deprecated Use individual imports for better tree-shaking */
export * from './ConflictDetector';
/** @deprecated Use individual imports for better tree-shaking */
export * from './WorkflowStepper';
