/**
 * GroupUsersPicker Component
 * DevExtreme-based user picker that loads users from a SharePoint group
 * Automatically switches between SelectBox (single) and TagBox (multiple) based on maxUserCount
 */

import * as React from 'react';
import { SelectBox } from 'devextreme-react/select-box';
import { TagBox } from 'devextreme-react/tag-box';
import { LoadPanel } from 'devextreme-react/load-panel';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Label } from '@fluentui/react/lib/Label';
import { Stack } from '@fluentui/react/lib/Stack';
import { DefaultGroupUsersPickerProps, IGroupUser, IGroupUsersPickerProps } from './GroupUsersPicker.types';
import { useGroupUsers } from './hooks/useGroupUsers';
import { ensureUsers } from './utils/ensureUserHelper';
import { getInitials } from '../UserPersona/UserPersonaUtils';
import { SPContext } from '../../utilities/context';
import './GroupUsersPicker.css';

/**
 * Default item render template with user photo/initials
 * Matches UserPersona logic: show photo OR initials, not both
 * imageUrl will be undefined for default SharePoint photos
 */
const defaultItemRender = (item: IGroupUser): React.ReactNode => {
  if (!item) return null;

  const initials = item.imageInitials || getInitials(item.text);
  const hasPhoto = !!item.imageUrl;

  return (
    <div className="group-users-picker-item">
      <div className="group-users-picker-avatar">
        {hasPhoto ? (
          // Show photo (only if it's a real custom photo, not default)
          <img
            src={item.imageUrl}
            alt={item.text}
            className="group-users-picker-photo"
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const initialsDiv = document.createElement('div');
                initialsDiv.className = 'group-users-picker-initials';
                initialsDiv.style.backgroundColor = item.initialsColor
                  ? `var(--persona-color-${item.initialsColor})`
                  : '#0078d4';
                initialsDiv.textContent = initials;
                parent.appendChild(initialsDiv);
              }
            }}
          />
        ) : (
          // Show initials (for users with no photo or default SharePoint photos)
          <div
            className="group-users-picker-initials"
            style={{
              backgroundColor: item.initialsColor ? `var(--persona-color-${item.initialsColor})` : '#0078d4',
            }}
          >
            {initials}
          </div>
        )}
      </div>
      <div className="group-users-picker-text">
        <div className="group-users-picker-name">{item.text}</div>
        {item.secondaryText && (
          <div className="group-users-picker-email">{item.secondaryText}</div>
        )}
      </div>
    </div>
  );
};

/**
 * GroupUsersPicker Component
 */
