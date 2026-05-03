import * as React from 'react';
import { FieldValues } from 'react-hook-form';
import { SPContext } from '../../../utilities/context';
import { createSPUpdater } from '../../../utilities/listItemHelper';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { IFormSubmitResult } from '../SPDynamicForm.types';
import { fieldValueChanged } from '../utilities/changeDetection';
import { IFieldMetadata } from '../types/fieldMetadata';

export interface IUseDynamicFormValidationOptions<T extends FieldValues = any> {
  mode: 'new' | 'edit' | 'view';
  listId: string;
  itemId?: number;
  originalItem: any;
  /**
   * Field metadata for the loaded list/CT. Used by shape-aware change detection
   * so lookup/user/taxonomy/URL/multi-choice fields are only flagged as changed
   * when their semantic value actually differs (not just their object shape).
   */
  fields: IFieldMetadata[];
  /**
   * Effective ContentTypeId. When set in `mode === 'new'`, the submit result's
   * `updates` payload includes `ContentTypeId` so the new item lands on the right CT.
   * In edit mode this is informational only — we don't rewrite the CT of an existing item.
   */
  contentTypeId?: string;
  filesToAdd: File[];
  filesToDelete: string[];
  onBeforeSubmit?: (data: T, changes: Partial<T>) => Promise<void | boolean>;
  onError?: (error: Error, context: 'validation' | 'submit') => void;
}

/**
 * Custom hook to handle form validation and submission preparation
 */
