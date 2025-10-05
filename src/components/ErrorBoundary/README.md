# SPFx Error Boundary Component

A production-ready React Error Boundary component designed specifically for SharePoint Framework (SPFx) applications. Provides graceful error handling with intelligent retry logic, user-friendly interfaces, and comprehensive debugging capabilities.

## Features

✅ **Smart Error Classification** - Automatically categorizes errors by severity (critical/high/medium/low) and type (network/permission/data/etc.)

✅ **Intelligent Retry Logic** - Context-aware retry attempts with exponential backoff (only retries recoverable errors)

✅ **User-Friendly UI** - Clean, accessible error displays with Fluent UI integration

✅ **SPFx Integration** - Extracts SharePoint context (modern & classic) for better debugging

✅ **Developer-Friendly** - Detailed error logging with stack traces in development mode

✅ **Accessibility First** - WCAG 2.1 AA compliant with ARIA live regions and focus management

✅ **TypeScript** - Complete type safety with IntelliSense support

✅ **Zero Dependencies** - Only requires React and Fluent UI (already in SPFx)

## Installation

Since this is part of your SPFx toolkit, it's already available:

```tsx
import { ErrorBoundary, ERROR_BOUNDARY_CONFIGS } from 'spfx-toolkit';
```

## Quick Start

### Basic Usage

```tsx
import { ErrorBoundary } from 'spfx-toolkit';

const MyWebPart: React.FC = () => (
  <ErrorBoundary>
    <MyComponent />
  </ErrorBoundary>
);
```

### With Configuration

```tsx
import { ErrorBoundary, ERROR_BOUNDARY_CONFIGS } from 'spfx-toolkit';

<ErrorBoundary
  {...ERROR_BOUNDARY_CONFIGS.STANDARD}
  onError={(error, errorInfo, errorDetails) => {
    // Custom error handling
    console.error('Component error:', errorDetails);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### SPFx Web Part Integration

```tsx
import { ErrorBoundary, ERROR_BOUNDARY_CONFIGS } from 'spfx-toolkit';

export default class MyWebPart extends BaseClientSideWebPart<IMyWebPartProps> {
  public render(): void {
    const element: React.ReactElement<IMyProps> = React.createElement(
      ErrorBoundary,
      {
        ...ERROR_BOUNDARY_CONFIGS.PRODUCTION,
        spfxContext: this.context, // Pass SPFx context for enhanced logging
        buildVersion: this.context.manifest.version,
        onError: (error, errorInfo, errorDetails) => {
          // Send to Application Insights or your logging service
          this.logToAppInsights(errorDetails);
        },
      },
      React.createElement(MyComponent, {
        context: this.context,
      })
    );

    ReactDom.render(element, this.domElement);
  }
}
```

## Predefined Configurations

### MINIMAL
For non-critical components that can fail gracefully:
```tsx
<ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.MINIMAL}>
  <OptionalWidget />
</ErrorBoundary>
```
- No retry functionality
- No details button
- Minimal logging

### STANDARD (Recommended)
Balanced configuration for most components:
```tsx
<ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.STANDARD}>
  <MyComponent />
</ErrorBoundary>
```
- 3 retry attempts
- Details button enabled
- Detailed logging

### ENHANCED
For critical components requiring maximum resilience:
```tsx
<ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.ENHANCED}>
  <CriticalDataComponent />
</ErrorBoundary>
```
- 5 retry attempts
- Verbose logging
- Full debug information

### DEVELOPMENT
For development environment with maximum debugging:
```tsx
<ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.DEVELOPMENT}>
  <MyComponent />
</ErrorBoundary>
```
- 10 retry attempts
- Full stack traces
- Component stack traces

### PRODUCTION
Conservative configuration for production:
```tsx
<ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.PRODUCTION}>
  <MyComponent />
</ErrorBoundary>
```
- 2 retry attempts
- No details button for end users
- Minimal console logging

## Advanced Usage

### Hook-based Error Handling

For async operations that need manual error handling:

```tsx
import { ErrorBoundary, useErrorHandler } from 'spfx-toolkit';

