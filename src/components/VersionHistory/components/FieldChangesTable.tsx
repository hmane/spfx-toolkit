import { Icon } from '@fluentui/react/lib/Icon';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import * as React from 'react';
import { IFieldChangesTableProps } from '../types';
import { FieldChangeRow } from './FieldChangeRow';

export const FieldChangesTable: React.FC<IFieldChangesTableProps> = props => {
  const { changes } = props;

  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredChanges = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return changes;
    }

    const query = searchQuery.toLowerCase().trim();
    return changes.filter(
      change =>
        change.displayName.toLowerCase().includes(query) ||
        change.previousValueFormatted.toLowerCase().includes(query) ||
        change.newValueFormatted.toLowerCase().includes(query)
    );
  }, [changes, searchQuery]);

  const handleSearchChange = React.useCallback((newValue?: string) => {
    setSearchQuery(newValue || '');
  }, []);

  const handleClearSearch = React.useCallback(() => {
    setSearchQuery('');
  }, []);

  if (changes.length === 0) {
    return (
      <div className='field-changes-empty' role='status'>
        <div className='vh-empty'>
          <div className='vh-empty-icon' aria-hidden='true'>
            <Icon iconName='CheckMark' />
          </div>
          <div className='vh-empty-title'>No field changes</div>
          <div className='vh-empty-hint'>
            This version was saved without modifying any tracked metadata fields.
          </div>
        </div>
      </div>
    );
  }

  // Only show in-pane search when there are enough changes that scanning becomes work.
  const showSearch = changes.length > 8;

  return (
    <>
      {showSearch && (
        <div className='version-details-search'>
          <SearchBox
            placeholder='Search changes'
            value={searchQuery}
            onChange={(_, newValue) => handleSearchChange(newValue)}
            onClear={handleClearSearch}
            underlined={false}
          />
        </div>
      )}

      <div className='field-changes-list'>
        {filteredChanges.length > 0 ? (
          filteredChanges.map((change, index) => (
            <FieldChangeRow key={`${change.internalName}-${index}`} change={change} />
          ))
        ) : (
          <div className='field-changes-no-results' role='status' aria-live='polite'>
            <div className='vh-empty'>
              <div className='vh-empty-icon' aria-hidden='true'>
                <Icon iconName='Search' />
              </div>
              <div className='vh-empty-title'>No matching changes</div>
              <div className='vh-empty-hint'>
                Nothing matches &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try a different
                term or clear the filter.
              </div>
              <button
                type='button'
                className='vh-empty-action'
                onClick={handleClearSearch}
              >
                <Icon iconName='ClearFilter' />
                Clear search
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
