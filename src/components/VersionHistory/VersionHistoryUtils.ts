/**
 * VersionHistory Utility Functions
 * Helper functions for version comparison, formatting, and data processing
 */

import { SPContext } from '../../utilities/context';
import { FieldType, IFieldChange, IFilterState, IItemInfo, IVersionInfo } from './types';

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format file size delta with arrow indicator
 */
export function formatSizeDelta(delta: number | null): string {
  if (delta === null || delta === 0) return '';

  const arrow = delta > 0 ? '↑' : '↓';
  const formatted = formatFileSize(Math.abs(delta));

  return `${delta > 0 ? '+' : '-'}${formatted} ${arrow}`;
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  }

  const years = Math.floor(diffDays / 365);
  return `${years}y ago`;
}

/**
 * Format date to absolute time
 */
export function formatAbsoluteTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return date.toLocaleString(SPContext.currentUICultureName, options);
}

/**
 * Get field type from SharePoint field type string
 */
export function getFieldType(fieldTypeString: string): FieldType {
  const typeMap: Record<string, FieldType> = {
    Text: FieldType.Text,
    Note: FieldType.Note,
    Choice: FieldType.Choice,
    MultiChoice: FieldType.MultiChoice,
    Number: FieldType.Number,
    Currency: FieldType.Currency,
    DateTime: FieldType.DateTime,
    Boolean: FieldType.Boolean,
    User: FieldType.User,
    UserMulti: FieldType.UserMulti,
    Lookup: FieldType.Lookup,
    LookupMulti: FieldType.LookupMulti,
    URL: FieldType.URL,
    Calculated: FieldType.Calculated,
    Computed: FieldType.Computed,
    Attachments: FieldType.Attachments,
    Guid: FieldType.Guid,
    Integer: FieldType.Integer,
    Counter: FieldType.Counter,
    ContentTypeId: FieldType.ContentTypeId,
    File: FieldType.File,
    TaxonomyFieldType: FieldType.TaxonomyFieldType,
    TaxonomyFieldTypeMulti: FieldType.TaxonomyFieldTypeMulti,
  };

  return typeMap[fieldTypeString] || FieldType.Text;
}

/**
 * Format field value for display based on field type
 */
export function formatFieldValue(value: any, fieldType: string): string {
  if (value === null || value === undefined || value === '') {
    return '(empty)';
  }

  const type = getFieldType(fieldType);

  switch (type) {
    case FieldType.DateTime:
      try {
        const date = new Date(value);
        return formatAbsoluteTime(date);
      } catch {
        return String(value);
      }

    case FieldType.User:
    case FieldType.UserMulti:
      if (typeof value === 'string') {
        return value;
      }
      if (Array.isArray(value)) {
        return value.map(u => u.Title || u.LookupValue || u).join(', ');
      }
      if (value.Title) return value.Title;
      if (value.LookupValue) return value.LookupValue;
      return String(value);

    case FieldType.Lookup:
    case FieldType.LookupMulti:
      if (typeof value === 'string') {
        return value;
      }
      if (Array.isArray(value)) {
        return value.map(v => v.LookupValue || v).join(', ');
      }
      if (value.LookupValue) return value.LookupValue;
      return String(value);

    case FieldType.Boolean:
      return value === true || value === 'true' || value === '1' || value === 1 ? 'Yes' : 'No';

    case FieldType.MultiChoice:
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      if (typeof value === 'string' && value.includes(';#')) {
        return value
          .split(';#')
          .filter(v => v)
          .join(', ');
      }
      return String(value);

    case FieldType.URL:
      if (typeof value === 'object' && value.Url) {
        return value.Description || value.Url;
      }
      return String(value);

    case FieldType.Number:
    case FieldType.Currency:
    case FieldType.Integer:
      return String(value);

    case FieldType.TaxonomyFieldType:
    case FieldType.TaxonomyFieldTypeMulti:
      if (typeof value === 'string') {
        return value;
      }
      if (value.Label) return value.Label;
      if (Array.isArray(value)) {
        return value.map(v => v.Label || v).join(', ');
      }
      return String(value);

    case FieldType.Note:
      const stripped = String(value).replace(/<[^>]*>/g, '');
      return stripped.length > 200 ? `${stripped.substring(0, 200)}...` : stripped;

    default:
      return String(value);
  }
}

/**
 * Extract comparable ID from User/Lookup field value
 * Handles various SharePoint return formats
 */
