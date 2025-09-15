import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import * as React from 'react';
import { LoadingStateProps } from '../Card.types';
import { LOADING_TEMPLATES } from '../utils/constants';

/**
 * Loading state components for cards
 */

/**
 * Spinner loading component
 */
export const SpinnerLoading: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  className = '',
  style,
}) => (
  <div className={`spfx-card-loading-spinner ${className}`} style={style}>
    <Spinner size={SpinnerSize.medium} label={message} ariaLive='polite' />
  </div>
);

/**
 * Skeleton loading component
 */
export const SkeletonLoading: React.FC<LoadingStateProps> = ({ className = '', style }) => {
  const { headerHeight, lineHeight, lineCount, spacing } = LOADING_TEMPLATES.skeleton;

  return (
    <div className={`spfx-card-loading-skeleton ${className}`} style={style}>
      {/* Header skeleton */}
      <div
        className='skeleton-header'
        style={{
          height: headerHeight,
          backgroundColor: 'var(--neutralLighter, #f8f9fa)',
          borderRadius: '4px',
          marginBottom: spacing,
        }}
      />

      {/* Content lines skeleton */}
      {Array.from({ length: lineCount }).map((_, index) => (
        <div
          key={index}
          className='skeleton-line'
          style={{
            height: lineHeight,
            backgroundColor: 'var(--neutralLighter, #f8f9fa)',
            borderRadius: '4px',
            marginBottom: spacing,
            width: index === lineCount - 1 ? '70%' : '100%', // Last line shorter
          }}
        />
      ))}
    </div>
  );
};

/**
 * Shimmer loading component
 */
export const ShimmerLoading: React.FC<LoadingStateProps> = ({ className = '', style }) => {
  const { animationDuration, gradientColors } = LOADING_TEMPLATES.shimmer;

  const shimmerStyle: React.CSSProperties = {
    background: `linear-gradient(90deg, ${gradientColors.join(', ')})`,
    backgroundSize: '200% 100%',
    animation: `shimmer ${animationDuration} infinite ease-in-out`,
    borderRadius: '4px',
    ...style,
  };

  return (
    <div className={`spfx-card-loading-shimmer ${className}`}>
      {/* Header shimmer */}
      <div
        style={{
          ...shimmerStyle,
          height: '24px',
          marginBottom: '16px',
        }}
      />

      {/* Content shimmer blocks */}
      <div
        style={{
          ...shimmerStyle,
          height: '16px',
          marginBottom: '8px',
        }}
      />
      <div
        style={{
          ...shimmerStyle,
          height: '16px',
          marginBottom: '8px',
        }}
      />
      <div
        style={{
          ...shimmerStyle,
          height: '16px',
          width: '75%',
        }}
      />
    </div>
  );
};

/**
 * Overlay loading component
 */
export const OverlayLoading: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  className = '',
  style,
}) => (
  <div
    className={`spfx-card-loading-overlay ${className}`}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      backdropFilter: 'blur(2px)',
      borderRadius: 'inherit',
      ...style,
    }}
  >
    <Spinner
      size={SpinnerSize.large}
      ariaLive='polite'
      styles={{
        root: { marginBottom: '16px' },
      }}
    />
    {message && (
      <div
        style={{
          color: 'var(--neutralSecondary, #605e5c)',
          fontSize: '14px',
          fontWeight: 400,
          textAlign: 'center',
        }}
      >
        {message}
      </div>
    )}
  </div>
);

/**
 * Main loading component that switches between types
 */
export const CardLoading: React.FC<LoadingStateProps> = props => {
  const { type = 'none', ...restProps } = props;

  switch (type) {
    case 'spinner':
      return <SpinnerLoading type={type} {...restProps} />;
    case 'skeleton':
      return <SkeletonLoading type={type} {...restProps} />;
    case 'shimmer':
      return <ShimmerLoading type={type} {...restProps} />;
    case 'overlay':
      return <OverlayLoading type={type} {...restProps} />;
    case 'none':
    default:
      return null;
  }
};

/**
 * Header loading shimmer
 */
export const HeaderLoadingShimmer: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = '', style }) => (
  <div
    className={`spfx-card-header-loading-shimmer ${className}`}
    style={{
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background:
        'linear-gradient(90deg, var(--neutralLighter, #f8f9fa) 25%, var(--neutralLight, #edebe9) 50%, var(--neutralLighter, #f8f9fa) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite ease-in-out',
      marginRight: '8px',
      ...style,
    }}
    aria-hidden='true'
  />
);

