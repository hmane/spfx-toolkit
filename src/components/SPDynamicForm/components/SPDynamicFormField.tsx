import * as React from 'react';
import { Control, UseFormReturn, useController } from 'react-hook-form';
import { IFieldMetadata } from '../types/fieldMetadata';
import { IFieldOverride, IFieldRenderProps, ICustomFieldRenderer } from '../SPDynamicForm.types';
import { SPFieldType } from '../../spFields/types';
import { buildFieldProps } from '../utilities/fieldConfigBuilder';
import { getLookupRenderMode } from '../utilities/lookupFieldOptimizer';
import { SPTextField } from '../../spFields/SPTextField';
import { SPNumberField } from '../../spFields/SPNumberField';
import { SPBooleanField } from '../../spFields/SPBooleanField';
import { SPDateField } from '../../spFields/SPDateField';
import { SPChoiceField } from '../../spFields/SPChoiceField';
import { SPUserField } from '../../spFields/SPUserField';
import { SPLookupField } from '../../spFields/SPLookupField';
import { SPUrlField } from '../../spFields/SPUrlField';
import { SPTaxonomyField } from '../../spFields/SPTaxonomyField';
import { Text } from '@fluentui/react/lib/Text';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { Icon } from '@fluentui/react/lib/Icon';
import { ErrorBoundary } from '../../ErrorBoundary';
import { SPContext } from '../../../utilities/context';

export interface ISPDynamicFormFieldProps {
  field: IFieldMetadata;
  control: Control<any>;
  mode: 'new' | 'edit' | 'view';
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
  const fieldProps = buildFieldProps(field, mode, control, override);
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

  // Update label to include help icon
  if (showHelp && field.description && fieldProps.label) {
    fieldProps.label = (
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 4 }}>
        <span>{fieldProps.label}</span>
        {renderFieldHelp()}
      </Stack>
    );
  }

  // Render field content based on field type
  const renderFieldContent = () => {
    switch (field.fieldType) {
      case SPFieldType.Text:
        return <SPTextField {...fieldProps} />;

      case SPFieldType.Note:
        // Check if rich text is enabled
        const isRichText = field.fieldConfig.richText;
        return (
          <SPTextField
            {...fieldProps}
            multiline
            numberOfLines={field.fieldConfig.numberOfLines || 6}
            isRichText={isRichText}
          />
        );

      case SPFieldType.Number:
        // For currency fields, just use regular number field
        // The formatting would need to be handled in a wrapper or custom field
        return <SPNumberField {...fieldProps} />;

      case SPFieldType.Boolean:
        return <SPBooleanField {...fieldProps} />;

      case SPFieldType.DateTime:
        return <SPDateField {...fieldProps} />;

      case SPFieldType.Choice:
        return <SPChoiceField {...fieldProps} />;

      case SPFieldType.MultiChoice:
        return <SPChoiceField {...fieldProps} isMulti />;

      case SPFieldType.User:
        return <SPUserField {...fieldProps} />;

      case SPFieldType.Lookup: {
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
              <SPLookupField {...fieldProps} />
            </Stack>
          );
        }

        return <SPLookupField {...fieldProps} />;
      }

      case SPFieldType.URL:
        return <SPUrlField {...fieldProps} />;

      case SPFieldType.TaxonomyFieldType:
        return <SPTaxonomyField {...fieldProps} />;

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

  // Wrap in error boundary and return
  return (
    <div {...wrapperProps}>
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
    </div>
  );
});

SPDynamicFormField.displayName = 'SPDynamicFormField';
