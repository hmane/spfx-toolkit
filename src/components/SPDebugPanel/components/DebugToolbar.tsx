/**
 * Toolbar above the entry list. Search + lightweight filters.
 *
 * Filters are exposed as `Dropdown` multi-selects so they read clearly with a
 * keyboard. Search is a `SearchBox`.
 */

import * as React from 'react';
import { DefaultButton, IconButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Stack } from '@fluentui/react/lib/Stack';
import { Toggle } from '@fluentui/react/lib/Toggle';
import {
  KNOWN_AREAS,
  PanelFilters,
  emptyFilters,
} from '../panelLogic';
import type { SPDebugEntryType, SPDebugLevel } from '../../../utilities/debug/SPDebugTypes';

const LEVELS: SPDebugLevel[] = ['debug', 'info', 'warn', 'error', 'success'];
const TYPES: SPDebugEntryType[] = [
  'log',
  'event',
  'json',
  'table',
  'timer',
  'workflow',
  'metric',
  'error',
];

export interface DebugToolbarProps {
  filters: PanelFilters;
  onFiltersChange: (filters: PanelFilters) => void;
  entryCount: number;
  filteredCount: number;
}

function useDropdownOptions<T extends string>(values: ReadonlyArray<T>): IDropdownOption[] {
  return React.useMemo(
    () => values.map((v) => ({ key: v, text: v })),
    [values]
  );
}

export const DebugToolbar: React.FC<DebugToolbarProps> = (props) => {
  const {
    filters,
    onFiltersChange,
  } = props;
  const [showFilters, setShowFilters] = React.useState(false);

  const levelOptions = useDropdownOptions(LEVELS);
  const typeOptions = useDropdownOptions(TYPES);
  const areaOptions = useDropdownOptions(KNOWN_AREAS);

  const updateMulti = (
    field: 'levels' | 'types' | 'areas',
    keys: ReadonlyArray<string>
  ): void => {
    onFiltersChange({ ...filters, [field]: keys } as PanelFilters);
  };

  return (
    <div className="spdebug-toolbar">
      <div className="spdebug-toolbar-main">
        <SearchBox
          placeholder="Search logs, source, payload"
          value={filters.search}
          onChange={(_, v) => onFiltersChange({ ...filters, search: v || '' })}
          ariaLabel="Search debug entries"
          styles={{ root: { flex: '1 1 auto', minWidth: 0 } }}
        />
        <IconButton
          iconProps={{ iconName: 'Filter' }}
          title={showFilters ? 'Hide filters' : 'Show filters'}
          ariaLabel={showFilters ? 'Hide filters' : 'Show filters'}
          checked={showFilters}
          onClick={() => setShowFilters((v) => !v)}
        />
      </div>
      {showFilters && (
        <Stack
          horizontal
          wrap
          verticalAlign="center"
          tokens={{ childrenGap: 8 }}
          className="spdebug-filter-row"
        >
          <Dropdown
            placeholder="Level"
            ariaLabel="Filter by level"
            multiSelect
            selectedKeys={filters.levels as string[]}
            options={levelOptions}
            onChange={(_, opt) => {
              if (!opt) return;
              const next = opt.selected
                ? [...filters.levels, opt.key as SPDebugLevel]
                : filters.levels.filter((l) => l !== opt.key);
              updateMulti('levels', next);
            }}
            styles={{ root: { width: 130 } }}
          />
          <Dropdown
            placeholder="Type"
            ariaLabel="Filter by type"
            multiSelect
            selectedKeys={filters.types as string[]}
            options={typeOptions}
            onChange={(_, opt) => {
              if (!opt) return;
              const next = opt.selected
                ? [...filters.types, opt.key as SPDebugEntryType]
                : filters.types.filter((t) => t !== opt.key);
              updateMulti('types', next);
            }}
            styles={{ root: { width: 130 } }}
          />
          <Dropdown
            placeholder="Area"
            ariaLabel="Filter by area"
            multiSelect
            selectedKeys={filters.areas as string[]}
            options={areaOptions}
            onChange={(_, opt) => {
              if (!opt) return;
              const next = opt.selected
                ? [...filters.areas, opt.key as string]
                : filters.areas.filter((a) => a !== opt.key);
              updateMulti('areas', next);
            }}
            styles={{ root: { width: 130 } }}
          />
          <Toggle
            label="Errors only"
            inlineLabel
            checked={filters.errorsOnly}
            onChange={(_, v) => onFiltersChange({ ...filters, errorsOnly: !!v })}
            styles={{ root: { marginBottom: 0 } }}
          />
          <DefaultButton
            text="Reset filters"
            ariaLabel="Reset all filters"
            onClick={() => onFiltersChange(emptyFilters())}
          />
        </Stack>
      )}
    </div>
  );
};
