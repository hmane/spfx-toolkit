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
   * Use cache for taxonomy data
   * @default true
   */
  useCache?: boolean;
}
