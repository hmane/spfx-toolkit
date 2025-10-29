import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';

export interface IFormErrorProps {
  error?: string | string[];
  showIcon?: boolean;
  className?: string;

  /**
   * HTML id attribute - used for aria-describedby
   * @optional
   */
  id?: string;
}

const FormError: React.FC<IFormErrorProps> = ({
  error,
  showIcon = false,
  className = '',
  id,
}) => {
  if (!error) {
    return null;
  }

  const errors = Array.isArray(error) ? error : [error];
  const hasMultipleErrors = errors.length > 1;

  return (
    <div className={`spfx-form-error ${className}`} id={id} role='alert' aria-live='polite'>
      {hasMultipleErrors ? (
        <ul className='spfx-form-error-list'>
          {errors.map((err, index) => (
            <li key={index} className='spfx-form-error-item'>
              {showIcon && <Icon iconName='ErrorBadge' className='spfx-form-error-icon' />}
              <span className='spfx-form-error-text'>{err}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className='spfx-form-error-item'>
          {showIcon && <Icon iconName='ErrorBadge' className='spfx-form-error-icon' />}
          <span className='spfx-form-error-text'>{errors[0]}</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(FormError);
