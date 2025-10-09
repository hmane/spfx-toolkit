import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Text } from '@fluentui/react/lib/Text';
import '@pnp/sp/content-types';
import '@pnp/sp/fields';
import { Popup } from 'devextreme-react/popup';
import { ScrollView } from 'devextreme-react/scroll-view';
import * as React from 'react';
import 'spfx-toolkit/lib/utilities/context/pnpImports/files';
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
} from './VersionHistoryUtils';

export const VersionHistory: React.FC<IVersionHistoryProps> = props => {
  const { listId, itemId, onClose, onExport, onDownload } = props;

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
  });

  const [isDownloading, setIsDownloading] = React.useState(false);

  const filterState: IFilterState = React.useMemo(
    () => ({
      searchQuery: state.searchQuery,
      filterByUser: state.filterByUser,
      filterDateRange: state.filterDateRange,
      showMajorOnly: state.showMajorOnly,
      customDateStart: null,
      customDateEnd: null,
    }),
    [state.searchQuery, state.filterByUser, state.filterDateRange, state.showMajorOnly]
  );

  React.useEffect(() => {
    loadVersionHistory();
  }, [listId, itemId]);

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
  ]);

  const loadVersionHistory = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check permissions
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        // Close popup and show alert
        onClose();
        alert(
          'Unable to load version history. The item may not exist or you do not have permission to view it.'
        );
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
      }));

      SPContext.logger.info('Version history loaded', {
        listId,
        itemId,
        versionCount: processedVersions.length,
        itemType: detectedItemType,
      });
    } catch (error) {
      SPContext.logger.error('Failed to load version history', error, { listId, itemId });

      // Close popup and show alert with helpful message
      onClose();

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(
        `Unable to load version history.\n\n` +
          `Possible reasons:\n` +
          `• The item does not exist\n` +
          `• You do not have permission to view this item\n` +
          `• The item may have been deleted\n\n` +
          `Error details: ${errorMessage}`
      );
    }
  };

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
      console.log('[loadItemInfo] Start - itemType:', itemType);

      const list = await SPContext.sp.web.lists.getById(listId).select('Title')();
      console.log('[loadItemInfo] List:', list);

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

      console.log('[loadItemInfo] Item details:', {
        Title: item.Title,
        FileRef: item.FileRef,
        FileLeafRef: item.FileLeafRef,
        UIVersionString: item._UIVersionString,
        hasFile: !!item.File,
        FileServerRelativeUrl: item.File?.ServerRelativeUrl,
      });

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

      console.log('[loadItemInfo] Final itemInfo:', itemInfo);
      return itemInfo;
    } catch (error) {
      console.error('[loadItemInfo] Error:', error);
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

      console.log('[loadVersions] Starting - itemType:', itemType, 'itemUrl:', itemInfo.itemUrl);

      if (itemType === 'document') {
        if (itemInfo.itemUrl) {
          console.log('[loadVersions] Fetching document versions from:', itemInfo.itemUrl);

          // Get historical versions with Author expanded
          const fileVersions = SPContext.sp.web.getFileByServerRelativePath(
            itemInfo.itemUrl
          ).versions;
          const historicalVersions = await fileVersions.select('*').expand('CreatedBy')();

          console.log('[loadVersions] Historical versions:', historicalVersions?.length);
          if (historicalVersions && historicalVersions.length > 0) {
            console.log('[loadVersions] First historical version sample:', historicalVersions[0]);
          }

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

          console.log('[loadVersions] Current file:', currentFile);
          console.log('[loadVersions] List item Author:', listItem.Author);
          console.log('[loadVersions] List item Editor:', listItem.Editor);

          // Build current version object to match version structure
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
            CreatedBy: listItem.Author, // Add for consistency
          };

          // Prepend current version to historical versions
          versions = [currentVersion, ...historicalVersions];

          console.log('[loadVersions] Total versions (current + historical):', versions.length);

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

        console.log('[loadVersions] List item versions:', versions?.length);
      }

      console.log('[loadVersions] Final versions array length:', versions?.length);
      return Array.isArray(versions) ? versions : [];
    } catch (error) {
      console.error('[loadVersions] Error:', error);
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
      console.log('[VersionHistory] processVersions - Start', {
        versionCount: versions?.length,
        itemInfo,
      });

      const fieldsList = SPContext.sp.web.lists.getById(listId).fields;
      const fields = await fieldsList
        .filter('Hidden eq false')
        .select('InternalName', 'Title', 'TypeAsString')();

      console.log('[VersionHistory] processVersions - Fields loaded', {
        count: fields?.length,
        isArray: Array.isArray(fields),
      });

      if (!fields || !Array.isArray(fields)) {
        console.error('[VersionHistory] processVersions - Fields invalid!', { fields });
        SPContext.logger.warn('No fields returned from SharePoint', { listId });
        return [];
      }

      const currentItem = await SPContext.sp.web.lists.getById(listId).items.getById(itemId)();
      console.log('[VersionHistory] processVersions - Current item loaded');

      if (!currentItem) {
        console.error('[VersionHistory] processVersions - Current item is null!');
        SPContext.logger.warn('Current item not found', { listId, itemId });
        return [];
      }

      const allVersionsData = versions;

      console.log(
        '[VersionHistory] processVersions - Total versions to process',
        allVersionsData.length
      );

      const processedVersions: IVersionInfo[] = [];

      for (let i = 0; i < allVersionsData.length; i++) {
        const version = allVersionsData[i];
        const previousVersion = allVersionsData[i + 1] || null;

        if (!version) {
          console.warn('[VersionHistory] processVersions - Skipping null version at index', i);
          continue;
        }

        const versionLabel =
          version.VersionLabel ||
          version.OData__UIVersionString ||
          version._UIVersionString ||
          '1.0';
        const isCurrentVersion = i === 0;
        const modifiedDate = new Date(version.Modified || version.Created || Date.now());

        console.log(`[VersionHistory] Processing version ${i}: ${versionLabel}`, {
          isCurrentVersion,
          hasEditor: !!version.Editor,
          hasAuthor: !!version.Author,
          hasCreatedBy: !!version.CreatedBy,
        });

        // Extract user info
        let modifiedBy = '';
        let modifiedByName = 'Unknown User';
        let modifiedByEmail = '';

        if (version.Editor && typeof version.Editor === 'object') {
          const editor = version.Editor;
          modifiedBy = editor.EMail || editor.Email || editor.Name || '';
          modifiedByName = editor.Title || 'Unknown User';
          modifiedByEmail = editor.Email || editor.EMail || '';

          console.log(`[VersionHistory] Using Editor for v${versionLabel}:`, editor);
        } else if (version.CreatedBy && typeof version.CreatedBy === 'object') {
          const createdBy = version.CreatedBy;
          modifiedBy = createdBy.EMail || createdBy.Email || createdBy.LoginName || '';
          modifiedByName = createdBy.Title || 'Unknown User';
          modifiedByEmail = createdBy.Email || createdBy.EMail || '';

          console.log(`[VersionHistory] Using CreatedBy for v${versionLabel}:`, createdBy);
        } else if (version.Author && typeof version.Author === 'object') {
          const author = version.Author;
          modifiedBy = author.EMail || author.Email || author.Name || '';
          modifiedByName = author.Title || 'Unknown User';
          modifiedByEmail = author.Email || author.EMail || '';

          console.log(`[VersionHistory] Using Author for v${versionLabel}:`, author);
        }

        console.log(`[VersionHistory] Final user info for v${versionLabel}:`, {
          modifiedBy,
          modifiedByName,
          modifiedByEmail,
        });

        const checkInComment = version.CheckInComment || version._CheckinComment || null;

        // Get size - historical versions use Size property, current uses File.Length
        const size = version.Size || version.File?.Length || version.SMTotalSize || null;
        const previousSize =
          previousVersion?.Size ||
          previousVersion?.File?.Length ||
          previousVersion?.SMTotalSize ||
          null;
        const sizeDelta = size !== null && previousSize !== null ? size - previousSize : null;

        console.log(`[VersionHistory] Size info for v${versionLabel}:`, {
          size,
          previousSize,
          sizeDelta,
        });

        console.log(`[VersionHistory] Comparing v${versionLabel} with previous`);
        if (previousVersion) {
          const prevLabel = previousVersion.VersionLabel || previousVersion.OData__UIVersionString;
          console.log(`[VersionHistory] Previous version: ${prevLabel}`);
        }

        const changedFields = compareVersions(version, previousVersion, fields);
        console.log(`[VersionHistory] Version ${versionLabel} has ${changedFields.length} changes`);

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

      console.log('[VersionHistory] processVersions - Complete', {
        processedCount: processedVersions.length,
      });

      return processedVersions;
    } catch (error) {
      console.error('[VersionHistory] processVersions - Error', error);
      SPContext.logger.error('Failed to process versions', error, { listId, itemId });
      throw error;
    }
  };

  const applyFilters = (): void => {
    const filtered = filterVersions(state.allVersions, filterState);

    setState(prev => ({
      ...prev,
      filteredVersions: filtered,
      selectedVersion:
        filtered.length > 0
          ? filtered.find(v => v.versionLabel === prev.selectedVersion?.versionLabel) || filtered[0]
          : null,
    }));
  };

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
    }));
  }, []);

  const handleToggleFilters = React.useCallback(() => {
    setState(prev => ({ ...prev, filtersExpanded: !prev.filtersExpanded }));
  }, []);

  const handleExport = React.useCallback(async () => {
    try {
      if (!state.itemInfo) {
        throw new Error('Item info not available');
      }

      exportAllToCSV(state.allVersions, state.itemInfo);

      SPContext.logger.success('Version history exported', {
        versionCount: state.allVersions.length,
      });

      if (onExport) {
        onExport(state.allVersions.length);
      }
    } catch (error) {
      SPContext.logger.error('Failed to export version history', error);
      alert('Failed to export version history. Please try again.');
    }
  }, [state.itemInfo, state.allVersions, onExport]);

  const handleDownload = React.useCallback(async () => {
    if (!state.selectedVersion || !state.itemInfo) {
      return;
    }

    setIsDownloading(true);

    try {
      await downloadDocumentVersion(state.selectedVersion, state.itemInfo);

      SPContext.logger.success('Document version downloaded', {
        version: state.selectedVersion.versionLabel,
      });

      if (onDownload) {
        onDownload(state.selectedVersion);
      }
    } catch (error) {
      SPContext.logger.error('Failed to download document version', error);
      alert('Failed to download document version. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [state.selectedVersion, state.itemInfo, onDownload]);

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
          <MessageBar messageBarType={MessageBarType.error}>
            <Text>{state.error || 'Access denied'}</Text>
          </MessageBar>
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
              <Text className='version-history-header-title'>
                Version History: {state.itemInfo?.title}
              </Text>
            </div>
            <div className='version-history-header-actions'>
              <button className='version-history-export-button' onClick={handleExport}>
                <Icon iconName='ExcelDocument' />
                Export All
              </button>
              <button
                className='version-history-close-button'
                onClick={handleClose}
                aria-label='Close'
              >
                ✕
              </button>
            </div>
          </div>

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
              />
            </div>

            {/* Right panel - Details */}
            <div className='version-history-details-panel'>
              {state.selectedVersion && state.itemInfo && state.itemType ? (
                <VersionDetails
                  version={state.selectedVersion}
                  itemInfo={state.itemInfo}
                  itemType={state.itemType}
                  onDownload={handleDownload}
                  isDownloading={isDownloading}
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