function extractLookupId(value: any): string | null {
  if (value === null || value === undefined) return null;

  // Handle primitive values
  if (typeof value === 'number' || typeof value === 'string') {
    return String(value);
  }

  // Handle object values - try various property names SharePoint uses
  if (typeof value === 'object') {
    const id = value.LookupId ?? value.Id ?? value.id ?? value.ID;
    if (id !== undefined && id !== null) {
      return String(id);
    }
  }

  return null;
}

/**
 * Compare two field values to detect changes
 */
export function compareFieldValues(
  oldValue: any,
  newValue: any,
  fieldType: string
): { hasChanged: boolean; isSignificant: boolean } {
  const normalizeEmpty = (val: any): any => {
    if (val === null || val === undefined || val === '') return null;
    return val;
  };

  const normalizedOld = normalizeEmpty(oldValue);
  const normalizedNew = normalizeEmpty(newValue);

  // Both empty = no change
  if (normalizedOld === null && normalizedNew === null) {
    return { hasChanged: false, isSignificant: false };
  }

  // One empty, one not = change
  if (normalizedOld === null || normalizedNew === null) {
    return { hasChanged: true, isSignificant: true };
  }

  const type = getFieldType(fieldType);

  switch (type) {
    case FieldType.User:
    case FieldType.Lookup: {
      const oldId = extractLookupId(normalizedOld);
      const newId = extractLookupId(normalizedNew);

      // If we can't extract IDs, fall back to string comparison
      if (oldId === null && newId === null) {
        return {
          hasChanged: String(normalizedOld) !== String(normalizedNew),
          isSignificant: true,
        };
      }

      return {
        hasChanged: oldId !== newId,
        isSignificant: true,
      };
    }

    case FieldType.UserMulti:
    case FieldType.LookupMulti: {
      // Handle multi-value fields
      const getIds = (val: any): string[] => {
        if (Array.isArray(val)) {
          return val.map(v => extractLookupId(v)).filter((id): id is string => id !== null).sort();
        }
        const singleId = extractLookupId(val);
        return singleId ? [singleId] : [];
      };

      const oldIds = getIds(normalizedOld);
      const newIds = getIds(normalizedNew);

      return {
        hasChanged: JSON.stringify(oldIds) !== JSON.stringify(newIds),
        isSignificant: true,
      };
    }

    case FieldType.DateTime:
      try {
        // Normalize dates to ISO strings for comparison (ignore milliseconds differences)
        const oldDate = new Date(normalizedOld);
        const newDate = new Date(normalizedNew);

        // Compare at minute precision to avoid false positives from timezone/format differences
        const oldMinute = Math.floor(oldDate.getTime() / 60000);
        const newMinute = Math.floor(newDate.getTime() / 60000);

        return {
          hasChanged: oldMinute !== newMinute,
          isSignificant: true,
        };
      } catch {
        return {
          hasChanged: String(normalizedOld) !== String(normalizedNew),
          isSignificant: true,
        };
      }

    case FieldType.Number:
    case FieldType.Currency:
    case FieldType.Integer: {
      const oldNum = Number(normalizedOld);
      const newNum = Number(normalizedNew);

      // Handle NaN cases
      if (isNaN(oldNum) && isNaN(newNum)) {
        return { hasChanged: false, isSignificant: false };
      }

      return {
        hasChanged: oldNum !== newNum,
        isSignificant: true,
      };
    }

    case FieldType.Boolean: {
      // Normalize various boolean representations
      const toBool = (val: any): boolean => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          return val.toLowerCase() === 'true' || val === '1';
        }
        return Boolean(val);
      };

      return {
        hasChanged: toBool(normalizedOld) !== toBool(normalizedNew),
        isSignificant: true,
      };
    }

    case FieldType.MultiChoice: {
      // Normalize to sorted arrays for comparison
      const toArray = (val: any): string[] => {
        if (Array.isArray(val)) {
          return val.map(String).sort();
        }
        if (typeof val === 'string' && val.includes(';#')) {
          return val.split(';#').filter(v => v).sort();
        }
        return [String(val)];
      };

      const oldArray = toArray(normalizedOld);
      const newArray = toArray(normalizedNew);

      return {
        hasChanged: JSON.stringify(oldArray) !== JSON.stringify(newArray),
        isSignificant: true,
      };
    }

    case FieldType.TaxonomyFieldType:
    case FieldType.TaxonomyFieldTypeMulti: {
      // Extract term IDs for comparison
      const getTermIds = (val: any): string[] => {
        if (Array.isArray(val)) {
          return val.map(v => v.TermGuid || v.WssId || String(v)).sort();
        }
        if (typeof val === 'object' && val !== null) {
          return [val.TermGuid || val.WssId || JSON.stringify(val)];
        }
        return [String(val)];
      };

      const oldTerms = getTermIds(normalizedOld);
      const newTerms = getTermIds(normalizedNew);

      return {
        hasChanged: JSON.stringify(oldTerms) !== JSON.stringify(newTerms),
        isSignificant: true,
      };
    }

    default: {
      const hasChanged = String(normalizedOld).trim() !== String(normalizedNew).trim();
      const isSignificant = type !== FieldType.Note || hasChanged;
      return { hasChanged, isSignificant };
    }
  }
}

