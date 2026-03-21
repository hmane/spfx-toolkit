import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { CommentText } from './CommentText';
import { CommentActions } from './CommentActions';
import type { IComment } from '../Comments.types';
import { decodeHtmlEntities } from '../utils/commentParser';

export interface ICompactLayoutProps {
  comments: IComment[];
  loading: boolean;
  enableDocumentPreview: boolean;
  currentUserEmail: string;
  highlightedCommentId?: number;
  onLike: (id: number) => void;
  onUnlike: (id: number) => void;
  onDelete: (id: number) => void;
}

export const CompactLayout: React.FC<ICompactLayoutProps> = React.memo((props) => {
  const { comments, loading, enableDocumentPreview, currentUserEmail, highlightedCommentId, onLike, onUnlike, onDelete } = props;
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  const toggleExpand = React.useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (loading) {
    return (
      <div className="spfx-comments-loading">
        <Spinner size={SpinnerSize.medium} label="Loading..." />
      </div>
    );
  }

  if (comments.length === 0) {
    return <div className="spfx-comments-empty">No comments yet.</div>;
  }

  return (
    <div className="spfx-comments-compact-list">
      {comments.map((comment) => {
        const isExpanded = expandedId === comment.id;
        const isHighlighted = comment.id === highlightedCommentId;
        const canDelete = (comment.author.email || '').toLowerCase() === currentUserEmail.toLowerCase();
        const plainText = getPlainText(comment.text);

        return (
          <React.Fragment key={comment.id}>
            <div
              className={`spfx-comments-compact-item ${isHighlighted ? 'highlighted' : ''}`}
              onClick={() => toggleExpand(comment.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && toggleExpand(comment.id)}
              aria-expanded={isExpanded}
            >
              <div
                className="spfx-comments-compact-avatar"
                style={{ backgroundColor: getAvatarColor(comment.author.title || '') }}
              >
                {getInitials(comment.author.title || comment.author.email || '')}
              </div>
              <span className="spfx-comments-compact-text">{plainText}</span>
              <div className="spfx-comments-compact-meta">
                <span className="spfx-comments-compact-username">
                  {getShortName(comment.author.title || '')}
                </span>
                <span
                  className="spfx-comments-compact-timestamp"
                  title={formatExactTimestamp(comment.createdDate)}
                >
                  {formatShortTime(comment.createdDate)}
                </span>
                <button
                  className={`spfx-comments-like-btn compact ${comment.isLiked ? 'liked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    comment.isLiked ? onUnlike(comment.id) : onLike(comment.id);
                  }}
                >
                  <svg width={12} height={12} viewBox="0 0 16 16" fill={comment.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.8 6.2V3.9c0-.9.4-1.8 1.1-2.4l.5-.4.8.8c.4.4.6 1 .6 1.6v1.8h2.6c1 0 1.8.9 1.6 1.9l-.8 4.6c-.1.8-.8 1.3-1.6 1.3H6.1c-.6 0-1-.4-1-1V6.2h1.7z" />
                    <path d="M2.3 6.2h1.8v6.9H2.3z" />
                  </svg>
                  <span>{comment.likeCount}</span>
                </button>
              </div>
            </div>
            {isExpanded && (
              <div className="spfx-comments-compact-expanded">
                <CommentText comment={comment} enableDocumentPreview={enableDocumentPreview} />
                <div className="spfx-comments-compact-expanded-actions">
                  <span className="spfx-comments-timestamp">
                    {comment.createdDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    {comment.createdDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <CommentActions
                    commentId={comment.id}
                    likeCount={comment.likeCount}
                    isLiked={comment.isLiked}
                    canDelete={canDelete}
                    onLike={onLike}
                    onUnlike={onUnlike}
                    onDelete={onDelete}
                    compact={true}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
});

CompactLayout.displayName = 'CompactLayout';

function getPlainText(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/@mention\{\d+\}/g, '@...')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function formatShortTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffMs / 86400000);
  return `${diffDays}d`;
}

function formatExactTimestamp(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function getShortName(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  return name;
}

function getInitials(name: string): string {
  const parts = name.split(/[\s@.]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || '?')[0].toUpperCase();
}

const AVATAR_COLORS = ['#0078d4', '#038387', '#8764b8', '#ca5010', '#498205', '#d13438', '#8e562e', '#0063b1'];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
