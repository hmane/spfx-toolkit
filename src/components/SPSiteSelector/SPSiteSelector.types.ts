// src/components/SPSiteSelector/SPSiteSelector.types.ts
import type { SPFI } from '@pnp/sp';

/**
 * Represents a SharePoint site item returned by the selector.
 */
export interface ISPSiteItem {
  /** The absolute URL of the site */
  url: string;
  /** The display title of the site */
  title: string;
  /** The web GUID of the site (if available) */
  webId?: string;
}

/**
 * Props for the SPSiteSelector component.
 */
export interface ISPSiteSelectorProps {
  /**
   * Called when the user selects a site from the list.
   */
  onSiteSelected: (site: ISPSiteItem) => void;

  /**
   * Placeholder text for the search input.
   * @default 'Search for a site...'
   */
  placeholder?: string;

  /**
   * Maximum number of search results to return.
   * @default 8
   */
  rowLimit?: number;

  /**
   * Optional list of recently visited / pinned sites to show
   * when the search box is empty.
   */
  recentSites?: ISPSiteItem[];

  /**
   * When true, the control renders in a disabled state and cannot be interacted with.
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional CSS class name to apply to the root container.
   */
  className?: string;

  /**
   * Custom PnP SPFI instance. Falls back to SPContext.sp when absent.
   */
  sp?: SPFI;
}
