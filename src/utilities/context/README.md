# SPContext - SharePoint Context Management Utility

**SPContext** provides a clean, powerful API for managing SharePoint Framework application context with built-in performance monitoring, caching, and environment detection.

## Why SPContext?

SPContext simplifies SharePoint Framework development by providing:

- **Clean Property Access** - `SPContext.webAbsoluteUrl`, `SPContext.logger`, `SPContext.sp`
- **Smart Environment Detection** - Automatically configures for dev/uat/production
- **Built-in Performance Monitoring** - Track slow operations and health
- **Multiple Caching Strategies** - Memory, storage, and pessimistic caching
- **Culture & Localization Support** - Multi-language environment handling
- **Azure AD Integration** - Secure API calls to Azure Functions and Power Platform
- **TypeScript First** - Complete type safety with IntelliSense

## Installation

### 1. Install the Package

```bash
npm install spfx-toolkit
```

### 2. Install PnP Dependencies

Install PnP dependencies in your SPFx project:

```bash
npm install @pnp/sp@3.20.1 @pnp/logging@3.20.1 @pnp/queryable@3.20.1
```

### 3. Create PnP Imports File

Create `src/pnp-imports.ts` to import PnP side effects:

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
import '@pnp/sp/profiles';
```

## Quick Start

### Basic Setup

```typescript
// Import PnP side effects first
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

export default class MyWebPart extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    // Smart initialization - auto-detects environment
    await SPContext.smart(this.context, 'MyWebPart');
    return super.onInit();
  }

  public render(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    // Clean, simple API access
    const items = await SPContext.sp.web.lists.getByTitle('Tasks').items();

    SPContext.logger.info('Data loaded', {
      count: items.length,
      webTitle: SPContext.webTitle,
      user: SPContext.currentUser.displayName
    });
  }
}
```

## Core Properties

### Web Information

```typescript
// Web URLs and paths
SPContext.webAbsoluteUrl         // https://tenant.sharepoint.com/sites/mysite
SPContext.webServerRelativeUrl   // /sites/mysite
SPContext.tenantUrl              // https://tenant.sharepoint.com

// Web metadata
SPContext.webTitle               // "My SharePoint Site"
SPContext.webId                  // Web GUID as string
SPContext.applicationName        // Your SPFx component name
SPContext.correlationId          // Unique session identifier
```

### User Information

```typescript
// Complete user profile (fetched during initialization)
SPContext.currentUser.id          // SharePoint user ID
SPContext.currentUser.title       // Display name
SPContext.currentUser.email       // Email address
SPContext.currentUser.loginName   // Login name
SPContext.currentUser.value       // Same as loginName
SPContext.currentUser.department  // User's department (if available)
SPContext.currentUser.jobTitle    // Job title (if available)
SPContext.currentUser.sip         // SIP/phone (if available)
SPContext.currentUser.picture     // Profile picture URL (if available)
```

### List Context

When your component is in a list context, these properties are available:

```typescript
SPContext.listId                 // List GUID as string
SPContext.listTitle              // "Tasks"
SPContext.listServerRelativeUrl  // "/sites/mysite/Lists/Tasks"
```

### Environment & Culture

```typescript
// Environment detection
SPContext.environment            // 'dev', 'uat', or 'prod'
SPContext.isTeamsContext         // true if running in Microsoft Teams

// Localization
SPContext.currentUICultureName   // "en-US"
SPContext.currentCultureName     // "en-US"
SPContext.isRightToLeft         // true for RTL languages like Arabic
```

## Core Services

### SharePoint Operations

```typescript
// Standard SharePoint operations
const items = await SPContext.sp.web.lists.getByTitle('Documents').items();

// Cached operations (if caching enabled)
const cachedItems = await SPContext.spCached?.web.lists.getByTitle('Config').items();

// Pessimistic cached operations (if enabled)
const configData = await SPContext.spPessimistic?.web.lists.getByTitle('Settings').items();
```

### Logging

```typescript
// Structured logging with context
SPContext.logger.info('Operation started', {
  operation: 'loadUsers',
  webTitle: SPContext.webTitle
});

SPContext.logger.success('Operation completed', { count: 25 });
SPContext.logger.warn('Performance issue detected', { duration: 1500 });
SPContext.logger.error('Operation failed', error, { context: 'user-load' });

