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
import { Stack } from '@fluentui/react/lib/Stack';
import { Label } from '@fluentui/react/lib/Label';
import { Text } from '@fluentui/react/lib/Text';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { ModernTaxonomyPicker } from '@pnp/spfx-controls-react/lib/ModernTaxonomyPicker';

/**
 * Term info interface matching ModernTaxonomyPicker's expected format
 */
interface ITermInfoLabel {
  name: string;
  isDefault: boolean;
  languageTag: string;
}

interface ITermInfo {
  id: string;
  labels: ITermInfoLabel[];
}
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
        // Using ModernTaxonomyPicker from @pnp/spfx-controls-react
        // No need to load terms manually - the picker handles this

        SPContext.logger.info('SPTaxonomyField: Ready to use ModernTaxonomyPicker', {
          termSetId: resolvedDataSource.termSetId,
          anchorId: resolvedDataSource.anchorId
        });

        if (!isMounted) return;

        // Clear any previous error and mark as ready
        setTerms([]); // Terms not needed - ModernTaxonomyPicker loads them
        setError(null);
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

  // Convert ISPTaxonomyFieldValue to ITermInfo format expected by ModernTaxonomyPicker
  const convertToTermInfo = React.useCallback((val: ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[] | null): ITermInfo[] => {
    if (!val) return [];
    const values = Array.isArray(val) ? val : [val];
    return values
      .filter(v => v && v.TermGuid)
      .map(v => ({
        id: v.TermGuid,
        labels: [{ name: v.Label, isDefault: true, languageTag: 'en-US' }],
        // Add other required ITermInfo fields with default values
      } as ITermInfo));
  }, []);

  // Convert ITermInfo[] back to ISPTaxonomyFieldValue or ISPTaxonomyFieldValue[]
  const convertFromTermInfo = React.useCallback((terms: ITermInfo[]): ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[] => {
    const converted = terms.map(term => ({
      Label: term.labels?.find(l => l.isDefault)?.name || term.labels?.[0]?.name || '',
      TermGuid: term.id,
      WssId: -1, // WssId is not available from ITermInfo
    }));

    if (resolvedAllowMultiple) {
      return converted;
    } else {
      return converted[0] || null;
    }
  }, [resolvedAllowMultiple]);

  // Render field content
  const renderField = (
    fieldValue: ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[],
    fieldOnChange: (val: ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[]) => void,
    fieldError?: string
  ) => {
    // Check if SPContext is available
    if (!SPContext.spfxContext) {
      return (
        <Stack className={containerClass}>
          {label && <Label required={required}>{label}</Label>}
          <MessageBar messageBarType={MessageBarType.error}>
            SPContext not initialized. Taxonomy field requires SPContext to be initialized with SPFx context.
          </MessageBar>
        </Stack>
      );
    }

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

    // Check if we have the required termSetId
    if (!resolvedDataSource?.termSetId) {
      return (
        <Stack className={containerClass}>
          {label && <Label required={required}>{label}</Label>}
          {loading ? (
            <Spinner size={SpinnerSize.small} label="Loading field configuration..." />
          ) : (
            <MessageBar messageBarType={MessageBarType.warning}>
              Taxonomy field configuration missing. Provide either termSetId or columnName/listId.
            </MessageBar>
          )}
        </Stack>
      );
    }

    const hasError = !!fieldError;
    const initialTerms = convertToTermInfo(fieldValue);

    return (
      <Stack className={`sp-taxonomy-field ${containerClass} ${className || ''}`}>
        {description && (
          <Text variant="small" style={{ marginBottom: 4 }}>
            {description}
          </Text>
        )}

        <div ref={fieldRef as React.RefObject<HTMLDivElement>}>
          <ModernTaxonomyPicker
            context={SPContext.spfxContext}
            termSetId={resolvedDataSource.termSetId}
            anchorTermId={resolvedDataSource.anchorId}
            label={label || ''}
            panelTitle={`Select ${label || 'Terms'}`}
            placeHolder={placeholder}
            disabled={disabled || readOnly}
            allowMultipleSelections={resolvedAllowMultiple || false}
            required={required}
            initialValues={initialTerms}
            onChange={(terms) => {
              const converted = convertFromTermInfo(terms || []);
              fieldOnChange(converted);
            }}
          />
        </div>

        {hasError && (
          <Text className={errorClass} role="alert">
            {fieldError}
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
