import * as React from 'react';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import type { IUseCommentSearchReturn } from '../Comments.types';

export interface ICommentSearchProps {
  searchReturn: IUseCommentSearchReturn;
}

export const CommentSearch: React.FC<ICommentSearchProps> = React.memo((props) => {
  const { searchReturn } = props;
  const { query, setQuery, matchCount, totalCount, clearSearch } = searchReturn;

  const handleChange = React.useCallback(
    (_: any, newValue?: string) => {
      setQuery(newValue || '');
    },
    [setQuery]
  );

  const handleClear = React.useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  return (
    <div className="spfx-comments-search">
      <SearchBox
        placeholder="Search comments..."
        value={query}
        onChange={handleChange}
        onClear={handleClear}
        className="spfx-comments-search-box"
        underlined={false}
      />
      {query.trim() && (
        <div className="spfx-comments-search-count">
          {matchCount} of {totalCount} loaded comments
        </div>
      )}
    </div>
  );
});

CommentSearch.displayName = 'CommentSearch';
