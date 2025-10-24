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
import { ListItemPicker } from '@pnp/spfx-controls-react/lib/ListItemPicker';

/**
 * Enhanced SPLookupField component with smart threshold-based mode switching
 *
 * @example
 * ```tsx
 * // Auto mode - switches to searchable if > 100 items
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
 * // Force searchable mode
 * <SPLookupField
 *   name="product"
 *   label="Product"
 *   control={control}
 *   displayMode={SPLookupDisplayMode.Searchable}
 *   dataSource={{
 *     listNameOrId: 'Products',
 *     searchFields: ['Title', 'ProductCode']
 *   }}
 * />
 *
 * // Force dropdown mode (load all items)
 * <SPLookupField
 *   name="status"
 *   label="Status"
 *   control={control}
 *   displayMode={SPLookupDisplayMode.Dropdown}
 *   dataSource={{
 *     listNameOrId: 'StatusList'
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
          setError('SPContext not initialized');
          setLoading(false);
        }
        return;
      }

      // If display mode is forced, skip count check
      if (displayMode !== SPLookupDisplayMode.Auto) {
        setActualDisplayMode(displayMode);
        setLoading(false);
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
        let query = sp.web.lists.getByTitle(dataSource.listNameOrId).items;

        if (dataSource.filter) {
          query = query.filter(dataSource.filter);
        }

        // Get total count using $top=0 to avoid loading items
        const countQuery = sp.web.lists.getByTitle(dataSource.listNameOrId).items;
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
          threshold: searchableThreshold,
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
  }, [dataSourceKey, searchableThreshold, onItemCountDetermined]);

  // Load lookup items for dropdown mode
  React.useEffect(() => {
    // Only load items if in dropdown mode
    if (actualDisplayMode !== SPLookupDisplayMode.Dropdown) {
      return;
    }

    let isMounted = true;

    const loadLookupItems = async () => {
      if (!SPContext.sp) {
        if (isMounted) {
          setError('SPContext not initialized');
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        const sp = useCache ? SPContext.spCached : SPContext.spPessimistic;

        let query = sp.web.lists.getByTitle(dataSource.listNameOrId).items
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

        setLookupItems(lookupValues);
        setError(null);
      } catch (err: any) {
        if (!isMounted) return;

        const errorMsg = err?.message || 'Failed to load lookup items';
        setError(errorMsg);
        SPContext.logger.error('SPLookupField: Failed to load items', err, { dataSource });
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
    if (loading && actualDisplayMode === SPLookupDisplayMode.Auto) {
      return (
        <Stack className={containerClass}>
          {label && <Label required={required}>{label}</Label>}
          <Spinner size={SpinnerSize.small} label="Loading lookup configuration..." />
        </Stack>
      );
    }

    // Render Searchable Mode (PnP ListItemPicker)
    if (actualDisplayMode === SPLookupDisplayMode.Searchable) {
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
    const commonProps = {
      dataSource: lookupItems,
      displayExpr: 'Title',
      valueExpr: 'Id',
      disabled: disabled || loading,
      readOnly: readOnly,
      placeholder: loading ? 'Loading...' : placeholder,
      showClearButton: showClearButton && !readOnly && !loading,
      stylingMode: stylingMode,
      searchEnabled: showSearchBox,
      searchTimeout: searchDelay,
      minSearchLength: minSearchLength,
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

        {loading && (
          <Spinner size={SpinnerSize.small} label="Loading lookup items..." />
        )}

        {!loading && lookupItems.length >= 0 && (
          allowMultiple ? (
            <TagBox
              key={`tagbox-${loading}-${lookupItems.length}`}
              {...commonProps}
              value={Array.isArray(displayValue) ? displayValue : []}
              onValueChanged={(e: any) => {
                const selectedIds = e.value || [];
                const selectedItems = lookupItems.filter(item => selectedIds.includes(item.Id));
                fieldOnChange(selectedItems);
              }}
              maxDisplayedTags={maxDisplayedTags}
              isValid={!fieldError}
              validationError={fieldError ? { message: fieldError } : undefined}
            />
          ) : (
            <SelectBox
              key={`selectbox-${loading}-${lookupItems.length}`}
              {...commonProps}
              value={!Array.isArray(displayValue) ? displayValue : null}
              onValueChanged={(e: any) => {
                const selectedId = e.value;
                const selectedItem = lookupItems.find(item => item.Id === selectedId);
                fieldOnChange(selectedItem || null as any);
              }}
              isValid={!fieldError}
              validationError={fieldError ? { message: fieldError } : undefined}
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