export function useDynamicFormValidation<T extends FieldValues = any>(
  options: IUseDynamicFormValidationOptions<T>
) {
  const { mode, listId, itemId, originalItem, fields, contentTypeId, filesToAdd, filesToDelete, onBeforeSubmit, onError } =
    options;

  // Use refs for callbacks and array dependencies to prevent infinite loops
  const onBeforeSubmitRef = React.useRef(onBeforeSubmit);
  const onErrorRef = React.useRef(onError);

  React.useEffect(() => {
    onBeforeSubmitRef.current = onBeforeSubmit;
    onErrorRef.current = onError;
  }, [onBeforeSubmit, onError]);

  // Create stable references for array/object dependencies
  const filesToAddStr = React.useMemo(
    () => JSON.stringify(filesToAdd.map((f) => f.name)),
    [filesToAdd]
  );
  const filesToDeleteStr = React.useMemo(() => JSON.stringify(filesToDelete), [filesToDelete]);
  const originalItemStr = React.useMemo(() => JSON.stringify(originalItem || {}), [originalItem]);
  const fieldsStr = React.useMemo(
    // Include fieldType so a CT swap that keeps the same internal names but
    // changes the type (e.g. site-column re-bound on a child CT) still
    // invalidates the closure and rebuilds `fieldsByName` with fresh metadata.
    () => JSON.stringify(fields.map((f) => `${f.internalName}:${f.fieldType}`)),
    [fields]
  );

  /**
   * Prepares the form submission result
   */
  const prepareSubmitResult = React.useCallback(
    async (formData: T): Promise<IFormSubmitResult<T> | null> => {
      try {
        const timer = SPContext.logger.startTimer('useDynamicFormValidation.prepareSubmitResult');

        // Create SPUpdater for change detection
        const updater = createSPUpdater();

        // Apply form values to updater. In edit mode, use shape-aware change detection
        // to skip fields whose semantic value didn't actually change — this prevents
        // SPUpdater from emitting spurious entries when lookup/user/taxonomy/URL/multi-choice
        // fields have the same Id/TermGuid/etc. but different surrounding object shape
        // (server-expanded vs form-extracted).
        const fieldsByName = new Map(fields.map((f) => [f.internalName, f]));

        Object.keys(formData).forEach((key) => {
          const formValue = (formData as any)[key];
          const originalValue = mode === 'edit' && originalItem ? originalItem[key] : undefined;
          const fieldMeta = fieldsByName.get(key);

          if (mode === 'edit' && fieldMeta && originalItem) {
            // Skip fields that didn't actually change. Without this gate, SPUpdater
            // sees `{Id:5,Title:'A'} !== {Id:5,Title:'A',Modified:'...'}` and writes
            // unnecessary updates to SharePoint.
            if (!fieldValueChanged(fieldMeta, formValue, originalValue)) {
              return;
            }
          }

          updater.set(key, formValue, originalValue);
        });

        // Get updates (only changed fields)
        const updates = updater.getUpdates();

        // New-mode: ensure the new item is created on the resolved CT.
        if (mode === 'new' && contentTypeId) {
          (updates as any).ContentTypeId = contentTypeId;
        }

        const changes = updates as Partial<T>;
        const hasChanges = Object.keys(updates).length > 0 || filesToAdd.length > 0 || filesToDelete.length > 0;

        // Log changes
        if (mode === 'edit') {
          SPContext.logger.info(`Change detection: ${Object.keys(updates).length} field(s) changed`, {
            changes: Object.keys(updates),
          });
        }

        // Call onBeforeSubmit using ref
        if (onBeforeSubmitRef.current) {
          const proceed = await onBeforeSubmitRef.current(formData, changes);
          if (proceed === false) {
            SPContext.logger.info('Form submission cancelled by onBeforeSubmit');
            return null;
          }
        }

        // Create uploadAll helper function
        const uploadAllAttachments = async (targetItemId?: number) => {
          const effectiveItemId = targetItemId || itemId;
          const uploaded: string[] = [];
          const deleted: string[] = [];
          const errors: Array<{ fileName: string; error: string }> = [];

          if (!effectiveItemId) {
            throw new Error('Item ID is required to upload attachments. For new items, pass the new item ID.');
          }

          const sp = SPContext.tryGetSP();
          if (!sp) {
            throw new Error('SPContext not initialized');
          }

          const list = getListByNameOrId(sp, listId);
          const item = list.items.getById(effectiveItemId);

          // Upload new files
          for (const file of filesToAdd) {
            try {
              const buffer = await file.arrayBuffer();
              await item.attachmentFiles.add(file.name, buffer);
              uploaded.push(file.name);
              SPContext.logger.info(`Attachment uploaded: ${file.name}`);
            } catch (err: any) {
              errors.push({ fileName: file.name, error: err?.message || 'Upload failed' });
              SPContext.logger.error(`Failed to upload attachment: ${file.name}`, err);
            }
          }

          // Delete files
          for (const fileName of filesToDelete) {
            try {
              await item.attachmentFiles.getByName(fileName).delete();
              deleted.push(fileName);
              SPContext.logger.info(`Attachment deleted: ${fileName}`);
            } catch (err: any) {
              errors.push({ fileName, error: err?.message || 'Delete failed' });
              SPContext.logger.error(`Failed to delete attachment: ${fileName}`, err);
            }
          }

          return { uploaded, deleted, errors };
        };

        // Build result object
        const result: IFormSubmitResult<T> = {
          formData,
          changes,
          isValid: true,
          updater,
          updates,
          attachments: {
            filesToAdd,
            filesToDelete,
            uploadAll: uploadAllAttachments,
          },
          mode,
          itemId,
          listId,
          hasChanges,
        };

        const duration = timer();
        SPContext.logger.info(`Form submission prepared in ${duration}ms`, {
          hasChanges,
          changedFields: Object.keys(updates).length,
          attachmentsToAdd: filesToAdd.length,
          attachmentsToDelete: filesToDelete.length,
        });

        return result;
      } catch (err) {
        const error = err as Error;
        SPContext.logger.error('Failed to prepare form submission', error);

        if (onErrorRef.current) {
          onErrorRef.current(error, 'validation');
        }

        throw error;
      }
    },
    [mode, listId, itemId, originalItemStr, filesToAddStr, filesToDeleteStr, fieldsStr, contentTypeId]
  );

  return {
    prepareSubmitResult,
  };
}