/**
 * Get field value from version object, handling SharePoint's field name encoding
 */
export function getVersionFieldValue(version: any, internalName: string): any {
  if (!version || !internalName) return undefined;

  if (version[internalName] !== undefined) {
    return version[internalName];
  }

  const encodedName = internalName.replace(/_/g, '_x005f_');
  if (version[encodedName] !== undefined) {
    return version[encodedName];
  }

  const variations = [
    internalName,
    encodedName,
    `OData_${internalName}`,
    `OData__${internalName}`,
    `OData__x005f_${encodedName}`,
  ];

  for (const variation of variations) {
    if (version[variation] !== undefined) {
      return version[variation];
    }
  }

  return undefined;
}

/**
 * Compare versions to detect field changes
 */
export function compareVersions(
  currentVersion: any,
  previousVersion: any | null,
  fields: any[]
): IFieldChange[] {
  const changes: IFieldChange[] = [];

  if (!fields || !Array.isArray(fields)) {
    return changes;
  }

  if (!previousVersion) {
    fields.forEach(field => {
      if (!field || isSystemField(field.InternalName)) return;

      const value = getVersionFieldValue(currentVersion, field.InternalName);
      if (value === null || value === undefined || value === '') return;

      changes.push({
        internalName: field.InternalName,
        displayName: field.Title || field.InternalName,
        fieldType: field.TypeAsString || 'Text',
        previousValue: null,
        newValue: value,
        previousValueFormatted: '(empty)',
        newValueFormatted: formatFieldValue(value, field.TypeAsString || 'Text'),
        changeType: 'added',
        isSignificant: true,
      });
    });

    return changes;
  }

  fields.forEach(field => {
    if (!field || isSystemField(field.InternalName)) return;

    const oldValue = getVersionFieldValue(previousVersion, field.InternalName);
    const newValue = getVersionFieldValue(currentVersion, field.InternalName);

    const comparison = compareFieldValues(oldValue, newValue, field.TypeAsString || 'Text');

    if (comparison.hasChanged) {
      const changeType: 'added' | 'modified' | 'removed' =
        oldValue === null || oldValue === undefined || oldValue === ''
          ? 'added'
          : newValue === null || newValue === undefined || newValue === ''
          ? 'removed'
          : 'modified';

      changes.push({
        internalName: field.InternalName,
        displayName: field.Title || field.InternalName,
        fieldType: field.TypeAsString || 'Text',
        previousValue: oldValue,
        newValue: newValue,
        previousValueFormatted: formatFieldValue(oldValue, field.TypeAsString || 'Text'),
        newValueFormatted: formatFieldValue(newValue, field.TypeAsString || 'Text'),
        changeType,
        isSignificant: comparison.isSignificant,
      });
    }
  });

  return changes;
}

/**
 * Check if field is a system field that should be ignored
 */
