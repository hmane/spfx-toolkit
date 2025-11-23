import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { ISPDynamicFormProps, IFormButtonProps } from './SPDynamicForm.types';
import { useDynamicFormFields } from './hooks/useDynamicFormFields';
import { useDynamicFormData } from './hooks/useDynamicFormData';
import { useDynamicFormValidation } from './hooks/useDynamicFormValidation';
import { SPDynamicFormField } from './components/SPDynamicFormField';
import { SPDynamicFormSection } from './components/SPDynamicFormSection';
import { SPListItemAttachments } from '../SPListItemAttachments';
import { Stack } from '@fluentui/react/lib/Stack';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { SPContext } from '../../utilities/context';
import { FormProvider as SPFormProvider } from '../spForm/context/FormContext';
import FormErrorSummary from '../spForm/FormErrorSummary/FormErrorSummary';
import './SPDynamicForm.css';
import '../spForm/spfxForm.css';

/**
 * SPDynamicForm - Dynamically generates forms from SharePoint list/library metadata
 * Supports New/Edit/View modes with automatic field rendering and validation
 */
export function SPDynamicForm<T extends Record<string, any> = any>(
  props: ISPDynamicFormProps<T>
) {
  const {
    listId,
    mode,
    itemId,
    contentTypeId,
    fields: specifiedFields,
    excludeFields,
    fieldOrder,
    useContentTypeOrder = true,
    sections: manualSections,
    useContentTypeGroups = true,
    customContent,
    fieldVisibilityRules,
    fieldOverrides,
    customFields,
    lookupThreshold = 5000,
    lookupFieldConfig,
    customValidation,
    validationMode = 'onSubmit',
    compact = false,
    fieldSpacing,
    showDefaultButtons = true,
    renderButtons,
    saveButtonText = 'Save',
    cancelButtonText = 'Cancel',
    showAttachments,
    attachmentPosition = 'bottom',
    attachmentSectionName,
    maxAttachmentSize = 10,
    allowedFileTypes,
    loading: externalLoading,
    disabled: externalDisabled,
    readOnly: externalReadOnly,
    className,
    onSubmit,
    onBeforeLoad,
    onAfterLoad,
    onBeforeSubmit,
    onError,
    onCancel,
    onFieldChange,
    cacheFields = true,
    enableDirtyCheck = false,
    confirmOnCancel = false,
    confirmMessage = 'You have unsaved changes. Are you sure you want to cancel?',
    scrollToError = true,
    showFieldHelp = true,
  } = props;

  // State for attachment operations
  const [filesToAdd, setFilesToAdd] = React.useState<File[]>([]);
  const [filesToDelete, setFilesToDelete] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Memoize error callback to prevent infinite loops
  const handleFieldLoadError = React.useCallback((err: Error) => {
    onError?.(err, 'load');
  }, [onError]);

  const handleDataLoadError = React.useCallback((err: Error) => {
    onError?.(err, 'load');
  }, [onError]);

  // Load fields
  const {
    fields,
    sections,
    useSections,
    supportsAttachments,
    loading: fieldsLoading,
    error: fieldsError,
  } = useDynamicFormFields({
    listId,
    mode,
    contentTypeId,
    fields: specifiedFields,
    excludeFields,
    fieldOrder,
    useContentTypeOrder,
    sections: manualSections,
    useContentTypeGroups,
    fieldOverrides,
    lookupThreshold,
    lookupFieldConfig,
    cacheFields,
    onBeforeLoad,
    onAfterLoad: onAfterLoad as any,
    onError: handleFieldLoadError,
  });

  // Don't include fields in dependency to prevent infinite loops
  // The parent's onAfterLoad already has access to fields if needed
  const fieldsRef = React.useRef(fields);
  React.useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const handleDataAfterLoad = React.useCallback((data: any, item: any) => {
    if (onAfterLoad) {
      onAfterLoad(data as T, fieldsRef.current);
    }
  }, [onAfterLoad]);

  // Load data (for edit/view modes)
  const {
    data: itemData,
    originalItem,
    attachments,
    loading: dataLoading,
    error: dataError,
  } = useDynamicFormData({
    listId,
    itemId,
    mode,
    fields,
    onAfterLoad: handleDataAfterLoad,
    onError: handleDataLoadError,
  });

  // Build default values for new mode
  const defaultValues = React.useMemo(() => {
    if (mode !== 'new') {
      return {} as T;
    }

    const defaults: any = {};
    fields.forEach((field) => {
      // Apply field override default value first
      const override = fieldOverrides?.find((o) => o.fieldName === field.internalName);
      if (override?.defaultValue !== undefined) {
        defaults[field.internalName] = override.defaultValue;
      } else if (field.defaultValue !== undefined && field.defaultValue !== null) {
        defaults[field.internalName] = field.defaultValue;
      }
    });

    return defaults as T;
  }, [mode, fields, fieldOverrides]);

  // Determine initial form values based on mode and data availability
  const initialFormValues = React.useMemo(() => {
    if (mode === 'new') {
      return defaultValues;
    }
    // For edit/view modes, use itemData if available, otherwise empty object
    return itemData || ({} as T);
  }, [mode, defaultValues, itemData]);

  // Initialize react-hook-form
  const form = useForm<T>({
    mode: validationMode,
    reValidateMode: 'onChange',
    defaultValues: initialFormValues as any,
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid, isSubmitting: formIsSubmitting },
    reset,
    watch,
    setError: setFieldError,
    clearErrors,
  } = form;

  // Reset form when data loads - use keepDefaultValues to preserve unmodified fields
  React.useEffect(() => {
    if (mode === 'new' && Object.keys(defaultValues).length > 0) {
      SPContext.logger.info('🔄 Resetting form for NEW mode', {
        defaultValues,
        fieldCount: Object.keys(defaultValues).length
      });
      reset(defaultValues as any, { keepDefaultValues: true });
    } else if (itemData && mode !== 'new') {
      // For edit/view modes, reset with loaded data
      SPContext.logger.info('🔄 Resetting form for EDIT/VIEW mode', {
        mode,
        itemData,
        fieldCount: Object.keys(itemData).length,
        fields: Object.keys(itemData)
      });
      reset(itemData as any, { keepDefaultValues: false });
    }
  }, [itemData, defaultValues, reset, mode]);

  // Watch for field changes
  React.useEffect(() => {
    if (!onFieldChange) {
      return;
    }

    const subscription = watch((value, { name }) => {
      if (name) {
        onFieldChange(name, value[name], value as T);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, onFieldChange]);

  // Validation hook
  const { prepareSubmitResult } = useDynamicFormValidation({
    mode,
    listId,
    itemId,
    originalItem,
    filesToAdd,
    filesToDelete,
    onBeforeSubmit,
    onError: (err, context) => onError?.(err, context),
  });

  // Custom validation handler
  const runCustomValidation = React.useCallback(
    async (formData: T): Promise<boolean> => {
      if (!customValidation) {
        return true;
      }

      try {
        const validationErrors = await customValidation(formData);

        if (validationErrors && Object.keys(validationErrors).length > 0) {
          // Set field errors
          Object.entries(validationErrors).forEach(([field, message]) => {
            setFieldError(field as any, { type: 'custom', message: message as string });
          });

          SPContext.logger.warn('Custom validation failed', { errors: validationErrors });
          return false;
        }

        return true;
      } catch (error) {
        SPContext.logger.error('Custom validation threw error', error as Error);
        if (onError) {
          onError(error as Error, 'validation');
        }
        return false;
      }
    },
    [customValidation, setFieldError, onError]
  );

  // Scroll to first error
  const scrollToFirstError = React.useCallback(() => {
    if (!scrollToError) {
      return;
    }

    // Find first error in the form
    const firstErrorKey = Object.keys(errors)[0];
    if (!firstErrorKey) {
      return;
    }

    // Try to find the field element and scroll to it
    setTimeout(() => {
      const errorElement = document.querySelector(
        `[name="${firstErrorKey}"], [data-field="${firstErrorKey}"]`
      );

      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Try to focus the element if it's focusable
        if (errorElement instanceof HTMLElement && 'focus' in errorElement) {
          errorElement.focus();
        }
      }
    }, 100);
  }, [scrollToError, errors]);

  // Watch for errors and scroll to first one
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToFirstError();
    }
  }, [errors, scrollToFirstError]);

  // Handle form submission
  const handleFormSubmit = React.useCallback(
    async (formData: T) => {
      try {
        setIsSubmitting(true);
        clearErrors(); // Clear previous errors

        // Run custom validation
        const customValidationPassed = await runCustomValidation(formData);
        if (!customValidationPassed) {
          setIsSubmitting(false);
          return;
        }

        const result = await prepareSubmitResult(formData);

        if (result) {
          await onSubmit(result);
        }
      } catch (error) {
        SPContext.logger.error('Form submission failed', error as Error);
        if (onError) {
          onError(error as Error, 'submit');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [prepareSubmitResult, onSubmit, onError, runCustomValidation, clearErrors]
  );

  // Handle cancel
  const handleCancel = React.useCallback(() => {
    // Check if confirmation is needed
    if (confirmOnCancel && isDirty && !isSubmitting) {
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    if (onCancel) {
      onCancel();
    } else {
      reset(mode === 'new' ? defaultValues as any : itemData as any);
      setFilesToAdd([]);
      setFilesToDelete([]);
    }
  }, [
    confirmOnCancel,
    isDirty,
    isSubmitting,
    confirmMessage,
    onCancel,
    reset,
    itemData,
    defaultValues,
    mode,
  ]);

  // Handle attachment changes
  const handleAttachmentsChange = React.useCallback(
    (newFilesToAdd: File[], newFilesToDelete: string[]) => {
      setFilesToAdd(newFilesToAdd);
      setFilesToDelete(newFilesToDelete);
    },
    []
  );

  // Determine if attachments should be shown
  const shouldShowAttachments = React.useMemo(() => {
    if (showAttachments === false) {
      return false;
    }
    if (showAttachments === true) {
      return true;
    }
    return supportsAttachments;
  }, [showAttachments, supportsAttachments]);

  // Validate attachment section
  React.useEffect(() => {
    if (attachmentPosition === 'section' && attachmentSectionName && useSections) {
      const sectionExists = sections.some((s) => s.name === attachmentSectionName);
      if (!sectionExists) {
        SPContext.logger.warn(
          `Attachment section "${attachmentSectionName}" not found. Available sections: ${sections.map((s) => s.name).join(', ')}. Attachments will be placed at bottom.`
        );
      }
    }
  }, [attachmentPosition, attachmentSectionName, useSections, sections]);

  // Get current form values for visibility rules
  const formValues = watch();

  // Check field visibility
  const isFieldVisible = React.useCallback(
    (field: any): boolean => {
      if (!fieldVisibilityRules || fieldVisibilityRules.length === 0) {
        return true;
      }

      const rule = fieldVisibilityRules.find((r) => r.fieldName === field.internalName);
      if (!rule) {
        return true;
      }

      try {
        return rule.showWhen(formValues);
      } catch (error) {
        SPContext.logger.error(
          `Error evaluating visibility rule for field "${field.internalName}"`,
          error as Error
        );
        return true; // Show field on error
      }
    },
    [fieldVisibilityRules, formValues]
  );

  // Render attachments
  const renderAttachments = () => {
    if (!shouldShowAttachments) {
      return null;
    }

    return (
      <SPListItemAttachments
        listId={listId}
        itemId={itemId}
        mode={mode}
        maxFileSize={maxAttachmentSize}
        allowedExtensions={allowedFileTypes}
        disabled={externalDisabled || isSubmitting}
        label="Attachments"
        enableDragDrop={true}
        showPreviews={true}
        allowMultiple={true}
        onFilesAdded={(files) => {
          // For new mode, stage files for upload after item creation
          if (mode === 'new') {
            setFilesToAdd((prev) => [...prev, ...files]);
          }
        }}
        onFilesRemoved={(fileNames) => {
          // For edit mode, mark existing files for deletion
          if (mode === 'edit') {
            setFilesToDelete((prev) => [...prev, ...fileNames]);
          } else {
            // For new mode, remove from staged files
            setFilesToAdd((prev) => prev.filter(f => !fileNames.includes(f.name)));
          }
        }}
      />
    );
  };

  // Render field with visibility check
  const renderField = (field: any, index?: number) => {
    // Check visibility
    if (!isFieldVisible(field)) {
      return null;
    }

    const customFieldRenderer = customFields?.find((cf) => cf.fieldName === field.internalName);
    const fieldOverride = fieldOverrides?.find((fo) => fo.fieldName === field.internalName);

    return (
      <SPDynamicFormField
        key={field.internalName}
        field={field}
        control={control}
        mode={mode}
        listId={listId}
        override={fieldOverride}
        customRenderer={customFieldRenderer}
        error={errors[field.internalName]?.message as string}
        disabled={externalDisabled || isSubmitting || externalReadOnly}
        readOnly={externalReadOnly || mode === 'view'}
        showHelp={showFieldHelp}
        form={form}
      />
    );
  };

  // Render custom content based on position
  const renderCustomContent = (position: number | string) => {
    if (!customContent || customContent.length === 0) {
      return null;
    }

    const matchingContent = customContent.filter((c) => {
      if (c.position === position) {
        // Check showWhen condition
        if (c.showWhen) {
          try {
            return c.showWhen(formValues as T);
          } catch (error) {
            SPContext.logger.error('Error evaluating custom content showWhen', error as Error);
            return false;
          }
        }
        return true;
      }
      return false;
    });

    if (matchingContent.length === 0) {
      return null;
    }

    return (
      <React.Fragment>
        {matchingContent.map((content, index) => (
          <React.Fragment key={`custom-content-${position}-${index}`}>
            {content.render(formValues as T)}
          </React.Fragment>
        ))}
      </React.Fragment>
    );
  };

  // Render fields (flat layout) with custom content injection
  const renderFields = () => {
    const elements: React.ReactNode[] = [];

    // Top attachments
    if (attachmentPosition === 'top') {
      elements.push(
        <React.Fragment key="attachments-top">{renderAttachments()}</React.Fragment>
      );
    }

    // Render fields with custom content
    fields.forEach((field, index) => {
      // Custom content before field
      const beforeContent = renderCustomContent(`before:${field.internalName}`);
      if (beforeContent) {
        elements.push(
          <React.Fragment key={`before-${field.internalName}`}>{beforeContent}</React.Fragment>
        );
      }

      // Custom content at index
      const indexContent = renderCustomContent(index);
      if (indexContent) {
        elements.push(
          <React.Fragment key={`index-${index}`}>{indexContent}</React.Fragment>
        );
      }

      // Field
      const renderedField = renderField(field, index);
      if (renderedField) {
        elements.push(renderedField);
      }

      // Custom content after field
      const afterContent = renderCustomContent(`after:${field.internalName}`);
      if (afterContent) {
        elements.push(
          <React.Fragment key={`after-${field.internalName}`}>{afterContent}</React.Fragment>
        );
      }
    });

    // Bottom attachments
    if (attachmentPosition === 'bottom') {
      elements.push(
        <React.Fragment key="attachments-bottom">{renderAttachments()}</React.Fragment>
      );
    }

    // Determine spacing based on compact mode and custom spacing
    const spacing = fieldSpacing !== undefined ? fieldSpacing : compact ? 8 : 16;

    return (
      <div className="spfx-form-container">
        <Stack tokens={{ childrenGap: spacing }}>{elements}</Stack>
      </div>
    );
  };

  // Render sections with custom content
  const renderSections = () => {
    const persistenceKey = `SPDynamicForm_${listId}`;

    // Determine spacing based on compact mode and custom spacing
    const spacing = fieldSpacing !== undefined ? fieldSpacing : compact ? 8 : 16;

    return (
      <Stack tokens={{ childrenGap: spacing }}>
        {attachmentPosition === 'top' && renderAttachments()}
        {sections.map((section) => {
          // Check if attachments should be in this section
          const showAttachmentsInSection =
            attachmentPosition === 'section' && section.name === attachmentSectionName;

          // Build section content with custom content support
          const sectionElements: React.ReactNode[] = [];

          section.fields.forEach((field, index) => {
            // Custom content before field
            const beforeContent = renderCustomContent(`before:${field.internalName}`);
            if (beforeContent) {
              sectionElements.push(
                <React.Fragment key={`before-${field.internalName}`}>
                  {beforeContent}
                </React.Fragment>
              );
            }

            // Field
            const renderedField = renderField(field, index);
            if (renderedField) {
              sectionElements.push(renderedField);
            }

            // Custom content after field
            const afterContent = renderCustomContent(`after:${field.internalName}`);
            if (afterContent) {
              sectionElements.push(
                <React.Fragment key={`after-${field.internalName}`}>
                  {afterContent}
                </React.Fragment>
              );
            }
          });

          // Add attachments if in this section
          if (showAttachmentsInSection) {
            sectionElements.push(
              <React.Fragment key="attachments-section">{renderAttachments()}</React.Fragment>
            );
          }

          return (
            <SPDynamicFormSection
              key={section.name}
              section={section}
              persistenceKey={persistenceKey}
              compact={section.compact !== undefined ? section.compact : compact}
              fieldSpacing={spacing}
            >
              {sectionElements}
            </SPDynamicFormSection>
          );
        })}
        {attachmentPosition === 'bottom' && renderAttachments()}
      </Stack>
    );
  };

  // Render buttons
  const renderFormButtons = () => {
    if (!showDefaultButtons && !renderButtons) {
      return null;
    }

    // For save button, only disable if submitting or externally disabled
    // Don't use isValid here as it may be false before any validation runs
    const saveButtonDisabled = externalDisabled || isSubmitting;

    const buttonProps: IFormButtonProps = {
      onSave: handleSubmit(handleFormSubmit),
      onCancel: handleCancel,
      isSubmitting,
      isValid,
      isDirty,
      disabled: externalDisabled || isSubmitting,
    };

    if (renderButtons) {
      return renderButtons(buttonProps);
    }

    if (mode === 'view') {
      return null;
    }

    return (
      <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center">
        <PrimaryButton
          text={saveButtonText}
          onClick={buttonProps.onSave}
          disabled={saveButtonDisabled}
        />
        <DefaultButton
          text={cancelButtonText}
          onClick={buttonProps.onCancel}
          disabled={isSubmitting}
        />
        {enableDirtyCheck && isDirty && !isSubmitting && (
          <MessageBar messageBarType={MessageBarType.info} isMultiline={false}>
            You have unsaved changes
          </MessageBar>
        )}
      </Stack>
    );
  };

  // Loading state
  const isLoading = fieldsLoading || dataLoading || externalLoading;

  if (isLoading) {
    return (
      <div className={`sp-dynamic-form ${className || ''}`}>
        <Stack tokens={{ childrenGap: 16 }}>
          <Spinner size={SpinnerSize.large} label="Loading form..." />
        </Stack>
      </div>
    );
  }

  // Error state
  const error = fieldsError || dataError;
  if (error) {
    return (
      <div className={`sp-dynamic-form ${className || ''}`}>
        <MessageBar messageBarType={MessageBarType.error} isMultiline>
          <strong>Error loading form:</strong> {error.message}
        </MessageBar>
      </div>
    );
  }

  // No fields
  if (fields.length === 0) {
    return (
      <div className={`sp-dynamic-form ${className || ''}`}>
        <MessageBar messageBarType={MessageBarType.warning}>
          No fields available for this form
        </MessageBar>
      </div>
    );
  }

  // Render form
  // Two providers are required for full functionality:
  // - FormProvider (react-hook-form): provides form methods (register, setValue, etc.) to children via useFormContext()
  // - SPFormProvider (custom): provides field registry, error scroll handling, and SP-specific utilities
  return (
    <div className={`sp-dynamic-form sp-dynamic-form-${mode} ${className || ''}`}>
      <FormProvider {...form}>
        <SPFormProvider control={control} autoShowErrors={false}>
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <Stack tokens={{ childrenGap: 20 }}>
              {useSections ? renderSections() : renderFields()}

              {/* Error Summary - shows above buttons when there are validation errors */}
              {Object.keys(errors).length > 0 && (
                <FormErrorSummary
                  position="bottom"
                  showFieldLabels={true}
                  clickToScroll={scrollToError}
                  compact={compact}
                />
              )}

              {renderFormButtons()}
            </Stack>
          </form>
        </SPFormProvider>
      </FormProvider>
    </div>
  );
}

SPDynamicForm.displayName = 'SPDynamicForm';
