import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

/**
 * Default fallback component shown while lazy component is loading
 */
export interface ILazyLoadFallbackProps {
  /** Custom loading message */
  message?: string;
  /** Spinner size */
  size?: SpinnerSize;
  /** Minimum loading time in ms to prevent flash */
  minLoadingTime?: number;
}

/**
 * Default loading fallback component
 */
export const LazyLoadFallback: React.FC<ILazyLoadFallbackProps> = ({
  message = 'Loading component...',
  size = SpinnerSize.medium,
}) => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <Spinner size={size} label={message} />
    </div>
  );
};

/**
 * Error boundary for lazy loaded components
 */
interface ILazyLoadErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export interface ILazyLoadErrorBoundaryProps {
  /** Custom error message */
  errorMessage?: string;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Custom error component */
  errorComponent?: React.ReactNode;
  children: React.ReactNode;
}

export class LazyLoadErrorBoundary extends React.Component<
  ILazyLoadErrorBoundaryProps,
  ILazyLoadErrorBoundaryState
> {
  constructor(props: ILazyLoadErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): ILazyLoadErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('LazyLoad Error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.errorComponent) {
        return this.props.errorComponent;
      }

      return (
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline
          onDismiss={this.handleRetry}
          dismissButtonAriaLabel="Retry"
        >
          <strong>{this.props.errorMessage || 'Failed to load component'}</strong>
          <br />
          {this.state.error?.message}
        </MessageBar>
      );
    }

    return this.props.children;
  }
}

/**
 * Options for lazy loading a component
 */
export interface ILazyLoadOptions {
  /** Fallback component to show while loading */
  fallback?: React.ReactNode;
  /** Custom error message */
  errorMessage?: string;
  /** Callback when load error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Minimum time to show loading state (prevents flash) */
  minLoadingTime?: number;
}

/**
 * Creates a lazy-loaded component with automatic error boundary and loading state
 *
 * @param importFn - Function that returns a dynamic import promise
 * @param options - Lazy loading options
 * @returns Lazy loaded component wrapped with error boundary
 *
 * @example
 * ```tsx
 * // Basic usage
 * const LazyVersionHistory = createLazyComponent(
 *   () => import('./VersionHistory').then(m => ({ default: m.VersionHistory }))
 * );
 *
 * // With custom options
 * const LazyManageAccess = createLazyComponent(
 *   () => import('./ManageAccess').then(m => ({ default: m.ManageAccessComponent })),
 *   {
 *     fallback: <CustomSpinner />,
 *     errorMessage: 'Failed to load access management',
 *     minLoadingTime: 300
 *   }
 * );
 * ```
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: ILazyLoadOptions = {}
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = React.lazy(async () => {
    const startTime = Date.now();

    try {
      const module = await importFn();

      // Ensure minimum loading time to prevent flash
      if (options.minLoadingTime) {
        const elapsed = Date.now() - startTime;
        if (elapsed < options.minLoadingTime) {
          await new Promise(resolve => setTimeout(resolve, options.minLoadingTime! - elapsed));
        }
      }

      return module;
    } catch (error) {
      console.error('Failed to load lazy component:', error);
      throw error;
    }
  });

  const WrappedComponent: React.FC<React.ComponentProps<T>> = (props) => {
    const fallback = options.fallback || <LazyLoadFallback />;

    return (
      <LazyLoadErrorBoundary
        errorMessage={options.errorMessage}
        onError={options.onError}
      >
        <React.Suspense fallback={fallback}>
          <LazyComponent {...(props as any)} />
        </React.Suspense>
      </LazyLoadErrorBoundary>
    );
  };

  WrappedComponent.displayName = 'LazyLoadedComponent';

  return WrappedComponent;
}

/**
 * Hook to track if a lazy component has been loaded
 * Useful for preloading components before they're needed
 */
export function useLazyPreload<T>(
  importFn: () => Promise<{ default: T }>,
  preloadCondition: boolean = false
): void {
  React.useEffect(() => {
    if (preloadCondition) {
      importFn().catch(error => {
        console.warn('Failed to preload component:', error);
      });
    }
  }, [importFn, preloadCondition]);
}

/**
 * Preload a lazy component manually
 *
 * @example
 * ```tsx
 * // Preload on user interaction
 * <Button onMouseEnter={() => preloadComponent(() => import('./HeavyComponent'))}>
 *   Show Heavy Component
 * </Button>
 * ```
 */
export async function preloadComponent<T>(
  importFn: () => Promise<{ default: T }>
): Promise<void> {
  try {
    await importFn();
  } catch (error) {
    console.warn('Failed to preload component:', error);
  }
}
