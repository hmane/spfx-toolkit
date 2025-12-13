import { ITheme } from '@fluentui/react/lib/Styling';
import { keyframes, mergeStyles } from '@fluentui/react/lib/Styling';
import { StepStatus, StepperStyleProps, StepColors, StepperMode, StepperVariant } from './types';

// ============================================================================
// MODERN SAAS DESIGN SYSTEM
// ============================================================================

// Gradient definitions for Modern SaaS style
export const SAAS_GRADIENTS = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  warning: 'linear-gradient(135deg, #fdbb2d 0%, #f5576c 100%)',
  error: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
  info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  pending: 'linear-gradient(135deg, #e0e5ec 0%, #c9d1d9 100%)',
};

// Shadow definitions
export const SAAS_SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
  md: '0 4px 20px rgba(102, 126, 234, 0.15)',
  lg: '0 8px 30px rgba(102, 126, 234, 0.25)',
  glow: '0 0 20px rgba(102, 126, 234, 0.4)',
  hoverLift: '0 12px 35px rgba(102, 126, 234, 0.3)',
};

// Transition definitions
export const SAAS_TRANSITIONS = {
  fast: '0.15s ease',
  normal: '0.25s ease',
  slow: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
};

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

// ============================================================================
// TIMELINE VARIANT STYLES
// ============================================================================

// Animation for timeline progress line
const timelineProgressAnimation = keyframes({
  '0%': { height: '0%' },
  '100%': { height: '100%' },
});

// Animation for timeline node pulse
const timelineNodePulse = keyframes({
  '0%, 100%': { boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.4)' },
  '50%': { boxShadow: '0 0 0 8px rgba(102, 126, 234, 0)' },
});

// Animation for content slide in
const timelineSlideIn = keyframes({
  '0%': { opacity: 0, transform: 'translateX(-10px)' },
  '100%': { opacity: 1, transform: 'translateX(0)' },
});

export const getTimelineStyles = (theme: ITheme) => ({
  container: mergeStyles({
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    padding: '16px 0',
  }),

  stepItem: mergeStyles({
    display: 'flex',
    alignItems: 'flex-start',
    position: 'relative',
    minHeight: '80px',
    paddingLeft: '48px',
    marginBottom: '8px',

    // Timeline connector line
    '::before': {
      content: '""',
      position: 'absolute',
      left: '11px',
      top: '24px',
      bottom: '-8px',
      width: '2px',
      background: `linear-gradient(180deg, ${theme.palette.themePrimary} 0%, ${theme.palette.themeLight} 100%)`,
      opacity: 0.3,
    },

    ':last-child::before': {
      display: 'none',
    },
  }),

  node: mergeStyles({
    position: 'absolute',
    left: '0',
    top: '0',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    transition: `all ${SAAS_TRANSITIONS.normal}`,
    boxShadow: SAAS_SHADOWS.md,
  }),

  nodeCompleted: mergeStyles({
    background: SAAS_GRADIENTS.success,
    color: '#ffffff',
  }),

  nodeCurrent: mergeStyles({
    background: SAAS_GRADIENTS.primary,
    color: '#ffffff',
    animation: `${timelineNodePulse} 2s ease-in-out infinite`,
  }),

  nodePending: mergeStyles({
    background: SAAS_GRADIENTS.pending,
    color: theme.palette.neutralSecondary,
  }),

  nodeWarning: mergeStyles({
    background: SAAS_GRADIENTS.warning,
    color: '#ffffff',
  }),

  nodeError: mergeStyles({
    background: SAAS_GRADIENTS.error,
    color: '#ffffff',
  }),

  nodeBlocked: mergeStyles({
    background: 'linear-gradient(135deg, #ff9500 0%, #ff8c00 100%)',
    color: '#ffffff',
  }),

  nodeSelected: mergeStyles({
    transform: 'scale(1.2)',
    boxShadow: SAAS_SHADOWS.glow,
  }),

  content: mergeStyles({
    flex: 1,
    paddingLeft: '16px',
    animation: `${timelineSlideIn} 0.4s ease-out`,
  }),

  title: mergeStyles({
    fontSize: theme.fonts.mediumPlus.fontSize,
    fontWeight: 600,
    color: theme.palette.neutralPrimary,
    marginBottom: '4px',
    lineHeight: 1.3,
  }),

  titleSelected: mergeStyles({
    background: SAAS_GRADIENTS.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }),

  description: mergeStyles({
    fontSize: theme.fonts.small.fontSize,
    color: theme.palette.neutralSecondary,
    lineHeight: 1.5,
  }),

  progressLine: mergeStyles({
    position: 'absolute',
    left: '11px',
    top: '24px',
    width: '2px',
    background: SAAS_GRADIENTS.success,
    animation: `${timelineProgressAnimation} 0.6s ease-out forwards`,
    zIndex: 1,
  }),
});

