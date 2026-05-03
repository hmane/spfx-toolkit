import * as React from 'react';
import { Control, UseFormReturn, useController } from 'react-hook-form';
import { IFieldMetadata } from '../types/fieldMetadata';
import { IFieldOverride, IFieldRenderProps, ICustomFieldRenderer, IFieldExtension } from '../SPDynamicForm.types';
import { SPFieldType } from '../../spFields/types';
import { useFieldExtensions } from '../hooks/useFieldExtensions';
import { SPDynamicFormFieldExtension } from './SPDynamicFormFieldExtension';
import { SPDynamicFormFieldRevert } from './SPDynamicFormFieldRevert';
import { buildFieldProps } from '../utilities/fieldConfigBuilder';
import { getLookupRenderMode } from '../utilities/lookupFieldOptimizer';
import { SPTextField, SPTextFieldMode } from '../../spFields/SPTextField';
import { SPNumberField } from '../../spFields/SPNumberField';
import { SPBooleanField } from '../../spFields/SPBooleanField';
import { SPDateField } from '../../spFields/SPDateField';
import { SPChoiceField } from '../../spFields/SPChoiceField';
import { SPUserField } from '../../spFields/SPUserField';
import { SPLookupField, SPLookupDisplayMode } from '../../spFields/SPLookupField';
import { SPUrlField } from '../../spFields/SPUrlField';
import { SPTaxonomyField } from '../../spFields/SPTaxonomyField';
import { SPDateTimeFormat } from '../../spFields/types';
import { Text } from '@fluentui/react/lib/Text';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { Icon } from '@fluentui/react/lib/Icon';
import { ErrorBoundary } from '../../ErrorBoundary';
import { SPContext } from '../../../utilities/context';
import FormItem from '../../spForm/FormItem/FormItem';
import FormLabel from '../../spForm/FormLabel/FormLabel';
import FormValue from '../../spForm/FormValue/FormValue';

export interface ISPDynamicFormFieldProps {
  field: IFieldMetadata;
  control: Control<any>;
  mode: 'new' | 'edit' | 'view';
  listId: string;
  override?: IFieldOverride;
  customRenderer?: ICustomFieldRenderer;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  showHelp?: boolean;
  form: UseFormReturn<any>;
  /** Field extensions to render before/after this field. */
  fieldExtensions?: IFieldExtension[];
  /** Watched form values snapshot (narrow or compat mode) for extension compute/render. */
  watchedFormValues?: Record<string, unknown>;
  /** Whether the form is in multi-item bulk-edit mode. */
  isMultiItem?: boolean;
  /** Whether this field has been modified since the shared value was pre-filled. */
  isDirty?: boolean;
  /** Visually highlight the row when `isDirty` is true. Default: true in multi-item mode. */
  showHighlightOnDirty?: boolean;
  /** Render the per-field revert (↺) button in multi-item mode. Default: true. */
  showRevertControl?: boolean;
  /** Called when the user clicks the revert button for this field. */
  onRevertField?: (fieldName: string) => void;
}

/**
 * Renders an individual form field based on its type
 */
