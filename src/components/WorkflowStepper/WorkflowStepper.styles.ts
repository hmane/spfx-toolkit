import { ITheme, keyframes, mergeStyles, FontWeights } from '@fluentui/react';
import { StepStatus, StepperStyleProps, StepColors, StepperMode } from './types';

// Animation keyframes
const slideIn = keyframes({
  '0%': { opacity: 0, transform: 'translateY(10px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' },
});

export const getStepperStyles = (theme: ITheme, props: StepperStyleProps) => {
  const { minStepWidth, mode } = props;
  // Add keyframes for animations
  const buttonPulse = keyframes({
    '0%': {
      transform: 'translateY(-50%) scale(1)',
      boxShadow: '0 4px 12px rgba(0, 188, 212, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    '50%': {
      transform: 'translateY(-50%) scale(1.05)',
      boxShadow: '0 6px 16px rgba(0, 188, 212, 0.4), 0 3px 6px rgba(0, 0, 0, 0.15)',
    },
    '100%': {
      transform: 'translateY(-50%) scale(1)',
      boxShadow: '0 4px 12px rgba(0, 188, 212, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
    },
  });

  const iconGlow = keyframes({
    '0%': {
      filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
    },
    '50%': {
      filter:
        'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))',
    },
    '100%': {
      filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
    },
  });
  return {
    container: mergeStyles({
      width: '100%',
      fontFamily: theme.fonts.medium.fontFamily,
      fontSize: theme.fonts.medium.fontSize,
      color: theme.palette.neutralPrimary,
      position: 'relative',
      '@media print': {
        colorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      },
    }),
    stepperContainer: mergeStyles({
      position: 'relative',
      width: '100%',

      // Hide arrows by default
      '& .scroll-arrow': {
        opacity: 0,
        transform: 'translateX(-10px)', // Slide in effect
        transition: 'all 0.3s ease',
        pointerEvents: 'none', // Prevent interaction when hidden
      },

      '& .scroll-arrow-right': {
        transform: 'translateX(10px)', // Slide in from right
      },

      // Show arrows on hover
      ':hover': {
        '& .scroll-arrow': {
          opacity: 1,
          transform: 'translateX(0)',
          pointerEvents: 'auto', // Enable interaction on hover
        },
      },

      '@media (max-width: 768px)': {
        position: 'static',

        // Always hide arrows on mobile
        '& .scroll-arrow': {
          display: 'none !important',
        },
      },
    }),

    stepsWrapper: mergeStyles({
      width: '100%',
      backgroundColor: theme.palette.neutralLighterAlt,
      border: `1px solid ${theme.palette.neutralLight}`,
      borderRadius: '8px 8px 0 0',
      padding: '0px',
      position: 'relative',
      overflowX: 'auto',
      overflowY: 'hidden',
      boxShadow: 'none',

      // Add bottom border when content area exists
      '&[data-has-content="true"]': {
        borderBottom: `1px solid ${theme.palette.neutralTertiary}`,
      },

      // Special styling when used alone (no content area)
      '&[data-standalone="true"]': {
        borderRadius: '8px',
        marginBottom: mode === 'compact' ? '8px' : '20px',
        boxShadow: theme.effects.elevation4,
      },

      // Mobile
      '@media (max-width: 768px)': {
        border: 'none',
        borderRadius: '0px',
        padding: '0px',
        backgroundColor: 'transparent',
        overflowX: 'auto',
        '&[data-has-content="true"]': {
          borderBottom: 'none',
        },
      },
    }),

    stepsContainer: mergeStyles({
      display: 'flex',
      alignItems: 'center',
      // CRITICAL: Remove any width constraints that prevent overflow
      width: 'auto', // Changed from 'max-content'
      minWidth: 'max-content', // This ensures content determines minimum width
      gap: mode === 'compact' ? '4px' : '6px',
      position: 'relative',
      flexShrink: 0, // Prevent shrinking
      // Add explicit flex properties
      flexWrap: 'nowrap',

      // Mobile: Stack vertically
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        alignItems: 'stretch',
        width: '100%',
        minWidth: 'auto',
        gap: mode === 'compact' ? '4px' : '8px',
      },
    }),
    // Cyan buttons with subtle pulse animation for better visibility

    scrollHintLeft: mergeStyles({
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '36px',
      height: '36px',
      backgroundColor: '#00bcd4',
      backdropFilter: 'blur(4px)',
      border: '2px solid rgba(255, 255, 255, 0.9)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 15,
      cursor: 'pointer',
      outline: 'none !important',
      '-webkit-appearance': 'none',
      '-moz-appearance': 'none',
      appearance: 'none',

      // ANIMATED: Subtle pulse animation when visible
      animation: `${buttonPulse} 2.5s ease-in-out infinite`,

      boxShadow: '0 4px 12px rgba(0, 188, 212, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',

      ':hover': {
        backgroundColor: '#0097a7',
        borderColor: 'rgba(255, 255, 255, 1)',
        transform: 'translateY(-50%) translateX(-2px) scale(1.1)', // Slightly larger on hover
        boxShadow: '0 6px 20px rgba(0, 188, 212, 0.4), 0 3px 8px rgba(0, 0, 0, 0.2)',
        outline: 'none !important',
        // PAUSE ANIMATION on hover for better interaction
        animationPlayState: 'paused',

        '& i': {
          color: 'rgba(255, 255, 255, 1) !important',
          transform: 'scale(1.1)',
        },
      },

      ':active': {
        transform: 'translateY(-50%) scale(0.95)',
        backgroundColor: '#00838f',
        outline: 'none !important',
        border: '2px solid rgba(255, 255, 255, 1)',
        animationPlayState: 'paused',
      },

      ':focus': {
        outline: 'none !important',
        boxShadow:
          '0 4px 12px rgba(0, 188, 212, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(0, 188, 212, 0.3)',
      },

      ':focus-visible': {
        outline: 'none !important',
        boxShadow:
          '0 4px 12px rgba(0, 188, 212, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(0, 188, 212, 0.4)',
      },
    }),

    scrollHintRight: mergeStyles({
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '36px',
      height: '36px',
      backgroundColor: '#00bcd4',
      backdropFilter: 'blur(4px)',
      border: '2px solid rgba(255, 255, 255, 0.9)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 15,
      cursor: 'pointer',
      outline: 'none !important',
      '-webkit-appearance': 'none',
      '-moz-appearance': 'none',
      appearance: 'none',

      // ANIMATED: Subtle pulse animation when visible (slight delay for alternating effect)
      animation: `${buttonPulse} 2.5s ease-in-out infinite 0.3s`,

      boxShadow: '0 4px 12px rgba(0, 188, 212, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',

      ':hover': {
        backgroundColor: '#0097a7',
        borderColor: 'rgba(255, 255, 255, 1)',
        transform: 'translateY(-50%) translateX(2px) scale(1.1)',
        boxShadow: '0 6px 20px rgba(0, 188, 212, 0.4), 0 3px 8px rgba(0, 0, 0, 0.2)',
        outline: 'none !important',
        animationPlayState: 'paused',

        '& i': {
          color: 'rgba(255, 255, 255, 1) !important',
          transform: 'scale(1.1)',
        },
      },

      ':active': {
        transform: 'translateY(-50%) scale(0.95)',
        backgroundColor: '#00838f',
        outline: 'none !important',
        border: '2px solid rgba(255, 255, 255, 1)',
        animationPlayState: 'paused',
      },

      ':focus': {
        outline: 'none !important',
        boxShadow:
          '0 4px 12px rgba(0, 188, 212, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(0, 188, 212, 0.3)',
      },

      ':focus-visible': {
        outline: 'none !important',
        boxShadow:
          '0 4px 12px rgba(0, 188, 212, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(0, 188, 212, 0.4)',
      },
    }),

    scrollIcon: mergeStyles({
      fontSize: '16px',
      color: 'rgba(255, 255, 255, 0.95)',
      transition: 'all 0.2s ease',
      // ANIMATED: Subtle glow animation on the icon
      animation: `${iconGlow} 2.5s ease-in-out infinite`,
    }),
    '@keyframes subtle-pulse': {
      '0%, 100%': {
        opacity: 0.7,
        transform: 'scale(1)',
      },
      '50%': {
        opacity: 1,
        transform: 'scale(1.05)',
      },
    },
    stepItem: mergeStyles({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      minWidth: minStepWidth ? `${minStepWidth}px` : mode === 'compact' ? '120px' : '160px',
      height: mode === 'compact' ? '50px' : '70px',
      flex: '0 0 auto',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
      userSelect: 'none',
      margin: '0',

      // Mobile: Full width, normal rectangle
      '@media (max-width: 768px)': {
        width: '100%',
        minWidth: 'auto',
        height: 'auto',
        minHeight: mode === 'compact' ? '45px' : '60px',
        flex: 'none',
      },
    }),

    stepContent: mergeStyles({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '100%',
      height: '100%',
      padding: mode === 'compact' ? '0 20px 0 15px' : '0 30px 0 20px',
      transition: 'all 0.3s ease',

      // Mobile: Normal rectangle with rounded corners
      '@media (max-width: 768px)': {
        borderRadius: mode === 'compact' ? '6px' : '8px',
        padding: mode === 'compact' ? '10px 14px' : '16px 20px',
        clipPath: 'none',
      },

      '@media print': {
        clipPath: 'none',
        borderRadius: '4px',
        border: '1px solid #000',
      },
    }),

    // Arrow styles - same as before
    stepContentFirst: mergeStyles({
      '@media (min-width: 769px)': {
        clipPath:
          mode === 'compact'
            ? 'polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%)'
            : 'polygon(0 0, calc(100% - 25px) 0, 100% 50%, calc(100% - 25px) 100%, 0 100%)',
        paddingLeft: mode === 'compact' ? '15px' : '20px',
        paddingRight: mode === 'compact' ? '20px' : '30px',
      },
    }),

    stepContentMiddle: mergeStyles({
      '@media (min-width: 769px)': {
        clipPath:
          mode === 'compact'
            ? 'polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%, 12px 50%)'
            : 'polygon(0 0, calc(100% - 25px) 0, 100% 50%, calc(100% - 25px) 100%, 0 100%, 20px 50%)',
        paddingLeft: mode === 'compact' ? '18px' : '26px',
        paddingRight: mode === 'compact' ? '20px' : '30px',
      },
    }),

    stepContentLast: mergeStyles({
      '@media (min-width: 769px)': {
        clipPath:
          mode === 'compact'
            ? 'polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%, 12px 50%)'
            : 'polygon(0 0, calc(100% - 25px) 0, 100% 50%, calc(100% - 25px) 100%, 0 100%, 20px 50%)',
        paddingLeft: mode === 'compact' ? '18px' : '26px',
        paddingRight: mode === 'compact' ? '20px' : '30px',
      },
    }),

    stepContentSingle: mergeStyles({
      '@media (min-width: 769px)': {
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        padding: mode === 'compact' ? '0 15px' : '0 20px',
      },
    }),

    stepText: mergeStyles({
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
    }),

    stepTitle: mergeStyles({
      fontSize: mode === 'compact' ? theme.fonts.small.fontSize : theme.fonts.medium.fontSize,
      fontWeight: FontWeights.semibold,
      lineHeight: '1.2',
      marginBottom: '2px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',

      '@media (max-width: 768px)': {
        fontSize: theme.fonts.mediumPlus.fontSize,
        whiteSpace: 'normal',
        lineHeight: '1.3',
      },
    }),

    stepDescription1: mergeStyles({
      fontSize: mode === 'compact' ? theme.fonts.xSmall.fontSize : theme.fonts.small.fontSize,
      fontWeight: FontWeights.regular,
      lineHeight: '1.2',
      marginBottom: '1px',
      opacity: 0.9,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',

      '@media (max-width: 768px)': {
        fontSize: theme.fonts.small.fontSize,
        whiteSpace: 'normal',
        lineHeight: '1.3',
      },
    }),

    stepDescription2: mergeStyles({
      fontSize: theme.fonts.xSmall.fontSize,
      fontWeight: FontWeights.regular,
      lineHeight: '1.2',
      opacity: 0.8,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',

      '@media (max-width: 768px)': {
        fontSize: theme.fonts.xSmall.fontSize,
        whiteSpace: 'normal',
        lineHeight: '1.3',
      },
    }),

    // FIXED: Content area with proper padding to match wrapper
    contentArea: mergeStyles({
      minHeight: '120px',
      padding: '24px',
      backgroundColor: theme.palette.neutralLighterAlt,
      border: `1px solid ${theme.palette.neutralLight}`,
      borderTop: 'none',
      borderRadius: '0 0 8px 8px',
      animation: slideIn,
      animationDuration: '0.4s',
      animationFillMode: 'forwards',
      boxShadow: theme.effects.elevation4,

      // FIXED: Mobile - match full width with no borders
      '@media (max-width: 768px)': {
        border: 'none',
        borderRadius: '0px',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        padding: '16px 0px',
      },

      '@media print': {
        border: `1px solid #000`,
        backgroundColor: '#f9f9f9',
        boxShadow: 'none',
      },
    }),

    contentHeader: mergeStyles({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px',
      paddingBottom: '12px',
      borderBottom: `1px solid ${theme.palette.neutralLight}`,
    }),

    contentTitle: mergeStyles({
      fontSize: theme.fonts.xLarge.fontSize,
      fontWeight: FontWeights.semibold,
      color: theme.palette.neutralPrimary,
      margin: 0,
      flex: 1,
    }),

    contentBody: mergeStyles({
      fontSize: theme.fonts.medium.fontSize,
      color: theme.palette.neutralSecondary,
      lineHeight: '1.6',

      '& h1, & h2, & h3, & h4, & h5, & h6': {
        color: theme.palette.neutralPrimary,
        marginTop: '16px',
        marginBottom: '8px',
      },
      '& p': {
        marginBottom: '12px',
      },
      '& ul, & ol': {
        paddingLeft: '20px',
        marginBottom: '12px',
      },
      '& li': {
        marginBottom: '4px',
      },
    }),

    mobileSummary: mergeStyles({
      display: 'none',

      '@media (max-width: 768px)': {
        display: 'block',
        marginTop: '16px',
        padding: '12px 16px',
        backgroundColor: theme.palette.themeLighterAlt,
        border: `1px solid ${theme.palette.themeLight}`,
        borderRadius: '6px',
        fontSize: theme.fonts.small.fontSize,
        color: theme.palette.themeDark,
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

// getStepColors and getStepItemStyles remain exactly the same
export const getStepColors = (theme: ITheme): Record<StepStatus, StepColors> => {
  return {
    completed: {
      background: '#107c10',
      selectedBackground: '#0e6b0e',
      text: theme.palette.white,
      selectedText: theme.palette.white,
      border: '#107c10',
      selectedBorder: '#0e6b0e',
    },
    current: {
      background: theme.palette.themePrimary,
      selectedBackground: theme.palette.themeDark,
      text: theme.palette.white,
      selectedText: theme.palette.white,
      border: theme.palette.themePrimary,
      selectedBorder: theme.palette.themeDark,
    },
    pending: {
      background: '#f3f2f1',
      selectedBackground: '#e1dfdd',
      text: '#605e5c',
      selectedText: '#323130',
      border: '#d2d0ce',
      selectedBorder: '#c8c6c4',
    },
    warning: {
      background: '#ffb900',
      selectedBackground: '#f29000',
      text: '#323130',
      selectedText: '#1b1a19',
      border: '#ffb900',
      selectedBorder: '#f29000',
    },
    error: {
      background: '#d13438',
      selectedBackground: '#b02e32',
      text: theme.palette.white,
      selectedText: theme.palette.white,
      border: '#d13438',
      selectedBorder: '#b02e32',
    },
    blocked: {
      background: '#ff8c00',
      selectedBackground: '#e67e00',
      text: theme.palette.white,
      selectedText: theme.palette.white,
      border: '#ff8c00',
      selectedBorder: '#e67e00',
    },
  };
};

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
  const borderColor = isSelected ? colorConfig.selectedBorder : colorConfig.border;

  const baseStyles = {
    backgroundColor,
    color: textColor,
    border: `1px solid ${borderColor}`,
    boxShadow: isSelected ? theme.effects.elevation8 : theme.effects.elevation4,
  };

  const cursorStyle = isClickable ? 'pointer' : 'not-allowed';

  const hoverStyles = isClickable
    ? {
        ':hover': {
          transform: mode === 'compact' ? 'scale(1.02)' : 'translateY(-2px)',
          boxShadow: theme.effects.elevation16,
          zIndex: 2,

          '@media (max-width: 768px)': {
            transform: 'none',
            boxShadow: theme.effects.elevation8,
          },
        },
      }
    : {};

  const focusStyles = isClickable
    ? {
        ':focus': {
          outline: `2px solid ${theme.palette.themePrimary}`,
          outlineOffset: '2px',
          zIndex: 3,
        },
        ':focus-visible': {
          outline: `2px solid ${theme.palette.themePrimary}`,
          outlineOffset: '2px',
        },
      }
    : {};

  return mergeStyles({
    ...baseStyles,
    ...hoverStyles,
    ...focusStyles,
    cursor: cursorStyle,
  });
};