const MyComponent: React.FC = () => {
  const { captureError, resetError } = useErrorHandler();

  const handleAsyncOperation = async () => {
    try {
      resetError(); // Clear any previous errors
      await riskyAsyncOperation();
    } catch (error) {
      captureError(error); // Will trigger error boundary
    }
  };

  return <button onClick={handleAsyncOperation}>Do Something Risky</button>;
};

// Wrap with ErrorBoundary
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### Higher-Order Component Pattern

```tsx
import { withErrorBoundary, ERROR_BOUNDARY_CONFIGS } from 'spfx-toolkit';

const MyComponent: React.FC<IProps> = (props) => {
  return <div>My Component</div>;
};

export default withErrorBoundary(MyComponent, {
  ...ERROR_BOUNDARY_CONFIGS.STANDARD,
  onError: (error, errorInfo, errorDetails) => {
    console.error('HOC Error:', errorDetails);
  },
});
```

### Custom Error Messages

```tsx
<ErrorBoundary
  userFriendlyMessages={{
    title: 'Dashboard Error',
    description: 'Unable to load the dashboard. Please try refreshing or contact IT support.',
    retryButtonText: 'Reload Dashboard',
    detailsButtonText: 'Technical Details',
    maxRetriesReached: 'Unable to recover. Please contact support at ext. 1234',
  }}
>
  <Dashboard />
</ErrorBoundary>
```

### Integration with Application Insights

```tsx
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: { instrumentationKey: 'YOUR_KEY' }
});
appInsights.loadAppInsights();

<ErrorBoundary
  onError={(error, errorInfo, errorDetails) => {
    appInsights.trackException({
      exception: error,
      properties: {
        severity: errorDetails.severity,
        category: errorDetails.category,
        componentStack: errorDetails.componentStack,
        sessionId: errorDetails.sessionId,
        webUrl: errorDetails.spfxContext?.webAbsoluteUrl,
      },
    });
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### Layered Error Boundaries

Use multiple boundaries at different levels for granular error isolation:

```tsx
<ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.ENHANCED}> {/* App level */}
  <App>
    <ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.STANDARD}> {/* Feature level */}
      <DashboardSection>
        <ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.MINIMAL}> {/* Widget level */}
          <OptionalWidget />
        </ErrorBoundary>
      </DashboardSection>
    </ErrorBoundary>
  </App>
</ErrorBoundary>
```

## Configuration Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | required | Components to protect |
| `enableRetry` | boolean | true | Enable retry functionality |
| `maxRetries` | number | 3 | Maximum retry attempts |
| `showDetailsButton` | boolean | true | Show technical details button |
| `onError` | function | undefined | Error callback for custom logging |
| `enableConsoleLogging` | boolean | true | Log errors to console |
| `logLevel` | 'minimal' \| 'detailed' \| 'verbose' | 'detailed' | Console logging verbosity |
| `isDevelopment` | boolean | auto-detect | Show detailed debug info |
| `spfxContext` | WebPartContext | undefined | SPFx context for enhanced logging |
| `buildVersion` | string | undefined | App version for error tracking |
| `resetKeys` | array | undefined | Props that trigger boundary reset |
| `resetOnPropsChange` | boolean | true | Reset when children change |
| `userFriendlyMessages` | object | default messages | Custom user-facing messages |
| `className` | string | '' | Additional CSS class |
| `errorContainerStyle` | CSSProperties | {} | Inline styles for error container |

## Error Details Captured

The error boundary automatically captures:

- ✅ Error message and name
- ✅ Stack trace (development only)
- ✅ Component stack trace
- ✅ Timestamp
- ✅ Session ID (with automatic expiration)
- ✅ User agent
- ✅ Current URL
- ✅ Error severity (critical/high/medium/low)
- ✅ Error category (network/permission/data/etc.)
- ✅ Retry attempt number
- ✅ SharePoint context:
  - Web absolute URL
  - Site absolute URL
  - User ID and display name
  - Web title
  - Site and Web IDs

## Error Classification

Errors are automatically classified by:

### Severity Levels
- **Critical**: Security violations, memory errors, type errors
- **High**: Network failures, permission errors, API failures
- **Medium**: General application errors
- **Low**: Warnings, deprecation notices

### Categories
- **Network**: Fetch failures, CORS, timeouts
- **Permission**: Access denied, authentication failures
- **Data**: JSON parsing, invalid data, serialization
- **Performance**: Timeouts, memory issues
- **Security**: XSS, injection attempts
- **Component**: React rendering, hooks
- **Unknown**: Unclassified errors

### Retry Logic

The component automatically determines if an error should be retried based on its category:

**Retriable**: Network, Performance, Unknown
**Non-retriable**: Permission, Security, Component, Data

## Best Practices

### 1. Layer Your Error Boundaries
Use multiple boundaries at different levels for better error isolation:

```tsx
// App level - catches everything
<ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.ENHANCED}>
  <App>
    // Feature level - catches feature-specific errors
    <ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.STANDARD}>
      <FeatureSection>
        // Component level - lets minor components fail independently
        <ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.MINIMAL}>
          <OptionalWidget />
        </ErrorBoundary>
      </FeatureSection>
    </ErrorBoundary>
  </App>
