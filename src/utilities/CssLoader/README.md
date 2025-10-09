# CssLoader Utility

A simple utility for loading CSS files from SharePoint document libraries with built-in caching and error handling.

## Features

- **Simple API**: Load CSS files with a single method call
- **Built-in Caching**: Prevents duplicate CSS loading
- **Error Handling**: Graceful handling of failed CSS loads
- **Multiple File Support**: Load single files or arrays of files
- **SharePoint Integration**: Designed for SharePoint document libraries

## Installation

```bash
npm install spfx-toolkit
```

## Quick Start

```typescript
import { CssLoader } from 'spfx-toolkit/lib/utilities/CssLoader';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

export default class MyWebPart extends BaseClientSideWebPart<IProps> {
  protected async onInit(): Promise<void> {
    await SPContext.smart(this.context, 'MyWebPart');

    // Load custom CSS files from Style Library
    CssLoader.loadCssFiles(SPContext.webAbsoluteUrl, 'Style Library', [
      'custom-styles.css',
      'theme.css',
    ]);

    return super.onInit();
  }
}
```

## API Reference

### loadCssFiles()

Load multiple CSS files from a SharePoint document library.

```typescript
CssLoader.loadCssFiles(
  webAbsoluteUrl: string,
  libraryName: string,
  cssFiles: string[],
  options?: { cache?: boolean }
): void
```

**Parameters:**

- `webAbsoluteUrl` - Web absolute URL (e.g., 'https://tenant.sharepoint.com/sites/mysite')
- `libraryName` - Document library name (e.g., 'Style Library', 'SiteAssets')
- `cssFiles` - Array of CSS file names with relative paths
- `options.cache` - Enable caching to prevent duplicate loads (default: true)

### loadCssFile()

Load a single CSS file from a SharePoint document library.

```typescript
CssLoader.loadCssFile(
  webAbsoluteUrl: string,
  libraryName: string,
  cssFile: string,
  options?: { cache?: boolean }
): void
```

**Parameters:**

- `webAbsoluteUrl` - Web absolute URL
- `libraryName` - Document library name
- `cssFile` - CSS file name with relative path
- `options.cache` - Enable caching (default: true)

## Usage Examples

### Basic Usage with SPContext

```typescript
import { CssLoader } from 'spfx-toolkit/lib/utilities/CssLoader';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Load a single CSS file
CssLoader.loadCssFile(SPContext.webAbsoluteUrl, 'Style Library', 'custom-theme.css');

// Load multiple CSS files
CssLoader.loadCssFiles(SPContext.webAbsoluteUrl, 'SiteAssets', [
  'layout.css',
  'components.css',
  'mobile.css',
]);
```

### Advanced Usage with Subfolders

```typescript
// Load CSS from subfolder
CssLoader.loadCssFiles(SPContext.webAbsoluteUrl, 'Style Library', [
  'themes/dark-theme.css',
  'components/cards.css',
  'layouts/responsive.css',
]);
```

### Conditional Loading

```typescript
// Load different themes based on conditions
if (this.properties.theme === 'dark') {
  CssLoader.loadCssFile(SPContext.webAbsoluteUrl, 'Style Library', 'themes/dark.css');
} else {
  CssLoader.loadCssFile(SPContext.webAbsoluteUrl, 'Style Library', 'themes/light.css');
}
```

### Disable Caching

```typescript
// Load CSS without caching (useful for development)
CssLoader.loadCssFiles(SPContext.webAbsoluteUrl, 'Style Library', ['dev-styles.css'], {
  cache: false,
});
```

### Multiple Libraries

```typescript
// Load CSS from different document libraries
CssLoader.loadCssFile(SPContext.webAbsoluteUrl, 'Style Library', 'global-styles.css');

CssLoader.loadCssFile(SPContext.webAbsoluteUrl, 'SiteAssets', 'page-specific.css');
```

## URL Construction

The utility constructs CSS file URLs as follows:

