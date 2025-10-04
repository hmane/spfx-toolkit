import * as React from 'react';

export interface IFormDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

const FormDescription: React.FC<IFormDescriptionProps> = ({ children, className = '' }) => {
  return <div className={`spfx-form-description ${className}`}>{children}</div>;
};

export default React.memo(FormDescription);
