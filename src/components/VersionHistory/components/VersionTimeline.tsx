import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';
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
    currentUserLogin,
    onClearFilters,
    onDownloadVersion,
    onCopyVersionLink,
    showMajorFilter,
    showCopyActions,
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

  const normalizedCurrentUser = React.useMemo(
    () => (currentUserLogin ? currentUserLogin.toLowerCase() : null),
    [currentUserLogin]
  );

  const currentUserOptionKey = React.useMemo(() => {
    if (!normalizedCurrentUser) return null;
    const match = userOptions.find(
      option => typeof option.key === 'string' && option.key.toLowerCase() === normalizedCurrentUser
    );
    return (match?.key as string) || null;
  }, [normalizedCurrentUser, userOptions]);

  const isMineActive =
    !!currentUserOptionKey &&
    (filterState.filterByUser || '').toLowerCase() === currentUserOptionKey.toLowerCase();

  const isRecentActive = filterState.filterDateRange === 'month';

  const quickFilters = React.useMemo(() => {
    const chips: Array<{
      key: string;
      label: string;
      active: boolean;
      disabled?: boolean;
      description?: string;
      onClick: () => void;
    }> = [];

    if (showMajorFilter) {
      chips.push({
        key: 'major',
        label: 'Major versions',
        active: filterState.showMajorOnly,
        description: 'Show only major versions',
        onClick: () => onFilterChange({ showMajorOnly: !filterState.showMajorOnly }),
      });
    }

    chips.push({
      key: 'mine',
      label: 'My edits',
      active: isMineActive,
      disabled: !currentUserOptionKey,
      description: 'Show versions you modified',
      onClick: () => {
        if (!currentUserOptionKey) {
          return;
        }
        onFilterChange({
          filterByUser: isMineActive ? null : currentUserOptionKey,
        });
      },
    });

    chips.push({
      key: 'recent',
      label: 'Last 30 days',
      active: isRecentActive,
      description: 'Show versions modified in the last 30 days',
      onClick: () =>
        onFilterChange({
          filterDateRange: isRecentActive ? 'all' : 'month',
          customDateStart: null,
          customDateEnd: null,
        }),
    });

    // Add "Updates only" filter to show only versions with actual changes
    chips.push({
      key: 'updates',
      label: 'Updates only',
      active: filterState.showUpdatesOnly,
      description: 'Show only versions with metadata or content changes',
      onClick: () => onFilterChange({ showUpdatesOnly: !filterState.showUpdatesOnly }),
    });

    return chips;
  }, [
    filterState.showMajorOnly,
    filterState.showUpdatesOnly,
    filterState.filterDateRange,
    isMineActive,
    isRecentActive,
    currentUserOptionKey,
    onFilterChange,
    showMajorFilter,
  ]);

  const dateRangeOptions: IDropdownOption[] = [
    { key: 'all', text: 'All time' },
    { key: 'today', text: 'Today' },
    { key: 'week', text: 'Last 7 days' },
    { key: 'month', text: 'Last 30 days' },
    { key: 'quarter', text: 'Last 90 days' },
    { key: 'year', text: 'Last year' },
    { key: 'custom', text: 'Custom range' },
  ];

  const activeFilterLabels = React.useMemo(() => {
    const labels: string[] = [];

    if (filterState.searchQuery) {
      labels.push(`Search: "${filterState.searchQuery}"`);
    }

    if (filterState.filterByUser) {
      const match = userOptions.find(option => option.key === filterState.filterByUser);
      labels.push(`Modified by ${match?.text || filterState.filterByUser}`);
    }

    switch (filterState.filterDateRange) {
      case 'today':
        labels.push('Today');
        break;
      case 'week':
        labels.push('Last 7 days');
        break;
      case 'month':
        labels.push('Last 30 days');
        break;
      case 'quarter':
        labels.push('Last 90 days');
        break;
      case 'year':
        labels.push('Last year');
        break;
      case 'custom':
        if (filterState.customDateStart || filterState.customDateEnd) {
          const start = filterState.customDateStart
            ? filterState.customDateStart.toLocaleDateString()
            : '...';
          const end = filterState.customDateEnd
            ? filterState.customDateEnd.toLocaleDateString()
            : '...';
          labels.push(`Custom range ${start} - ${end}`);
        } else {
          labels.push('Custom range');
        }
        break;
      default:
        break;
    }

    if (filterState.showMajorOnly && showMajorFilter) {
      labels.push('Major versions');
    }

    if (filterState.showUpdatesOnly) {
      labels.push('Updates only');
    }

    return labels;
  }, [filterState, userOptions, showMajorFilter]);

  return (
    <div className='version-timeline'>
      {/* Header */}
      <div className='version-timeline-header'>
        <Text className='version-timeline-title'>Versions</Text>
        <Text className='version-timeline-count'>
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </Text>
      </div>

      {/* Quick filters */}
      {quickFilters.length > 0 && (
        <div className='version-timeline-quick-filters'>
          {quickFilters.map(filter => (
            <button
              key={filter.key}
              className={`version-timeline-chip ${filter.active ? 'active' : ''} ${
                filter.disabled ? 'disabled' : ''
              }`}
              type='button'
              onClick={filter.onClick}
              disabled={filter.disabled || isLoading}
              aria-pressed={filter.active}
              title={filter.description}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

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

      {/* Active filter summary */}
      {activeFilterLabels.length > 0 && (
        <div className='version-timeline-active-summary'>
          <Icon iconName='Filter' className='version-timeline-active-icon' />
          <span className='version-timeline-active-text'>
            Filtering by {activeFilterLabels.join(' | ')}
          </span>
          <button
            className='version-timeline-clear-button'
            type='button'
            onClick={onClearFilters}
            disabled={isLoading}
          >
            Clear all
          </button>
        </div>
      )}

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
          {showMajorFilter && (
            <div className='version-timeline-filter'>
              <Checkbox
                label='Show major versions only'
                checked={filterState.showMajorOnly}
                onChange={handleMajorOnlyChange}
                disabled={isLoading}
              />
            </div>
          )}
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
              onDownloadVersion={onDownloadVersion}
              onCopyLink={showCopyActions ? onCopyVersionLink : undefined}
              showMajorBadge={showMajorFilter}
              showCopyActions={showCopyActions}
              itemType={props.itemType}
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
