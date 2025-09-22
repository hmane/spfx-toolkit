# SPContext - SharePoint Context Management

**SPContext** is part of the `spfx-toolkit` package, providing enterprise-grade context management for SharePoint Framework applications with comprehensive web-level properties and utilities.

## Features

- **Smart Environment Detection** - Automatically detects dev/uat/production environments
- **Multiple Cache Strategies** - Memory, storage, and pessimistic caching
- **Azure AD Authentication** - Secure API calls to Azure Functions and Power Platform
- **Clean Property Access** - Simple `SPContext.webAbsoluteUrl`, `SPContext.logger` syntax
- **Web-Level Focus** - Complete web information without site complexity
- **Performance Tracking** - Built-in metrics and monitoring with health checks
- **Culture & Localization** - Full support for multi-language environments
- **TypeScript Strict** - Complete type safety with focused interfaces

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
    // Clean property access with web-focused properties
    const items = await SPContext.sp.web.lists.getByTitle('Tasks').items();

    SPContext.logger.info('WebPart rendered', {
      itemCount: items.length,
      webTitle: SPContext.webTitle,
      webUrl: SPContext.webAbsoluteUrl,
      isTeamsContext: SPContext.isTeamsContext
    });
  }
}
```

## Essential Property Reference

### Web URLs

```typescript
// Web URLs (focused on web-level only)
SPContext.webAbsoluteUrl         // Web absolute URL
SPContext.webServerRelativeUrl   // Web server-relative URL

// Tenant information
SPContext.tenantUrl              // Tenant root URL
```

### Web Metadata

```typescript
// Web information
SPContext.webTitle               // Web title
SPContext.webId                  // Web GUID (as string)

// Application context
SPContext.applicationName        // Current SPFx application name
SPContext.correlationId         // Unique session correlation ID
```

### List Context (when available)

```typescript
SPContext.listId                    // Current list GUID (if in list context)
SPContext.listTitle                 // Current list title
SPContext.listServerRelativeUrl     // Current list server-relative URL
```

### Culture and Localization

```typescript
SPContext.currentUICultureName      // UI culture (e.g., 'en-US')
SPContext.currentCultureName        // Content culture
SPContext.isRightToLeft            // RTL language detection
```

### User Information (Authenticated Org Users)

```typescript
// Simple user info for authenticated org users
SPContext.currentUser               // Complete user object
SPContext.currentUser.displayName  // User display name
SPContext.currentUser.loginName    // User login name
SPContext.currentUser.email        // User email address
```

### Environment and Runtime Information

```typescript
SPContext.environment              // 'dev', 'uat', or 'prod'
SPContext.isTeamsContext          // Running in Microsoft Teams
SPContext.getEnvironmentDisplayName() // User-friendly environment name
```

## Usage Examples

### Web-Focused SharePoint Operations

```typescript
import './pnp-imports';
import { SPContext } from 'spfx-toolkit';

export default class WebFocusedPart extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    await SPContext.smart(this.context, 'WebFocusedPart');

    // Log web-specific context information
    SPContext.logger.info('Context initialized', {
      webTitle: SPContext.webTitle,
      webUrl: SPContext.webAbsoluteUrl,
      webServerRelativeUrl: SPContext.webServerRelativeUrl,
      tenantUrl: SPContext.tenantUrl,
      correlationId: SPContext.correlationId
    });

    return super.onInit();
  }

  private async loadTasksWithWebContext(): Promise<void> {
    try {
      SPContext.logger.info('Loading tasks', {
        webTitle: SPContext.webTitle,
        webUrl: SPContext.webServerRelativeUrl,
        user: SPContext.currentUser.displayName,
        culture: SPContext.currentUICultureName,
        isTeams: SPContext.isTeamsContext
      });

      const tasks = await SPContext.sp.web.lists
        .getByTitle('Tasks')
        .items.select('Title', 'Status', 'AssignedTo/Title')
        .expand('AssignedTo')();

      // Build API URL helper (always uses web URL)
      const apiUrl = SPContext.buildApiUrl('web/lists/getByTitle(\'Tasks\')/items');

      this.renderTasks(tasks);

      SPContext.logger.success('Tasks loaded successfully', {
        count: tasks.length,
        webTitle: SPContext.webTitle,
        environment: SPContext.getEnvironmentDisplayName(),
        tenantInfo: SPContext.getTenantInfo()
      });

    } catch (error) {
      SPContext.logger.error('Failed to load tasks', error, {
        operation: 'loadTasks',
        webUrl: SPContext.webAbsoluteUrl,
        listContext: {
          id: SPContext.listId,
          title: SPContext.listTitle
        }
      });
    }
  }
}
```

### Health Monitoring and Diagnostics

```typescript
// Get comprehensive health check
const healthCheck = await SPContext.getHealthCheck();

if (!healthCheck.isHealthy) {
  SPContext.logger.warn('Context health issues detected', {
    issues: healthCheck.issues,
    recommendations: healthCheck.recommendations,
    performance: healthCheck.performance
  });
}

// Get web-focused context summary for debugging
const contextSummary = SPContext.getContextSummary();
console.log('Web Context Summary:', contextSummary);

