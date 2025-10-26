/**
 * Type definitions for SPLookupField component
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps, ISPLookupFieldValue } from '../types';

/**
 * Display mode for lookup field
 */
export enum SPLookupDisplayMode {
  /**
   * Auto-detect based on item count threshold
   * - Uses Dropdown (SelectBox) if items <= threshold
   * - Switches to Searchable (Autocomplete) if items > threshold
   */
  Auto = 'auto',

  /**
   * Force dropdown mode (SelectBox/TagBox)
   * - Loads ALL items upfront
   * - Best for small lookup lists (< 100 items)
   * - Renders as DevExtreme SelectBox/TagBox
   * - Provides instant filtering within loaded items
   */
  Dropdown = 'dropdown',

  /**
   * Force searchable mode (Autocomplete)
   * - Async loading with search-as-you-type
   * - Best for large lookup lists (> 100 items)
   * - Renders as PnP ListItemPicker
   * - Loads items on-demand based on search query
   */
  Searchable = 'searchable',

  /**
   * Alias for Dropdown mode (SelectBox)
   * Same as Dropdown - loads all items upfront
   */
  SelectBox = 'dropdown',

  /**
   * Alias for Searchable mode (Autocomplete)
   * Same as Searchable - async search
   */
  Autocomplete = 'searchable',
}

/**
 * Lookup data source configuration
 */
export interface ILookupDataSource {
  /**
   * Lookup list name or GUID
   */
  listNameOrId: string;

  /**
   * Field to display (usually 'Title')
   * @default 'Title'
   */
  displayField?: string;

  /**
   * Additional fields to retrieve
   */
  additionalFields?: string[];

  /**
   * CAML query filter
   */
  filter?: string;

  /**
   * Order by clause
   */
  orderBy?: string;

  /**
   * Maximum items to retrieve (for dropdown mode)
   * @default 100
   */
  itemLimit?: number;

  /**
   * Web URL for cross-site lookups
   */
  webUrl?: string;

  /**
   * Search fields for searchable mode
   * Fields to search when user types
   * @default [displayField]
   */
  searchFields?: string[];
}

/**
 * Props for SPLookupField component
 */
export interface ISPLookupFieldProps extends ISPFieldBaseProps<ISPLookupFieldValue | ISPLookupFieldValue[]> {
  /**
   * Lookup data source configuration
   */
  dataSource: ILookupDataSource;

  /**
   * Allow multiple selections
   * @default false
   */
  allowMultiple?: boolean;

  /**
   * Display mode for the lookup field
   *
   * Options:
   * - **Auto** (default): Automatically switches between SelectBox and Autocomplete based on item count
   * - **SelectBox** / **Dropdown**: Loads all items upfront, renders as SelectBox/TagBox (best for < 100 items)
   * - **Autocomplete** / **Searchable**: Async search-as-you-type (best for > 100 items)
   *
   * @default SPLookupDisplayMode.Auto
   *
   * @example
   * ```tsx
   * // For small lookup lists (< 100 items)
   * displayMode={SPLookupDisplayMode.SelectBox}
   *
   * // For large lookup lists (> 100 items)
   * displayMode={SPLookupDisplayMode.Autocomplete}
   * ```
   */
  displayMode?: SPLookupDisplayMode;

  /**
   * Threshold for auto-switching from SelectBox to Autocomplete mode
   *
   * When `displayMode` is set to `Auto`:
   * - If item count <= threshold: Uses SelectBox (loads all items)
   * - If item count > threshold: Uses Autocomplete (async search)
   *
   * @default 100
   *
   * @example
   * ```tsx
   * // Switch to autocomplete if more than 50 items
   * searchableThreshold={50}
   * ```
   */
  searchableThreshold?: number;

  /**
   * Show search box (for dropdown mode)
   * @default true
   */
  showSearchBox?: boolean;

  /**
   * Search delay in milliseconds
   * @default 300
   */
  searchDelay?: number;

  /**
   * Minimum search length (for searchable mode)
   * @default 2
   */
  minSearchLength?: number;

  /**
   * Number of items to load per page (searchable mode)
   * @default 50
   */
  pageSize?: number;

  /**
   * Maximum number of displayed tags (for multi-select)
   * @default 3
   */
  maxDisplayedTags?: number;

  /**
   * Show clear button
   * @default true
   */
  showClearButton?: boolean;

  /**
   * Use cache for lookup data
   * @default true
   */
  useCache?: boolean;

  /**
   * Custom item template renderer
   */
  itemTemplate?: (item: ISPLookupFieldValue) => React.ReactNode;

  /**
   * Dependent lookup parent field
   * When set, this lookup will filter based on parent selection
   */
  dependsOn?: {
    /**
     * Parent field name
     */
    fieldName: string;

    /**
     * Lookup field in the lookup list that links to parent
     */
    lookupField: string;
  };

  /**
   * Input styling mode
   * @default 'outlined'
   */
  stylingMode?: 'outlined' | 'underlined' | 'filled';

  /**
   * Callback when item count is determined
   * Useful for debugging or showing info to user
   */
  onItemCountDetermined?: (count: number, mode: SPLookupDisplayMode) => void;
}