// Performance timing
const endTimer = SPContext.logger.startTimer('data-processing');
// ... do work ...
const duration = endTimer(); // Logs timing automatically
```

### Performance Monitoring

```typescript
// Track operation performance
const users = await SPContext.performance.track('loadUsers', async () => {
  return SPContext.sp.web.siteUsers.top(100)();
});

// Get performance insights
const metrics = SPContext.performance.getMetrics();
const avgTime = SPContext.performance.getAverageTime();
const slowOps = SPContext.performance.getSlowOperations(1000); // > 1 second
const failedOps = SPContext.performance.getFailedOperations();
```

### HTTP Client

```typescript
// Azure Function calls with authentication
const result = await SPContext.http.callFunction({
  url: 'https://myapp.azurewebsites.net/api/process',
  method: 'POST',
  data: { items: [1, 2, 3] },
  useAuth: true,
  resourceUri: 'api://your-app-id'
});

// Power Platform Flow triggers
const flowResult = await SPContext.http.triggerFlow({
  url: 'https://prod-123.westus.logic.azure.com/workflows/...',
  data: { userId: SPContext.currentUser.loginName },
  functionKey: 'your-flow-key',
  idempotencyKey: crypto.randomUUID()
});

// Standard HTTP calls
const response = await SPContext.http.get('https://api.example.com/data');
const postResponse = await SPContext.http.post('https://api.example.com/save', data);
```

## Initialization Options

### Smart Initialization (Recommended)

Automatically detects environment and applies optimal settings:

```typescript
await SPContext.smart(this.context, 'MyComponent');
```

### Environment-Specific Setup

```typescript
// Development: Verbose logging, no caching
await SPContext.development(this.context, 'MyComponent');

// Production: Minimal logging, optimized caching
await SPContext.production(this.context, 'MyComponent');

// Basic: Good for most scenarios
await SPContext.basic(this.context, 'MyComponent');

// Teams: Optimized for Microsoft Teams
await SPContext.teams(this.context, 'MyComponent');
```

### Custom Configuration

```typescript
await SPContext.initialize(this.context, {
  componentName: 'MyComponent',
  logging: {
    level: LogLevel.Info,
    enableConsole: true,
    enablePerformance: true
  },
  cache: {
    strategy: 'memory',
    ttl: 300000 // 5 minutes
  },
  http: {
    timeout: 30000,
    retries: 2,
    enableAuth: true
  }
});
```

## Real-World Examples

### Document Library Manager

```typescript
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

export default class DocumentManager extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    await SPContext.production(this.context, 'DocumentManager');
    return super.onInit();
  }

  private async uploadDocument(file: File): Promise<void> {
    try {
      // Track the entire operation
      await SPContext.performance.track('documentUpload', async () => {
        // Upload to SharePoint
        const result = await SPContext.sp.web
          .getFolderByServerRelativeUrl('/Shared Documents')
          .files.addUsingPath(file.name, file);

        SPContext.logger.success('Document uploaded', {
          fileName: file.name,
          fileSize: file.size,
          uploadedBy: SPContext.currentUser.displayName,
          webTitle: SPContext.webTitle
        });

        // Trigger processing workflow
        await SPContext.http.triggerFlow({
          url: this.properties.processingFlowUrl,
          data: {
            fileUrl: result.data.ServerRelativeUrl,
            fileName: file.name,
            webUrl: SPContext.webAbsoluteUrl,
            uploadedBy: SPContext.currentUser.loginName
          },
          functionKey: this.properties.flowKey,
          idempotencyKey: `upload-${file.name}-${Date.now()}`
        });
      });
    } catch (error) {
      SPContext.logger.error('Document upload failed', error, {
        fileName: file.name,
        webContext: {
          url: SPContext.webAbsoluteUrl,
          title: SPContext.webTitle
        }
      });
      throw error;
    }
  }
}
```

### Multi-Language Dashboard

```typescript
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

