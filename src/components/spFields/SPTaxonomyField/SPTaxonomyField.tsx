/**
 * SPTaxonomyField - SharePoint Managed Metadata (Taxonomy) Field Component
 *
 * A taxonomy field component that mirrors SharePoint's Managed Metadata fields.
 * Supports react-hook-form integration and DevExtreme SelectBox/TagBox components.
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
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { ISPTaxonomyFieldProps, ITaxonomyDataSource } from './SPTaxonomyField.types';
import { ISPTaxonomyFieldValue } from '../types';
import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { useFormContext } from '../../spForm/context/FormContext';

/**
 * SPTaxonomyField component for managed metadata (taxonomy) selection
 *
 * @example
 * ```tsx
 * // With react-hook-form
 * <SPTaxonomyField
 *   name="department"
 *   label="Department"
 *   control={control}
 *   dataSource={{
 *     termSetId: '12345678-1234-1234-1234-123456789012'
 *   }}
 * />
 *
 * // Multi-select taxonomy
 * <SPTaxonomyField
 *   name="keywords"
 *   label="Keywords"
 *   control={control}
 *   allowMultiple
 *   dataSource={{
 *     termSetId: '12345678-1234-1234-1234-123456789012'
 *   }}
 * />
 * ```
 */
export const SPTaxonomyField: React.FC<ISPTaxonomyFieldProps> = (props) => {
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

    // Taxonomy field specific props
    dataSource,
    columnName,
    listId,
    allowMultiple = false,
    showSearchBox = true,
    searchDelay = 300,
    minSearchLength = 2,
    maxDisplayedTags = 3,
    showClearButton = true,
    useCache = true,
    showPath = false,
    pathSeparator = ' > ',
    stylingMode = 'outlined',
    inputRef,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[]>(
    defaultValue || (allowMultiple ? [] : null as any)
  );
  const [terms, setTerms] = React.useState<ISPTaxonomyFieldValue[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resolvedDataSource, setResolvedDataSource] = React.useState<ITaxonomyDataSource | null>(dataSource || null);
  const [resolvedAllowMultiple, setResolvedAllowMultiple] = React.useState<boolean | undefined>(allowMultiple);
  const [resolvedShowPath, setResolvedShowPath] = React.useState<boolean | undefined>(showPath);

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

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  // Auto-load column metadata when columnName is provided
  React.useEffect(() => {
    if (!columnName || !listId) {
      // If dataSource is provided directly, use it
      if (dataSource) {
        setResolvedDataSource(dataSource);
      }
      setResolvedAllowMultiple(allowMultiple);
      setResolvedShowPath(showPath);
      return;
    }

    let isMounted = true;

    const loadColumnMetadata = async () => {
      if (!SPContext.sp) {
        if (isMounted) {
          setError('SPContext not initialized');
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const list = getListByNameOrId(SPContext.sp, listId);
        const field = await list.fields.getByInternalNameOrTitle(columnName)();

        if (!isMounted) return;

        // Extract taxonomy field configuration
        const termSetId = (field as any).TermSetId;
        const anchorId = (field as any).AnchorId;
        const allowMultipleValues = (field as any).AllowMultipleValues || false;
        const isPathRendered = (field as any).IsPathRendered || false;

        if (!termSetId) {
          setError(`Column "${columnName}" is not a taxonomy field or missing term set configuration`);
          setLoading(false);
          return;
        }

        const source: ITaxonomyDataSource = {
          termSetId: termSetId,
          anchorId: anchorId || undefined,
        };

        setResolvedDataSource(source);
        setResolvedAllowMultiple(allowMultipleValues ?? allowMultiple);
        setResolvedShowPath(isPathRendered ?? showPath);

        SPContext.logger.info('SPTaxonomyField: Auto-loaded column metadata', {
          columnName,
          termSetId,
          anchorId,
          allowMultipleValues,
          isPathRendered,
        });
      } catch (err: any) {
        if (!isMounted) return;

        const errorMsg = `Failed to load column metadata for "${columnName}": ${err?.message || 'Unknown error'}`;
        setError(errorMsg);
        SPContext.logger.error('SPTaxonomyField: Failed to load column metadata', err, {
          columnName,
          listId,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadColumnMetadata();

    return () => {
      isMounted = false;
    };
  }, [columnName, listId, dataSource, allowMultiple, showPath]);

  // Create stable dataSource key to avoid re-fetches on object reference changes
  const dataSourceKey = React.useMemo(() => {
    if (!resolvedDataSource) return '';
    return `${resolvedDataSource.termSetId}:${resolvedDataSource.anchorId || ''}:${useCache ? 'cached' : 'fresh'}:${resolvedShowPath ? 'path' : 'nopath'}`;
  }, [resolvedDataSource, useCache, resolvedShowPath]);

  // Load taxonomy terms
  React.useEffect(() => {
    if (!resolvedDataSource) {
      // No dataSource available yet (still loading or not configured)
      return;
    }

    let isMounted = true;

    const loadTerms = async () => {
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
        // Note: This is a simplified implementation
        // In a real-world scenario, you would use @pnp/sp-taxonomy or TaxonomyPicker
        // from @pnp/spfx-controls-react for full taxonomy support

        SPContext.logger.warn('SPTaxonomyField: Simplified taxonomy loading', {
          termSetId: resolvedDataSource.termSetId,
          message: 'Full taxonomy support requires @pnp/sp-taxonomy package'
        });

        if (!isMounted) return;

        // For now, return empty terms and show a message
        setTerms([]);
        setError('Taxonomy field requires additional configuration. Please use TaxonomyPicker from @pnp/spfx-controls-react for full support.');
      } catch (err: any) {
        if (!isMounted) return;

        // Provide user-friendly error messages
        let errorMsg = 'Failed to load taxonomy terms';
        if (err?.message?.includes('does not exist') || err?.status === 404) {
          errorMsg = `Term set not found: "${resolvedDataSource.termSetId}". Please verify the term set exists and you have access.`;
        } else if (err?.message) {
          errorMsg = err.message;
        }

        setError(errorMsg);
        SPContext.logger.error('SPTaxonomyField: Failed to load terms', err, { dataSource: resolvedDataSource });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTerms();

    return () => {
      isMounted = false;
    };
  }, [dataSourceKey]);

  // Handle taxonomy change
  const handleTaxonomyChange = React.useCallback(
    (newValue: ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[]) => {
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

  // Get display label (with path if enabled)
  const getDisplayLabel = React.useCallback((term: ISPTaxonomyFieldValue) => {
    if (resolvedShowPath && term.Path) {
      return term.Path.replace(/;/g, pathSeparator) + pathSeparator + term.Label;
    }
    return term.Label;
  }, [resolvedShowPath, pathSeparator]);

  // Render field content
  const renderField = (
    fieldValue: ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[],
    fieldOnChange: (val: ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[]) => void,
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

    // IMPORTANT: Compute displayValue from fieldValue (not from value prop!)
    // This is the data passed by Controller from React Hook Form
    const computeDisplayValue = (value: ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[]): string | string[] | null => {
      if (!value) return resolvedAllowMultiple ? [] : null;

      if (resolvedAllowMultiple) {
        return Array.isArray(value) ? value.map(v => v.TermGuid) : [];
      } else {
        return Array.isArray(value) ? value[0]?.TermGuid : (value as ISPTaxonomyFieldValue)?.TermGuid;
      }
    };

    // Use fieldValue (from Controller) to compute displayValue, not the value prop!
    const fieldDisplayValue = computeDisplayValue(fieldValue);

    const hasError = !!fieldError;

    // Common props for both SelectBox and TagBox
    const commonProps = {
      dataSource: terms,
      displayExpr: (item: ISPTaxonomyFieldValue) => getDisplayLabel(item),
      valueExpr: 'TermGuid',
      disabled: disabled || loading,
      readOnly: readOnly,
      placeholder: loading ? 'Loading terms...' : placeholder,
      showClearButton: showClearButton && !readOnly && !loading,
      stylingMode: stylingMode,
      onFocusIn: onFocus,
      onFocusOut: onBlur,
    };

    return (
      <Stack className={`sp-taxonomy-field ${containerClass} ${className || ''}`}>
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
          <Spinner size={SpinnerSize.small} label="Loading terms..." />
        )}

        <div ref={fieldRef as React.RefObject<HTMLDivElement>}>
        {!loading && terms.length >= 0 && (
          resolvedAllowMultiple ? (
            <TagBox
              key={`tagbox-${loading}-${terms.length}`}
              {...commonProps}
              value={Array.isArray(fieldDisplayValue) ? fieldDisplayValue : []}
              onValueChanged={(e: any) => {
                const selectedGuids = e.value || [];
                const selectedTerms = terms.filter(term => selectedGuids.includes(term.TermGuid));
                fieldOnChange(selectedTerms);
              }}
              maxDisplayedTags={maxDisplayedTags}
              isValid={!hasError}
              validationStatus={hasError ? 'invalid' : 'valid'}
          validationError={fieldError}
              className={`${hasError ? 'dx-invalid' : ''}`.trim()}
              searchEnabled={showSearchBox}
              searchTimeout={searchDelay}
              minSearchLength={minSearchLength}
            />
          ) : (
            <SelectBox
              key={`selectbox-${loading}-${terms.length}`}
              {...commonProps}
              value={!Array.isArray(fieldDisplayValue) ? fieldDisplayValue : null}
              onValueChanged={(e: any) => {
                const selectedGuid = e.value;
                const selectedTerm = terms.find(term => term.TermGuid === selectedGuid);
                fieldOnChange(selectedTerm || null as any);
              }}
              isValid={!hasError}
              validationStatus={hasError ? 'invalid' : 'valid'}
          validationError={fieldError}
              className={`${hasError ? 'dx-invalid' : ''}`.trim()}
              searchEnabled={showSearchBox}
            />
          )
        )}
        </div>
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
        defaultValue={defaultValue || (resolvedAllowMultiple ? [] : null)}
        render={({ field, fieldState }) => (
          <>
            {renderField(
              field.value || (resolvedAllowMultiple ? [] : null),
              (val) => field.onChange(val),
              fieldState.error?.message
            )}
          </>
        )}
      />
    );
  }

  // Standalone mode
  return renderField(currentValue, handleTaxonomyChange);
};

export default SPTaxonomyField;
