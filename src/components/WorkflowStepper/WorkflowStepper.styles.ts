import { ITheme, keyframes, mergeStyles } from '@fluentui/react';
import { StepStatus, StepperStyleProps, StepColors, StepperMode } from './types';

// Animation keyframes
const slideIn = keyframes({
  '0%': { opacity: 0, transform: 'translateY(10px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' },
});

const pulseGlow = keyframes({
  '0%': {
    boxShadow: '0 0 0 0 rgba(0, 120, 212, 0.4)',
  },
  '50%': {
    boxShadow: '0 0 0 8px rgba(0, 120, 212, 0.1)',
  },
  '100%': {
    boxShadow: '0 0 0 0 rgba(0, 120, 212, 0)',
  },
});

const floatAnimation = keyframes({
  '0%, 100%': {
    transform: 'translateY(-50%) translateX(0)',
  },
  '50%': {
    transform: 'translateY(-50%) translateX(-2px)',
  },
});

export const getStepperStyles = (theme: ITheme, props: StepperStyleProps) => {
  const { minStepWidth, mode } = props;

  return {
    container: mergeStyles({
      width: '100%',
      fontFamily: theme.fonts.medium.fontFamily,
      fontSize: theme.fonts.medium.fontSize,
      color: theme.palette.neutralPrimary,
      position: 'relative',
    }),

    stepperContainer: mergeStyles({
      position: 'relative',
      width: '100%',
      borderRadius: '12px 12px 0 0', // Only top rounded when content exists
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${theme.palette.neutralLighterAlt} 0%, ${theme.palette.neutralLighter} 100%)`,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      border: `1px solid ${theme.palette.neutralLight}`,
      borderBottom: 'none', // Remove bottom border when content follows

      // When used standalone (no content), add full border radius
      '&[data-standalone="true"]': {
        borderRadius: '12px',
        borderBottom: `1px solid ${theme.palette.neutralLight}`,
      },
    }),

    stepsWrapper: mergeStyles({
      width: '100%',
      padding: '0', // Remove all padding
      position: 'relative',
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollBehavior: 'smooth',
    }),

    stepsContainer: mergeStyles({
      display: 'flex',
      alignItems: 'center',
      width: 'auto',
      minWidth: 'max-content',
      gap: '0px', // NO GAP - steps touch
      position: 'relative',
      flexShrink: 0,
      flexWrap: 'nowrap',
      padding: '0 60px 0 0', // Remove left padding, keep right for scroll arrow

      '@media (max-width: 768px)': {
        flexDirection: 'column',
        alignItems: 'stretch',
        width: '100%',
        minWidth: 'auto',
        gap: '8px',
        padding: '0 16px',
      },
    }),

    // Always visible scroll arrows
    scrollHintLeft: mergeStyles({
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '40px',
      height: '40px',
      background: `linear-gradient(135deg, ${theme.palette.themePrimary} 0%, ${theme.palette.themeDark} 100%)`,
      border: `2px solid ${theme.palette.white}`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 15,
      cursor: 'pointer',
      outline: 'none',
      boxShadow: '0 4px 12px rgba(0, 120, 212, 0.3)',
      opacity: 1, // Always visible

      ':hover': {
        transform: 'translateY(-50%) scale(1.1)',
        boxShadow: '0 6px 16px rgba(0, 120, 212, 0.4)',
      },

      '@media (max-width: 768px)': {
        display: 'none',
      },
    }),

    scrollHintRight: mergeStyles({
      position: 'absolute',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '40px',
      height: '40px',
      background: `linear-gradient(135deg, ${theme.palette.themePrimary} 0%, ${theme.palette.themeDark} 100%)`,
      border: `2px solid ${theme.palette.white}`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 15,
      cursor: 'pointer',
      outline: 'none',
      boxShadow: '0 4px 12px rgba(0, 120, 212, 0.3)',
      opacity: 1, // Always visible

      ':hover': {
        transform: 'translateY(-50%) scale(1.1)',
        boxShadow: '0 6px 16px rgba(0, 120, 212, 0.4)',
      },

      '@media (max-width: 768px)': {
        display: 'none',
      },
    }),

    scrollIcon: mergeStyles({
      fontSize: '16px',
      color: theme.palette.white,
    }),

    stepItem: mergeStyles({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      minWidth: minStepWidth ? `${minStepWidth}px` : mode === 'compact' ? '140px' : '180px',
      height: mode === 'compact' ? '60px' : '80px',
      flex: '0 0 auto',
      outline: 'none',
      userSelect: 'none',

      // Different overlap for compact vs normal mode
      marginLeft: mode === 'compact' ? '-15px' : '-20px', // Less overlap in compact mode

      // First step should not have negative margin
      ':first-child': {
        marginLeft: '0',
      },

      // Higher z-index for later steps so they appear on top
      zIndex: 1,
      ':nth-child(2)': { zIndex: 2 },
      ':nth-child(3)': { zIndex: 3 },
      ':nth-child(4)': { zIndex: 4 },
      ':nth-child(5)': { zIndex: 5 },

      '@media (max-width: 768px)': {
        width: '100%',
        minWidth: 'auto',
        height: 'auto',
        minHeight: mode === 'compact' ? '50px' : '70px',
        flex: 'none',
        marginLeft: '0',
        zIndex: 'auto',
      },
    }),

    stepContent: mergeStyles({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '100%',
      height: '100%',
      padding: mode === 'compact' ? '0 24px 0 20px' : '0 32px 0 24px',
      border: '1px solid rgba(0, 0, 0, 0.08)', // More visible subtle border
      borderRadius: '0',
      boxSizing: 'border-box',

      '@media (max-width: 768px)': {
        borderRadius: '8px',
        padding: mode === 'compact' ? '12px 16px' : '16px 20px',
        clipPath: 'none',
      },
    }),

    // Arrow clip paths - show arrow on last step too, with proper spacing for compact mode
    stepContentFirst: mergeStyles({
      '@media (min-width: 769px)': {
        clipPath:
          mode === 'compact'
            ? 'polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%)'
            : 'polygon(0 0, calc(100% - 25px) 0, 100% 50%, calc(100% - 25px) 100%, 0 100%)',
        // First step keeps normal left padding
      },
    }),

    stepContentMiddle: mergeStyles({
      '@media (min-width: 769px)': {
        clipPath:
          mode === 'compact'
            ? 'polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%, 15px 50%)'
            : 'polygon(0 0, calc(100% - 25px) 0, 100% 50%, calc(100% - 25px) 100%, 0 100%, 25px 50%)',
        // Add extra left padding to account for the arrow cutout
        paddingLeft: mode === 'compact' ? '25px' : '35px',
      },
    }),

    stepContentLast: mergeStyles({
      '@media (min-width: 769px)': {
        // Show arrow on last step too!
        clipPath:
          mode === 'compact'
            ? 'polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%, 15px 50%)'
            : 'polygon(0 0, calc(100% - 25px) 0, 100% 50%, calc(100% - 25px) 100%, 0 100%, 25px 50%)',
        // Add extra left padding to account for the arrow cutout
        paddingLeft: mode === 'compact' ? '25px' : '35px',
      },
    }),

    stepContentSingle: mergeStyles({
      '@media (min-width: 769px)': {
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
      },
    }),

    stepText: mergeStyles({
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
    }),

    stepIcon: mergeStyles({
      marginRight: '8px',
      fontSize: mode === 'compact' ? '14px' : '16px',
    }),

    stepTitle: mergeStyles({
      fontSize: mode === 'compact' ? theme.fonts.medium.fontSize : theme.fonts.mediumPlus.fontSize,
      fontWeight: 600,
      lineHeight: '1.2',
      marginBottom: '4px', // Proper spacing without icons
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',

      '@media (max-width: 768px)': {
        fontSize: theme.fonts.large.fontSize,
        whiteSpace: 'normal',
      },
    }),

    stepDescription1: mergeStyles({
      fontSize: theme.fonts.small.fontSize,
      fontWeight: 400,
      lineHeight: '1.2',
      marginBottom: '1px',
      opacity: 0.9,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      // Remove any background or border that might create lines
      background: 'none',
      border: 'none',

      '@media (max-width: 768px)': {
        whiteSpace: 'normal',
      },
    }),

    stepDescription2: mergeStyles({
      fontSize: theme.fonts.xSmall.fontSize,
      fontWeight: 400,
      lineHeight: '1.2',
      opacity: 0.8,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      // Remove any background or border that might create lines
      background: 'none',
      border: 'none',

      '@media (max-width: 768px)': {
        whiteSpace: 'normal',
      },
    }),

    // Content area
    contentArea: mergeStyles({
      minHeight: '160px',
      padding: '32px',
      background: `linear-gradient(135deg, ${theme.palette.white} 0%, ${theme.palette.neutralLighterAlt} 100%)`,
      border: `1px solid ${theme.palette.neutralLight}`,
      borderTop: 'none',
      borderRadius: '0 0 12px 12px',
      animation: slideIn,
      animationDuration: '0.6s',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',

      '@media (max-width: 768px)': {
        border: 'none',
        borderRadius: '0px',
        background: theme.palette.white,
        boxShadow: 'none',
        padding: '24px 16px',
      },
    }),

    contentHeader: mergeStyles({
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: `2px solid ${theme.palette.neutralLighter}`,
    }),

    contentTitle: mergeStyles({
      fontSize: theme.fonts.xLarge.fontSize,
      fontWeight: 600,
      color: theme.palette.neutralPrimary,
      margin: 0,
      flex: 1,
    }),

    contentBody: mergeStyles({
      fontSize: theme.fonts.medium.fontSize,
      color: theme.palette.neutralSecondary,
      lineHeight: '1.7',

      '& p': {
        marginBottom: '16px',
      },
    }),

    statusBadge: mergeStyles({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '16px',
      fontSize: theme.fonts.small.fontSize,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }),

    progressIndicator: mergeStyles({
      marginBottom: '20px',
      padding: '16px 20px',
      background: `linear-gradient(135deg, ${theme.palette.themeLighterAlt} 0%, rgba(0, 120, 212, 0.05) 100%)`,
      border: `1px solid ${theme.palette.themeLight}`,
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }),

    mobileSummary: mergeStyles({
      display: 'none',
      '@media (max-width: 768px)': {
        display: 'block',
        marginTop: '20px',
        padding: '16px 20px',
        background: theme.palette.themeLighterAlt,
        border: `1px solid ${theme.palette.themeLight}`,
        borderRadius: '8px',
        fontSize: theme.fonts.medium.fontSize,
        color: theme.palette.themeDark,
        fontWeight: 500,
      },
    }),

    srOnly: mergeStyles({
      position: 'absolute',
      left: '-10000px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
    }),
  };
};

// Step colors - ONLY CHANGED PENDING COLORS
export const getStepColors = (theme: ITheme): Record<StepStatus, StepColors> => {
  return {
    completed: {
      background: 'linear-gradient(135deg, #13a10e 0%, #107c10 100%)', // Brighter green
      selectedBackground: 'linear-gradient(135deg, #0e6b0e 0%, #094509 100%)', // Much darker
      text: '#ffffff',
      selectedText: '#ffffff',
      border: '#13a10e',
      selectedBorder: '#094509',
    },
    current: {
      background: `linear-gradient(135deg, #0078d4 0%, #106ebe 100%)`, // Standard blue
      selectedBackground: `linear-gradient(135deg, #004578 0%, #003050 100%)`, // Much darker blue
      text: '#ffffff',
      selectedText: '#ffffff',
      border: '#0078d4',
      selectedBorder: '#003050',
    },
    pending: {
      background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)', // Very light gray
      selectedBackground: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', // Dark gray
      text: '#4b5563', // Dark text for light background
      selectedText: '#ffffff', // White text for dark background
      border: '#d1d5db',
      selectedBorder: '#4b5563',
    },
    warning: {
      background: 'linear-gradient(135deg, #ffc83d 0%, #ffb900 100%)', // Brighter yellow
      selectedBackground: 'linear-gradient(135deg, #c87a00 0%, #9e6100 100%)', // Much darker orange
      text: '#1f1f1f', // Dark text for better readability
      selectedText: '#ffffff',
      border: '#ffb900',
      selectedBorder: '#9e6100',
    },
    error: {
      background: 'linear-gradient(135deg, #e74856 0%, #d13438 100%)', // Brighter red
      selectedBackground: 'linear-gradient(135deg, #8a1c1f 0%, #6b1518 100%)', // Much darker red
      text: '#ffffff',
      selectedText: '#ffffff',
      border: '#e74856',
      selectedBorder: '#6b1518',
    },
    blocked: {
      background: 'linear-gradient(135deg, #ff9500 0%, #ff8c00 100%)', // Brighter orange
      selectedBackground: 'linear-gradient(135deg, #b35f00 0%, #8a4800 100%)', // Much darker orange
      text: '#ffffff',
      selectedText: '#ffffff',
      border: '#ff9500',
      selectedBorder: '#8a4800',
    },
  };
};
// Step item styles - SIMPLIFIED
export const getStepItemStyles = (
  theme: ITheme,
  status: StepStatus,
  isSelected: boolean,
  isClickable: boolean,
  mode: StepperMode
) => {
  const colors = getStepColors(theme);
  const colorConfig = colors[status];

  const backgroundColor = isSelected ? colorConfig.selectedBackground : colorConfig.background;
  const textColor = isSelected ? colorConfig.selectedText : colorConfig.text;

  return mergeStyles({
    background: backgroundColor,
    color: textColor,
    border: 'none', // NO BORDERS AT ALL
    boxShadow: isSelected
      ? '0 6px 20px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)'
      : '0 2px 10px rgba(0, 0, 0, 0.1)',
    cursor: isClickable ? 'pointer' : 'not-allowed',
    transition: 'all 0.3s ease',

    ':hover': isClickable
      ? {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.18)',
        }
      : {},

    ':focus': isClickable
      ? {
          outline: 'none',
          boxShadow: isSelected
            ? '0 6px 20px rgba(0, 0, 0, 0.15)' // No blue border when selected
            : `0 6px 20px rgba(0, 0, 0, 0.15), 0 0 0 2px ${theme.palette.themePrimary}40`,
        }
      : {},
  });
};
