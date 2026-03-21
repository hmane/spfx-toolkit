/**
 * useComments Hook
 *
 * Core CRUD hook for SharePoint list item comments.
 * Handles load (paginated), add, delete, like/unlike via SPContext.sp.
 */

import * as React from 'react';
import { SPHttpClient } from '@microsoft/sp-http';
import { SPContext } from '../../../utilities/context';
import type { IPrincipal } from '../../../types/listItemTypes';
import type { IComment, ICommentLink, ICommentsState, IUseCommentsReturn } from '../Comments.types';
import { mapSPCommentToIComment } from '../utils/commentParser';
import { formatCommentForApi } from '../utils/commentFormatter';

interface UseCommentsOptions {
  listId: string;
  itemId: number;
  pageSize: number;
  sortOrder: 'newest' | 'oldest';
  onCommentAdded?: (comment: IComment) => void;
  onCommentDeleted?: (commentId: number) => void;
  onCommentLiked?: (commentId: number, isLiked: boolean) => void;
  onError?: (error: Error) => void;
}

export function useComments(options: UseCommentsOptions): IUseCommentsReturn {
  const { listId, itemId, pageSize, sortOrder, onCommentAdded, onCommentDeleted, onCommentLiked, onError } = options;

  const [state, setState] = React.useState<ICommentsState>({
    comments: [],
    loading: true,
    error: null,
    totalCount: 0,
    currentPage: 0,
    posting: false,
    hasMore: false,
  });

  const mountedRef = React.useRef(true);
  const optimisticCommentsRef = React.useRef<IComment[]>([]);

  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getCommentsEndpoint = React.useCallback(() => {
    if (!SPContext.isReady()) {
      throw new Error('SPContext must be initialized before using Comments');
    }
    return SPContext.sp.web.lists.getById(listId).items.getById(itemId);
  }, [listId, itemId]);

  const loadCommentsResponse = React.useCallback(
    async (page: number): Promise<any[]> => {
      const spfxContext = SPContext.spfxContext as any;
      const spHttpClient = spfxContext?.spHttpClient;
      const webUrl = SPContext.webAbsoluteUrl || spfxContext?.pageContext?.web?.absoluteUrl;
      const endpoint = getCommentsEndpoint();
      const fallbackLoad = async (): Promise<any[]> => {
        const fallbackResponse: any = await (endpoint as any).comments.top(pageSize + 1).skip(page * pageSize)();
        return Array.isArray(fallbackResponse) ? fallbackResponse : fallbackResponse?.value || [];
      };

      if (!spHttpClient || !webUrl) {
        return fallbackLoad();
      }

      try {
        const skip = page * pageSize;
        const requestUrl =
          `${webUrl}/_api/web/lists(@a1)/GetItemById(@a2)/GetComments()` +
          `?@a1='${listId}'&@a2='${itemId}'&$top=${pageSize + 1}&$skip=${skip}&$expand=likedBy`;

        const response = await spHttpClient.fetch(requestUrl, SPHttpClient.configurations.v1, {
          method: 'GET',
          headers: {
            Accept: 'application/json;odata=nometadata',
          },
        });
        const json = await response.json();
        if (!response.ok || json?.error) {
          throw new Error(json?.error?.message || 'Failed to load comments from GetComments');
        }
        const items = Array.isArray(json) ? json : json?.value || json?.d?.results || [];
        return Array.isArray(items) ? items : [];
      } catch {
        return fallbackLoad();
      }
    },
    [getCommentsEndpoint, itemId, listId, pageSize]
  );

  const loadComments = React.useCallback(
    async (page: number) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await loadCommentsResponse(page);

        if (!mountedRef.current) return;

        const allFetched: IComment[] = (response || []).map(mapSPCommentToIComment);
        const hasMore = allFetched.length > pageSize;
        const comments = hasMore ? allFetched.slice(0, pageSize) : allFetched;

        // Sort client-side
        comments.sort((a, b) => {
          const diff = a.createdDate.getTime() - b.createdDate.getTime();
          return sortOrder === 'newest' ? -diff : diff;
        });

        const fetchedIds = new Set(comments.map((c) => c.id));
        const remainingOptimistic = optimisticCommentsRef.current.filter((c) => !fetchedIds.has(c.id));
        optimisticCommentsRef.current = remainingOptimistic;
        const mergedComments = mergeCommentsForPage(comments, remainingOptimistic, pageSize, sortOrder);

        setState((prev) => ({
          ...prev,
          comments: mergedComments,
          loading: false,
          currentPage: page,
          totalCount: (page * pageSize) + comments.length + remainingOptimistic.length + (hasMore ? 1 : 0),
          hasMore,
        }));
      } catch (error: any) {
        if (!mountedRef.current) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({ ...prev, loading: false, error: err }));
        onError?.(err);
        SPContext.isReady() && SPContext.logger.error('Comments: Failed to load', error);
      }
    },
    [loadCommentsResponse, pageSize, sortOrder, onError]
  );

  // Initial load
  React.useEffect(() => {
    loadComments(0);
  }, [loadComments]);

  const addComment = React.useCallback(
    async (text: string, mentions: IPrincipal[], links: ICommentLink[]) => {
      try {
        setState((prev) => ({ ...prev, posting: true }));

        const formatted = formatCommentForApi(text, mentions, links);
        const endpoint = getCommentsEndpoint();

        const response: any = await (endpoint as any).comments.add({
          text: formatted.text,
          mentions: formatted.mentions,
        });

        if (!mountedRef.current) return;

        const mappedComment = mapSPCommentToIComment(response);
        const newComment: IComment = {
          ...mappedComment,
          text: response?.text || formatted.text,
          // The create response can omit expanded mentions/links even though the load API returns them.
          // Fall back to the submitted values so the optimistic render matches what the user just posted.
          mentions: mappedComment.mentions.length > 0 ? mappedComment.mentions : mentions,
          links: mappedComment.links.length > 0 ? mappedComment.links : links,
        };
        optimisticCommentsRef.current = [newComment, ...optimisticCommentsRef.current.filter((c) => c.id !== newComment.id)];
        setState((prev) => {
          const nextPageComments = sortOrder === 'newest'
            ? [newComment, ...prev.comments.filter((c) => c.id !== newComment.id)]
            : [...prev.comments.filter((c) => c.id !== newComment.id), newComment];

          return {
            ...prev,
            posting: false,
            comments: nextPageComments.slice(0, pageSize),
            totalCount: prev.totalCount + 1,
          };
        });

        onCommentAdded?.(newComment);
        SPContext.isReady() && SPContext.logger.info('Comments: Comment added', { id: newComment.id });
        window.setTimeout(() => {
          if (mountedRef.current) {
            void loadComments(0);
          }
        }, 1200);
      } catch (error: any) {
        if (!mountedRef.current) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({ ...prev, posting: false }));
        onError?.(err);
        SPContext.isReady() && SPContext.logger.error('Comments: Failed to add', error);
        throw err; // Re-throw so input can keep the draft
      }
    },
    [getCommentsEndpoint, sortOrder, onCommentAdded, onError, loadComments]
  );

  const deleteComment = React.useCallback(
    async (commentId: number) => {
      try {
        const endpoint = getCommentsEndpoint();
        await (endpoint as any).comments.getById(commentId).delete();

        if (!mountedRef.current) return;

        setState((prev) => ({
          ...prev,
          comments: prev.comments.filter((c) => c.id !== commentId),
          totalCount: Math.max(0, prev.totalCount - 1),
        }));

        onCommentDeleted?.(commentId);
        SPContext.isReady() && SPContext.logger.info('Comments: Comment deleted', { id: commentId });
      } catch (error: any) {
        if (!mountedRef.current) return;
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        SPContext.isReady() && SPContext.logger.error('Comments: Failed to delete', error);
      }
    },
    [getCommentsEndpoint, onCommentDeleted, onError]
  );

  const likeComment = React.useCallback(
    async (commentId: number) => {
      try {
        const endpoint = getCommentsEndpoint();
        await (endpoint as any).comments.getById(commentId).like();

        if (!mountedRef.current) return;

        setState((prev) => ({
          ...prev,
          comments: prev.comments.map((c) =>
            c.id === commentId ? { ...c, isLiked: true, likeCount: c.likeCount + 1 } : c
          ),
        }));

        onCommentLiked?.(commentId, true);
      } catch (error: any) {
        if (!mountedRef.current) return;
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [getCommentsEndpoint, onCommentLiked, onError]
  );

  const unlikeComment = React.useCallback(
    async (commentId: number) => {
      try {
        const endpoint = getCommentsEndpoint();
        await (endpoint as any).comments.getById(commentId).unlike();

        if (!mountedRef.current) return;

        setState((prev) => ({
          ...prev,
          comments: prev.comments.map((c) =>
            c.id === commentId ? { ...c, isLiked: false, likeCount: Math.max(0, c.likeCount - 1) } : c
          ),
        }));

        onCommentLiked?.(commentId, false);
      } catch (error: any) {
        if (!mountedRef.current) return;
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [getCommentsEndpoint, onCommentLiked, onError]
  );

  const loadPage = React.useCallback(
    async (page: number) => {
      await loadComments(page);
    },
    [loadComments]
  );

  const refresh = React.useCallback(async () => {
    await loadComments(state.currentPage);
  }, [loadComments, state.currentPage]);

  return {
    state,
    addComment,
    deleteComment,
    likeComment,
    unlikeComment,
    loadPage,
    refresh,
  };
}

function mergeCommentsForPage(
  comments: IComment[],
  optimisticComments: IComment[],
  pageSize: number,
  sortOrder: 'newest' | 'oldest'
): IComment[] {
  const merged = sortOrder === 'newest'
    ? [...optimisticComments, ...comments]
    : [...comments, ...optimisticComments];

  const unique: IComment[] = [];
  const seen = new Set<number>();

  for (const comment of merged) {
    if (seen.has(comment.id)) continue;
    seen.add(comment.id);
    unique.push(comment);
  }

  return unique.slice(0, pageSize);
}
