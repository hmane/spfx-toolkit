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
import { ISPTaxonomyFieldProps } from './SPTaxonomyField.types';
import { ISPTaxonomyFieldValue } from '../types';
import { SPContext } from '../../../utilities/context';

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

    // Taxonomy field specific props
    dataSource,
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
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[]>(
    defaultValue || (allowMultiple ? [] : null as any)
  );
  const [terms, setTerms] = React.useState<ISPTaxonomyFieldValue[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  // Create stable dataSource key to avoid re-fetches on object reference changes
  const dataSourceKey = React.useMemo(() => {
    return `${dataSource.termSetId}:${dataSource.anchorId || ''}:${useCache ? 'cached' : 'fresh'}:${showPath ? 'path' : 'nopath'}`;
  }, [dataSource.termSetId, dataSource.anchorId, useCache, showPath]);

  // Load taxonomy terms
  React.useEffect(() => {
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
          termSetId: dataSource.termSetId,
          message: 'Full taxonomy support requires @pnp/sp-taxonomy package'
        });

        if (!isMounted) return;

        // For now, return empty terms and show a message
        setTerms([]);
        setError('Taxonomy field requires additional configuration. Please use TaxonomyPicker from @pnp/spfx-controls-react for full support.');
      } catch (err: any) {
        if (!isMounted) return;

        const errorMsg = err?.message || 'Failed to load taxonomy terms';
        setError(errorMsg);
        SPContext.logger.error('SPTaxonomyField: Failed to load terms', err, { dataSource });
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

  // Convert current value to format expected by DevExtreme
  const displayValue = React.useMemo(() => {
    if (!currentValue) return allowMultiple ? [] : null;

    if (allowMultiple) {
      return Array.isArray(currentValue) ? currentValue.map(v => v.TermGuid) : [];
    } else {
      return Array.isArray(currentValue) ? currentValue[0]?.TermGuid : (currentValue as ISPTaxonomyFieldValue)?.TermGuid;
    }
  }, [currentValue, allowMultiple]);

  // Get display label (with path if enabled)
  const getDisplayLabel = React.useCallback((term: ISPTaxonomyFieldValue) => {
    if (showPath && term.Path) {
      return term.Path.replace(/;/g, pathSeparator) + pathSeparator + term.Label;
    }
    return term.Label;
  }, [showPath, pathSeparator]);

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

        {!loading && terms.length >= 0 && (
          allowMultiple ? (
            <TagBox
              key={`tagbox-${loading}-${terms.length}`}
              {...commonProps}
              value={Array.isArray(displayValue) ? displayValue : []}
              onValueChanged={(e: any) => {
                const selectedGuids = e.value || [];
                const selectedTerms = terms.filter(term => selectedGuids.includes(term.TermGuid));
                fieldOnChange(selectedTerms);
              }}
              maxDisplayedTags={maxDisplayedTags}
              isValid={!fieldError}
              validationError={fieldError ? { message: fieldError } : undefined}
              searchEnabled={showSearchBox}
              searchTimeout={searchDelay}
              minSearchLength={minSearchLength}
            />
          ) : (
            <SelectBox
              key={`selectbox-${loading}-${terms.length}`}
              {...commonProps}
              value={!Array.isArray(displayValue) ? displayValue : null}
              onValueChanged={(e: any) => {
                const selectedGuid = e.value;
                const selectedTerm = terms.find(term => term.TermGuid === selectedGuid);
                fieldOnChange(selectedTerm || null as any);
              }}
              isValid={!fieldError}
              validationError={fieldError ? { message: fieldError } : undefined}
              searchEnabled={showSearchBox}
            />
          )
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
  return renderField(currentValue, handleTaxonomyChange);
};

export default SPTaxonomyField;
