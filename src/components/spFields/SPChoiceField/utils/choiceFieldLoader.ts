/**
 * Choice Field Loader Utility
 * Loads SharePoint Choice/Multichoice field metadata and choices
 */

import { SPFI } from '@pnp/sp';
import { IFieldInfo } from '@pnp/sp/fields/types';
import { SPContext } from '../../../../utilities/context';
import {
  IChoiceFieldMetadata,
  SPChoiceFieldDataSource,
  ListFieldDataSource,
  SiteColumnDataSource,
  StaticChoicesDataSource
} from '../SPChoiceField.types';

/**
 * Loads choice field metadata from SharePoint or returns static choices
 * @param dataSource - Data source configuration (list field, site column, or static)
 * @param useCache - Whether to use cached data (spCached) or fresh data (spPessimistic)
 * @returns Field metadata including choices and configuration
 */
export async function loadChoiceFieldMetadata(
  dataSource: SPChoiceFieldDataSource,
  useCache: boolean = false
): Promise<IChoiceFieldMetadata> {
  // Handle static choices (no SharePoint call needed)
  if (dataSource.type === 'static') {
    const staticSource = dataSource as StaticChoicesDataSource;

    SPContext.logger.info('SPChoiceField: Using static choices', {
      choiceCount: staticSource.choices.length,
    });

    return {
      displayName: '',
      internalName: '',
      choices: staticSource.choices,
      isMultiChoice: staticSource.allowMultiple || false,
      allowFillIn: false,
      required: false,
    };
  }

  // Select appropriate SP instance for SharePoint data sources
  const sp: SPFI = useCache ? SPContext.spCached : SPContext.spPessimistic;

  let fieldInfo: IFieldInfo;

  try {
    // Load field based on data source type
    if (dataSource.type === 'list') {
      const listSource = dataSource as ListFieldDataSource;

      SPContext.logger.info('SPChoiceField: Loading field from list', {
        list: listSource.listNameOrId,
        field: listSource.fieldInternalName,
      });

      fieldInfo = await sp.web.lists
        .getByTitle(listSource.listNameOrId)
        .fields.getByInternalNameOrTitle(listSource.fieldInternalName)();
    } else {
      // siteColumn
      const siteColSource = dataSource as SiteColumnDataSource;

      SPContext.logger.info('SPChoiceField: Loading site column', {
        column: siteColSource.siteColumnName,
      });

      fieldInfo = await sp.web.fields.getByInternalNameOrTitle(siteColSource.siteColumnName)();
    }

    // Validate field type
    if (fieldInfo.FieldTypeKind !== 6 && fieldInfo.FieldTypeKind !== 15) {
      throw new Error(
        `Field "${fieldInfo.InternalName}" is not a Choice or Multichoice field. FieldTypeKind: ${fieldInfo.FieldTypeKind}`
      );
    }

    // Extract choices
    const choices: string[] = (fieldInfo as any).Choices || [];

    // Determine if multi-choice (FieldTypeKind: 6 = Choice, 15 = MultiChoice)
    const isMultiChoice = fieldInfo.FieldTypeKind === 15;

    // Check if fill-in is allowed
    // SharePoint uses 'FillInChoice' property for Choice fields
    const allowFillIn: boolean = (fieldInfo as any).FillInChoice === true;

    // Get default value
    let defaultValue: string | string[] | undefined;
    const defaultValueRaw = (fieldInfo as any).DefaultValue;
    if (defaultValueRaw) {
      if (isMultiChoice && typeof defaultValueRaw === 'string') {
        // Multi-choice default values are semicolon-separated
        defaultValue = defaultValueRaw.split(';#').filter(v => v.trim().length > 0);
      } else {
        defaultValue = defaultValueRaw;
      }
    }

    const metadata: IChoiceFieldMetadata = {
      displayName: fieldInfo.Title,
      internalName: fieldInfo.InternalName,
      choices,
      isMultiChoice,
      allowFillIn,
      description: fieldInfo.Description,
      required: fieldInfo.Required,
      defaultValue,
    };

    SPContext.logger.info('SPChoiceField: Field metadata loaded successfully', {
      field: metadata.internalName,
      choiceCount: metadata.choices.length,
      isMultiChoice: metadata.isMultiChoice,
      allowFillIn: metadata.allowFillIn,
    });

    return metadata;
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to load field metadata';

    SPContext.logger.error('SPChoiceField: Failed to load field metadata', error, {
      dataSource,
    });

    // Provide helpful error messages
    if (errorMessage.includes('does not exist') || errorMessage.includes('not found')) {
      if (dataSource.type === 'list') {
        const listSource = dataSource as ListFieldDataSource;
        throw new Error(
          `List "${listSource.listNameOrId}" or field "${listSource.fieldInternalName}" does not exist or you don't have access.`
        );
      } else {
        const siteColSource = dataSource as SiteColumnDataSource;
        throw new Error(
          `Site column "${siteColSource.siteColumnName}" does not exist or you don't have access.`
        );
      }
    } else if (errorMessage.includes('Access denied') || errorMessage.includes('Unauthorized')) {
      throw new Error(`You don't have permission to access this field.`);
    } else {
      throw new Error(`Failed to load field metadata: ${errorMessage}`);
    }
  }
}

