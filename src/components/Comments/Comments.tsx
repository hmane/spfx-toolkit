/**
 * Comments Component
 *
 * A customizable comments component for SharePoint list items.
 * Supports @mentions, #links, search, and multiple layout variants.
 */

import * as React from 'react';
import { SPContext } from '../../utilities/context';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { confirm } from '../../utilities/dialogService';
import type { IComment, ICommentsProps } from './Comments.types';
import { COMMENTS_DEFAULTS } from './Comments.types';
import { useComments } from './hooks/useComments';
import { useCommentInput } from './hooks/useCommentInput';
import { useCommentSearch } from './hooks/useCommentSearch';
import { CommentInput } from './components/CommentInput';
import { CommentSearch } from './components/CommentSearch';
import { ClassicLayout } from './components/ClassicLayout';
import { ChatLayout } from './components/ChatLayout';
import { CompactLayout } from './components/CompactLayout';
import { TimelineLayout } from './components/TimelineLayout';
import './Comments.css';

export const Comments: React.FC<ICommentsProps> = (props) => {
  const {
    listId,
    itemId,
    preferredUsers = [],
    onResolveMentions,
    linkSuggestions = [],
    onResolveLinkSuggestions,
    enableLinkResolution = COMMENTS_DEFAULTS.enableLinkResolution,
    layout = COMMENTS_DEFAULTS.layout,
    numberCommentsPerPage = COMMENTS_DEFAULTS.numberCommentsPerPage,
    highlightedCommentId,
    sortOrder = COMMENTS_DEFAULTS.sortOrder,
    enableSearch = COMMENTS_DEFAULTS.enableSearch,
    enableDocumentPreview = COMMENTS_DEFAULTS.enableDocumentPreview,
    enableCommentCollapse = COMMENTS_DEFAULTS.enableCommentCollapse,
    collapsedMaxLines = COMMENTS_DEFAULTS.collapsedMaxLines,
    label,
    confirmDelete = COMMENTS_DEFAULTS.confirmDelete,
    deleteConfirmationTitle = COMMENTS_DEFAULTS.deleteConfirmationTitle,
    deleteConfirmationMessage = COMMENTS_DEFAULTS.deleteConfirmationMessage,
    onCommentAdded,
    onCommentDeleted,
    onCommentLiked,
    onMentioned,
    onLinkAdded,
    onError,
    className,
    systemEvents = [],
  } = props;
  const [activeHighlightedCommentId, setActiveHighlightedCommentId] = React.useState<number | undefined>(highlightedCommentId);

  // Check SPContext readiness
  const isReady = SPContext.isReady();
  const currentUserEmail = React.useMemo(() => {
    if (!isReady) return '';
    try {
      return SPContext.currentUser?.email || '';
    } catch {
      return '';
    }
  }, [isReady]);

  React.useEffect(() => {
    setActiveHighlightedCommentId(highlightedCommentId);
  }, [highlightedCommentId]);

  const handleCommentAdded = React.useCallback(
    (comment: IComment) => {
      setActiveHighlightedCommentId(comment.id);
      onCommentAdded?.(comment);
    },
    [onCommentAdded]
  );

  // Core CRUD hook
  const commentsHook = useComments({
    listId,
    itemId,
    pageSize: numberCommentsPerPage,
    sortOrder,
    onCommentAdded: handleCommentAdded,
    onCommentDeleted,
    onCommentLiked,
    onError,
  });

  // Input hook
  const inputHook = useCommentInput({
    enableLinkResolution,
    onMentioned,
    onLinkAdded,
  });

  // Search hook
  const searchHook = useCommentSearch({
    comments: commentsHook.state.comments,
    enabled: enableSearch,
  });

  // Post handler — scans text for active mentions/links, drops any the user deleted
  const handlePost = React.useCallback(async () => {
    try {
      const { submitText, activeMentions, activeLinks } = inputHook.getSubmitData();
      await commentsHook.addComment(submitText, activeMentions, activeLinks);
      inputHook.reset();
    } catch {
      // Error already handled in hook — keep draft in input
    }
  }, [commentsHook, inputHook]);

  React.useEffect(() => {
    if (!activeHighlightedCommentId) {
      return;
    }

    void commentsHook.loadCommentById(activeHighlightedCommentId);
  }, [activeHighlightedCommentId, commentsHook.loadCommentById]);

  const handleDelete = React.useCallback(
    async (commentId: number) => {
      if (confirmDelete) {
        const confirmed = await confirm(deleteConfirmationMessage, {
          title: deleteConfirmationTitle,
        });

        if (!confirmed) {
          return;
        }
      }

      await commentsHook.deleteComment(commentId);
    },
    [commentsHook, confirmDelete, deleteConfirmationMessage, deleteConfirmationTitle]
  );

  // Pagination
  const { currentPage, totalCount, hasMore } = commentsHook.state;
  const hasNextPage = hasMore;
  const hasPrevPage = currentPage > 0;
  const showPagination = hasPrevPage || hasMore;

  const handleNextPage = React.useCallback(() => {
    commentsHook.loadPage(currentPage + 1);
  }, [commentsHook, currentPage]);

  const handlePrevPage = React.useCallback(() => {
    commentsHook.loadPage(currentPage - 1);
  }, [commentsHook, currentPage]);

  if (!isReady) {
    return (
      <div className={`spfx-comments ${className || ''}`}>
        <MessageBar messageBarType={MessageBarType.warning}>
          SPContext must be initialized before using Comments.
        </MessageBar>
      </div>
    );
  }

  const showSearch = enableSearch && commentsHook.state.totalCount > 0;
  const displayComments = showSearch ? searchHook.filteredComments : commentsHook.state.comments;
  const hasSearchQuery = showSearch && !!searchHook.query.trim();
  const emptyStateMessage = hasSearchQuery ? 'No matching comments found.' : 'No comments yet. Be the first to comment!';
  const shouldRenderEmptyState =
    !commentsHook.state.loading &&
    displayComments.length === 0 &&
    !(layout === 'timeline' && !hasSearchQuery && systemEvents.length > 0);

  const layoutProps = {
    comments: displayComments,
    loading: commentsHook.state.loading,
    enableDocumentPreview,
    currentUserEmail,
    highlightedCommentId: activeHighlightedCommentId,
    searchQuery: showSearch ? searchHook.query : '',
    enableCommentCollapse,
    collapsedMaxLines,
    onLike: commentsHook.likeComment,
    onUnlike: commentsHook.unlikeComment,
    onDelete: handleDelete,
  };

  return (
    <div className={`spfx-comments spfx-comments-${layout} ${className || ''}`}>
      {label && <div className="spfx-comments-label">{label}</div>}

      {/* Error */}
      {commentsHook.state.error && (
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={false}
          onDismiss={() => commentsHook.refresh()}
          dismissButtonAriaLabel="Retry"
        >
          Failed to load comments. Click to retry.
        </MessageBar>
      )}

      {/* Input FIRST (always on top) */}
      <CommentInput
        inputReturn={inputHook}
        preferredUsers={preferredUsers}
        linkSuggestions={linkSuggestions}
        onResolveMentions={onResolveMentions}
        onResolveLinkSuggestions={onResolveLinkSuggestions}
        onPost={handlePost}
        posting={commentsHook.state.posting}
        variant={layout}
      />

      {/* Search */}
      {showSearch && <CommentSearch searchReturn={searchHook} />}

      {shouldRenderEmptyState ? (
        <div className="spfx-comments-empty">{emptyStateMessage}</div>
      ) : (
        <>
          {layout === 'classic' && <ClassicLayout {...layoutProps} />}
          {layout === 'chat' && <ChatLayout {...layoutProps} />}
          {layout === 'compact' && <CompactLayout {...layoutProps} />}
          {layout === 'timeline' && (
            <TimelineLayout {...layoutProps} systemEvents={systemEvents} />
          )}
        </>
      )}

      {/* Pagination */}
      {!commentsHook.state.loading && commentsHook.state.comments.length > 0 && showPagination && (
        <div className="spfx-comments-pagination">
          <button
            className="spfx-comments-page-btn"
            onClick={handlePrevPage}
            disabled={!hasPrevPage}
          >
            &laquo; Prev
          </button>
          <span className="spfx-comments-page-info">
            Page {currentPage + 1}
            {showSearch && searchHook.query.trim() && (
              <> &middot; {searchHook.matchCount} of {searchHook.totalCount} loaded</>
            )}
          </span>
          <button
            className="spfx-comments-page-btn"
            onClick={handleNextPage}
            disabled={!hasNextPage}
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  );
};

Comments.displayName = 'Comments';
