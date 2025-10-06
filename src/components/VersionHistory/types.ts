/**
 * Props for the VersionHistory component
 */
export interface IVersionHistoryProps {
  /**
   * SharePoint List GUID
   */
  listId: string;

  /**
   * SharePoint Item ID
   */
  itemId: number;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * Optional callback after successful export
   */
  onExport?: (versionCount: number) => void;

  /**
   * Optional callback after successful download
   */
  onDownload?: (version: IVersionInfo) => void;
}

/**
 * Internal state for VersionHistory component
 */
export interface IVersionHistoryState {
  /**
   * All versions loaded from SharePoint
   */
  allVersions: IVersionInfo[];

  /**
   * Filtered versions based on search/filters
   */
  filteredVersions: IVersionInfo[];

  /**
   * Currently selected version for detail view
   */
  selectedVersion: IVersionInfo | null;

  /**
   * Whether data is loading
   */
  isLoading: boolean;

  /**
   * Error message if loading failed
   */
  error: string | null;

  /**
   * Whether user has permission to view versions
   */
  hasPermission: boolean;

  /**
   * Item type (auto-detected)
   */
  itemType: 'document' | 'list' | null;

  /**
   * Item metadata
   */
  itemInfo: IItemInfo | null;

  /**
   * Search query
   */
  searchQuery: string;

  /**
   * Filter: Modified by user
   */
  filterByUser: string | null;

  /**
   * Filter: Date range
   */
  filterDateRange: DateRangeFilter;

  /**
   * Filter: Show major versions only
   */
  showMajorOnly: boolean;

  /**
   * Whether filters panel is expanded
   */
  filtersExpanded: boolean;
}

/**
 * Version information with change tracking
 */
export interface IVersionInfo {
  /**
   * Version label (e.g., "5.0", "4.1")
   */
  versionLabel: string;

  /**
   * Version ID
   */
  versionId: number;

  /**
   * Whether this is a major version
   */
  isCurrentVersion: boolean;

  /**
   * Modified date
   */
  modified: Date;

  /**
   * Modified by user login name
   */
  modifiedBy: string;

  /**
   * Modified by display name
   */
  modifiedByName: string;

  /**
   * Modified by email
   */
  modifiedByEmail: string;

  /**
   * Check-in comment
   */
  checkInComment: string | null;

  /**
   * File size in bytes (for documents)
   */
  size: number | null;

  /**
   * File size delta from previous version
   */
  sizeDelta: number | null;

  /**
   * Changed fields compared to previous version
   */
  changedFields: IFieldChange[];

  /**
   * Whether this version has any field changes
   */
  hasChanges: boolean;

  /**
   * All field values for this version
   */
  fieldValues: Record<string, any>;

  /**
   * File server relative URL (for documents)
   */
  fileUrl: string | null;
}

/**
 * Field change information
 */
export interface IFieldChange {
  /**
   * Field internal name
   */
  internalName: string;

  /**
   * Field display name
   */
  displayName: string;

  /**
   * Field type
   */
  fieldType: string;

  /**
   * Previous value
   */
  previousValue: any;

  /**
   * New value
   */
  newValue: any;

  /**
   * Formatted previous value for display
   */
  previousValueFormatted: string;

  /**
   * Formatted new value for display
   */
  newValueFormatted: string;

  /**
   * Change type
   */
  changeType: 'added' | 'modified' | 'removed';

  /**
   * Whether this is a significant change (for highlighting)
   */
  isSignificant: boolean;
}

/**
 * Item information
 */
export interface IItemInfo {
  /**
   * Item title or filename
   */
  title: string;

  /**
   * List title
   */
  listTitle: string;

  /**
   * Item URL
   */
  itemUrl: string;

  /**
   * File extension (for documents)
   */
  fileExtension: string | null;

  /**
   * Content type
   */
  contentType: string;

  /**
   * Total field count
   */
  totalFieldCount: number;
}

/**
 * Date range filter
 */
export type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Filter state
 */
export interface IFilterState {
  searchQuery: string;
  filterByUser: string | null;
  filterDateRange: DateRangeFilter;
  showMajorOnly: boolean;
  customDateStart: Date | null;
  customDateEnd: Date | null;
}

/**
 * Props for VersionTimeline component
 */
export interface IVersionTimelineProps {
  versions: IVersionInfo[];
  selectedVersion: IVersionInfo | null;
  onSelectVersion: (version: IVersionInfo) => void;
  isLoading: boolean;
  filterState: IFilterState;
  onFilterChange: (filterState: Partial<IFilterState>) => void;
  itemType: 'document' | 'list';
  filtersExpanded: boolean;
  onToggleFilters: () => void;
}

/**
 * Props for VersionCard component
 */
export interface IVersionCardProps {
  version: IVersionInfo;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Props for VersionDetails component
 */
export interface IVersionDetailsProps {
  version: IVersionInfo;
  itemInfo: IItemInfo;
  itemType: 'document' | 'list';
  onDownload: () => void;
  isDownloading: boolean;
}

/**
 * Props for FieldChangesTable component
 */
export interface IFieldChangesTableProps {
  changes: IFieldChange[];
  itemInfo: IItemInfo;
}

/**
 * Props for FieldChangeRow component
 */
export interface IFieldChangeRowProps {
  change: IFieldChange;
}

/**
 * Field type enum for better type safety
 */
export enum FieldType {
  Text = 'Text',
  Note = 'Note',
  Choice = 'Choice',
  MultiChoice = 'MultiChoice',
  Number = 'Number',
  Currency = 'Currency',
  DateTime = 'DateTime',
  Boolean = 'Boolean',
  User = 'User',
  UserMulti = 'UserMulti',
  Lookup = 'Lookup',
  LookupMulti = 'LookupMulti',
  URL = 'URL',
  Calculated = 'Calculated',
  Computed = 'Computed',
  Attachments = 'Attachments',
  Guid = 'Guid',
  Integer = 'Integer',
  Counter = 'Counter',
  ContentTypeId = 'ContentTypeId',
  File = 'File',
  TaxonomyFieldType = 'TaxonomyFieldType',
  TaxonomyFieldTypeMulti = 'TaxonomyFieldTypeMulti',
}
