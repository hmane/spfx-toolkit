import * as React from 'react';
import { FieldValues } from 'react-hook-form';
import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { IFieldMetadata } from '../types/fieldMetadata';
import { extractItemValues } from '../utilities/extractItemValues';
import { buildItemQueryFields } from '../utilities/itemQueryBuilder';

export interface IUseDynamicFormDataOptions<T extends FieldValues = any> {
  listId: string;
  itemId?: number;
  mode: 'new' | 'edit' | 'view';
  fields: IFieldMetadata[];
  onAfterLoad?: (data: T, item: any) => void;
  onError?: (error: Error, context: 'load') => void;
}

export interface IUseDynamicFormDataResult<T extends FieldValues = any> {
  data: T | null;
  originalItem: any;
  /** ContentTypeId.StringValue from the loaded item, or null when not yet loaded / not applicable. */
  itemContentTypeId: string | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * Custom hook to load existing item data for edit/view modes
 */
export function useDynamicFormData<T extends FieldValues = any>(
  options: IUseDynamicFormDataOptions<T>
): IUseDynamicFormDataResult<T> {
  const { listId, itemId, mode, fields, onAfterLoad, onError } = options;

  const [data, setData] = React.useState<T | null>(null);
  const [originalItem, setOriginalItem] = React.useState<any>(null);
  const [itemContentTypeId, setItemContentTypeId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Use refs for callbacks to prevent infinite loops
  const onAfterLoadRef = React.useRef(onAfterLoad);
  const onErrorRef = React.useRef(onError);

  // Increments on every load attempt; if a load completes after the counter
  // has advanced (i.e., a newer load started or the component unmounted),
  // its setStates are skipped.
  const loadRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    onAfterLoadRef.current = onAfterLoad;
    onErrorRef.current = onError;
  }, [onAfterLoad, onError]);

  // Create stable reference for fields array to prevent infinite loops
  const fieldsStr = React.useMemo(() => {
    return JSON.stringify(fields.map((f) => f.internalName));
  }, [fields]);

  const loadData = React.useCallback(async () => {
    // Only load data for edit/view modes
    if (mode === 'new') {
      setData({} as T);
      setOriginalItem(null);
      return;
    }

    // Validate itemId
    if (!itemId) {
      const error = new Error('itemId is required for edit/view modes');
      setError(error);
      if (onErrorRef.current) {
        onErrorRef.current(error, 'load');
      }
      return;
    }

    const myRequestId = ++loadRequestIdRef.current;

    try {
      setLoading(true);
      setError(null);

      const timer = SPContext.logger.startTimer('useDynamicFormData.loadData');

      const list = getListByNameOrId(SPContext.sp, listId);

      const { selectFields, expandFields } = buildItemQueryFields(fields);

      // Load item with proper select/expand
      let itemQuery = list.items.getById(itemId).select(...selectFields);

      if (expandFields.length > 0) {
        itemQuery = itemQuery.expand(...expandFields) as any;
      }

      const item = await itemQuery();

      if (myRequestId !== loadRequestIdRef.current) return;

      setOriginalItem(item);

      // Capture the item's actual ContentTypeId so SPDynamicForm can adopt it as
      // the effective CT in edit mode (matters when items live on a child CT but
      // the developer didn't pass `contentTypeId`).
      const ctIdRaw = (item as any)?.ContentTypeId;
      const ctIdString =
        typeof ctIdRaw === 'string'
          ? ctIdRaw
          : ctIdRaw && typeof ctIdRaw === 'object' && typeof ctIdRaw.StringValue === 'string'
          ? ctIdRaw.StringValue
          : null;
      setItemContentTypeId(ctIdString);

      // Extract field values using shared extractItemValues for consistent format
      SPContext.logger.info('🔍 SPDynamicForm: Starting field extraction', {
        itemId,
        fieldCount: fields.length,
        fieldNames: fields.map(f => f.internalName)
      });

      const formData = extractItemValues(item as any, fields);

      SPContext.logger.info('📦 Final form data prepared', {
        formData,
        fieldCount: Object.keys(formData).length
      });

      setData(formData as T);

      // Call onAfterLoad using ref
      if (onAfterLoadRef.current) {
        onAfterLoadRef.current(formData as T, item);
      }

      const duration = timer();
      SPContext.logger.success(`Item data loaded successfully in ${duration}ms`, {
        itemId,
        fieldCount: fields.length,
      });
    } catch (err) {
      if (myRequestId !== loadRequestIdRef.current) return;
      const error = err as Error;
      setError(error);
      SPContext.logger.error('Failed to load item data', error, { listId, itemId });

      if (onErrorRef.current) {
        onErrorRef.current(error, 'load');
      }
    } finally {
      if (myRequestId !== loadRequestIdRef.current) return;
      setLoading(false);
    }
  }, [listId, itemId, mode, fieldsStr]);

  // Load data when dependencies change. The cleanup invalidates any in-flight
  // load by bumping loadRequestIdRef — its post-await setStates will short-circuit.
  React.useEffect(() => {
    if (fields.length > 0) {
      loadData();
    }
    return () => {
      // Invalidate the current request so its post-await setStates skip.
      loadRequestIdRef.current++;
    };
  }, [loadData, fields.length]);

  return {
    data,
    originalItem,
    /**
     * The item's ContentTypeId.StringValue (or null when not in edit/view mode
     * or before the load completes). Consumers in edit mode can adopt this as
     * the effective CT when the developer didn't pass `contentTypeId` explicitly.
     */
    itemContentTypeId,
    loading,
    error,
    reload: loadData,
  };
}
