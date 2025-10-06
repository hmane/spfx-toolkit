/**
 * VersionHistory Component - Redesigned with DevExtreme Popup
 *
 * Features:
 * - DevExtreme Popup with ScrollView for better space utilization
 * - Minimal version cards focused on essential information
 * - Compact details panel with streamlined header
 * - 3-column field changes table with inline arrows
 * - Export all versions to CSV
 * - Download document versions
 * - Advanced filtering and search
 * - Responsive design optimized for desktop
 */

export { VersionHistory } from './VersionHistory';

export type {
  DateRangeFilter,
  IFieldChange,
  IFilterState,
  IItemInfo,
  IVersionHistoryProps,
  IVersionHistoryState,
  IVersionInfo,
} from './types';

export {
  compareVersions,
  downloadDocumentVersion,
  exportAllToCSV,
  filterVersions,
  formatAbsoluteTime,
  formatFieldValue,
  formatFileSize,
  formatRelativeTime,
  formatSizeDelta,
  getUniqueUsers,
} from './VersionHistoryUtils';

import './VersionHistory.css';
