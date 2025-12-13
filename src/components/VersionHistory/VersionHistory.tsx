import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Text } from '@fluentui/react/lib/Text';
import '@pnp/sp/content-types';
import '@pnp/sp/fields';
import { Popup } from 'devextreme-react/popup';
import { ScrollView } from 'devextreme-react/scroll-view';
import * as React from 'react';
import '../../utilities/context/pnpImports/files';
import { SPContext } from '../../utilities/context';
import { VersionDetails } from './components/VersionDetails';
import { VersionTimeline } from './components/VersionTimeline';
import {
  IFilterState,
  IItemInfo,
  IVersionHistoryProps,
  IVersionHistoryState,
  IVersionInfo,
} from './types';
import {
  compareVersions,
  downloadDocumentVersion,
  exportAllToCSV,
  filterVersions,
  isSystemField,
  formatRelativeTime,
} from './VersionHistoryUtils';

export const VersionHistory: React.FC<IVersionHistoryProps> = props => {
  const {
    listId,
    itemId,
    onClose,
    onExport,
    onDownload,
    allowCopyLink = false,
  } = props;

  const [state, setState] = React.useState<IVersionHistoryState>({
    allVersions: [],
    filteredVersions: [],
    selectedVersion: null,
    isLoading: true,
    error: null,
    hasPermission: false,
    itemType: null,
    itemInfo: null,
    searchQuery: '',
    filterByUser: null,
    filterDateRange: 'all',
    showMajorOnly: false,
    filtersExpanded: false,
    customDateStart: null,
    customDateEnd: null,
    persistenceKey: null,
    statusMessage: null,
  });

  const [isDownloading, setIsDownloading] = React.useState(false);

  const filterState: IFilterState = React.useMemo(
    () => ({
      searchQuery: state.searchQuery,
      filterByUser: state.filterByUser,
      filterDateRange: state.filterDateRange,
      showMajorOnly: state.showMajorOnly,
      customDateStart: state.customDateStart,
      customDateEnd: state.customDateEnd,
    }),
    [
      state.searchQuery,
      state.filterByUser,
      state.filterDateRange,
      state.showMajorOnly,
      state.customDateStart,
      state.customDateEnd,
    ]
  );

  // Initialize persistence key and restore saved filters
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const persistenceKey = `spfx-toolkit:version-history:${listId}:${itemId}`;

    try {
      const stored = window.localStorage.getItem(persistenceKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState(prev => ({
          ...prev,
          persistenceKey,
          searchQuery: parsed.searchQuery ?? prev.searchQuery,
          filterByUser: parsed.filterByUser ?? prev.filterByUser,
          filterDateRange: parsed.filterDateRange ?? prev.filterDateRange,
          showMajorOnly: parsed.showMajorOnly ?? prev.showMajorOnly,
          customDateStart: parsed.customDateStart ? new Date(parsed.customDateStart) : null,
          customDateEnd: parsed.customDateEnd ? new Date(parsed.customDateEnd) : null,
          filtersExpanded: parsed.filtersExpanded ?? prev.filtersExpanded,
          selectedVersion: prev.selectedVersion,
        }));
        return;
      }
    } catch (error) {
      SPContext.logger?.warn('VersionHistory: failed to restore persisted filters', {
        error,
        listId,
        itemId,
      });
    }

    // Ensure persistence key is still recorded even without stored state
    setState(prev => ({
      ...prev,
      persistenceKey,
    }));
  }, [listId, itemId]);

  // Persist filters whenever they change
  React.useEffect(() => {
    if (typeof window === 'undefined' || !state.persistenceKey) {
      return;
    }

    const payload = {
      searchQuery: state.searchQuery,
      filterByUser: state.filterByUser,
      filterDateRange: state.filterDateRange,
      showMajorOnly: state.showMajorOnly,
      customDateStart: state.customDateStart ? state.customDateStart.toISOString() : null,
      customDateEnd: state.customDateEnd ? state.customDateEnd.toISOString() : null,
      filtersExpanded: state.filtersExpanded,
    };

    try {
      window.localStorage.setItem(state.persistenceKey, JSON.stringify(payload));
    } catch (error) {
      SPContext.logger?.warn('VersionHistory: failed to persist filters', {
        error,
        listId,
        itemId,
      });
    }
  }, [
    state.persistenceKey,
    state.searchQuery,
    state.filterByUser,
    state.filterDateRange,
    state.showMajorOnly,
    state.customDateStart,
    state.customDateEnd,
    state.filtersExpanded,
    listId,
    itemId,
  ]);

  const currentUserLogin = React.useMemo(() => {
    try {
      const currentUser = SPContext.currentUser;
      if (!currentUser) return undefined;
      const identifier = (currentUser.email || currentUser.loginName || '').toLowerCase();
      return identifier || undefined;
    } catch {
      return undefined;
    }
  }, []);

  const toAbsoluteUrl = React.useCallback((url?: string | null): string => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const base =
      SPContext.webAbsoluteUrl ||
      (typeof window !== 'undefined' ? window.location.origin : undefined);

    if (!base) {
      return url;
    }

    try {
      return new URL(url, base).toString();
    } catch {
      return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }
  }, []);

  const copyToClipboard = React.useCallback(
    async (text: string, successMessage: string) => {
      if (!text) {
        return;
      }

      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else if (typeof document !== 'undefined') {
          const tempInput = document.createElement('textarea');
          tempInput.value = text;
          tempInput.style.position = 'fixed';
          tempInput.style.opacity = '0';
          document.body.appendChild(tempInput);
          tempInput.focus();
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
        }

        setState(prev => ({
          ...prev,
          statusMessage: { type: 'success', text: successMessage },
        }));
      } catch (error) {
        SPContext.logger?.warn('VersionHistory: copy to clipboard failed', { error });
        setState(prev => ({
          ...prev,
          statusMessage: {
            type: 'error',
            text: 'Unable to copy link. Please try again.',
          },
        }));
      }
    },
    []
  );

  const handleCopyItemLink = React.useCallback(() => {
    if (!state.itemInfo) return;
    const url = toAbsoluteUrl(state.itemInfo.itemUrl);
    if (!url) {
      setState(prev => ({
        ...prev,
        statusMessage: {
          type: 'warning',
          text: 'Item link is not available to copy.',
        },
      }));
      return;
    }

    copyToClipboard(url, 'Item link copied to clipboard.');
  }, [state.itemInfo, toAbsoluteUrl, copyToClipboard]);

  const getVersionLink = React.useCallback(
    (version: IVersionInfo): string | null => {
      if (!state.itemInfo) return null;

      const siteUrl =
        SPContext.spfxContext?.pageContext?.web?.absoluteUrl || SPContext.webAbsoluteUrl || '';

      if (!siteUrl) {
        return toAbsoluteUrl(state.itemInfo.itemUrl);
      }

      if (state.itemType === 'document') {
        if (!version.fileUrl) {
          return toAbsoluteUrl(state.itemInfo.itemUrl);
        }

        if (version.isCurrentVersion) {
          return toAbsoluteUrl(version.fileUrl);
        }

        const versionId = version.versionId || version.versionLabel;
        let documentPath = state.itemInfo.itemUrl || '';

        if (documentPath.startsWith('/')) {
          const secondSlash = documentPath.indexOf('/', 1);
          documentPath =
            secondSlash > -1 ? documentPath.substring(secondSlash + 1) : documentPath.substring(1);
        }

        documentPath = documentPath.replace(/^\//, '');
        return `${siteUrl.replace(/\/$/, '')}/_vti_history/${versionId}/${documentPath}`;
      }

      const listUrl = `${siteUrl.replace(
        /\/$/,
        ''
      )}/_layouts/15/listform.aspx?PageType=4&ListId=${encodeURIComponent(
        listId
      )}&ID=${itemId}&VersionNo=${encodeURIComponent(version.versionLabel)}`;

      return listUrl;
    },
    [state.itemInfo, state.itemType, toAbsoluteUrl, listId, itemId]
  );

  const handleCopyVersionLink = React.useCallback(
    (version: IVersionInfo) => {
      const link = getVersionLink(version);
      if (!link) {
        setState(prev => ({
          ...prev,
          statusMessage: {
            type: 'warning',
            text: `Link not available for version ${version.versionLabel}.`,
          },
        }));
        return;
      }
      copyToClipboard(link, `Link to v${version.versionLabel} copied to clipboard.`);
    },
    [getVersionLink, copyToClipboard]
  );

  const headerEyebrow = state.itemType === 'document' ? 'Document version history' : 'Version history';

  const headerLocation = React.useMemo(() => {
    if (!state.itemInfo?.itemUrl) {
      return state.itemInfo?.listTitle || '';
    }

    const trimmed = state.itemInfo.itemUrl.replace(/^\/+/, '');
    const segments = trimmed.split('/').filter(Boolean);

    if (segments.length <= 1) {
      return '';
    }

    let pathSegments = segments.slice(0, -1);

    if (pathSegments.length > 2) {
      const first = pathSegments[0].toLowerCase();
      if (first === 'sites' || first === 'teams') {
        pathSegments = pathSegments.slice(2);
      }
    }

    if (!pathSegments.length) {
      return state.itemInfo.listTitle || '';
    }

    return pathSegments.join(' / ');
  }, [state.itemInfo]);

  const headerBreadcrumb = React.useMemo(() => {
    const segments: string[] = [];
    if (headerLocation) {
      segments.push(headerLocation);
    }
    if (state.itemInfo?.title) {
      segments.push(state.itemInfo.title);
    }
    return segments.join(' / ') || state.itemInfo?.title || 'Version history';
  }, [headerLocation, state.itemInfo]);

  const headerSummary = React.useMemo(() => {
    if (!state.allVersions.length) {
      return '';
    }

    const total = state.allVersions.length;
    const majorCount = state.allVersions.filter(version => {
      const parts = version.versionLabel.split('.');
      return parts.length > 1 ? parts[1] === '0' : true;
    }).length;

    const contributors = new Set(
      state.allVersions.map(version => (version.modifiedByName || '').toLowerCase())
    ).size;

    const lastUpdated = state.allVersions[0]?.modified;

    const parts: string[] = [`${total} version${total === 1 ? '' : 's'}`];

    if (majorCount && majorCount !== total) {
      parts.push(`${majorCount} major`);
    }

    if (contributors) {
      parts.push(`${contributors} contributor${contributors === 1 ? '' : 's'}`);
    }

    if (lastUpdated) {
      parts.push(`Updated ${formatRelativeTime(lastUpdated)}`);
    }

    return parts.join(' | ');
  }, [state.allVersions]);

  const allVersionsAreMajor = React.useMemo(
    () =>
      state.allVersions.length > 0 &&
      state.allVersions.every(version => {
        const parts = version.versionLabel.split('.');
        return parts.length > 1 ? parts[1] === '0' : true;
      }),
    [state.allVersions]
  );

  const showMajorFilter = !allVersionsAreMajor;

  React.useEffect(() => {
    if (!showMajorFilter && state.showMajorOnly) {
      setState(prev => ({
        ...prev,
        showMajorOnly: false,
      }));
    }
  }, [showMajorFilter, state.showMajorOnly]);

  const statusMessageType = React.useMemo(() => {
    if (!state.statusMessage) {
      return MessageBarType.info;
    }

    switch (state.statusMessage.type) {
      case 'success':
        return MessageBarType.success;
      case 'warning':
        return MessageBarType.warning;
      case 'error':
        return MessageBarType.error;
      default:
        return MessageBarType.info;
    }
  }, [state.statusMessage]);

  const loadVersionHistory = React.useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check permissions
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          hasPermission: false,
          error:
            'Unable to load version history. The item may not exist or you do not have permission to view it.',
          statusMessage: {
            type: 'warning',
            text:
              'You may not have sufficient permissions to view this version history. Contact the site owner if you believe this is incorrect.',
          },
        }));
        return;
      }

      // Detect item type
      const detectedItemType = await detectItemType();

      // Load item info
      const itemInfo = await loadItemInfo(detectedItemType);

      // Load versions
      const versions = await loadVersions(detectedItemType, itemInfo);

      // Process versions
      const processedVersions = await processVersions(versions, itemInfo, detectedItemType);

      setState(prev => ({
        ...prev,
        allVersions: processedVersions,
        filteredVersions: processedVersions,
        selectedVersion: processedVersions.length > 0 ? processedVersions[0] : null,
        isLoading: false,
        hasPermission: true,
        itemType: detectedItemType,
        itemInfo,
        statusMessage: processedVersions.length
          ? {
              type: 'info',
              text: `Loaded ${processedVersions.length} version${
                processedVersions.length === 1 ? '' : 's'
              }.`,
            }
          : null,
      }));

      SPContext.logger.info('Version history loaded', {
        listId,
        itemId,
        versionCount: processedVersions.length,
        itemType: detectedItemType,
      });
    } catch (error) {
      SPContext.logger.error('Failed to load version history', error, { listId, itemId });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasPermission: false,
        error: 'Unable to load version history.',
        statusMessage: {
          type: 'error',
          text: `We couldn't load the version history for this item. The item may have been moved, deleted, or you may not have access. (${errorMessage})`,
        },
      }));
    }
  }, [listId, itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    loadVersionHistory();
  }, [listId, itemId, loadVersionHistory]);

  const checkPermissions = async (): Promise<boolean> => {
    try {
      await SPContext.sp.web.lists.getById(listId).items.getById(itemId).select('Id')();
      return true;
    } catch (error) {
      SPContext.logger.warn('Permission check failed', { error, listId, itemId });
      return false;
    }
  };

  const detectItemType = async (): Promise<'document' | 'list'> => {
    try {
      const item = await SPContext.sp.web.lists
        .getById(listId)
        .items.getById(itemId)
        .select('File/ServerRelativeUrl')
        .expand('File')();

      return item.File ? 'document' : 'list';
    } catch (error) {
      SPContext.logger.warn('Item type detection failed, defaulting to list', {
        error,
        listId,
        itemId,
      });
      return 'list';
    }
  };

  const loadItemInfo = async (itemType: 'document' | 'list'): Promise<IItemInfo> => {
    try {
      const list = await SPContext.sp.web.lists.getById(listId).select('Title')();

      const item = await SPContext.sp.web.lists
        .getById(listId)
        .items.getById(itemId)
        .select(
          'Title',
          'FileLeafRef',
          'FileRef',
          'File/Name',
          'File/ServerRelativeUrl',
          'ContentType/Name'
        )
        .expand('File', 'ContentType')();

      const fieldsList = SPContext.sp.web.lists.getById(listId).fields;
      const fields = await fieldsList.filter('Hidden eq false and ReadOnlyField eq false')();

      if (!fields || !Array.isArray(fields)) {
        throw new Error('Failed to load fields - invalid response');
      }

      const title =
        itemType === 'document'
          ? item.File?.Name || item.FileLeafRef || item.Title || 'Document'
          : item.Title || `Item ${itemId}`;

      const fileExtension =
        itemType === 'document' && item.File?.Name ? item.File.Name.split('.').pop() || null : null;

      const itemInfo: IItemInfo = {
        title,
        listTitle: list.Title,
        itemUrl: item.FileRef || '',
        fileExtension,
        contentType: item.ContentType?.Name || 'Item',
        totalFieldCount: fields.filter(f => !isSystemField(f.InternalName)).length,
      };

      return itemInfo;
    } catch (error) {
      SPContext.logger.error('Failed to load item info', error, { listId, itemId });
      throw error;
    }
  };

  const loadVersions = async (
    itemType: 'document' | 'list',
    itemInfo: IItemInfo
  ): Promise<any[]> => {
    try {
      let versions: any[] = [];

      if (itemType === 'document') {
        if (itemInfo.itemUrl) {
          // Get historical file versions with Author expanded
          const fileVersions = SPContext.sp.web.getFileByServerRelativePath(
            itemInfo.itemUrl
          ).versions;
          const historicalFileVersions = await fileVersions.select('*').expand('CreatedBy')();

          // Get list item versions to capture metadata changes (Title, custom fields, etc.)
          const listItemVersions = await SPContext.sp.web.lists
            .getById(listId)
            .items.getById(itemId)
            .versions.expand('Editor', 'Author')();

          // Get current file info
          const currentFile = await SPContext.sp.web
            .getFileByServerRelativePath(itemInfo.itemUrl)
            .select(
              'Length',
              'TimeCreated',
              'TimeLastModified',
              'Name',
              'ServerRelativeUrl',
              'UIVersionLabel'
            )();

          // Get list item to get Author/Editor info
          const listItem = await SPContext.sp.web.lists
            .getById(listId)
            .items.getById(itemId)
            .select(
              'Author/Id',
              'Author/Title',
              'Author/EMail',
              'Editor/Id',
              'Editor/Title',
              'Editor/EMail',
              'Modified',
              'Created'
            )
            .expand('Author', 'Editor')();

          // Create a map of list item versions by version label for quick lookup
          const listVersionMap = new Map<string, any>();
          listItemVersions.forEach((v: any) => {
            const label = v.VersionLabel || v.OData__UIVersionString || v._UIVersionString;
            if (label) {
              listVersionMap.set(label, v);
            }
          });

          // Build current version object with both file and list item data
          const currentListVersion = listVersionMap.get(currentFile.UIVersionLabel) || listItem;
          const currentVersion = {
            VersionLabel: currentFile.UIVersionLabel || '2.0',
            ID: 0,
            Created: listItem.Created,
            Modified: listItem.Modified,
            Size: currentFile.Length,
            Url: currentFile.ServerRelativeUrl,
            CheckInComment: '',
            IsCurrentVersion: true,
            File: {
              Length: currentFile.Length,
              ServerRelativeUrl: currentFile.ServerRelativeUrl,
            },
            Author: listItem.Author,
            Editor: listItem.Editor,
            CreatedBy: listItem.Author,
            // Merge list item field values for metadata comparison
            ...currentListVersion,
          };

          // Merge file versions with list item versions to include metadata changes
          const mergedHistoricalVersions = historicalFileVersions.map((fileVersion: any) => {
            const versionLabel = fileVersion.VersionLabel || '';
            const listVersion = listVersionMap.get(versionLabel) || {};

            return {
              ...listVersion, // List item fields first (Title, custom columns, etc.)
              ...fileVersion, // File version fields override (Size, CheckInComment, etc.)
              File: {
                ...fileVersion.File,
                ServerRelativeUrl: itemInfo.itemUrl,
              },
            };
          });

          // Prepend current version to historical versions
          versions = [currentVersion, ...mergedHistoricalVersions];

          // Ensure each version has the file URL set
          versions = versions.map(v => ({
            ...v,
            File: {
              ...v.File,
              ServerRelativeUrl: itemInfo.itemUrl,
            },
          }));
        }
      } else {
        // For list items, versions() includes current version
        versions = await SPContext.sp.web.lists
          .getById(listId)
          .items.getById(itemId)
          .versions.expand('Editor', 'Author')();
      }

      return Array.isArray(versions) ? versions : [];
    } catch (error) {
      SPContext.logger.error('Failed to load versions', error, { listId, itemId, itemType });
      return [];
    }
  };

  const processVersions = async (
    versions: any[],
    itemInfo: IItemInfo,
    itemType: 'document' | 'list'
  ): Promise<IVersionInfo[]> => {
    try {
      const fieldsList = SPContext.sp.web.lists.getById(listId).fields;
      const fields = await fieldsList
        .filter('Hidden eq false')
        .select('InternalName', 'Title', 'TypeAsString')();

      if (!fields || !Array.isArray(fields)) {
        SPContext.logger.warn('No fields returned from SharePoint', { listId });
        return [];
      }

      const currentItem = await SPContext.sp.web.lists.getById(listId).items.getById(itemId)();

      if (!currentItem) {
        SPContext.logger.warn('Current item not found', { listId, itemId });
        return [];
      }

      const allVersionsData = versions;

      const processedVersions: IVersionInfo[] = [];

      for (let i = 0; i < allVersionsData.length; i++) {
        const version = allVersionsData[i];
        const previousVersion = allVersionsData[i + 1] || null;

        if (!version) {
          continue;
        }

        const versionLabel =
          version.VersionLabel ||
          version.OData__UIVersionString ||
          version._UIVersionString ||
          '1.0';
        const isCurrentVersion = i === 0;
        const modifiedDate = new Date(version.Modified || version.Created || Date.now());

        // Extract user info
        let modifiedBy = '';
        let modifiedByName = 'Unknown User';
        let modifiedByEmail = '';

        if (version.Editor && typeof version.Editor === 'object') {
          const editor = version.Editor;
          modifiedBy = editor.EMail || editor.Email || editor.Name || '';
          modifiedByName = editor.Title || 'Unknown User';
          modifiedByEmail = editor.Email || editor.EMail || '';
        } else if (version.CreatedBy && typeof version.CreatedBy === 'object') {
          const createdBy = version.CreatedBy;
          modifiedBy = createdBy.EMail || createdBy.Email || createdBy.LoginName || '';
          modifiedByName = createdBy.Title || 'Unknown User';
          modifiedByEmail = createdBy.Email || createdBy.EMail || '';
        } else if (version.Author && typeof version.Author === 'object') {
          const author = version.Author;
          modifiedBy = author.EMail || author.Email || author.Name || '';
          modifiedByName = author.Title || 'Unknown User';
          modifiedByEmail = author.Email || author.EMail || '';
        }

        const checkInComment = version.CheckInComment || version._CheckinComment || null;

        // Get size - historical versions use Size property, current uses File.Length
        const size = version.Size || version.File?.Length || version.SMTotalSize || null;
        const previousSize =
          previousVersion?.Size ||
          previousVersion?.File?.Length ||
          previousVersion?.SMTotalSize ||
          null;
        const sizeDelta = size !== null && previousSize !== null ? size - previousSize : null;

        const changedFields = compareVersions(version, previousVersion, fields);

        let fileUrl: string | null = null;
        if (version.Url) {
          fileUrl = version.Url;
        } else if (version.File?.ServerRelativeUrl) {
          fileUrl = version.File.ServerRelativeUrl;
        } else if (itemInfo.itemUrl) {
          fileUrl = itemInfo.itemUrl;
        }

        processedVersions.push({
          versionLabel,
          versionId: version.VersionId || version.ID || i,
          isCurrentVersion,
          modified: modifiedDate,
          modifiedBy,
          modifiedByName,
          modifiedByEmail,
          checkInComment,
          size,
          sizeDelta,
          changedFields,
          hasChanges: changedFields.length > 0,
          fieldValues: version,
          fileUrl,
        });
      }

      return processedVersions;
    } catch (error) {
      SPContext.logger.error('Failed to process versions', error, { listId, itemId });
      throw error;
    }
  };

  const applyFilters = React.useCallback((): void => {
    const filtered = filterVersions(state.allVersions, filterState);

    setState(prev => ({
      ...prev,
      filteredVersions: filtered,
      selectedVersion:
        filtered.length > 0
          ? filtered.find(v => v.versionLabel === prev.selectedVersion?.versionLabel) || filtered[0]
          : null,
    }));
  }, [state.allVersions, filterState]);

  React.useEffect(() => {
    if (state.allVersions.length > 0) {
      applyFilters();
    }
  }, [
    state.allVersions,
    state.searchQuery,
    state.filterByUser,
    state.filterDateRange,
    state.showMajorOnly,
    state.customDateStart,
    state.customDateEnd,
    applyFilters,
  ]);

  const handleSelectVersion = React.useCallback((version: IVersionInfo) => {
    setState(prev => ({ ...prev, selectedVersion: version }));
  }, []);

  const handleFilterChange = React.useCallback((updates: Partial<IFilterState>) => {
    setState(prev => ({
      ...prev,
      searchQuery: updates.searchQuery ?? prev.searchQuery,
      filterByUser: updates.filterByUser ?? prev.filterByUser,
      filterDateRange: updates.filterDateRange ?? prev.filterDateRange,
      showMajorOnly: updates.showMajorOnly ?? prev.showMajorOnly,
      customDateStart:
        updates.customDateStart !== undefined ? updates.customDateStart : prev.customDateStart,
      customDateEnd:
        updates.customDateEnd !== undefined ? updates.customDateEnd : prev.customDateEnd,
    }));
  }, []);

  const handleToggleFilters = React.useCallback(() => {
    setState(prev => ({ ...prev, filtersExpanded: !prev.filtersExpanded }));
  }, []);

  const handleClearFilters = React.useCallback(() => {
    setState(prev => ({
      ...prev,
      searchQuery: '',
      filterByUser: null,
      filterDateRange: 'all',
      showMajorOnly: false,
      customDateStart: null,
      customDateEnd: null,
      statusMessage: {
        type: 'info',
        text: 'Filters cleared.',
      },
    }));
  }, []);

  // Auto dismiss transient status messages
  React.useEffect(() => {
    if (!state.statusMessage) return;

    if (state.statusMessage.type === 'error' || state.statusMessage.type === 'warning') {
      return;
    }

    if (typeof window === 'undefined') return;

    const timer = window.setTimeout(() => {
      setState(prev => ({
        ...prev,
        statusMessage: null,
      }));
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [state.statusMessage]);

  const handleExport = React.useCallback(async () => {
    try {
      if (!state.itemInfo) {
        throw new Error('Item info not available');
      }

      exportAllToCSV(state.allVersions, state.itemInfo);

      SPContext.logger.success('Version history exported', {
        versionCount: state.allVersions.length,
      });

      setState(prev => ({
        ...prev,
        statusMessage: {
          type: 'success',
          text: `Exported ${state.allVersions.length} version${
            state.allVersions.length === 1 ? '' : 's'
          } to CSV.`,
        },
      }));

      if (onExport) {
        onExport(state.allVersions.length);
      }
    } catch (error) {
      SPContext.logger.error('Failed to export version history', error);
      setState(prev => ({
        ...prev,
        statusMessage: {
          type: 'error',
          text: 'Failed to export version history. Please try again.',
        },
      }));
    }
  }, [state.itemInfo, state.allVersions, onExport]);

  const handleDownloadVersion = React.useCallback(
    async (version?: IVersionInfo) => {
      if (!state.itemInfo) {
        return;
      }

      const targetVersion = version ?? state.selectedVersion;

      if (!targetVersion) {
        return;
      }

      setIsDownloading(true);

      try {
        await downloadDocumentVersion(targetVersion, state.itemInfo);

        SPContext.logger.success('Document version downloaded', {
          version: targetVersion.versionLabel,
        });

        setState(prev => ({
          ...prev,
          statusMessage: {
            type: 'success',
            text: `Downloading version ${targetVersion.versionLabel}...`,
          },
        }));

        if (onDownload) {
          onDownload(targetVersion);
        }
      } catch (error) {
        SPContext.logger.error('Failed to download document version', error);
        setState(prev => ({
          ...prev,
          statusMessage: {
            type: 'error',
            text: 'Failed to download document version. Please try again.',
          },
        }));
      } finally {
        setIsDownloading(false);
      }
    },
    [state.itemInfo, state.selectedVersion, onDownload]
  );

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  if (state.isLoading) {
    return (
      <Popup
        visible={true}
        onHiding={handleClose}
        dragEnabled={false}
        closeOnOutsideClick={false}
        showTitle={false}
        width='95vw'
        height='95vh'
        className='version-history-popup'
      >
        <div className='version-history-loading-container'>
          <Spinner size={SpinnerSize.large} label='Loading version history...' />
        </div>
      </Popup>
    );
  }

  if (state.error || !state.hasPermission) {
    return (
      <Popup
        visible={true}
        onHiding={handleClose}
        dragEnabled={false}
        closeOnOutsideClick={false}
        showTitle={false}
        width='95vw'
        height='95vh'
        className='version-history-popup'
      >
        <div className='version-history-error-container'>
          <MessageBar messageBarType={MessageBarType.error} isMultiline={true}>
            <Text>{state.error || 'Access denied'}</Text>
            <div className='version-history-error-actions'>
              <button type='button' onClick={loadVersionHistory} className='version-history-secondary-button'>
                <Icon iconName='Refresh' /> Try again
              </button>
              <button
                type='button'
                onClick={handleClose}
                className='version-history-icon-button'
                aria-label='Close version history'
              >
                <Icon iconName='Cancel' />
              </button>
            </div>
          </MessageBar>
          {state.statusMessage && (
            <div className='version-history-status'>
              <MessageBar messageBarType={statusMessageType} isMultiline={false}>
                {state.statusMessage.text}
              </MessageBar>
            </div>
          )}
        </div>
      </Popup>
    );
  }

  if (state.allVersions.length === 0) {
    return (
      <Popup
        visible={true}
        onHiding={handleClose}
        dragEnabled={false}
        closeOnOutsideClick={false}
        showTitle={false}
        width='95vw'
        height='95vh'
        className='version-history-popup'
      >
        <div className='version-history-empty-container'>
          <MessageBar messageBarType={MessageBarType.info}>
            <Text>No version history available for this item.</Text>
          </MessageBar>
        </div>
      </Popup>
    );
  }

  return (
    <Popup
      visible={true}
      onHiding={handleClose}
      dragEnabled={false}
      closeOnOutsideClick={true}
      showTitle={false}
      width='95vw'
      height='95vh'
      className='version-history-popup'
    >
      <ScrollView width='100%' height='100%'>
        <div className='version-history'>
          {/* Header */}
          <div className='version-history-header'>
            <div className='version-history-header-content'>
              {headerEyebrow && (
                <div className='version-history-header-eyebrow'>{headerEyebrow}</div>
              )}
              <div className='version-history-header-title-row'>
                <Text className='version-history-header-title'>{headerBreadcrumb}</Text>
              </div>
              {headerSummary && (
                <div className='version-history-header-summary'>{headerSummary}</div>
              )}
            </div>
            <div className='version-history-header-actions'>
              {allowCopyLink && (
                <button
                  className='version-history-secondary-button'
                  type='button'
                  onClick={handleCopyItemLink}
                >
                  <Icon iconName='Link' />
                  Copy link
                </button>
              )}
              <button
                className='version-history-secondary-button'
                type='button'
                onClick={handleExport}
              >
                <Icon iconName='ExcelDocument' />
                Export
              </button>
              <button
                className='version-history-icon-button'
                onClick={handleClose}
                aria-label='Close version history'
                type='button'
              >
                <Icon iconName='Cancel' />
              </button>
            </div>
          </div>

          {state.statusMessage && (
            <div className='version-history-status'>
              <MessageBar messageBarType={statusMessageType} isMultiline={false}>
                {state.statusMessage.text}
              </MessageBar>
            </div>
          )}

          {/* Main content */}
          <div className='version-history-content'>
            {/* Left panel - Timeline */}
            <div className='version-history-timeline-panel'>
              <VersionTimeline
                versions={state.filteredVersions}
                selectedVersion={state.selectedVersion}
                onSelectVersion={handleSelectVersion}
                isLoading={false}
                filterState={filterState}
                onFilterChange={handleFilterChange}
                itemType={state.itemType || 'list'}
                filtersExpanded={state.filtersExpanded}
                onToggleFilters={handleToggleFilters}
                currentUserLogin={currentUserLogin}
                onClearFilters={handleClearFilters}
                onDownloadVersion={state.itemType === 'document' ? handleDownloadVersion : undefined}
                onCopyVersionLink={allowCopyLink ? handleCopyVersionLink : undefined}
                showMajorFilter={showMajorFilter}
                showCopyActions={allowCopyLink}
              />
            </div>

            {/* Right panel - Details */}
            <div className='version-history-details-panel'>
              {state.selectedVersion && state.itemInfo && state.itemType ? (
                <VersionDetails
                  version={state.selectedVersion}
                  itemInfo={state.itemInfo}
                  itemType={state.itemType}
                  onDownload={() => handleDownloadVersion()}
                  isDownloading={isDownloading}
                  onCopyLink={handleCopyVersionLink}
                  allowCopyLink={allowCopyLink}
                />
              ) : (
                <div className='version-history-no-selection'>
                  <MessageBar messageBarType={MessageBarType.info}>
                    <Text>Select a version to view details</Text>
                  </MessageBar>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollView>
    </Popup>
  );
};
