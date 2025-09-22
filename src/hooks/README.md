# SPFx Toolkit Hooks 🎣

Custom React hooks designed specifically for SharePoint Framework applications. These hooks provide enhanced functionality with SPFx-specific optimizations, SSR safety, and production-ready features.

## Features

- 🚀 **SPFx Optimized** - Built for SharePoint Framework environments
- 🛡️ **SSR Safe** - Works with server-side rendering scenarios
- ⚡ **Performance Focused** - Optimized with debouncing and efficient updates
- 🔧 **TypeScript Complete** - Full type safety and IntelliSense support
- 📱 **Responsive Ready** - Enhanced viewport and device detection
- 💾 **Storage Enhanced** - Advanced localStorage with cross-tab sync

## Installation

```bash
npm install spfx-toolkit
```

## Quick Start

```typescript
import { useLocalStorage, useViewport } from 'spfx-toolkit/lib/hooks';

const MyComponent: React.FC = () => {
  const [userPrefs, setUserPrefs] = useLocalStorage('user-preferences', {});
  const { isMobile, breakpoint } = useViewport();

  return (
    <div>
      <p>Current breakpoint: {breakpoint}</p>
      <p>Mobile device: {isMobile ? 'Yes' : 'No'}</p>
    </div>
  );
};
```

## Available Hooks

### useLocalStorage

Enhanced localStorage hook with error handling, cross-tab synchronization, and SPFx compatibility.

```typescript
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';

const { value, setValue, removeValue, isLoading, error } = useLocalStorage(
  key,
  initialValue,
  options
);
```

**Parameters:**

- `key: string` - Storage key
- `initialValue: T` - Default value if nothing stored
- `options?: UseLocalStorageOptions` - Configuration options

**Returns:**

- `value: T` - Current stored value
- `setValue: (value: T | (prev: T) => T) => void` - Update the value
- `removeValue: () => void` - Remove from storage
- `isLoading: boolean` - Loading state during initialization
- `error: Error | null` - Any storage errors

**Options:**

```typescript
interface UseLocalStorageOptions {
  serialize?: (value: any) => string; // Custom serialization
  deserialize?: (value: string) => any; // Custom deserialization
  onError?: (error: Error, operation: 'read' | 'write') => void; // Error handler
  syncAcrossTabs?: boolean; // Cross-tab synchronization
}
```

### useViewport

Comprehensive viewport and device detection hook with responsive utilities.

```typescript
import { useViewport } from 'spfx-toolkit/lib/hooks';

const viewport = useViewport(options);
```

**Parameters:**

- `options?: UseViewportOptions` - Configuration options

**Returns ViewportInfo:**

```typescript
interface ViewportInfo {
  // Size and orientation
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  aspectRatio: number;

  // Breakpoint information
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;

  // Device types
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // Convenience flags
  isPortrait: boolean;
  isLandscape: boolean;
  isSmallScreen: boolean; // xs or sm
  isLargeScreen: boolean; // lg or xl

  // Utility functions
  up: (breakpoint: BreakpointKey) => boolean;
  down: (breakpoint: BreakpointKey) => boolean;
  between: (min: BreakpointKey, max: BreakpointKey) => boolean;
}
```

**Options:**

```typescript
interface UseViewportOptions {
  breakpoints?: Partial<Breakpoints>; // Custom breakpoints
  debounceMs?: number; // Resize debounce (default: 16ms)
  initialValues?: {
    // SSR initial values
    width: number;
    height: number;
  };
}
```

**Default Breakpoints:**

- `xs`: 0-639px (mobile)
- `sm`: 640-767px (large mobile)
- `md`: 768-1023px (tablet)
- `lg`: 1024-1279px (desktop)
- `xl`: 1280px+ (large desktop)

### useIsTouchDevice

Simple hook to detect touch-capable devices.

```typescript
import { useIsTouchDevice } from 'spfx-toolkit/lib/hooks';

const isTouchDevice = useIsTouchDevice();
```

### useMediaQuery

Hook for custom media queries with SSR support.

```typescript
import { useMediaQuery } from 'spfx-toolkit/lib/hooks';

const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
const isHighDPI = useMediaQuery('(min-resolution: 2dppx)', false);
```

## Usage Examples

### Basic localStorage Usage

