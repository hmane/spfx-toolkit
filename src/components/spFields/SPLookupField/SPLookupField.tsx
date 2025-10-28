/**
 * SPLookupField - Enhanced SharePoint Lookup Field Component
 *
 * A smart lookup field component with automatic threshold-based mode switching.
 * Supports dropdown mode for small lists and searchable mode for large lists.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { Controller, RegisterOptions } from 'react-hook-form';
import { SelectBox } from 'devextreme-react/select-box';
import { TagBox } from 'devextreme-react/tag-box';
import ArrayStore from 'devextreme/data/array_store';
import { Stack } from '@fluentui/react/lib/Stack';
import { Label } from '@fluentui/react/lib/Label';
import { Text } from '@fluentui/react/lib/Text';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { ISPLookupFieldProps, SPLookupDisplayMode } from './SPLookupField.types';
import { ISPLookupFieldValue } from '../types';
import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { ListItemPicker } from '@pnp/spfx-controls-react/lib/ListItemPicker';

/**
 * Enhanced SPLookupField component with smart threshold-based mode switching
 *
 * @example
 * ```tsx
 * // Auto mode - switches to autocomplete if > 100 items
 * <SPLookupField
 *   name="category"
 *   label="Category"
 *   control={control}
 *   dataSource={{
 *     listNameOrId: 'Categories',
 *     displayField: 'Title'
 *   }}
 * />
 *
 * // Force SelectBox mode (for small lists - loads all items)
 * <SPLookupField
 *   name="status"
 *   label="Status"
 *   control={control}
 *   displayMode={SPLookupDisplayMode.SelectBox} // or use .Dropdown
 *   dataSource={{
 *     listNameOrId: 'StatusList'
 *   }}
 * />
 *
 * // Force Autocomplete mode (for large lists - async search)
 * <SPLookupField
 *   name="product"
 *   label="Product"
 *   control={control}
 *   displayMode={SPLookupDisplayMode.Autocomplete} // or use .Searchable
 *   dataSource={{
 *     listNameOrId: 'Products',
 *     searchFields: ['Title', 'ProductCode']
 *   }}
 * />
 *
 * // Multi-select with SelectBox (for small lists)
 * <SPLookupField
 *   name="categories"
 *   label="Categories"
 *   control={control}
 *   allowMultiple
 *   displayMode={SPLookupDisplayMode.SelectBox}
 *   dataSource={{
 *     listNameOrId: 'Categories'
 *   }}
 * />
 * ```
 */
