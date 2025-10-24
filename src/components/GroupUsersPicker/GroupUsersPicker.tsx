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
    showClearButton = DefaultGroupUsersPickerProps.showClearButton,
    itemRender = defaultItemRender,
    useCache = DefaultGroupUsersPickerProps.useCache,
  } = props;

  const { users, loading, error, retry } = useGroupUsers(groupName, useCache);
  const [selectedValue, setSelectedValue] = React.useState<any>(
    maxUserCount === 1 ? selectedUsers[0] : selectedUsers
  );

  // Update selected value when selectedUsers prop changes
  React.useEffect(() => {
    setSelectedValue(maxUserCount === 1 ? selectedUsers[0] : selectedUsers);
  }, [selectedUsers, maxUserCount]);

  // Handle selection change
  const handleSelectionChange = React.useCallback(
    (e: any) => {
      const newValue = e.value;
      setSelectedValue(newValue);

      // Convert to array format for onChange callback
      const selectedItems: IGroupUser[] = maxUserCount === 1
        ? newValue ? [newValue] : []
        : newValue || [];

      // Call ensureUser if enabled (async, non-blocking)
      if (ensureUser && selectedItems.length > 0) {
        ensureUsers(selectedItems);
      }

      // Trigger onChange callback
      if (onChange) {
        onChange(selectedItems);
      }
    },
    [maxUserCount, ensureUser, onChange]
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
