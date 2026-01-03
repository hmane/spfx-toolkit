import * as React from 'react';

export interface IFormDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

const FormDescription: React.FC<IFormDescriptionProps> = ({ children, className = '' }) => {
  return <div className={`spfx-form-description ${className}`}>{children}</div>;
};

// Set displayName for FormValue detection (important for minified builds)
// Must be set on the memoized component, not just the original
const MemoizedFormDescription = React.memo(FormDescription);
MemoizedFormDescription.displayName = 'FormDescription';

export default MemoizedFormDescription;
