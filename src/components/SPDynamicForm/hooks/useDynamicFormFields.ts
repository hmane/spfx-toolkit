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
import { optimizeLookupFields } from '../utilities/lookupFieldOptimizer';
import { getListByNameOrId } from '../../../utilities/spHelper';

/** Default cache TTL in milliseconds (5 minutes) */
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/** Cache entry structure with timestamp */
interface ICacheEntry {
  fields: IFieldMetadata[];
  timestamp: number;
}

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
  /** Cache time-to-live in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
  onBeforeLoad?: () => Promise<void | boolean>;
  onAfterLoad?: (fields: IFieldMetadata[]) => void;
  onError?: (error: Error) => void;
  /**
   * Applied after field order is resolved (post CT-discovery) but before optimisation
   * and section resolution. Return a new array or mutate + return the same array.
   */
  onFieldLoadTransform?: (fields: IFieldMetadata[]) => IFieldMetadata[];
}

/** A content type available on the list — surfaced for the inline picker. */
export interface IAvailableContentType {
  id: string;       // ContentType StringValue (e.g. "0x0100ABC...")
  name: string;
  description?: string;
  default: boolean; // true for the list's default CT (SP returns it first)
}

export interface IUseDynamicFormFieldsResult {
  fields: IFieldMetadata[];
  sections: ISectionMetadata[];
  useSections: boolean;
  supportsAttachments: boolean;
  availableContentTypes: IAvailableContentType[];
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
    cacheTTL = DEFAULT_CACHE_TTL_MS,
    onBeforeLoad,
    onAfterLoad,
    onError,
    onFieldLoadTransform,
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
  const [availableContentTypes, setAvailableContentTypes] = React.useState<IAvailableContentType[]>([]);

  // Use refs for callbacks to avoid re-creating loadFields on every callback change
  const onBeforeLoadRef = React.useRef(onBeforeLoad);
  const onAfterLoadRef = React.useRef(onAfterLoad);
  const onErrorRef = React.useRef(onError);
  const onFieldLoadTransformRef = React.useRef(onFieldLoadTransform);

