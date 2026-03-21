/**
 * useCommentSearch Hook
 *
 * Client-side search filtering across loaded/paginated comments.
 * Matches against comment text, author.title, mentions[].title, links[].name.
 */

import * as React from 'react';
import type { IComment, IUseCommentSearchReturn } from '../Comments.types';

interface UseCommentSearchOptions {
  comments: IComment[];
  enabled: boolean;
}

export function useCommentSearch(options: UseCommentSearchOptions): IUseCommentSearchReturn {
  const { comments, enabled } = options;
  const [query, setQuery] = React.useState('');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  const [debouncedQuery, setDebouncedQuery] = React.useState('');

  // Debounce the search query (200ms)
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const filteredComments = React.useMemo(() => {
    if (!enabled || !debouncedQuery.trim()) {
      return comments;
    }

    const lowerQuery = debouncedQuery.toLowerCase().trim();

    return comments.filter((comment) => {
      // Search in decoded comment text
      const textMatch = comment.text.toLowerCase().includes(lowerQuery);
      if (textMatch) return true;

      // Search in author name
      const authorMatch = (comment.author.title || '').toLowerCase().includes(lowerQuery);
      if (authorMatch) return true;

      // Search in mentioned user names
      const mentionMatch = comment.mentions.some(
        (m) => (m.title || '').toLowerCase().includes(lowerQuery) ||
               (m.email || '').toLowerCase().includes(lowerQuery)
      );
      if (mentionMatch) return true;

      // Search in link names
      const linkMatch = comment.links.some(
        (l) => l.name.toLowerCase().includes(lowerQuery)
      );
      if (linkMatch) return true;

      return false;
    });
  }, [comments, debouncedQuery, enabled]);

  const clearSearch = React.useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    setQuery,
    filteredComments,
    matchCount: filteredComments.length,
    totalCount: comments.length,
    clearSearch,
  };
}
