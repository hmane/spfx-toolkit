import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Text } from '@fluentui/react/lib/Text';
import * as React from 'react';
import { UserPersona } from '../../UserPersona';
import { IVersionDetailsProps } from '../types';
import { formatAbsoluteTime, formatFileSize, formatRelativeTime } from '../VersionHistoryUtils';
import { FieldChangesTable } from './FieldChangesTable';

export const VersionDetails: React.FC<IVersionDetailsProps> = props => {
  const {
    version,
    itemInfo,
    itemType,
    onDownload,
    isDownloading,
    onCopyLink,
    allowCopyLink = false,
  } = props;

  const relativeTime = React.useMemo(
    () => formatRelativeTime(version.modified),
    [version.modified]
  );

  const handleDownload = React.useCallback(() => {
    onDownload();
  }, [onDownload]);

  const handleCopyLink = React.useCallback(() => {
    onCopyLink(version);
  }, [onCopyLink, version]);

  const sizeLabel = React.useMemo(
    () => (version.size !== null ? formatFileSize(version.size) : null),
    [version.size]
  );

  const sizeDeltaLabel = React.useMemo(() => {
    if (version.sizeDelta === null || version.sizeDelta === 0) {
      return null;
    }
    const sign = version.sizeDelta > 0 ? '+' : '-';
    return `${sign}${formatFileSize(Math.abs(version.sizeDelta))}`;
  }, [version.sizeDelta]);

  const isMajor = React.useMemo(() => {
    const parts = version.versionLabel.split('.');
    return parts.length > 1 ? parts[1] === '0' : true;
  }, [version.versionLabel]);

  return (
    <div className='version-details'>
      {/* Header */}
      <div className='version-details-header'>
        <div className='version-details-info'>
          <div className='version-details-pill-row'>
            <span className='version-details-version'>v{version.versionLabel}</span>
            {isMajor && <span className='version-details-badge major'>Major</span>}
            {!version.hasChanges && (
              <span className='version-details-badge no-change'>Metadata unchanged</span>
            )}
          </div>
          <div className='version-details-meta'>
            <div className='version-details-meta-item'>
              <UserPersona
                userIdentifier={version.modifiedBy}
                displayName={version.modifiedByName}
                email={version.modifiedByEmail}
                size={28}
                displayMode='avatarAndName'
                showLivePersona={true}
                showSecondaryText={false}
              />
            </div>
            <div className='version-details-meta-item'>
              <Icon iconName='Clock' className='version-details-meta-icon' />
              <span>
                {formatAbsoluteTime(version.modified)}
                <span className='version-details-meta-sub'> - {relativeTime}</span>
              </span>
            </div>
            <div className='version-details-meta-item'>
              <Icon iconName='Tag' className='version-details-meta-icon' />
              <span>{itemInfo.contentType}</span>
            </div>
          </div>
        </div>
        <div className='version-details-actions'>
          {allowCopyLink && (
            <button
              className='version-details-secondary-button'
              type='button'
              onClick={handleCopyLink}
            >
              <Icon iconName='Link' />
              Copy link
            </button>
          )}
          {itemType === 'document' && version.fileUrl && (
            <button
              className='version-details-primary-button'
              onClick={handleDownload}
              disabled={isDownloading}
              type='button'
            >
              <Icon iconName='Download' />
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className='version-details-stats'>
        <div className='version-details-stat'>
          <Icon iconName='Edit' className='version-details-stat-icon' />
          <span>
            {version.changedFields.length} field
            {version.changedFields.length === 1 ? '' : 's'} changed
          </span>
        </div>
        {itemType === 'document' && sizeLabel && (
          <div className='version-details-stat'>
            <Icon iconName='Page' className='version-details-stat-icon' />
            <span>
              File size: {sizeLabel}
              {sizeDeltaLabel && (
                <span
                  className={`version-details-size-delta ${
                    version.sizeDelta && version.sizeDelta > 0 ? 'increase' : 'decrease'
                  }`}
                >
                  {sizeDeltaLabel}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Check-in comment banner */}
      {version.checkInComment && (
        <div className='version-details-comment'>
          <Text className='version-details-comment-label'>Check-in comment</Text>
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
              <Text>No metadata changes detected in this version.</Text>
              {itemType === 'document' && (
                <Text>The file content may still have changed even if metadata stayed the same.</Text>
              )}
            </MessageBar>
          </div>
        )}
      </div>
    </div>
  );
};