export const SPLookupField: React.FC<ISPLookupFieldProps> = (props) => {
  const {
    // Base props
    label,
    description,
    required = false,
    disabled = false,
    readOnly = false,
    placeholder,
    errorMessage,
    className,
    width,

    // Form props
    name,
    control,
    rules,

    // Standalone props
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,

    // Lookup field specific props
    dataSource,
    allowMultiple = false,
    displayMode = SPLookupDisplayMode.Auto,
    searchableThreshold = 100,
    showSearchBox = true,
    searchDelay = 300,
    minSearchLength = 2,
    pageSize = 50,
    maxDisplayedTags = 3,
    showClearButton = true,
    useCache = true,
    itemTemplate,
    dependsOn,
    stylingMode = 'outlined',
    onItemCountDetermined,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<ISPLookupFieldValue | ISPLookupFieldValue[]>(
    defaultValue || (allowMultiple ? [] : null as any)
  );
  const [lookupItems, setLookupItems] = React.useState<ISPLookupFieldValue[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [itemCount, setItemCount] = React.useState<number>(0);
  const [actualDisplayMode, setActualDisplayMode] = React.useState<SPLookupDisplayMode>(displayMode);

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  // Log component mount (simplified)
  React.useEffect(() => {
    SPContext.logger.info('SPLookupField: Initialized', {
      list: dataSource.listNameOrId,
      displayMode,
      allowMultiple,
    });
  }, []); // Empty deps - only log on mount

  // Create stable dataSource key to avoid re-fetches on object reference changes
  const dataSourceKey = React.useMemo(() => {
    const fields = [dataSource.displayField || 'Title', ...(dataSource.additionalFields || [])].join(',');
    const searchFields = (dataSource.searchFields || []).join(',');
    return `${dataSource.listNameOrId}:${fields}:${dataSource.filter || ''}:${dataSource.orderBy || ''}:${dataSource.itemLimit || 100}:${searchFields}:${useCache ? 'cached' : 'fresh'}:${displayMode}:${searchableThreshold}`;
  }, [
    dataSource.listNameOrId,
    dataSource.displayField,
    dataSource.additionalFields,
    dataSource.filter,
    dataSource.orderBy,
    dataSource.itemLimit,
    dataSource.searchFields,
    useCache,
    displayMode,
    searchableThreshold,
  ]);

  // Determine item count and display mode
  React.useEffect(() => {
    let isMounted = true;

    const determineDisplayMode = async () => {
      if (!SPContext.sp) {
        if (isMounted) {
          SPContext.logger.warn('SPLookupField: SPContext not initialized', {
            list: dataSource.listNameOrId,
          });
          setError('SPContext not initialized');
          setLoading(false);
        }
        return;
      }

      // If display mode is forced, skip count check
      if (displayMode !== SPLookupDisplayMode.Auto) {
        setActualDisplayMode(displayMode);
        // Don't set loading to false here - let the second useEffect handle it after items load
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        const sp = useCache ? SPContext.spCached : SPContext.spPessimistic;

        // Cross-site lookup warning
        if (dataSource.webUrl) {
          SPContext.logger.warn('SPLookupField: Cross-site lookups not fully supported', {
            webUrl: dataSource.webUrl
          });
        }

        // Get item count
        let query = getListByNameOrId(sp, dataSource.listNameOrId).items;

        if (dataSource.filter) {
          query = query.filter(dataSource.filter);
        }

        // Get total count using $top=0 to avoid loading items
        const countQuery = getListByNameOrId(sp, dataSource.listNameOrId).items;
        const filteredCountQuery = dataSource.filter ? countQuery.filter(dataSource.filter) : countQuery;

        // Use getAll with top(0) and get length from response
        const allItems = await filteredCountQuery.top(5000)();
        const count = allItems.length;

        if (!isMounted) return;

        setItemCount(count);

        // Determine display mode based on threshold
        const mode = count > searchableThreshold ? SPLookupDisplayMode.Searchable : SPLookupDisplayMode.Dropdown;
        setActualDisplayMode(mode);

        // Notify callback
        if (onItemCountDetermined) {
          onItemCountDetermined(count, mode);
        }

        SPContext.logger.info('SPLookupField: Display mode determined', {
          list: dataSource.listNameOrId,
          itemCount: count,
          mode,
        });

        setLoading(false);
      } catch (err: any) {
        if (!isMounted) return;

        const errorMsg = err?.message || 'Failed to determine display mode';
        setError(errorMsg);
        SPContext.logger.error('SPLookupField: Failed to determine display mode', err, { dataSource });
        setLoading(false);
      }
    };

    determineDisplayMode();

    return () => {
      isMounted = false;
    };
  }, [dataSourceKey, searchableThreshold, onItemCountDetermined, displayMode]);

  // Load lookup items for dropdown mode
  React.useEffect(() => {
    // Only load items if in dropdown mode (Dropdown/SelectBox both equal 'dropdown')
    // Skip if in Searchable/Autocomplete mode (both equal 'searchable')
    const modeValue = String(actualDisplayMode);
    const needsItemLoad = modeValue === 'dropdown';

    if (!needsItemLoad) {
      return;
    }

    let isMounted = true;

    const loadLookupItems = async () => {
      if (!SPContext.sp) {
        if (isMounted) {
          SPContext.logger.error('SPLookupField: Cannot load items - SPContext not initialized', null, {
            list: dataSource.listNameOrId,
          });
          setError('SPContext not initialized');
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        const sp = useCache ? SPContext.spCached : SPContext.spPessimistic;

        let query = getListByNameOrId(sp, dataSource.listNameOrId).items
          .select('Id', dataSource.displayField || 'Title', ...(dataSource.additionalFields || []))
          .top(dataSource.itemLimit || searchableThreshold);

        if (dataSource.filter) {
          query = query.filter(dataSource.filter);
        }

        if (dataSource.orderBy) {
          const orderByParts = dataSource.orderBy.split(' ');
          const field = orderByParts[0];
          const ascending = orderByParts[1]?.toLowerCase() !== 'desc';
          query = query.orderBy(field, ascending);
        }

        const items = await query();

        if (!isMounted) return;

        const lookupValues: ISPLookupFieldValue[] = items.map((item: any) => ({
          Id: item.Id,
          Title: item[dataSource.displayField || 'Title'],
        }));

        // Validate that items have required properties
        const validItems = lookupValues.filter(item => item.Id != null && item.Title != null);

        if (validItems.length < lookupValues.length) {
          SPContext.logger.warn('SPLookupField: Some items missing Id or Title', {
            list: dataSource.listNameOrId,
            invalidCount: lookupValues.length - validItems.length,
          });
        }

        SPContext.logger.info('SPLookupField: Items loaded', {
          list: dataSource.listNameOrId,
          itemsLoaded: validItems.length,
        });

        setLookupItems(validItems);
        setError(null);
      } catch (err: any) {
        if (!isMounted) return;

        const errorMsg = err?.message || 'Failed to load lookup items';
        setError(errorMsg);
        SPContext.logger.error('SPLookupField: Failed to load items', err, {
          list: dataSource.listNameOrId,
          error: errorMsg,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLookupItems();

    return () => {
      isMounted = false;
    };
  }, [dataSourceKey, actualDisplayMode, searchableThreshold]);

  // Handle lookup change
  const handleLookupChange = React.useCallback(
    (newValue: ISPLookupFieldValue | ISPLookupFieldValue[]) => {
      setInternalValue(newValue);

      if (onChange) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  // Merge validation rules
  const validationRules = React.useMemo(() => {
    const baseRules: RegisterOptions = { ...rules };

    if (required && !baseRules.required) {
      baseRules.required = `${label || 'This field'} is required`;
    }

    return baseRules;
  }, [required, label, rules]);

  // Styles
  const containerClass = mergeStyles({
    width: width || '100%',
    marginBottom: 16,
  });

  const errorClass = mergeStyles({
    color: theme.palette.redDark,
    fontSize: 12,
    marginTop: 4,
  });

  const infoClass = mergeStyles({
    fontSize: 11,
    color: theme.palette.neutralSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  });

  // Convert current value to format expected by DevExtreme
  const displayValue = React.useMemo(() => {
    if (!currentValue) return allowMultiple ? [] : null;

    if (allowMultiple) {
      return Array.isArray(currentValue) ? currentValue.map(v => v.Id) : [];
    } else {
      return Array.isArray(currentValue) ? currentValue[0]?.Id : (currentValue as ISPLookupFieldValue)?.Id;
    }
  }, [currentValue, allowMultiple]);

  // Compute actual loading state - if we have items, we're not really loading anymore
  // This handles race conditions where items are loaded but loading state hasn't updated yet
  const isActuallyLoading = React.useMemo(() => {
    const modeValue = String(actualDisplayMode);

    // For dropdown mode: loading if loading=true AND no items yet
    if (modeValue === 'dropdown') {
      return loading && lookupItems.length === 0;
    }

    // For searchable mode or auto: use loading as-is
    return loading;
  }, [loading, lookupItems.length, actualDisplayMode]);

  // Create DevExtreme ArrayStore from lookupItems
  const lookupDataStore = React.useMemo(() => {
    if (lookupItems.length === 0) {
      return null;
    }

    return new ArrayStore({
      data: lookupItems,
      key: 'Id',
    });
  }, [lookupItems]);

  // Render field content
  const renderField = (
    fieldValue: ISPLookupFieldValue | ISPLookupFieldValue[],
    fieldOnChange: (val: ISPLookupFieldValue | ISPLookupFieldValue[]) => void,
    fieldError?: string
  ) => {
    if (error) {
      return (
        <Stack className={containerClass}>
          {label && <Label required={required}>{label}</Label>}
          <MessageBar messageBarType={MessageBarType.error}>
            {error}
          </MessageBar>
        </Stack>
      );
    }

    // Show loading while determining mode
    if (isActuallyLoading && actualDisplayMode === SPLookupDisplayMode.Auto) {
      return (
        <Stack className={containerClass}>
          {label && <Label required={required}>{label}</Label>}
          <Spinner size={SpinnerSize.small} label="Loading lookup configuration..." />
        </Stack>
      );
    }

    // Render Searchable Mode (PnP ListItemPicker)
    const modeValue = String(actualDisplayMode);
    if (modeValue === 'searchable') {
      return (
        <Stack className={`sp-lookup-field sp-lookup-field-searchable ${containerClass} ${className || ''}`}>
          {label && (
            <Label required={required} disabled={disabled}>
              {label}
            </Label>
          )}

          {description && (
            <Text variant="small" style={{ marginBottom: 4 }}>
              {description}
            </Text>
          )}

          <ListItemPicker
            listId={dataSource.listNameOrId}
            columnInternalName={dataSource.displayField || 'Title'}
            keyColumnInternalName="Id"
            itemLimit={pageSize}
            filter={dataSource.filter}
            defaultSelectedItems={Array.isArray(fieldValue) ? fieldValue.map(v => v.Id) : (fieldValue ? [fieldValue.Id] : [])}
            onSelectedItem={(items) => {
              if (allowMultiple) {
                const selectedItems: ISPLookupFieldValue[] = items.map((item: any) => ({
                  Id: item.Id,
                  Title: item[dataSource.displayField || 'Title'],
                }));
                fieldOnChange(selectedItems);
              } else {
                if (items && items.length > 0) {
                  const item = items[0];
                  fieldOnChange({
                    Id: item.Id,
                    Title: item[dataSource.displayField || 'Title'],
                  });
                } else {
                  fieldOnChange(null as any);
                }
              }
            }}
            context={SPContext.spfxContext}
            disabled={disabled || readOnly}
            placeholder={placeholder || `Type to search (${itemCount} items available)`}
            noResultsFoundText="No items found matching your search"
            suggestionsHeaderText="Suggested items"
            className={className}
          />

          {itemCount > 0 && (
            <Text className={infoClass}>
              <Icon iconName="Search" style={{ marginRight: 4, fontSize: 10 }} />
              Searchable mode - {itemCount} items available
            </Text>
          )}

          {/* Show error messages */}
          {(fieldError || errorMessage) && (
            <Text className={errorClass}>{fieldError || errorMessage}</Text>
          )}
        </Stack>
      );
    }

    // Render Dropdown Mode (DevExtreme SelectBox/TagBox)
    // Common props for both SelectBox and TagBox
    const commonProps = {
      displayExpr: 'Title',
      valueExpr: 'Id',
      disabled: disabled || isActuallyLoading,
      readOnly: readOnly,
      placeholder: isActuallyLoading ? 'Loading...' : placeholder,
      showClearButton: showClearButton && !readOnly && !isActuallyLoading,
      stylingMode: stylingMode,
      onFocusIn: onFocus,
      onFocusOut: onBlur,
    };
    return (
      <Stack className={`sp-lookup-field sp-lookup-field-dropdown ${containerClass} ${className || ''}`}>
        {label && (
          <Label required={required} disabled={disabled}>
            {label}
          </Label>
        )}

        {description && (
          <Text variant="small" style={{ marginBottom: 4 }}>
            {description}
          </Text>
        )}

        {isActuallyLoading && (
          <Spinner size={SpinnerSize.small} label="Loading lookup items..." />
        )}

        {!isActuallyLoading && lookupItems.length >= 0 && (
          allowMultiple ? (
            <TagBox
              key={`tagbox-${isActuallyLoading}-${lookupItems.length}`}
              {...commonProps}
              dataSource={lookupDataStore}
              value={Array.isArray(displayValue) ? displayValue : []}
              onValueChanged={(e: any) => {
                const selectedIds = e.value || [];
                const selectedItems = lookupItems.filter(item => selectedIds.includes(item.Id));
                fieldOnChange(selectedItems);
              }}
              maxDisplayedTags={maxDisplayedTags}
              isValid={!fieldError}
              validationError={fieldError ? { message: fieldError } : undefined}
              acceptCustomValue={false}
              showSelectionControls={true}
              searchEnabled={showSearchBox}
              searchTimeout={searchDelay}
              minSearchLength={minSearchLength}
              itemRender={itemTemplate ? (item: any) => itemTemplate(item) : undefined}
            />
          ) : (
            <SelectBox
              key={`selectbox-${isActuallyLoading}-${lookupItems.length}`}
              {...commonProps}
              dataSource={lookupDataStore}
              value={!Array.isArray(displayValue) ? displayValue : null}
              onValueChanged={(e: any) => {
                const selectedId = e.value;
                const selectedItem = lookupItems.find(item => item.Id === selectedId);
                fieldOnChange(selectedItem || null as any);
              }}
              isValid={!fieldError}
              validationError={fieldError ? { message: fieldError } : undefined}
              acceptCustomValue={false}
              showDropDownButton={true}
              searchEnabled={showSearchBox}
              itemRender={itemTemplate ? (item: any) => itemTemplate(item) : undefined}
            />
          )
        )}

        {itemCount > 0 && itemCount > searchableThreshold && (
          <Text className={infoClass}>
            <Icon iconName="Info" style={{ marginRight: 4, fontSize: 10 }} />
            Dropdown mode - Showing first {lookupItems.length} of {itemCount} items
          </Text>
        )}

        {/* Show error messages */}
        {(fieldError || errorMessage) && (
          <Text className={errorClass}>{fieldError || errorMessage}</Text>
        )}
      </Stack>
    );
  };

  // If using react-hook-form
  if (control && name) {
    return (
      <Controller
        name={name}
        control={control}
        rules={validationRules}
        defaultValue={defaultValue || (allowMultiple ? [] : null)}
        render={({ field, fieldState }) => (
          <>
            {renderField(
              field.value || (allowMultiple ? [] : null),
              (val) => field.onChange(val),
              fieldState.error?.message
            )}
          </>
        )}
      />
    );
  }

  // Standalone mode
  return renderField(currentValue, handleLookupChange);
};

export default SPLookupField;
