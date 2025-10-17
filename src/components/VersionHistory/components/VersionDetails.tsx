import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Text } from '@fluentui/react/lib/Text';
import * as React from 'react';
import { UserPersona } from '../../UserPersona';
import { IVersionDetailsProps } from '../types';
import { formatAbsoluteTime, formatFileSize } from '../VersionHistoryUtils';
import { FieldChangesTable } from './FieldChangesTable';

export const VersionDetails: React.FC<IVersionDetailsProps> = props => {
  const { version, itemInfo, itemType, onDownload, isDownloading } = props;

  const handleDownload = React.useCallback(() => {
    onDownload();
  }, [onDownload]);

  return (
    <div className='version-details'>
      {/* Compact header - single line */}
      <div className='version-details-header'>
        <div className='version-details-info'>
          <span className='version-details-version'>v{version.versionLabel}</span>
          <span className='version-details-separator'>•</span>
          <span className='version-details-user'>
            <UserPersona
              userIdentifier={version.modifiedBy}
              displayName={version.modifiedByName}
              email={version.modifiedByEmail}
              size={24}
              displayMode='nameOnly'
              showLivePersona={false}
              showSecondaryText={false}
            />
          </span>
          <span className='version-details-separator'>•</span>
          <span className='version-details-date'>{formatAbsoluteTime(version.modified)}</span>
        </div>
        <div className='version-details-actions'>
          {itemType === 'document' && version.fileUrl && (
            <button
              className='version-details-download-button'
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Icon iconName='Download' />
              {isDownloading ? 'Downloading...' : `Download v${version.versionLabel}`}
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className='version-details-stats'>
        <div className='version-details-stat'>
          <Icon iconName='Edit' className='version-details-stat-icon' />
          <span>
            {version.changedFields.length} field{version.changedFields.length !== 1 ? 's' : ''}{' '}
            changed
          </span>
        </div>
        {itemType === 'document' && version.size !== null && (
          <div className='version-details-stat'>
            <Icon iconName='Page' className='version-details-stat-icon' />
            <span>File size: {formatFileSize(version.size)}</span>
          </div>
        )}
      </div>

      {/* Check-in comment banner */}
      {version.checkInComment && (
        <div className='version-details-comment'>
          <Text className='version-details-comment-label'>Check-in Comment:</Text>
          <Text className='version-details-comment-text'>{version.checkInComment}</Text>
        </div>
      )}

      {/* Field changes section */}
      <div className='version-details-changes'>
        {version.hasChanges ? (
          <FieldChangesTable changes={version.changedFields} itemInfo={itemInfo} />
        ) : (
          <div className='version-details-no-changes'>
            <MessageBar messageBarType={MessageBarType.info}>
              <Text>No field changes detected in this version.</Text>
              {itemType === 'document' && (
                <Text>The document content may have changed even if metadata fields did not.</Text>
              )}
            </MessageBar>
          </div>
        )}
      </div>
    </div>
  );
};
