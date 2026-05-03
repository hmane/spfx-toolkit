import { SPFieldType } from '../../spFields/types';
import { IFieldMetadata } from '../types/fieldMetadata';

export interface IItemQueryFields {
  selectFields: string[];
  expandFields: string[];
}

/**
 * Build the SharePoint REST select/expand shape needed to hydrate form values.
 * Complex fields must select their expanded properties; selecting only the
 * internal field name is not enough for lookup/user extraction.
 */
export function buildItemQueryFields(fields: IFieldMetadata[]): IItemQueryFields {
  const selectFields: string[] = ['Id', 'ContentTypeId'];
  const expandFields: string[] = [];

  fields.forEach((field) => {
    const internalName = field.internalName;

    switch (field.fieldType) {
      case SPFieldType.User:
      case SPFieldType.UserMulti:
        selectFields.push(
          `${internalName}/Id`,
          `${internalName}/Title`,
          `${internalName}/EMail`,
          `${internalName}/Name`
        );
        expandFields.push(internalName);
        break;

      case SPFieldType.Lookup:
      case SPFieldType.LookupMulti: {
        const displayField = field.fieldConfig?.lookupField || 'Title';
        selectFields.push(`${internalName}/Id`, `${internalName}/${displayField}`);
        expandFields.push(internalName);
        break;
      }

      default:
        selectFields.push(internalName);
        break;
    }
  });

  return {
    selectFields: Array.from(new Set(selectFields)),
    expandFields: Array.from(new Set(expandFields)),
  };
}
