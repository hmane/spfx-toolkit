import * as React from 'react';
import { FieldValues } from 'react-hook-form';
import { SPContext } from '../../../utilities/context';
import { createSPUpdater } from '../../../utilities/listItemHelper';
import { IFormSubmitResult } from '../SPDynamicForm.types';

export interface IUseDynamicFormValidationOptions<T extends FieldValues = any> {
  mode: 'new' | 'edit' | 'view';
  listId: string;
  itemId?: number;
  originalItem: any;
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
  const { mode, listId, itemId, originalItem, filesToAdd, filesToDelete, onBeforeSubmit, onError } =
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

  /**
   * Prepares the form submission result
   */
  const prepareSubmitResult = React.useCallback(
    async (formData: T): Promise<IFormSubmitResult<T> | null> => {
      try {
        const timer = SPContext.logger.startTimer('useDynamicFormValidation.prepareSubmitResult');

        // Create SPUpdater for change detection
        const updater = createSPUpdater();

        // Apply all form values to updater (with original values for change detection)
        Object.keys(formData).forEach((key) => {
          const originalValue = mode === 'edit' && originalItem ? originalItem[key] : undefined;
          updater.set(key, formData[key], originalValue);
        });

        // Get updates (only changed fields)
        const updates = updater.getUpdates();
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
    [mode, listId, itemId, originalItemStr, filesToAddStr, filesToDeleteStr]
  );

  return {
    prepareSubmitResult,
  };
}