  // Increments on every load attempt; if a load completes after the counter
  // has advanced (i.e., a newer load started or the component unmounted),
  // its setStates are skipped.
  const loadRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    onBeforeLoadRef.current = onBeforeLoad;
    onAfterLoadRef.current = onAfterLoad;
    onErrorRef.current = onError;
    onFieldLoadTransformRef.current = onFieldLoadTransform;
  }, [onBeforeLoad, onAfterLoad, onError, onFieldLoadTransform]);

  // Cache key for field metadata
  const cacheKey = React.useMemo(
    () => `DynamicFormFields_${listId}_${contentTypeId || 'default'}`,
    [listId, contentTypeId]
  );

  // Create stable references for array/object dependencies to prevent infinite loops
  const specifiedFieldsStr = React.useMemo(
    () => JSON.stringify(specifiedFields || []),
    [specifiedFields]
  );
  const excludeFieldsStr = React.useMemo(() => JSON.stringify(excludeFields), [excludeFields]);
  const fieldOrderStr = React.useMemo(() => JSON.stringify(fieldOrder || []), [fieldOrder]);
  const manualSectionsStr = React.useMemo(
    () => JSON.stringify(manualSections || []),
    [manualSections]
  );
  const fieldOverridesStr = React.useMemo(
    () => JSON.stringify(fieldOverrides || []),
    [fieldOverrides]
  );
  const lookupFieldConfigStr = React.useMemo(
    () => JSON.stringify(lookupFieldConfig || []),
    [lookupFieldConfig]
  );

  const loadFields = React.useCallback(async () => {
    const myRequestId = ++loadRequestIdRef.current;

    try {
      setLoading(true);
      setError(null);

      const timer = SPContext.logger.startTimer('useDynamicFormFields.loadFields');

      // Call onBeforeLoad using ref
      if (onBeforeLoadRef.current) {
        const proceed = await onBeforeLoadRef.current();
        if (myRequestId !== loadRequestIdRef.current) return;
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
            const cacheEntry = JSON.parse(cached) as ICacheEntry;
            const now = Date.now();
            const cacheAge = now - cacheEntry.timestamp;

            if (cacheAge < cacheTTL) {
              fields = cacheEntry.fields;
              SPContext.logger.info(`Loaded ${fields.length} fields from cache (age: ${Math.round(cacheAge / 1000)}s)`);
            } else {
              SPContext.logger.info(`Cache expired (age: ${Math.round(cacheAge / 1000)}s > TTL: ${Math.round(cacheTTL / 1000)}s), reloading`);
              sessionStorage.removeItem(cacheKey);
            }
          } catch (err) {
            SPContext.logger.warn('Failed to parse cached fields, reloading', err);
            sessionStorage.removeItem(cacheKey);
          }
        }
      }

      // Load fields if not cached or cache expired
      if (!fields) {
        fields = await resolveFieldOrder(listId, contentTypeId, useContentTypeOrder, fieldOrder);

        if (myRequestId !== loadRequestIdRef.current) return;

        // Cache the fields with timestamp
        if (cacheFields) {
          try {
            const cacheEntry: ICacheEntry = {
              fields,
              timestamp: Date.now(),
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
          } catch (err) {
            SPContext.logger.warn('Failed to cache fields', err);
          }
        }
      }

      // Apply consumer transform after cache read/write so one form instance
      // cannot poison another instance sharing the same list/content-type cache.
      if (typeof onFieldLoadTransformRef.current === 'function') {
        try {
          const transformed = onFieldLoadTransformRef.current(fields);
          if (Array.isArray(transformed)) {
            fields = transformed;
          }
        } catch (err) {
          SPContext.logger.warn(
            'SPDynamicForm: onFieldLoadTransform threw, using untransformed fields',
            err
          );
        }
      }

      // Filter to specified fields if provided
      if (specifiedFields && specifiedFields.length > 0) {
        fields = filterToSpecifiedFields(fields, specifiedFields);
      }

      // NOTE: `applyFieldOverrides` is intentionally NOT called here. Phase 2
      // moved override resolution to per-render in SPDynamicForm (so function-
      // form `disabled`/`hidden`/`required`/etc. evaluate against the live
      // override context — formValues, user, mode, contentTypeId). Calling it
      // here with an empty fallback context would make function overrides
      // evaluate prematurely and cache wrong results into the metadata.

      // Filter by mode and excluded fields
      fields = filterFieldsByMode(fields, mode, excludeFields);

      // Optimize lookup fields — pass a signal that reflects freshness in real time
      const checkSignal = { get aborted() { return myRequestId !== loadRequestIdRef.current; } };
      fields = await optimizeLookupFields(fields, lookupThreshold, lookupFieldConfig, { signal: checkSignal });

      if (myRequestId !== loadRequestIdRef.current) return;

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
        if (myRequestId !== loadRequestIdRef.current) return;
        supportsAttachments = listInfo.EnableAttachments;
      } catch (err) {
        SPContext.logger.warn('Failed to check attachment support', err);
      }

      if (myRequestId !== loadRequestIdRef.current) return;

      // Discover the list's visible content types in parallel — non-fatal if it fails.
      try {
        const ctList = getListByNameOrId(SPContext.sp, listId);
        const ctsRaw: any[] = await ctList.contentTypes
          .select('Id', 'Name', 'Description', 'Hidden', 'ReadOnly')
          .filter('Hidden eq false')();

        if (myRequestId !== loadRequestIdRef.current) return;

        const cts: IAvailableContentType[] = ctsRaw
          .filter((ct) => {
            const idStr = ct.Id?.StringValue ?? ct.Id ?? '';
            // Drop folder content types (StringValue starts with 0x0120)
            return !ct.ReadOnly && typeof idStr === 'string' && !idStr.startsWith('0x0120');
          })
          .map((ct, idx) => ({
            id: ct.Id?.StringValue ?? ct.Id,
            name: ct.Name,
            description: ct.Description,
            default: idx === 0, // SP returns default first
          }));

        setAvailableContentTypes(cts);
      } catch (ctErr) {
        if (myRequestId !== loadRequestIdRef.current) return;
        SPContext.logger.warn('SPDynamicForm: failed to load content types', { listId, err: String(ctErr) });
        setAvailableContentTypes([]);
      }

      if (myRequestId !== loadRequestIdRef.current) return;

      const finalResult: IFormFieldsResult = {
        fields,
        sections,
        useSections,
        supportsAttachments,
        listId,
        contentTypeId,
      };

      setResult(finalResult);

      // Call onAfterLoad using ref
      if (onAfterLoadRef.current) {
        onAfterLoadRef.current(fields);
      }

      const duration = timer();
      SPContext.logger.success(`Form fields loaded successfully in ${duration}ms`, {
        fieldCount: fields.length,
        sectionCount: sections.length,
        useSections,
        supportsAttachments,
      });
    } catch (err) {
      if (myRequestId !== loadRequestIdRef.current) return;
      const error = err as Error;
      setError(error);
      SPContext.logger.error('Failed to load form fields', error);

      // Call onError using ref
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
    } finally {
      if (myRequestId !== loadRequestIdRef.current) return;
      setLoading(false);
    }
  }, [
    listId,
    mode,
    contentTypeId,
    specifiedFieldsStr,
    excludeFieldsStr,
    fieldOrderStr,
    useContentTypeOrder,
    manualSectionsStr,
    useContentTypeGroups,
    fieldOverridesStr,
    lookupThreshold,
    lookupFieldConfigStr,
    cacheFields,
    cacheKey,
    onFieldLoadTransform,
  ]);

  // Load fields on mount and when dependencies change. The cleanup invalidates
  // any in-flight load by bumping loadRequestIdRef — its post-await setStates
  // will short-circuit at the next staleness check.
  React.useEffect(() => {
    loadFields();
    return () => {
      // Invalidate the current request so its post-await setStates skip.
      loadRequestIdRef.current++;
    };
  }, [loadFields]);

  return {
    fields: result.fields,
    sections: result.sections,
    useSections: result.useSections,
    supportsAttachments: result.supportsAttachments,
    availableContentTypes,
    loading,
    error,
    reload: loadFields,
  };
}