```
{webAbsoluteUrl}/{libraryName}/{cssFile}
```

**Examples:**

- `https://contoso.sharepoint.com/sites/mysite/Style Library/custom.css`
- `https://contoso.sharepoint.com/sites/mysite/SiteAssets/themes/dark.css`

## Caching Behavior

- **Enabled by default**: Prevents loading the same CSS file multiple times
- **Cache key**: Combination of library name and file path
- **Memory-based**: Cache is cleared when the page is refreshed
- **Disable when needed**: Set `cache: false` for development scenarios

## Error Handling

The utility includes built-in error handling:

- **Failed loads are logged** to console with warning level
- **Non-blocking**: Failed CSS loads don't break your web part
- **Graceful degradation**: Web part continues to function without the CSS

## Best Practices

### 1. Load CSS Early

Load CSS files during web part initialization to avoid layout shifts:

```typescript
protected async onInit(): Promise<void> {
  await SPContext.smart(this.context, 'MyWebPart');

  // Load CSS before rendering
  CssLoader.loadCssFiles(
    SPContext.webAbsoluteUrl,
    'Style Library',
    ['component-styles.css']
  );

  return super.onInit();
}
```

### 2. Organize CSS Files

Structure your CSS files in SharePoint document libraries:

```
Style Library/
├── global/
│   ├── variables.css
│   └── reset.css
├── components/
│   ├── cards.css
│   └── forms.css
└── themes/
    ├── light.css
    └── dark.css
```

### 3. Use Meaningful Names

Use descriptive file names that indicate their purpose:

```typescript
CssLoader.loadCssFiles(SPContext.webAbsoluteUrl, 'Style Library', [
  'global/css-variables.css',
  'components/workflow-stepper.css',
  'themes/corporate-theme.css',
]);
```

### 4. Handle Different Environments

Load different CSS for different environments:

```typescript
const cssFiles =
  SPContext.environment === 'dev' ? ['dev-styles.css', 'debug.css'] : ['prod-styles.css'];

CssLoader.loadCssFiles(SPContext.webAbsoluteUrl, 'Style Library', cssFiles);
```

## Common Use Cases

### Theme Switching

```typescript
public switchTheme(themeName: string): void {
  CssLoader.loadCssFile(
    SPContext.webAbsoluteUrl,
    'Style Library',
    `themes/${themeName}.css`,
    { cache: false } // Allow theme switching
  );
}
```

### Responsive CSS Loading

```typescript
// Load CSS based on viewport
if (window.innerWidth < 768) {
  CssLoader.loadCssFile(SPContext.webAbsoluteUrl, 'Style Library', 'mobile-overrides.css');
}
```

### Feature-Specific CSS

```typescript
// Load CSS only when features are enabled
if (this.properties.enableAdvancedFeatures) {
  CssLoader.loadCssFiles(SPContext.webAbsoluteUrl, 'Style Library', [
    'advanced-ui.css',
    'animations.css',
  ]);
}
```

## Troubleshooting

### CSS File Not Loading

1. **Check file path**: Ensure the CSS file exists in the specified library
2. **Verify permissions**: User must have read access to the document library
3. **Check console**: Look for warning messages about failed loads
4. **Test URL manually**: Try accessing the CSS file URL directly in browser

### CSS Not Applying

1. **CSS specificity**: SharePoint CSS might override your styles
2. **Load order**: Ensure CSS loads before component rendering
3. **Cache issues**: Try disabling cache during development

### Multiple CSS Conflicts

1. **Use specific selectors**: Avoid global CSS that might conflict
2. **Namespace your CSS**: Use component-specific class prefixes
3. **Load order matters**: Load base styles before component-specific styles

## Dependencies

- `@microsoft/sp-loader` (provided by SPFx)
- `spfx-toolkit/lib/utilities/context` (for SPContext integration)

## Related Documentation

- [SPContext Documentation](../context/README.md) - Learn about SPContext for web URL access
- [SPFx Component Loader](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/loader-component) - Microsoft documentation
