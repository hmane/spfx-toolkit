// Main component exports
export { ContentArea } from './ContentArea';
export { StepItem } from './StepItem';
export { WorkflowStepper } from './WorkflowStepper';

// Type exports
export type {
  ContentAreaProps,
  StepColors,
  StepData,
  StepDescriptionStyles,
  StepperMode,
  StepperStyleProps,
  StepStatus,
  WorkflowStepperProps
} from './types';

// Utility exports
export {
  calculateCompletionPercentage,
  debounce,
  findAutoSelectStep,
  getFirstClickableStepId,
  getLastClickableStepId,
  getNextClickableStepId,
  getPrevClickableStepId,
  getStatusDescription,
  getStatusLabel,
  getStepById,
  getStepCursor,
  getStepIndex,
  getStepStatistics,
  isActionableStatus,
  isBlockedStatus,
  isCompletedStatus,
  isStepClickable,
  truncateText,
  validateStepData,
  validateStepIds
} from './utils';

// Style exports
export { getStepColors, getStepItemStyles, getStepperStyles } from './WorkflowStepper.styles';
