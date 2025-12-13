import { StepData, StepStatus, StepperMode } from './types';

/**
 * Finds the first step with 'current' status, or the last completed step if none are current
 */
export const findAutoSelectStep = (steps: StepData[]): StepData | undefined => {
  if (!steps || steps.length === 0) return undefined;

  // First, look for a step with 'current' status
  const currentStep = steps.find(step => step.status === 'current');
  if (currentStep) return currentStep;

  // If no current step, find the last completed step
  let lastCompletedStep: StepData | undefined = undefined;
  for (const step of steps) {
    if (step.status === 'completed') {
      lastCompletedStep = step;
    }
  }

  // If we have a last completed step, return it
  if (lastCompletedStep) return lastCompletedStep;

  // If no completed steps, return the first step
  return steps[0];
};

/**
 * Determines if a step should be clickable based on mode and status
 */
export const isStepClickable = (step: StepData, mode: StepperMode): boolean => {
  // Custom clickability override always takes precedence
  if (step.isClickable !== undefined) {
    return step.isClickable;
  }

  // In progress and compact mode, only allow clicking on completed and current steps
  if (mode === 'progress' || mode === 'compact') {
    return step.status === 'completed' || step.status === 'current';
  }

  // In fullSteps mode, enhanced clickability logic
  switch (step.status) {
    case 'completed':
    case 'current':
      return true; // Always clickable
    case 'warning':
    case 'error':
      return true; // Clickable to view error details
    case 'pending':
    case 'blocked':
      return false; // Not clickable by default
    default:
      return true;
  }
};

/**
 * Gets the step by ID from the steps array
 */
export const getStepById = (steps: StepData[], stepId: string): StepData | undefined => {
  return steps.find(step => step.id === stepId);
};

/**
 * Validates that step IDs are unique
 */
export const validateStepIds = (steps: StepData[]): boolean => {
  const ids = steps.map(step => step.id);
  const uniqueIds = new Set(ids);
  return ids.length === uniqueIds.size;
};

/**
 * Gets the next clickable step ID for keyboard navigation
 */
export const getNextClickableStepId = (
  steps: StepData[],
  currentStepId: string,
  mode: StepperMode
): string | undefined => {
  const currentIndex = steps.findIndex(step => step.id === currentStepId);
  if (currentIndex === -1) return undefined;

  for (let i = currentIndex + 1; i < steps.length; i++) {
    const step = steps[i];
    if (isStepClickable(step, mode)) {
      return step.id;
    }
  }

  return undefined;
};

/**
 * Gets the previous clickable step ID for keyboard navigation
 */
export const getPrevClickableStepId = (
  steps: StepData[],
  currentStepId: string,
  mode: StepperMode
): string | undefined => {
  const currentIndex = steps.findIndex(step => step.id === currentStepId);
  if (currentIndex === -1) return undefined;

  for (let i = currentIndex - 1; i >= 0; i--) {
    const step = steps[i];
    if (isStepClickable(step, mode)) {
      return step.id;
    }
  }

  return undefined;
};

/**
 * Gets the first clickable step ID
 */
export const getFirstClickableStepId = (steps: StepData[], mode: StepperMode): string | undefined => {
  const clickableStep = steps.find(step => isStepClickable(step, mode));
  return clickableStep?.id;
};

/**
 * Gets the last clickable step ID
 */
export const getLastClickableStepId = (steps: StepData[], mode: StepperMode): string | undefined => {
  const clickableSteps = steps.filter(step => isStepClickable(step, mode));
  return clickableSteps.length > 0 ? clickableSteps[clickableSteps.length - 1].id : undefined;
};

/**
 * Gets a human-readable status description
 */
export const getStatusDescription = (status: StepStatus): string => {
  const statusMap: Record<StepStatus, string> = {
    completed: 'This step has been completed successfully',
    current: 'This step is currently in progress',
    pending: 'This step is waiting to be started and is not yet available',
    warning: 'This step requires attention before proceeding',
    error: 'This step has encountered an error that needs to be resolved',
    blocked: 'This step is blocked and cannot proceed until dependencies are resolved',
  };

  return statusMap[status] || 'Unknown status';
};

/**
 * Gets a human-readable status label
 */
export const getStatusLabel = (status: StepStatus): string => {
  const statusMap: Record<StepStatus, string> = {
    completed: 'Completed',
    current: 'In Progress',
    pending: 'Pending',
    warning: 'Needs Attention',
    error: 'Error',
    blocked: 'Blocked',
  };

  return statusMap[status] || 'Unknown';
};
