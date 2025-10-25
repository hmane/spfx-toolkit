/**
 * NoteHistory - Component for displaying note version history
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { INoteHistoryEntry, INoteHistoryConfig } from './SPTextField.types';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { mergeStyles, mergeStyleSets } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { NoteHistoryEntry } from './NoteHistoryEntry';
import { SPContext } from '../../../utilities/context';

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
}

/**
 * NoteHistory component
 * Loads and displays SharePoint field version history
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
  } = props;

  const theme = useTheme();

  // State
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [allEntries, setAllEntries] = React.useState<INoteHistoryEntry[]>([]);
  const [displayCount, setDisplayCount] = React.useState<number>(
    config?.initialDisplayCount || 5
  );

  // Default config values
  const loadMoreCount = config?.loadMoreCount || 5;
  const showLoadMore = config?.showLoadMore !== false;
  const sortOrder = config?.sortOrder || 'desc';
  const historyTitle = config?.historyTitle || 'Previous Notes';
  const emptyMessage = config?.emptyHistoryMessage || 'No previous notes';

  // Styles
  const styles = mergeStyleSets({
    container: {
      marginTop: 16,
      paddingTop: 16,
      borderTop: `1px solid ${theme.palette.neutralQuaternaryAlt}`,
    },
    header: {
      marginBottom: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: 600,
      color: theme.palette.neutralPrimary,
    },
    count: {
      fontSize: 14,
      color: theme.palette.neutralSecondary,
      marginLeft: 8,
    },
    entriesContainer: {
      marginBottom: 12,
    },
    loadMoreButton: {
      marginTop: 8,
    },
    emptyMessage: {
      padding: 16,
      textAlign: 'center',
      color: theme.palette.neutralSecondary,
      fontStyle: 'italic',
    },
  });

  // Load history on mount
  React.useEffect(() => {
    loadHistory();
  }, [itemId, listNameOrId, fieldInternalName]);

  /**
   * Load version history from SharePoint
   */
  const loadHistory = async () => {
    if (!SPContext.sp) {
      const err = new Error('SPContext not initialized');
      setError(err.message);
      if (onHistoryError) {
        onHistoryError(err);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sp = useCache ? SPContext.spCached : SPContext.spPessimistic;

      // Load versions from SharePoint
      const versions = await sp.web.lists
        .getByTitle(listNameOrId)
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

      // Transform versions to history entries
      const entries: INoteHistoryEntry[] = versions
        .filter((version: any) => {
          const fieldValue = version[fieldInternalName];
          // Skip if field value is empty
          return fieldValue && fieldValue !== '';
        })
        .map((version: any): INoteHistoryEntry => {
          const fieldValue = version[fieldInternalName];

          return {
            id: version.VersionId,
            author: {
              id: version.Editor?.Id?.toString() || '',
              title: version.Editor?.Title || 'Unknown User',
              email: version.Editor?.EMail,
              loginName: version.Editor?.LoginName,
              value: version.Editor?.LoginName,
            },
            created: new Date(version.Created),
            text: fieldValue,
            isRichText: isRichText,
            versionLabel: version.VersionLabel,
          };
        });

      // Sort entries
      const sortedEntries = sortOrder === 'desc'
        ? entries.sort((a, b) => b.created.getTime() - a.created.getTime())
        : entries.sort((a, b) => a.created.getTime() - b.created.getTime());

      setAllEntries(sortedEntries);

      // Fire callback
      if (onHistoryLoad) {
        onHistoryLoad(sortedEntries, sortedEntries.length);
      }

      SPContext.logger.info('NoteHistory: Loaded version history', {
        field: fieldInternalName,
        count: sortedEntries.length,
      });
    } catch (err: any) {
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
      setLoading(false);
    }
  };

  /**
   * Load more entries
   */
  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + loadMoreCount);
  };

  /**
   * Handle copy previous entry
   */
  const handleCopy = (entry: INoteHistoryEntry) => {
    if (onCopyPrevious) {
      onCopyPrevious(entry);
    }
  };

  // Get entries to display
  const entriesToDisplay = allEntries.slice(0, displayCount);
  const hasMore = allEntries.length > displayCount;

  // Render loading
  if (loading) {
    return (
      <Stack className={mergeStyles(styles.container, className)}>
        <Spinner size={SpinnerSize.small} label="Loading history..." />
      </Stack>
    );
  }

  // Render error
  if (error) {
    return (
      <Stack className={mergeStyles(styles.container, className)}>
        <MessageBar messageBarType={MessageBarType.error}>
          {error}
        </MessageBar>
      </Stack>
    );
  }

  // Render empty state
  if (allEntries.length === 0) {
    return (
      <Stack className={mergeStyles(styles.container, className)}>
        <Text className={styles.emptyMessage}>{emptyMessage}</Text>
      </Stack>
    );
  }

  return (
    <Stack className={mergeStyles(styles.container, className)}>
      {/* Header */}
      <Stack horizontal verticalAlign="center" className={styles.header}>
        <Text className={styles.title}>{historyTitle}</Text>
        <Text className={styles.count}>({allEntries.length})</Text>
      </Stack>

      {/* History entries */}
      <Stack className={styles.entriesContainer}>
        {entriesToDisplay.map((entry) => (
          <NoteHistoryEntry
            key={entry.id}
            entry={entry}
            config={config}
            onCopy={handleCopy}
          />
        ))}
      </Stack>

      {/* Load more button */}
      {showLoadMore && hasMore && (
        <DefaultButton
          text={`Show ${Math.min(loadMoreCount, allEntries.length - displayCount)} more notes`}
          onClick={handleLoadMore}
          className={styles.loadMoreButton}
        />
      )}
    </Stack>
  );
};

export default NoteHistory;