export default class Dashboard extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    await SPContext.smart(this.context, 'Dashboard');

    // Configure for user's language
    this.setupLocalization();

    return super.onInit();
  }

  private setupLocalization(): void {
    // Handle RTL languages
    if (SPContext.isRightToLeft) {
      this.domElement.classList.add('rtl-layout');
    }

    // Log localization context
    SPContext.logger.info('Dashboard localization configured', {
      culture: SPContext.currentUICultureName,
      isRTL: SPContext.isRightToLeft,
      webTitle: SPContext.webTitle
    });
  }

  private async loadDashboardData(): Promise<void> {
    try {
      // Use cached data for configuration
      const config = await SPContext.spCached?.web.lists
        .getByTitle('Dashboard Config').items() || [];

      // Fresh data for metrics
      const metrics = await SPContext.sp.web.lists
        .getByTitle('Metrics').items.top(50)();

      // Format dates according to user culture
      const formatter = new Intl.DateTimeFormat(SPContext.currentUICultureName);

      this.renderDashboard({
        config,
        metrics: metrics.map(m => ({
          ...m,
          formattedDate: formatter.format(new Date(m.Created))
        }))
      });

    } catch (error) {
      SPContext.logger.error('Dashboard load failed', error);
    }
  }
}
```

### Teams Integration

```typescript
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

export default class TeamsIntegration extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    if (SPContext.isTeamsContext) {
      await SPContext.teams(this.context, 'TeamsIntegration');
    } else {
      await SPContext.production(this.context, 'TeamsIntegration');
    }

    this.configureForContext();
    return super.onInit();
  }

  private configureForContext(): void {
    if (SPContext.isTeamsContext) {
      // Teams-specific configuration
      SPContext.logger.info('Configuring for Microsoft Teams', {
        webTitle: SPContext.webTitle,
        environment: SPContext.environment
      });

      this.domElement.classList.add('teams-context');
      this.applyTeamsTheme();
    } else {
      // Standard SharePoint configuration
      SPContext.logger.info('Configuring for SharePoint', {
        webTitle: SPContext.webTitle
      });

      this.applySharePointTheme();
    }
  }
}
```

## Health Monitoring

### Health Check API

```typescript
// Get comprehensive health information
const health = await SPContext.getHealthCheck();

if (!health.isHealthy) {
  SPContext.logger.warn('Health issues detected', health);
}

// Example health check result:
{
  isHealthy: true,
  issues: [
    {
      severity: 'medium',
      type: 'performance',
      message: '3 slow operations detected (>1000ms)',
      details: { slowestOperations: [...] },
      resolution: 'Consider optimizing queries or implementing caching'
    }
  ],
  recommendations: [
    'Enable caching for frequently accessed data'
  ],
  performance: {
    averageResponseTime: 245,
    slowOperations: 3,
    errorRate: 0.05
  }
}
```

### Context Summary

```typescript
// Get formatted context information for debugging
const summary = SPContext.getContextSummary();
console.log('Context Summary:', summary);

// Returns:
{
  basic: {
    webTitle: "My SharePoint Site",
    applicationName: "MyWebPart",
    correlationId: "abc12345"
  },
  urls: {
    webAbsoluteUrl: "https://tenant.sharepoint.com/sites/mysite",
    webServerRelativeUrl: "/sites/mysite",
    tenantUrl: "https://tenant.sharepoint.com"
  },
  user: {
    displayName: "John Doe",
    loginName: "john@company.com",
    email: "john@company.com"
  },
  environment: {
    name: "prod",
    displayName: "Production",
    isTeams: false,
    culture: "en-US",
    isRTL: false
  },
  performance: {
    averageTime: 245,
    totalOperations: 15,
    slowOperations: 0,
    failedOperations: 0
  }
}
```

## Utility Methods

### API URL Building

```typescript
// Build SharePoint REST API URLs
const listsUrl = SPContext.buildApiUrl('web/lists');
// Result: https://tenant.sharepoint.com/sites/mysite/_api/web/lists

const itemsUrl = SPContext.buildApiUrl('web/lists/getByTitle(\'Tasks\')/items');
// Result: https://tenant.sharepoint.com/sites/mysite/_api/web/lists/getByTitle('Tasks')/items
```

### Environment Detection

```typescript
// Check current environment
switch (SPContext.environment) {
  case 'dev':
    this.enableDebugFeatures();
    break;
  case 'uat':
    this.enableTestingFeatures();
    break;
  case 'prod':
    this.optimizeForProduction();
    break;
}

