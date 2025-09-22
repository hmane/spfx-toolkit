# SPContext - SharePoint Context Management

**SPContext** is part of the `spfx-toolkit` package, providing enterprise-grade context management for SharePoint Framework applications.

## Features

- **Smart Environment Detection** - Automatically detects dev/uat/production environments
- **Multiple Cache Strategies** - Memory, storage, and pessimistic caching
- **Azure AD Authentication** - Secure API calls to Azure Functions and Power Platform
- **Clean Property Access** - Simple `SPContext.sp`, `SPContext.logger` syntax
- **Performance Tracking** - Built-in metrics and monitoring
- **TypeScript Strict** - Complete type safety

## Installation & Setup

### 1. Install the Toolkit

```bash
npm install spfx-toolkit
```

### 2. Install PnP Dependencies

**Important:** Install PnP dependencies directly in your SPFx project:

```bash
npm install @pnp/sp@3.20.1 @pnp/logging@3.20.1 @pnp/queryable@3.20.1
```

### 3. Import PnP Side Effects

Create `src/pnp-imports.ts` in your SPFx project:

```typescript
// src/pnp-imports.ts
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/files';
import '@pnp/sp/folders';
import '@pnp/sp/site-users';
import '@pnp/sp/content-types';
import '@pnp/sp/fields';
```

## Quick Start

### Smart Setup (Recommended)

SPContext automatically detects your environment and applies appropriate settings:

```typescript
// Import PnP side effects first
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

export default class MyWebPart extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    // Smart setup - auto-detects environment
    await SPContext.smart(this.context, 'MyWebPart');
    return super.onInit();
  }

  public render(): void {
    // Clean property access
    const items = await SPContext.sp.web.lists.getByTitle('Tasks').items();
    SPContext.logger.info('WebPart rendered', { itemCount: items.length });
  }
}
```

### Environment-Specific Setup

```typescript
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

export default class MyWebPart extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    // Detect environment based on URL patterns (not process.env)
    const isLocalhost = window.location.hostname === 'localhost';
    const isWorkbench = window.location.pathname.includes('workbench');
    const isUAT = SPContext.webUrl.includes('/uat') || SPContext.webUrl.includes('/test');

    if (isLocalhost || isWorkbench) {
      await SPContext.development(this.context, 'MyWebPart');
    } else if (isUAT) {
      await SPContext.basic(this.context, 'MyWebPart');
    } else {
      await SPContext.production(this.context, 'MyWebPart');
    }

    return super.onInit();
  }
}
```

## Clean Import Patterns

Choose your preferred import style:

### Option 1: SPContext Properties (Recommended)

```typescript
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

await SPContext.smart(this.context, 'MyWebPart');

// Clean property access
const items = await SPContext.sp.web.lists.getByTitle('Tasks').items();
SPContext.logger.info('Data loaded');
const user = SPContext.currentUser;
```

### Option 2: Short Function Imports

```typescript
import './pnp-imports';
import { SPContext, sp, logger, http, context } from 'spfx-toolkit';

await SPContext.smart(this.context, 'MyWebPart');

// Short function access (returns instances directly)
const items = await sp.web.lists.getByTitle('Tasks').items();
logger.info('Data loaded');
const currentContext = context;
```

### Option 3: Traditional Getters

```typescript
import './pnp-imports';
import { QuickStart, getSp, getLogger, getHttp, getCurrentContext } from 'spfx-toolkit';

await QuickStart.basic(this.context, 'MyWebPart');

// Traditional getter functions
const items = await getSp().web.lists.getByTitle('Tasks').items();
getLogger().info('Data loaded');
const currentContext = getCurrentContext();
```

## Environment Detection

SPContext automatically detects your environment without relying on `process.env.NODE_ENV`:

```typescript
// Automatic detection based on:
// - localhost/workbench = development
// - URL contains /dev, /uat, /test = uat
// - Everything else = production

await SPContext.smart(this.context, 'MyWebPart');

console.log('Environment:', SPContext.environment); // 'development', 'uat', or 'production'
```

Manual environment setup:

```typescript
// Development: Verbose logging, no caching
await SPContext.development(this.context, 'MyWebPart');

// Basic: Good for UAT/testing
await SPContext.basic(this.context, 'MyWebPart');

// Production: Minimal logging, optimized caching
await SPContext.production(this.context, 'MyWebPart');

// Teams: Optimized for Teams environment
await SPContext.teams(this.context, 'MyWebPart');
```

## Usage Examples

### SharePoint Operations

```typescript
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

export default class DataWebPart extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    await SPContext.smart(this.context, 'DataWebPart');
    return super.onInit();
  }

  private async loadTasks(): Promise<void> {
    try {
      // Clean property access
      const tasks = await SPContext.sp.web.lists
        .getByTitle('Tasks')
        .items.select('Title', 'Status', 'AssignedTo/Title')
        .expand('AssignedTo')();

      SPContext.logger.success('Tasks loaded', {
        count: tasks.length,
        user: SPContext.currentUser.displayName,
      });

      this.renderTasks(tasks);
    } catch (error) {
      SPContext.logger.error('Failed to load tasks', error, {
        operation: 'loadTasks',
        siteUrl: SPContext.siteUrl,
      });
    }
  }
}
```

### Caching Strategies

```typescript
// Configure pessimistic caching for large datasets
await SPContext.initialize(this.context, {
  componentName: 'Dashboard',
  cache: { strategy: 'pessimistic', ttl: 600000 },
});

// Access different cached instances
const freshData = await SPContext.sp.web.lists.getByTitle('LiveData').items();
const cachedData = await SPContext.spPessimistic?.web.lists.getByTitle('Config').items();
```

