import * as React from 'react';
import { memo, useCallback, useContext, useMemo, useRef, useEffect } from 'react';
import { HeaderProps, CardAction } from '../Card.types';
import { HeaderLoadingShimmer } from './LoadingStates';
import { CardContext } from './Card';
import { IconButton } from '@fluentui/react/lib/Button';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { getId } from '@fluentui/react/lib/Utilities';
import { DEFAULT_ICONS } from '../utils/constants';

export interface EnhancedHeaderProps extends HeaderProps {
  actions?: CardAction[];
  hideExpandButton?: boolean;
  hideMaximizeButton?: boolean;
  showTooltips?: boolean;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  allowWrap?: boolean;
  showTooltipOnOverflow?: boolean;
}

export const Header = memo<EnhancedHeaderProps>(
  ({
    children,
    className = '',
    style,
    clickable = true,
    showLoadingShimmer = true,
    size,
    actions = [],
    hideExpandButton = false,
    hideMaximizeButton = false,
    showTooltips = true,
    variant,
    allowWrap = false,
    showTooltipOnOverflow = true,
  }) => {
    const cardContext = useContext(CardContext);
    const headerRef = useRef<HTMLDivElement>(null);
    const headerContentRef = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = React.useState(false);
    const [isKeyboardFocus, setIsKeyboardFocus] = React.useState(false);

    if (!cardContext) {
      console.warn('[SpfxCard] Header must be used within a Card component');
      return null;
    }

    const {
      variant: contextVariant,
      customHeaderColor,
      allowExpand,
      allowMaximize,
      disabled,
      loading,
      onToggleExpand,
      onToggleMaximize,
      onActionClick,
      isExpanded,
      isMaximized,
      id,
      headerSize,
      accessibility = {},
    } = cardContext;

    const effectiveSize = size || headerSize;
    const effectiveVariant = variant || contextVariant;

    // FIXED: Check for text overflow
    useEffect(() => {
      if (headerContentRef.current && showTooltipOnOverflow) {
        const element = headerContentRef.current;
        const checkOverflow = () => {
          setIsOverflowing(element.scrollWidth > element.clientWidth);
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
      }
    }, [showTooltipOnOverflow, children]);

    // COMPLETE FIX: Track keyboard vs mouse interaction
    useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          setIsKeyboardFocus(true);
        }
      };

      const handleGlobalMouseDown = () => {
        setIsKeyboardFocus(false);
      };

      document.addEventListener('keydown', handleGlobalKeyDown);
      document.addEventListener('mousedown', handleGlobalMouseDown);

      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown);
        document.removeEventListener('mousedown', handleGlobalMouseDown);
      };
    }, []);

    const sizeConfig = useMemo(() => {
      switch (effectiveSize) {
        case 'compact':
          return {
            padding: '6px 12px',
            minHeight: '32px',
            fontSize: '13px',
            buttonSize: 24,
            iconSize: 12,
          };
        case 'large':
          return {
            padding: '20px 24px',
            minHeight: '64px',
            fontSize: '18px',
            buttonSize: 36,
            iconSize: 18,
          };
        default:
          return {
            padding: '12px 16px',
            minHeight: '48px',
            fontSize: '16px',
            buttonSize: 32,
            iconSize: 16,
          };
      }
    }, [effectiveSize]);

    const headerStyle = useMemo(
      () => ({
        padding: sizeConfig.padding,
        fontSize: sizeConfig.fontSize,
        minHeight: sizeConfig.minHeight,
        ...(customHeaderColor ? { background: customHeaderColor } : {}),
        ...style,
      }),
      [sizeConfig, customHeaderColor, style]
    );

    const headerClasses = useMemo(
      () =>
        [
          'spfx-card-header-fixed',
          effectiveVariant || 'default',
          `size-${effectiveSize}`,
          clickable && allowExpand && !disabled && !isMaximized ? 'clickable' : '',
          loading ? 'loading' : '',
          isKeyboardFocus ? 'keyboard-focus' : 'mouse-focus', // FIXED: Add focus method class
          className,
        ]
          .filter(Boolean)
          .join(' '),
      [
        effectiveVariant,
        effectiveSize,
        clickable,
        allowExpand,
        disabled,
        loading,
        isKeyboardFocus, // FIXED: Include in dependencies
        className,
        isMaximized,
      ]
    );

    // COMPLETE FIX: Header click handler
    const handleHeaderClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        // Don't trigger if clicking on buttons
        if ((event.target as HTMLElement).closest('.spfx-header-buttons')) {
          return;
        }

        if (clickable && allowExpand && !disabled && !loading && !isMaximized) {
          // COMPLETE FIX: Prevent any focus on mouse click
          event.preventDefault();
          event.stopPropagation();

          // Remove focus immediately
          if (headerRef.current) {
            headerRef.current.blur();
          }

          onToggleExpand('user');

          // Additional cleanup - remove focus after state change
          setTimeout(() => {
            if (headerRef.current) {
              headerRef.current.blur();
              // Remove any lingering focus
              if (document.activeElement === headerRef.current) {
                (document.activeElement as HTMLElement).blur();
              }
            }
          }, 0);
        }
      },
      [clickable, allowExpand, disabled, loading, onToggleExpand, isMaximized]
    );

    // FIXED: Only show focus for keyboard navigation
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (clickable && allowExpand && !disabled && !loading && !isMaximized) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsKeyboardFocus(true); // Ensure keyboard focus is set
            onToggleExpand('user');
          }
        }
      },
      [clickable, allowExpand, disabled, loading, onToggleExpand, isMaximized]
    );

    // COMPLETE FIX: Focus and blur handlers
    const handleFocus = useCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        // Only allow focus ring for keyboard navigation
        if (!isKeyboardFocus) {
          event.currentTarget.blur();
        }
      },
      [isKeyboardFocus]
    );

    const handleBlur = useCallback(() => {
      // Clear keyboard focus state when blurring
      setIsKeyboardFocus(false);
    }, []);

    // Rest of the component logic remains the same...
    const handleActionClick = useCallback(
      (action: CardAction) => (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!action.disabled && !disabled) {
          onActionClick(action, event);
        }
      },
      [disabled, onActionClick]
    );

    const handleExpandClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!disabled && !isMaximized) {
          onToggleExpand('user');
        }
      },
      [disabled, onToggleExpand, isMaximized]
    );

    const handleMaximizeClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!disabled) {
          onToggleMaximize('user');
        }
      },
      [disabled, onToggleMaximize]
    );

    const buttonStyles = useMemo(
      () => ({
        root: {
          width: `${sizeConfig.buttonSize}px`,
          height: `${sizeConfig.buttonSize}px`,
          minWidth: `${sizeConfig.buttonSize}px`,
          padding: '0',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: 'inherit',
          borderRadius: '4px',
          marginLeft: '4px',
        },
        rootHovered: {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderColor: 'rgba(255, 255, 255, 0.3)',
        },
        rootPressed: {
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
        },
        icon: {
          fontSize: `${sizeConfig.iconSize}px`,
          color: 'inherit',
        },
      }),
      [sizeConfig]
    );

    const renderActionButtons = useMemo(() => {
      if (actions.length === 0) return null;

      return actions.map(action => {
        const button = (
          <IconButton
            key={action.id}
            className='spfx-header-action-btn'
            iconProps={action.icon ? { iconName: action.icon } : undefined}
            onClick={handleActionClick(action)}
            disabled={action.disabled || disabled}
            ariaLabel={action.ariaLabel || action.label}
            styles={buttonStyles}
          />
        );

        if (showTooltips && action.tooltip) {
          return (
            <TooltipHost key={action.id} content={action.tooltip as string} id={getId()}>
              {button}
            </TooltipHost>
          );
        }

        return button;
      });
    }, [actions, handleActionClick, disabled, showTooltips, buttonStyles]);

    const renderMaximizeButton = useMemo(() => {
      if (!allowMaximize || hideMaximizeButton || isMaximized) return null;

      const maximizeIcon = DEFAULT_ICONS.MAXIMIZE;
      const maximizeLabel = accessibility.maximizeButtonLabel || 'Maximize';

      const button = (
        <IconButton
          className='spfx-header-maximize-btn'
          iconProps={{ iconName: maximizeIcon }}
          onClick={handleMaximizeClick}
          disabled={disabled}
          ariaLabel={maximizeLabel}
          styles={buttonStyles}
        />
      );

      if (showTooltips) {
        return (
          <TooltipHost content={maximizeLabel} id={getId()}>
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
      buttonStyles,
    ]);

    const renderExpandButton = useMemo(() => {
      if (!allowExpand || hideExpandButton || isMaximized) return null;

      const expandIcon = isExpanded ? DEFAULT_ICONS.COLLAPSE : DEFAULT_ICONS.EXPAND;
      const expandLabel = isExpanded
        ? accessibility.collapseButtonLabel || 'Collapse'
        : accessibility.expandButtonLabel || 'Expand';

      const expandButtonStyles = {
        ...buttonStyles,
        icon: {
          ...buttonStyles.icon,
          transition: 'transform 0.2s ease',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        },
      };

      const button = (
        <IconButton
          className='spfx-header-expand-btn'
          iconProps={{ iconName: expandIcon }}
          onClick={handleExpandClick}
          disabled={disabled}
          ariaLabel={expandLabel}
          styles={expandButtonStyles}
        />
      );

      if (showTooltips) {
        return (
          <TooltipHost content={expandLabel} id={getId()}>
            {button}
          </TooltipHost>
        );
      }

      return button;
    }, [
      allowExpand,
      hideExpandButton,
      isMaximized,
      isExpanded,
      accessibility,
      handleExpandClick,
      disabled,
      showTooltips,
      buttonStyles,
    ]);

    // COMPLETE FIX: Accessibility props with proper focus management
    const accessibilityProps = useMemo(() => {
      if (!clickable || !allowExpand || isMaximized) {
        return {};
      }

      return {
        role: 'button',
        tabIndex: disabled ? -1 : 0,
        'aria-expanded': isExpanded,
        'aria-controls': `card-content-${id}`,
        'aria-disabled': disabled || loading,
        'aria-label': `${isExpanded ? 'Collapse' : 'Expand'} card`,
      };
    }, [clickable, allowExpand, isMaximized, isExpanded, id, disabled, loading]);

    // Header content with overflow handling
    const headerContent = (
      <div
        ref={headerContentRef}
        className={`spfx-header-content ${allowWrap ? 'wrap' : 'nowrap'}`}
        style={{
          flex: 1,
          minWidth: 0,
          overflow: allowWrap ? 'visible' : 'hidden',
          textOverflow: allowWrap ? 'initial' : 'ellipsis',
          whiteSpace: allowWrap ? 'normal' : 'nowrap',
          wordWrap: allowWrap ? 'break-word' : 'normal',
        }}
      >
        {children}
      </div>
    );

    const renderHeaderContent = () => {
      if (showTooltipOnOverflow && isOverflowing && !allowWrap) {
        return (
          <TooltipHost
            content={typeof children === 'string' ? children : 'Header content'}
            id={getId('header-overflow-tooltip')}
          >
            {headerContent}
          </TooltipHost>
        );
      }
      return headerContent;
    };

    return (
      <div
        ref={headerRef}
        className={headerClasses}
        style={headerStyle}
        onClick={handleHeaderClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus} // COMPLETE FIX: Add focus handler
        onBlur={handleBlur} // COMPLETE FIX: Add blur handler
        {...accessibilityProps}
      >
        {loading && showLoadingShimmer && <HeaderLoadingShimmer style={{ marginRight: '8px' }} />}

        {renderHeaderContent()}

        {!isMaximized && (
          <div className='spfx-header-buttons'>
            {renderActionButtons}
            {renderMaximizeButton}
            {renderExpandButton}
          </div>
        )}
      </div>
    );
  }
);

Header.displayName = 'FixedCardHeader';
// Keep all other header variants for compatibility
export const SimpleHeader = Header;
export const IconHeader = Header;
export const BadgeHeader = Header;
export const SubtitleHeader = Header;
