import * as React from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { ISPDynamicFormProps, IFormButtonProps, SPDynamicFormHandle } from './SPDynamicForm.types';
import { useDynamicFormFields } from './hooks/useDynamicFormFields';
import { useDynamicFormData } from './hooks/useDynamicFormData';
import { useDynamicFormDataMulti } from './hooks/useDynamicFormDataMulti';
import { reconcileAllFields } from './utilities/multiItemReconciler';
import { buildMultiItemSubmitter } from './utilities/multiItemSubmitter';
import { useDynamicFormValidation } from './hooks/useDynamicFormValidation';
import { SPDynamicFormField } from './components/SPDynamicFormField';
import { SPDynamicFormSection } from './components/SPDynamicFormSection';
import { SPDynamicFormContentTypePicker } from './components/SPDynamicFormContentTypePicker';
import { SPDynamicFormSavePreview } from './components/SPDynamicFormSavePreview';
import { SPListItemAttachments } from '../SPListItemAttachments';
import { Stack } from '@fluentui/react/lib/Stack';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { SPContext } from '../../utilities/context';
import { applyFieldOverrides, collectWatchedFieldNames } from './utilities/fieldConfigBuilder';
import { IFieldOverride } from './SPDynamicForm.types';
import { IOverrideContext } from './utilities/resolveOverrideValue';
import { fieldMatches, effectiveMatcher } from './utilities/fieldOverrideMatcher';
import { FormProvider as SPFormProvider } from '../spForm/context/FormContext';
import FormErrorSummary from '../spForm/FormErrorSummary/FormErrorSummary';
import './SPDynamicForm.css';
import '../spForm/spfxForm.css';

/**
 * SPDynamicForm - Dynamically generates forms from SharePoint list/library metadata
 * Supports New/Edit/View modes with automatic field rendering and validation
 */
