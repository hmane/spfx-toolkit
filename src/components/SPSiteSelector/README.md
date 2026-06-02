# SPSiteSelector

A search-backed SharePoint site / hub picker component.

Renders a Fluent `SearchBox` that issues a debounced `contentclass:STS_Site OR contentclass:STS_Web` search query via `useSharePointSearch`. Matching sites appear in a `Callout` as Persona-style rows. Selecting a row calls `onSiteSelected` and closes the callout.

When the search box is empty and `recentSites` are provided, those are shown instead of search results.

## Import

This component is **augmentation / search-bound** and is intentionally **NOT** included in the lightweight `spfx-toolkit/components` barrel. Import via deep subpath:

```typescript
import { SPSiteSelector } from 'spfx-toolkit/lib/components/SPSiteSelector';
import type { ISPSiteItem, ISPSiteSelectorProps } from 'spfx-toolkit/lib/components/SPSiteSelector';
```

## Usage

```tsx
import * as React from 'react';
import { SPSiteSelector } from 'spfx-toolkit/lib/components/SPSiteSelector';
import type { ISPSiteItem } from 'spfx-toolkit/lib/components/SPSiteSelector';

const MyWebPart: React.FC = () => {
  const handleSiteSelected = (site: ISPSiteItem): void => {
    console.log('Selected site:', site.title, site.url);
  };

  return (
    <SPSiteSelector
      onSiteSelected={handleSiteSelected}
      placeholder='Search for a site...'
      rowLimit={8}
    />
  );
};
```

## With Recent Sites

```tsx
const recentSites: ISPSiteItem[] = [
  { url: 'https://contoso.sharepoint.com/sites/hr', title: 'HR Hub' },
  { url: 'https://contoso.sharepoint.com/sites/finance', title: 'Finance' },
];

<SPSiteSelector
  onSiteSelected={handleSiteSelected}
  recentSites={recentSites}
  placeholder='Search or pick a recent site...'
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSiteSelected` | `(site: ISPSiteItem) => void` | **required** | Called when a site row is selected |
| `placeholder` | `string` | `'Search for a site...'` | Placeholder text for the search box |
| `rowLimit` | `number` | `8` | Maximum number of search results |
| `recentSites` | `ISPSiteItem[]` | `undefined` | Sites to show when the search box is empty |
| `disabled` | `boolean` | `false` | Disables the control |
| `className` | `string` | `undefined` | Extra CSS class for the root element |
| `sp` | `SPFI` | `SPContext.sp` | Custom PnP SPFI instance |

## ISPSiteItem

```typescript
interface ISPSiteItem {
  url: string;       // Absolute URL of the site
  title: string;     // Display title
  webId?: string;    // Web GUID (when available from search)
}
```

## Search Query

Internally uses:
- `Querytext`: `contentclass:STS_Site OR contentclass:STS_Web <userInput>`
- `SelectProperties`: `['Title', 'Path', 'SiteId', 'WebId']`
- `RowLimit`: `props.rowLimit ?? 8`
- `TrimDuplicates`: `true`

Requires `SPContext` to be initialized before use.
