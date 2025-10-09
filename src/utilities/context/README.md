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

## Installation & Tree-Shaking

### 🎯 CRITICAL: Use Tree-Shakable Imports

**Always use specific imports to minimize bundle size.** The main package import can add 200-500KB+ to your bundle.

```typescript
// ✅ EXCELLENT: Tree-shakable imports (saves 200-500KB+)
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// ❌ AVOID: Main package import (imports entire toolkit)
import { SPContext } from 'spfx-toolkit';
```

### 1. Install the Package

```bash
npm install spfx-toolkit
```

### 2. Install PnP Dependencies

Install PnP dependencies in your SPFx project:

```bash
npm install @pnp/sp@3.20.1 @pnp/logging@3.20.1 @pnp/queryable@3.20.1
```

### 3. Tree-Shakable PnP Module Imports

SPContext automatically imports core PnP modules (`webs`, `site-users`, `profiles`). For additional functionality, import specific modules to keep bundle size minimal:

#### 🚀 Tree-Shakable PnP Imports (Recommended)

```typescript
// Import only the PnP functionality you need - these are side effects that enhance SPContext.sp
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists'; // lists, items, batching, views
import 'spfx-toolkit/lib/utilities/context/pnpImports/files'; // files, folders, attachments
import 'spfx-toolkit/lib/utilities/context/pnpImports/search'; // search API
import 'spfx-toolkit/lib/utilities/context/pnpImports/taxonomy'; // managed metadata
import 'spfx-toolkit/lib/utilities/context/pnpImports/security'; // permissions, sharing

// Tree-shakable SPContext import
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

export default class MyWebPart extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    await SPContext.smart(this.context, 'MyWebPart');
    return super.onInit();
  }

  private async example(): Promise<void> {
    // These methods are now available thanks to the specific imports above:
    const items = await SPContext.sp.web.lists.getByTitle('Tasks').items();
    const file = await SPContext.sp.web.getFileByServerRelativeUrl('/doc.docx');
    const results = await SPContext.sp.search('ContentType:Document');
  }
}
```

#### 📊 Bundle Size Impact

| Import Method                                          | Bundle Size Impact | When to Use                        |
| ------------------------------------------------------ | ------------------ | ---------------------------------- |
| `spfx-toolkit/lib/utilities/context`                   | **+15-25KB**       | ✅ Always use this                 |
| `spfx-toolkit/lib/utilities/context/pnpImports/lists`  | **+20-30KB**       | When you need list operations      |
| `spfx-toolkit/lib/utilities/context/pnpImports/files`  | **+15-25KB**       | When you need file operations      |
| `spfx-toolkit/lib/utilities/context/pnpImports/search` | **+10-15KB**       | When you need search functionality |
| `spfx-toolkit` (main package)                          | **+200-500KB**     | ❌ Never use - imports everything  |

**Note:** These imports are side effects that enhance the `SPContext.sp` object with additional methods. No additional exports or setup required - just import and the methods become available!

#### Available Import Modules (Tree-Shakable)

| Module    | Import Path                                              | Bundle Impact | Includes                                | Use Case             |
| --------- | -------------------------------------------------------- | ------------- | --------------------------------------- | -------------------- |
| Core      | `spfx-toolkit/lib/utilities/context/pnpImports/core`     | Auto-imported | webs, site-users, profiles              | Base functionality   |
| Lists     | `spfx-toolkit/lib/utilities/context/pnpImports/lists`    | **+20-30KB**  | lists, items, batching, views           | List operations      |
| Files     | `spfx-toolkit/lib/utilities/context/pnpImports/files`    | **+15-25KB**  | files, folders, attachments             | File management      |
| Content   | `spfx-toolkit/lib/utilities/context/pnpImports/content`  | **+10-15KB**  | content-types, fields, column-defaults  | Content structure    |
| Search    | `spfx-toolkit/lib/utilities/context/pnpImports/search`   | **+10-15KB**  | search                                  | Search functionality |
| Taxonomy  | `spfx-toolkit/lib/utilities/context/pnpImports/taxonomy` | **+25-35KB**  | taxonomy                                | Managed metadata     |
| Security  | `spfx-toolkit/lib/utilities/context/pnpImports/security` | **+15-20KB**  | security, sharing                       | Permissions          |
| Features  | `spfx-toolkit/lib/utilities/context/pnpImports/features` | **+10-15KB**  | features, navigation, regional-settings | Site features        |
| Pages     | `spfx-toolkit/lib/utilities/context/pnpImports/pages`    | **+20-30KB**  | clientside-pages, comments              | Modern pages         |
| Social    | `spfx-toolkit/lib/utilities/context/pnpImports/social`   | **+10-15KB**  | comments, likes, favorites              | Social features      |
| Apps      | `spfx-toolkit/lib/utilities/context/pnpImports/apps`     | **+10-15KB**  | appcatalog                              | App management       |
| Hub Sites | `spfx-toolkit/lib/utilities/context/pnpImports/hubsites` | **+5-10KB**   | hubsites                                | Hub site operations  |

