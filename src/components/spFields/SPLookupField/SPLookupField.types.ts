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
   */
  Auto = 'auto',

  /**
   * Force dropdown mode (SelectBox/TagBox) - loads all items
   */
  Dropdown = 'dropdown',

  /**
   * Force searchable mode with async loading
   */
  Searchable = 'searchable',
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
   * - auto: Auto-detect based on threshold (default)
   * - dropdown: Force dropdown mode
   * - searchable: Force searchable mode
   * @default SPLookupDisplayMode.Auto
   */
  displayMode?: SPLookupDisplayMode;

  /**
   * Threshold for switching to searchable mode
   * When item count exceeds this, auto switches to searchable
   * @default 100
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
