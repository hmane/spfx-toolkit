import * as React from 'react';
import { Control, UseFormReturn, useController } from 'react-hook-form';
import { IFieldMetadata } from '../types/fieldMetadata';
import { IFieldOverride, IFieldRenderProps, ICustomFieldRenderer } from '../SPDynamicForm.types';
import { SPFieldType } from '../../spFields/types';
import { buildFieldProps } from '../utilities/fieldConfigBuilder';
import { getLookupRenderMode } from '../utilities/lookupFieldOptimizer';
import { SPTextField, SPTextFieldMode } from '../../spFields/SPTextField';
import { SPNumberField } from '../../spFields/SPNumberField';
import { SPBooleanField } from '../../spFields/SPBooleanField';
import { SPDateField } from '../../spFields/SPDateField';
import { SPChoiceField } from '../../spFields/SPChoiceField';
import { SPUserField } from '../../spFields/SPUserField';
import { SPLookupField } from '../../spFields/SPLookupField';
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
  } = props;

  // Use controller to get current value
  const { field: fieldState } = useController({
    name: field.internalName,
    control,
  });

  // Check if field should be hidden
  if (override?.hidden || field.hidden) {
    return null;
  }

  // Build base props for SPField components
  const fieldProps = buildFieldProps(field, mode, control, listId, override);
  fieldProps.disabled = disabled || fieldProps.disabled;
  fieldProps.readOnly = readOnly || fieldProps.readOnly;

  // Add data attribute for scroll-to-error
  const wrapperProps = {
    'data-field': field.internalName,
  };

  // Check for custom renderer
  if (customRenderer || override?.render) {
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
    };

    const customElement = override?.render
      ? override.render(renderProps)
      : customRenderer?.render(renderProps);

    if (customElement) {
      return (
        <div {...wrapperProps}>
          <ErrorBoundary
            onError={(err) => {
              SPContext.logger.error(`Error rendering custom field "${field.internalName}"`, err);
            }}
          >
            {customElement}
          </ErrorBoundary>
        </div>
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

        // Smart lookup rendering based on item count
        const renderMode = getLookupRenderMode(field, override?.lookupRenderMode);

        if (renderMode === 'autocomplete') {
          // TODO: Implement autocomplete lookup field
          // For now, fall back to standard lookup
          return (
            <Stack tokens={{ childrenGap: 8 }}>
              <MessageBar messageBarType={MessageBarType.info} isMultiline={false}>
                Large lookup list ({field.lookupItemCount?.toLocaleString()} items) - autocomplete mode
                (coming soon). Using dropdown for now.
              </MessageBar>
              <SPLookupField {...fieldPropsWithoutLabel} />
            </Stack>
          );
        }

        return <SPLookupField {...fieldPropsWithoutLabel} />;
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

  // Wrap in FormItem with horizontal responsive layout
  return (
    <FormItem fieldName={field.internalName} {...wrapperProps}>
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
  );
});

SPDynamicFormField.displayName = 'SPDynamicFormField';
