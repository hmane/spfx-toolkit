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

  const handleKeyDown = React.useCallback(
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

  // Up to 3 field names for the inline summary; the rest collapse into "+N more".
  const previewFields = React.useMemo(
    () => version.changedFields.slice(0, 3).map(f => f.displayName),
    [version.changedFields]
  );
  const extraFieldCount = Math.max(version.changedFields.length - previewFields.length, 0);

  const sizeValue = typeof version.size === 'number' ? version.size : null;
  const sizeDeltaValue = typeof version.sizeDelta === 'number' ? version.sizeDelta : null;
  const showSizeInfo = itemType === 'document' && sizeValue !== null;
  const showSizeDelta = itemType === 'document' && sizeDeltaValue !== null && sizeDeltaValue !== 0;

  const canDownload = itemType === 'document' && !!version.fileUrl && !!onDownloadVersion;
  const canCopy = showCopyActions && !!onCopyLink;
  const hasQuickActions = canDownload || canCopy;

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

  return (
    <div
      className={`version-card ${isSelected ? 'selected' : ''} ${
        showMajorBadge && isMajor ? 'is-major' : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role='button'
      tabIndex={0}
      aria-label={`Version ${version.versionLabel} by ${version.modifiedByName}`}
      aria-pressed={isSelected}
    >
      {/* Timeline rail (dot + connecting line) */}
      <div className='version-card-rail' aria-hidden='true'>
        <div className='version-card-rail-dot' />
        <div className='version-card-rail-line' />
      </div>

      {/* Avatar */}
      <div className='version-card-avatar'>
        <UserPersona
          userIdentifier={version.modifiedBy || version.modifiedByEmail}
          displayName={version.modifiedByName}
          email={version.modifiedByEmail}
          size={28}
          displayMode='avatar'
          showLivePersona={true}
          showSecondaryText={false}
        />
      </div>

      {/* Top: author */}
      <div className='version-card-author' title={version.modifiedByName}>
        {version.modifiedByName}
      </div>

      {/* Top right: version + time */}
      <div className='version-card-meta-line'>
        {showMajorBadge && isMajor && (
          <span className='version-card-major-dot' aria-label='Major version' />
        )}
        <span className='version-card-version'>{version.versionLabel}</span>
        <span className='version-card-time' title={absoluteTime}>
          {relativeTime}
        </span>
      </div>

      {/* Bottom: change summary OR placeholder for unchanged */}
      <div className='version-card-summary'>
        {version.hasChanges && previewFields.length > 0 ? (
          <>
            <span className='version-card-summary-count'>
              {version.changedFields.length}{' '}
              {version.changedFields.length === 1 ? 'change' : 'changes'}
            </span>
            <span className='version-card-summary-fields'>
              {previewFields.join(', ')}
              {extraFieldCount > 0 ? `, +${extraFieldCount} more` : ''}
            </span>
          </>
        ) : version.hasChanges ? (
          <span className='version-card-summary-count'>
            {version.changedFields.length}{' '}
            {version.changedFields.length === 1 ? 'change' : 'changes'}
          </span>
        ) : (
          <span className='version-card-summary-empty'>
            {itemType === 'document' ? 'File update' : 'No metadata changes'}
          </span>
        )}
        {showSizeInfo && sizeValue !== null && (
          <span className='version-card-summary-size'>
            · {formatFileSize(sizeValue)}
            {showSizeDelta && (
              <span
                className={`version-card-summary-size-delta ${
                  (sizeDeltaValue as number) > 0 ? 'increase' : 'decrease'
                }`}
              >
                {' '}
                ({(sizeDeltaValue as number) > 0 ? '+' : ''}
                {formatFileSize(Math.abs(sizeDeltaValue as number))})
              </span>
            )}
          </span>
        )}
      </div>

      {/* Optional comment line */}
      {commentPreview && (
        <div className='version-card-comment' title={commentPreview}>
          <span className='version-card-comment-text'>{commentPreview}</span>
        </div>
      )}

      {/* Quick actions — visible on hover/select only */}
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
              <span>Download</span>
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
              <span>Copy link</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
