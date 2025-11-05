/**
 * SPUserField - SharePoint User/Group Field Component
 *
 * A user field component that mirrors SharePoint's User/Group picker fields.
 * Supports react-hook-form integration and PnP PeoplePicker component.
 *
 * @packageDocumentation
 */

import { Label } from '@fluentui/react/lib/Label';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { Text } from '@fluentui/react/lib/Text';
import { useTheme } from '@fluentui/react/lib/Theme';
import { PeoplePicker, PrincipalType } from '@pnp/spfx-controls-react/lib/PeoplePicker';
import * as React from 'react';
import { Controller, RegisterOptions } from 'react-hook-form';
import { IPrincipal } from '../../../types';
import { SPContext } from '../../../utilities/context';
import { useFormContext } from '../../spForm/context/FormContext';
import { UserPersona, UserPersonaSize } from '../../UserPersona';
import './SPUserField.css';
import { ISPUserFieldProps, SPUserFieldDisplayMode, SPUserFieldValue } from './SPUserField.types';
import {
  getUserDisplayName,
  getUserIdentifier,
  normalizeToIPrincipal,
  peoplePickerItemsToPrincipals,
  principalToPeoplePickerFormat
} from './SPUserField.utils';

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
  // Get control from FormContext if not provided as prop
  const formContext = useFormContext();
  const effectiveControl = props.control || formContext?.control;

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
    control: controlProp,
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
    inputRef,
  } = props;

  const theme = useTheme();

  // Stable default values to prevent re-render loops
  const emptyArray = React.useRef<SPUserFieldValue[]>([]).current;
  const emptyValue = React.useRef<null>(null).current;

  const [internalValue, setInternalValue] = React.useState<SPUserFieldValue | SPUserFieldValue[]>(
    defaultValue || (allowMultiple ? emptyArray : emptyValue as any)
  );

  // Create internal ref if not provided
  const internalRef = React.useRef<HTMLDivElement>(null);
  const fieldRef = inputRef || internalRef;

  // Register field with FormContext for scroll-to-error functionality
  React.useEffect(() => {
    if (name && formContext?.registry) {
      formContext.registry.register(name, {
        name,
        label: label, // Only use label if explicitly provided, don't fallback to name
        required,
        ref: fieldRef as React.RefObject<HTMLElement>,
        section: undefined,
      });

      return () => {
        formContext.registry.unregister(name);
      };
    }
  }, [name, label, required, formContext, fieldRef]);

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  // Debug logging - log current value changes
  React.useEffect(() => {
    if (SPContext.logger) {
      SPContext.logger.info(`🔍 SPUserField[${name}] - Current Value:`, {
        name,
        currentValue,
        hasValue: !!currentValue,
        valueType: Array.isArray(currentValue) ? 'array' : typeof currentValue,
        valueDetails: currentValue ? (Array.isArray(currentValue) ? currentValue : [currentValue]).map((v: any) => ({
          id: normalizeToIPrincipal(v).id,
          email: normalizeToIPrincipal(v).email,
          title: normalizeToIPrincipal(v).title,
        })) : null,
      });
    }
  }, [currentValue, name]);

  // Convert value to string[] (user IDs or emails) for PeoplePicker
  // Filter out empty/invalid users
  const selectedUsers = React.useMemo(() => {
    if (!currentValue) return [];

    const processUser = (user: SPUserFieldValue) => {
      const principal = normalizeToIPrincipal(user);
      // Skip users with no id or empty id
      if (!principal.id || principal.id === '' || principal.id === '0') {
        return null;
      }
      const formatted = principalToPeoplePickerFormat(principal);
      // Skip if no valid identifier
      if (!formatted || formatted === '') {
        return null;
      }
      return formatted;
    };

    let result: string[];
    if (Array.isArray(currentValue)) {
      result = currentValue.map(processUser).filter((u): u is string => u !== null);
    } else {
      const formatted = processUser(currentValue);
      result = formatted ? [formatted] : [];
    }

    // Log selectedUsers result
    if (SPContext.logger && name) {
      SPContext.logger.info(`🔍 SPUserField[${name}] - Selected Users:`, {
        name,
        selectedUsers: result,
        count: result.length,
      });
    }

    return result;
  }, [currentValue, name]);

  // Generate a key for PeoplePicker to force remount when value changes externally
  // This is needed because PeoplePicker's defaultSelectedUsers only works on initial mount
  // Use email/loginName instead of id for better stability (id can be empty on new users)
  const peoplePickerKey = React.useMemo(() => {
    if (!currentValue) return 'empty';

    const getKey = (user: SPUserFieldValue) => {
      const principal = normalizeToIPrincipal(user);
      // Use email or loginName for key (more stable than id which can be empty)
      return principal.email || principal.loginName || principal.id || 'unknown';
    };

    let result: string;
    if (Array.isArray(currentValue)) {
      const keys = currentValue
        .map(getKey)
        .filter(k => k && k !== 'unknown')
        .join(',');
      result = keys || 'empty-array';
    } else {
      const key = getKey(currentValue);
      result = (key && key !== 'unknown') ? key : 'single-unknown';
    }

    // Log peoplePickerKey result
    if (SPContext.logger && name) {
      SPContext.logger.info(`🔍 SPUserField[${name}] - PeoplePicker Key:`, {
        name,
        peoplePickerKey: result,
      });
    }

    return result;
  }, [currentValue, name]);

  // Handle PeoplePicker change
  const handlePeoplePickerChange = React.useCallback(
    (items: any[]) => {
      // Convert PeoplePicker items to IPrincipal format
      const principals: IPrincipal[] = peoplePickerItemsToPrincipals(items);
      const finalValue = allowMultiple ? principals : (principals.length > 0 ? principals[0] : null);

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
          maxSelections: (val: SPUserFieldValue[]) =>
            !val || val.length <= maxSelections! ||
            `Maximum ${maxSelections} selections allowed`,
        };
      }

      if (minSelections) {
        if (!baseRules.validate) {
          baseRules.validate = {};
        }
        (baseRules.validate as Record<string, any>).minSelections = (val: SPUserFieldValue[]) =>
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
    fieldValue: SPUserFieldValue | SPUserFieldValue[],
    fieldOnChange: (val: SPUserFieldValue | SPUserFieldValue[]) => void,
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

    // IMPORTANT: Compute selectedUsers from fieldValue (not from value prop!)
    // This is the data passed by Controller from React Hook Form
    const computeSelectedUsers = (value: SPUserFieldValue | SPUserFieldValue[]): string[] => {
      if (!value) return [];

      const processUser = (user: SPUserFieldValue) => {
        const principal = normalizeToIPrincipal(user);
        // Skip users with no id or empty id
        if (!principal.id || principal.id === '' || principal.id === '0') {
          return null;
        }
        const formatted = principalToPeoplePickerFormat(principal);
        // Skip if no valid identifier
        if (!formatted || formatted === '') {
          return null;
        }
        return formatted;
      };

      let result: string[];
      if (Array.isArray(value)) {
        result = value.map(processUser).filter((u): u is string => u !== null);
      } else {
        const formatted = processUser(value);
        result = formatted ? [formatted] : [];
      }

      // Log selectedUsers result
      if (SPContext.logger && name) {
        SPContext.logger.info(`🔍 SPUserField[${name}] - Computed Selected Users from fieldValue:`, {
          name,
          fieldValue: value,
          selectedUsers: result,
          count: result.length,
        });
      }

      return result;
    };

    // IMPORTANT: Compute peoplePickerKey from fieldValue (not from value prop!)
    const computePeoplePickerKey = (value: SPUserFieldValue | SPUserFieldValue[]): string => {
      if (!value) return 'empty';

      const getKey = (user: SPUserFieldValue) => {
        const principal = normalizeToIPrincipal(user);
        // Use email or loginName for key (more stable than id which can be empty)
        return principal.email || principal.loginName || principal.id || 'unknown';
      };

      let result: string;
      if (Array.isArray(value)) {
        const keys = value
          .map(getKey)
          .filter(k => k && k !== 'unknown')
          .join(',');
        result = keys || 'empty-array';
      } else {
        const key = getKey(value);
        result = (key && key !== 'unknown') ? key : 'single';
      }

      // Log peoplePickerKey result
      if (SPContext.logger && name) {
        SPContext.logger.info(`🔍 SPUserField[${name}] - Computed PeoplePicker Key from fieldValue:`, {
          name,
          fieldValue: value,
          peoplePickerKey: result,
        });
      }

      return result;
    };

    // Use fieldValue (from Controller) to compute these, not the value prop!
    const fieldSelectedUsers = computeSelectedUsers(fieldValue);
    const fieldPeoplePickerKey = computePeoplePickerKey(fieldValue);

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

        <div ref={fieldRef as React.RefObject<HTMLDivElement>}>
        {displayMode === SPUserFieldDisplayMode.PeoplePicker ? (
          <div style={{
            border: fieldError ? '1px solid #a80000' : 'none',
            borderRadius: fieldError ? '2px' : '0',
            padding: fieldError ? '0' : '0'
          }}>
            <PeoplePicker
              key={fieldPeoplePickerKey}
              context={SPContext.peoplepickerContext}
              personSelectionLimit={allowMultiple ? maxSelections : 1}
              groupName={typeof limitToGroup === 'string' ? limitToGroup : undefined}
              showtooltip={true}
              required={required}
              disabled={disabled || readOnly}
              onChange={(items: any[]) => {
                // Log PeoplePicker onChange
                if (SPContext.logger && name) {
                  SPContext.logger.info(`🔍 SPUserField[${name}] - PeoplePicker onChange:`, {
                    name,
                    items,
                    itemCount: items?.length || 0,
                  });
                }

                // Convert PeoplePicker items to IPrincipal format
                const principals: IPrincipal[] = peoplePickerItemsToPrincipals(items);
                const finalValue = allowMultiple ? principals : (principals.length > 0 ? principals[0] : null);

                // Log converted value
                if (SPContext.logger && name) {
                  SPContext.logger.info(`🔍 SPUserField[${name}] - Converted Value:`, {
                    name,
                    principals,
                    finalValue,
                    finalValueDetails: finalValue ? (Array.isArray(finalValue) ? finalValue : [finalValue]).map((v: any) => ({
                      id: v.id,
                      email: v.email,
                      title: v.title,
                    })) : null,
                  });
                }

                // Update internal state
                setInternalValue(finalValue as any);

                // Call fieldOnChange for React Hook Form
                if (SPContext.logger && name) {
                  SPContext.logger.info(`🔍 SPUserField[${name}] - Calling fieldOnChange:`, {
                    name,
                    finalValue,
                  });
                }
                fieldOnChange(finalValue as any);

                // Call onChange prop if provided
                if (onChange) {
                  if (SPContext.logger && name) {
                    SPContext.logger.info(`🔍 SPUserField[${name}] - Calling onChange prop:`, {
                      name,
                      finalValue,
                    });
                  }
                  onChange(finalValue as any);
                }

                if (SPContext.logger && name) {
                  SPContext.logger.success(`✅ SPUserField[${name}] - onChange complete`);
                }
              }}
              defaultSelectedUsers={fieldSelectedUsers}
              principalTypes={principalTypes}
              resolveDelay={resolveDelay}
              ensureUser={true}
              showHiddenInUI={false}
              suggestionsLimit={suggestionLimit}
              placeholder={placeholder}
              webAbsoluteUrl={webUrl || SPContext.webAbsoluteUrl}
            />
          </div>
        ) : displayMode === SPUserFieldDisplayMode.Compact ? (
          <Stack horizontal tokens={{ childrenGap: 8 }} wrap>
            {Array.isArray(fieldValue) ? (
              fieldValue.map((user, index) => {
                const principal = normalizeToIPrincipal(user);
                return (
                  <UserPersona
                    key={index}
                    userIdentifier={getUserIdentifier(user)}
                    displayName={getUserDisplayName(user)}
                    email={principal.email}
                    size={32 as UserPersonaSize}
                    displayMode={showEmail ? 'avatarAndName' : 'avatar'}
                    showSecondaryText={showEmail}
                  />
                );
              })
            ) : fieldValue ? (
              <UserPersona
                userIdentifier={getUserIdentifier(fieldValue)}
                displayName={getUserDisplayName(fieldValue)}
                email={normalizeToIPrincipal(fieldValue).email}
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
              fieldValue.map((user, index) => {
                const principal = normalizeToIPrincipal(user);
                return (
                  <UserPersona
                    key={index}
                    userIdentifier={getUserIdentifier(user)}
                    displayName={getUserDisplayName(user)}
                    email={principal.email}
                    size={48 as UserPersonaSize}
                    displayMode={showEmail ? 'avatarAndName' : 'avatar'}
                    showSecondaryText={showEmail}
                  />
                );
              })
            ) : fieldValue ? (
              <UserPersona
                userIdentifier={getUserIdentifier(fieldValue)}
                displayName={getUserDisplayName(fieldValue)}
                email={normalizeToIPrincipal(fieldValue).email}
                size={48 as UserPersonaSize}
                displayMode={showEmail ? 'avatarAndName' : 'avatar'}
                showSecondaryText={showEmail}
              />
            ) : (
              <Text>No user selected</Text>
            )}
          </Stack>
        )}
        </div>
      </Stack>
    );
  };

  // If using react-hook-form (from prop or context)
  if (effectiveControl && name) {
    return (
      <Controller
        name={name}
        control={effectiveControl}
        rules={validationRules}
        defaultValue={defaultValue || (allowMultiple ? emptyArray : emptyValue)}
        render={({ field, fieldState }) => (
          <>
            {renderField(
              field.value || (allowMultiple ? emptyArray : emptyValue),
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