// Get user-friendly environment name
const envName = SPContext.getEnvironmentDisplayName(); // "Development", "Production", etc.
```

### Tenant Information

```typescript
// Get tenant details
const tenantInfo = SPContext.getTenantInfo();
// Returns: { name: "contoso", url: "https://contoso.sharepoint.com" }
```

## Caching Strategies

SPContext supports multiple caching strategies:

```typescript
// Memory caching (session-based)
await SPContext.initialize(this.context, {
  cache: { strategy: 'memory', ttl: 300000 } // 5 minutes
});

// Storage caching (persistent)
await SPContext.initialize(this.context, {
  cache: { strategy: 'storage', ttl: 600000 } // 10 minutes
});

// Pessimistic caching (for rarely changing data)
await SPContext.initialize(this.context, {
  cache: { strategy: 'pessimistic', ttl: 1800000 } // 30 minutes
});

// Use cached instances
const freshData = await SPContext.sp.web.lists.getByTitle('News').items();
const cachedData = await SPContext.spCached?.web.lists.getByTitle('Config').items();
const staticData = await SPContext.spPessimistic?.web.lists.getByTitle('Settings').items();
```

## Error Handling

```typescript
try {
  const data = await this.loadCriticalData();
} catch (error) {
  // Rich error logging with context
  SPContext.logger.error('Critical operation failed', error, {
    operation: 'loadCriticalData',
    user: SPContext.currentUser.loginName,
    web: {
      title: SPContext.webTitle,
      url: SPContext.webAbsoluteUrl
    },
    environment: SPContext.environment,
    correlationId: SPContext.correlationId
  });

  // Environment-specific error handling
  if (SPContext.environment === 'dev') {
    this.showDetailedError(error);
  } else {
    this.showUserFriendlyMessage();
  }
}
```

## Best Practices

### 1. Initialize Once

```typescript
// ✅ Good - Initialize in onInit()
protected async onInit(): Promise<void> {
  await SPContext.smart(this.context, 'MyWebPart');
  return super.onInit();
}

// ❌ Bad - Don't initialize multiple times
```

### 2. Use Smart Initialization

```typescript
// ✅ Good - Let SPContext detect environment
await SPContext.smart(this.context, 'MyComponent');

// ❌ Unnecessary - Manual environment detection
```

### 3. Leverage Performance Tracking

```typescript
// ✅ Good - Track important operations
const users = await SPContext.performance.track('loadUsers', async () => {
  return SPContext.sp.web.siteUsers();
});

// ✅ Good - Monitor performance regularly
const health = await SPContext.getHealthCheck();
```

### 4. Use Structured Logging

```typescript
// ✅ Good - Rich, structured logs
SPContext.logger.info('Operation completed', {
  operation: 'data-sync',
  itemCount: items.length,
  webTitle: SPContext.webTitle,
  duration: 1250
});

// ❌ Basic - Simple string logs
console.log('Operation completed');
```

### 5. Handle Different Contexts

```typescript
// ✅ Good - Context-aware behavior
if (SPContext.isTeamsContext) {
  this.applyTeamsOptimizations();
}

if (SPContext.isRightToLeft) {
  this.domElement.classList.add('rtl');
}
```

## API Reference

### Static Properties
- `webAbsoluteUrl`, `webServerRelativeUrl`, `tenantUrl`
- `webTitle`, `webId`, `applicationName`, `correlationId`
- `currentUser`, `listId`, `listTitle`, `listServerRelativeUrl`
- `environment`, `isTeamsContext`
- `currentUICultureName`, `currentCultureName`, `isRightToLeft`
- `sp`, `spCached`, `spPessimistic`
- `logger`, `http`, `performance`

### Static Methods
- `smart()`, `production()`, `development()`, `basic()`, `teams()`
- `initialize()`, `isReady()`, `reset()`, `addModule()`
- `getHealthCheck()`, `getContextSummary()`
- `buildApiUrl()`, `getEnvironmentDisplayName()`, `getTenantInfo()`

SPContext provides everything you need for robust, scalable SharePoint Framework development with built-in monitoring, performance tracking, and environment awareness!
