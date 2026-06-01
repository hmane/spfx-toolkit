// src/components/SPSiteSelector/SPSiteSelector.tsx
import * as React from 'react';
import { Callout } from '@fluentui/react/lib/Callout';
import { DirectionalHint } from '@fluentui/react/lib/Callout';
import { Persona, PersonaSize } from '@fluentui/react/lib/Persona';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';

import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSharePointSearch } from '../../hooks/useSharePointSearch';
import './SPSiteSelector.css';
import { ISPSiteItem, ISPSiteSelectorProps } from './SPSiteSelector.types';

// ─── Site query constants ─────────────────────────────────────────────────────

const SITE_SELECT_PROPERTIES = ['Title', 'Path', 'SiteId', 'WebId'];
const SITE_CONTENT_CLASS_FILTER = 'contentclass:STS_Site OR contentclass:STS_Web ';
const DEBOUNCE_MS = 300;

// ─── Pure helper: map a search result row to an ISPSiteItem ──────────────────

function rowToSiteItem(row: Record<string, unknown>): ISPSiteItem {
  return {
    url: String(row['Path'] ?? ''),
    title: String(row['Title'] ?? row['Path'] ?? ''),
    webId: row['WebId'] != null ? String(row['WebId']) : undefined,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A search-backed SharePoint site / hub picker.
 *
 * Renders a Fluent `SearchBox`. As the user types, the query is debounced and
 * passed to `useSharePointSearch` using a site content-class filter. Matching
 * sites are shown in a `Callout` as `Persona`-style rows. Selecting a row
 * calls `onSiteSelected` and closes the callout.
 *
 * When the search box is empty, `recentSites` (if provided) are shown instead.
 *
 * This component is augmentation/search-bound and is intentionally NOT included
 * in the lightweight `src/components/index.ts` barrel.
 * Import via:  `spfx-toolkit/lib/components/SPSiteSelector`
 */
export const SPSiteSelector: React.FC<ISPSiteSelectorProps> = ({
  onSiteSelected,
  placeholder = 'Search for a site...',
  rowLimit = 8,
  recentSites,
  disabled = false,
  className,
  sp,
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const [isCalloutOpen, setIsCalloutOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Debounce the raw input before firing the search
  const debouncedQuery = useDebouncedValue(inputValue, DEBOUNCE_MS);

  // Build the full query: content-class guard + user text (trimmed)
  const trimmedQuery = debouncedQuery.trim();
  const searchQuery = trimmedQuery
    ? `${SITE_CONTENT_CLASS_FILTER}${trimmedQuery}`
    : '';

  // Drive search results with the shared hook
  const { results: rawResults, loading, error } = useSharePointSearch<Record<string, unknown>>({
    query: searchQuery,
    selectProperties: SITE_SELECT_PROPERTIES,
    rowLimit,
    trimDuplicates: true,
    enabled: !disabled && searchQuery.length > 0,
    sp,
  });

  // Map raw search rows to ISPSiteItem
  const siteResults: ISPSiteItem[] = React.useMemo(
    () => rawResults.map(rowToSiteItem).filter(s => s.url),
    [rawResults]
  );

  // Items shown in the callout: search results when query exists, else recentSites
  const showRecentSites = !trimmedQuery && Array.isArray(recentSites) && recentSites.length > 0;
  const displayItems: ISPSiteItem[] = showRecentSites ? (recentSites as ISPSiteItem[]) : siteResults;

  // Callout visibility: open when user is typing or when showing recent sites on focus
  const shouldShowCallout = !disabled && isCalloutOpen && (
    loading ||
    error !== null ||
    displayItems.length > 0 ||
    (trimmedQuery.length > 0 && !loading)
  );

  // ─── Event handlers ──────────────────────────────────────────────────────

  const handleChange = React.useCallback(
    (_ev: React.ChangeEvent<HTMLInputElement> | undefined, newValue?: string) => {
      const value = newValue ?? '';
      setInputValue(value);
      if (!isCalloutOpen) {
        setIsCalloutOpen(true);
      }
    },
    [isCalloutOpen]
  );

  const handleFocus = React.useCallback(() => {
    setIsCalloutOpen(true);
  }, []);

  const handleClear = React.useCallback(() => {
    setInputValue('');
    setIsCalloutOpen(false);
  }, []);

  const handleDismiss = React.useCallback(() => {
    setIsCalloutOpen(false);
  }, []);

  const handleSiteClick = React.useCallback(
    (site: ISPSiteItem) => {
      onSiteSelected(site);
      setInputValue('');
      setIsCalloutOpen(false);
    },
    [onSiteSelected]
  );

  const handleKeyDown = React.useCallback(
    (site: ISPSiteItem) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSiteClick(site);
      }
    },
    [handleSiteClick]
  );

  // ─── Render helpers ──────────────────────────────────────────────────────

  const renderSiteRow = (site: ISPSiteItem, idx: number): React.ReactElement => (
    <li key={`site-${idx}-${site.url}`} role='none'>
      <button
        type='button'
        className='sp-site-selector__item'
        onClick={() => handleSiteClick(site)}
        onKeyDown={handleKeyDown(site)}
        aria-label={`Select site: ${site.title}`}
      >
        <div className='sp-site-selector__item-inner'>
          <Persona
            text={site.title}
            size={PersonaSize.size32}
            hidePersonaDetails
          />
          <div className='sp-site-selector__item-text'>
            <span className='sp-site-selector__item-title'>{site.title}</span>
            <span className='sp-site-selector__item-url'>{site.url}</span>
          </div>
        </div>
      </button>
    </li>
  );

  const renderCalloutContent = (): React.ReactElement | null => {
    if (loading) {
      return (
        <div className='sp-site-selector__feedback' role='status' aria-live='polite'>
          <Spinner size={SpinnerSize.small} />
          <span>Searching sites...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className='sp-site-selector__error' role='alert'>
          Failed to search sites. Please try again.
        </div>
      );
    }

    if (displayItems.length === 0 && trimmedQuery.length > 0) {
      return (
        <div className='sp-site-selector__feedback'>
          No sites found for &quot;{trimmedQuery}&quot;.
        </div>
      );
    }

    if (displayItems.length === 0) {
      return null;
    }

    return (
      <ul className='sp-site-selector__list' role='listbox' aria-label='Site search results'>
        {showRecentSites && (
          <li role='none'>
            <div className='sp-site-selector__section-label' aria-hidden='true'>
              Recent sites
            </div>
          </li>
        )}
        {displayItems.map((site, idx) => renderSiteRow(site, idx))}
      </ul>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={`sp-site-selector${className ? ` ${className}` : ''}`}
    >
      <SearchBox
        className='sp-site-selector__search-box'
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onClear={handleClear}
        disabled={disabled}
        aria-label={placeholder}
        aria-expanded={shouldShowCallout}
        aria-haspopup='listbox'
        role='combobox'
      />

      {shouldShowCallout && containerRef.current && (
        <Callout
          target={containerRef.current}
          directionalHint={DirectionalHint.bottomLeftEdge}
          isBeakVisible={false}
          gapSpace={2}
          onDismiss={handleDismiss}
          calloutWidth={containerRef.current.offsetWidth || 320}
          styles={{
            root: { padding: 0 },
            calloutMain: { padding: 0 },
          }}
        >
          <div className='sp-site-selector__callout'>
            {renderCalloutContent()}
          </div>
        </Callout>
      )}
    </div>
  );
};
