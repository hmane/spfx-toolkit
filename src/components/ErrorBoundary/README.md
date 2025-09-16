# SPFx Error Boundary Component

A comprehensive React Error Boundary component designed specifically for SharePoint Framework (SPFx) applications. Provides graceful error handling with user-friendly interfaces and detailed developer debugging information.

## Features

- **User-Friendly Error Display**: Clean, professional error messages that don't overwhelm users
- **Developer Debug Information**: Detailed stack traces, component stacks, and error context in development mode
- **Retry Functionality**: Configurable retry attempts with automatic reset
- **Remote Logging**: Integration hooks for Application Insights, LogRocket, or custom logging services
- **SharePoint Context Integration**: Captures SPFx-specific context information
- **Responsive Design**: Mobile-friendly error displays
- **Accessibility**: Full WCAG 2.1 AA compliance
- **TypeScript**: Complete type safety and IntelliSense support

## Quick Start

```tsx
import { ErrorBoundary } from 'spfx-toolkit';

const MyWebPart: React.FC = () => (
  <ErrorBoundary>
    <MyComponent />
  </ErrorBoundary>
);
```

## Basic Usage

### Simple Error Boundary
```tsx
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### With Custom Configuration
```tsx
<ErrorBoundary
  enableRetry={true}
  maxRetries={3}
  showDetailsButton={true}
  onError={(error, errorInfo, errorDetails) => {
    console.error('Component error:', { error, errorInfo, errorDetails });
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### Using Predefined Configurations
```tsx
import { ErrorBoundary, ERROR_BOUNDARY_CONFIGS } from 'spfx-toolkit';

// For development
<ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.DEVELOPMENT}>
  <MyComponent />
</ErrorBoundary>

// For production
<ErrorBoundary {...ERROR_BOUNDARY_CONFIGS.PRODUCTION}>
  <MyComponent />
</ErrorBoundary>
```

## Advanced Usage

### Higher-Order Component Pattern
```tsx
const MyComponentWithErrorBoundary = withErrorBoundary(MyComponent, {
  enableRetry: true,
  maxRetries: 5,
  showDetailsButton: true,
});
```

### Hook-based Error Handling
```tsx
const MyComponent: React.FC = () => {
  const { captureError, resetError } = useErrorHandler();

  const handleAsyncError = async () => {
    try {
      await riskyAsyncOperation();
    } catch (error) {
      captureError(error); // Will trigger error boundary
    }
  };

  return <button onClick={handleAsyncError}>Do Something Risky</button>;
};
```

### SharePoint-Specific Error Boundary
```tsx
const SPWebPart: React.FC<{ context: WebPartContext }> = ({ context }) => (
  <ErrorBoundary
    onError={(error, errorInfo, errorDetails) => {
      // Enhanced with SharePoint context
      const spErrorDetails = {
        ...errorDetails,
        webUrl: context.pageContext.web.absoluteUrl,
        userDisplayName: context.pageContext.user.displayName,
        webPartId: context.instanceId,
      };

      // Send to Application Insights or SharePoint list
      logErrorToAppInsights(spErrorDetails);
    }}
    buildVersion={context.manifest.version}
  >
    <WebPartContent />
  </ErrorBoundary>
);
```

## Configuration Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableRetry` | boolean | true | Enable retry functionality |
| `maxRetries` | number | 3 | Maximum number of retry attempts |
| `showDetailsButton` | boolean | true | Show technical details button |
| `onError` | function | undefined | Error callback for logging |
| `enableConsoleLogging` | boolean | true | Log errors to console |
| `enableRemoteLogging` | boolean | false | Enable remote logging |
| `isDevelopment` | boolean | auto-detect | Show detailed debug info |
| `resetKeys` | array | undefined | Props that trigger reset |
| `userFriendlyMessages` | object | default messages | Custom user messages |

## Predefined Configurations

### MINIMAL
- No retry functionality
- No details button
- Minimal logging
- Perfect for non-critical components

### STANDARD
- Basic retry (3 attempts)
- Details button enabled
- Console logging
- Good for most components

### ENHANCED
- Extended retry (5 attempts)
- Full logging capabilities
- Remote logging enabled
- Best for critical components

### DEVELOPMENT
- Maximum retries (10)
- Verbose logging
- Full debug information
- Development environment

### PRODUCTION
- Conservative retry (2 attempts)
- No details button for users
- Remote logging only
- Production environment

## Error Details Captured

The error boundary automatically captures:

- Error message and stack trace
- Component stack where error occurred
- Timestamp and session information
- User agent and URL
- SharePoint context (when available)
- User information
- Build version

## Custom Fallback Components

```tsx
const CustomErrorFallback: React.FC<IErrorFallbackProps> = ({
  error,
  onRetry,
  retryCount,
  maxRetries
}) => (
  <div className="my-custom-error">
    <h2>Oops! Something went wrong</h2>
    <p>{error.message}</p>
    {retryCount < maxRetries && (
      <button onClick={onRetry}>Try Again</button>
    )}
  </div>
);

<ErrorBoundary fallbackComponent={CustomErrorFallback}>
  <MyComponent />
</ErrorBoundary>
```

## Integration with Logging Services

### Application Insights
```tsx
const handleError = (error, errorInfo, errorDetails) => {
  window.appInsights?.trackException({
    exception: error,
    properties: errorDetails,
    measurements: {
      retryCount: errorDetails.retryCount
    }
  });
};
```

### LogRocket
```tsx
const handleError = (error, errorInfo, errorDetails) => {
  window.LogRocket?.captureException(error, {
    tags: {
      section: 'error-boundary'
    },
    extra: errorDetails
  });
};
```

## Best Practices

1. **Layer Your Error Boundaries**: Use multiple boundaries at different levels
   ```tsx
   <ErrorBoundary {...ENHANCED}> {/* App level */}
     <ErrorBoundary {...STANDARD}> {/* Feature level */}
       <ErrorBoundary {...MINIMAL}> {/* Component level */}
         <RiskyComponent />
       </ErrorBoundary>
     </ErrorBoundary>
   </ErrorBoundary>
   ```

2. **Handle Async Errors**: Use the `useErrorHandler` hook for async operations

3. **Provide Context**: Include meaningful error context in your `onError` callback

4. **Test Error Scenarios**: Create components that intentionally throw errors during development

5. **Monitor Error Rates**: Set up alerts in your logging service for high error rates

## Accessibility Features

- Screen reader announcements for errors
- Keyboard navigation support
- High contrast mode compatibility
- Focus management after errors
- ARIA labels and descriptions

## Browser Support

- Internet Explorer 11+
- Edge (all versions)
- Chrome 70+
- Firefox 65+
- Safari 12+

## Styling

The component includes default CSS classes for customization:

```css
.spfx-error-boundary { /* Main container */ }
.spfx-error-boundary-container { /* Error content */ }
.spfx-error-details-modal { /* Details modal */ }
```

Supports dark mode and high contrast themes automatically.

## License

MIT License