// ============================================================================
// MINIMAL VARIANT STYLES
// ============================================================================

// Animation for minimal dot glow
const minimalDotGlow = keyframes({
  '0%, 100%': { boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.3)' },
  '50%': { boxShadow: '0 0 12px 4px rgba(102, 126, 234, 0.2)' },
});

export const getMinimalStyles = (theme: ITheme) => ({
  container: mergeStyles({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    gap: '0',
  }),

  stepWrapper: mergeStyles({
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  }),

  stepItem: mergeStyles({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '8px 16px',
    transition: `all ${SAAS_TRANSITIONS.normal}`,

    ':hover': {
      transform: 'translateY(-2px)',
    },
  }),

  dot: mergeStyles({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: `all ${SAAS_TRANSITIONS.normal}`,
    marginBottom: '8px',
  }),

  dotCompleted: mergeStyles({
    background: SAAS_GRADIENTS.success,
    boxShadow: '0 2px 8px rgba(17, 153, 142, 0.4)',
  }),

  dotCurrent: mergeStyles({
    background: SAAS_GRADIENTS.primary,
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
    animation: `${minimalDotGlow} 2s ease-in-out infinite`,
  }),

  dotPending: mergeStyles({
    background: theme.palette.neutralLight,
    boxShadow: 'none',
  }),

  dotWarning: mergeStyles({
    background: SAAS_GRADIENTS.warning,
    boxShadow: '0 2px 8px rgba(253, 187, 45, 0.4)',
  }),

  dotError: mergeStyles({
    background: SAAS_GRADIENTS.error,
    boxShadow: '0 2px 8px rgba(235, 51, 73, 0.4)',
  }),

  dotBlocked: mergeStyles({
    background: 'linear-gradient(135deg, #ff9500 0%, #ff8c00 100%)',
    boxShadow: '0 2px 8px rgba(255, 149, 0, 0.4)',
  }),

  dotSelected: mergeStyles({
    transform: 'scale(1.5)',
    boxShadow: SAAS_SHADOWS.glow,
  }),

  connector: mergeStyles({
    width: '40px',
    height: '1px',
    background: theme.palette.neutralLight,
    position: 'relative',
    overflow: 'hidden',

    '::after': {
      content: '""',
      position: 'absolute',
      left: '0',
      top: '0',
      height: '100%',
      width: '0%',
      background: SAAS_GRADIENTS.success,
      transition: `width ${SAAS_TRANSITIONS.slow}`,
    },
  }),

  connectorCompleted: mergeStyles({
    '::after': {
      width: '100%',
    },
  }),

  label: mergeStyles({
    fontSize: theme.fonts.small.fontSize,
    color: theme.palette.neutralSecondary,
    textAlign: 'center',
    maxWidth: '80px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: `all ${SAAS_TRANSITIONS.fast}`,
  }),

  labelSelected: mergeStyles({
    color: theme.palette.themePrimary,
    fontWeight: 600,
  }),

  tooltip: mergeStyles({
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.85)',
    color: '#ffffff',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: theme.fonts.small.fontSize,
    whiteSpace: 'nowrap',
    opacity: 0,
    visibility: 'hidden',
    transition: `all ${SAAS_TRANSITIONS.fast}`,
    marginBottom: '8px',
    zIndex: 100,

    '::after': {
      content: '""',
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      border: '6px solid transparent',
      borderTopColor: 'rgba(0, 0, 0, 0.85)',
    },
  }),

  tooltipVisible: mergeStyles({
    opacity: 1,
    visibility: 'visible',
  }),
});

// ============================================================================
// CARDS VARIANT STYLES
// ============================================================================

// Animation for card entrance
const cardSlideUp = keyframes({
  '0%': { opacity: 0, transform: 'translateY(20px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' },
});

// Animation for checkmark
const checkmarkDraw = keyframes({
  '0%': { strokeDashoffset: '24' },
  '100%': { strokeDashoffset: '0' },
});

