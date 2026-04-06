import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import { CommentText } from './CommentText';
import { CommentActions } from './CommentActions';
import { UserPersona } from '../../UserPersona';
import { sanitizeHtml } from '../../../utilities/htmlUtils';
import type { IComment, ISystemEvent } from '../Comments.types';

export interface ITimelineLayoutProps {
  comments: IComment[];
  systemEvents: ISystemEvent[];
  loading: boolean;
  enableDocumentPreview: boolean;
  enableCommentCollapse: boolean;
  collapsedMaxLines: number;
  currentUserEmail: string;
  searchQuery?: string;
  highlightedCommentId?: number;
  onLike: (id: number) => void;
  onUnlike: (id: number) => void;
  onDelete: (id: number) => void | Promise<void>;
}

type TimelineEntry =
  | { type: 'comment'; data: IComment; date: Date }
  | { type: 'system'; data: ISystemEvent; date: Date };

export const TimelineLayout: React.FC<ITimelineLayoutProps> = React.memo((props) => {
  const {
    comments, systemEvents, loading, enableDocumentPreview, enableCommentCollapse, collapsedMaxLines,
    currentUserEmail, searchQuery, highlightedCommentId, onLike, onUnlike, onDelete,
  } = props;

  // Merge comments and system events, sorted by date
  const entries = React.useMemo<TimelineEntry[]>(() => {
    const merged: TimelineEntry[] = [
      ...comments.map((c) => ({ type: 'comment' as const, data: c, date: c.createdDate })),
      ...systemEvents.map((e) => ({ type: 'system' as const, data: e, date: e.date })),
    ];
    merged.sort((a, b) => a.date.getTime() - b.date.getTime());
    return merged;
  }, [comments, systemEvents]);

  if (loading) {
    return (
      <div className="spfx-comments-loading">
        <Spinner size={SpinnerSize.medium} label="Loading timeline..." />
      </div>
    );
  }

  if (entries.length === 0) {
    return <div className="spfx-comments-empty">No activity yet.</div>;
  }

  return (
    <div className="spfx-comments-timeline-list">
      {entries.map((entry, idx) => {
        const isLast = idx === entries.length - 1;

        if (entry.type === 'system') {
          const event = entry.data as ISystemEvent;
          return (
            <div key={`sys-${event.id}`} className={`spfx-comments-timeline-item system ${event.type}`}>
              <div className={`spfx-comments-timeline-rail ${isLast ? 'last' : ''}`}>
                <div className={`spfx-comments-timeline-icon ${event.type}`}>
                  <Icon iconName={getSystemIcon(event.type)} />
                </div>
              </div>
              <div className="spfx-comments-timeline-content">
                <div className="spfx-comments-timeline-header">
                  <span className={`spfx-comments-username system-${event.type}`}>System</span>
                  <span className="spfx-comments-timestamp">
                    {formatTimelineDate(event.date)}
                  </span>
                </div>
                <div className={`spfx-comments-timeline-body system-${event.type}`}>
                  <span
                    className="spfx-comments-text"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.text) }}
                  />
                </div>
              </div>
            </div>
          );
        }

        const comment = entry.data as IComment;
        const isHighlighted = comment.id === highlightedCommentId;
        const canDelete = (comment.author.email || '').toLowerCase() === currentUserEmail.toLowerCase();

        return (
          <div
            key={`comment-${comment.id}`}
            className={`spfx-comments-timeline-item ${isHighlighted ? 'highlighted' : ''}`}
          >
            <div className={`spfx-comments-timeline-rail ${isLast ? 'last' : ''}`}>
              <UserPersona
                userIdentifier={comment.author.email || comment.author.id}
                displayName={comment.author.title}
                size={32}
                displayMode="avatar"
              />
            </div>
            <div className="spfx-comments-timeline-content">
              <div className="spfx-comments-timeline-header">
                <span className="spfx-comments-username">{comment.author.title}</span>
                <span className="spfx-comments-timestamp">
                  {formatTimelineDate(comment.createdDate)}
                </span>
              </div>
              <div className="spfx-comments-timeline-body">
                <CommentText
                  comment={comment}
                  enableDocumentPreview={enableDocumentPreview}
                  enableCollapse={enableCommentCollapse}
                  collapsedMaxLines={collapsedMaxLines}
                  searchQuery={searchQuery}
                />
              </div>
              <CommentActions
                commentId={comment.id}
                likeCount={comment.likeCount}
                isLiked={comment.isLiked}
                canDelete={canDelete}
                onLike={onLike}
                onUnlike={onUnlike}
                onDelete={onDelete}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});

TimelineLayout.displayName = 'TimelineLayout';

function getSystemIcon(type: string): string {
  switch (type) {
    case 'success': return 'CompletedSolid';
    case 'warning': return 'WarningSolid';
    case 'error': return 'ErrorBadge';
    default: return 'InfoSolid';
  }
}

function formatTimelineDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
