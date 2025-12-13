// Main component exports
export { CardStepItem } from './CardStepItem';
export { ContentArea } from './ContentArea';
export { MinimalStepItem } from './MinimalStepItem';
export { StepItem } from './StepItem';
export { TimelineStepItem } from './TimelineStepItem';
export { WorkflowStepper } from './WorkflowStepper';

// Type exports
export type {
  ContentAreaProps,
  StepColors,
  StepData,
  StepDescriptionStyles,
  StepperMode,
  StepperStyleProps,
  StepperVariant,
  StepStatus,
  WorkflowStepperProps,
} from './types';

// Utility exports (simplified)
export {
  findAutoSelectStep,
  getFirstClickableStepId,
  getLastClickableStepId,
  getNextClickableStepId,
  getPrevClickableStepId,
  getStatusDescription,
  getStatusLabel,
  getStepById,
  isStepClickable,
  validateStepIds,
} from './utils';

// Style exports
export {
  getCardsStyles,
  getMinimalStyles,
  getStepColors,
  getStepItemStyles,
  getStepperStyles,
  getTimelineStyles,
  getVariantStatusColor,
  getVariantStatusGradient,
  SAAS_GRADIENTS,
  SAAS_SHADOWS,
  SAAS_TRANSITIONS,
} from './WorkflowStepper.styles';
