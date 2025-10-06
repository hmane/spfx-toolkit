import { MessageBar, MessageBarType, SearchBox, Text } from '@fluentui/react';
import * as React from 'react';
import { IFieldChangesTableProps } from '../types';
import { FieldChangeRow } from './FieldChangeRow';

export const FieldChangesTable: React.FC<IFieldChangesTableProps> = props => {
  const { changes, itemInfo } = props;

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
      <div className='field-changes-empty'>
        <MessageBar messageBarType={MessageBarType.info}>
          <Text>No field changes detected in this version.</Text>
        </MessageBar>
      </div>
    );
  }

  return (
    <div className='field-changes-table'>
      {/* Header with search */}
      <div className='field-changes-header'>
        <div className='field-changes-title'>
          {changes.length} field{changes.length !== 1 ? 's' : ''} changed
        </div>
        {changes.length > 5 && (
          <div className='field-changes-search'>
            <SearchBox
              placeholder='Search changes...'
              value={searchQuery}
              onChange={(_, newValue) => handleSearchChange(newValue)}
              onClear={handleClearSearch}
            />
          </div>
        )}
      </div>

      {/* Table header row */}
      <div className='field-changes-table-header'>
        <div className='field-changes-header-cell'>Field Name</div>
        <div className='field-changes-header-cell'>Previous → New</div>
        <div className='field-changes-header-cell' />
      </div>

      {/* Table body */}
      <div className='field-changes-table-body'>
        {filteredChanges.length > 0 ? (
          filteredChanges.map((change, index) => (
            <FieldChangeRow key={`${change.internalName}-${index}`} change={change} />
          ))
        ) : (
          <div className='field-changes-no-results'>
            <MessageBar messageBarType={MessageBarType.warning}>
              No changes match your search query &quot;{searchQuery}&quot;
            </MessageBar>
          </div>
        )}
      </div>
    </div>
  );
};
