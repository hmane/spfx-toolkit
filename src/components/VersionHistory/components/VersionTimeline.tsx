import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
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
      option =>
        typeof option.key === 'string' && option.key.toLowerCase() === normalizedCurrentUser
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
        label: 'Major',
        active: filterState.showMajorOnly,
        description: 'Show only major versions',
        onClick: () => onFilterChange({ showMajorOnly: !filterState.showMajorOnly }),
      });
    }

    chips.push({
      key: 'mine',
      label: 'Mine',
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

    chips.push({
      key: 'updates',
      label: 'Has changes',
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

  // Count of filters that aren't surfaced as quick chips — drives the badge on the
  // filter trigger so users know advanced filters are active.
  const advancedActiveCount = React.useMemo(() => {
    let count = 0;
    if (filterState.filterByUser && !isMineActive) count += 1;
    if (
      filterState.filterDateRange &&
      filterState.filterDateRange !== 'all' &&
      filterState.filterDateRange !== 'month'
    ) {
      count += 1;
    }
    return count;
  }, [filterState.filterByUser, filterState.filterDateRange, isMineActive]);

  const activeFilterLabels = React.useMemo(() => {
    const labels: string[] = [];

    if (filterState.searchQuery) {
      labels.push(`"${filterState.searchQuery}"`);
    }

    if (filterState.filterByUser) {
      const match = userOptions.find(option => option.key === filterState.filterByUser);
      labels.push(match?.text || filterState.filterByUser);
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
          labels.push(`${start} – ${end}`);
        } else {
          labels.push('Custom range');
        }
        break;
      default:
        break;
    }

    if (filterState.showMajorOnly && showMajorFilter) {
      labels.push('Major only');
    }

    if (filterState.showUpdatesOnly) {
      labels.push('With changes');
    }

    return labels;
  }, [filterState, userOptions, showMajorFilter]);

  const groupedVersions = React.useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups = versions.reduce<Record<string, typeof versions>>((acc, version) => {
      const modified = version.modified;
      let key = 'earlier';

      if (modified >= startOfToday) {
        key = 'today';
      } else if (modified >= startOfWeek) {
        key = 'week';
      } else if (modified >= startOfMonth) {
        key = 'month';
      }

      acc[key] = [...(acc[key] || []), version];
      return acc;
    }, {});

    const sections = [
      { key: 'today', label: 'Today' },
      { key: 'week', label: 'Last 7 days' },
      { key: 'month', label: 'Last 30 days' },
      { key: 'earlier', label: 'Earlier' },
    ];

    return sections
      .map(section => ({
        ...section,
        versions: groups[section.key] || [],
      }))
      .filter(section => section.versions.length > 0);
  }, [versions]);

  return (
    <div className='version-timeline'>
      {/* Search + filter trigger + quick chips, all in one toolbar */}
      <div className='version-timeline-toolbar'>
        <div className='version-timeline-toolbar-row'>
          <div className='version-timeline-search'>
            <SearchBox
              placeholder='Search versions'
              value={filterState.searchQuery}
              onChange={(_, newValue) => handleSearchChange(newValue)}
              onClear={handleClearSearch}
              disabled={isLoading}
              underlined={false}
            />
          </div>
          <button
            type='button'
            className={`version-timeline-filter-trigger ${filtersExpanded ? 'is-active' : ''}`}
            onClick={onToggleFilters}
            aria-expanded={filtersExpanded}
            aria-label={filtersExpanded ? 'Hide advanced filters' : 'Show advanced filters'}
            title={filtersExpanded ? 'Hide advanced filters' : 'Advanced filters'}
            disabled={isLoading}
          >
            <Icon iconName='Filter' />
            {advancedActiveCount > 0 && (
              <span className='version-timeline-filter-trigger-badge'>{advancedActiveCount}</span>
            )}
          </button>
        </div>

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
      </div>

      {/* Inline active-filters note (subtle, single line, no banner) */}
      {activeFilterLabels.length > 0 && (
        <div className='version-timeline-active-banner'>
          <span className='version-timeline-active-text'>
            {versions.length} match{versions.length === 1 ? '' : 'es'} ·{' '}
            {activeFilterLabels.join(' · ')}
          </span>
          <button
            className='version-timeline-clear-button'
            type='button'
            onClick={onClearFilters}
            disabled={isLoading}
          >
            Clear
          </button>
        </div>
      )}

      {/* Advanced filters popover */}
      {filtersExpanded && (
        <div className='version-timeline-filters'>
          <div className='version-timeline-filter'>
            <Dropdown
              label='Modified by'
              options={userOptions}
              selectedKey={filterState.filterByUser || ''}
              onChange={handleUserFilterChange}
              disabled={isLoading}
              placeholder='Anyone'
            />
          </div>

          <div className='version-timeline-filter'>
            <Dropdown
              label='Date range'
              options={dateRangeOptions}
              selectedKey={filterState.filterDateRange}
              onChange={handleDateRangeChange}
              disabled={isLoading}
            />
          </div>

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

      {/* Loading */}
      {isLoading && (
        <div className='version-timeline-loading'>
          <Spinner size={SpinnerSize.large} label='Loading versions...' />
        </div>
      )}

      {/* List */}
      {!isLoading && versions.length > 0 && (
        <div className='version-timeline-list'>
          {groupedVersions.map(section => (
            <div key={section.key} className='version-timeline-section'>
              {groupedVersions.length > 1 && (
                <div className='version-timeline-section-heading'>{section.label}</div>
              )}
              {section.versions.map((version, index) => (
                <VersionCard
                  key={`${section.key}-${version.versionLabel}-${index}`}
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
          ))}
        </div>
      )}

      {!isLoading && versions.length === 0 && (
        <div className='version-timeline-no-results' role='status' aria-live='polite'>
          <div className='vh-empty'>
            <div className='vh-empty-icon' aria-hidden='true'>
              <Icon iconName='Filter' />
            </div>
            <div className='vh-empty-title'>No versions to show</div>
            <div className='vh-empty-hint'>
              {activeFilterLabels.length > 0
                ? 'No versions match the current filters. Try widening the date range or clearing filters.'
                : 'There are no versions yet for this item.'}
            </div>
            {activeFilterLabels.length > 0 && (
              <button type='button' className='vh-empty-action' onClick={onClearFilters}>
                <Icon iconName='ClearFilter' />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
