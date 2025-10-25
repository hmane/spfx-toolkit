/**
 * SPUserField - SharePoint User/Group Field Component
 *
 * A user field component that mirrors SharePoint's User/Group picker fields.
 * Supports react-hook-form integration and PnP PeoplePicker component.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { Controller, RegisterOptions } from 'react-hook-form';
import { PeoplePicker, PrincipalType } from '@pnp/spfx-controls-react/lib/PeoplePicker';
import { Stack } from '@fluentui/react/lib/Stack';
import { Label } from '@fluentui/react/lib/Label';
import { Text } from '@fluentui/react/lib/Text';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { ISPUserFieldProps, SPUserFieldDisplayMode } from './SPUserField.types';
import { ISPUserFieldValue } from '../types';
import { SPContext } from '../../../utilities/context';
import { UserPersona, UserPersonaSize } from '../../UserPersona';
import './SPUserField.css';

/**
 * SPUserField component for user and group selection
 *
 * @example
 * ```tsx
 * // With react-hook-form
 * <SPUserField
 *   name="assignedTo"
 *   label="Assigned To"
 *   control={control}
 *   rules={{ required: 'Assigned To is required' }}
 * />
 *
 * // Multiple users
 * <SPUserField
 *   name="members"
 *   label="Team Members"
 *   control={control}
 *   allowMultiple
 *   maxSelections={10}
 * />
 * ```
 */
