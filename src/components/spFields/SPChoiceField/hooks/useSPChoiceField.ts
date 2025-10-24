/**
 * useSPChoiceField Hook
 * Manages SharePoint choice field loading, state, and "Other" option behavior
 */

import * as React from 'react';
import {
  IChoiceFieldMetadata,
  IOtherOptionConfig,
  IOtherOptionState,
  SPChoiceFieldDataSource,
} from '../SPChoiceField.types';
import {
  injectOtherOption,
  isValueInChoices,
  loadChoiceFieldMetadata,
  shouldEnableOtherOption,
  validateCustomValue,
} from '../utils/choiceFieldLoader';

export interface IUseSPChoiceFieldResult {
  /**
   * Field metadata loaded from SharePoint
   */
  metadata: IChoiceFieldMetadata | null;

  /**
   * Final choices array (may include injected "Other" option)
   */
  choices: string[];

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error message if loading failed
   */
  error: string | null;

  /**
   * Retry loading the field
   */
  retry: () => void;

  /**
   * Whether "Other" option is enabled
   */
  otherEnabled: boolean;

  /**
   * The text used for "Other" option
   */
  otherOptionText: string;

  /**
   * State for "Other" option selection
   */
  otherState: IOtherOptionState;

  /**
   * Update the custom "Other" value
   */
  setCustomValue: (value: string) => void;

  /**
   * Check if current value is an "Other" value (not in original choices)
   */
  isOtherValue: (value: string) => boolean;
}

/**
 * Hook to manage SharePoint choice field loading and state
 * @param dataSource - Data source configuration (optional for static choices)
 * @param staticChoices - Static choices array (used when dataSource not provided)
 * @param value - Current selected value(s)
 * @param otherConfig - Configuration for "Other" option
 * @param useCache - Whether to use cached field metadata
 * @returns Field metadata, choices, loading state, and "Other" management
 */
export function useSPChoiceField(
  dataSource: SPChoiceFieldDataSource | undefined,
  staticChoices: string[] | undefined,
  value: string | string[] | undefined,
  otherConfig: IOtherOptionConfig = {},
  useCache: boolean = false
): IUseSPChoiceFieldResult {
  const [metadata, setMetadata] = React.useState<IChoiceFieldMetadata | null>(null);
  const [loading, setLoading] = React.useState<boolean>(dataSource ? true : false);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState<number>(0);

  const [otherState, setOtherState] = React.useState<IOtherOptionState>({
    isOtherSelected: false,
    customValue: '',
    customValueError: undefined,
  });

  const otherOptionText = otherConfig.otherOptionText || 'Other';

  // Create stable dataSource key for comparison (avoid re-fetching on object reference changes)
  const dataSourceKey = React.useMemo(() => {
    if (!dataSource) return 'static';

    if (dataSource.type === 'static') {
      return `static:${dataSource.choices.join(',')}`;
    } else if (dataSource.type === 'list') {
      return `list:${dataSource.listNameOrId}:${dataSource.fieldInternalName}`;
    } else {
      return `siteColumn:${dataSource.siteColumnName}`;
    }
  }, [dataSource]);

  // Load field metadata
  React.useEffect(() => {
    // If no dataSource and staticChoices provided, use static choices
    if (!dataSource && staticChoices) {
      setMetadata({
        displayName: '',
        internalName: '',
        choices: staticChoices,
        isMultiChoice: false,
        allowFillIn: false,
        required: false,
      });
      setLoading(false);
      setError(null);
      return;
    }

    // If no dataSource and no staticChoices, error
    if (!dataSource) {
      setError('No data source or static choices provided');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadField = async () => {
      setLoading(true);
      setError(null);

      try {
        const fieldMetadata = await loadChoiceFieldMetadata(dataSource, useCache);

        if (!isMounted) return;

        setMetadata(fieldMetadata);
        setError(null);
      } catch (err: any) {
        if (!isMounted) return;

        const errorMessage = err?.message || 'Failed to load field choices';
        setError(errorMessage);
        setMetadata(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadField();

    return () => {
      isMounted = false;
    };
  }, [dataSourceKey, useCache, retryCount, staticChoices]);

  // Determine if "Other" option should be enabled
  const otherEnabled = React.useMemo(() => {
    if (!metadata) return false;

    // Force enable if configured
    if (otherConfig.enableOtherOption) {
      return true;
    }

    // Auto-detect from field metadata
    return shouldEnableOtherOption(metadata, otherOptionText);
  }, [metadata, otherConfig.enableOtherOption, otherOptionText]);

  // Build final choices array (inject "Other" if needed)
  const choices = React.useMemo(() => {
    if (!metadata) return [];

    // Inject "Other" if:
    // 1. enableOtherOption is explicitly set to true (forced injection)
    // 2. allowFillIn is true (SharePoint fill-in choices enabled)
    const shouldInjectOther =
      otherConfig.enableOtherOption ||
      (otherEnabled && metadata.allowFillIn);

    if (shouldInjectOther) {
      // Inject "Other" option if not already in choices
      return injectOtherOption(metadata.choices, otherOptionText);
    }

    return metadata.choices;
  }, [metadata, otherEnabled, otherConfig.enableOtherOption, otherOptionText]);

  // Check if a value is an "Other" value (not in original choices)
  const isOtherValue = React.useCallback(
    (val: string): boolean => {
      if (!metadata) return false;
      return !isValueInChoices(val, metadata.choices);
    },
    [metadata]
  );

  // Handle value changes to detect "Other" selection
  React.useEffect(() => {
    if (!metadata || !otherEnabled) {
      setOtherState({
        isOtherSelected: false,
        customValue: '',
        customValueError: undefined,
      });
      return;
    }

    // Check if value(s) include "Other" or an other-value
    let isOtherSelected = false;
    let customValue = '';

    if (Array.isArray(value)) {
      // Multi-select: check if "Other" is in array or if any value is not in choices
      const otherIndex = value.findIndex(
        v => v.toLowerCase() === otherOptionText.toLowerCase()
      );

      if (otherIndex !== -1) {
        isOtherSelected = true;
      } else {
        // Check if any value is not in original choices (indicates custom value)
        const otherValues = value.filter(v => isOtherValue(v));
        if (otherValues.length > 0) {
          isOtherSelected = true;
          customValue = otherValues[0]; // Use first custom value
        }
      }
    } else if (value) {
      // Single-select: check if value is "Other" or not in choices
      if (value.toLowerCase() === otherOptionText.toLowerCase()) {
        isOtherSelected = true;
      } else if (isOtherValue(value)) {
        isOtherSelected = true;
        customValue = value;
      }
    }

    setOtherState(prev => ({
      ...prev,
      isOtherSelected,
      customValue,
    }));
  }, [value, metadata, otherEnabled, otherOptionText, isOtherValue]);

  // Update custom value
  const setCustomValue = React.useCallback(
    (newValue: string) => {
      // Validate the custom value
      const validationError = validateCustomValue(newValue, otherConfig.otherValidation);

      setOtherState(prev => ({
        ...prev,
        customValue: newValue,
        customValueError: validationError,
      }));
    },
    [otherConfig.otherValidation]
  );

  // Retry function
  const retry = React.useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  return {
    metadata,
    choices,
    loading,
    error,
    retry,
    otherEnabled,
    otherOptionText,
    otherState,
    setCustomValue,
    isOtherValue,
  };
}
