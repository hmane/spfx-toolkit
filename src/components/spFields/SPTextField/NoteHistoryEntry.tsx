/**
 * NoteHistoryEntry - Component for displaying a single note history entry
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { INoteHistoryEntry, INoteHistoryConfig } from './SPTextField.types';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { IconButton } from '@fluentui/react/lib/Button';
import { mergeStyles, mergeStyleSets } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { UserPersona } from '../../UserPersona';
import { DateUtils } from '../../../utilities/dateUtils';

/**
 * Props for NoteHistoryEntry component
 */
export interface INoteHistoryEntryProps {
  /**
   * The history entry to display
   */
  entry: INoteHistoryEntry;

  /**
   * Configuration for history display
   */
  config?: INoteHistoryConfig;

  /**
   * Whether to show the copy button
   * @default true
   */
  showCopyButton?: boolean;

  /**
   * Callback when copy button is clicked
   */
  onCopy?: (entry: INoteHistoryEntry) => void;

  /**
   * Custom CSS class
   */
  className?: string;
}

/**
 * NoteHistoryEntry component
 * Displays a single note history entry with user, date, and content
 */
export const NoteHistoryEntry: React.FC<INoteHistoryEntryProps> = (props) => {
  const {
    entry,
    config,
    showCopyButton = true,
    onCopy,
    className,
  } = props;

  const theme = useTheme();

  // Default config values
  const timeFormat = config?.timeFormat || 'relative';
  const showVersionLabel = config?.showVersionLabel || false;
  const showUserPhoto = config?.showUserPhoto !== false; // Default true
  const enableCopyPrevious = config?.enableCopyPrevious !== false; // Default true

  // Styles
  const styles = mergeStyleSets({
    container: {
      padding: 12,
      marginBottom: 8,
      backgroundColor: theme.palette.neutralLighterAlt,
      borderRadius: 4,
      border: `1px solid ${theme.palette.neutralQuaternaryAlt}`,
      transition: 'all 0.2s ease',
      selectors: {
        ':hover': {
          backgroundColor: theme.palette.neutralLighter,
          borderColor: theme.palette.neutralTertiaryAlt,
        },
      },
    },
    header: {
      marginBottom: 8,
    },
    userInfo: {
      flex: 1,
    },
    content: {
      color: theme.palette.neutralPrimary,
      fontSize: 14,
      lineHeight: '20px',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap',
    },
    richContent: {
      color: theme.palette.neutralPrimary,
      fontSize: 14,
      lineHeight: '20px',
      wordBreak: 'break-word',
      selectors: {
        '& p': {
          margin: '0 0 8px 0',
        },
        '& p:last-child': {
          marginBottom: 0,
        },
      },
    },
    versionLabel: {
      fontSize: 12,
      color: theme.palette.neutralSecondary,
      marginLeft: 8,
      fontWeight: 600,
    },
    copyButton: {
      marginLeft: 8,
    },
  });

  // Simple relative time formatter
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? 's' : ''} ago`;
    if (diffMonth < 12) return `${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`;
    return `${diffYear} year${diffYear !== 1 ? 's' : ''} ago`;
  };

  // Format date based on config
  const formatDate = (date: Date): string => {
    switch (timeFormat) {
      case 'relative':
        return getRelativeTime(date);
      case 'absolute':
        return DateUtils.format(date, 'MMM dd, yyyy HH:mm');
      case 'both':
        return `${getRelativeTime(date)} (${DateUtils.format(date, 'MMM dd, yyyy HH:mm')})`;
      default:
        return getRelativeTime(date);
    }
  };

  // Handle copy button click
  const handleCopy = () => {
    if (onCopy) {
      onCopy(entry);
    }
  };

  // Render custom entry if provided
  if (config?.renderHistoryEntry) {
    return <>{config.renderHistoryEntry(entry)}</>;
  }

  // Build secondary text for persona
  const secondaryText = formatDate(entry.created);
  const fullSecondaryText = showVersionLabel && entry.versionLabel
    ? `${secondaryText} · v${entry.versionLabel}`
    : secondaryText;

  return (
    <Stack className={mergeStyles(styles.container, className)}>
      {/* Header with user and actions */}
      <Stack horizontal verticalAlign="center" className={styles.header}>
        <div className={styles.userInfo}>
          <UserPersona
            userIdentifier={entry.author.email || entry.author.loginName || entry.author.id}
            displayName={entry.author.title}
            email={entry.author.email}
            displayMode={showUserPhoto ? 'avatarAndName' : 'nameOnly'}
            size={28}
            showSecondaryText={true}
          />
          {fullSecondaryText && (
            <Text variant="small" style={{ marginLeft: showUserPhoto ? 38 : 0, color: theme.palette.neutralSecondary }}>
              {fullSecondaryText}
            </Text>
          )}
        </div>

        {/* Copy button */}
        {showCopyButton && enableCopyPrevious && (
          <IconButton
            iconProps={{ iconName: 'Copy' }}
            title="Copy this note"
            ariaLabel="Copy this note"
            onClick={handleCopy}
            className={styles.copyButton}
          />
        )}
      </Stack>

      {/* Note content */}
      {entry.isRichText ? (
        <div
          className={styles.richContent}
          dangerouslySetInnerHTML={{ __html: entry.text }}
        />
      ) : (
        <Text className={styles.content}>{entry.text}</Text>
      )}
    </Stack>
  );
};

export default NoteHistoryEntry;
