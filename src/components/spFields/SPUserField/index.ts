/**
 * SPUserField component exports
 */

export { SPUserField } from './SPUserField';
export type { ISPUserFieldProps, SPUserFieldValue } from './SPUserField.types';
export { SPUserFieldDisplayMode } from './SPUserField.types';
export {
  normalizeToIPrincipal,
  normalizeToIPrincipalArray,
  principalToPeoplePickerFormat,
  peoplePickerItemsToPrincipals,
  getUserIdentifier,
  getUserDisplayName,
  isIPrincipal,
  isISPUserFieldValue,
  principalToUserFieldValue,
  userFieldValueToPrincipal,
} from './SPUserField.utils';
