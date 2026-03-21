import * as React from 'react';
import { IconButton } from '@fluentui/react/lib/Button';

export interface ICommentActionsProps {
  commentId: number;
  likeCount: number;
  isLiked: boolean;
  canDelete: boolean;
  onLike: (commentId: number) => void;
  onUnlike: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  compact?: boolean;
}

export const CommentActions: React.FC<ICommentActionsProps> = React.memo((props) => {
  const { commentId, likeCount, isLiked, canDelete, onLike, onUnlike, onDelete, compact } = props;

  const handleLikeClick = React.useCallback(() => {
    if (isLiked) {
      onUnlike(commentId);
    } else {
      onLike(commentId);
    }
  }, [commentId, isLiked, onLike, onUnlike]);

  const handleDeleteClick = React.useCallback(() => {
    onDelete(commentId);
  }, [commentId, onDelete]);

  return (
    <div className={`spfx-comments-actions ${compact ? 'compact' : ''}`}>
      <button
        className={`spfx-comments-like-btn ${isLiked ? 'liked' : ''}`}
        onClick={handleLikeClick}
        aria-label={isLiked ? 'Unlike this comment' : 'Like this comment'}
        title={isLiked ? 'Unlike' : 'Like'}
      >
        <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 16 16" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.8 6.2V3.9c0-.9.4-1.8 1.1-2.4l.5-.4.8.8c.4.4.6 1 .6 1.6v1.8h2.6c1 0 1.8.9 1.6 1.9l-.8 4.6c-.1.8-.8 1.3-1.6 1.3H6.1c-.6 0-1-.4-1-1V6.2h1.7z" />
          <path d="M2.3 6.2h1.8v6.9H2.3z" />
        </svg>
        <span>{likeCount}</span>
      </button>
      {canDelete && (
        <IconButton
          className="spfx-comments-delete-btn"
          iconProps={{ iconName: 'Delete' }}
          title="Delete comment"
          ariaLabel="Delete this comment"
          onClick={handleDeleteClick}
        />
      )}
    </div>
  );
});

CommentActions.displayName = 'CommentActions';
