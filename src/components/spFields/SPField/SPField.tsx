/**
 * SPField - Smart SharePoint Field Component
 *
 * A smart field component that auto-detects field types from SharePoint
 * and renders the appropriate field component.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { ISPFieldProps, IFieldMetadata, isSmartConfig } from './SPField.types';
import { SPFieldType } from '../types';
import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { SPTextFieldMode } from '../SPTextField/SPTextField.types';

// Lazy load field components for better performance
const SPTextField = React.lazy(() => import('../SPTextField').then(m => ({ default: m.SPTextField })));
const SPChoiceField = React.lazy(() => import('../SPChoiceField').then(m => ({ default: m.SPChoiceField })));
const SPUserField = React.lazy(() => import('../SPUserField').then(m => ({ default: m.SPUserField })));
const SPDateField = React.lazy(() => import('../SPDateField').then(m => ({ default: m.SPDateField })));
const SPNumberField = React.lazy(() => import('../SPNumberField').then(m => ({ default: m.SPNumberField })));
const SPBooleanField = React.lazy(() => import('../SPBooleanField').then(m => ({ default: m.SPBooleanField })));
const SPUrlField = React.lazy(() => import('../SPUrlField').then(m => ({ default: m.SPUrlField })));
const SPLookupField = React.lazy(() => import('../SPLookupField').then(m => ({ default: m.SPLookupField })));
const SPTaxonomyField = React.lazy(() => import('../SPTaxonomyField').then(m => ({ default: m.SPTaxonomyField })));

/**
 * SPField component - Smart field that auto-detects type
 *
 * @example
 * ```tsx
 * // Smart mode - auto-detects from SharePoint
 * <SPField
 *   name="title"
 *   control={control}
 *   config={{
 *     listNameOrId: 'Tasks',
 *     fieldInternalName: 'Title'
 *   }}
 * />
 *
 * // Manual mode - specify field type
 * <SPField
 *   name="status"
 *   control={control}
 *   config={{
 *     fieldType: SPFieldType.Choice,
 *     displayName: 'Status',
 *     fieldConfig: {
 *       choices: ['Active', 'Inactive']
 *     }
 *   }}
 * />
 * ```
 */