export function isSystemField(internalName: string): boolean {
  const systemFields = [
    'ID',
    'Created',
    'Modified',
    'Author',
    'Editor',
    '_UIVersionString',
    'Attachments',
    'GUID',
    'owshiddenversion',
    '_ModerationStatus',
    '_Level',
    'UniqueId',
    'ContentTypeId',
    'FileLeafRef',
    'FileRef',
    'FileDirRef',
    'Last_x0020_Modified',
    'Created_x0020_Date',
    'FSObjType',
    'PermMask',
    'FileSystemObjectType',
    'File_x0020_Type',
    'HTML_x0020_File_x0020_Type',
    '_CopySource',
    'WorkflowVersion',
    '_UIVersion',
    '_EditMenuTableStart',
    '_EditMenuTableEnd',
    'LinkFilenameNoMenu',
    'LinkFilename',
    'LinkFilename2',
    'DocIcon',
    'ServerUrl',
    'EncodedAbsUrl',
    'BaseName',
    'FileSizeDisplay',
    'SelectTitle',
    'SelectFilename',
    'Edit',
    '_HasCopyDestinations',
    'ContentVersion',
    '_VirusStatus',
    'CheckedOutUserId',
    'CheckedOutTitle',
    'IsCheckedoutToLocal',
    'CheckoutUser',
    'SyncClientId',
    'VirusStatus',
    'ScopeId',
    'SMTotalSize',
    'SMLastModifiedDate',
    'SMTotalFileStreamSize',
    'SMTotalFileCount',
    'ItemChildCount',
    'FolderChildCount',
    'AppAuthor',
    'AppEditor',
    'ComplianceAssetId',
    // Document-specific system fields
    'File_x0020_Size',
    'FileSize',
    'SortType',
    'ParentVersionString',
    'ParentLeafName',
    '_SourceUrl',
    '_SharedFileIndex',
    'NoExecute',
    'AccessPolicy',
    'ProgId',
    '_ComplianceFlags',
    '_ComplianceTag',
    '_ComplianceTagWrittenTime',
    '_ComplianceTagUserId',
    '_IsRecord',
    '_CommentCount',
    '_LikeCount',
    'Order',
    'GUID',
    // Property Bag and technical fields
    'PropertyBag',
    'BlobSequenceNumber',
    'DocumentConcurrencyNumber',
    'DocumentStreamHash',
    'ParentUniqueId',
    'StreamHash',
    'TriggerFlowInfo',
    'SourceVersion',
    'SourceName',
    // Converted document fields
    'SourceVersionConvertedDocument',
    'SourceNameConvertedDocument',
  ];

  return systemFields.includes(internalName) || internalName.startsWith('_');
}

/**
 * Filter versions based on filter state
 */
export function filterVersions(
  versions: IVersionInfo[],
  filterState: IFilterState
): IVersionInfo[] {
  let filtered = [...versions];

  if (filterState.searchQuery && filterState.searchQuery.trim() !== '') {
    const query = filterState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      version =>
        version.versionLabel.toLowerCase().includes(query) ||
        version.modifiedByName.toLowerCase().includes(query) ||
        version.modifiedByEmail.toLowerCase().includes(query) ||
        (version.checkInComment && version.checkInComment.toLowerCase().includes(query)) ||
        version.changedFields.some(
          field =>
            field.displayName.toLowerCase().includes(query) ||
            field.newValueFormatted.toLowerCase().includes(query) ||
            field.previousValueFormatted.toLowerCase().includes(query)
        )
    );
  }

  if (filterState.filterByUser) {
    const filterUser = filterState.filterByUser.toLowerCase();
    filtered = filtered.filter(
      version => (version.modifiedBy || '').toLowerCase() === filterUser
    );
  }

  if (filterState.filterDateRange !== 'all') {
    const now = new Date();
    let startDate: Date;

    switch (filterState.filterDateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (filterState.customDateStart) {
          startDate = filterState.customDateStart;
          filtered = filtered.filter(version => {
            const versionDate = version.modified;
            return (
              versionDate >= startDate &&
              (!filterState.customDateEnd || versionDate <= filterState.customDateEnd)
            );
          });
        }
        return filtered;
      default:
        return filtered;
    }

    filtered = filtered.filter(version => version.modified >= startDate);
  }

  if (filterState.showMajorOnly) {
    filtered = filtered.filter(version => {
      const versionParts = version.versionLabel.split('.');
      return versionParts[1] === '0';
    });
  }

  // Filter to show only versions with changes (metadata or size changes)
  if (filterState.showUpdatesOnly) {
    filtered = filtered.filter(version => {
      // Has field changes
      if (version.hasChanges) return true;
      // Has file size change (for documents)
      if (version.sizeDelta !== null && version.sizeDelta !== 0) return true;
      // Has check-in comment (indicates intentional update)
      if (version.checkInComment) return true;
      return false;
    });
  }

  return filtered;
}

/**
 * Get unique users from versions for filter dropdown
 */
export function getUniqueUsers(versions: IVersionInfo[]): Array<{ key: string; text: string }> {
  const userMap = new Map<string, string>();

  versions.forEach(version => {
    if (!userMap.has(version.modifiedBy)) {
      userMap.set(version.modifiedBy, version.modifiedByName);
    }
  });

  return Array.from(userMap.entries())
    .map(([key, text]) => ({ key, text }))
    .sort((a, b) => a.text.localeCompare(b.text));
}

/**
 * Export all versions to CSV
 */
