/**
 * Shared type definitions for SharePoint value utilities
 * File: spTypes.ts
 */

/**
 * SharePoint user/principal interface
 * Used for both input (updates) and output (extraction) of Person/Group fields
 * Handles various property name variations from different SharePoint contexts
 */
export interface IPrincipal {
  id: string;
  email?: string;
  title?: string;
  value?: string; // login name
  loginName?: string; // alternative to value
  department?: string;
  jobTitle?: string;
  sip?: string;
  picture?: string;
}

/**
 * SharePoint lookup field object
 */
export interface SPLookup {
  id?: number;
  title?: string;
}

/**
 * SharePoint taxonomy/managed metadata field object
 */
export interface SPTaxonomy {
  label?: string;
  termId?: string;
  wssId?: number;
}

/**
 * SharePoint URL/hyperlink field object
 */
export interface SPUrl {
  url?: string;
  description?: string;
}

/**
 * SharePoint location field object
 */
export interface SPLocation {
  displayName?: string;
  locationUri?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

/**
 * SharePoint image field object
 */
export interface SPImage {
  serverUrl?: string;
  serverRelativeUrl?: string;
  id?: string;
  fileName?: string;
}

/**
 * Interface for validateUpdateListItem field values
 */
export interface IListItemFormUpdateValue {
  FieldName: string;
  FieldValue: string;
}
