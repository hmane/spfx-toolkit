/**
 * GroupUsersPicker Component Types
 * DevExtreme-based user picker that loads users from a SharePoint group
 */

import { Control, RegisterOptions } from 'react-hook-form';

/**
 * User item interface for the picker
 * Similar to IPersonaProps from @fluentui/react but adapted for our needs
 */
export interface IGroupUser {
  /**
   * User ID
   */
  id: string | number;

  /**
   * Display name
   */
  text: string;

  /**
   * Email address
   */
  secondaryText?: string;

  /**
   * User photo URL
   */
  imageUrl?: string;

  /**
   * Login name (for ensureUser)
   */
  loginName?: string;

  /**
   * User initials (fallback for photo)
   */
  imageInitials?: string;

  /**
   * Initials color
   */
  initialsColor?: number;
}

/**
 * Props for standalone GroupUsersPicker component
 */
export interface IGroupUsersPickerProps {
  /**
   * SharePoint group name to load users from
   */
  groupName: string;

  /**
   * Maximum number of users that can be selected
   * 1 = SelectBox (single select)
   * >1 = TagBox (multi-select)
   */
  maxUserCount: number;

  /**
   * Pre-selected users
   */
  selectedUsers?: IGroupUser[];

  /**
   * Whether to call ensureUser for selected users
   * @default false
   */
  ensureUser?: boolean;

  /**
   * Label text
   */
  label?: string;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Whether the picker is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether the picker is required
   * @default false
   */
  required?: boolean;

  /**
   * Callback when selection changes
   */
  onChange?: (items: IGroupUser[]) => void;

  /**
   * Callback when picker loses focus
   */
  onBlur?: () => void;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Custom error message
   */
  errorMessage?: string;

  /**
   * Whether the field is valid (controls DevExtreme isValid styling)
   * When false, shows red border on the control
   * @default true
   */
  isValid?: boolean;

  /**
   * Show clear button
   * @default true
   */
  showClearButton?: boolean;

  /**
   * Custom item display template
   */
  itemRender?: (item: IGroupUser) => React.ReactNode;

  /**
   * Whether to use cache (true = spCached, false = spPessimistic)
   * @default false (uses spPessimistic for fresh data)
   */
  useCache?: boolean;
}

/**
 * Props for React Hook Form wrapper
 */
export interface IRHFGroupUsersPickerProps
  extends Omit<IGroupUsersPickerProps, 'selectedUsers' | 'onChange' | 'errorMessage'> {
  /**
   * Field name for React Hook Form
   */
  name: string;

  /**
   * React Hook Form control
   */
  control: Control<any>;

  /**
   * Validation rules for React Hook Form
   */
  rules?: RegisterOptions;

  /**
   * Whether to show inline error message inside the component.
   * Set to false when using inside FormValue with autoShowErrors=true
   * to avoid duplicate error display.
   * @default false
   */
  showInlineError?: boolean;
}

/**
 * Default props
 */
export const DefaultGroupUsersPickerProps: Partial<IGroupUsersPickerProps> = {
  ensureUser: false,
  disabled: false,
  required: false,
  showClearButton: true,
  useCache: false,
  placeholder: 'Select user(s)...',
};