#### ✅ Tree-Shaking Examples by Use Case

**Basic List Operations (Minimal Bundle Impact):**

```typescript
// Only import what you need for lists
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Bundle impact: ~20-30KB additional
// Now you can use: lists, items, batching, views
const batch = SPContext.sp.web.createBatch();
batch.query(SPContext.sp.web.lists.getByTitle('Tasks').items);
await batch.execute();
```

**File Management:**

```typescript
// Only import file operations
import 'spfx-toolkit/lib/utilities/context/pnpImports/files';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Bundle impact: ~15-25KB additional
// Now you can use: files, folders, attachments
const file = await SPContext.sp.web.getFileByServerRelativeUrl('/Documents/test.docx');
```

**Search Operations:**

```typescript
// Only import search functionality
import 'spfx-toolkit/lib/utilities/context/pnpImports/search';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Bundle impact: ~10-15KB additional
// Now you can use: search API
const results = await SPContext.sp.search('ContentType:Document');
```

**Multiple Modules (Choose Only What You Need):**

```typescript
// Import only the specific modules your component uses
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists'; // +20-30KB
import 'spfx-toolkit/lib/utilities/context/pnpImports/files'; // +15-25KB
import 'spfx-toolkit/lib/utilities/context/pnpImports/search'; // +10-15KB
import { SPContext } from 'spfx-toolkit/lib/utilities/context'; // +15-25KB

// Total impact: ~60-95KB (vs 200-500KB+ for full package import)
```

#### ❌ What NOT to Do (Bundle Bloat)

```typescript
// ❌ NEVER: Imports entire toolkit (200-500KB+)
import { SPContext } from 'spfx-toolkit';

// ❌ AVOID: Importing modules you don't use
import 'spfx-toolkit/lib/utilities/context/pnpImports/taxonomy'; // +25-35KB
import 'spfx-toolkit/lib/utilities/context/pnpImports/social'; // +10-15KB
// ... when you only need basic list operations
```

## Quick Start

### Tree-Shakable Setup (Recommended)

```typescript
// Import only the PnP modules you need
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

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
    // Clean, simple API access with batching support
    const batch = SPContext.sp.web.createBatch();
    batch.query(SPContext.sp.web.lists.getByTitle('Tasks').items);
    const results = await batch.execute();

    SPContext.logger.info('Data loaded', {
      count: results[0].length,
      webTitle: SPContext.webTitle,
      user: SPContext.currentUser.title,
    });
  }
}
```

## Core Properties

### Web Information

```typescript
// Web URLs and paths
SPContext.webAbsoluteUrl; // https://tenant.sharepoint.com/sites/mysite
SPContext.webServerRelativeUrl; // /sites/mysite
SPContext.tenantUrl; // https://tenant.sharepoint.com

// Web metadata
SPContext.webTitle; // "My SharePoint Site"
SPContext.webId; // Web GUID as string
SPContext.applicationName; // Your SPFx component name
SPContext.correlationId; // Unique session identifier
```

### User Information

```typescript
// Complete user profile (fetched during initialization)
SPContext.currentUser.id; // SharePoint user ID
SPContext.currentUser.title; // Display name
SPContext.currentUser.email; // Email address
SPContext.currentUser.loginName; // Login name
SPContext.currentUser.value; // Same as loginName
SPContext.currentUser.department; // User's department (if available)
SPContext.currentUser.jobTitle; // Job title (if available)
SPContext.currentUser.sip; // SIP/phone (if available)
SPContext.currentUser.picture; // Profile picture URL (if available)
```

### List Context

When your component is in a list context, these properties are available:

```typescript
SPContext.listId; // List GUID as string
SPContext.listTitle; // "Tasks"
SPContext.listServerRelativeUrl; // "/sites/mysite/Lists/Tasks"
```

