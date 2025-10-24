/**
 * Type definitions for SPTaxonomyField component
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps, ISPTaxonomyFieldValue } from '../types';

/**
 * Taxonomy term store configuration
 */
export interface ITaxonomyDataSource {
  /**
   * Term set GUID
   */
  termSetId: string;

  /**
   * Anchor term GUID (optional - to limit to a specific branch)
   */
  anchorId?: string;

  /**
   * Term store name (optional - defaults to default term store)
   */
  termStoreName?: string;
}

/**
 * Props for SPTaxonomyField component
 */
export interface ISPTaxonomyFieldProps extends ISPFieldBaseProps<ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[]> {
  /**
   * Taxonomy data source configuration
   */
  dataSource: ITaxonomyDataSource;

  /**
   * Allow multiple term selections
   * @default false
   */
  allowMultiple?: boolean;

  /**
   * Show search box
   * @default true
   */
  showSearchBox?: boolean;

  /**
   * Search delay in milliseconds
   * @default 300
   */
  searchDelay?: number;

  /**
   * Minimum search length
   * @default 2
   */
  minSearchLength?: number;

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
   * Use cache for taxonomy data
   * @default true
   */
  useCache?: boolean;

  /**
   * Show term path (hierarchy)
   * @default false
   */
  showPath?: boolean;

  /**
   * Path separator when showing hierarchy
   * @default ' > '
   */
  pathSeparator?: string;

  /**
   * Input styling mode
   * @default 'outlined'
   */
  stylingMode?: 'outlined' | 'underlined' | 'filled';
}
