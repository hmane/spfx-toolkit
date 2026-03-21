import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { CommentText } from './CommentText';
import { CommentActions } from './CommentActions';
import { UserPersona } from '../../UserPersona';
import type { IComment } from '../Comments.types';

export interface IClassicLayoutProps {
  comments: IComment[];
  loading: boolean;
  enableDocumentPreview: boolean;
  currentUserEmail: string;
  highlightedCommentId?: number;
  onLike: (id: number) => void;
  onUnlike: (id: number) => void;
  onDelete: (id: number) => void;
}

export const ClassicLayout: React.FC<IClassicLayoutProps> = React.memo((props) => {
  const { comments, loading, enableDocumentPreview, currentUserEmail, highlightedCommentId, onLike, onUnlike, onDelete } = props;

  const highlightRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (highlightedCommentId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedCommentId]);

  if (loading) {
    return (
      <div className="spfx-comments-loading">
        <Spinner size={SpinnerSize.medium} label="Loading comments..." />
      </div>
    );
  }

  if (comments.length === 0) {
    return <div className="spfx-comments-empty">No comments yet. Be the first to comment!</div>;
  }

  return (
    <div className="spfx-comments-classic-list">
      {comments.map((comment) => {
        const isHighlighted = comment.id === highlightedCommentId;
        const canDelete = (comment.author.email || '').toLowerCase() === currentUserEmail.toLowerCase();

        return (
          <div
            key={comment.id}
            ref={isHighlighted ? highlightRef : undefined}
            className={`spfx-comments-classic-item ${isHighlighted ? 'highlighted' : ''}`}
          >
            <div className="spfx-comments-classic-avatar">
              <UserPersona
                userIdentifier={comment.author.email || comment.author.id}
                displayName={comment.author.title}
                size={40}
                displayMode="avatar"
              />
            </div>
            <div className="spfx-comments-classic-body">
              <div className="spfx-comments-classic-header">
                <span className="spfx-comments-username">{comment.author.title}</span>
                <span
                  className="spfx-comments-timestamp"
                  title={formatExactTimestamp(comment.createdDate)}
                >
                  {formatTimestamp(comment.createdDate)}
                </span>
              </div>
              <CommentText comment={comment} enableDocumentPreview={enableDocumentPreview} />
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

ClassicLayout.displayName = 'ClassicLayout';

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatExactTimestamp(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