/**
 * Custom loading component for specific use cases
 */
export const CustomLoading: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className = '', style }) => (
  <div className={`spfx-card-loading-custom ${className}`} style={style}>
    {children}
  </div>
);

/**
 * Loading placeholder for content areas
 */
export const ContentLoadingPlaceholder: React.FC<{
  height?: number | string;
  lines?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ height = 100, lines = 3, className = '', style }) => {
  const containerStyle: React.CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    ...style,
  };

  return (
    <div className={`spfx-card-content-loading-placeholder ${className}`} style={containerStyle}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          style={{
            height: '16px',
            backgroundColor: 'var(--neutralLighter, #f8f9fa)',
            borderRadius: '4px',
            width: index === lines - 1 ? '70%' : '100%',
            background:
              'linear-gradient(90deg, var(--neutralLighter, #f8f9fa) 25%, var(--neutralLight, #edebe9) 50%, var(--neutralLighter, #f8f9fa) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite ease-in-out',
          }}
        />
      ))}
    </div>
  );
};

/**
 * Loading dots animation
 */
export const LoadingDots: React.FC<{
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}> = ({ size = 'medium', color = 'var(--themePrimary, #0078d4)', className = '' }) => {
  const sizeMap = {
    small: 4,
    medium: 6,
    large: 8,
  };

  const dotSize = sizeMap[size];

  return (
    <div
      className={`spfx-card-loading-dots ${className}`}
      style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
    >
      {[0, 1, 2].map(index => (
        <div
          key={index}
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: '50%',
            backgroundColor: color,
            animation: `loadingDots 1.4s infinite ease-in-out both`,
            animationDelay: `${index * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Progress bar loading
 */
export const ProgressLoading: React.FC<{
  progress?: number; // 0-100
  indeterminate?: boolean;
  height?: number;
  color?: string;
  backgroundColor?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({
  progress = 0,
  indeterminate = false,
  height = 4,
  color = 'var(--themePrimary, #0078d4)',
  backgroundColor = 'var(--neutralLighter, #f8f9fa)',
  className = '',
  style,
}) => {
  const progressStyle: React.CSSProperties = {
    width: '100%',
    height: `${height}px`,
    backgroundColor,
    borderRadius: `${height / 2}px`,
    overflow: 'hidden',
    position: 'relative',
    ...style,
  };

  const barStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: color,
    borderRadius: `${height / 2}px`,
    transition: indeterminate ? 'none' : 'width 0.3s ease',
    width: indeterminate ? '30%' : `${Math.max(0, Math.min(100, progress))}%`,
    ...(indeterminate && {
      position: 'absolute',
      animation: 'progressIndeterminate 2s infinite ease-in-out',
    }),
  };

  return (
    <div className={`spfx-card-progress-loading ${className}`} style={progressStyle}>
      <div style={barStyle} />
    </div>
  );
};

// CSS Keyframes for animations (injected via style element)
const injectLoadingKeyframes = () => {
  const styleId = 'spfx-card-loading-keyframes';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes loadingDots {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }

    @keyframes progressIndeterminate {
      0% { left: -30%; }
      50% { left: 50%; }
      100% { left: 100%; }
    }

    @keyframes pulseGlow {
      0%, 100% { opacity: 0.7; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.05); }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .spfx-card-loading-shimmer,
      .spfx-card-header-loading-shimmer,
      .spfx-card-content-loading-placeholder > div,
      .spfx-card-loading-dots > div,
      .spfx-card-progress-loading > div {
        animation: none !important;
      }

      .spfx-card-loading-shimmer,
      .spfx-card-header-loading-shimmer,
      .spfx-card-content-loading-placeholder > div {
        background: var(--neutralLight, #edebe9) !important;
      }
    }
  `;
  document.head.appendChild(style);
};

// Initialize keyframes when module loads
if (typeof document !== 'undefined') {
  injectLoadingKeyframes();
}

/**
 * Loading component with error boundary
 */
export class LoadingErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SpfxCard] Loading component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--neutralSecondary, #605e5c)',
            }}
          >
            Loading component error
          </div>
        )
      );
    }

    return this.props.children;
  }
}