### Environment & Culture

```typescript
// Environment detection
SPContext.environment; // 'dev', 'uat', or 'prod'
SPContext.isTeamsContext; // true if running in Microsoft Teams

// Localization
SPContext.currentUICultureName; // "en-US"
SPContext.currentCultureName; // "en-US"
SPContext.isRightToLeft; // true for RTL languages like Arabic
```

## Core Services

### SharePoint Operations

```typescript
// Standard SharePoint operations (always fresh data)
const items = await SPContext.sp.web.lists.getByTitle('Documents').items();

// Cached operations (uses caching if enabled, otherwise same as sp)
const cachedItems = await SPContext.spCached.web.lists.getByTitle('Config').items();

// Pessimistic cached operations (uses pessimistic caching if enabled, otherwise same as sp)
const configData = await SPContext.spPessimistic.web.lists.getByTitle('Settings').items();
```

### Logging

```typescript
// Structured logging with context
SPContext.logger.info('Operation started', {
  operation: 'loadUsers',
  webTitle: SPContext.webTitle,
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
  resourceUri: 'api://your-app-id',
});

// Power Platform Flow triggers
const flowResult = await SPContext.http.triggerFlow({
  url: 'https://prod-123.westus.logic.azure.com/workflows/...',
  data: { userId: SPContext.currentUser.loginName },
  functionKey: 'your-flow-key',
  idempotencyKey: crypto.randomUUID(),
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
    enablePerformance: true,
  },
  cache: {
    strategy: 'memory',
    ttl: 300000, // 5 minutes
  },
  http: {
    timeout: 30000,
    retries: 2,
    enableAuth: true,
  },
});
```

## Real-World Examples

### Document Library Manager

```typescript
// Tree-shakable imports for file operations
import 'spfx-toolkit/lib/utilities/context/pnpImports/files';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

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
          webTitle: SPContext.webTitle,
        });

        // Trigger processing workflow
        await SPContext.http.triggerFlow({
          url: this.properties.processingFlowUrl,
          data: {
            fileUrl: result.data.ServerRelativeUrl,
            fileName: file.name,
            webUrl: SPContext.webAbsoluteUrl,
            uploadedBy: SPContext.currentUser.loginName,
          },
          functionKey: this.properties.flowKey,
          idempotencyKey: `upload-${file.name}-${Date.now()}`,
        });
      });
    } catch (error) {
      SPContext.logger.error('Document upload failed', error, {
        fileName: file.name,
        webContext: {
          url: SPContext.webAbsoluteUrl,
          title: SPContext.webTitle,
        },
      });
      throw error;
    }
  }
}
```

### Multi-Language Dashboard

```typescript
// Tree-shakable imports for list operations
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

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
      webTitle: SPContext.webTitle,
    });
  }

  private async loadDashboardData(): Promise<void> {
    try {
      // Use cached data for configuration (always available)
      const config = await SPContext.spCached.web.lists.getByTitle('Dashboard Config').items();

      // Fresh data for metrics
      const metrics = await SPContext.sp.web.lists.getByTitle('Metrics').items.top(50)();

      // Format dates according to user culture
      const formatter = new Intl.DateTimeFormat(SPContext.currentUICultureName);

      this.renderDashboard({
        config,
        metrics: metrics.map(m => ({
          ...m,
          formattedDate: formatter.format(new Date(m.Created)),
        })),
      });
    } catch (error) {
      SPContext.logger.error('Dashboard load failed', error);
    }
  }
}
```

### Teams Integration

```typescript
// Core functionality only - no additional PnP imports needed
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

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
        environment: SPContext.environment,
      });

      this.domElement.classList.add('teams-context');
      this.applyTeamsTheme();
    } else {
      // Standard SharePoint configuration
      SPContext.logger.info('Configuring for SharePoint', {
        webTitle: SPContext.webTitle,
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

const itemsUrl = SPContext.buildApiUrl("web/lists/getByTitle('Tasks')/items");
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

SPContext supports multiple caching strategies. All SP instances are always available regardless of caching configuration:

```typescript
// Memory caching (session-based)
await SPContext.initialize(this.context, {
  cache: { strategy: 'memory', ttl: 300000 }, // 5 minutes
});

// Storage caching (persistent)
await SPContext.initialize(this.context, {
  cache: { strategy: 'storage', ttl: 600000 }, // 10 minutes
});

