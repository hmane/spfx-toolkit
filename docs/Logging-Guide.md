# Logging Guide for SPFx Toolkit

## Overview

The SPFx Toolkit provides a comprehensive logging system through `SPContext.logger` with support for multiple log levels. This guide explains how to use the logger in your components and how to enable debug logging via URL parameters in consuming applications.

---

## Log Levels

The logger supports four log levels based on `@pnp/logging.LogLevel`:

| Level | Value | Method | Use Case | Visibility |
|-------|-------|--------|----------|------------|
| **Verbose** | 0 | `debug()` | Detailed debugging information | Only when debug mode enabled |
| **Info** | 1 | `info()`, `success()` | General informational messages | Normal operation |
| **Warning** | 2 | `warn()` | Warning messages that need attention | Always visible |
| **Error** | 3 | `error()` | Error messages | Always visible |

---

## Using the Logger in Your Code

### Basic Usage

```typescript
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Debug logs (only visible in debug mode)
SPContext.logger.debug('Processing item', { itemId: 123, action: 'update' });

// Info logs
SPContext.logger.info('Item processed successfully', { itemId: 123 });

// Success logs (info level with ✅ prefix)
SPContext.logger.success('Operation completed', { duration: 250 });

// Warning logs
SPContext.logger.warn('API rate limit approaching', { remaining: 10 });

// Error logs
SPContext.logger.error('Failed to save item', error, { itemId: 123 });
```

### Performance Timing

```typescript
// Start a timer
const timer = SPContext.logger.startTimer('fetchItems');

// Do some work
const items = await SPContext.sp.web.lists.getByTitle('Tasks').items();

// End timer (automatically logs duration)
const duration = timer(); // Returns duration in ms
```

### Runtime Log Level Control

```typescript
import { LogLevel } from '@pnp/logging';

// Get current log level
const currentLevel = SPContext.logger.getLevel();

// Set log level at runtime (if consuming app provides this capability)
SPContext.logger.setLevel(LogLevel.Verbose); // Enable debug logs
```

---

## Enabling Debug Mode in Consuming Applications

### Step 1: Read URL Parameters in Your Web Part

```typescript
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { LogLevel } from '@pnp/logging';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

export default class MyWebPart extends BaseClientSideWebPart<IMyWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();

    // Read log level from URL parameter
    const logLevel = this.getLogLevelFromUrl();

    // Initialize SPContext with the log level
    await SPContext.smart(this.context, 'MyWebPart');

    // Set log level if specified in URL
    if (logLevel !== undefined) {
      SPContext.logger.setLevel(logLevel);
      console.log(`Log level set to: ${LogLevel[logLevel]}`);
    }
  }

  /**
   * Read log level from URL query string
   * Supported formats:
   * - ?debug=true (sets to Verbose)
   * - ?logLevel=0 (Verbose)
   * - ?logLevel=1 (Info)
   * - ?logLevel=2 (Warning)
   * - ?logLevel=3 (Error)
   */
  private getLogLevelFromUrl(): LogLevel | undefined {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for ?debug=true
    const debugParam = urlParams.get('debug');
    if (debugParam === 'true' || debugParam === '1') {
      return LogLevel.Verbose;
    }

    // Check for ?logLevel=X
    const logLevelParam = urlParams.get('logLevel');
    if (logLevelParam !== null) {
      const level = parseInt(logLevelParam, 10);
      if (level >= 0 && level <= 3) {
        return level as LogLevel;
      }
    }

    return undefined;
  }

  // ... rest of web part code
}
```

### Step 2: Use in Your SharePoint URLs

```
# Enable debug logs (Verbose level)
https://contoso.sharepoint.com/sites/mysite/SitePages/MyPage.aspx?debug=true

# Set specific log level
https://contoso.sharepoint.com/sites/mysite/SitePages/MyPage.aspx?logLevel=0  # Verbose (debug)
https://contoso.sharepoint.com/sites/mysite/SitePages/MyPage.aspx?logLevel=1  # Info
https://contoso.sharepoint.com/sites/mysite/SitePages/MyPage.aspx?logLevel=2  # Warning
https://contoso.sharepoint.com/sites/mysite/SitePages/MyPage.aspx?logLevel=3  # Error
```

---

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ GOOD: Debug logs for detailed tracing
SPContext.logger.debug('Entering processItems', { count: items.length });
SPContext.logger.debug('Field values extracted', { title, status, assignedTo });

// ✅ GOOD: Info logs for important milestones
SPContext.logger.info('Batch operation started', { batchSize: 100 });

// ✅ GOOD: Warn for potential issues
SPContext.logger.warn('Deprecated method used', { method: 'getOldData' });

// ✅ GOOD: Error for failures
SPContext.logger.error('Permission check failed', error, { listName, itemId });

// ❌ BAD: Info logs for detailed debugging
SPContext.logger.info('Loop iteration', { index: i }); // Use debug() instead
```

### 2. Include Context Data

```typescript
// ✅ GOOD: Include relevant context
SPContext.logger.debug('API call started', {
  endpoint: '/api/items',
  method: 'POST',
  itemCount: 5,
  userId: currentUser.id
});

// ❌ BAD: No context
SPContext.logger.debug('API call started');
```

### 3. Don't Log Sensitive Data

```typescript
// ❌ BAD: Logging sensitive information
SPContext.logger.debug('User logged in', {
  username: user.email,
  password: credentials.password, // NEVER LOG PASSWORDS!
  token: authToken // NEVER LOG TOKENS!
});

