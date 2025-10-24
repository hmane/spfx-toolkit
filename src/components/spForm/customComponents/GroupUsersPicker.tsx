/**
 * GroupUsersPicker - React Hook Form Wrapper
 * Thin wrapper around the base GroupUsersPicker component for RHF integration
 */

import * as React from 'react';
import { Controller } from 'react-hook-form';
import { GroupUsersPicker as BaseGroupUsersPicker } from '../../GroupUsersPicker/GroupUsersPicker';
import { IRHFGroupUsersPickerProps } from '../../GroupUsersPicker/GroupUsersPicker.types';

/**
 * RHF-integrated GroupUsersPicker Component
 * Uses React Hook Form Controller to manage form state
 */
export const GroupUsersPicker: React.FC<IRHFGroupUsersPickerProps> = ({
  name,
  control,
  rules,
  ...baseProps
}) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <BaseGroupUsersPicker
          {...baseProps}
          selectedUsers={field.value || []}
          onChange={(items) => {
            field.onChange(items);
          }}
          onBlur={field.onBlur}
          errorMessage={fieldState.error?.message}
        />
      )}
    />
  );
};
