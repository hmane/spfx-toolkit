import { IconButton } from '@fluentui/react/lib/Button';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { getId } from '@fluentui/react/lib/Utilities';
import * as React from 'react';
import { memo, useCallback, useContext, useMemo } from 'react';
import { ActionButtonsProps, CardAction } from '../Card.types';
import { DEFAULT_ICONS } from '../utils/constants';
import { CardContext } from './Card';

/**
 * Updated Action Buttons component for header integration
 */
export const ActionButtons = memo<ActionButtonsProps>(
  ({
    actions = [],
    className = '',
    style,
    hideExpandButton = false,
    hideMaximizeButton = false,
    position = 'right',
    stackOnMobile = false,
    showTooltips = true,
  }) => {
    // Get card context
    const cardContext = useContext(CardContext);

    if (!cardContext) {
      console.warn('[SpfxCard] ActionButtons must be used within a Card component');
      return null;
    }

    const {
      allowExpand,
      allowMaximize,
      isExpanded,
      isMaximized,
      onToggleExpand,
      onToggleMaximize,
      onActionClick,
      disabled,
      accessibility = {},
      size,
    } = cardContext;

    // Button size based on card size
    const buttonConfig = useMemo(() => {
      switch (size) {
        case 'compact':
          return { size: 24, iconSize: 12, padding: '4px' };
        case 'large':
          return { size: 36, iconSize: 18, padding: '8px' };
        default:
          return { size: 32, iconSize: 16, padding: '6px' };
      }
    }, [size]);

    // Memoized class names
    const actionsClasses = useMemo(
      () =>
        [
          'spfx-card-actions',
          'spfx-header-integrated-actions', // New class for header integration
          `position-${position}`,
          stackOnMobile ? 'stack-mobile' : '',
          className,
        ]
          .filter(Boolean)
          .join(' '),
      [position, stackOnMobile, className]
    );

    // Handle action button click
    const handleActionClick = useCallback(
      (action: CardAction) => (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!action.disabled && !disabled) {
          onActionClick(action, event);
        }
      },
      [disabled, onActionClick]
    );

    // Handle expand/collapse button click
    const handleExpandClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!disabled) {
          onToggleExpand('user');
        }
      },
      [disabled, onToggleExpand]
    );

    // Handle maximize/restore button click
    const handleMaximizeClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!disabled) {
          onToggleMaximize('user');
        }
      },
      [disabled, onToggleMaximize]
    );

    // Render individual action button
    const renderActionButton = useCallback(
      (action: CardAction) => {
        const buttonId = getId('header-action-button');
        const isDisabled = action.disabled || disabled;

        // Improved button styles for header integration
        const buttonStyles = useMemo(
          () => ({
            root: {
              minWidth: 'auto',
              width: `${buttonConfig.size}px`,
              height: `${buttonConfig.size}px`,
              padding: buttonConfig.padding,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'inherit',
              borderRadius: '4px',
            },
            rootHovered: {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              transform: 'none', // Remove transform for cleaner look
              borderColor: 'rgba(255, 255, 255, 0.25)',
            },
            rootPressed: {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              transform: 'none',
            },
            rootDisabled: {
              opacity: 0.4,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
            icon: {
              fontSize: `${buttonConfig.iconSize}px`,
              color: 'inherit',
            },
          }),
          [action.variant, buttonConfig]
        );

        const buttonContent = (
          <IconButton
            key={action.id}
            id={buttonId}
            className={`spfx-header-action-btn ${action.variant || 'secondary'}`}
            onClick={handleActionClick(action)}
            disabled={isDisabled}
            iconProps={action.icon ? { iconName: action.icon } : undefined}
            ariaLabel={action.ariaLabel || action.label}
            styles={buttonStyles}
            allowDisabledFocus={false}
          />
        );

        // Wrap with tooltip if enabled and tooltip provided
        if (showTooltips && action.tooltip && !isDisabled) {
          if (typeof action.tooltip === 'string') {
            return (
              <TooltipHost key={action.id} content={action.tooltip} id={getId('header-tooltip')}>
                {buttonContent}
              </TooltipHost>
            );
          } else {
            return (
              <TooltipHost key={action.id} {...action.tooltip}>
                {buttonContent}
              </TooltipHost>
            );
          }
        }

        return buttonContent;
      },
      [disabled, handleActionClick, showTooltips, buttonConfig]
    );

    // Maximize/Restore button
    const maximizeButton = useMemo(() => {
      if (!allowMaximize || hideMaximizeButton) return null;

      const maximizeIcon = isMaximized ? DEFAULT_ICONS.RESTORE : DEFAULT_ICONS.MAXIMIZE;
      const maximizeLabel = isMaximized
        ? accessibility.restoreButtonLabel || 'Restore card'
        : accessibility.maximizeButtonLabel || 'Maximize card';

      const button = (
        <IconButton
          className='spfx-header-maximize-btn'
          iconProps={{ iconName: maximizeIcon }}
          title={maximizeLabel}
          ariaLabel={maximizeLabel}
          onClick={handleMaximizeClick}
          disabled={disabled}
          styles={{
            root: {
              width: `${buttonConfig.size}px`,
              height: `${buttonConfig.size}px`,
              padding: buttonConfig.padding,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'inherit',
              borderRadius: '4px',
            },
            rootHovered: {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
            },
            rootPressed: {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
            },
            icon: {
              fontSize: `${buttonConfig.iconSize}px`,
              color: 'inherit',
            },
          }}
        />
      );

      if (showTooltips) {
        return (
          <TooltipHost
            key='maximize-button'
            content={maximizeLabel}
            id={getId('header-maximize-tooltip')}
          >
            {button}
          </TooltipHost>
        );
      }

      return button;
    }, [
      allowMaximize,
      hideMaximizeButton,
      isMaximized,
      accessibility,
      handleMaximizeClick,
      disabled,
      showTooltips,
      buttonConfig,
    ]);

    // Expand/Collapse button
    const expandButton = useMemo(() => {
      if (!allowExpand || hideExpandButton) return null;

      const expandIcon = isExpanded ? DEFAULT_ICONS.COLLAPSE : DEFAULT_ICONS.EXPAND;
      const expandLabel = isExpanded
        ? accessibility.collapseButtonLabel || 'Collapse card'
        : accessibility.expandButtonLabel || 'Expand card';

      const button = (
        <IconButton
          className='spfx-header-expand-btn'
          iconProps={{ iconName: expandIcon }}
          title={expandLabel}
          ariaLabel={expandLabel}
          onClick={handleExpandClick}
          disabled={disabled}
          styles={{
            root: {
              width: `${buttonConfig.size}px`,
              height: `${buttonConfig.size}px`,
              padding: buttonConfig.padding,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'inherit',
              borderRadius: '4px',
            },
            rootHovered: {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
            },
            rootPressed: {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
            },
            icon: {
              fontSize: `${buttonConfig.iconSize}px`,
              color: 'inherit',
              transition: 'transform 0.2s ease', // Smooth rotation
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            },
          }}
        />
      );

      if (showTooltips) {
        return (
          <TooltipHost
            key='expand-button'
            content={expandLabel}
            id={getId('header-expand-tooltip')}
          >
            {button}
          </TooltipHost>
        );
      }

      return button;
    }, [
      allowExpand,
      hideExpandButton,
      isExpanded,
      accessibility,
      handleExpandClick,
      disabled,
      showTooltips,
      buttonConfig,
    ]);

    // Don't render if no actions and no expand/maximize buttons
    if (actions.length === 0 && !expandButton && !maximizeButton) {
      return null;
    }

    return (
      <div className={actionsClasses} style={style}>
        {/* Custom action buttons */}
        {actions.map(renderActionButton)}

        {/* Maximize button */}
        {maximizeButton}

        {/* Expand/Collapse button (last, most important) */}
        {expandButton}
      </div>
    );
  }
);

ActionButtons.displayName = 'HeaderActionButtons';

export default ActionButtons;