// Pessimistic caching (for rarely changing data)
await SPContext.initialize(this.context, {
  cache: { strategy: 'pessimistic', ttl: 1800000 }, // 30 minutes
});

// All instances are always available - smart fallback behavior:
const freshData = await SPContext.sp.web.lists.getByTitle('News').items(); // Always fresh
const cachedData = await SPContext.spCached.web.lists.getByTitle('Config').items(); // Cached if enabled, otherwise fresh
const staticData = await SPContext.spPessimistic.web.lists.getByTitle('Settings').items(); // Pessimistic if enabled, otherwise fresh
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
      url: SPContext.webAbsoluteUrl,
    },
    environment: SPContext.environment,
    correlationId: SPContext.correlationId,
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

### 1. Always Use Tree-Shakable Imports

```typescript
// ✅ EXCELLENT: Minimal bundle impact
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// ✅ GOOD: Import only needed PnP modules
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists';

// ❌ NEVER: Imports entire toolkit
import { SPContext } from 'spfx-toolkit';
```

### 2. Import Only What You Need

```typescript
// ✅ Good - Only import modules your component uses
import 'spfx-toolkit/lib/utilities/context/pnpImports/lists'; // For list operations
import 'spfx-toolkit/lib/utilities/context/pnpImports/files'; // For file operations

// ❌ Bad - Importing unused modules
import 'spfx-toolkit/lib/utilities/context/pnpImports/taxonomy'; // Not needed for basic operations
```

### 3. Monitor Bundle Size Impact

Use SPFx bundle analysis to track your imports:

```bash
# In your SPFx project
gulp bundle --ship --analyze-bundle
```

Check the webpack-bundle-analyzer output to ensure your imports are optimized.

### 4. Initialize Once

```typescript
// ✅ Good - Initialize in onInit()
protected async onInit(): Promise<void> {
  await SPContext.smart(this.context, 'MyWebPart');
  return super.onInit();
}

// ❌ Bad - Don't initialize multiple times
```

### 5. Use Smart Initialization

```typescript
// ✅ Good - Let SPContext detect environment
await SPContext.smart(this.context, 'MyComponent');

// ❌ Unnecessary - Manual environment detection
```

### 6. Leverage Performance Tracking

```typescript
// ✅ Good - Track important operations
const users = await SPContext.performance.track('loadUsers', async () => {
  return SPContext.sp.web.siteUsers();
});

// ✅ Good - Monitor performance regularly
const health = await SPContext.getHealthCheck();
```

### 7. Use Structured Logging

```typescript
// ✅ Good - Rich, structured logs
SPContext.logger.info('Operation completed', {
  operation: 'data-sync',
  itemCount: items.length,
  webTitle: SPContext.webTitle,
  duration: 1250,
});

// ❌ Basic - Simple string logs
console.log('Operation completed');
```

### 8. Handle Different Contexts

```typescript
// ✅ Good - Context-aware behavior
if (SPContext.isTeamsContext) {
  this.applyTeamsOptimizations();
}

if (SPContext.isRightToLeft) {
  this.domElement.classList.add('rtl');
}
```

### 9. Bundle Size Optimization Checklist

- [ ] Use `spfx-toolkit/lib/utilities/context` instead of `spfx-toolkit`
- [ ] Import only needed PnP modules (`lists`, `files`, etc.)
- [ ] Run `gulp bundle --ship --analyze-bundle` to verify bundle size
- [ ] Remove unused imports
- [ ] Consider lazy loading for rarely used features

## API Reference

### Static Properties

- `webAbsoluteUrl`, `webServerRelativeUrl`, `tenantUrl`
- `webTitle`, `webId`, `applicationName`, `correlationId`
- `currentUser`, `listId`, `listTitle`, `listServerRelativeUrl`
- `environment`, `isTeamsContext`
- `currentUICultureName`, `currentCultureName`, `isRightToLeft`
- `sp`, `spCached`, `spPessimistic` (all always available)
- `logger`, `http`, `performance`

### Static Methods

- `smart()`, `production()`, `development()`, `basic()`, `teams()`
- `initialize()`, `isReady()`, `reset()`, `addModule()`
- `getHealthCheck()`, `getContextSummary()`
- `buildApiUrl()`, `getEnvironmentDisplayName()`, `getTenantInfo()`

SPContext provides everything you need for robust, scalable SharePoint Framework development with built-in monitoring, performance tracking, and environment awareness!