function SPDynamicFormInner<T extends Record<string, any> = any>(
  props: ISPDynamicFormProps<T>,
  ref: React.Ref<SPDynamicFormHandle>
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
    fieldExtensions,
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
    availableContentTypes: availableContentTypesProp,
    onContentTypeChange,
    hideContentTypePicker,
    enableDirtyCheck = false,
    confirmOnCancel = false,
    confirmMessage = 'You have unsaved changes. Are you sure you want to cancel?',
    scrollToError = true,
    showFieldHelp = true,
    onFieldLoadTransform,
    debug,
    onResolvedField,
    multiItem,
    onMultiItemSubmit,
  } = props;

  // State for attachment operations
  const [filesToAdd, setFilesToAdd] = React.useState<File[]>([]);
  const [filesToDelete, setFilesToDelete] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Backward-compat: fold legacy `customFields[]` into the unified override list,
  // logging a one-time deprecation warning per session.
  const customFieldsDeprecationWarnedRef = React.useRef(false);
  React.useEffect(() => {
    if (customFields && customFields.length > 0 && !customFieldsDeprecationWarnedRef.current) {
      customFieldsDeprecationWarnedRef.current = true;
      SPContext.logger.warn(
        'SPDynamicForm: `customFields` is deprecated and will be removed in v2. Use `fieldOverrides[].render` instead.',
        { count: customFields.length }
      );
    }
  }, [customFields]);

  const customContentDeprecationWarnedRef = React.useRef(false);
  React.useEffect(() => {
    if (customContent && customContent.length > 0 && !customContentDeprecationWarnedRef.current) {
      customContentDeprecationWarnedRef.current = true;
      SPContext.logger.warn(
        'SPDynamicForm: `customContent` is deprecated and will be removed in v2. Use `fieldExtensions` instead.',
        { count: customContent.length }
      );
    }
  }, [customContent]);

  const mergedOverrides = React.useMemo<IFieldOverride[]>(() => {
    const fromCustomFields: IFieldOverride[] = (customFields || []).map((cf) => ({
      field: cf.field,
      fieldName: cf.fieldName,
      render: cf.render,
    }));
    return [...fromCustomFields, ...(fieldOverrides || [])];
  }, [customFields, fieldOverrides]);

  // Memoize error callback to prevent infinite loops
  const handleFieldLoadError = React.useCallback((err: Error) => {
    onError?.(err, 'load');
  }, [onError]);

  const handleDataLoadError = React.useCallback((err: Error) => {
    onError?.(err, 'load');
  }, [onError]);

  // Effective content type. Explicit prop wins; in edit/view mode we adopt the
  // item's actual ContentTypeId once it loads (filled in by the effect below,
  // after useDynamicFormData returns). On first render this is just `contentTypeId`
  // (or undefined → list-level fields); when adoption flips it, useDynamicFormFields
  // re-keys and reloads with the correct CT, and resetKey re-resets the form.
  const [adoptedItemCt, setAdoptedItemCt] = React.useState<string | undefined>(undefined);
  const resolvedContentTypeId: string | undefined = contentTypeId ?? adoptedItemCt;

  // Load fields
  const {
    fields,
    sections,
    useSections,
    supportsAttachments,
    availableContentTypes: discoveredContentTypes,
    loading: fieldsLoading,
    error: fieldsError,
  } = useDynamicFormFields({
    listId,
    mode,
    contentTypeId: resolvedContentTypeId,
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
    onError: handleFieldLoadError,
    onFieldLoadTransform,
  });

  // Don't include fields in dependency to prevent infinite loops
  // The parent's onAfterLoad already has access to fields if needed
  const fieldsRef = React.useRef(fields);
  const hasTriggeredAfterLoadRef = React.useRef(false);
  React.useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  React.useEffect(() => {
    hasTriggeredAfterLoadRef.current = false;
  }, [listId, itemId, mode, resolvedContentTypeId, fields]);

  const handleDataAfterLoad = React.useCallback((data: any, item: any) => {
    if (onAfterLoad && !hasTriggeredAfterLoadRef.current) {
      hasTriggeredAfterLoadRef.current = true;
      onAfterLoad(data as T, fieldsRef.current);
    }
  }, [onAfterLoad]);

  // Load data (for edit/view modes)
  const {
    data: itemData,
    originalItem,
    itemContentTypeId,
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

  // Multi-item mode: load all selected items in parallel and reconcile shared values.
  const isMultiItem = !!multiItem && Array.isArray(multiItem.itemIds) && multiItem.itemIds.length > 0;
  const multiItemIds = isMultiItem ? multiItem!.itemIds : [];

  const multiData = useDynamicFormDataMulti(
    listId,
    isMultiItem ? multiItemIds : [],
    fields
  );

  const reconciled = React.useMemo(() => {
    if (!isMultiItem) return null;
    return reconcileAllFields(
      fields,
      multiData.items,
      multiItemIds,
      multiItem?.reconcileMode || 'shared'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiItem, fields, multiData.items, multiItemIds.join(','), multiItem?.reconcileMode]);

  // Adoption effect for resolvedContentTypeId — the state + computed value are
  // hoisted above useDynamicFormFields. Once useDynamicFormData reports the
  // item's actual ContentTypeId, flip `adoptedItemCt` so the field hook re-keys
  // and reloads with the correct CT. Skip when an explicit `contentTypeId` prop
  // was passed.
  React.useEffect(() => {
    if (mode === 'new') return;
    if (contentTypeId) return;
    if (!itemContentTypeId) return;
    if (adoptedItemCt === itemContentTypeId) return;
    setAdoptedItemCt(itemContentTypeId);
  }, [mode, contentTypeId, itemContentTypeId, adoptedItemCt]);

  // In new mode, if no explicit CT prop, default to the list's default CT once discovered.
  React.useEffect(() => {
    if (mode !== 'new') return;
    if (contentTypeId) return;
    if (adoptedItemCt) return;
    const dflt = discoveredContentTypes.find((c) => c.default);
    if (dflt) setAdoptedItemCt(dflt.id);
  }, [mode, contentTypeId, adoptedItemCt, discoveredContentTypes]);

  // CT picker — narrows discovered CTs by `availableContentTypes` whitelist
  // (when supplied), and decides whether to render the picker at all.
  const ctOptionsToOffer = React.useMemo(() => {
    if (!availableContentTypesProp || availableContentTypesProp.length === 0) {
      return discoveredContentTypes;
    }
    const allow = new Set(availableContentTypesProp);
    return discoveredContentTypes.filter((c) => allow.has(c.id));
  }, [discoveredContentTypes, availableContentTypesProp]);

  const showCtPicker =
    mode === 'new' && !hideContentTypePicker && !contentTypeId && ctOptionsToOffer.length > 1;

  const handleCtPickerChange = React.useCallback(
    (id: string) => {
      setAdoptedItemCt(id);
      if (onContentTypeChange) onContentTypeChange(id);
    },
    [onContentTypeChange]
  );

  // Build default values — multi-item mode pre-fills shared values; new mode applies schema defaults.
  const defaultValues = React.useMemo(() => {
    if (isMultiItem && reconciled) {
      return reconciled.values as T;
    }

    if (mode !== 'new') {
      return {} as T;
    }

    const defaults: any = {};
    fields.forEach((field) => {
      // Apply field override default value first (static only — function form
      // is evaluated per-render by applyFieldOverrides, not at init time).
      const override = mergedOverrides.find((o) => o.fieldName === field.internalName || o.field === field.internalName);
      const staticDefault = typeof override?.defaultValue !== 'function' ? override?.defaultValue : undefined;
      if (staticDefault !== undefined) {
        defaults[field.internalName] = staticDefault;
      } else if (field.defaultValue !== undefined && field.defaultValue !== null) {
        defaults[field.internalName] = field.defaultValue;
      }
    });

    return defaults as T;
  }, [isMultiItem, reconciled, mode, fields, mergedOverrides]);

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
    formState: { errors, isDirty, isValid, isSubmitting: formIsSubmitting, dirtyFields },
    reset,
    watch,
    getValues,
    setValue,
    setError: setFieldError,
    clearErrors,
  } = form;

  // Track which record (listId + itemId + mode + CT + field-set size) we last
  // reset for. The reset effect only fires when this key changes — protecting
  // in-progress edits from being wiped by parent re-renders that happen to
  // change a prop reference (most commonly an inline `fieldOverrides={[...]}`
  // literal which recomputes `defaultValues` on identity, even when the
  // underlying data is identical). When CT changes mid-edit (item adopted CT
  // or explicit prop change), the key flips and the form re-resets to the new
  // schema's defaults.
  const lastResetKeyRef = React.useRef<string | null>(null);
  const resetKey = React.useMemo(
    () =>
      `${listId}|${
        isMultiItem ? `multi:${multiItemIds.join(',')}` : itemId ?? 'new'
      }|${mode}|${resolvedContentTypeId ?? ''}|${fields.length}`,
    [listId, isMultiItem, multiItemIds, itemId, mode, resolvedContentTypeId, fields.length]
  );

  // Reset form when the record being edited actually changes (not on every
  // parent re-render). See `resetKey` above for the rationale.
  //
  // IMPORTANT: only mark the resetKey as "applied" AFTER an actual reset
  // happens. In edit/view mode the field metadata typically loads before the
  // item data, so this effect can fire once with `itemData === null`. If we
  // marked the key prematurely, the later effect run (when itemData arrives)
  // would early-return and the form would stay empty/stale.
  React.useEffect(() => {
    if (fields.length === 0) return; // wait for fields to load
    if (lastResetKeyRef.current === resetKey) return; // same record — don't clobber

    // Multi-item mode — wait until reconciled values are ready, then reset.
    if (isMultiItem) {
      if (!reconciled) return;
      lastResetKeyRef.current = resetKey;
      SPContext.logger.info('🔄 Resetting form for MULTI-ITEM mode', {
        itemCount: multiItemIds.length,
        fieldCount: Object.keys(reconciled.values).length,
      });
      reset(reconciled.values as any, { keepDefaultValues: false });
      return;
    }

    if (mode === 'new') {
      // For new mode, the fields-loaded state IS the right state to mark — empty
      // defaults are still a valid resolved state for a brand-new item.
      lastResetKeyRef.current = resetKey;
      if (Object.keys(defaultValues).length > 0) {
        SPContext.logger.info('🔄 Resetting form for NEW mode', {
          defaultValues,
          fieldCount: Object.keys(defaultValues).length,
        });
        reset(defaultValues as any, { keepDefaultValues: true });
      }
      return;
    }

    // Edit / view mode — wait until itemData has actually loaded before marking
    // the key. Until then, this effect will re-fire (deps include itemData) and
    // try again. Once itemData arrives, we reset with it AND mark the key so
    // future parent re-renders no longer trigger a reset.
    if (itemData) {
      lastResetKeyRef.current = resetKey;
      SPContext.logger.info('🔄 Resetting form for EDIT/VIEW mode', {
        mode,
        itemData,
        fieldCount: Object.keys(itemData).length,
        fields: Object.keys(itemData),
      });
      reset(itemData as any, { keepDefaultValues: false });
    }
  }, [resetKey, defaultValues, itemData, mode, reset, fields.length, isMultiItem, reconciled, multiItemIds.length]);

  React.useEffect(() => {
    if (!onAfterLoad || hasTriggeredAfterLoadRef.current) {
      return;
    }

    if (mode !== 'new' || fieldsLoading || dataLoading || fields.length === 0) {
      return;
    }

    hasTriggeredAfterLoadRef.current = true;
    onAfterLoad(defaultValues as T, fields);
  }, [onAfterLoad, mode, fieldsLoading, dataLoading, fields, defaultValues]);

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
    fields,
    contentTypeId: resolvedContentTypeId,
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

  React.useEffect(() => {
    if (!enableDirtyCheck || !isDirty || isSubmitting || mode === 'view') {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enableDirtyCheck, isDirty, isSubmitting, mode]);

  // Handle form submission
  const handleFormSubmit = React.useCallback(
    async (formData: T) => {
      try {
        setIsSubmitting(true);
        clearErrors(); // Clear previous errors

        // Multi-item mode: build a bulk submitter from only the dirty fields.
        if (isMultiItem) {
          const changedFieldNames = Object.keys(dirtyFields).filter((k) => (dirtyFields as any)[k]);
          const dirtyValues: Record<string, unknown> = {};
          changedFieldNames.forEach((name) => {
            dirtyValues[name] = (formData as any)[name];
          });

          const result = buildMultiItemSubmitter(listId, multiItemIds, dirtyValues, fields);

          if (onMultiItemSubmit) {
            await onMultiItemSubmit(result);
          } else {
            throw new Error('SPDynamicForm: multi-item mode requires onMultiItemSubmit');
          }
          return;
        }

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
    [prepareSubmitResult, onSubmit, onError, runCustomValidation, clearErrors,
     isMultiItem, dirtyFields, listId, multiItemIds, fields, onMultiItemSubmit]
  );

  // Revert a single field back to its reconciled (shared) value.
  const handleRevertField = React.useCallback(
    (fieldName: string) => {
      if (!isMultiItem || !reconciled) return;
      setValue(fieldName as any, (reconciled.values as any)[fieldName] as any, {
        shouldDirty: false,
        shouldValidate: false,
      });
    },
    [isMultiItem, reconciled, setValue]
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

  // Expose imperative handle so parent components can call submit/reset/etc via ref.
  React.useImperativeHandle(
    ref,
    (): SPDynamicFormHandle => ({
      submit: async () => {
        await new Promise<void>((resolve, reject) => {
          handleSubmit(async (data) => {
            try {
              await handleFormSubmit(data);
              resolve();
            } catch (e) {
              reject(e);
            }
          }, () => {
            // RHF calls the second handler on validation failure — resolve normally;
            // the form already surfaces validation errors to the user.
            resolve();
          })();
        });
      },
      reset: (values) => reset((values as any) || initialFormValues || {}),
      scrollToField: (name, options) => {
        const el = document.querySelector(`[data-field-name="${name}"]`) as HTMLElement | null;
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (options?.focus) {
          const focusable = el.querySelector<HTMLElement>('input, textarea, [tabindex]');
          focusable?.focus();
        }
      },
      setFieldValue: (name, value, opts) => setValue(name as any, value as any, opts),
      getFormValues: () => getValues(),
    }),
    [handleSubmit, handleFormSubmit, reset, initialFormValues, setValue, getValues]
  );

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

  // Compatibility-mode trigger for visibility rules: if ANY rule omits `dependsOn`,
  // we fall back to whole-form watching (v1 behaviour). Mixing narrow + wide
  // subscriptions in the same form would be brittle, so a single omission flips
  // the whole form into compat mode. Authors who want the perf win add `dependsOn`
  // to every rule.
  const hasUndeclaredVisibilityRule = React.useMemo(() => {
    const ruleHasNone = !!(fieldVisibilityRules || []).find(
      (r) => !r.dependsOn || r.dependsOn.length === 0
    );
    const extHasNone = !!(fieldExtensions || []).find(
      (e) => e.compute && (!e.dependsOn || e.dependsOn.length === 0)
    );
    const legacyCustomContentNeedsAllValues = !!(customContent || []).find(
      (c) => c.showWhen || c.render
    );
    return ruleHasNone || extHasNone || legacyCustomContentNeedsAllValues;
  }, [fieldVisibilityRules, fieldExtensions, customContent]);

  // Log a one-time warning when compat mode is active, so consumers see a clear
  // migration path. The ref guards against repeating the warning on every render.
  const visibilityCompatWarnedRef = React.useRef(false);
  React.useEffect(() => {
    if (hasUndeclaredVisibilityRule && !visibilityCompatWarnedRef.current) {
      visibilityCompatWarnedRef.current = true;
      SPContext.logger.warn(
        'SPDynamicForm: legacy whole-form watching is active for fieldVisibilityRules/customContent without declared dependencies.'
      );
    }
  }, [hasUndeclaredVisibilityRule]);

  // Narrow-mode dependent field names. Only consulted when compat mode is OFF.
  // collectWatchedFieldNames unions: matched fields from overrides/rules + their
  // explicit dependsOn lists — so function-form props re-evaluate when any
  // dependency changes.
  const dependentFieldNames = React.useMemo(() => {
    if (hasUndeclaredVisibilityRule) return []; // compat mode — useWatch receives undefined and returns all values
    return collectWatchedFieldNames({
      fields,
      overrides: mergedOverrides,
      visibilityRules: fieldVisibilityRules,
      extensions: fieldExtensions,
    });
  }, [hasUndeclaredVisibilityRule, fields, mergedOverrides, fieldVisibilityRules, fieldExtensions]);

  // One useWatch call. `name` undefined → returns the entire form values object
  // (compat mode). `name` array → returns an array in that order (narrow mode).
  // Switching `name` between renders is safe — the hook is always called.
  const watched = useWatch({
    control,
    name: hasUndeclaredVisibilityRule ? undefined : (dependentFieldNames as any),
  });

  const watchedValuesByName = React.useMemo(() => {
    if (hasUndeclaredVisibilityRule) {
      // Compat mode: useWatch returned the full values object (or undefined initially).
      return (watched as Record<string, unknown> | undefined) || {};
    }
    // Narrow mode: useWatch returned an array aligned with dependentFieldNames.
    const out: Record<string, unknown> = {};
    if (Array.isArray(watched)) {
      dependentFieldNames.forEach((name, i) => {
        out[name] = (watched as unknown[])[i];
      });
    }
    return out;
  }, [watched, hasUndeclaredVisibilityRule, dependentFieldNames]);

  // Stable user snapshot for override context — only changes when the user identity
  // itself changes (which in practice never happens mid-session).
  // Note: IPrincipal uses `title` for the display name, not `displayName`.
  const overrideUserInfo = React.useMemo(
    () => ({
      loginName: SPContext.currentUser?.loginName,
      email: SPContext.currentUser?.email,
      displayName: SPContext.currentUser?.title,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Override context built per-render so function-form props (disabled, hidden,
  // required, etc.) see the current form state. `field` is set per-field inside
  // applyFieldOverrides itself.
  const overrideCtx = React.useMemo(
    (): IOverrideContext => ({
      field: undefined as any, // set per-field inside applyFieldOverrides
      formValues: watchedValuesByName,
      mode,
      user: overrideUserInfo,
      contentTypeId: resolvedContentTypeId,
    }),
    [watchedValuesByName, mode, overrideUserInfo, resolvedContentTypeId]
  );

  // Apply overrides reactively against the current form state — function-form
  // disabled/hidden/required/etc. evaluate fresh each render. The watched subset
  // (built from collectWatchedFieldNames) keeps re-renders narrow when every
  // rule/override declares dependsOn; otherwise the form is in compat mode and
  // watchedValuesByName is the full snapshot.
  const finalFields = React.useMemo(
    () => applyFieldOverrides(fields, mergedOverrides, overrideCtx),
    [fields, mergedOverrides, overrideCtx]
  );

  // Emit debug logs / call onResolvedField for each resolved field after override application.
  React.useEffect(() => {
    if (!debug && !onResolvedField) return;
    finalFields.forEach((resolved, i) => {
      const orig = fields[i] ?? resolved;
      if (onResolvedField) {
        try {
          onResolvedField(resolved, orig);
        } catch {
          // swallow consumer callback errors — don't break render
        }
      }
      if (debug) {
        SPContext.logger.info('SPDynamicForm:debug field resolved', {
          field: resolved.internalName,
          label: resolved.displayName,
          hidden: resolved.hidden,
          required: resolved.required,
          readOnly: resolved.readOnly,
          defaultValue: resolved.defaultValue,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalFields, debug, onResolvedField]);

  // Check field visibility
  const isFieldVisible = React.useCallback(
    (field: any): boolean => {
      if (!fieldVisibilityRules || fieldVisibilityRules.length === 0) {
        return true;
      }

      // Honour both the new `field` matcher (string | RegExp | function) and the
      // deprecated `fieldName` alias via `effectiveMatcher`. Without this, regex
      // and function matchers on visibility rules silently no-op.
      const rule = fieldVisibilityRules.find((r) => {
        const m = effectiveMatcher(r);
        return m !== null && fieldMatches(m, field);
      });
      if (!rule) {
        return true;
      }

      try {
        return rule.showWhen(watchedValuesByName);
      } catch (error) {
        SPContext.logger.error(
          `Error evaluating visibility rule for field "${field.internalName}"`,
          error as Error
        );
        return true; // Show field on error
      }
    },
    [fieldVisibilityRules, watchedValuesByName]
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

  // Render field with visibility check.
  // `field` here is already an override-resolved IFieldMetadata from `finalFields`.
  const renderField = (field: any) => {
    // Check visibility
    if (!isFieldVisible(field)) {
      return null;
    }

    // Find the first merged override that has a render function for this field.
    // mergedOverrides = [customFields-as-overrides, ...fieldOverrides], so legacy
    // customFields renderers are found here too.
    const renderOverride = mergedOverrides.find((o) => {
      const m = effectiveMatcher(o);
      return m !== null && o.render !== undefined && fieldMatches(m, field);
    });

    // Find the first override that matches (for non-render props forwarded to SPDynamicFormField).
    const fieldOverride = mergedOverrides.find((o) => {
      const m = effectiveMatcher(o);
      return m !== null && fieldMatches(m, field);
    });

    return (
      <SPDynamicFormField
        key={field.internalName}
        field={field}
        control={control}
        mode={mode}
        listId={listId}
        override={fieldOverride}
        customRenderer={renderOverride ? { field: renderOverride.field, fieldName: renderOverride.fieldName, render: renderOverride.render! } : undefined}
        error={errors[field.internalName]?.message as string}
        disabled={externalDisabled || isSubmitting || externalReadOnly}
        readOnly={externalReadOnly || mode === 'view'}
        showHelp={showFieldHelp}
        form={form}
        fieldExtensions={fieldExtensions}
        watchedFormValues={watchedValuesByName}
        isMultiItem={isMultiItem}
        isDirty={isMultiItem && !!(dirtyFields as any)[field.internalName]}
        showHighlightOnDirty={multiItem?.highlightDirty !== false}
        showRevertControl={multiItem?.showRevertControls !== false}
        onRevertField={handleRevertField}
      />
    );
  };

  // Render custom content based on position
  const renderCustomContent = (position: number | string) => {
    if (!customContent || customContent.length === 0) {
      return null;
    }

    const currentValues = hasUndeclaredVisibilityRule
      ? watchedValuesByName
      : getValues();
    const matchingContent = customContent.filter((c) => {
      if (c.position === position) {
        // Check showWhen condition
        if (c.showWhen) {
          try {
            return c.showWhen(currentValues as T);
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
            {content.render(currentValues as T)}
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

    // Render fields with custom content — iterate finalFields (override-resolved)
    finalFields.forEach((field, index) => {
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
      const renderedField = renderField(field);
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

          section.fields.forEach((field) => {
            // Resolve the override-applied version of this field from finalFields.
            const resolvedField = finalFields.find((f) => f.internalName === field.internalName) ?? field;

            // Custom content before field
            const beforeContent = renderCustomContent(`before:${resolvedField.internalName}`);
            if (beforeContent) {
              sectionElements.push(
                <React.Fragment key={`before-${resolvedField.internalName}`}>
                  {beforeContent}
                </React.Fragment>
              );
            }

            // Field
            const renderedField = renderField(resolvedField);
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

    // Optional save preview (multi-item only, opt-in via multiItem.showSavePreview).
    // Lists what will be written to the N selected items so the user can confirm
    // before kicking off a bulk update.
    const savePreview =
      isMultiItem && multiItem?.showSavePreview ? (
        <SPDynamicFormSavePreview
          itemCount={multiItemIds.length}
          changedFieldLabels={Object.keys(dirtyFields)
            .filter((k) => (dirtyFields as any)[k])
            .map((name) => fields.find((f) => f.internalName === name)?.displayName || name)}
        />
      ) : null;

    if (renderButtons) {
      return (
        <>
          {savePreview}
          {renderButtons(buttonProps)}
        </>
      );
    }

    if (mode === 'view') {
      return null;
    }

    return (
      <>
        {savePreview}
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
      </>
    );
  };

  // Loading state
  const isLoading = fieldsLoading || dataLoading || (isMultiItem && multiData.loading) || externalLoading;

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
  const loadError = isMultiItem ? (multiData.error ? new Error(multiData.error) : null) : null;
  const error = fieldsError || dataError || loadError;
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
        <SPFormProvider control={control} autoShowErrors={true}>
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <Stack tokens={{ childrenGap: 20 }}>
              {showCtPicker && (
                <SPDynamicFormContentTypePicker
                  options={ctOptionsToOffer}
                  selectedId={resolvedContentTypeId}
                  onChange={handleCtPickerChange}
                  disabled={fieldsLoading || dataLoading || isSubmitting}
                />
              )}

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

// forwardRef + generics workaround — cast the wrapped component back to the generic signature.
export const SPDynamicForm = React.forwardRef(SPDynamicFormInner) as <
  T extends Record<string, any> = any
>(
  props: ISPDynamicFormProps<T> & { ref?: React.Ref<SPDynamicFormHandle> }
) => ReturnType<typeof SPDynamicFormInner>;

(SPDynamicForm as any).displayName = 'SPDynamicForm';