```typescript
import React from 'react';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';

const UserPreferences: React.FC = () => {
  const [prefs, setPrefs] = useLocalStorage('user-prefs', {
    theme: 'light',
    language: 'en',
    showTutorial: true,
  });

  const toggleTheme = () => {
    setPrefs(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  };

  return (
    <div>
      <button onClick={toggleTheme}>
        Switch to {prefs.theme === 'light' ? 'dark' : 'light'} theme
      </button>
      <p>Language: {prefs.language}</p>
    </div>
  );
};
```

### Advanced localStorage with Error Handling

```typescript
import React from 'react';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';

const FormData: React.FC = () => {
  const {
    value: formData,
    setValue: setFormData,
    removeValue: clearForm,
    isLoading,
    error,
  } = useLocalStorage(
    'draft-form',
    {},
    {
      syncAcrossTabs: true,
      onError: (error, operation) => {
        console.error(`Storage ${operation} failed:`, error);
      },
    }
  );

  if (isLoading) {
    return <div>Loading saved data...</div>;
  }

  if (error) {
    return <div>Error loading data: {error.message}</div>;
  }

  return (
    <div>
      {/* Form fields */}
      <button onClick={clearForm}>Clear Draft</button>
    </div>
  );
};
```

### Responsive Layout with useViewport

```typescript
import React from 'react';
import { useViewport } from 'spfx-toolkit/lib/hooks';

const ResponsiveGrid: React.FC = () => {
  const { breakpoint, isMobile, isTablet, isDesktop, up, down } = useViewport();

  const getColumns = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    if (up('lg')) return 3;
    return 2;
  };

  const getItemSize = () => {
    if (down('md')) return 'small';
    if (up('lg')) return 'large';
    return 'medium';
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${getColumns()}, 1fr)`,
        gap: isMobile ? '8px' : '16px',
      }}
    >
      {items.map(item => (
        <div key={item.id} className={`item-${getItemSize()}`}>
          <h3>{item.title}</h3>
          {!isMobile && <p>{item.description}</p>}
        </div>
      ))}
    </div>
  );
};
```

### Custom Breakpoints

```typescript
import React from 'react';
import { useViewport } from 'spfx-toolkit/lib/hooks';

const CustomResponsive: React.FC = () => {
  const { breakpoint, width } = useViewport({
    breakpoints: {
      sm: 480, // Custom mobile breakpoint
      md: 768,
      lg: 1200, // Custom desktop breakpoint
      xl: 1600, // Ultra-wide displays
    },
    debounceMs: 100, // Slower debounce for heavy components
  });

  return (
    <div>
      <p>Breakpoint: {breakpoint}</p>
      <p>Width: {width}px</p>
    </div>
  );
};
```

### Cross-Tab Data Synchronization

```typescript
import React from 'react';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';

