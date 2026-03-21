/**
 * Comments Component
 *
 * A customizable comments component for SharePoint list items.
 * Supports @mentions, #links, search, and multiple layout variants.
 */

import * as React from 'react';
import { SPContext } from '../../utilities/context';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import type { ICommentsProps } from './Comments.types';
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
    label,
    onCommentAdded,
    onCommentDeleted,
    onCommentLiked,
    onMentioned,
    onLinkAdded,
    onError,
    className,
    systemEvents = [],
  } = props;

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

  // Core CRUD hook
  const commentsHook = useComments({
    listId,
    itemId,
    pageSize: numberCommentsPerPage,
    sortOrder,
    onCommentAdded,
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

  const displayComments = enableSearch ? searchHook.filteredComments : commentsHook.state.comments;

  const layoutProps = {
    comments: displayComments,
    loading: commentsHook.state.loading,
    enableDocumentPreview,
    currentUserEmail,
    highlightedCommentId,
    onLike: commentsHook.likeComment,
    onUnlike: commentsHook.unlikeComment,
    onDelete: commentsHook.deleteComment,
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
      {enableSearch && <CommentSearch searchReturn={searchHook} />}

      {/* Layout-specific rendering */}
      {layout === 'classic' && <ClassicLayout {...layoutProps} />}
      {layout === 'chat' && <ChatLayout {...layoutProps} />}
      {layout === 'compact' && <CompactLayout {...layoutProps} />}
      {layout === 'timeline' && (
        <TimelineLayout {...layoutProps} systemEvents={systemEvents} />
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
            {enableSearch && searchHook.query.trim() && (
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
