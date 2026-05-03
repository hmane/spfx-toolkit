import { Icon } from '@fluentui/react/lib/Icon';
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

  const comparedToLabel = React.useMemo(() => {
    const [major, minor] = version.versionLabel.split('.').map(part => Number(part));
    if (Number.isNaN(major)) {
      return 'previous';
    }

    if (!Number.isNaN(minor) && minor > 0) {
      return `v${major}.${minor - 1}`;
    }

    if (major > 1) {
      return `v${major - 1}.0`;
    }

    return 'previous';
  }, [version.versionLabel]);

  return (
    <div className='version-details'>
      {/* Sticky header */}
      <div className='version-details-header'>
        <div className='version-details-header-info'>
          <div className='version-details-version-line'>
            <span className='version-details-version'>{version.versionLabel}</span>
            {isMajor && <span className='version-details-tag major'>Major</span>}
            {!version.hasChanges && (
              <span className='version-details-tag no-change'>No metadata changes</span>
            )}
          </div>
          <div className='version-details-meta'>
            <span className='version-details-meta-item'>
              <UserPersona
                userIdentifier={version.modifiedBy}
                displayName={version.modifiedByName}
                email={version.modifiedByEmail}
                size={24}
                displayMode='avatarAndName'
                showLivePersona={true}
                showSecondaryText={false}
              />
            </span>
            <span className='version-details-meta-item' title={formatAbsoluteTime(version.modified)}>
              <Icon iconName='Clock' className='version-details-meta-icon' />
              {relativeTime}
              <span className='version-details-meta-sub'> · {formatAbsoluteTime(version.modified)}</span>
            </span>
            <span className='version-details-meta-item'>
              <Icon iconName='Tag' className='version-details-meta-icon' />
              {itemInfo.contentType}
            </span>
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
              {isDownloading ? 'Downloading…' : 'Download'}
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className='version-details-scroll'>
        {/* Check-in comment as elegant blockquote */}
        {version.checkInComment && (
          <div className='version-details-comment'>
            <Text className='version-details-comment-label'>Check-in note</Text>
            <Text className='version-details-comment-text'>{version.checkInComment}</Text>
          </div>
        )}

        {/* Comparison line — folds the old "stats bar" into a single readable sentence */}
        <div className='version-details-compare'>
          <span>Comparing</span>
          <span className='version-details-compare-emphasis'>v{version.versionLabel}</span>
          <span>with</span>
          <span className='version-details-compare-emphasis'>{comparedToLabel}</span>
          <span className='version-details-compare-divider'>·</span>
          <span className='version-details-compare-stat'>
            <Icon iconName='Edit' className='version-details-compare-stat-icon' />
            {version.changedFields.length} field
            {version.changedFields.length === 1 ? '' : 's'} changed
          </span>
          {itemType === 'document' && sizeLabel && (
            <>
              <span className='version-details-compare-divider'>·</span>
              <span className='version-details-compare-stat'>
                <Icon iconName='Page' className='version-details-compare-stat-icon' />
                {sizeLabel}
                {sizeDeltaLabel && (
                  <span
                    className={`version-details-compare-size-delta ${
                      version.sizeDelta && version.sizeDelta > 0 ? 'increase' : 'decrease'
                    }`}
                  >
                    {' '}
                    ({sizeDeltaLabel})
                  </span>
                )}
              </span>
            </>
          )}
        </div>

        {/* Diff blocks */}
        <div className='version-details-changes'>
          {version.hasChanges ? (
            <FieldChangesTable changes={version.changedFields} itemInfo={itemInfo} />
          ) : (
            <div className='version-details-no-changes' role='status'>
              <div className='vh-empty'>
                <div className='vh-empty-icon' aria-hidden='true'>
                  <Icon iconName='CheckMark' />
                </div>
                <div className='vh-empty-title'>No metadata changes</div>
                <div className='vh-empty-hint'>
                  {itemType === 'document'
                    ? 'No tracked fields were modified in this version. The file contents may still have changed.'
                    : 'No tracked fields were modified in this version.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
