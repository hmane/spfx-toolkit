import * as React from 'react';
import { Control } from 'react-hook-form';
import { FormProvider } from '../context';

export interface IFormContainerProps {
  children: React.ReactNode;
  labelWidth?: string;
  className?: string;
  style?: React.CSSProperties;

  /**
   * React Hook Form control - enables FormContext features
   * @optional
   */
  control?: Control<any>;

  /**
   * Auto-show errors for all child FormItems
   * Requires control prop
   * @default false
   */
  autoShowErrors?: boolean;
}

const FormContainer: React.FC<IFormContainerProps> = ({
  children,
  labelWidth,
  className = '',
  style,
  control,
  autoShowErrors = false,
}) => {
  const containerStyle: React.CSSProperties = {
    ...style,
    ...(labelWidth && ({ '--default-label-width': labelWidth } as any)),
  };

  const content = (
    <div className={`spfx-form-container ${className}`} style={containerStyle}>
      {children}
    </div>
  );

  // If control provided, wrap with FormProvider
  if (control) {
    return (
      <FormProvider control={control} autoShowErrors={autoShowErrors}>
        {content}
      </FormProvider>
    );
  }

  // Otherwise render without context
  return content;
};

export default React.memo(FormContainer);