/**
 * Detects if "Other" option should be enabled based on field metadata
 * @param metadata - Field metadata
 * @param otherOptionText - The text to look for (e.g., "Other", "Other Color")
 * @returns True if "Other" option should be enabled
 */
export function shouldEnableOtherOption(
  metadata: IChoiceFieldMetadata,
  otherOptionText: string = 'Other'
): boolean {
  // Enable if fill-in is allowed in SharePoint
  if (metadata.allowFillIn) {
    return true;
  }

  // Enable if the otherOptionText exists in choices (case-insensitive)
  const hasOtherInChoices = metadata.choices.some(
    choice => choice.toLowerCase() === otherOptionText.toLowerCase()
  );

  return hasOtherInChoices;
}

/**
 * Checks if a value exists in the choices array
 * @param value - Value to check
 * @param choices - Available choices
 * @returns True if value exists in choices
 */
export function isValueInChoices(value: string, choices: string[]): boolean {
  return choices.some(choice => choice.toLowerCase() === value.toLowerCase());
}

/**
 * Injects "Other" option into choices if not already present
 * @param choices - Original choices array
 * @param otherOptionText - Text for the "Other" option
 * @returns Choices array with "Other" option added
 */
export function injectOtherOption(choices: string[], otherOptionText: string): string[] {
  // Check if already exists (case-insensitive)
  const hasOther = choices.some(
    choice => choice.toLowerCase() === otherOptionText.toLowerCase()
  );

  if (hasOther) {
    return choices;
  }

  // Add to the end
  return [...choices, otherOptionText];
}

/**
 * Validates a custom "Other" value
 * @param value - Custom value to validate
 * @param validation - Validation configuration
 * @returns Error message if invalid, undefined if valid
 */
export function validateCustomValue(
  value: string,
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    errorMessage?: string;
    customValidator?: (value: string) => string | undefined;
  }
): string | undefined {
  if (!validation) {
    return undefined;
  }

  // Required check
  if (validation.required && (!value || value.trim().length === 0)) {
    return validation.errorMessage || 'Custom value is required';
  }

  // If value is empty and not required, skip other validations
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  // Min length
  if (validation.minLength && value.length < validation.minLength) {
    return validation.errorMessage || `Minimum length is ${validation.minLength} characters`;
  }

  // Max length
  if (validation.maxLength && value.length > validation.maxLength) {
    return validation.errorMessage || `Maximum length is ${validation.maxLength} characters`;
  }

  // Pattern
  if (validation.pattern && !validation.pattern.test(value)) {
    return validation.errorMessage || 'Invalid format';
  }

  // Custom validator
  if (validation.customValidator) {
    return validation.customValidator(value);
  }

  return undefined;
}
