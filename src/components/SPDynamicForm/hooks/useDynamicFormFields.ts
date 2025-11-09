import * as React from 'react';
import { SPContext } from '../../../utilities/context';
import { IFieldMetadata, ISectionMetadata, IFormFieldsResult } from '../types/fieldMetadata';
import { ISectionConfig, IFieldOverride, ILookupFieldConfig } from '../SPDynamicForm.types';
import {
  resolveFieldOrder,
  filterToSpecifiedFields,
} from '../utilities/fieldOrderResolver';
import { filterFieldsByMode, sortFieldsByOrder } from '../utilities/fieldMapper';
import { resolveSections, flattenSections } from '../utilities/fieldGroupResolver';
import { applyFieldOverrides } from '../utilities/fieldConfigBuilder';
import { optimizeLookupFields } from '../utilities/lookupFieldOptimizer';
import { getListByNameOrId } from '../../../utilities/spHelper';

export interface IUseDynamicFormFieldsOptions {
  listId: string;
  mode: 'new' | 'edit' | 'view';
  contentTypeId?: string;
  fields?: string[];
  excludeFields?: string[];
  fieldOrder?: string[];
  useContentTypeOrder?: boolean;
  sections?: ISectionConfig[];
  useContentTypeGroups?: boolean;
  fieldOverrides?: IFieldOverride[];
  lookupThreshold?: number;
  lookupFieldConfig?: ILookupFieldConfig[];
  cacheFields?: boolean;
  onBeforeLoad?: () => Promise<void | boolean>;
  onAfterLoad?: (fields: IFieldMetadata[]) => void;
  onError?: (error: Error) => void;
}

export interface IUseDynamicFormFieldsResult {
  fields: IFieldMetadata[];
  sections: ISectionMetadata[];
  useSections: boolean;
  supportsAttachments: boolean;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * Custom hook to load and configure form fields from SharePoint
 */
export function useDynamicFormFields(
  options: IUseDynamicFormFieldsOptions
): IUseDynamicFormFieldsResult {
  const {
    listId,
    mode,
    contentTypeId,
    fields: specifiedFields,
    excludeFields = [],
    fieldOrder,
    useContentTypeOrder = true,
    sections: manualSections,
    useContentTypeGroups = true,
    fieldOverrides,
    lookupThreshold = 5000,
    lookupFieldConfig,
    cacheFields = true,
    onBeforeLoad,
    onAfterLoad,
    onError,
  } = options;

  const [result, setResult] = React.useState<IFormFieldsResult>({
    fields: [],
    sections: [],
    useSections: false,
    supportsAttachments: false,
    listId,
    contentTypeId,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Cache key for field metadata
  const cacheKey = React.useMemo(
    () => `DynamicFormFields_${listId}_${contentTypeId || 'default'}`,
    [listId, contentTypeId]
  );

  const loadFields = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const timer = SPContext.logger.startTimer('useDynamicFormFields.loadFields');

      // Call onBeforeLoad
      if (onBeforeLoad) {
        const proceed = await onBeforeLoad();
        if (proceed === false) {
          SPContext.logger.info('Field loading cancelled by onBeforeLoad');
          setLoading(false);
          return;
        }
      }

      // Check cache first
      let fields: IFieldMetadata[] | undefined;
      if (cacheFields) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            fields = JSON.parse(cached) as IFieldMetadata[];
            SPContext.logger.info(`Loaded ${fields.length} fields from cache`);
          } catch (err) {
            SPContext.logger.warn('Failed to parse cached fields, reloading', err);
          }
        }
      }

      // Load fields if not cached
      if (!fields) {
        fields = await resolveFieldOrder(listId, contentTypeId, useContentTypeOrder, fieldOrder);

        // Cache the fields
        if (cacheFields) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(fields));
          } catch (err) {
            SPContext.logger.warn('Failed to cache fields', err);
          }
        }
      }

      // Filter to specified fields if provided
      if (specifiedFields && specifiedFields.length > 0) {
        fields = filterToSpecifiedFields(fields, specifiedFields);
      }

      // Apply field overrides
      fields = applyFieldOverrides(fields, fieldOverrides);

      // Filter by mode and excluded fields
      fields = filterFieldsByMode(fields, mode, excludeFields);

      // Optimize lookup fields
      fields = await optimizeLookupFields(fields, lookupThreshold, lookupFieldConfig);

      // Sort fields by order
      fields = sortFieldsByOrder(fields);

      // Resolve sections
      const sections = resolveSections(fields, useContentTypeGroups, manualSections);
      const useSections = sections.length > 0;

      // Check if list supports attachments
      let supportsAttachments = false;
      try {
        const list = getListByNameOrId(SPContext.sp, listId);
        const listInfo = await list.select('EnableAttachments')();
        supportsAttachments = listInfo.EnableAttachments;
      } catch (err) {
        SPContext.logger.warn('Failed to check attachment support', err);
      }

      const finalResult: IFormFieldsResult = {
        fields,
        sections,
        useSections,
        supportsAttachments,
        listId,
        contentTypeId,
      };

      setResult(finalResult);

      // Call onAfterLoad
      if (onAfterLoad) {
        onAfterLoad(fields);
      }

      const duration = timer();
      SPContext.logger.success(`Form fields loaded successfully in ${duration}ms`, {
        fieldCount: fields.length,
        sectionCount: sections.length,
        useSections,
        supportsAttachments,
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      SPContext.logger.error('Failed to load form fields', error);

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [
    listId,
    mode,
    contentTypeId,
    specifiedFields,
    excludeFields,
    fieldOrder,
    useContentTypeOrder,
    manualSections,
    useContentTypeGroups,
    fieldOverrides,
    lookupThreshold,
    lookupFieldConfig,
    cacheFields,
    cacheKey,
    onBeforeLoad,
    onAfterLoad,
    onError,
  ]);

  // Load fields on mount and when dependencies change
  React.useEffect(() => {
    loadFields();
  }, [loadFields]);

  return {
    fields: result.fields,
    sections: result.sections,
    useSections: result.useSections,
    supportsAttachments: result.supportsAttachments,
    loading,
    error,
    reload: loadFields,
  };
}
