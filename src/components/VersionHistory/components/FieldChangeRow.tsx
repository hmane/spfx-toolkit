import { Icon, Text, TooltipHost } from '@fluentui/react';
import * as React from 'react';
import { UserPersona } from '../../UserPersona';
import { FieldType, IFieldChangeRowProps } from '../types';
import { getFieldType } from '../VersionHistoryUtils';

export const FieldChangeRow: React.FC<IFieldChangeRowProps> = props => {
  const { change } = props;

  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleExpand = React.useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const fieldType = getFieldType(change.fieldType);

  const isLongText = (value: string): boolean => {
    return value.length > 150;
  };

  const hasLongPrevious = isLongText(change.previousValueFormatted);
  const hasLongNew = isLongText(change.newValueFormatted);
  const needsExpansion = hasLongPrevious || hasLongNew;

  const renderValue = (value: any, formattedValue: string, isNew: boolean): React.ReactNode => {
    if (fieldType === FieldType.User || fieldType === FieldType.UserMulti) {
      return renderUserValue(value, formattedValue);
    }

    if (needsExpansion && !isExpanded) {
      const truncated =
        formattedValue.length > 150 ? `${formattedValue.substring(0, 150)}...` : formattedValue;
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

  const getChangeIcon = (): { iconName: string; className: string } => {
    switch (change.changeType) {
      case 'added':
        return { iconName: 'CircleAdditionSolid', className: 'added' };
      case 'removed':
        return { iconName: 'StatusCircleErrorX', className: 'removed' };
      case 'modified':
        return { iconName: 'EditSolid12', className: 'modified' };
      default:
        return { iconName: 'Edit', className: 'modified' };
    }
  };

  const changeIcon = getChangeIcon();

  return (
    <div className={`field-change-row ${isExpanded ? 'expanded' : ''}`}>
      {/* Field name column */}
      <div className='field-change-cell field-name'>
        <div className='field-name-content'>
          <TooltipHost content={`Type: ${change.fieldType}`}>
            <Icon
              iconName={changeIcon.iconName}
              className={`field-change-icon ${changeIcon.className}`}
            />
          </TooltipHost>
          <Text className='field-name-text'>{change.displayName}</Text>
        </div>
      </div>

      {/* Combined value column: Previous → New */}
      <div className='field-change-cell field-values-cell'>
        <div className='field-values'>
          <span
            className={`field-value-previous ${
              change.previousValueFormatted === '(empty)' ? 'empty' : ''
            }`}
          >
            {renderValue(change.previousValue, change.previousValueFormatted, false)}
          </span>
          <span className='field-value-arrow'>→</span>
          <span
            className={`field-value-new ${change.newValueFormatted === '(empty)' ? 'empty' : ''} ${
              change.changeType === 'added' ? 'highlight-added' : ''
            } ${change.changeType === 'modified' ? 'highlight-modified' : ''}`}
          >
            {renderValue(change.newValue, change.newValueFormatted, true)}
          </span>
        </div>
      </div>

      {/* Expand button for long text */}
      {needsExpansion && (
        <div className='field-change-cell field-expand'>
          <TooltipHost content={isExpanded ? 'Show less' : 'Show more'}>
            <Icon
              iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
              className='field-expand-icon'
              onClick={toggleExpand}
              role='button'
              tabIndex={0}
              onKeyPress={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleExpand();
                }
              }}
              aria-label={isExpanded ? 'Collapse text' : 'Expand text'}
            />
          </TooltipHost>
        </div>
      )}
    </div>
  );
};
