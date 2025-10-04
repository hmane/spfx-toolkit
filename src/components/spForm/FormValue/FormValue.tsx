import * as React from 'react';

export interface IFormValueProps {
  children: React.ReactNode;
  className?: string;
}

const FormValue: React.FC<IFormValueProps> = ({ children, className = '' }) => {
  const childrenArray = React.Children.toArray(children);

  const formControls: React.ReactNode[] = [];
  const descriptionAndError: React.ReactNode[] = [];

  childrenArray.forEach(child => {
    if (React.isValidElement(child)) {
      const childType = child.type as any;
      const isDescription =
        childType?.name === 'FormDescription' || childType?.displayName === 'FormDescription';
      const isError = childType?.name === 'FormError' || childType?.displayName === 'FormError';

      if (isDescription || isError) {
        descriptionAndError.push(child);
      } else {
        formControls.push(child);
      }
    } else {
      formControls.push(child);
    }
  });

  return (
    <div className={`spfx-form-value ${className}`}>
      <div className='spfx-form-value-control-container'>{formControls}</div>
      {descriptionAndError.length > 0 && (
        <div className='spfx-form-value-description-error-container'>{descriptionAndError}</div>
      )}
    </div>
  );
};

export default React.memo(FormValue);
