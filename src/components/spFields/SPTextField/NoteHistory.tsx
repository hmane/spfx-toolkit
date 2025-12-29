/**
 * NoteHistory - Component for displaying note version history
 *
 * Refined editorial design with timeline-inspired layout for enterprise workflows.
 * Features smooth animations, sophisticated typography, and elevated visual hierarchy.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { INoteHistoryEntry, INoteHistoryConfig } from './SPTextField.types';
import { Icon } from '@fluentui/react/lib/Icon';
import { NoteHistoryEntry } from './NoteHistoryEntry';
import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import './NoteHistory.css';

/**
 * Props for NoteHistory component
 */
export interface INoteHistoryProps {
  /**
   * SharePoint item ID
   */
  itemId: number;

  /**
   * List name or ID
   */
  listNameOrId: string;

  /**
   * Field internal name
   */
  fieldInternalName: string;

  /**
   * Configuration for history display
   */
  config?: INoteHistoryConfig;

  /**
   * Whether field is rich text
   */
  isRichText?: boolean;

  /**
   * Use cached versions
   */
  useCache?: boolean;

  /**
   * Callback when history is loaded
   */
  onHistoryLoad?: (entries: INoteHistoryEntry[], totalCount: number) => void;

  /**
   * Callback when history loading fails
   */
  onHistoryError?: (error: Error) => void;

  /**
   * Callback when user copies a previous entry
   */
  onCopyPrevious?: (entry: INoteHistoryEntry) => void;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Whether there's an input field above this history component
   * Controls the top divider visibility
   * @default true
   */
  hasInputAbove?: boolean;
}

/**
 * NoteHistory component
 * Loads and displays SharePoint field version history with refined editorial styling
 */
