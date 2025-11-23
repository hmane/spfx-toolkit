import * as React from 'react';
import { FieldValues } from 'react-hook-form';
import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { createSPExtractor } from '../../../utilities/listItemHelper';
import { IFieldMetadata } from '../types/fieldMetadata';
import { SPFieldType } from '../../spFields/types';

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

  // Use refs for callbacks to prevent infinite loops
  const onAfterLoadRef = React.useRef(onAfterLoad);
  const onErrorRef = React.useRef(onError);

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
      setAttachments([]);
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

    try {
      setLoading(true);
      setError(null);

      const timer = SPContext.logger.startTimer('useDynamicFormData.loadData');

      const list = getListByNameOrId(SPContext.sp, listId);

      // Build select and expand fields for complex types
      // SharePoint REST API requires specific patterns for different field types:
      // - User fields: select "FieldName/Id,FieldName/Title,FieldName/EMail", expand "FieldName"
      // - Lookup fields: select "FieldName/Id,FieldName/Title", expand "FieldName"
      // - Simple fields: just select "FieldName"
      const selectFields: string[] = [];
      const expandFields: string[] = [];

      fields.forEach((field) => {
        const fieldType = field.fieldType as SPFieldType | string;
        const internalName = field.internalName;

        switch (fieldType) {
          case SPFieldType.User:
          case SPFieldType.UserMulti:
          case 'User':
          case 'UserMulti':
            // User fields need expanded properties for full user info
            selectFields.push(
              `${internalName}/Id`,
              `${internalName}/Title`,
              `${internalName}/EMail`,
              `${internalName}/Name`
            );
            expandFields.push(internalName);
            break;

          case SPFieldType.Lookup:
          case SPFieldType.LookupMulti:
          case 'Lookup':
          case 'LookupMulti':
            // Lookup fields need Id and the display field (usually Title)
            const displayField = field.fieldConfig?.lookupField || 'Title';
            selectFields.push(
              `${internalName}/Id`,
              `${internalName}/${displayField}`
            );
            expandFields.push(internalName);
            break;

          case SPFieldType.TaxonomyFieldType:
          case SPFieldType.TaxonomyFieldTypeMulti:
          case 'TaxonomyFieldType':
          case 'TaxonomyFieldTypeMulti':
            // Taxonomy fields - just select the field, SharePoint returns the value directly
            selectFields.push(internalName);
            break;

          default:
            // Simple fields - just select by name
            selectFields.push(internalName);
            break;
        }
      });

      // Load item with proper select/expand
      let itemQuery = list.items.getById(itemId).select(...selectFields);

      if (expandFields.length > 0) {
        itemQuery = itemQuery.expand(...expandFields) as any;
      }

      const item = await itemQuery();

      setOriginalItem(item);

      // Extract field values using SPExtractor for consistent format
      const extractor = createSPExtractor(item);
      const formData: any = {};

      SPContext.logger.info('🔍 SPDynamicForm: Starting field extraction', {
        itemId,
        fieldCount: fields.length,
        fieldNames: fields.map(f => f.internalName)
      });

      fields.forEach((field) => {
        try {
          let value: any;
          const rawValue = item[field.internalName];

          SPContext.logger.info(`📝 Extracting field: ${field.internalName}`, {
            fieldType: field.fieldType,
            rawValueType: typeof rawValue,
            rawValue: rawValue,
            isArray: Array.isArray(rawValue)
          });

          // Use extractor methods based on field type for consistent formatting
          switch (field.fieldType) {
            case 'Text':
              value = extractor.string(field.internalName);
              break;

            case 'Note':
              value = extractor.string(field.internalName);
              break;

            case 'Number':
            case 'Currency':
            case 'Integer':
            case 'Counter':
              value = extractor.number(field.internalName);
              break;

            case 'Boolean':
              value = extractor.boolean(field.internalName);
              break;

            case 'DateTime':
              value = extractor.date(field.internalName);
              break;

            case 'Choice':
              value = extractor.choice(field.internalName);
              break;

            case 'MultiChoice':
              value = extractor.multiChoice(field.internalName);
              break;

            case 'User':
              // Extract full IPrincipal object for SPUserField
              // SPUserField needs the full user object to display name, email, photo
              value = extractor.user(field.internalName) || null;
              break;

            case 'UserMulti':
              // Extract IPrincipal[] for SPUserField
              // SPUserField needs full user objects to display names, emails, photos
              value = extractor.userMulti(field.internalName);
              break;

            case 'Lookup':
              // Extract SPLookup and convert to {Id, Title} for SPLookupField
              const lookup = extractor.lookup(field.internalName);
              value = lookup && lookup.id ? { Id: lookup.id, Title: lookup.title || '' } : null;
              SPContext.logger.info(`🔗 Lookup field extracted: ${field.internalName}`, {
                extractedLookup: lookup,
                convertedValue: value
              });
              break;

            case 'LookupMulti':
              // Extract SPLookup[] and convert to {Id, Title}[] for SPLookupField
              const lookups = extractor.lookupMulti(field.internalName);
              value = lookups.map(l => ({ Id: l.id!, Title: l.title || '' }));
              SPContext.logger.info(`🔗 LookupMulti field extracted: ${field.internalName}`, {
                extractedLookups: lookups,
                convertedValue: value
              });
              break;

            case 'TaxonomyFieldType':
              // Extract SPTaxonomy for SPTaxonomyField
              const taxonomy = extractor.taxonomy(field.internalName);
              value = taxonomy ? {
                Label: taxonomy.label,
                TermGuid: taxonomy.termId,
                WssId: taxonomy.wssId
              } : null;
              break;

            case 'TaxonomyFieldTypeMulti':
              // Extract SPTaxonomy[] for SPTaxonomyField
              const taxonomies = extractor.taxonomyMulti(field.internalName);
              value = taxonomies.map(t => ({
                Label: t.label,
                TermGuid: t.termId,
                WssId: t.wssId
              }));
              break;

            case 'URL':
              // Extract SPUrl and convert to {Url, Description} for SPUrlField
              const urlObj = extractor.url(field.internalName);
              value = urlObj ? { Url: urlObj.url || '', Description: urlObj.description || '' } : null;
              break;

            default:
              // Fallback: get raw value
              value = item[field.internalName];
              SPContext.logger.warn(`Unsupported field type for extraction: ${field.fieldType}`, {
                field: field.internalName
              });
              break;
          }

          formData[field.internalName] = value;

          SPContext.logger.info(`✅ Field extracted successfully: ${field.internalName}`, {
            fieldType: field.fieldType,
            finalValue: value,
            valueType: typeof value
          });
        } catch (err) {
          SPContext.logger.error(`❌ Failed to extract field "${field.internalName}"`, err as Error);
          formData[field.internalName] = null;
        }
      });

      SPContext.logger.info('📦 Final form data prepared', {
        formData,
        fieldCount: Object.keys(formData).length
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

      // Call onAfterLoad using ref
      if (onAfterLoadRef.current) {
        onAfterLoadRef.current(formData as T, item);
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

      if (onErrorRef.current) {
        onErrorRef.current(error, 'load');
      }
    } finally {
      setLoading(false);
    }
  }, [listId, itemId, mode, fieldsStr]);

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