const MultiTabCounter: React.FC = () => {
  const [count, setCount] = useLocalStorage('shared-counter', 0, {
    syncAcrossTabs: true,
  });

  return (
    <div>
      <p>Count (synced across tabs): {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <button onClick={() => setCount(c => c - 1)}>Decrement</button>
    </div>
  );
};
```

### SPFx WebPart Integration

```typescript
import * as React from 'react';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { useLocalStorage, useViewport } from 'spfx-toolkit/lib/hooks';

interface IMyWebPartProps {
  title: string;
}

const MyWebPartComponent: React.FC<IMyWebPartProps> = ({ title }) => {
  const [settings, setSettings] = useLocalStorage(`webpart-settings-${title}`, {
    showAdvanced: false,
    itemsPerPage: 10,
  });

  const { isMobile, breakpoint } = useViewport();

  const itemsToShow = isMobile ? 5 : settings.itemsPerPage;

  return (
    <div className={`webpart-${breakpoint}`}>
      <h2>{title}</h2>
      <p>Showing {itemsToShow} items per page</p>
      <p>Device: {isMobile ? 'Mobile' : 'Desktop'}</p>

      <label>
        <input
          type='checkbox'
          checked={settings.showAdvanced}
          onChange={e =>
            setSettings(prev => ({
              ...prev,
              showAdvanced: e.target.checked,
            }))
          }
        />
        Show Advanced Options
      </label>

      {settings.showAdvanced && (
        <div>
          <label>
            Items per page:
            <input
              type='number'
              value={settings.itemsPerPage}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  itemsPerPage: parseInt(e.target.value) || 10,
                }))
              }
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default class MyWebPart extends BaseClientSideWebPart<IMyWebPartProps> {
  public render(): void {
    const element = React.createElement(MyWebPartComponent, {
      title: this.properties.title,
    });
    ReactDom.render(element, this.domElement);
  }
}
```

### Media Query Examples

```typescript
import React from 'react';
import { useMediaQuery, useViewport } from 'spfx-toolkit/lib/hooks';

const MediaQueryDemo: React.FC = () => {
  const { isMobile } = useViewport();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isHighDPI = useMediaQuery('(min-resolution: 2dppx)');
  const isPrint = useMediaQuery('print');

  return (
    <div>
      <p>Mobile: {isMobile ? 'Yes' : 'No'}</p>
      <p>Reduced Motion: {prefersReducedMotion ? 'Yes' : 'No'}</p>
      <p>High DPI: {isHighDPI ? 'Yes' : 'No'}</p>
      <p>Print Mode: {isPrint ? 'Yes' : 'No'}</p>
    </div>
  );
};
```

## Best Practices

### 1. Performance Optimization

```typescript
// Use appropriate debounce values
const { width } = useViewport({ debounceMs: 16 }); // 60fps for smooth animations
const { width } = useViewport({ debounceMs: 100 }); // Slower for heavy operations
```

### 2. Error Handling

```typescript
const { value, error } = useLocalStorage('key', defaultValue, {
  onError: (error, operation) => {
    // Log to Application Insights or your logging service
    console.error(`Storage ${operation} failed:`, error);
  },
});

if (error) {
  // Show user-friendly error message
  return <div>Unable to load saved data</div>;
}
```

### 3. Cross-Tab Synchronization

```typescript
// Only enable when needed (adds event listeners)
const [sharedData] = useLocalStorage(
  'shared',
  {},
  {
    syncAcrossTabs: true, // Only for data that should sync across tabs
  }
);
```

### 4. Custom Serialization

```typescript
// For complex data types
const [dateValue, setDateValue] = useLocalStorage('date', new Date(), {
  serialize: date => date.toISOString(),
  deserialize: str => new Date(str),
});
```

### 5. SSR Safety

```typescript
// Provide initial values for server-side rendering
const { isMobile } = useViewport({
  initialValues: { width: 1024, height: 768 }, // Desktop default
});
```

## TypeScript Support

All hooks include comprehensive TypeScript definitions:

```typescript
// Fully typed with generics
const [data, setData] = useLocalStorage<UserData>('user', {
  name: '',
  preferences: {},
});

// Type-safe viewport information
const { breakpoint }: { breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' } = useViewport();
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Common Patterns

### Responsive Conditional Rendering

```typescript
const { isMobile, up } = useViewport();

return (
  <div>
    {isMobile ? <MobileMenu /> : <DesktopMenu />}

    {up('md') && <SidePanel />}
  </div>
);
```

### Persistent Form State

```typescript
const [formData, setFormData] = useLocalStorage('form-draft', {});

const handleInputChange = (field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

### Device-Specific Logic

```typescript
const isTouchDevice = useIsTouchDevice();
const { isMobile } = useViewport();

const handleInteraction = isTouchDevice ? 'onTouchStart' : 'onMouseEnter';
const showTooltip = !isMobile && !isTouchDevice;
```

## Troubleshooting

### Common Issues

**Q: localStorage not working in SharePoint?**
A: Check if third-party cookies are enabled and the site is not in an iframe with restrictions.

**Q: Viewport hook not updating?**
A: Ensure the component is properly mounted and not inside a hidden container.

**Q: Cross-tab sync not working?**
A: Storage events only fire in other tabs, not the current tab that made the change.

**Q: SSR hydration mismatch?**
A: Provide appropriate `initialValues` in `useViewport` options.

### Debug Mode

```typescript
const { value, error, isLoading } = useLocalStorage(
  'debug',
  {},
  {
    onError: (error, operation) => {
      console.group(`localStorage ${operation} error`);
      console.error(error);
      console.trace();
      console.groupEnd();
    },
  }
);
```
