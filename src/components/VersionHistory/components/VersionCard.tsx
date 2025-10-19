import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';
import { UserPersona } from '../../UserPersona';
import { IVersionCardProps } from '../types';
import { formatRelativeTime, formatAbsoluteTime, formatFileSize } from '../VersionHistoryUtils';

export const VersionCard: React.FC<IVersionCardProps> = props => {
  const {
    version,
    isSelected,
    onClick,
    onDownloadVersion,
    onCopyLink,
    showMajorBadge,
    showCopyActions,
    itemType,
  } = props;

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
  const absoluteTime = formatAbsoluteTime(version.modified);
  const isMajor = React.useMemo(() => {
    const parts = version.versionLabel.split('.');
    return parts.length > 1 ? parts[1] === '0' : true;
  }, [version.versionLabel]);

  const commentPreview = version.checkInComment ? version.checkInComment.trim() : '';

  const handleDownload = React.useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onDownloadVersion?.(version);
    },
    [onDownloadVersion, version]
  );

  const handleCopy = React.useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onCopyLink?.(version);
    },
    [onCopyLink, version]
  );

  const sizeValue = typeof version.size === 'number' ? version.size : null;
  const sizeDeltaValue = typeof version.sizeDelta === 'number' ? version.sizeDelta : null;
  const canDownload = itemType === 'document' && !!version.fileUrl && !!onDownloadVersion;
  const canCopy = showCopyActions && !!onCopyLink;
  const hasQuickActions = canDownload || canCopy;
  const showSizeInfo = itemType === 'document' && sizeValue !== null;
  const showSizeDelta = itemType === 'document' && sizeDeltaValue !== null && sizeDeltaValue !== 0;

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
      {/* User avatar */}
      <div className='version-card-avatar'>
        <UserPersona
          userIdentifier={version.modifiedBy || version.modifiedByEmail}
          displayName={version.modifiedByName}
          email={version.modifiedByEmail}
          size={32}
          displayMode='avatar'
          showLivePersona={true}
          showSecondaryText={false}
        />
      </div>

      {/* Card content */}
      <div className='version-card-content'>
        {/* Version and badges */}
        <div className='version-card-header'>
          <span className='version-card-version'>v{version.versionLabel}</span>
          {showMajorBadge && isMajor && <span className='version-card-badge major'>Major</span>}
          {!version.hasChanges && (
            <span className='version-card-nochange' title='No metadata changes'>
              <Icon
                iconName={itemType === 'document' ? 'Page' : 'Info'}
                className='version-card-nochange-icon'
              />
            </span>
          )}
          <span className='version-card-time' title={absoluteTime}>
            {relativeTime}
          </span>
        </div>

        {/* Change insights */}
        {(version.hasChanges || showSizeInfo) && (
          <div className='version-card-meta'>
            {version.hasChanges && (
              <div
                className='version-card-changes'
                title={`${version.changedFields.length} field change${
                  version.changedFields.length === 1 ? '' : 's'
                }`}
              >
                {`${version.changedFields.length} ${
                  version.changedFields.length === 1 ? 'change' : 'changes'
                }`}
              </div>
            )}
            {showSizeInfo && sizeValue !== null && (
              <div className='version-card-size'>
                <Icon iconName='Page' />
                <span>{formatFileSize(sizeValue)}</span>
                {showSizeDelta && (
                  <span
                    className={`version-card-size-delta ${
                      (sizeDeltaValue as number) > 0 ? 'increase' : 'decrease'
                    }`}
                  >
                    {(sizeDeltaValue as number) > 0 ? '+' : ''}
                    {formatFileSize(Math.abs(sizeDeltaValue as number))}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Comment preview */}
        {commentPreview && (
          <div className='version-card-comment' title={commentPreview}>
            <Icon iconName='Feedback' className='version-card-comment-icon' />
            <span>
              {commentPreview.length > 90
                ? `${commentPreview.slice(0, 90)}...`
                : commentPreview}
            </span>
          </div>
        )}
      </div>

      {hasQuickActions && (
        <div className='version-card-actions' aria-label='Version quick actions'>
          {canDownload && (
            <button
              type='button'
              className='version-card-action'
              onClick={handleDownload}
              title='Download this version'
            >
              <Icon iconName='Download' />
            </button>
          )}
          {canCopy && (
            <button
              type='button'
              className='version-card-action'
              onClick={handleCopy}
              title='Copy link to this version'
            >
              <Icon iconName='Link' />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
