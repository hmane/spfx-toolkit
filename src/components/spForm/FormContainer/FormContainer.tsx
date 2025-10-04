import * as React from 'react';

export interface IFormContainerProps {
  children: React.ReactNode;
  labelWidth?: string;
  className?: string;
  style?: React.CSSProperties;
}

const FormContainer: React.FC<IFormContainerProps> = ({
  children,
  labelWidth,
  className = '',
  style,
}) => {
  const containerStyle: React.CSSProperties = {
    ...style,
    ...(labelWidth && ({ '--default-label-width': labelWidth } as any)),
  };

  return (
    <div className={`spfx-form-container ${className}`} style={containerStyle}>
      {children}
    </div>
  );
};

export default React.memo(FormContainer);