### HTTP Client with Authentication

```typescript
// Azure Function with Azure AD
const result = await SPContext.http.callFunction({
  url: 'https://myapp.azurewebsites.net/api/process',
  method: 'POST',
  data: { items: [1, 2, 3] },
  useAuth: true,
  resourceUri: 'api://your-app-id',
});

// Power Platform Flow
const flowResult = await SPContext.http.triggerFlow({
  url: 'https://prod-123.westus.logic.azure.com/workflows/process/triggers/manual/invoke',
  data: { userId: SPContext.currentUser.loginName },
  functionKey: 'your-flow-key',
  idempotencyKey: crypto.randomUUID(),
});
```

### Performance Monitoring

```typescript
// Track operations
const users = await SPContext.performance.track('loadUsers', async () => {
  return SPContext.sp.web.siteUsers();
});

// Monitor performance
const slowOps = SPContext.performance.getSlowOperations(1000);
if (slowOps.length > 0) {
  SPContext.logger.warn('Slow operations detected', {
    count: slowOps.length,
    operations: slowOps.map(op => ({ name: op.name, duration: op.duration })),
  });
}
```

## Real-World Examples

### Document Management with Workflow

```typescript
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

export default class DocumentManager extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    await SPContext.production(this.context, 'DocumentManager');
    return super.onInit();
  }

  private async processDocument(file: File): Promise<void> {
    await SPContext.performance.track('documentProcessing', async () => {
      // 1. Upload to SharePoint
      const uploadResult = await SPContext.sp.web
        .getFolderByServerRelativeUrl('/Documents')
        .files.addUsingPath(file.name, file);

      SPContext.logger.success('File uploaded', {
        fileName: file.name,
        uploadedBy: SPContext.currentUser.displayName,
      });

      // 2. Trigger processing workflow
      await SPContext.http.triggerFlow({
        url: this.properties.workflowUrl,
        data: {
          fileUrl: uploadResult.data.ServerRelativeUrl,
          fileName: file.name,
          uploadedBy: SPContext.currentUser.loginName,
          siteUrl: SPContext.siteUrl,
        },
        functionKey: this.properties.workflowKey,
        idempotencyKey: `upload-${file.name}-${Date.now()}`,
      });

      SPContext.logger.success('Processing initiated', { fileName: file.name });
    });
  }
}
```

### Smart Dashboard with Auto-Environment Detection

```typescript
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

export default class SmartDashboard extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    // Smart detection chooses optimal settings for environment
    await SPContext.smart(this.context, 'SmartDashboard');

    SPContext.logger.info('Dashboard initialized', {
      environment: SPContext.environment,
      siteUrl: SPContext.siteUrl,
      user: SPContext.currentUser.displayName,
    });

    return super.onInit();
  }

  private async loadDashboard(): Promise<void> {
    try {
      // Use pessimistic cache if available for config data
      const config = await SPContext.performance.track('loadConfig', () =>
        (SPContext.spPessimistic || SPContext.sp).web.lists.getByTitle('DashboardConfig').items()
      );

      // Always fresh data for metrics
      const metrics = await SPContext.performance.track('loadMetrics', () =>
        SPContext.sp.web.lists.getByTitle('LiveMetrics').items.top(50)()
      );

      this.renderDashboard({ config, metrics });

      SPContext.logger.success('Dashboard loaded', {
        configItems: config.length,
        metricsItems: metrics.length,
        environment: SPContext.environment,
      });
    } catch (error) {
      SPContext.logger.error('Dashboard load failed', error, {
        environment: SPContext.environment,
        siteUrl: SPContext.siteUrl,
      });
    }
  }
}
```

## Property Reference

### SPContext Static Properties

```typescript
// Core instances
SPContext.sp; // Regular SharePoint instance
SPContext.spCached; // Cached SharePoint instance
SPContext.spPessimistic; // Pessimistic cached instance
SPContext.logger; // Logger instance
SPContext.http; // HTTP client
SPContext.performance; // Performance tracker

// Context information
SPContext.context; // Full context object
SPContext.spfxContext; // Raw SPFx context
SPContext.pageContext; // SPFx page context
SPContext.currentUser; // Current user info
SPContext.environment; // 'development', 'uat', 'production'
SPContext.siteUrl; // Site collection URL
SPContext.webUrl; // Web URL

// Utility methods
SPContext.isReady(); // Check if initialized
SPContext.reset(); // Reset context
SPContext.addModule(); // Add custom module
```

## Best Practices

1. **Use `SPContext.smart()`** for automatic environment detection
2. **Import PnP side effects first** before using SPContext
3. **Use property access** (`SPContext.sp`) for cleaner code
4. **Initialize once** in onInit() method
5. **Monitor performance** in production with SPContext.performance
6. **Use structured logging** with SPContext.logger

## Troubleshooting

### Environment Detection Issues

```typescript
// Check detected environment
console.log('Detected environment:', SPContext.environment);

// Manual override if needed
await SPContext.production(this.context, 'MyWebPart'); // Force production
```

### PnP Import Issues

```typescript
// Validate setup
import { validateSPContextSetup } from 'spfx-toolkit';

const validation = validateSPContextSetup();
if (!validation.isValid) {
  console.warn('Setup issues:', validation.issues);
}
```

SPContext provides a clean, modern API for SharePoint Framework development with automatic environment detection and optimized performance!
