import * as React from 'react';
import { useMemo } from 'react';
import { useTheme } from '@fluentui/react';
import { ContentAreaProps } from './types';
import { getStepperStyles } from './WorkflowStepper.styles';

export const ContentArea: React.FC<ContentAreaProps> = ({ selectedStep, isVisible }) => {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      getStepperStyles(theme, {
        fullWidth: false,
        stepCount: 0,
        mode: 'fullSteps',
      }),
    [theme]
  );

  if (!isVisible || !selectedStep) {
    return null;
  }

  const renderContent = () => {
    // If no content provided, return null (show nothing)
    if (!selectedStep.content) {
      return null;
    }

    // Handle React node content
    if (React.isValidElement(selectedStep.content)) {
      return selectedStep.content;
    }

    // Handle string content
    if (typeof selectedStep.content === 'string') {
      return <div dangerouslySetInnerHTML={{ __html: selectedStep.content }} />;
    }

    // Fallback for other content types
    return String(selectedStep.content);
  };

  return (
    <div
      className={styles.contentArea}
      role='region'
      aria-label={`Content for ${selectedStep.title}`}
      aria-live='polite'
      data-testid={`content-area-${selectedStep.id}`}
    >
      {/* Only show the step's content, nothing else */}
      {renderContent()}
    </div>
  );
};

export default ContentArea;
