import { StepData, StepStatus, StepperMode } from './types';

/**
 * Finds the first step with 'current' status, or the last completed step if none are current
 */
export const findAutoSelectStep = (steps: StepData[]): StepData | null => {
  if (!steps || steps.length === 0) return null;

  // First, look for a step with 'current' status
  const currentStep = steps.find(step => step.status === 'current');
  if (currentStep) return currentStep;

  // If no current step, find the last completed step
  let lastCompletedStep: StepData | null = null;
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
 * Enhanced logic: pending, blocked steps are generally not clickable unless explicitly set
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
      return false; // Not clickable by default (pending tasks logic)
    default:
      return true;
  }
};

/**
 * Gets the step by ID from the steps array
 */
export const getStepById = (steps: StepData[], stepId: string): StepData | null => {
  return steps.find(step => step.id === stepId) || null;
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
 * Gets the step index (0-based) for a given step ID
 */
export const getStepIndex = (steps: StepData[], stepId: string): number => {
  return steps.findIndex(step => step.id === stepId);
};

/**
 * Gets the next clickable step ID for keyboard navigation
 */
export const getNextClickableStepId = (
  steps: StepData[],
  currentStepId: string,
  mode: StepperMode
): string | null => {
  const currentIndex = steps.findIndex(step => step.id === currentStepId);
  if (currentIndex === -1) return null;

  for (let i = currentIndex + 1; i < steps.length; i++) {
    const step = steps[i];
    if (isStepClickable(step, mode)) {
      return step.id;
    }
  }

  return null;
};

/**
 * Gets the previous clickable step ID for keyboard navigation
 */
export const getPrevClickableStepId = (
  steps: StepData[],
  currentStepId: string,
  mode: StepperMode
): string | null => {
  const currentIndex = steps.findIndex(step => step.id === currentStepId);
  if (currentIndex === -1) return null;

  for (let i = currentIndex - 1; i >= 0; i--) {
    const step = steps[i];
    if (isStepClickable(step, mode)) {
      return step.id;
    }
  }

  return null;
};

/**
 * Gets the first clickable step ID
 */
export const getFirstClickableStepId = (steps: StepData[], mode: StepperMode): string | null => {
  const clickableStep = steps.find(step => isStepClickable(step, mode));
  return clickableStep ? clickableStep.id : null;
};

/**
 * Gets the last clickable step ID
 */
export const getLastClickableStepId = (steps: StepData[], mode: StepperMode): string | null => {
  const clickableSteps = steps.filter(step => isStepClickable(step, mode));
  return clickableSteps.length > 0 ? clickableSteps[clickableSteps.length - 1].id : null;
};

/**
 * Calculates the completion percentage of the workflow
 */
export const calculateCompletionPercentage = (steps: StepData[]): number => {
  if (!steps || steps.length === 0) return 0;

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  return Math.round((completedSteps / steps.length) * 100);
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

/**
 * Gets step statistics for analytics
 */
export const getStepStatistics = (steps: StepData[]) => {
  const stats = {
    total: steps.length,
    completed: 0,
    current: 0,
    pending: 0,
    warning: 0,
    error: 0,
    blocked: 0,
    completionPercentage: 0,
    currentStepIndex: -1,
    clickableSteps: 0,
  };

  steps.forEach((step, index) => {
    stats[step.status]++;
    if (step.status === 'current') {
      stats.currentStepIndex = index;
    }
  });

  stats.completionPercentage = calculateCompletionPercentage(steps);
  stats.clickableSteps = steps.filter(
    step =>
      step.status === 'completed' ||
      step.status === 'current' ||
      step.status === 'warning' ||
      step.status === 'error'
  ).length;

  return stats;
};

/**
 * Determines if a status represents an actionable state
 */
export const isActionableStatus = (status: StepStatus): boolean => {
  return ['current', 'warning', 'error'].includes(status);
};

/**
 * Determines if a status represents a completed state
 */
export const isCompletedStatus = (status: StepStatus): boolean => {
  return status === 'completed';
};

/**
 * Determines if a status represents a blocked/unavailable state
 */
export const isBlockedStatus = (status: StepStatus): boolean => {
  return ['pending', 'blocked'].includes(status);
};

/**
 * Gets appropriate cursor style for a step based on clickability
 */
export const getStepCursor = (step: StepData, mode: StepperMode): string => {
  return isStepClickable(step, mode) ? 'pointer' : 'not-allowed';
};

/**
 * Truncates text to a specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Debounce function for performance optimization
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => func(...args), wait);
  };
};

/**
 * Validates step data completeness
 */
export const validateStepData = (steps: StepData[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!steps || steps.length === 0) {
    errors.push('Steps array is empty or undefined');
    return { isValid: false, errors };
  }

  // Check for unique IDs
  if (!validateStepIds(steps)) {
    errors.push('Duplicate step IDs found');
  }

  // Check for required fields
  steps.forEach((step, index) => {
    if (!step.id) {
      errors.push(`Step at index ${index} is missing required 'id' field`);
    }
    if (!step.title) {
      errors.push(`Step at index ${index} is missing required 'title' field`);
    }
    if (!step.status) {
      errors.push(`Step at index ${index} is missing required 'status' field`);
    }
  });

  return { isValid: errors.length === 0, errors };
};
