import { Icon } from '@fluentui/react/lib/Icon';
import { ITooltipHostStyles, TooltipHost } from '@fluentui/react/lib/Tooltip';
import { getId } from '@fluentui/react/lib/Utilities';
import * as React from 'react';
import { DirectionalHint } from '../../../types/fluentui-types';

export interface IFormLabelProps {
  children: React.ReactNode;
  isRequired?: boolean;
  infoText?: string;
  infoContent?: React.ReactNode;
  infoPosition?: DirectionalHint;
  className?: string;

  /**
   * HTML for attribute - connects label to input field
   * Automatically set by FormItem if fieldName is provided
   * @optional
   */
  htmlFor?: string;
}

const FormLabel: React.FC<IFormLabelProps> = ({
  children,
  isRequired = false,
  infoText,
  infoContent,
  infoPosition = DirectionalHint.rightCenter,
  className = '',
  htmlFor,
}) => {
  const tooltipId = getId('tooltip');
  const hasInfo = !!(infoText || infoContent);

  const infoDisplayContent: string | JSX.Element = React.useMemo(() => {
    if (infoContent) {
      return typeof infoContent === 'string' ? infoContent : (infoContent as JSX.Element);
    }
    return infoText || '';
  }, [infoContent, infoText]);

  const tooltipStyles: Partial<ITooltipHostStyles> = {
    root: { display: 'inline-block' },
  };

  const LabelWrapper = htmlFor ? 'label' : 'div';
  const labelProps = htmlFor ? { htmlFor } : {};

  return (
    <LabelWrapper className={`spfx-form-label ${className}`} {...labelProps}>
      <div className='spfx-form-label-text'>
        <span className='spfx-form-label-content'>{children}</span>
        <span className='spfx-form-label-suffix'>
          {isRequired && (
            <span className='spfx-form-label-required' aria-label='required'>
              *
            </span>
          )}
          {hasInfo && (
            <TooltipHost
              content={infoDisplayContent}
              id={tooltipId}
              directionalHint={infoPosition}
              styles={tooltipStyles}
              delay={0}
            >
              <Icon
                iconName='Info'
                className='spfx-form-label-info-icon'
                aria-describedby={tooltipId}
              />
            </TooltipHost>
          )}
        </span>
      </div>
    </LabelWrapper>
  );
};

export default React.memo(FormLabel);
