import * as React from 'react';

export type StepStatus = 'completed' | 'current' | 'pending' | 'warning' | 'error' | 'blocked';

export type StepperMode = 'fullSteps' | 'progress' | 'compact';

export interface StepData {
  id: string;
  title: string;
  description1?: string;
  description2?: string;
  status: StepStatus;
  content?: string | React.ReactNode;
  isClickable?: boolean;
}

export interface StepDescriptionStyles {
  description1?: React.CSSProperties;
  description2?: React.CSSProperties;
}

// UPDATED: Removed fullWidth prop - no longer needed with wrapper approach
export interface WorkflowStepperProps {
  steps: StepData[];
  mode?: StepperMode;
  selectedStepId?: string;
  onStepClick?: (step: StepData) => void;
  minStepWidth?: number;
  descriptionStyles?: StepDescriptionStyles;
  className?: string;
  showScrollHint?: boolean;
}

export interface ContentAreaProps {
  selectedStep: StepData | null;
  isVisible: boolean;
}

export interface StepColors {
  background: string;
  selectedBackground: string;
  text: string;
  selectedText: string;
  border: string;
  selectedBorder: string;
}

// UPDATED: Removed fullWidth from style props
export interface StepperStyleProps {
  fullWidth: boolean; // Keep for internal use but not exposed in main props
  stepCount: number;
  minStepWidth?: number;
  mode: StepperMode;
}
