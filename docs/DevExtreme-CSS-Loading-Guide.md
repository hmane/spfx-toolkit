# DevExtreme CSS Loading Guide

This guide explains how to properly load DevExtreme CSS for SelectBox, TagBox, and other DevExtreme components in your SPFx projects.

## The Problem

DevExtreme components **require their base CSS** to render properly. Without it, you'll see:

- ❌ Missing borders or unstyled controls
- ❌ No dropdown icons
- ❌ Incorrect layout and spacing
- ❌ Poor visual appearance

## The Solution

You need **BOTH**:

1. **DevExtreme base CSS** (from CDN or SharePoint)
2. **SPFx Toolkit CSS overrides** (automatically included)

---

## Required DevExtreme CSS Files

For DevExtreme version **22.2.3** (as specified in package.json), you need:

1. **dx.common.css** - Base DevExtreme styles
2. **dx.material.blue.light.css** - Material Design theme (or your preferred theme)

---

## Loading Methods

### Method 1: CDN Loading (Recommended for Quick Setup)

Add this to your web part's `onInit()` method:

```typescript
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPComponentLoader } from '@microsoft/sp-loader';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

export default class YourWebPart extends BaseClientSideWebPart<IYourWebPartProps> {
  protected async onInit(): Promise<void> {
    // Initialize SPContext
    await SPContext.smart(this.context, 'YourWebPart');

    // Load DevExtreme CSS from CDN (version 22.2.3)
    SPComponentLoader.loadCss('https://cdn3.devexpress.com/jslib/22.2.3/css/dx.common.css');
    SPComponentLoader.loadCss('https://cdn3.devexpress.com/jslib/22.2.3/css/dx.material.blue.light.css');

    return super.onInit();
  }

  public render(): void {
    // Your render logic
  }
}
```

### Method 2: SharePoint Document Library (Recommended for Production)

If you prefer to host DevExtreme CSS files in SharePoint (for offline support or corporate policies):

#### Step 1: Upload CSS Files to SharePoint

1. Download CSS files from DevExpress:
   - https://cdn3.devexpress.com/jslib/22.2.3/css/dx.common.css
   - https://cdn3.devexpress.com/jslib/22.2.3/css/dx.material.blue.light.css

2. Upload to SharePoint:
   ```
   Style Library/
   └── devextreme/
       ├── dx.common.css
       └── dx.material.blue.light.css
   ```

#### Step 2: Load Using CssLoader Utility

```typescript
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';
import { CssLoader } from 'spfx-toolkit/lib/utilities/CssLoader';

export default class YourWebPart extends BaseClientSideWebPart<IYourWebPartProps> {
  protected async onInit(): Promise<void> {
    // Initialize SPContext
    await SPContext.smart(this.context, 'YourWebPart');

    // Load DevExtreme CSS from Style Library
    CssLoader.loadCssFiles(SPContext.webAbsoluteUrl, 'Style Library', [
      'devextreme/dx.common.css',
      'devextreme/dx.material.blue.light.css',
    ]);

    return super.onInit();
  }

  public render(): void {
    // Your render logic
  }
}
```

### Method 3: Conditional Loading (Development vs Production)

Load from CDN during development and SharePoint in production:

```typescript
protected async onInit(): Promise<void> {
  await SPContext.smart(this.context, 'YourWebPart');

  const isDevelopment = this.context.environment.type === EnvironmentType.Local;

  if (isDevelopment) {
    // Development: Load from CDN
    SPComponentLoader.loadCss('https://cdn3.devexpress.com/jslib/22.2.3/css/dx.common.css');
    SPComponentLoader.loadCss('https://cdn3.devexpress.com/jslib/22.2.3/css/dx.material.blue.light.css');
  } else {
    // Production: Load from SharePoint
    CssLoader.loadCssFiles(SPContext.webAbsoluteUrl, 'Style Library', [
      'devextreme/dx.common.css',
      'devextreme/dx.material.blue.light.css',
    ]);
  }

  return super.onInit();
}
```

---

## Available DevExtreme Themes

DevExtreme provides multiple themes. Choose one that matches your design:

### Material Design Themes

```typescript
// Light themes
'dx.material.blue.light.css'      // Blue (default)
'dx.material.orange.light.css'    // Orange
'dx.material.purple.light.css'    // Purple
'dx.material.teal.light.css'      // Teal
'dx.material.lime.light.css'      // Lime

// Dark themes
'dx.material.blue.dark.css'       // Blue dark
'dx.material.orange.dark.css'     // Orange dark
```

### Generic Themes

```typescript
'dx.light.css'                    // Generic light
'dx.dark.css'                     // Generic dark
```

### Compact Themes (Denser UI)

```typescript
'dx.material.blue.light.compact.css'    // Compact Material
'dx.light.compact.css'                  // Compact Generic
```

**Example:**

```typescript
// Using Orange Material theme
SPComponentLoader.loadCss('https://cdn3.devexpress.com/jslib/22.2.3/css/dx.common.css');
SPComponentLoader.loadCss('https://cdn3.devexpress.com/jslib/22.2.3/css/dx.material.orange.light.css');
```

---

## What's Included in SPFx Toolkit

The toolkit **automatically includes** Fluent UI overrides for DevExtreme components:

