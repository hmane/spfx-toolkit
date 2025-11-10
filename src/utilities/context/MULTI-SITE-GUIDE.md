# Multi-Site Connectivity Guide

## Overview

The SPContext Multi-Site API allows you to connect to and work with multiple SharePoint sites within a single SPFx application. Each connected site gets its own isolated PnP instances (sp, spCached, spPessimistic) with configurable caching strategies.

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Configuration Options](#configuration-options)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Usage

```typescript
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// 1. Initialize primary context
await SPContext.smart(this.context, 'MyWebPart');

// 2. Connect to another site
await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr');

// 3. Use the connected site
const hrSite = SPContext.sites.get('https://contoso.sharepoint.com/sites/hr');
const lists = await hrSite.sp.web.lists();

console.log(`Site: ${hrSite.webTitle}`);
console.log(`Lists: ${lists.length}`);
```

### With Alias and Caching

```typescript
// Connect with friendly alias and caching
await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', {
  alias: 'hr',
  cache: {
    strategy: 'memory',
    ttl: 300000 // 5 minutes
  }
});

// Access by alias
const hrSite = SPContext.sites.get('hr');
const employees = await hrSite.sp.web.lists
  .getByTitle('Employees')
  .items();
```

---

## API Reference

### `SPContext.sites.add(siteUrl, config?)`

Connect to another SharePoint site.

**Parameters:**
- `siteUrl` (string, required): Full URL of the site (e.g., `'https://tenant.sharepoint.com/sites/hr'`)
- `config` (ISiteConfig, optional): Configuration options

**Returns:** `Promise<void>`

**Throws:**
- Error if site already connected
- Error if site unreachable (404)
- Error if access denied (403)
- Error if network issues

**Example:**
```typescript
await SPContext.sites.add('https://contoso.sharepoint.com/sites/projects', {
  alias: 'projects',
  cache: {
    strategy: 'memory',
    ttl: 600000 // 10 minutes
  },
  logger: {
    enabled: true,
    prefix: 'Projects'
  }
});
```

---

### `SPContext.sites.get(siteUrlOrAlias)`

Get a connected site context.

**Parameters:**
- `siteUrlOrAlias` (string, required): Site URL or alias name

**Returns:** `ISiteContext` object with:
- `sp`: Standard PnP SPFI instance
- `spCached`: Memory-cached PnP instance
- `spPessimistic`: No-cache PnP instance
- `siteUrl`: Normalized site URL
- `webAbsoluteUrl`: Web absolute URL
- `webServerRelativeUrl`: Server-relative URL
- `webTitle`: Site title
- `webId`: Site GUID
- `alias`: Friendly name (if provided)
- `config`: Active configuration
- `logger`: Site-specific logger
- `cache`: Site-specific cache module

**Throws:**
- Error if site not connected

**Example:**
```typescript
// Get by URL
const hrSite = SPContext.sites.get('https://contoso.sharepoint.com/sites/hr');

// Get by alias
const projectsSite = SPContext.sites.get('projects');

// Use PnP instances
const lists = await hrSite.sp.web.lists();
const cachedUsers = await hrSite.spCached.web.siteUsers();
const freshPermissions = await hrSite.spPessimistic.web.roleAssignments();
```

---

### `SPContext.sites.remove(siteUrlOrAlias)`

Remove a site connection and clean up resources.

**Parameters:**
- `siteUrlOrAlias` (string, required): Site URL or alias name

**Returns:** `void`

**Example:**
```typescript
// Remove by URL
SPContext.sites.remove('https://contoso.sharepoint.com/sites/temp');

// Remove by alias
SPContext.sites.remove('projects');
```

---

### `SPContext.sites.list()`

List all connected sites.

**Returns:** `string[]` - Array of normalized site URLs

**Example:**
```typescript
const connectedSites = SPContext.sites.list();
console.log('Connected sites:', connectedSites);
// ['https://contoso.sharepoint.com/sites/hr',
//  'https://contoso.sharepoint.com/sites/projects']
```

---

### `SPContext.sites.has(siteUrlOrAlias)`

Check if a site is already connected.

**Parameters:**
- `siteUrlOrAlias` (string, required): Site URL or alias name

**Returns:** `boolean` - `true` if site is connected

**Example:**
```typescript
if (!SPContext.sites.has('hr')) {
  await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', {
    alias: 'hr'
  });
}

const hrSite = SPContext.sites.get('hr');
```

---

## Configuration Options

### ISiteConfig Interface

```typescript
interface ISiteConfig {
  cache?: {
    strategy?: 'none' | 'memory' | 'storage';
    ttl?: number; // milliseconds
  };
  logger?: {
    enabled?: boolean;
    prefix?: string;
  };
  alias?: string;
}
```

### Cache Strategies

#### `'none'` - No Caching
- Always fetches fresh data from SharePoint
- Use for real-time data or when cache invalidation is critical

```typescript
await SPContext.sites.add('https://contoso.sharepoint.com/sites/live', {
  cache: { strategy: 'none' }
});
```

#### `'memory'` - Session Storage Caching
- Caches data in browser session storage
- Persists until browser tab is closed
- Best for frequently accessed, infrequently changing data

```typescript
await SPContext.sites.add('https://contoso.sharepoint.com/sites/static', {
  cache: {
    strategy: 'memory',
    ttl: 600000 // 10 minutes
  }
});
```

#### `'storage'` - Local Storage Caching
- Caches data in browser local storage
- Persists across browser sessions
- Best for static configuration data

```typescript
await SPContext.sites.add('https://contoso.sharepoint.com/sites/config', {
  cache: {
    strategy: 'storage',
    ttl: 3600000 // 1 hour
  }
});
```

#### Hybrid Approach (Default)
If not specified, site inherits cache strategy from primary SPContext:

```typescript
// Primary context with memory cache
await SPContext.smart(this.context, 'MyWebPart');

// This site inherits memory cache strategy
await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr');

// This site overrides with no cache
await SPContext.sites.add('https://contoso.sharepoint.com/sites/live', {
  cache: { strategy: 'none' }
});
```

---

## Usage Examples

### Example 1: Cross-Site Data Aggregation

Fetch data from multiple sites in parallel:

```typescript
async function aggregateDashboardData() {
  // Initialize primary context
  await SPContext.smart(this.context, 'Dashboard');

  // Connect to multiple sites
  const sites = [
    { url: 'https://contoso.sharepoint.com/sites/hr', alias: 'hr' },
    { url: 'https://contoso.sharepoint.com/sites/finance', alias: 'finance' },
    { url: 'https://contoso.sharepoint.com/sites/projects', alias: 'projects' }
  ];

  await Promise.all(
    sites.map(s => SPContext.sites.add(s.url, { alias: s.alias }))
  );

  // Fetch data in parallel
  const [hrTasks, financeBudgets, activeProjects] = await Promise.all([
    SPContext.sites.get('hr').sp.web.lists
      .getByTitle('Tasks')
      .items.filter('Status eq \'Active\'')(),

    SPContext.sites.get('finance').sp.web.lists
      .getByTitle('Budgets')
      .items.top(10)(),

    SPContext.sites.get('projects').sp.web.lists
      .getByTitle('Projects')
      .items.filter('DueDate ge datetime\'2025-01-01\'')()
  ]);

  return {
    hrTasks,
    financeBudgets,
    activeProjects
  };
}
```

### Example 2: Hub Site Pattern

Connect to a hub site for centralized configuration:

```typescript
async function loadHubConfiguration() {
  // Connect to hub site with long cache
  await SPContext.sites.add('https://contoso.sharepoint.com/sites/hub', {
    alias: 'hub',
    cache: {
      strategy: 'storage',
      ttl: 3600000 // 1 hour - config rarely changes
    }
  });

  const hubSite = SPContext.sites.get('hub');

  // Get centralized configuration
  const config = await hubSite.sp.web.lists
    .getByTitle('HubConfiguration')
    .items.getById(1)
    .select('Settings', 'Theme', 'Navigation')();

  // Use configuration for current site
  return config;
}
```

### Example 3: Cross-Site Search

Search documents across multiple sites:

```typescript
async function searchAcrossSites(query: string) {
  const sites = [
    'https://contoso.sharepoint.com/sites/team1',
    'https://contoso.sharepoint.com/sites/team2',
    'https://contoso.sharepoint.com/sites/archive'
  ];

  // Connect to all sites
  for (const siteUrl of sites) {
    if (!SPContext.sites.has(siteUrl)) {
      await SPContext.sites.add(siteUrl);
    }
  }

  // Search in parallel
  const searchPromises = sites.map(async (siteUrl) => {
    const site = SPContext.sites.get(siteUrl);
    const items = await site.sp.web.lists
      .getByTitle('Documents')
      .items
      .filter(`substringof('${query}', Title)`)
      .select('Title', 'Modified', 'FileRef')
      .top(5)();

    return items.map(item => ({
      ...item,
      siteUrl,
      siteTitle: site.webTitle
    }));
  });

  const results = await Promise.all(searchPromises);
  return results.flat();
}
```

### Example 4: React Component with Multi-Site

```typescript
import * as React from 'react';
import { SPContext, ISiteContext } from 'spfx-toolkit/lib/utilities/context';

export const CrossSiteDashboard: React.FC = () => {
  const [hrData, setHrData] = React.useState<any[]>([]);
  const [financeData, setFinanceData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Connect to sites
      await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', {
        alias: 'hr',
        cache: { strategy: 'memory', ttl: 300000 }
      });
      await SPContext.sites.add('https://contoso.sharepoint.com/sites/finance', {
        alias: 'finance',
        cache: { strategy: 'memory', ttl: 300000 }
      });

      // Fetch data
      const hrSite = SPContext.sites.get('hr');
      const financeSite = SPContext.sites.get('finance');

      const [hr, finance] = await Promise.all([
        hrSite.sp.web.lists.getByTitle('Employees').items.top(10)(),
        financeSite.sp.web.lists.getByTitle('Budgets').items.top(10)()
      ]);

      setHrData(hr);
      setFinanceData(finance);
    } catch (error) {
      SPContext.logger.error('Failed to load cross-site data', error);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      SPContext.sites.remove('hr');
      SPContext.sites.remove('finance');
    };
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>HR Data ({hrData.length})</h2>
      {/* Render HR data */}

      <h2>Finance Data ({financeData.length})</h2>
      {/* Render finance data */}
    </div>
  );
};
```

---

## Best Practices

### 1. Always Clean Up Connections

Remove site connections when no longer needed to free resources:

```typescript
// In React component unmount
React.useEffect(() => {
  return () => {
    SPContext.sites.remove('hr');
  };
}, []);

// In web part dispose
public dispose(): void {
  SPContext.sites.remove('projects');
  super.dispose();
}
```

### 2. Use Aliases for Readability

```typescript
// ✅ GOOD: Use aliases
await SPContext.sites.add('https://contoso.sharepoint.com/sites/human-resources', {
  alias: 'hr'
});
const hrSite = SPContext.sites.get('hr');

// ❌ AVOID: Repeating long URLs
const hrSite = SPContext.sites.get('https://contoso.sharepoint.com/sites/human-resources');
```

### 3. Check Before Adding

Prevent duplicate connections:

```typescript
if (!SPContext.sites.has('hr')) {
  await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', {
    alias: 'hr'
  });
}
```

### 4. Choose Appropriate Cache Strategy

```typescript
// Static configuration - long cache
await SPContext.sites.add('https://contoso.sharepoint.com/sites/config', {
  cache: { strategy: 'storage', ttl: 3600000 } // 1 hour
});

// Real-time data - no cache
await SPContext.sites.add('https://contoso.sharepoint.com/sites/live', {
  cache: { strategy: 'none' }
});

// Frequently accessed - memory cache
await SPContext.sites.add('https://contoso.sharepoint.com/sites/common', {
  cache: { strategy: 'memory', ttl: 300000 } // 5 minutes
});
```

### 5. Parallel Connections for Performance

```typescript
// ✅ GOOD: Parallel connections
await Promise.all([
  SPContext.sites.add('https://contoso.sharepoint.com/sites/hr'),
  SPContext.sites.add('https://contoso.sharepoint.com/sites/finance'),
  SPContext.sites.add('https://contoso.sharepoint.com/sites/projects')
]);

// ❌ AVOID: Sequential connections (slower)
await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr');
await SPContext.sites.add('https://contoso.sharepoint.com/sites/finance');
await SPContext.sites.add('https://contoso.sharepoint.com/sites/projects');
```

### 6. Use Cached Instances Appropriately

```typescript
const site = SPContext.sites.get('hr');

// Use spCached for metadata that rarely changes
const lists = await site.spCached.web.lists();
const fields = await site.spCached.web.lists.getByTitle('Employees').fields();

// Use sp for normal operations
const items = await site.sp.web.lists.getByTitle('Employees').items();

// Use spPessimistic for always-fresh data
const permissions = await site.spPessimistic.web.roleAssignments();
```

---

## Error Handling

### Common Errors

#### 1. Site Not Connected

```typescript
try {
  const site = SPContext.sites.get('hr');
} catch (error) {
  // Error: Site not connected: hr. Call SPContext.sites.add('hr') first.

  // Fix: Add the site first
  await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', {
    alias: 'hr'
  });
  const site = SPContext.sites.get('hr');
}
```

#### 2. Access Denied (403)

```typescript
try {
  await SPContext.sites.add('https://contoso.sharepoint.com/sites/restricted');
} catch (error) {
  // Error: Access denied to site: https://contoso.sharepoint.com/sites/restricted.
  // You may not have permission to access this site.

  SPContext.logger.error('Cannot access site', error);
  // Show user-friendly message
}
```

#### 3. Site Not Found (404)

```typescript
try {
  await SPContext.sites.add('https://contoso.sharepoint.com/sites/nonexistent');
} catch (error) {
  // Error: Site not found: https://contoso.sharepoint.com/sites/nonexistent.
  // Please check the URL and try again.

  SPContext.logger.error('Site does not exist', error);
}
```

#### 4. Network Error

```typescript
try {
  await SPContext.sites.add('https://contoso.sharepoint.com/sites/remote');
} catch (error) {
  // Error: Network error while connecting to site...

  SPContext.logger.error('Network connectivity issue', error);
  // Implement retry logic
}
```

### Safe Connection Pattern

```typescript
async function safeConnect(siteUrl: string, alias: string): Promise<ISiteContext | null> {
  try {
    // Check if already connected
    if (SPContext.sites.has(alias)) {
      return SPContext.sites.get(alias);
    }

    // Try to connect
    await SPContext.sites.add(siteUrl, { alias });
    return SPContext.sites.get(alias);

  } catch (error: any) {
    if (error.message.includes('403')) {
      SPContext.logger.error('Access denied', error, { siteUrl });
      // Show permission error to user
    } else if (error.message.includes('404')) {
      SPContext.logger.error('Site not found', error, { siteUrl });
      // Show not found error to user
    } else {
      SPContext.logger.error('Connection failed', error, { siteUrl });
      // Show generic error to user
    }
    return null;
  }
}

// Usage
const hrSite = await safeConnect('https://contoso.sharepoint.com/sites/hr', 'hr');
if (hrSite) {
  const data = await hrSite.sp.web.lists.getByTitle('Employees').items();
}
```

---

## Performance Considerations

### 1. Connection Overhead

Each `add()` call makes a network request to validate the site. Minimize connections:

```typescript
// ✅ GOOD: Connect once, reuse
await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', { alias: 'hr' });
const hrSite = SPContext.sites.get('hr');

// Use hrSite multiple times
const lists = await hrSite.sp.web.lists();
const users = await hrSite.sp.web.siteUsers();

// ❌ AVOID: Multiple connections to same site
await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', { alias: 'hr1' });
await SPContext.sites.add('https://contoso.sharepoint.com/sites/hr', { alias: 'hr2' }); // Throws error
```

### 2. Memory Usage

Each site context uses ~1-2KB of memory. Clean up when done:

```typescript
// After batch operations
SPContext.sites.remove('temp-site');
```

### 3. Caching Strategy Impact

```typescript
// High performance - uses cache
const cachedSite = await SPContext.sites.get('cached');
await cachedSite.spCached.web.lists(); // Fast (cached)

// Lower performance - always fresh
const liveSite = await SPContext.sites.get('live');
await liveSite.spPessimistic.web.lists(); // Slower (no cache)
```

### 4. Parallel Queries

Maximize throughput with parallel requests:

```typescript
const [site1Data, site2Data, site3Data] = await Promise.all([
  SPContext.sites.get('site1').sp.web.lists(),
  SPContext.sites.get('site2').sp.web.lists(),
  SPContext.sites.get('site3').sp.web.lists()
]);
```

---

## Troubleshooting

### Issue: "SPContext not initialized"

**Cause:** Trying to use `SPContext.sites` before initialization

**Solution:**
```typescript
// Initialize first
await SPContext.smart(this.context, 'MyWebPart');

// Then use sites API
await SPContext.sites.add('...');
```

### Issue: "Site already connected"

**Cause:** Calling `add()` with a site that's already connected

**Solution:**
```typescript
// Check first
if (!SPContext.sites.has('hr')) {
  await SPContext.sites.add('...', { alias: 'hr' });
}
```

### Issue: "Alias already in use"

**Cause:** Using the same alias for different sites

**Solution:**
```typescript
// Remove old connection first
SPContext.sites.remove('hr');

// Or use different alias
await SPContext.sites.add('...', { alias: 'hr-new' });
```

### Issue: Slow performance

**Causes & Solutions:**

1. **No caching enabled**
   ```typescript
   // Enable caching
   await SPContext.sites.add('...', {
     cache: { strategy: 'memory', ttl: 300000 }
   });
   ```

2. **Using pessimistic instance for cached data**
   ```typescript
   // Use cached instance instead
   const lists = await site.spCached.web.lists();
   ```

3. **Sequential operations**
   ```typescript
   // Use parallel operations
   await Promise.all([operation1(), operation2()]);
   ```

---

## Summary

The Multi-Site API provides a powerful and flexible way to work with multiple SharePoint sites:

- **Simple API**: `add()`, `get()`, `remove()`, `list()`, `has()`
- **Isolated PnP instances**: Each site gets its own sp/spCached/spPessimistic
- **Configurable caching**: Choose strategy per site or inherit from primary
- **Fail-fast errors**: Clear error messages for access/network issues
- **Manual lifecycle**: Explicit `remove()` for predictable cleanup
- **Full TypeScript support**: Complete type definitions

For questions or issues, refer to the main [Context System README](./README.md).
