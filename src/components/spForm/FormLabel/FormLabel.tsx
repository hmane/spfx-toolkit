import { DirectionalHint } from '@fluentui/react';
import { Icon } from '@fluentui/react/lib/Icon';
import { ITooltipHostStyles, TooltipHost } from '@fluentui/react/lib/Tooltip';
import { getId } from '@fluentui/react/lib/Utilities';
import * as React from 'react';

export interface IFormLabelProps {
  children: React.ReactNode;
  isRequired?: boolean;
  infoText?: string;
  infoContent?: React.ReactNode;
  infoPosition?: DirectionalHint;
  className?: string;
}

const FormLabel: React.FC<IFormLabelProps> = ({
  children,
  isRequired = false,
  infoText,
  infoContent,
  infoPosition = DirectionalHint.rightCenter,
  className = '',
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

  return (
    <div className={`spfx-form-label ${className}`}>
      <div className='spfx-form-label-text'>
        <span className='spfx-form-label-content'>{children}</span>
        <span className='spfx-form-label-suffix'>
          {isRequired && <span className='spfx-form-label-required'>*</span>}
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
    </div>
  );
};

export default React.memo(FormLabel);
