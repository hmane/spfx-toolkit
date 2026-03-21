import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { CommentText } from './CommentText';
import { UserPersona } from '../../UserPersona';
import type { IComment } from '../Comments.types';

export interface IChatLayoutProps {
  comments: IComment[];
  loading: boolean;
  enableDocumentPreview: boolean;
  currentUserEmail: string;
  highlightedCommentId?: number;
  onLike: (id: number) => void;
  onUnlike: (id: number) => void;
  onDelete: (id: number) => void;
}

export const ChatLayout: React.FC<IChatLayoutProps> = React.memo((props) => {
  const { comments, loading, enableDocumentPreview, currentUserEmail, highlightedCommentId, onLike, onUnlike, onDelete } = props;

  if (loading) {
    return (
      <div className="spfx-comments-loading">
        <Spinner size={SpinnerSize.medium} label="Loading messages..." />
      </div>
    );
  }

  if (comments.length === 0) {
    return <div className="spfx-comments-empty">No messages yet. Start the conversation!</div>;
  }

  // Group comments by date
  const grouped = groupByDate(comments);

  return (
    <div className="spfx-comments-chat-list">
      {grouped.map(([dateLabel, dayComments]) => (
        <React.Fragment key={dateLabel}>
          <div className="spfx-comments-chat-day-divider">
            <span>{dateLabel}</span>
          </div>
          {dayComments.map((comment) => {
            const isSelf = (comment.author.email || '').toLowerCase() === currentUserEmail.toLowerCase();
            const isHighlighted = comment.id === highlightedCommentId;

            return (
              <div
                key={comment.id}
                className={`spfx-comments-chat-message ${isSelf ? 'self' : ''} ${isHighlighted ? 'highlighted' : ''}`}
              >
                {!isSelf && (
                  <div className="spfx-comments-chat-avatar">
                    <UserPersona
                      userIdentifier={comment.author.email || comment.author.id}
                      displayName={comment.author.title}
                      size={24}
                      displayMode="avatar"
                    />
                  </div>
                )}
                <div className="spfx-comments-chat-bubble">
                  {!isSelf && (
                    <div className="spfx-comments-chat-bubble-header">
                      <span className="spfx-comments-username">{comment.author.title}</span>
                    </div>
                  )}
                  <CommentText comment={comment} enableDocumentPreview={enableDocumentPreview} />
                  <div className="spfx-comments-chat-bubble-footer">
                    <span className="spfx-comments-timestamp">
                      {comment.createdDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="spfx-comments-chat-reactions">
                    <button
                      className={`spfx-comments-chat-reaction ${comment.isLiked ? 'active' : ''}`}
                      onClick={() => comment.isLiked ? onUnlike(comment.id) : onLike(comment.id)}
                      aria-label={comment.isLiked ? 'Unlike' : 'Like'}
                    >
                      <span aria-hidden="true">{'\uD83D\uDC4D'}</span>{' '}
                      <span className="spfx-comments-chat-reaction-count">{comment.likeCount}</span>
                    </button>
                  </div>
                </div>
                {isSelf && (
                  <div className="spfx-comments-chat-avatar">
                    <UserPersona
                      userIdentifier={comment.author.email || comment.author.id}
                      displayName={comment.author.title}
                      size={24}
                      displayMode="avatar"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
});

ChatLayout.displayName = 'ChatLayout';

function groupByDate(comments: IComment[]): [string, IComment[]][] {
  const groups: Map<string, IComment[]> = new Map();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const comment of comments) {
    const date = comment.createdDate;
    let label: string;

    if (isSameDay(date, today)) {
      label = 'Today';
    } else if (isSameDay(date, yesterday)) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(comment);
  }

  return Array.from(groups.entries());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
