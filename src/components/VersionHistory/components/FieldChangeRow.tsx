import { Icon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import * as React from 'react';
import { UserPersona } from '../../UserPersona';
import { FieldType, IFieldChangeRowProps } from '../types';
import { getFieldType } from '../VersionHistoryUtils';

// Character threshold for showing the inline expand chevron. Below this, CSS
// `text-overflow: ellipsis` handles visual truncation responsively; above it,
// the user gets an explicit toggle to wrap the full content into the row.
const INLINE_EXPAND_THRESHOLD = 100;

// Compact multi-user view: show this many personas before collapsing the rest
// into a "+N" badge (which expands inline on click).
const MULTI_USER_INLINE_MAX = 2;

export const FieldChangeRow: React.FC<IFieldChangeRowProps> = props => {
  const { change } = props;

  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleExpand = React.useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const fieldType = getFieldType(change.fieldType);

  const isLongText = (value: string): boolean => value.length > INLINE_EXPAND_THRESHOLD;
  const hasLongPrevious = isLongText(change.previousValueFormatted);
  const hasLongNew = isLongText(change.newValueFormatted);

  // A multi-user value with more than the inline cap also benefits from the
  // expand toggle so all personas can be seen at once.
  const isOverflowMultiUser = (value: unknown): boolean =>
    Array.isArray(value) && value.length > MULTI_USER_INLINE_MAX;
  const hasOverflowUsers =
    (fieldType === FieldType.User || fieldType === FieldType.UserMulti) &&
    (isOverflowMultiUser(change.previousValue) || isOverflowMultiUser(change.newValue));

  const needsExpansion = hasLongPrevious || hasLongNew || hasOverflowUsers;

  const renderUserPersona = (user: any, key?: React.Key): React.ReactNode => {
    const email = user?.EMail || user?.Email || '';
    const loginName = user?.Name || user?.LoginName || email;
    const displayName = user?.Title || user?.LookupValue || email || 'User';
    return (
      <UserPersona
        key={key}
        userIdentifier={loginName}
        displayName={displayName}
        email={email}
        size={24}
        displayMode='avatarAndName'
        showLivePersona={false}
        showSecondaryText={false}
      />
    );
  };

  const renderUserValue = (value: any, formattedValue: string): React.ReactNode => {
    if (formattedValue === '(empty)') return formattedValue;

    // Single user object
    if (value && !Array.isArray(value)) {
      const email = value.EMail || value.Email || '';
      const loginName = value.Name || value.LoginName || email;
      if (email || loginName) return renderUserPersona(value);
      return value.Title || formattedValue;
    }

    // Multi-user
    if (Array.isArray(value)) {
      if (value.length === 0) return formattedValue;

      // Expanded: render all personas, wrapping naturally
      if (isExpanded) {
        return (
          <span className='field-change-row-users is-wrap'>
            {value.map((u, i) => renderUserPersona(u, i))}
          </span>
        );
      }

      // Collapsed: first N personas + "+M more" badge
      const visible = value.slice(0, MULTI_USER_INLINE_MAX);
      const overflow = value.length - visible.length;
      return (
        <span className='field-change-row-users'>
          {visible.map((u, i) => renderUserPersona(u, i))}
          {overflow > 0 && (
            <span className='field-change-row-overflow' aria-label={`${overflow} more`}>
              +{overflow}
            </span>
          )}
        </span>
      );
    }

    return formattedValue;
  };

  const renderTextValue = (formattedValue: string): React.ReactNode => {
    // CSS handles ellipsis when collapsed; when expanded the cell wraps.
    return formattedValue;
  };

  const renderValue = (value: any, formattedValue: string): React.ReactNode => {
    if (fieldType === FieldType.User || fieldType === FieldType.UserMulti) {
      return renderUserValue(value, formattedValue);
    }

    if (fieldType === FieldType.URL && value && typeof value === 'object' && value.Url) {
      return (
        <a
          href={value.Url}
          target='_blank'
          rel='noopener noreferrer'
          className='field-value-link'
          onClick={e => e.stopPropagation()}
        >
          <span className='field-value-link-text'>{value.Description || value.Url}</span>
          <Icon iconName='NavigateExternalInline' className='field-value-link-icon' />
        </a>
      );
    }

    if (fieldType === FieldType.Boolean) {
      const isTrue =
        value === true || value === 'true' || value === '1' || value === 1 || value === 'Yes';
      return (
        <span className='field-value-boolean'>
          <Icon
            iconName={isTrue ? 'CheckMark' : 'Cancel'}
            className={`field-value-boolean-icon ${isTrue ? 'true' : 'false'}`}
          />
          {formattedValue}
        </span>
      );
    }

    return renderTextValue(formattedValue);
  };

  const changeKind: 'added' | 'removed' | 'modified' =
    change.changeType === 'added'
      ? 'added'
      : change.changeType === 'removed'
      ? 'removed'
      : 'modified';

  const indicatorChar = changeKind === 'added' ? '+' : changeKind === 'removed' ? '−' : '●';

  const previousIsEmpty = change.previousValueFormatted === '(empty)';
  const newIsEmpty = change.newValueFormatted === '(empty)';

  const ariaTypeLabel =
    changeKind === 'added' ? 'added' : changeKind === 'removed' ? 'removed' : 'changed';

  return (
    <div
      className={`field-change-row is-${changeKind}${isExpanded ? ' is-expanded' : ''}${
        needsExpansion ? ' has-expand' : ''
      }`}
      aria-label={`${change.displayName} ${ariaTypeLabel}`}
    >
      <span
        className={`field-change-row-indicator is-${changeKind}`}
        aria-hidden='true'
        title={ariaTypeLabel}
      >
        {indicatorChar}
      </span>
      <Text className='field-change-row-name' title={`${change.displayName} (${change.fieldType})`}>
        {change.displayName}
      </Text>
      <span
        className={`field-change-row-value is-prev${previousIsEmpty ? ' is-empty' : ''}`}
        title={previousIsEmpty ? '' : change.previousValueFormatted}
      >
        {previousIsEmpty ? '—' : renderValue(change.previousValue, change.previousValueFormatted)}
      </span>
      <Icon iconName='ChevronRightSmall' className='field-change-row-arrow' aria-hidden='true' />
      <span
        className={`field-change-row-value is-new is-${changeKind}${newIsEmpty ? ' is-empty' : ''}`}
        title={newIsEmpty ? '' : change.newValueFormatted}
      >
        {newIsEmpty ? '—' : renderValue(change.newValue, change.newValueFormatted)}
      </span>
      {needsExpansion ? (
        <button
          type='button'
          className='field-change-row-expand'
          onClick={toggleExpand}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse value' : 'Expand value'}
        >
          <Icon iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'} />
        </button>
      ) : (
        // Spacer keeps the grid column count consistent so rows align vertically.
        <span className='field-change-row-expand-spacer' aria-hidden='true' />
      )}
    </div>
  );
};
