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
   * @deprecated Compatibility-only. ModernTaxonomyPicker uses the default term
   * store from the SPFx context in the current implementation.
   */
  termStoreName?: string;
}

/**
 * Props for SPTaxonomyField component
 */
export interface ISPTaxonomyFieldProps extends ISPFieldBaseProps<ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[]> {
  /**
   * Taxonomy data source configuration
   * Optional if columnName is provided - will auto-load from SharePoint column metadata
   */
  dataSource?: ITaxonomyDataSource;

  /**
   * SharePoint column/field name to auto-load configuration from
   * When provided, the component will read column metadata to get termSetId
   * @optional
   */
  columnName?: string;

  /**
   * List ID or name where the column exists (required when using columnName)
   * @optional
   */
  listId?: string;

  /**
   * Allow multiple term selections
   * @default false
   */
  allowMultiple?: boolean;

  /**
   * @deprecated Compatibility-only. Search UI is controlled by the underlying
   * PnP ModernTaxonomyPicker and is not configurable here.
   */
  showSearchBox?: boolean;

  /**
   * @deprecated Compatibility-only. Search timing is controlled by the
   * underlying PnP ModernTaxonomyPicker.
   */
  searchDelay?: number;

  /**
   * @deprecated Compatibility-only. Minimum search length is controlled by the
   * underlying PnP ModernTaxonomyPicker.
   */
  minSearchLength?: number;

  /**
   * @deprecated Compatibility-only. Tag display is controlled by the underlying
   * PnP ModernTaxonomyPicker.
   */
  maxDisplayedTags?: number;

  /**
   * @deprecated Compatibility-only. Clear behavior is controlled by the
   * underlying PnP ModernTaxonomyPicker.
   */
  showClearButton?: boolean;

  /**
   * Use cache for taxonomy data
   * @default true
   */
  useCache?: boolean;

  /**
   * @deprecated Compatibility-only. The current picker returns selected terms
   * but does not render a custom path display.
   */
  showPath?: boolean;

  /**
   * @deprecated Compatibility-only. See `showPath`.
   */
  pathSeparator?: string;

  /**
   * @deprecated Compatibility-only. Styling is controlled by the underlying PnP
   * ModernTaxonomyPicker and shared SPField CSS.
   */
  stylingMode?: 'outlined' | 'underlined' | 'filled';
}