// Health check returns focused performance data
const exampleHealthCheck = {
  isHealthy: true,
  issues: [], // Performance, network, or configuration issues
  recommendations: ['Enable caching for frequently accessed data'],
  performance: {
    averageResponseTime: 245, // milliseconds
    slowOperations: 0,
    errorRate: 0.0
  }
};
```

### Multi-Language Support

```typescript
// Detect and handle RTL languages
if (SPContext.isRightToLeft) {
  document.body.classList.add('rtl-layout');
}

// Log culture information
SPContext.logger.info('Localization context', {
  uiCulture: SPContext.currentUICultureName,
  contentCulture: SPContext.currentCultureName,
  isRTL: SPContext.isRightToLeft,
  webTitle: SPContext.webTitle
});

// Format dates according to user culture
const formatter = new Intl.DateTimeFormat(SPContext.currentUICultureName);
const formattedDate = formatter.format(new Date());
```

### Teams Integration Detection

```typescript
if (SPContext.isTeamsContext) {
  // Teams-specific functionality
  SPContext.logger.info('Running in Microsoft Teams context', {
    webTitle: SPContext.webTitle,
    webUrl: SPContext.webAbsoluteUrl,
    tenantInfo: SPContext.getTenantInfo()
  });

  // Apply Teams-specific styling or behavior
  this.configureForTeams();
} else {
  // Standard SharePoint functionality
  SPContext.logger.info('Running in standard SharePoint context', {
    webTitle: SPContext.webTitle
  });
}
```

### Environment-Aware Configuration

```typescript
// Different behavior based on environment
switch (SPContext.environment) {
  case 'dev':
    this.enableDebugMode();
    SPContext.logger.info('Development mode enabled', {
      webUrl: SPContext.webAbsoluteUrl
    });
    break;

  case 'uat':
    this.enableTestingFeatures();
    break;

  case 'prod':
    this.optimizeForProduction();
    // Use pessimistic caching in production
    const cachedData = await SPContext.spPessimistic.web.lists
      .getByTitle('Configuration').items();
    break;
}

// Log environment details
SPContext.logger.info('Environment details', {
  environment: SPContext.getEnvironmentDisplayName(),
  webTitle: SPContext.webTitle,
  tenantUrl: SPContext.tenantUrl
});
```

## Advanced Features

### Context Health Monitoring

```typescript
// Periodic health checks focused on web performance
setInterval(async () => {
  const health = await SPContext.getHealthCheck();

  if (!health.isHealthy) {
    // Send telemetry or alerts
    this.sendHealthAlert(health);
  }
}, 300000); // Every 5 minutes
```

### Performance Optimization

```typescript
// Track long-running operations
const users = await SPContext.performance.track('loadWebUsers', async () => {
  return SPContext.sp.web.siteUsers.top(5000)();
});

// Monitor and optimize slow operations
const slowOps = SPContext.performance.getSlowOperations(1000);
if (slowOps.length > 0) {
  SPContext.logger.warn('Performance optimization needed', {
    slowOperations: slowOps,
    webContext: {
      title: SPContext.webTitle,
      url: SPContext.webAbsoluteUrl
    },
    recommendations: [
      'Consider implementing caching',
      'Reduce query size',
      'Use selective field loading'
    ]
  });
}
```

## Utility Methods

### API URL Building

```typescript
// Build SharePoint API URLs (always uses web URL)
const listsUrl = SPContext.buildApiUrl('web/lists');
// Returns: https://tenant.sharepoint.com/sites/mysite/_api/web/lists

const customUrl = SPContext.buildApiUrl('_api/web/currentUser');
// Returns: https://tenant.sharepoint.com/sites/mysite/_api/web/currentUser
```

### Context Summary

```typescript
// Get formatted context summary for debugging
const summary = SPContext.getContextSummary();
/*
Returns:
{
  basic: {
    webTitle: "My Web",
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
    loginName: "john@tenant.com",
    email: "john@tenant.com"
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
*/
```

## Property Reference Summary

### Web URLs and Paths
- `webAbsoluteUrl` - Web absolute URL
- `webServerRelativeUrl` - Web server-relative URL
- `tenantUrl` - Tenant root URL
- `listServerRelativeUrl` - List server-relative URL (when available)

### Metadata
- `webTitle`, `applicationName` - Display names
- `webId`, `listId`, `listTitle` - Identifiers
- `correlationId` - Session tracking

### User Information (Authenticated Org Users)
- `currentUser.displayName`, `currentUser.loginName`, `currentUser.email`

### Environment
- `environment`, `isTeamsContext`
- Culture and localization properties

### Utilities
- `sp`, `spCached`, `spPessimistic` - SharePoint instances
- `logger`, `http`, `performance` - Utility services
- Enhanced methods: `getHealthCheck()`, `getContextSummary()`, `buildApiUrl()`

## Best Practices

1. **Use `SPContext.smart()`** for automatic environment detection
2. **Focus on web-level operations** - no site complexity
3. **Monitor context health** in production environments
4. **Use culture information** for proper localization
5. **Implement environment-aware logic** for different deployment stages
6. **Track performance** and optimize slow operations
7. **Handle Teams context** appropriately for hybrid scenarios
8. **Use `webAbsoluteUrl`** for all URL building needs

SPContext provides a clean, web-focused API for SharePoint Framework development with comprehensive property access and built-in monitoring capabilities!