export function exportAllToCSV(versions: IVersionInfo[], itemInfo: IItemInfo): void {
  const rows: any[] = [];

  versions.forEach(version => {
    version.changedFields.forEach(change => {
      rows.push({
        Version: version.versionLabel,
        'Modified By': version.modifiedByName,
        'Modified Date': formatAbsoluteTime(version.modified),
        'Field Name': change.displayName,
        'Previous Value': change.previousValueFormatted,
        'New Value': change.newValueFormatted,
        'Change Type': change.changeType,
        Comment: version.checkInComment || '',
      });
    });
  });

  const headers = Object.keys(rows[0] || {});
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          const value = row[header] || '';
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
            ? `"${escaped}"`
            : escaped;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${itemInfo.title}_VersionHistory_${timestamp}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Build a _vti_history URL for a historical document version.
 *
 * Handles both absolute and server-relative item URLs, and normalizes paths so
 * the generated history path is relative to the current web path.
 */
export function buildVtiHistoryUrl(
  siteAbsoluteUrl: string,
  versionId: string | number,
  itemUrl: string,
  webServerRelativeUrl: string = '/'
): string {
  let itemPath = itemUrl || '';
  if (/^https?:\/\//i.test(itemPath)) {
    try {
      itemPath = new URL(itemPath).pathname;
    } catch {
      // keep original value as fallback
    }
  }

  const normalizedItemPath = itemPath.replace(/^\/+/, '/');
  const normalizedWebPath = webServerRelativeUrl.replace(/\/+$/, '');
  let relativePath = normalizedItemPath.replace(/^\/+/, '');

  if (normalizedWebPath && normalizedWebPath !== '/') {
    const webPrefix = `${normalizedWebPath}/`.toLowerCase();
    if (normalizedItemPath.toLowerCase().startsWith(webPrefix)) {
      relativePath = normalizedItemPath.substring(webPrefix.length).replace(/^\/+/, '');
    }
  }

  return `${siteAbsoluteUrl.replace(/\/$/, '')}/_vti_history/${String(versionId)}/${relativePath}`;
}

export async function downloadDocumentVersion(
  version: IVersionInfo,
  itemInfo: IItemInfo
): Promise<void> {
  if (!version.fileUrl) {
    throw new Error('File URL not available for this version');
  }

  try {
    let downloadUrl: string;

    if (version.isCurrentVersion) {
      // Current version - use standard API
      const buffer = await SPContext.sp.web
        .getFileByServerRelativePath(version.fileUrl)
        .getBuffer();
      const blob = new Blob([buffer]);

      const baseFilename = itemInfo.title;
      const extension = itemInfo.fileExtension || '';
      const versionLabel = version.versionLabel.replace('.', '_');
      const filename = extension
        ? `${baseFilename}_v${versionLabel}.${extension}`
        : `${baseFilename}_v${versionLabel}`;

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Historical version - use direct URL with version ID
      const siteAbsoluteUrl = (() => {
        if (!SPContext.isReady()) {
          throw new Error('SPContext is not initialized');
        }
        return SPContext.webAbsoluteUrl || SPContext.spfxContext.pageContext.web.absoluteUrl;
      })();

      // Build the historical version download URL
      // Format: {siteUrl}/_vti_history/{versionId}/{documentPath}
      if (version.fileUrl.startsWith('_vti_history')) {
        downloadUrl = `${siteAbsoluteUrl}/${version.fileUrl}`;
      } else {
        // Fallback: construct from version ID
        const versionId = version.versionId || version.versionLabel;
        downloadUrl = buildVtiHistoryUrl(
          siteAbsoluteUrl,
          versionId,
          itemInfo.itemUrl,
          SPContext.webServerRelativeUrl || '/'
        );
      }

      SPContext.logger.info('VersionHistory: historical version download URL generated', {
        versionId: version.versionId || version.versionLabel,
      });

      // Use fetch instead of PnP for historical versions
      const response = await fetch(downloadUrl, {
        credentials: 'include',
        headers: {
          Accept: 'application/octet-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      const baseFilename = itemInfo.title;
      const extension = itemInfo.fileExtension || '';
      const versionLabel = version.versionLabel.replace('.', '_');
      const filename = extension
        ? `${baseFilename}_v${versionLabel}.${extension}`
        : `${baseFilename}_v${versionLabel}`;

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    SPContext.logger.success('Document version downloaded', {
      version: version.versionLabel,
    });
  } catch (error) {
    console.error('[downloadDocumentVersion] Error:', error);
    SPContext.logger.error('Failed to download document version', error, {
      version: version.versionLabel,
      fileUrl: version.fileUrl,
    });
    throw error;
  }
}
