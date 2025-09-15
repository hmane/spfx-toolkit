import * as React from 'react';
import { memo, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { ContentPadding, ContentProps } from '../Card.types';
import { PADDING_CONFIG } from '../utils/constants';
import { CardLoading, ContentLoadingPlaceholder } from './LoadingStates';
import { CardContext } from './Card';

/**
 * Error Boundary for Content component
 */
class ContentErrorBoundary extends React.Component<
  {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error) => void;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error) => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[SpfxCard] Content Error Boundary:', error, errorInfo);
    this.props.onError?.(error);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='spfx-card-error-boundary'>
          <div className='spfx-card-error-boundary-title'>Content Error</div>
          <div className='spfx-card-error-boundary-message'>
            {this.state.error?.message || 'An error occurred while loading content'}
          </div>
          <button
            className='spfx-card-error-boundary-button'
            onClick={this.handleRetry}
            style={{
              padding: '6px 12px',
              border: '1px solid var(--themePrimary, #0078d4)',
              backgroundColor: 'var(--themePrimary, #0078d4)',
              color: 'var(--white, #ffffff)',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Helper function to convert padding value to CSS string
 */
const getPaddingValue = (padding: ContentPadding): string => {
  if (typeof padding === 'string') {
    return PADDING_CONFIG[padding as keyof typeof PADDING_CONFIG] || padding;
  }

  if (typeof padding === 'object' && padding !== null) {
    const { top = 0, right = 0, bottom = 0, left = 0 } = padding;
    return `${top}px ${right}px ${bottom}px ${left}px`;
  }

  return PADDING_CONFIG.comfortable; // Default
};

/**
 * Enhanced Card Content component with proper state handling
 */
export const Content = memo<ContentProps>(
  ({
    children,
    className = '',
    style,
    padding = 'comfortable',
    loadingPlaceholder,
    errorBoundary = true,
  }) => {
    // Get card context
    const cardContext = useContext(CardContext);
    const contentRef = useRef<HTMLDivElement>(null);

    if (!cardContext) {
      console.warn('[SpfxCard] Content must be used within a Card component');
      return null;
    }

    const {
      isExpanded,
      isMaximized,
      allowExpand,
      id,
      lazyLoad,
      hasContentLoaded,
      loading,
      loadingType,
      onContentLoad,
      size,
    } = cardContext;

    // Calculate effective padding based on card size
    const effectivePadding = useMemo(() => {
      if (typeof padding === 'object' || typeof padding === 'string') {
        return padding;
      }

      // Adjust default padding based on card size
      switch (size) {
        case 'compact':
          return 'compact';
        case 'large':
          return 'spacious';
        default:
          return 'comfortable';
      }
    }, [padding, size]);

    // Memoized padding styles
    const paddingStyle = useMemo(
      () => ({
        padding: getPaddingValue(effectivePadding),
      }),
      [effectivePadding]
    );

    // Memoized content classes with proper state handling
    const contentClasses = useMemo(
      () =>
        [
          'spfx-card-content',
          isExpanded ? 'expanded' : 'collapsed',
          loading ? 'loading' : '',
          isMaximized ? 'maximized' : '',
          `size-${size}`,
          className,
        ]
          .filter(Boolean)
          .join(' '),
      [isExpanded, loading, isMaximized, size, className]
    );

    // Memoized body classes
    const bodyClasses = useMemo(
      () =>
        [
          'spfx-card-body',
          typeof effectivePadding === 'string' ? `padding-${effectivePadding}` : 'padding-custom',
        ]
          .filter(Boolean)
          .join(' '),
      [effectivePadding]
    );

    // Handle lazy loading content notification
    useEffect(() => {
      if (lazyLoad && isExpanded && !hasContentLoaded) {
        onContentLoad();
      }
    }, [lazyLoad, isExpanded, hasContentLoaded, onContentLoad]);

    // Determine what content to render
    const shouldRenderContent = !lazyLoad || hasContentLoaded || isExpanded;
    const isContentFunction = typeof children === 'function';

    // Memoized content to render
    const contentToRender = useMemo(() => {
      // If lazy loading and content not loaded, show placeholder
      if (lazyLoad && !hasContentLoaded && !isExpanded) {
        return loadingPlaceholder || <ContentLoadingPlaceholder height={100} lines={3} />;
      }

      // If loading, show loading state or placeholder
      if (loading && loadingType !== 'none') {
        return (
          loadingPlaceholder || (
            <CardLoading type={loadingType as any} message='Loading content...' />
          )
        );
      }

      // If content should be rendered
      if (shouldRenderContent) {
        return isContentFunction ? (children as () => ReactNode)() : children;
      }

      // Fallback placeholder
      return loadingPlaceholder || <ContentLoadingPlaceholder height={100} lines={3} />;
    }, [
      lazyLoad,
      hasContentLoaded,
      isExpanded,
      loading,
      loadingType,
      shouldRenderContent,
      isContentFunction,
      children,
      loadingPlaceholder,
    ]);

    // Error boundary handler
    const handleError = useCallback(
      (error: Error) => {
        console.error(`[SpfxCard] Content error in card ${id}:`, error);
      },
      [id]
    );

    // Content wrapper component with enhanced styles
    const ContentWrapper = useCallback(
      ({ children: contentChildren }: { children: ReactNode }) => (
        <div
          ref={contentRef}
          className={contentClasses}
          style={{
            ...style,
            // Ensure proper height calculations for maximized view
            ...(isMaximized && {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }),
          }}
          id={`card-content-${id}`}
          aria-hidden={!isExpanded && allowExpand && !isMaximized}
          role={allowExpand ? 'region' : undefined}
          aria-labelledby={allowExpand ? `card-header-${id}` : undefined}
        >
          <div
            className={bodyClasses}
            style={{
              ...(typeof effectivePadding === 'object' ? paddingStyle : undefined),
              // Enhanced maximized view styling
              ...(isMaximized && {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflowY: 'auto',
                padding: getPaddingValue(effectivePadding),
              }),
            }}
          >
            {contentChildren}
          </div>
        </div>
      ),
      [
        contentClasses,
        style,
        isMaximized,
        id,
        isExpanded,
        allowExpand,
        bodyClasses,
        effectivePadding,
        paddingStyle,
      ]
    );

    // Render with or without error boundary
    if (errorBoundary) {
      return (
        <ContentWrapper>
          <ContentErrorBoundary onError={handleError}>{contentToRender}</ContentErrorBoundary>
        </ContentWrapper>
      );
    }

    return <ContentWrapper>{contentToRender}</ContentWrapper>;
  }
);

Content.displayName = 'EnhancedCardContent';

/**
 * Enhanced Footer component that respects card states
 */
export const Footer = memo<{
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  backgroundColor?: string;
  borderTop?: boolean;
  padding?: ContentPadding;
  textAlign?: 'left' | 'center' | 'right';
}>(
  ({
    children,
    className = '',
    style,
    backgroundColor,
    borderTop = true,
    padding = 'comfortable',
    textAlign = 'left',
  }) => {
    const cardContext = useContext(CardContext);

    if (!cardContext) {
      console.warn('[SpfxCard] Footer must be used within a Card component');
      return null;
    }

    const { isExpanded, isMaximized, size } = cardContext;

    // Calculate effective padding based on card size
    const effectivePadding = useMemo(() => {
      if (typeof padding === 'object' || typeof padding === 'string') {
        return padding;
      }

      switch (size) {
        case 'compact':
          return 'compact';
        case 'large':
          return 'spacious';
        default:
          return 'comfortable';
      }
    }, [padding, size]);

    // Memoized footer classes
    const footerClasses = useMemo(
      () =>
        [
          'spfx-card-footer',
          typeof effectivePadding === 'string' ? `padding-${effectivePadding}` : 'padding-custom',
          `text-${textAlign}`,
          !borderTop ? 'no-border' : '',
          isMaximized ? 'maximized' : '',
          className,
        ]
          .filter(Boolean)
          .join(' '),
      [effectivePadding, textAlign, borderTop, isMaximized, className]
    );

    // Memoized footer styles
    const footerStyle = useMemo(
      () => ({
        ...(backgroundColor && { backgroundColor }),
        ...(typeof effectivePadding === 'object' && { padding: getPaddingValue(effectivePadding) }),
        // Enhanced maximized view styling
        ...(isMaximized && {
          marginTop: 'auto',
          flexShrink: 0,
        }),
        ...style,
      }),
      [backgroundColor, effectivePadding, isMaximized, style]
    );

    // Don't render footer when card is collapsed (unless maximized)
    if (!isExpanded && !isMaximized) {
      return null;
    }

    return (
      <div className={footerClasses} style={footerStyle}>
        {children}
      </div>
    );
  }
);

Footer.displayName = 'EnhancedCardFooter';

export default Content;
