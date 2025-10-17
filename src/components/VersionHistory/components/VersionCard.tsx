import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';
import { UserPersona } from '../../UserPersona';
import { IVersionCardProps } from '../types';
import { formatRelativeTime } from '../VersionHistoryUtils';

export const VersionCard: React.FC<IVersionCardProps> = props => {
  const { version, isSelected, onClick } = props;

  const handleClick = React.useCallback(() => {
    onClick();
  }, [onClick]);

  const handleKeyPress = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const relativeTime = formatRelativeTime(version.modified);

  return (
    <div
      className={`version-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role='button'
      tabIndex={0}
      aria-label={`Version ${version.versionLabel} by ${version.modifiedByName}`}
      aria-pressed={isSelected}
    >
      {/* Checkmark for selected state */}
      <div className='version-card-check'>{isSelected && <Icon iconName='CheckMark' />}</div>

      {/* User avatar */}
      <div className='version-card-avatar'>
        <UserPersona
          userIdentifier={version.modifiedBy || version.modifiedByEmail}
          displayName={version.modifiedByName}
          email={version.modifiedByEmail}
          size={32}
          displayMode='avatar'
          showLivePersona={false}
          showSecondaryText={false}
        />
      </div>

      {/* Card content */}
      <div className='version-card-content'>
        {/* Version and time */}
        <div className='version-card-header'>
          <span className='version-card-version'>v{version.versionLabel}</span>
          <span className='version-card-time'>{relativeTime}</span>
        </div>

        {/* Change count */}
        <div className={`version-card-changes ${!version.hasChanges ? 'no-changes' : ''}`}>
          {version.hasChanges
            ? `${version.changedFields.length} ${
                version.changedFields.length === 1 ? 'change' : 'changes'
              }`
            : 'No changes'}
        </div>
      </div>
    </div>
  );
};