</ErrorBoundary>
```

### 2. Use Appropriate Configurations

- **Critical features**: Use ENHANCED config
- **Standard features**: Use STANDARD config
- **Optional widgets**: Use MINIMAL config
- **Development**: Use DEVELOPMENT config
- **Production**: Use PRODUCTION config

### 3. Always Handle Async Errors

Error boundaries only catch errors during rendering, lifecycle methods, and constructors. For async code, use `useErrorHandler`:

```tsx
const MyComponent = () => {
  const { captureError } = useErrorHandler();

  const loadData = async () => {
    try {
      await fetchData();
    } catch (error) {
      captureError(error); // Triggers error boundary
    }
  };
};
```

### 4. Provide Context with onError

```tsx
<ErrorBoundary
  onError={(error, errorInfo, errorDetails) => {
    // Add business context
    const enhancedDetails = {
      ...errorDetails,
      userId: currentUser.id,
      feature: 'dashboard',
      userAction: 'loadData',
    };

    // Send to your logging service
    logToAppInsights(enhancedDetails);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### 5. Test Error Scenarios

Create test components that intentionally throw errors:

```tsx
const ErrorTestButton = () => {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('Test error');
  }

  return <button onClick={() => setShouldError(true)}>Trigger Error</button>;
};

// Test in development
<ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.DEVELOPMENT}>
  <ErrorTestButton />
</ErrorBoundary>
```

### 6. Monitor Error Rates

Set up alerts in your logging service for:
- High error rates (>5% of sessions)
- Critical errors
- Errors after maximum retries
- Specific error patterns

## Accessibility

The component is fully accessible:

- ✅ ARIA live regions announce errors to screen readers
- ✅ Focus management moves to error message
- ✅ Keyboard navigation fully supported
- ✅ ESC key closes details modal
- ✅ Proper ARIA labels on all interactive elements
- ✅ High contrast mode compatible
- ✅ Screen reader tested

## Browser Support

- ✅ Modern browsers (Chrome, Edge, Firefox, Safari)
- ✅ IE11 (with polyfills from SPFx)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## TypeScript Support

Full TypeScript support with exported types:

```tsx
import type {
  IErrorBoundaryProps,
  IErrorDetails,
  IErrorInfo,
  ErrorSeverity,
  ErrorCategory,
  ISPFxContext,
} from 'spfx-toolkit';
```

## Troubleshooting

### Error boundary not catching errors

Error boundaries only catch:
- Rendering errors
- Lifecycle method errors
- Constructor errors

They DON'T catch:
- Event handler errors (use try/catch or useErrorHandler)
- Async code errors (use try/catch or useErrorHandler)
- Server-side rendering errors
- Errors in the error boundary itself

### Retry not working

Check if the error category allows retries. Permission and Security errors are not retried automatically.

### Details modal not showing

Ensure `showDetailsButton` is set to `true` in your config.

## License

Part of the SPFx Toolkit - Internal Use

## Support

For issues or questions, contact the SPFx development team.
