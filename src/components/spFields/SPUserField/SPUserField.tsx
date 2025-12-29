/**
 * SPUserField - SharePoint User/Group Field Component
 *
 * A user field component that mirrors SharePoint's User/Group picker fields.
 * Supports react-hook-form integration and PnP PeoplePicker component.
 *
 * @packageDocumentation
 */

import { Label } from '@fluentui/react/lib/Label';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { Text } from '@fluentui/react/lib/Text';
import { useTheme } from '@fluentui/react/lib/Theme';
// Import PrincipalType enum directly to avoid CSS side effects
import { PrincipalType } from '@pnp/spfx-controls-react/lib/controls/peoplepicker/PrincipalType';
import * as React from 'react';

// Lazy load PeoplePicker to prevent PnP controls CSS from being bundled when not used
const PeoplePicker = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/PeoplePicker').then((module) => ({
    default: module.PeoplePicker,
  }))
);
import { Controller, RegisterOptions } from 'react-hook-form';
import { IPrincipal } from '../../../types';
import { SPContext } from '../../../utilities/context';
import { getListByNameOrId } from '../../../utilities/spHelper';
import { useFormContext } from '../../spForm/context/FormContext';
import { UserPersona, UserPersonaSize } from '../../UserPersona';
import './SPUserField.css';
import '../spFields.css';
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
    hasError: hasErrorProp = false,
    columnName,
    listId,
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
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resolvedAllowMultiple, setResolvedAllowMultiple] = React.useState<boolean | undefined>(allowMultiple);
  const [resolvedAllowGroups, setResolvedAllowGroups] = React.useState<boolean | undefined>(allowGroups);
  const [resolvedLimitToGroup, setResolvedLimitToGroup] = React.useState<string | string[] | undefined>(limitToGroup);

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

  // Apply error border styles directly via JavaScript (most reliable approach)
  // This handles the case where CSS selectors can't reach deeply nested PnP components
  React.useEffect(() => {
    const wrapperEl = fieldRef.current;
    if (!wrapperEl) return;

    // Find the BasePicker element
    const basePicker = wrapperEl.querySelector('.ms-BasePicker');
    const basePickerText = wrapperEl.querySelector('.ms-BasePicker-text');

    // Helper function to apply error styles
    const applyErrorStyles = () => {
      if (basePicker) {
        const pickerEl = basePicker as HTMLElement;
        pickerEl.style.setProperty('border-color', '#d9534f', 'important');
        pickerEl.style.setProperty('border-width', '1px', 'important');
        pickerEl.style.setProperty('border-style', 'solid', 'important');
        pickerEl.style.setProperty('background-color', '#ffffff', 'important');
        pickerEl.style.setProperty('box-shadow', 'none', 'important');
      }
    };

    // Helper function to reset styles
    const resetStyles = () => {
      if (basePicker) {
        const pickerEl = basePicker as HTMLElement;
        pickerEl.style.removeProperty('border-color');
        pickerEl.style.removeProperty('border-width');
        pickerEl.style.removeProperty('border-style');
        pickerEl.style.removeProperty('background-color');
        pickerEl.style.removeProperty('box-shadow');
      }
    };

    if (hasErrorProp) {
      // Apply error styles initially
      applyErrorStyles();

      // Ensure white background on text element
      if (basePickerText) {
        const textEl = basePickerText as HTMLElement;
        textEl.style.setProperty('background-color', '#ffffff', 'important');
      }

      // Use focusin/focusout events to reapply styles (these bubble, unlike focus/blur)
      const handleFocusIn = () => {
        // Reapply error styles after a tiny delay to override focus styles
        setTimeout(applyErrorStyles, 0);
      };

      const handleFocusOut = () => {
        // Reapply error styles after blur
        setTimeout(applyErrorStyles, 0);
      };

      // Add event listeners to the wrapper to catch focus events from any child
      wrapperEl.addEventListener('focusin', handleFocusIn);
      wrapperEl.addEventListener('focusout', handleFocusOut);

      // Also use MutationObserver as a backup for class changes
      // Debounce to avoid excessive calls during rapid DOM updates
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const observer = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          applyErrorStyles();
        }, 16); // ~60fps debounce
      });
      if (basePicker) {
        observer.observe(basePicker, { attributes: true, attributeFilter: ['class', 'style'] });
      }

      return () => {
        wrapperEl.removeEventListener('focusin', handleFocusIn);
        wrapperEl.removeEventListener('focusout', handleFocusOut);
        if (debounceTimer) clearTimeout(debounceTimer);
        observer.disconnect();
      };
    } else {
      // Reset to default styles
      resetStyles();
      if (basePickerText) {
        const textEl = basePickerText as HTMLElement;
        textEl.style.setProperty('background-color', '#ffffff', 'important');
      }
    }
  }, [hasErrorProp, fieldRef]);

  // Auto-load column metadata when columnName is provided
  React.useEffect(() => {
    if (!columnName || !listId) {
      // If props are provided directly, use them
      setResolvedAllowMultiple(allowMultiple);
      setResolvedAllowGroups(allowGroups);
      setResolvedLimitToGroup(limitToGroup);
      return;
    }

    let isMounted = true;

    const loadColumnMetadata = async () => {
      if (!SPContext.sp) {
        if (isMounted) {
          setError('SPContext not initialized');
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const list = getListByNameOrId(SPContext.sp, listId);
        const field = await list.fields.getByInternalNameOrTitle(columnName)();

        if (!isMounted) return;

        // Extract user field configuration
        const selectionMode = (field as any).SelectionMode;
        const allowMultipleValues = (field as any).AllowMultipleValues;
        const selectionGroup = (field as any).SelectionGroup; // Group ID to limit selection

        // SelectionMode: 0 = PeopleOnly, 1 = PeopleAndGroups
        const groupsAllowed = selectionMode === 1;

        setResolvedAllowMultiple(allowMultipleValues ?? allowMultiple);
        setResolvedAllowGroups(groupsAllowed ?? allowGroups);

        // Set group limitation if specified in column
        if (selectionGroup) {
          // SelectionGroup can be a single ID or multiple IDs
          setResolvedLimitToGroup(selectionGroup.toString());
        } else {
          setResolvedLimitToGroup(limitToGroup);
        }

        SPContext.logger.info('SPUserField: Auto-loaded column metadata', {
          columnName,
          allowMultipleValues,
          selectionMode,
          groupsAllowed,
          selectionGroup,
        });
      } catch (err: any) {
        if (!isMounted) return;

        const errorMsg = `Failed to load column metadata for "${columnName}": ${err?.message || 'Unknown error'}`;
        setError(errorMsg);
        SPContext.logger.error('SPUserField: Failed to load column metadata', err, {
          columnName,
          listId,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadColumnMetadata();

    return () => {
      isMounted = false;
    };
  }, [columnName, listId, allowMultiple, allowGroups, limitToGroup]);

  // Use controlled value if provided, otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;


  // Handle PeoplePicker change
  const handlePeoplePickerChange = React.useCallback(
    (items: any[]) => {
      // Convert PeoplePicker items to IPrincipal format
      const principals: IPrincipal[] = peoplePickerItemsToPrincipals(items);
      const finalValue = resolvedAllowMultiple ? principals : (principals.length > 0 ? principals[0] : null);

      setInternalValue(finalValue as any);

      if (onChange) {
        onChange(finalValue as any);
      }
    },
    [resolvedAllowMultiple, onChange]
  );

  // Merge validation rules
  const validationRules = React.useMemo(() => {
    const baseRules: RegisterOptions = { ...rules };

    if (required && !baseRules.required) {
      baseRules.required = `${label || 'This field'} is required`;
    }

    if (resolvedAllowMultiple) {
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
  }, [required, resolvedAllowMultiple, maxSelections, minSelections, label, rules]);

  // Styles
  const containerClass = mergeStyles({
    width: width || '100%',
    marginBottom: 16,
  });


  // Get PrincipalType based on resolvedAllowGroups
  const principalTypes = React.useMemo(() => {
    const types = [PrincipalType.User];
    if (resolvedAllowGroups) {
      types.push(PrincipalType.SharePointGroup);
    }
    return types;
  }, [resolvedAllowGroups]);

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

    // Show error if column metadata loading failed
    if (error) {
      return (
        <Stack className={containerClass}>
          {label && (
            <Label required={required} disabled={disabled}>
              {label}
            </Label>
          )}
          <Text style={{ color: theme.palette.redDark }}>
            {error}
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

      if (Array.isArray(value)) {
        return value.map(processUser).filter((u): u is string => u !== null);
      } else {
        const formatted = processUser(value);
        return formatted ? [formatted] : [];
      }
    };

    // Use fieldValue (from Controller) to compute these, not the value prop!
    const fieldSelectedUsers = computeSelectedUsers(fieldValue);

    return (
      <Stack className={`sp-user-field ${containerClass} ${className || ''} ${(fieldError || hasErrorProp) ? 'has-error' : ''}`}>
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

        <div
          ref={fieldRef as React.RefObject<HTMLDivElement>}
          className={`sp-user-field-picker-wrapper ${(fieldError || hasErrorProp) ? 'has-error' : ''}`}
        >
        {displayMode === SPUserFieldDisplayMode.PeoplePicker ? (
            <React.Suspense fallback={<Spinner size={SpinnerSize.small} label="Loading people picker..." />}>
              <PeoplePicker
                context={SPContext.peoplepickerContext}
                personSelectionLimit={resolvedAllowMultiple ? maxSelections : 1}
                groupName={typeof resolvedLimitToGroup === 'string' ? resolvedLimitToGroup : undefined}
                showtooltip={true}
                required={required}
                disabled={disabled || readOnly || loading}
                onChange={(items: any[]) => {
                  // Convert PeoplePicker items to IPrincipal format
                  const principals: IPrincipal[] = peoplePickerItemsToPrincipals(items);
                  const finalValue = resolvedAllowMultiple ? principals : (principals.length > 0 ? principals[0] : null);

                  // Update internal state
                  setInternalValue(finalValue as any);

                  // Call fieldOnChange for React Hook Form
                  fieldOnChange(finalValue as any);

                  // Call onChange prop if provided
                  if (onChange) {
                    onChange(finalValue as any);
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
            </React.Suspense>
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

        {/* Error icon - matches DevExtreme exclamation icon style (CSS-based) */}
        {(fieldError || hasErrorProp) && (
          <div className="sp-user-field-error-icon" aria-hidden="true" />
        )}
        </div>

        {/* Error message row - always show field-level validation errors */}
        {fieldError && (
          <div className="sp-field-meta-row">
            <span className="sp-field-error" role="alert">
              <span className="sp-field-error-text">{fieldError}</span>
            </span>
          </div>
        )}
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
        defaultValue={defaultValue || (resolvedAllowMultiple ? emptyArray : emptyValue)}
        render={({ field, fieldState }) => (
          <>
            {renderField(
              field.value || (resolvedAllowMultiple ? emptyArray : emptyValue),
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