export const SPField: React.FC<ISPFieldProps> = (props) => {
  const {
    config,
    name,
    control,
    rules,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    className,
    width,
    disabled,
    readOnly,
    label,
    placeholder,
    errorMessage,
  } = props;

  const [fieldMetadata, setFieldMetadata] = React.useState<IFieldMetadata | null>(null);
  const [loading, setLoading] = React.useState<boolean>(isSmartConfig(config));
  const [error, setError] = React.useState<string | null>(null);

  // Create stable config key to avoid re-fetches on object reference changes
  const configKey = React.useMemo(() => {
    if (!isSmartConfig(config)) {
      // Manual mode: key based on field type
      return `manual:${config.fieldType}:${name || ''}`;
    }
    // Smart mode: key based on list and field names
    return `smart:${config.listNameOrId}:${config.fieldInternalName}:${config.useCache !== false ? 'cached' : 'fresh'}`;
  }, [config, name]);

  // Load field metadata if using smart config
  React.useEffect(() => {
    if (!isSmartConfig(config)) {
      // Manual config - create metadata from provided info
      setFieldMetadata({
        internalName: name || '',
        displayName: config.displayName || name || '',
        fieldType: config.fieldType,
        description: config.description,
        required: config.required || false,
        metadata: config.fieldConfig || {},
      });
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Smart config - load from SharePoint
    const loadFieldMetadata = async () => {
      if (!SPContext.sp) {
        if (isMounted) {
          setError('SPContext not initialized');
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      try {
        const sp = config.useCache !== false ? SPContext.spCached : SPContext.spPessimistic;

        // Load field from SharePoint
        const field = await getListByNameOrId(sp, config.listNameOrId)
          .fields.getByInternalNameOrTitle(config.fieldInternalName)();

        if (!isMounted) return;

        // Map SharePoint field type to SPFieldType enum
        const fieldType = mapSharePointFieldType(field.FieldTypeKind, field.TypeAsString);

        // Extract field-specific metadata
        const fieldConfig = extractFieldConfig(field, fieldType);

        const metadata: IFieldMetadata = {
          internalName: field.InternalName,
          displayName: field.Title,
          fieldType: fieldType,
          description: field.Description,
          required: field.Required,
          defaultValue: field.DefaultValue,
          metadata: fieldConfig,
        };

        setFieldMetadata(metadata);
        setError(null);

        SPContext.logger.info('SPField: Field metadata loaded', {
          field: field.InternalName,
          type: fieldType,
        });
      } catch (err: any) {
        if (!isMounted) return;

        const errorMsg = err?.message || 'Failed to load field metadata';
        setError(errorMsg);
        SPContext.logger.error('SPField: Failed to load field metadata', err, { config });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFieldMetadata();

    return () => {
      isMounted = false;
    };
  }, [configKey]);

  // Show loading spinner
  if (loading) {
    return (
      <Stack style={{ width: width || '100%', marginBottom: 16 }}>
        <Spinner size={SpinnerSize.small} label="Loading field..." />
      </Stack>
    );
  }

  // Show error message
  if (error) {
    return (
      <Stack style={{ width: width || '100%', marginBottom: 16 }}>
        <MessageBar messageBarType={MessageBarType.error}>
          {error}
        </MessageBar>
      </Stack>
    );
  }

  // No field metadata
  if (!fieldMetadata) {
    return (
      <Stack style={{ width: width || '100%', marginBottom: 16 }}>
        <MessageBar messageBarType={MessageBarType.warning}>
          No field metadata available
        </MessageBar>
      </Stack>
    );
  }

  // Common props to pass to field components
  const commonProps = {
    name: name,
    control: control,
    rules: rules || (fieldMetadata.required ? { required: `${fieldMetadata.displayName} is required` } : undefined),
    value: value,
    defaultValue: defaultValue || fieldMetadata.defaultValue,
    onChange: onChange,
    onBlur: onBlur,
    onFocus: onFocus,
    className: className,
    width: width,
    disabled: disabled,
    readOnly: readOnly,
    label: label || fieldMetadata.displayName,
    description: fieldMetadata.description,
    placeholder: placeholder,
    errorMessage: errorMessage,
    required: fieldMetadata.required,
  };

  // Render field component wrapped in Suspense for lazy loading
  const renderFieldComponent = () => {
    switch (fieldMetadata.fieldType) {
      case SPFieldType.Text:
        return (
          <SPTextField
            {...commonProps}
            mode={SPTextFieldMode.SingleLine}
            maxLength={fieldMetadata.metadata.maxLength}
          />
        );

      case SPFieldType.Note:
        return (
          <SPTextField
            {...commonProps}
            mode={
              fieldMetadata.metadata.richText
                ? SPTextFieldMode.RichText
                : SPTextFieldMode.MultiLine
            }
            maxLength={fieldMetadata.metadata.maxLength}
            rows={fieldMetadata.metadata.numberOfLines}
            appendOnly={fieldMetadata.metadata.appendOnly}
            listNameOrId={isSmartConfig(config) ? config.listNameOrId : undefined}
            fieldInternalName={isSmartConfig(config) ? config.fieldInternalName : fieldMetadata.internalName}
          />
        );

      case SPFieldType.Choice:
      case SPFieldType.MultiChoice:
        return (
          <SPChoiceField
            {...commonProps}
            choices={fieldMetadata.metadata.choices}
            allowMultiple={fieldMetadata.fieldType === SPFieldType.MultiChoice}
            otherConfig={fieldMetadata.metadata.fillInChoice ? { enableOtherOption: true } : undefined}
          />
        );

      case SPFieldType.User:
      case SPFieldType.UserMulti:
        return (
          <SPUserField
            {...commonProps}
            allowMultiple={fieldMetadata.fieldType === SPFieldType.UserMulti}
            allowGroups={fieldMetadata.metadata.allowGroups}
          />
        );

      case SPFieldType.DateTime:
        return (
          <SPDateField
            {...commonProps}
            dateTimeFormat={fieldMetadata.metadata.displayFormat}
            showTimePicker={fieldMetadata.metadata.displayFormat === 'DateTime'}
          />
        );

      case SPFieldType.Number:
      case SPFieldType.Currency:
        return (
          <SPNumberField
            {...commonProps}
            min={fieldMetadata.metadata.minValue}
            max={fieldMetadata.metadata.maxValue}
            format={fieldMetadata.fieldType === SPFieldType.Currency ? {
              currencyCode: 'USD',
              decimals: fieldMetadata.metadata.decimals || 2,
            } : {
              decimals: fieldMetadata.metadata.decimals,
            }}
          />
        );

      case SPFieldType.Boolean:
        return (
          <SPBooleanField
            {...commonProps}
          />
        );

      case SPFieldType.URL:
        return (
          <SPUrlField
            {...commonProps}
          />
        );

      case SPFieldType.Lookup:
      case SPFieldType.LookupMulti:
        return (
          <SPLookupField
            {...commonProps}
            dataSource={{
              listNameOrId: fieldMetadata.metadata.lookupList,
              displayField: fieldMetadata.metadata.lookupField || 'Title',
            }}
            allowMultiple={fieldMetadata.fieldType === SPFieldType.LookupMulti}
          />
        );

      case SPFieldType.TaxonomyFieldType:
      case SPFieldType.TaxonomyFieldTypeMulti:
        return (
          <SPTaxonomyField
            {...commonProps}
            dataSource={{
              termSetId: fieldMetadata.metadata.termSetId,
            }}
            allowMultiple={fieldMetadata.fieldType === SPFieldType.TaxonomyFieldTypeMulti}
          />
        );

      default:
        return (
          <Stack style={{ width: width || '100%', marginBottom: 16 }}>
            <MessageBar messageBarType={MessageBarType.warning}>
              Unsupported field type: {fieldMetadata.fieldType}
            </MessageBar>
          </Stack>
        );
    }
  };

  // Wrap in Suspense for lazy-loaded components
  return (
    <React.Suspense
      fallback={
        <Stack style={{ width: width || '100%', marginBottom: 16 }}>
          <Spinner size={SpinnerSize.small} label="Loading field component..." />
        </Stack>
      }
    >
      {renderFieldComponent()}
    </React.Suspense>
  );
};

/**
 * Map SharePoint field type to SPFieldType enum
 */
function mapSharePointFieldType(fieldTypeKind: number, typeAsString?: string): SPFieldType {
  // Map based on FieldTypeKind
  switch (fieldTypeKind) {
    case 2: return SPFieldType.Text;
    case 3: return SPFieldType.Note;
    case 6: return SPFieldType.Choice;
    case 15: return SPFieldType.MultiChoice;
    case 9: return SPFieldType.Number;
    case 10: return SPFieldType.Currency;
    case 4: return SPFieldType.DateTime;
    case 8: return SPFieldType.Boolean;
    case 20: return SPFieldType.User;
    case 7: return SPFieldType.Lookup;
    case 11: return SPFieldType.URL;
    default:
      // Check TypeAsString for special types
      if (typeAsString === 'TaxonomyFieldType') return SPFieldType.TaxonomyFieldType;
      if (typeAsString === 'TaxonomyFieldTypeMulti') return SPFieldType.TaxonomyFieldTypeMulti;
      if (typeAsString === 'UserMulti') return SPFieldType.UserMulti;
      if (typeAsString === 'LookupMulti') return SPFieldType.LookupMulti;

      return SPFieldType.Text; // Default fallback
  }
}

/**
 * Extract field-specific configuration from SharePoint field
 */
function extractFieldConfig(field: any, fieldType: SPFieldType): any {
  const config: any = {};

  switch (fieldType) {
    case SPFieldType.Text:
      config.maxLength = field.MaxLength;
      break;

    case SPFieldType.Note:
      config.maxLength = field.MaxLength;
      config.richText = field.RichText || false;
      config.appendOnly = field.AppendOnly || false;
      config.richTextMode = field.RichTextMode;
      config.numberOfLines = field.NumberOfLines || 6;
      config.allowHyperlink = field.AllowHyperlink;
      config.restrictedMode = field.RestrictedMode;
      break;

    case SPFieldType.Choice:
    case SPFieldType.MultiChoice:
      config.choices = field.Choices || [];
      config.fillInChoice = field.FillInChoice;
      break;

    case SPFieldType.User:
    case SPFieldType.UserMulti:
      config.allowGroups = field.AllowMultipleValues || false;
      break;

    case SPFieldType.DateTime:
      config.displayFormat = field.DisplayFormat; // DateTime or DateOnly
      break;

    case SPFieldType.Number:
    case SPFieldType.Currency:
      config.minValue = field.MinimumValue;
      config.maxValue = field.MaximumValue;
      config.decimals = field.ShowAsPercentage ? 2 : undefined;
      break;

    case SPFieldType.Lookup:
    case SPFieldType.LookupMulti:
      config.lookupList = field.LookupList;
      config.lookupField = field.LookupField;
      break;

    case SPFieldType.TaxonomyFieldType:
    case SPFieldType.TaxonomyFieldTypeMulti:
      config.termSetId = field.TermSetId;
      break;
  }

  return config;
}

export default SPField;
