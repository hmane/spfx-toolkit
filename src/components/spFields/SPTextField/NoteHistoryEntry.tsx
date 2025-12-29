/**
 * NoteHistoryEntry - Component for displaying a single note history entry
 *
 * Refined card design with timeline integration, smooth hover effects,
 * and elevated typography hierarchy for enterprise workflows.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { INoteHistoryEntry, INoteHistoryConfig } from './SPTextField.types';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
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
   * Whether this is the first/most recent entry
   * @default false
   */
  isFirst?: boolean;

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
    isFirst = false,
    className,
  } = props;

  // Default config values
  const timeFormat = config?.timeFormat || 'relative';
  const showVersionLabel = config?.showVersionLabel || false;
  const showUserPhoto = config?.showUserPhoto !== false; // Default true

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
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    if (diffWeek < 4) return `${diffWeek}w ago`;
    if (diffMonth < 12) return `${diffMonth}mo ago`;
    return `${diffYear}y ago`;
  };

  // Format date based on config
  const formatDate = (date: Date): string => {
    switch (timeFormat) {
      case 'relative':
        return getRelativeTime(date);
      case 'absolute':
        return DateUtils.format(date, 'MMM dd, yyyy HH:mm');
      case 'both':
        return `${getRelativeTime(date)} · ${DateUtils.format(date, 'MMM dd')}`;
      default:
        return getRelativeTime(date);
    }
  };

  // Render custom entry if provided
  if (config?.renderHistoryEntry) {
    return <>{config.renderHistoryEntry(entry)}</>;
  }

  // Build timestamp text
  const timestampText = formatDate(entry.created);

  // Determine the best user identifier to use
  // Priority: email > loginName > id (if numeric, skip as it's just a version ID)
  const userIdentifier = entry.author.email || entry.author.loginName ||
    (entry.author.id && !isNaN(Number(entry.author.id)) ? '' : entry.author.id);

  // Only show UserPersona if we have a valid user identifier
  const hasValidUserIdentifier = !!userIdentifier;

  // Entry classes
  const entryClass = [
    'note-history__entry',
    isFirst ? 'note-history__entry--first' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <article className={entryClass}>
      {/* Header with user info and timestamp on the right */}
      <header className="note-history__entry-header">
        <div className="note-history__author-section">
          <div className="note-history__author-row">
            {hasValidUserIdentifier ? (
              <UserPersona
                userIdentifier={userIdentifier}
                displayName={entry.author.title || undefined}
                email={entry.author.email}
                displayMode={showUserPhoto ? 'avatarAndName' : 'nameOnly'}
                size={28}
                showSecondaryText={false}
              />
            ) : (
              <span className="note-history__author-name">
                {entry.author.title || 'System'}
              </span>
            )}
            {showVersionLabel && entry.versionLabel && (
              <span className="note-history__version-badge">v{entry.versionLabel}</span>
            )}
          </div>
        </div>

        {/* Timestamp on the right */}
        <TooltipHost content={DateUtils.format(entry.created, 'MMM dd, yyyy HH:mm')}>
          <time className="note-history__timestamp" dateTime={entry.created.toISOString()}>
            {timestampText}
          </time>
        </TooltipHost>
      </header>

      {/* Note content */}
      {entry.isRichText ? (
        <div
          className="note-history__content note-history__content--rich"
          dangerouslySetInnerHTML={{ __html: entry.text }}
        />
      ) : (
        <p className="note-history__content">{entry.text}</p>
      )}
    </article>
  );
};

export default NoteHistoryEntry;