export const SPDynamicFormField: React.FC<ISPDynamicFormFieldProps> = React.memo((props) => {
  const {
    field,
    control,
    mode,
    listId,
    override,
    customRenderer,
    error,
    disabled = false,
    readOnly = false,
    showHelp = true,
    form,
    fieldExtensions,
    watchedFormValues,
    isMultiItem = false,
    isDirty = false,
    showHighlightOnDirty = true,
    showRevertControl = true,
    onRevertField,
  } = props;

  // Use controller to get current value
  const { field: fieldState } = useController({
    name: field.internalName,
    control,
  });

  // Resolve extension runtimes (before/after) for this field
  const extensionRuntimes = useFieldExtensions(
    field,
    fieldExtensions,
    watchedFormValues || {},
    mode
  );

  const beforeExtensions = extensionRuntimes.filter((r) => r.extension.position === 'before');
  const afterExtensions = extensionRuntimes.filter(
    (r) => (r.extension.position || 'after') === 'after'
  );

  // Check if field should be hidden
  if (override?.hidden || field.hidden) {
    return null;
  }

  // Build base props for SPField components
  const fieldProps = buildFieldProps(field, mode, control, listId, override);
  fieldProps.disabled = disabled || fieldProps.disabled;
  fieldProps.readOnly = readOnly || fieldProps.readOnly;

  // Add data attributes for scroll-to-error and imperative scrollToField
  const dirtyRowClass = showHighlightOnDirty && isDirty ? ' is-dirty' : '';
  const wrapperProps = {
    'data-field': field.internalName,
    'data-field-name': field.internalName,
    className: `spfx-df-field-row${dirtyRowClass}`,
  };

  // Check for custom renderer
  if (customRenderer || override?.render) {
    // `resolved` mirrors what `applyFieldOverrides` produced for this field,
    // sourced from the (possibly mutated) `field` metadata so custom renderers
    // see the same label / required / disabled / etc. as the standard renderer.
    // `ctx` gives the renderer the full override-resolution context for any
    // bespoke logic.
    const resolved = {
      label: field.displayName,
      description: field.description,
      placeholder: undefined,
      required: !!field.required,
      disabled: fieldProps.disabled,
      readOnly: !!fieldProps.readOnly,
      hidden: !!field.hidden,
      defaultValue: field.defaultValue,
    };

    const renderCtx = {
      field,
      formValues: props.watchedFormValues || {},
      mode,
    };

    const renderProps: IFieldRenderProps = {
      field,
      control,
      value: fieldState.value,
      error,
      hasError: !!error,
      mode,
      disabled: fieldProps.disabled,
      readOnly: fieldProps.readOnly,
      onChange: fieldState.onChange,
      form,
      resolved,
      ctx: renderCtx as any,
    };

    const customElement = override?.render
      ? override.render(renderProps)
      : customRenderer?.render(renderProps);

    if (customElement) {
      return (
        <>
          {beforeExtensions.map((r, i) => (
            <SPDynamicFormFieldExtension
              key={`before-${field.internalName}-${i}`}
              extension={r.extension}
              state={r.state}
            />
          ))}
          <div {...wrapperProps}>
            <ErrorBoundary
              onError={(err) => {
                SPContext.logger.error(`Error rendering custom field "${field.internalName}"`, err);
              }}
            >
              {customElement}
            </ErrorBoundary>
            {isMultiItem && showRevertControl && onRevertField && (
              <SPDynamicFormFieldRevert
                fieldName={field.internalName}
                isDirty={isDirty}
                onRevert={onRevertField}
              />
            )}
          </div>
          {afterExtensions.map((r, i) => (
            <SPDynamicFormFieldExtension
              key={`after-${field.internalName}-${i}`}
              extension={r.extension}
              state={r.state}
            />
          ))}
        </>
      );
    }
  }

  // Extract label for FormItem pattern
  const labelText = fieldProps.label;
  const isRequired = fieldProps.required;

  // Render field help tooltip
  const renderFieldHelp = () => {
    if (!showHelp || !field.description) {
      return null;
    }

    return (
      <TooltipHost content={field.description}>
        <Icon
          iconName="Info"
          styles={{
            root: {
              fontSize: 14,
              color: '#605e5c',
              marginLeft: 4,
              cursor: 'help',
            },
          }}
        />
      </TooltipHost>
    );
  };

  // Remove label and description from fieldProps - FormItem will handle them
  const fieldPropsWithoutLabel = { ...fieldProps };
  delete fieldPropsWithoutLabel.label;
  delete fieldPropsWithoutLabel.description;

  // Render field content based on field type
  const renderFieldContent = () => {
    switch (field.fieldType) {
      case SPFieldType.Text:
        return <SPTextField {...fieldPropsWithoutLabel} />;

      case SPFieldType.Note:
        // Determine mode based on rich text setting
        const noteMode = field.fieldConfig.richText
          ? SPTextFieldMode.RichText
          : SPTextFieldMode.MultiLine;
        return (
          <SPTextField
            {...fieldPropsWithoutLabel}
            mode={noteMode}
            numberOfLines={field.fieldConfig.numberOfLines || 6}
          />
        );

      case SPFieldType.Number:
        return <SPNumberField {...fieldPropsWithoutLabel} />;

      case SPFieldType.Currency:
        return (
          <SPNumberField
            {...fieldPropsWithoutLabel}
            showCurrency={true}
            currencySymbol={field.fieldConfig?.currencySymbol || '$'}
          />
        );

      case SPFieldType.Integer:
      case SPFieldType.Counter:
        return (
          <SPNumberField
            {...fieldPropsWithoutLabel}
            decimals={0}
            step={1}
          />
        );

      case SPFieldType.Boolean:
        return <SPBooleanField {...fieldPropsWithoutLabel} />;

      case SPFieldType.DateTime:
        // Set dateTimeFormat based on displayFormat (0 = DateOnly, 1 = DateTime)
        const dateTimeFormat =
          field.fieldConfig.displayFormat === 0
            ? SPDateTimeFormat.DateOnly
            : SPDateTimeFormat.DateTime;
        return <SPDateField {...fieldPropsWithoutLabel} dateTimeFormat={dateTimeFormat} />;

      case SPFieldType.Choice:
        return <SPChoiceField {...fieldPropsWithoutLabel} />;

      case SPFieldType.MultiChoice:
        // allowMultiple is already set in fieldProps from buildFieldProps
        return <SPChoiceField {...fieldPropsWithoutLabel} />;

      case SPFieldType.User:
      case SPFieldType.UserMulti:
        return <SPUserField {...fieldPropsWithoutLabel} />;

      case SPFieldType.Lookup:
      case SPFieldType.LookupMulti: {
        // Validate lookup configuration
        const lookupListId = field.fieldConfig?.lookupListId;
        if (!lookupListId) {
          return (
            <MessageBar messageBarType={MessageBarType.error}>
              Lookup field configuration error: Missing lookup list ID for field "{field.displayName}"
            </MessageBar>
          );
        }

        // Smart lookup rendering: pass the resolved mode through to SPLookupField,
        // which handles 'auto' (size-driven), 'dropdown', and 'autocomplete' natively.
        const renderMode = getLookupRenderMode(field, override?.lookupRenderMode);

        // Map our public-API mode strings to SPLookupDisplayMode values.
        const displayMode =
          renderMode === 'autocomplete'
            ? SPLookupDisplayMode.Autocomplete
            : renderMode === 'dropdown'
            ? SPLookupDisplayMode.Dropdown
            : SPLookupDisplayMode.Auto;

        return <SPLookupField {...fieldPropsWithoutLabel} displayMode={displayMode} />;
      }

      case SPFieldType.URL:
        return <SPUrlField {...fieldPropsWithoutLabel} />;

      case SPFieldType.TaxonomyFieldType:
      case SPFieldType.TaxonomyFieldTypeMulti: {
        // Validate taxonomy configuration
        const termSetId = field.fieldConfig?.termSetId;
        if (!termSetId) {
          return (
            <MessageBar messageBarType={MessageBarType.error}>
              Taxonomy field configuration error: Missing term set ID for field "{field.displayName}"
            </MessageBar>
          );
        }

        return (
          <SPTaxonomyField
            {...fieldPropsWithoutLabel}
            allowMultiple={field.fieldType === SPFieldType.TaxonomyFieldTypeMulti}
          />
        );
      }

      default:
        return (
          <Stack tokens={{ childrenGap: 8 }}>
            <Text variant="medium" block styles={{ root: { fontWeight: 600 } }}>
              {field.displayName}
            </Text>
            <MessageBar messageBarType={MessageBarType.warning}>
              Unsupported field type: {field.fieldType} ({field.typeAsString})
            </MessageBar>
          </Stack>
        );
    }
  };

  // Wrap in FormItem with horizontal responsive layout, surrounded by extensions
  return (
    <>
      {beforeExtensions.map((r, i) => (
        <SPDynamicFormFieldExtension
          key={`before-${field.internalName}-${i}`}
          extension={r.extension}
          state={r.state}
        />
      ))}
      <div {...wrapperProps}>
        <FormItem fieldName={field.internalName}>
          <FormLabel
            isRequired={isRequired}
            infoText={showHelp && field.description ? field.description : undefined}
          >
            {labelText}
          </FormLabel>
          <FormValue>
            <ErrorBoundary
              onError={(err) => {
                SPContext.logger.error(`Error rendering field "${field.internalName}"`, err, {
                  fieldType: field.fieldType,
                  typeAsString: field.typeAsString,
                });
              }}
            >
              {renderFieldContent()}
            </ErrorBoundary>
          </FormValue>
        </FormItem>
        {isMultiItem && showRevertControl && onRevertField && (
          <SPDynamicFormFieldRevert
            fieldName={field.internalName}
            isDirty={isDirty}
            onRevert={onRevertField}
          />
        )}
      </div>
      {afterExtensions.map((r, i) => (
        <SPDynamicFormFieldExtension
          key={`after-${field.internalName}-${i}`}
          extension={r.extension}
          state={r.state}
        />
      ))}
    </>
  );
});

SPDynamicFormField.displayName = 'SPDynamicFormField';