// ✅ GOOD: Log safe information
SPContext.logger.debug('User logged in', {
  userId: user.id,
  timestamp: new Date().toISOString()
});
```

**Note**: The logger automatically redacts keys containing: `password`, `token`, `authorization`, `secret`, `key`

### 4. Use Timers for Performance Tracking

```typescript
// ✅ GOOD: Track performance of operations
const timer = SPContext.logger.startTimer('fetchAndProcessItems');

try {
  const items = await fetchItems();
  const processed = await processItems(items);

  const duration = timer(); // Logs: "Timer: fetchAndProcessItems { duration: 245 }"

  if (duration > 1000) {
    SPContext.logger.warn('Slow operation detected', { operation: 'fetchAndProcessItems', duration });
  }
} catch (error) {
  timer(); // Still log the duration even on error
  throw error;
}
```

---

## Advanced: Component-Specific Debug Mode

You can implement component-specific debug flags:

```typescript
export interface IMyComponentProps {
  // ... other props
  debugMode?: boolean;
}

export const MyComponent: React.FC<IMyComponentProps> = ({ debugMode, ...props }) => {

  useEffect(() => {
    if (debugMode) {
      SPContext.logger.debug('MyComponent mounted', { props });
    }
  }, [debugMode]);

  const handleClick = () => {
    if (debugMode) {
      SPContext.logger.debug('Button clicked', { buttonId: 'submit' });
    }

    // ... rest of handler
  };

  // ... rest of component
};
```

---

## Log Output Format

Logs appear in the browser console with the following format:

```
[ComponentName] Message (abc123)
{ data object }
```

Example:
```
[MyWebPart] Processing items (a1b2c3)
{ itemCount: 25, listName: 'Tasks' }
```

---

## Viewing Logs

### Browser Console

1. Open browser DevTools (F12)
2. Navigate to Console tab
3. Filter by component name: `[MyWebPart]`
4. Use browser filters to show/hide log levels

### Programmatic Access

```typescript
// Get all log entries
const entries = SPContext.logger.getEntries();

console.table(entries);

// Clear log history
SPContext.logger.clear();
```

---

## Example: Complete Web Part with Debug Support

```typescript
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { LogLevel } from '@pnp/logging';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

export interface IMyWebPartProps {
  title: string;
}

export default class MyWebPart extends BaseClientSideWebPart<IMyWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();

    // Read debug flag from URL
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === 'true';

    // Initialize SPContext
    if (debugMode) {
      // Development mode with debug logs
      await SPContext.development(this.context, 'MyWebPart');
    } else {
      // Smart mode (auto-detects environment)
      await SPContext.smart(this.context, 'MyWebPart');
    }

    SPContext.logger.info('Web part initialized', {
      title: this.properties.title,
      debugMode
    });
  }

  public render(): void {
    SPContext.logger.debug('Rendering web part', { title: this.properties.title });

    this.domElement.innerHTML = `
      <div>
        <h1>${this.properties.title}</h1>
        <button id="loadData">Load Data</button>
      </div>
    `;

    this.domElement.querySelector('#loadData')?.addEventListener('click', async () => {
      await this.loadData();
    });
  }

  private async loadData(): Promise<void> {
    const timer = SPContext.logger.startTimer('loadData');

    try {
      SPContext.logger.debug('Starting data load');

      const items = await SPContext.sp.web.lists
        .getByTitle('Tasks')
        .items
        .select('Title', 'Status')
        .top(10)();

      SPContext.logger.debug('Data loaded', { itemCount: items.length });

      const duration = timer();

      SPContext.logger.success('Data load completed', {
        itemCount: items.length,
        duration
      });

    } catch (error) {
      timer();
      SPContext.logger.error('Data load failed', error, {
        listName: 'Tasks'
      });
    }
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
```

---

## Troubleshooting

### Debug Logs Not Showing

1. **Check URL parameter**: Ensure `?debug=true` or `?logLevel=0` is in the URL
2. **Check initialization**: Verify `SPContext.smart()` or `SPContext.development()` is called
3. **Check browser console filters**: Ensure "Verbose" logs are not hidden in DevTools
4. **Check setLevel() call**: Verify `SPContext.logger.setLevel(LogLevel.Verbose)` is called after initialization

### Too Many Logs

```typescript
// Temporarily disable debug logs
SPContext.logger.setLevel(LogLevel.Info);

// Re-enable debug logs
SPContext.logger.setLevel(LogLevel.Verbose);
```

### Performance Impact

- Debug logs have minimal performance impact when disabled (level check is very fast)
- Logs are memory-bounded (default: 100 entries max)
- Use timers judiciously - they add small overhead

---

## Migration from console.*

Replace console calls with appropriate logger methods:

```typescript
// Before
console.log('User action', data);
console.warn('Deprecated', info);
console.error('Failed', error);

// After
SPContext.logger.debug('User action', data);  // or .info() if not debug-only
SPContext.logger.warn('Deprecated', info);
SPContext.logger.error('Failed', error);
```

---

## Summary

- Use `debug()` for detailed debugging information
- Use `info()` for general operational messages
- Use `warn()` for warnings
- Use `error()` for errors
- Consuming applications read URL parameters and set log level
- Debug mode is enabled via `?debug=true` or `?logLevel=0`
- Logger automatically sanitizes sensitive data
- Logs include component name and correlation ID

**Remember**: Debug logs are your friend during development and troubleshooting production issues!