export const SPUserField: React.FC<ISPUserFieldProps> = (props) => {
  const {
    // Base props
    label,
    description,
    required = false,
    disabled = false,
    readOnly = false,
    placeholder,
    errorMessage,
    className,
    width,

    // Form props
    name,
    control,
    rules,

    // Standalone props
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,

    // User field specific props
    allowMultiple = false,
    allowGroups = false,
    limitToGroup,
    displayMode = SPUserFieldDisplayMode.PeoplePicker,
    maxSelections,
    minSelections,
    showPresence = false,
    showPhoto = true,
    showEmail = false,
    showJobTitle = false,
    resolveDelay = 300,
    suggestionLimit = 5,
    customFilter,
    webUrl,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = React.useState<ISPUserFieldValue | ISPUserFieldValue[]>(
    defaultValue || (allowMultiple ? [] : null as any)
  );

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  // Convert ISPUserFieldValue to string[] (user IDs or emails) for PeoplePicker
  const selectedUsers = React.useMemo(() => {
    if (!currentValue) return [];

    if (Array.isArray(currentValue)) {
      return currentValue.map(user => user.EMail || user.Name || user.Title);
    } else {
      return [currentValue.EMail || currentValue.Name || currentValue.Title];
    }
  }, [currentValue]);

  // Handle PeoplePicker change
  const handlePeoplePickerChange = React.useCallback(
    (items: any[]) => {
      // Convert PeoplePicker items to ISPUserFieldValue format
      const users: ISPUserFieldValue[] = items.map(item => ({
        Id: item.id || item.Id || 0,
        EMail: item.secondaryText || item.EMail || '',
        Title: item.text || item.Title || '',
        Name: item.loginName || item.Name || '',
        Picture: item.imageUrl || item.Picture,
        Sip: item.sip || item.Sip,
      }));

      const finalValue = allowMultiple ? users : (users.length > 0 ? users[0] : null);

      setInternalValue(finalValue as any);

      if (onChange) {
        onChange(finalValue as any);
      }
    },
    [allowMultiple, onChange]
  );

  // Merge validation rules
  const validationRules = React.useMemo(() => {
    const baseRules: RegisterOptions = { ...rules };

    if (required && !baseRules.required) {
      baseRules.required = `${label || 'This field'} is required`;
    }

    if (allowMultiple) {
      if (maxSelections && !baseRules.validate) {
        baseRules.validate = {
          maxSelections: (val: ISPUserFieldValue[]) =>
            !val || val.length <= maxSelections! ||
            `Maximum ${maxSelections} selections allowed`,
        };
      }

      if (minSelections) {
        if (!baseRules.validate) {
          baseRules.validate = {};
        }
        (baseRules.validate as Record<string, any>).minSelections = (val: ISPUserFieldValue[]) =>
          !val || val.length >= minSelections! ||
          `Minimum ${minSelections} selections required`;
      }
    }

    return baseRules;
  }, [required, allowMultiple, maxSelections, minSelections, label, rules]);

  // Styles
  const containerClass = mergeStyles({
    width: width || '100%',
    marginBottom: 16,
  });

  const errorClass = mergeStyles({
    color: theme.palette.redDark,
    fontSize: 12,
    marginTop: 4,
  });

  // Get PrincipalType based on allowGroups
  const principalTypes = React.useMemo(() => {
    const types = [PrincipalType.User];
    if (allowGroups) {
      types.push(PrincipalType.SharePointGroup);
    }
    return types;
  }, [allowGroups]);

  // Render field content
  const renderField = (
    fieldValue: ISPUserFieldValue | ISPUserFieldValue[],
    fieldOnChange: (val: ISPUserFieldValue | ISPUserFieldValue[]) => void,
    fieldError?: string
  ) => {
    // Check if SPContext is initialized
    if (!SPContext.context) {
      return (
        <Stack className={containerClass}>
          {label && (
            <Label required={required} disabled={disabled}>
              {label}
            </Label>
          )}
          <Text style={{ color: theme.palette.redDark }}>
            SPContext not initialized. Please initialize SPContext before using SPUserField.
          </Text>
        </Stack>
      );
    }

    return (
      <Stack className={`sp-user-field ${containerClass} ${className || ''}`}>
        {label && (
          <Label required={required} disabled={disabled}>
            {label}
          </Label>
        )}

        {description && (
          <Text variant="small" style={{ marginBottom: 4 }}>
            {description}
          </Text>
        )}

        {displayMode === SPUserFieldDisplayMode.PeoplePicker ? (
          <PeoplePicker
            context={SPContext.peoplepickerContext}
            personSelectionLimit={allowMultiple ? maxSelections : 1}
            groupName={typeof limitToGroup === 'string' ? limitToGroup : undefined}
            showtooltip={true}
            required={required}
            disabled={disabled || readOnly}
            onChange={handlePeoplePickerChange}
            defaultSelectedUsers={selectedUsers}
            principalTypes={principalTypes}
            resolveDelay={resolveDelay}
            ensureUser={true}
            showHiddenInUI={false}
            suggestionsLimit={suggestionLimit}
            placeholder={placeholder}
            webAbsoluteUrl={webUrl || SPContext.webAbsoluteUrl}
          />
        ) : displayMode === SPUserFieldDisplayMode.Compact ? (
          <Stack horizontal tokens={{ childrenGap: 8 }} wrap>
            {Array.isArray(fieldValue) ? (
              fieldValue.map((user, index) => (
                <UserPersona
                  key={index}
                  userIdentifier={user.EMail || user.Name || user.Title}
                  displayName={user.Title}
                  email={user.EMail}
                  size={32 as UserPersonaSize}
                  displayMode={showEmail ? 'avatarAndName' : 'avatar'}
                  showSecondaryText={showEmail}
                />
              ))
            ) : fieldValue ? (
              <UserPersona
                userIdentifier={fieldValue.EMail || fieldValue.Name || fieldValue.Title}
                displayName={fieldValue.Title}
                email={fieldValue.EMail}
                size={40 as UserPersonaSize}
                displayMode={showEmail ? 'avatarAndName' : 'avatar'}
                showSecondaryText={showEmail}
              />
            ) : (
              <Text>No user selected</Text>
            )}
          </Stack>
        ) : (
          // List mode
          <Stack tokens={{ childrenGap: 8 }}>
            {Array.isArray(fieldValue) ? (
              fieldValue.map((user, index) => (
                <UserPersona
                  key={index}
                  userIdentifier={user.EMail || user.Name || user.Title}
                  displayName={user.Title}
                  email={user.EMail}
                  size={48 as UserPersonaSize}
                  displayMode={showEmail ? 'avatarAndName' : 'avatar'}
                  showSecondaryText={showEmail}
                />
              ))
            ) : fieldValue ? (
              <UserPersona
                userIdentifier={fieldValue.EMail || fieldValue.Name || fieldValue.Title}
                displayName={fieldValue.Title}
                email={fieldValue.EMail}
                size={48 as UserPersonaSize}
                displayMode={showEmail ? 'avatarAndName' : 'avatar'}
                showSecondaryText={showEmail}
              />
            ) : (
              <Text>No user selected</Text>
            )}
          </Stack>
        )}

        {/* Show error messages */}
        {(fieldError || errorMessage) && (
          <Text className={errorClass}>{fieldError || errorMessage}</Text>
        )}
      </Stack>
    );
  };

  // If using react-hook-form
  if (control && name) {
    return (
      <Controller
        name={name}
        control={control}
        rules={validationRules}
        defaultValue={defaultValue || (allowMultiple ? [] : null)}
        render={({ field, fieldState }) => (
          <>
            {renderField(
              field.value || (allowMultiple ? [] : null),
              (val) => field.onChange(val),
              fieldState.error?.message
            )}
          </>
        )}
      />
    );
  }

  // Standalone mode
  return renderField(currentValue, (val) => {
    setInternalValue(val);
    if (onChange) {
      onChange(val);
    }
  });
};

export default SPUserField;
