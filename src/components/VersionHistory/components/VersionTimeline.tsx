import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Text } from '@fluentui/react/lib/Text';
import * as React from 'react';
import { DateRangeFilter, IVersionTimelineProps } from '../types';
import { getUniqueUsers } from '../VersionHistoryUtils';
import { VersionCard } from './VersionCard';

export const VersionTimeline: React.FC<IVersionTimelineProps> = props => {
  const {
    versions,
    selectedVersion,
    onSelectVersion,
    isLoading,
    filterState,
    onFilterChange,
    filtersExpanded,
    onToggleFilters,
  } = props;

  const handleSearchChange = React.useCallback(
    (newValue?: string) => {
      onFilterChange({ searchQuery: newValue || '' });
    },
    [onFilterChange]
  );

  const handleClearSearch = React.useCallback(() => {
    onFilterChange({ searchQuery: '' });
  }, [onFilterChange]);

  const handleUserFilterChange = React.useCallback(
    (_: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
      onFilterChange({ filterByUser: option ? (option.key as string) : null });
    },
    [onFilterChange]
  );

  const handleDateRangeChange = React.useCallback(
    (_: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
      onFilterChange({ filterDateRange: (option?.key as DateRangeFilter) || 'all' });
    },
    [onFilterChange]
  );

  const handleMajorOnlyChange = React.useCallback(
    (_?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
      onFilterChange({ showMajorOnly: checked || false });
    },
    [onFilterChange]
  );

  const handleCustomDateStartChange = React.useCallback(
    (date: Date | null | undefined) => {
      onFilterChange({ customDateStart: date || null });
    },
    [onFilterChange]
  );

  const handleCustomDateEndChange = React.useCallback(
    (date: Date | null | undefined) => {
      onFilterChange({ customDateEnd: date || null });
    },
    [onFilterChange]
  );

  const userOptions = React.useMemo(() => {
    const users = getUniqueUsers(versions);
    return [{ key: '', text: 'All users' }, ...users];
  }, [versions]);

  const dateRangeOptions: IDropdownOption[] = [
    { key: 'all', text: 'All time' },
    { key: 'today', text: 'Today' },
    { key: 'week', text: 'Last 7 days' },
    { key: 'month', text: 'Last 30 days' },
    { key: 'quarter', text: 'Last 90 days' },
    { key: 'year', text: 'Last year' },
    { key: 'custom', text: 'Custom range' },
  ];

  return (
    <div className='version-timeline'>
      {/* Header */}
      <div className='version-timeline-header'>
        <Text className='version-timeline-title'>Versions</Text>
        <Text className='version-timeline-count'>
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </Text>
      </div>

      {/* Search */}
      <div className='version-timeline-search'>
        <SearchBox
          placeholder='Search...'
          value={filterState.searchQuery}
          onChange={(_, newValue) => handleSearchChange(newValue)}
          onClear={handleClearSearch}
          disabled={isLoading}
        />
      </div>

      {/* Filter toggle */}
      <div className='version-timeline-filter-toggle'>
        <DefaultButton
          text={filtersExpanded ? 'Hide Filters' : 'Show Filters'}
          iconProps={{ iconName: filtersExpanded ? 'ChevronUp' : 'ChevronDown' }}
          onClick={onToggleFilters}
          disabled={isLoading}
          className='version-timeline-filter-button'
        />
      </div>

      {/* Filters panel */}
      {filtersExpanded && (
        <div className='version-timeline-filters'>
          {/* Modified by filter */}
          <div className='version-timeline-filter'>
            <Dropdown
              label='Modified by'
              options={userOptions}
              selectedKey={filterState.filterByUser || ''}
              onChange={handleUserFilterChange}
              disabled={isLoading}
              placeholder='Select user'
            />
          </div>

          {/* Date range filter */}
          <div className='version-timeline-filter'>
            <Dropdown
              label='Date range'
              options={dateRangeOptions}
              selectedKey={filterState.filterDateRange}
              onChange={handleDateRangeChange}
              disabled={isLoading}
            />
          </div>

          {/* Custom date range */}
          {filterState.filterDateRange === 'custom' && (
            <div className='version-timeline-custom-dates'>
              <div className='version-timeline-filter'>
                <DatePicker
                  label='Start date'
                  value={filterState.customDateStart || undefined}
                  onSelectDate={handleCustomDateStartChange}
                  disabled={isLoading}
                  placeholder='Select start date'
                />
              </div>
              <div className='version-timeline-filter'>
                <DatePicker
                  label='End date'
                  value={filterState.customDateEnd || undefined}
                  onSelectDate={handleCustomDateEndChange}
                  disabled={isLoading}
                  placeholder='Select end date'
                  minDate={filterState.customDateStart || undefined}
                />
              </div>
            </div>
          )}

          {/* Major versions only */}
          <div className='version-timeline-filter'>
            <Checkbox
              label='Show major versions only'
              checked={filterState.showMajorOnly}
              onChange={handleMajorOnlyChange}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className='version-timeline-loading'>
          <Spinner size={SpinnerSize.large} label='Loading versions...' />
        </div>
      )}

      {/* Version list */}
      {!isLoading && versions.length > 0 && (
        <div className='version-timeline-list'>
          {versions.map((version, index) => (
            <VersionCard
              key={`${version.versionLabel}-${index}`}
              version={version}
              isSelected={selectedVersion?.versionLabel === version.versionLabel}
              onClick={() => onSelectVersion(version)}
            />
          ))}
        </div>
      )}

      {/* No results */}
      {!isLoading && versions.length === 0 && (
        <div className='version-timeline-no-results'>
          <MessageBar messageBarType={MessageBarType.warning}>
            <Text>No versions found matching your filters.</Text>
          </MessageBar>
        </div>
      )}
    </div>
  );
};