export const NoteHistory: React.FC<INoteHistoryProps> = (props) => {
  const {
    itemId,
    listNameOrId,
    fieldInternalName,
    config,
    isRichText = false,
    useCache = false,
    onHistoryLoad,
    onHistoryError,
    onCopyPrevious,
    className,
    hasInputAbove = true,
  } = props;

  // State
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [allEntries, setAllEntries] = React.useState<INoteHistoryEntry[]>([]);
  const [displayCount, setDisplayCount] = React.useState<number>(
    config?.initialDisplayCount || 5
  );

  // Track if history has been loaded to prevent duplicate loads
  const hasLoadedRef = React.useRef<boolean>(false);
  const loadingRef = React.useRef<boolean>(false);

  // Default config values
  const loadMoreCount = config?.loadMoreCount || 5;
  const showLoadMore = config?.showLoadMore !== false;
  const sortOrder = config?.sortOrder || 'desc';
  const historyTitle = config?.historyTitle || 'Previous Notes';
  const emptyMessage = config?.emptyHistoryMessage || 'No previous notes';

  /**
   * Load version history from SharePoint
   * Memoized to prevent recreating on every render
   */
  const loadHistory = React.useCallback(async (abortSignal?: AbortSignal) => {
    // Prevent duplicate loads
    if (loadingRef.current) {
      SPContext.logger.info('NoteHistory: Load already in progress, skipping');
      return;
    }

    if (!SPContext.sp) {
      const err = new Error('SPContext not initialized');
      setError(err.message);
      if (onHistoryError) {
        onHistoryError(err);
      }
      setLoading(false);
      return;
    }

    // Check if aborted before starting
    if (abortSignal?.aborted) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const sp = useCache ? SPContext.spCached : SPContext.spPessimistic;

      // Load versions from SharePoint
      const versions = await getListByNameOrId(sp, listNameOrId)
        .items.getById(itemId)
        .versions
        .select(
          'VersionId',
          'VersionLabel',
          'Created',
          fieldInternalName,
          'Editor/Id',
          'Editor/Title',
          'Editor/EMail',
          'Editor/LoginName'
        )
        .expand('Editor')
        .top(100)();

      // Log first version to debug Editor structure
      if (versions.length > 0) {
        SPContext.logger.info('NoteHistory: Sample version structure', {
          hasEditor: !!versions[0].Editor,
          editorType: typeof versions[0].Editor,
          editor: versions[0].Editor,
        });
      }

      // Transform versions to history entries
      const entries: INoteHistoryEntry[] = versions
        .filter((version: any) => {
          const fieldValue = version[fieldInternalName];
          // Skip if field value is empty or is a SharePoint "View Entries" link
          if (!fieldValue || fieldValue === '') return false;
          // Skip SharePoint's "View Entries" HTML links
          if (typeof fieldValue === 'string' && fieldValue.includes('View Entries</a>')) return false;
          return true;
        })
        .map((version: any): INoteHistoryEntry => {
          const fieldValue = version[fieldInternalName];

          // Handle different Editor formats from SharePoint version history
          // Editor can be: { Id, Title, EMail, LoginName } object OR just a string (loginName)
          let author: any;
          if (version.Editor && typeof version.Editor === 'object') {
            // Editor is an expanded object
            author = {
              id: version.Editor.Id?.toString() || version.Editor.id?.toString() || '',
              title: version.Editor.Title || version.Editor.title || '',
              email: version.Editor.EMail || version.Editor.Email || version.Editor.email || '',
              loginName: version.Editor.LoginName || version.Editor.loginName || '',
              value: version.Editor.LoginName || version.Editor.loginName || '',
            };
          } else if (version.Editor && typeof version.Editor === 'string') {
            // Editor is a string (loginName or email)
            author = {
              id: '',
              title: '',
              email: version.Editor.includes('@') ? version.Editor : '',
              loginName: version.Editor,
              value: version.Editor,
            };
          } else {
            // Fallback - try to extract from other fields
            author = {
              id: '',
              title: '',
              email: '',
              loginName: '',
              value: '',
            };
          }

          return {
            id: version.VersionId,
            author,
            created: new Date(version.Created),
            text: fieldValue,
            isRichText: isRichText,
            versionLabel: version.VersionLabel,
          };
        });

      // Check if aborted before updating state
      if (abortSignal?.aborted) {
        return;
      }

      // Sort entries
      const sortedEntries = sortOrder === 'desc'
        ? entries.sort((a, b) => b.created.getTime() - a.created.getTime())
        : entries.sort((a, b) => a.created.getTime() - b.created.getTime());

      setAllEntries(sortedEntries);
      hasLoadedRef.current = true;

      // Fire callback
      if (onHistoryLoad) {
        onHistoryLoad(sortedEntries, sortedEntries.length);
      }

      SPContext.logger.info('NoteHistory: Loaded version history', {
        field: fieldInternalName,
        count: sortedEntries.length,
      });
    } catch (err: any) {
      // Don't update state if aborted
      if (abortSignal?.aborted) {
        return;
      }

      const errorMsg = err?.message || 'Failed to load version history';
      setError(errorMsg);
      SPContext.logger.error('NoteHistory: Failed to load version history', err, {
        itemId,
        listNameOrId,
        fieldInternalName,
      });

      if (onHistoryError) {
        onHistoryError(err);
      }
    } finally {
      loadingRef.current = false;
      if (!abortSignal?.aborted) {
        setLoading(false);
      }
    }
  }, [itemId, listNameOrId, fieldInternalName, useCache, isRichText, sortOrder, onHistoryLoad, onHistoryError]);

  // Load history on mount with proper cleanup
  React.useEffect(() => {
    // Reset loaded flag when key props change
    hasLoadedRef.current = false;
    loadingRef.current = false;

    const abortController = new AbortController();

    loadHistory(abortController.signal).catch((err) => {
      if (!abortController.signal.aborted) {
        SPContext.logger.error('NoteHistory: Unexpected error in loadHistory', err);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [loadHistory]);

  /**
   * Load more entries
   */
  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + loadMoreCount);
  };

  // Get entries to display
  const entriesToDisplay = allEntries.slice(0, displayCount);
  const hasMore = allEntries.length > displayCount;
  const remainingCount = Math.min(loadMoreCount, allEntries.length - displayCount);

  // Container class - add modifier based on whether there's an input above
  const containerClass = [
    'note-history',
    hasInputAbove ? 'note-history--with-input' : 'note-history--standalone',
    className,
  ].filter(Boolean).join(' ');

  // Render loading state
  if (loading) {
    return (
      <div className={containerClass}>
        <div className="note-history__loading">
          <div className="note-history__loading-spinner" />
          <span className="note-history__loading-text">Loading history...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={containerClass}>
        <div className="note-history__error">
          <Icon iconName="ErrorBadge" className="note-history__error-icon" />
          <p className="note-history__error-text">{error}</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (allEntries.length === 0) {
    return (
      <div className={containerClass}>
        <div className="note-history__empty">
          <Icon iconName="DocumentSet" className="note-history__empty-icon" />
          <p className="note-history__empty-text">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="note-history__header">
        <div className="note-history__title-group">
          <h4 className="note-history__title">{historyTitle}</h4>
          <span className="note-history__count">{allEntries.length}</span>
        </div>
      </div>

      {/* Timeline of entries */}
      <div className="note-history__timeline">
        {entriesToDisplay.map((entry, index) => (
          <NoteHistoryEntry
            key={entry.id}
            entry={entry}
            config={config}
            isFirst={index === 0}
          />
        ))}
      </div>

      {/* Load more button */}
      {showLoadMore && hasMore && (
        <div className="note-history__load-more">
          <button
            type="button"
            className="note-history__load-more-btn"
            onClick={handleLoadMore}
          >
            <Icon iconName="ChevronDown" />
            <span>Show {remainingCount} more note{remainingCount !== 1 ? 's' : ''}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default NoteHistory;
