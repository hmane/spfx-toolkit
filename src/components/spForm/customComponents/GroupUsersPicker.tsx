/**
 * GroupUsersPicker - React Hook Form Wrapper
 * Wrapper around the base GroupUsersPicker component for RHF integration
 *
 * IMPORTANT: This wrapper converts between IGroupUser (internal/DevExtreme) and IPrincipal (external/form value).
 * The form field value is IPrincipal[], making it directly compatible with stores and services.
 */

import * as React from 'react';
import { Controller } from 'react-hook-form';
import { GroupUsersPicker as BaseGroupUsersPicker } from '../../GroupUsersPicker/GroupUsersPicker';
import { IGroupUser, IRHFGroupUsersPickerProps } from '../../GroupUsersPicker/GroupUsersPicker.types';
import { IPrincipal } from '../../../types/listItemTypes';
import { SPContext } from '../../../utilities/context';

/**
 * Convert IPrincipal to IGroupUser (for displaying pre-selected values)
 * @param principal - The IPrincipal object from form state
 * @returns IGroupUser for the base component
 */
function principalToGroupUser(principal: IPrincipal): IGroupUser {
  return {
    id: principal.id,
    text: principal.title || '',
    secondaryText: principal.email,
    loginName: principal.loginName || principal.value,
    imageUrl: principal.picture,
  };
}

/**
 * Convert IGroupUser to IPrincipal (for storing in form state)
 * @param user - The IGroupUser object from the picker
 * @returns IPrincipal for form state
 */
function groupUserToPrincipal(user: IGroupUser): IPrincipal {
  return {
    id: String(user.id),
    title: user.text,
    email: user.secondaryText,
    loginName: user.loginName,
  };
}

/**
 * RHF-integrated GroupUsersPicker Component
 * Uses React Hook Form Controller to manage form state
 *
 * The form field value is IPrincipal[], making it directly compatible with stores and services
 * that use IPrincipal for user data.
 *
 * Note: When used inside FormValue with autoShowErrors=true, set showInlineError=false
 * (the default) to avoid duplicate error display. FormValue will show errors via FormError.
 */
export const GroupUsersPicker: React.FC<IRHFGroupUsersPickerProps> = ({
  name,
  control,
  rules,
  showInlineError = false,
  ...baseProps
}) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        // Convert IPrincipal[] from form state to IGroupUser[] for the base component
        const fieldValueAsPrincipals: IPrincipal[] = field.value || [];
        const selectedUsers: IGroupUser[] = fieldValueAsPrincipals.map(principalToGroupUser);

        return (
          <BaseGroupUsersPicker
            {...baseProps}
            selectedUsers={selectedUsers}
            onChange={(items: IGroupUser[]) => {
              // Convert IGroupUser[] back to IPrincipal[] for form state
              SPContext.logger.info('GroupUsersPicker RHF: onChange received', {
                itemsCount: items.length,
                items: items.map(u => ({ id: u.id, text: u.text, secondaryText: u.secondaryText })),
              });
              const principals: IPrincipal[] = items.map(groupUserToPrincipal);
              SPContext.logger.info('GroupUsersPicker RHF: Converted to principals', {
                principalsCount: principals.length,
                principals: principals.map(p => ({ id: p.id, title: p.title, email: p.email })),
              });
              field.onChange(principals);
            }}
            onBlur={field.onBlur}
            errorMessage={showInlineError ? fieldState.error?.message : undefined}
            isValid={!fieldState.error}
          />
        );
      }}
    />
  );
};
