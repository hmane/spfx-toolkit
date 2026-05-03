import { Icon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import * as React from 'react';
import { UserPersona } from '../../UserPersona';
import { FieldType, IFieldChangeRowProps } from '../types';
import { getFieldType } from '../VersionHistoryUtils';

const TRUNCATE_THRESHOLD = 240;

export const FieldChangeRow: React.FC<IFieldChangeRowProps> = props => {
  const { change } = props;

  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleExpand = React.useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const fieldType = getFieldType(change.fieldType);

  const isLongText = (value: string): boolean => value.length > TRUNCATE_THRESHOLD;

  const hasLongPrevious = isLongText(change.previousValueFormatted);
  const hasLongNew = isLongText(change.newValueFormatted);
  const needsExpansion = hasLongPrevious || hasLongNew;

  const renderUserValue = (value: any, formattedValue: string): React.ReactNode => {
    if (formattedValue === '(empty)') {
      return formattedValue;
    }

    if (value && !Array.isArray(value)) {
      const email = value.EMail || value.Email || '';
      const loginName = value.Name || value.LoginName || email;
      const displayName = value.Title || formattedValue;

      if (email || loginName) {
        return (
          <UserPersona
            userIdentifier={loginName}
            displayName={displayName}
            email={email}
            size={24}
            displayMode='avatarAndName'
            showLivePersona={false}
            showSecondaryText={false}
          />
        );
      }
    }

    if (Array.isArray(value)) {
      return (
        <div className='field-value-users'>
          {value.map((user, index) => {
            const email = user.EMail || user.Email || '';
            const loginName = user.Name || user.LoginName || email;
            const displayName = user.Title || user.LookupValue || `User ${index + 1}`;

            if (email || loginName) {
              return (
                <div key={index} className='field-value-user-item'>
                  <UserPersona
                    userIdentifier={loginName}
                    displayName={displayName}
                    email={email}
                    size={24}
                    displayMode='avatarAndName'
                    showLivePersona={false}
                    showSecondaryText={false}
                  />
                </div>
              );
            }
            return <Text key={index}>{displayName}</Text>;
          })}
        </div>
      );
    }

    return formattedValue;
  };

  const renderValue = (value: any, formattedValue: string): React.ReactNode => {
    if (fieldType === FieldType.User || fieldType === FieldType.UserMulti) {
      return renderUserValue(value, formattedValue);
    }

    if (needsExpansion && !isExpanded) {
      const truncated =
        formattedValue.length > TRUNCATE_THRESHOLD
          ? `${formattedValue.substring(0, TRUNCATE_THRESHOLD)}…`
          : formattedValue;
      return truncated;
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
          {value.Description || value.Url}
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

    return formattedValue;
  };

  const changeKind: 'added' | 'removed' | 'modified' =
    change.changeType === 'added'
      ? 'added'
      : change.changeType === 'removed'
      ? 'removed'
      : 'modified';

  const typeTagLabel =
    changeKind === 'added' ? 'Added' : changeKind === 'removed' ? 'Removed' : 'Changed';

  const previousIsEmpty = change.previousValueFormatted === '(empty)';
  const newIsEmpty = change.newValueFormatted === '(empty)';

  return (
    <div className={`field-change-block is-${changeKind}`}>
      <div className='field-change-block-marker' aria-hidden='true' />
      <div className='field-change-block-body'>
        <div className='field-change-block-head'>
          <Text className='field-change-name' title={`${change.displayName} (${change.fieldType})`}>
            {change.displayName}
          </Text>
          <span className={`field-change-type-tag is-${changeKind}`}>{typeTagLabel}</span>
          {needsExpansion && (
            <button
              type='button'
              className='field-change-expand'
              onClick={toggleExpand}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse text' : 'Expand text'}
            >
              <Icon iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'} />
              {isExpanded ? 'Less' : 'More'}
            </button>
          )}
        </div>

        <div className='field-change-diff'>
          {/* Show "From" only when there was a previous value (skip for purely added) */}
          {!previousIsEmpty && (
            <div className='field-change-diff-row'>
              <span className='field-change-diff-label'>From</span>
              <span
                className={`field-change-diff-value is-prev ${
                  previousIsEmpty ? 'is-empty' : ''
                }`}
              >
                {renderValue(change.previousValue, change.previousValueFormatted)}
              </span>
            </div>
          )}

          <div className='field-change-diff-row'>
            <span className='field-change-diff-label'>
              {previousIsEmpty ? 'Set to' : 'To'}
            </span>
            <span
              className={`field-change-diff-value is-new ${newIsEmpty ? 'is-empty' : ''} is-${changeKind}`}
            >
              {renderValue(change.newValue, change.newValueFormatted)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
