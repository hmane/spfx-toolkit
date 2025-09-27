import * as React from 'react';

export type StepStatus = 'completed' | 'current' | 'pending' | 'warning' | 'error' | 'blocked';

export type StepperMode = 'fullSteps' | 'progress' | 'compact';

export interface StepData {
  id: string;
  title: string;
  description1?: string;
  description2?: string;
  status: StepStatus;
  content?: React.ReactNode; // Each step can have its own content
  isClickable?: boolean;
}

export interface StepDescriptionStyles {
  description1?: React.CSSProperties;
  description2?: React.CSSProperties;
}

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

export interface StepperStyleProps {
  fullWidth: boolean;
  stepCount: number;
  minStepWidth?: number;
  mode: StepperMode;
}
