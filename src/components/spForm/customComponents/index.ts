/**
 * Custom Components Exports
 * React Hook Form integrated custom components
 *
 * Note: SPChoicePicker has been replaced by SPChoiceField from the spFields suite.
 * SPChoiceField has built-in react-hook-form support and doesn't need a wrapper.
 *
 * Migration:
 * Before: import { RHFSPChoicePicker } from 'spfx-toolkit/lib/components/spForm/customComponents';
 * After:  import { SPChoiceField } from 'spfx-toolkit/lib/components/spFields';
 */

export { GroupUsersPicker } from './GroupUsersPicker';

// Re-export types from base components
export type {
  IGroupUser,
  IRHFGroupUsersPickerProps,
} from '../../GroupUsersPicker/GroupUsersPicker.types';