export const getCardsStyles = (theme: ITheme) => ({
  container: mergeStyles({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    padding: '16px',

    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  }),

  card: mergeStyles({
    position: 'relative',
    background: theme.palette.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: SAAS_SHADOWS.sm,
    border: `1px solid ${theme.palette.neutralLighter}`,
    cursor: 'pointer',
    transition: `all ${SAAS_TRANSITIONS.normal}`,
    overflow: 'hidden',
    animation: `${cardSlideUp} 0.4s ease-out backwards`,

    // Left border indicator (gradient based on status)
    '::before': {
      content: '""',
      position: 'absolute',
      left: '0',
      top: '0',
      bottom: '0',
      width: '4px',
      borderRadius: '12px 0 0 12px',
      transition: `all ${SAAS_TRANSITIONS.fast}`,
    },

    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: SAAS_SHADOWS.hoverLift,
    },
  }),

  cardCompleted: mergeStyles({
    '::before': {
      background: SAAS_GRADIENTS.success,
    },
  }),

  cardCurrent: mergeStyles({
    '::before': {
      background: SAAS_GRADIENTS.primary,
    },
    boxShadow: `${SAAS_SHADOWS.md}, inset 0 0 0 1px rgba(102, 126, 234, 0.1)`,
  }),

  cardPending: mergeStyles({
    '::before': {
      background: theme.palette.neutralLight,
    },
    opacity: 0.7,

    ':hover': {
      opacity: 1,
    },
  }),

  cardWarning: mergeStyles({
    '::before': {
      background: SAAS_GRADIENTS.warning,
    },
  }),

  cardError: mergeStyles({
    '::before': {
      background: SAAS_GRADIENTS.error,
    },
  }),

  cardBlocked: mergeStyles({
    '::before': {
      background: 'linear-gradient(135deg, #ff9500 0%, #ff8c00 100%)',
    },
  }),

  cardSelected: mergeStyles({
    boxShadow: `${SAAS_SHADOWS.lg}, 0 0 0 2px ${theme.palette.themePrimary}`,
    transform: 'translateY(-2px)',

    '::before': {
      width: '6px',
    },
  }),

  cardHeader: mergeStyles({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '12px',
  }),

  cardIcon: mergeStyles({
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: `all ${SAAS_TRANSITIONS.fast}`,
  }),

  cardIconCompleted: mergeStyles({
    background: 'rgba(17, 153, 142, 0.1)',
    color: '#11998e',
  }),

  cardIconCurrent: mergeStyles({
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
  }),

  cardIconPending: mergeStyles({
    background: theme.palette.neutralLighter,
    color: theme.palette.neutralSecondary,
  }),

  cardIconWarning: mergeStyles({
    background: 'rgba(253, 187, 45, 0.1)',
    color: '#f5576c',
  }),

  cardIconError: mergeStyles({
    background: 'rgba(235, 51, 73, 0.1)',
    color: '#eb3349',
  }),

  cardIconBlocked: mergeStyles({
    background: 'rgba(255, 149, 0, 0.1)',
    color: '#ff9500',
  }),

  statusBadge: mergeStyles({
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }),

  badgeCompleted: mergeStyles({
    background: 'rgba(17, 153, 142, 0.1)',
    color: '#11998e',
  }),

  badgeCurrent: mergeStyles({
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
  }),

  badgePending: mergeStyles({
    background: theme.palette.neutralLighter,
    color: theme.palette.neutralSecondary,
  }),

  badgeWarning: mergeStyles({
    background: 'rgba(253, 187, 45, 0.1)',
    color: '#f5576c',
  }),

  badgeError: mergeStyles({
    background: 'rgba(235, 51, 73, 0.1)',
    color: '#eb3349',
  }),

  badgeBlocked: mergeStyles({
    background: 'rgba(255, 149, 0, 0.1)',
    color: '#ff9500',
  }),

  cardTitle: mergeStyles({
    fontSize: theme.fonts.mediumPlus.fontSize,
    fontWeight: 600,
    color: theme.palette.neutralPrimary,
    marginBottom: '8px',
    lineHeight: 1.3,
  }),

  cardDescription: mergeStyles({
    fontSize: theme.fonts.small.fontSize,
    color: theme.palette.neutralSecondary,
    lineHeight: 1.5,
  }),

  cardFooter: mergeStyles({
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: `1px solid ${theme.palette.neutralLighter}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: theme.fonts.small.fontSize,
    color: theme.palette.neutralTertiary,
  }),

  stepNumber: mergeStyles({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }),
});

// ============================================================================
// VARIANT STATUS COLORS - Modern SaaS Gradients
// ============================================================================

export const getVariantStatusGradient = (status: StepStatus): string => {
  switch (status) {
    case 'completed':
      return SAAS_GRADIENTS.success;
    case 'current':
      return SAAS_GRADIENTS.primary;
    case 'warning':
      return SAAS_GRADIENTS.warning;
    case 'error':
      return SAAS_GRADIENTS.error;
    case 'blocked':
      return 'linear-gradient(135deg, #ff9500 0%, #ff8c00 100%)';
    case 'pending':
    default:
      return SAAS_GRADIENTS.pending;
  }
};

export const getVariantStatusColor = (status: StepStatus): string => {
  switch (status) {
    case 'completed':
      return '#11998e';
    case 'current':
      return '#667eea';
    case 'warning':
      return '#f5576c';
    case 'error':
      return '#eb3349';
    case 'blocked':
      return '#ff9500';
    case 'pending':
    default:
      return '#6b7280';
  }
};
