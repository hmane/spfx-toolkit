import * as React from 'react';

export interface IFormItemProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  labelWidth?: string;
  labelPosition?: 'left' | 'top';
}

const FormItem: React.FC<IFormItemProps> = ({
  children,
  className = '',
  style,
  labelWidth,
  labelPosition = 'left',
}) => {
  const childrenArray = React.Children.toArray(children);

  let label: React.ReactNode = null;
  let value: React.ReactNode = null;

  childrenArray.forEach(child => {
    if (React.isValidElement(child)) {
      const childType = child.type as any;
      const isLabel = childType?.name === 'FormLabel' || childType?.displayName === 'FormLabel';
      const isValue = childType?.name === 'FormValue' || childType?.displayName === 'FormValue';

      if (isLabel) label = child;
      else if (isValue) value = child;
      else if (!label) label = child;
      else if (!value) value = child;
    }
  });

  const itemStyle: React.CSSProperties = {
    ...style,
    ...(labelWidth && ({ '--custom-label-width': labelWidth } as any)),
  };

  const itemClassName = `spfx-form-item ${labelWidth ? 'spfx-form-item-custom-label-width' : ''} ${
    labelPosition === 'top' ? 'spfx-form-item-label-top' : ''
  } ${!label ? 'spfx-form-item-no-label' : ''} ${className}`;

  if (!label) {
    return (
      <div className={itemClassName} style={itemStyle}>
        <div className='spfx-form-item-value-area'>{value}</div>
      </div>
    );
  }

  return (
    <div className={itemClassName} style={itemStyle}>
      {label && <div className='spfx-form-item-label-area'>{label}</div>}
      {value && <div className='spfx-form-item-value-area'>{value}</div>}
    </div>
  );
};

export default React.memo(FormItem);