export const GroupUsersPicker: React.FC<IGroupUsersPickerProps> = (props) => {
  const {
    groupName,
    maxUserCount,
    selectedUsers = [],
    ensureUser = DefaultGroupUsersPickerProps.ensureUser,
    label,
    placeholder = DefaultGroupUsersPickerProps.placeholder,
    disabled = DefaultGroupUsersPickerProps.disabled,
    required = DefaultGroupUsersPickerProps.required,
    onChange,
    onBlur,
    className,
    errorMessage,
    isValid = true,
    showClearButton = DefaultGroupUsersPickerProps.showClearButton,
    itemRender = defaultItemRender,
    useCache = DefaultGroupUsersPickerProps.useCache,
  } = props;

  const { users, loading, error, retry } = useGroupUsers(groupName, useCache);

  // Since we use valueExpr='id', DevExtreme expects the value to be the ID, not the full object.
  // Initialize selectedValue with the ID(s) from selectedUsers.
  const getInitialValue = React.useCallback(() => {
    if (maxUserCount === 1) {
      return selectedUsers[0]?.id;
    }
    return selectedUsers.map(u => u.id);
  }, [maxUserCount, selectedUsers]);

  const [selectedValue, setSelectedValue] = React.useState<any>(getInitialValue);

  // Track previous selectedUsers to avoid unnecessary comparisons
  const prevSelectedUsersRef = React.useRef<IGroupUser[]>(selectedUsers);

  // Update selected value when selectedUsers prop changes
  // IMPORTANT: Only update if the value actually changed to prevent infinite loops
  // We need to find the matching user in the loaded users array to get the correct ID type
  React.useEffect(() => {
    // Only update when users are loaded
    if (users.length === 0) return;

    // Quick check: if selectedUsers reference hasn't changed, skip processing
    const prevSelectedUsers = prevSelectedUsersRef.current;
    const idsMatch = selectedUsers.length === prevSelectedUsers.length &&
      selectedUsers.every((u, i) => u.id === prevSelectedUsers[i]?.id);

    if (idsMatch && prevSelectedUsers.length > 0) {
      return; // No change in selected users
    }

    prevSelectedUsersRef.current = selectedUsers;

    let newValue: any;

    if (maxUserCount === 1) {
      // For single select, find the user in the loaded users to get the correct numeric ID
      const propUserId = selectedUsers[0]?.id;
      if (propUserId !== undefined && propUserId !== null) {
        // Find matching user in the loaded users array to get the numeric ID
        const matchingUser = users.find(u => String(u.id) === String(propUserId));
        newValue = matchingUser?.id; // Use the numeric ID from users array
      } else {
        newValue = undefined;
      }
    } else {
      // For multi-select, map each to the correct numeric ID
      newValue = selectedUsers
        .map(su => {
          const matchingUser = users.find(u => String(u.id) === String(su.id));
          return matchingUser?.id;
        })
        .filter(id => id !== undefined);
    }

    // Only update if the value actually changed (compare as strings to handle type differences)
    const shouldUpdate = maxUserCount === 1
      ? String(selectedValue ?? '') !== String(newValue ?? '')
      : JSON.stringify((Array.isArray(selectedValue) ? selectedValue : []).map(String))
          !== JSON.stringify((Array.isArray(newValue) ? newValue : []).map(String));

    if (shouldUpdate) {
      SPContext.logger.info('GroupUsersPicker: Syncing selectedValue from prop', {
        selectedUsersCount: selectedUsers.length,
        propUserId: selectedUsers[0]?.id,
        resolvedValue: newValue,
        currentSelectedValue: selectedValue,
      });
      setSelectedValue(newValue);
    }
  }, [selectedUsers, maxUserCount, users]);

  // Handle selection change
  const handleSelectionChange = React.useCallback(
    (e: any) => {
      const newValue = e.value;
      setSelectedValue(newValue);

      // Debug logging
      SPContext.logger.info('GroupUsersPicker: Selection changed', {
        newValue,
        newValueType: typeof newValue,
        usersCount: users.length,
        maxUserCount,
      });

      // When valueExpr='id' is set, e.value is just the ID (number), not the full object.
      // We need to look up the full IGroupUser object(s) from the users array.
      let selectedItems: IGroupUser[] = [];

      if (maxUserCount === 1) {
        // Single select: newValue is a single ID (number or string) or undefined/null
        if (newValue !== undefined && newValue !== null) {
          // Compare with type coercion to handle both number and string IDs
          // DevExtreme may return string or number depending on the context
          const foundUser = users.find(u => String(u.id) === String(newValue));
          SPContext.logger.info('GroupUsersPicker: Looking up user', {
            searchId: newValue,
            searchIdType: typeof newValue,
            found: !!foundUser,
            foundUserText: foundUser?.text,
          });
          if (foundUser) {
            selectedItems = [foundUser];
          }
        }
      } else {
        // Multi select: newValue is an array of IDs (numbers or strings) or empty array
        if (newValue && Array.isArray(newValue)) {
          selectedItems = newValue
            .map((id: string | number) => users.find(u => String(u.id) === String(id)))
            .filter((u): u is IGroupUser => u !== undefined);
        }
      }

      SPContext.logger.info('GroupUsersPicker: Calling onChange', {
        selectedItemsCount: selectedItems.length,
        selectedItems: selectedItems.map(u => ({ id: u.id, text: u.text })),
      });

      // Call ensureUser if enabled (async, non-blocking)
      if (ensureUser && selectedItems.length > 0) {
        ensureUsers(selectedItems);
      }

      // Trigger onChange callback
      if (onChange) {
        onChange(selectedItems);
      }
    },
    [maxUserCount, ensureUser, onChange, users]
  );

  // Handle blur event
  const handleBlur = React.useCallback(() => {
    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);

  // Show error message if group loading failed
  if (error && !loading) {
    return (
      <Stack className={className}>
        {label && <Label required={required}>{label}</Label>}
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={false}
          onDismiss={retry}
          dismissButtonAriaLabel="Retry"
        >
          {error}
        </MessageBar>
      </Stack>
    );
  }

  // Common props for both SelectBox and TagBox
  const commonProps = {
    dataSource: users,
    displayExpr: 'text',
    valueExpr: 'id',
    searchEnabled: false, // Disabled per requirements
    disabled: disabled || loading,
    placeholder: loading ? 'Loading users...' : placeholder,
    showClearButton,
    itemRender,
    onValueChanged: handleSelectionChange,
    onFocusOut: handleBlur,
    className: 'group-users-picker-control',
    isValid: isValid,
  };

  return (
    <Stack className={`group-users-picker ${className || ''}`}>
      {label && <Label required={required}>{label}</Label>}

      {loading && (
        <div className="group-users-picker-loading">
          <LoadPanel
            visible={true}
            message="Loading users..."
            position={{ of: '.group-users-picker-control' }}
          />
        </div>
      )}

      {maxUserCount === 1 ? (
        <SelectBox
          {...commonProps}
          value={selectedValue}
        />
      ) : (
        <TagBox
          {...commonProps}
          value={selectedValue}
          maxDisplayedTags={3}
          showMultiTagOnly={false}
        />
      )}

      {errorMessage && (
        <div className="group-users-picker-error">
          <MessageBar messageBarType={MessageBarType.error} isMultiline={false}>
            {errorMessage}
          </MessageBar>
        </div>
      )}
    </Stack>
  );
};