✅ **Fluent UI color scheme** - Matches SharePoint's design system
✅ **Consistent borders** - 1px borders matching TextField, Dropdown
✅ **Hover states** - Gray hover effect
✅ **Focus states** - Blue border on focus
✅ **Error states** - Red border for validation errors
✅ **Disabled states** - Grayed out appearance
✅ **Dropdown styling** - Consistent with Fluent UI
✅ **Tag styling** - For TagBox component

These styles are in `spfxForm.css` and automatically applied when you use DevExtreme components from the toolkit.

---

## Verification Checklist

After implementing CSS loading, verify everything works:

### ✅ Visual Checks

- [ ] SelectBox has a visible border
- [ ] Dropdown arrow icon is visible
- [ ] Clicking SelectBox opens dropdown list
- [ ] Dropdown list has proper styling
- [ ] TagBox shows tags with proper styling
- [ ] Hover changes border color to darker gray
- [ ] Focus shows blue border
- [ ] Error state shows red border

### ✅ Console Checks

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "CSS"
4. Verify you see:
   - ✅ dx.common.css (loaded successfully)
   - ✅ dx.material.blue.light.css (loaded successfully)
5. No 404 errors for DevExtreme CSS

### ✅ DOM Checks

1. Inspect a SelectBox element
2. Verify classes include:
   - `dx-selectbox`
   - `dx-textbox`
   - `dx-editor-outlined`
3. Check computed styles show proper border

---

## Troubleshooting

### Issue: SelectBox/TagBox Still Has No Border

**Cause:** DevExtreme CSS not loaded

**Solution:**
1. Check browser console for CSS loading errors
2. Verify CSS URLs are correct
3. Ensure `onInit()` loads CSS before render
4. Try opening DevExtreme CSS URL directly in browser to verify it's accessible

### Issue: Wrong Colors or Theme

**Cause:** Incorrect theme file loaded

**Solution:**
- Verify you're loading the correct theme CSS file
- Clear browser cache (Ctrl+Shift+R)
- Check if multiple theme files are loaded (only load one theme)

### Issue: Styling Works Locally but Not in Production

**Cause:** CDN blocked by corporate firewall or SharePoint files missing

**Solution:**
- Use Method 2 (SharePoint Document Library)
- Verify CSS files uploaded to correct location
- Check file permissions (Everyone should have Read access)

### Issue: Components Look Different After Toolkit Update

**Cause:** Toolkit CSS overrides changed

**Solution:**
- Review changelog for breaking changes
- Rebuild your project: `npm run build`
- Clear browser cache
- If needed, add custom CSS overrides to your web part

### Issue: Dropdown Appears Behind Other Elements

**Cause:** z-index conflict

**Solution:**
```css
/* Add to your web part CSS */
.dx-dropdowneditor-overlay {
  z-index: 1000000 !important;
}
```

---

## Best Practices

### 1. Load CSS in onInit()

```typescript
protected async onInit(): Promise<void> {
  await SPContext.smart(this.context, 'MyWebPart');

  // Load CSS BEFORE rendering
  SPComponentLoader.loadCss('https://cdn3.devexpress.com/jslib/22.2.3/css/dx.common.css');
  SPComponentLoader.loadCss('https://cdn3.devexpress.com/jslib/22.2.3/css/dx.material.blue.light.css');

  return super.onInit();
}
```

### 2. Use Consistent Theme Across Web Parts

Create a shared configuration file:

```typescript
// src/config/DevExtremeConfig.ts
export class DevExtremeConfig {
  public static readonly COMMON_CSS = 'https://cdn3.devexpress.com/jslib/22.2.3/css/dx.common.css';
  public static readonly THEME_CSS = 'https://cdn3.devexpress.com/jslib/22.2.3/css/dx.material.blue.light.css';
}

// In your web part
import { DevExtremeConfig } from './config/DevExtremeConfig';

SPComponentLoader.loadCss(DevExtremeConfig.COMMON_CSS);
SPComponentLoader.loadCss(DevExtremeConfig.THEME_CSS);
```

### 3. Version Consistency

Always use the same DevExtreme version as in package.json:

```json
{
  "dependencies": {
    "devextreme": "^22.2.3",
    "devextreme-react": "^22.2.3"
  }
}
```

Load CSS for version **22.2.3**, not 23.x or 21.x.

### 4. Performance Optimization

Use `SPComponentLoader.loadCss()` instead of adding `<link>` tags - it prevents duplicate loading and integrates with SPFx's component loading pipeline.

---

## Additional Resources

- **DevExtreme Themes Explorer:** https://js.devexpress.com/Documentation/Guide/Themes_and_Styles/Predefined_Themes/
- **SPFx Component Loader:** https://learn.microsoft.com/en-us/javascript/api/sp-loader/spcomponentloader
- **CssLoader Documentation:** ../src/utilities/CssLoader/README.md
- **DevExtreme CSS CDN:** https://cdn3.devexpress.com/jslib/

---

## Summary

To fix DevExtreme SelectBox and TagBox styling:

1. ✅ **Add DevExtreme CSS loading** to your web part's `onInit()` method
2. ✅ **Use CDN or SharePoint** document library
3. ✅ **Load both** `dx.common.css` and theme CSS
4. ✅ **Match version** to package.json (22.2.3)
5. ✅ **Verify** in browser that CSS files load successfully

The toolkit automatically provides Fluent UI styling overrides - you just need to load the base DevExtreme CSS!
