import * as React from 'react';
import { FieldValues } from 'react-hook-form';
import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { createSPExtractor } from '../../../utilities/listItemHelper';
import { IFieldMetadata } from '../types/fieldMetadata';

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
  attachments: IAttachment[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

export interface IAttachment {
  FileName: string;
  ServerRelativeUrl: string;
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
  const [attachments, setAttachments] = React.useState<IAttachment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const loadData = React.useCallback(async () => {
    // Only load data for edit/view modes
    if (mode === 'new') {
      setData({} as T);
      setOriginalItem(null);
      setAttachments([]);
      return;
    }

    // Validate itemId
    if (!itemId) {
      const error = new Error('itemId is required for edit/view modes');
      setError(error);
      if (onError) {
        onError(error, 'load');
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const timer = SPContext.logger.startTimer('useDynamicFormData.loadData');

      const list = getListByNameOrId(SPContext.sp, listId);

      // Build select fields
      const selectFields = fields.map((f) => f.internalName);

      // Add expand fields for complex types
      const expandFields: string[] = [];
      fields.forEach((field) => {
        if (field.isLookup || field.fieldType === 'User') {
          expandFields.push(field.internalName);
        }
      });

      // Load item
      let itemQuery = list.items.getById(itemId).select(...selectFields);

      if (expandFields.length > 0) {
        itemQuery = itemQuery.expand(...expandFields) as any;
      }

      const item = await itemQuery();

      setOriginalItem(item);

      // Extract field values
      const extractor = createSPExtractor(item);
      const formData: any = {};

      fields.forEach((field) => {
        try {
          // Get raw value from item - we don't use typed extractors here since we don't know the type
          const value = item[field.internalName];
          formData[field.internalName] = value;
        } catch (err) {
          SPContext.logger.warn(`Failed to extract field "${field.internalName}"`, err);
          formData[field.internalName] = null;
        }
      });

      setData(formData as T);

      // Load attachments
      try {
        const attachmentFiles = await list.items.getById(itemId).attachmentFiles();
        setAttachments(attachmentFiles);
      } catch (err) {
        SPContext.logger.warn('Failed to load attachments', err);
        setAttachments([]);
      }

      // Call onAfterLoad
      if (onAfterLoad) {
        onAfterLoad(formData as T, item);
      }

      const duration = timer();
      SPContext.logger.success(`Item data loaded successfully in ${duration}ms`, {
        itemId,
        fieldCount: fields.length,
        attachmentCount: attachments.length,
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      SPContext.logger.error('Failed to load item data', error, { listId, itemId });

      if (onError) {
        onError(error, 'load');
      }
    } finally {
      setLoading(false);
    }
  }, [listId, itemId, mode, fields, onAfterLoad, onError]);

  // Load data when dependencies change
  React.useEffect(() => {
    if (fields.length > 0) {
      loadData();
    }
  }, [loadData, fields.length]);

  return {
    data,
    originalItem,
    attachments,
    loading,
    error,
    reload: loadData,
  };
}
