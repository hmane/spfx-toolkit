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
import { useFormContext } from '../../spForm/context/FormContext';

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
  // Get control from FormContext if not provided as prop
  const formContext = useFormContext();
  const effectiveControl = props.control || formContext?.control;

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
    control: controlProp,
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
    pageSize: _pageSize = 50, // Reserved for future pagination support
    maxDisplayedTags = 3,
    showClearButton = true,
    useCache = true,
    itemTemplate,
    dependsOn,
    stylingMode = 'outlined',
    onItemCountDetermined,
    inputRef,
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
  const [isDOMReady, setIsDOMReady] = React.useState(false);

  // Pending value ref - stores value that was set before items were loaded
  // This handles the race condition where form value is set before lookup items load
  const pendingValueRef = React.useRef<ISPLookupFieldValue | ISPLookupFieldValue[] | null>(null);
  const itemsLoadedRef = React.useRef(false);

  // Create internal ref if not provided
  const internalRef = React.useRef<HTMLDivElement>(null);
  const fieldRef = inputRef || internalRef;

  // Register field with FormContext for scroll-to-error functionality
  React.useEffect(() => {
    if (name && formContext?.registry) {
      formContext.registry.register(name, {
        name,
        label: label, // Only use label if explicitly provided, don't fallback to name
        required,
        ref: fieldRef as React.RefObject<HTMLElement>,
        section: undefined,
      });

      return () => {
        formContext.registry.unregister(name);
      };
    }
  }, [name, label, required, formContext, fieldRef]);

  // Wait for DOM to be fully ready before rendering DevExtreme components
  // This prevents DevExtreme from trying to measure elements before they exist
  React.useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsDOMReady(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  // Log component mount (simplified)
  React.useEffect(() => {
    SPContext.logger.info('SPLookupField: Initialized', {
      name,
      list: dataSource.listNameOrId,
      displayMode,
      allowMultiple,
    });
  }, []); // Empty deps - only log on mount

  // Removed verbose value change logging - uncomment for debugging
  // React.useEffect(() => {
  //   SPContext.logger.info(`🔍 SPLookupField [${name}]: Value changed`, {
  //     currentValue,
  //     valueType: typeof currentValue,
  //     isArray: Array.isArray(currentValue),
  //     allowMultiple
  //   });
  // }, [currentValue, name, allowMultiple]);

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

        // Get item count efficiently
        let count: number;

        if (dataSource.filter) {
          // If there's a filter, we need to count matching items
          // Use select('Id') and top(5000) to minimize data transfer
          const filteredQuery = getListByNameOrId(sp, dataSource.listNameOrId)
            .items
            .filter(dataSource.filter)
            .select('Id')
            .top(5000);
          const filteredItems = await filteredQuery();
          count = filteredItems.length;
        } else {
          // No filter - use list's ItemCount property (much faster)
          const listInfo = await getListByNameOrId(sp, dataSource.listNameOrId)
            .select('ItemCount')();
          count = listInfo.ItemCount;
        }

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

        // Provide user-friendly error messages
        let errorMsg = 'Failed to load lookup field';
        if (err?.message?.includes('does not exist') || err?.status === 404) {
          errorMsg = `Lookup list not found: "${dataSource.listNameOrId}". Please verify the list exists and you have access.`;
        } else if (err?.message) {
          errorMsg = err.message;
        }

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
        itemsLoadedRef.current = true;
        setError(null);
      } catch (err: any) {
        if (!isMounted) return;

        // Provide user-friendly error messages
        let errorMsg = 'Failed to load lookup items';
        if (err?.message?.includes('does not exist') || err?.status === 404) {
          errorMsg = `Lookup list not found: "${dataSource.listNameOrId}". Please verify the list exists and you have access.`;
        } else if (err?.message) {
          errorMsg = err.message;
        }

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

  // Effect to handle pending values once items are loaded
  // This resolves the race condition where form value is set before lookup items load
  React.useEffect(() => {
    // Only process if items are loaded and we have a pending value
    if (!itemsLoadedRef.current || lookupItems.length === 0) {
      return;
    }

    // Check if current value has items that aren't in lookupItems yet
    // This can happen when edit mode loads a value before the dropdown items load
    if (currentValue) {
      if (allowMultiple && Array.isArray(currentValue)) {
        // For multi-select: check if any selected items are missing from lookupItems
        const missingItems = currentValue.filter(
          (val) => !lookupItems.find((item) => item.Id === val.Id)
        );

        if (missingItems.length > 0) {
          // Add missing items to lookupItems so they can be displayed
          SPContext.logger.info(`SPLookupField [${name}]: Adding ${missingItems.length} selected items to lookupItems`, {
            missingIds: missingItems.map((i) => i.Id),
          });
          setLookupItems((prev) => [...prev, ...missingItems]);
        }
      } else if (!Array.isArray(currentValue) && currentValue.Id) {
        // For single select: check if selected item is missing
        const selectedId = currentValue.Id;
        const existsInItems = lookupItems.find((item) => item.Id === selectedId);

        if (!existsInItems) {
          // Add the selected item to lookupItems so it can be displayed
          SPContext.logger.info(`SPLookupField [${name}]: Adding selected item to lookupItems`, {
            selectedId,
            selectedTitle: currentValue.Title,
          });
          setLookupItems((prev) => [...prev, currentValue as ISPLookupFieldValue]);
        }
      }
    }

    // Clear pending value ref after processing
    pendingValueRef.current = null;
  }, [lookupItems, currentValue, allowMultiple, name]);

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

  // Helper function to convert value to format expected by DevExtreme
  // This is called inside renderField with the actual fieldValue from Controller
  const getDisplayValue = React.useCallback((fieldValue: ISPLookupFieldValue | ISPLookupFieldValue[] | null) => {
    if (!fieldValue) return allowMultiple ? [] : null;

    if (allowMultiple) {
      return Array.isArray(fieldValue) ? fieldValue.map(v => v.Id) : [];
    } else {
      return Array.isArray(fieldValue) ? fieldValue[0]?.Id : (fieldValue as ISPLookupFieldValue)?.Id;
    }
  }, [allowMultiple]);

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
      const hasError = !!fieldError;

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

          <div ref={fieldRef as React.RefObject<HTMLDivElement>}>
          <ListItemPicker
            listId={dataSource.listNameOrId}
            columnInternalName={dataSource.displayField || 'Title'}
            keyColumnInternalName="Id"
            itemLimit={allowMultiple ? 100 : 1}
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
          </div>

          {/* Show error with MessageBar for PnP control */}
          {hasError && (
            <MessageBar messageBarType={MessageBarType.error} style={{ marginTop: 4 }}>
              {fieldError}
            </MessageBar>
          )}

          {itemCount > 0 && (
            <Text className={infoClass}>
              <Icon iconName="Search" style={{ marginRight: 4, fontSize: 10 }} />
              Searchable mode - {itemCount} items available
            </Text>
          )}
        </Stack>
      );
    }

    // Render Dropdown Mode (DevExtreme SelectBox/TagBox)
    const hasError = !!fieldError;

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

        <div ref={fieldRef as React.RefObject<HTMLDivElement>}>
        {/* Delay rendering DevExtreme components until DOM is ready to prevent measurement errors */}
        {/* Only render when we have items loaded - SelectBox requires a valid dataSource */}
        {isDOMReady && !isActuallyLoading && lookupItems.length > 0 && lookupDataStore && (
          allowMultiple ? (
            <TagBox
              key={`tagbox-${name}`}
              {...commonProps}
              dataSource={lookupDataStore}
              value={(() => {
                const dv = getDisplayValue(fieldValue);
                return Array.isArray(dv) ? dv : [];
              })()}
              onValueChanged={(e: any) => {
                const selectedIds = e.value || [];

                // If no items selected, set to empty array
                if (selectedIds.length === 0) {
                  fieldOnChange([]);
                  return;
                }

                // Find selected items in lookupItems
                const selectedItems = lookupItems.filter(item => selectedIds.includes(item.Id));

                // Only update if we found all the items (prevents clearing during load)
                if (selectedItems.length === selectedIds.length) {
                  fieldOnChange(selectedItems);
                } else {
                  // Some items not found - preserve current value
                  SPContext.logger.warn(`SPLookupField [${name}]: Not all selected items found in lookupItems. Found ${selectedItems.length} of ${selectedIds.length}. Preserving current value.`);
                }
              }}
              maxDisplayedTags={maxDisplayedTags}
              isValid={!hasError}
              validationStatus={hasError ? 'invalid' : 'valid'}
              validationError={fieldError}
              className={`${hasError ? 'dx-invalid' : ''}`.trim()}
              acceptCustomValue={false}
              showSelectionControls={true}
              searchEnabled={showSearchBox}
              searchTimeout={searchDelay}
              minSearchLength={minSearchLength}
              itemRender={itemTemplate ? (item: any) => itemTemplate(item) : undefined}
            />
          ) : (
            <SelectBox
              key={`selectbox-${name}`}
              {...commonProps}
              dataSource={lookupDataStore}
              value={(() => {
                const dv = getDisplayValue(fieldValue);
                return !Array.isArray(dv) ? dv : null;
              })()}
              onValueChanged={(e: any) => {
                const selectedId = e.value;

                // Handle clear/null selection
                if (selectedId === null || selectedId === undefined) {
                  fieldOnChange(null as any);
                  return;
                }

                // Find the selected item in lookupItems
                const selectedItem = lookupItems.find(item => item.Id === selectedId);

                if (selectedItem) {
                  fieldOnChange(selectedItem);
                } else {
                  // Item not found in loaded items - log warning but don't block
                  SPContext.logger.warn(`SPLookupField [${name}]: Item with Id ${selectedId} not found in lookupItems (${lookupItems.length} items). Creating lookup value.`);
                  // Create a minimal lookup value - this handles edge cases where item isn't in the list yet
                  fieldOnChange({ Id: selectedId, Title: `Item ${selectedId}` });
                }
              }}
              isValid={!hasError}
              validationStatus={hasError ? 'invalid' : 'valid'}
              validationError={fieldError}
              className={`${hasError ? 'dx-invalid' : ''}`.trim()}
              acceptCustomValue={false}
              showDropDownButton={true}
              searchEnabled={showSearchBox}
              itemRender={itemTemplate ? (item: any) => itemTemplate(item) : undefined}
            />
          )
        )}
        </div>

        {itemCount > 0 && itemCount > searchableThreshold && (
          <Text className={infoClass}>
            <Icon iconName="Info" style={{ marginRight: 4, fontSize: 10 }} />
            Dropdown mode - Showing first {lookupItems.length} of {itemCount} items
          </Text>
        )}
      </Stack>
    );
  };

  // If using react-hook-form (from prop or context)
  if (effectiveControl && name) {
    return (
      <Controller
        name={name}
        control={effectiveControl}
        rules={validationRules}
        defaultValue={defaultValue || (allowMultiple ? [] : null)}
        render={({ field, fieldState }) => {
          // Removed verbose Controller render logging - uncomment for debugging
          return (
            <>
              {renderField(
                field.value || (allowMultiple ? [] : null),
                (val) => field.onChange(val),
                fieldState.error?.message
              )}
            </>
          );
        }}
      />
    );
  }

  // Standalone mode
  return renderField(currentValue, handleLookupChange);
};

export default SPLookupField;
