import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { IDocumentLinkProps, IDocumentInfo, DocumentLinkError } from './DocumentLink.types';
import { useDocumentMetadata } from './hooks';
import { DocumentIcon } from './components/DocumentIcon';
import { DocumentHoverCard } from './components/DocumentHoverCard';
import { downloadDocument, openPreviewNewTab } from './components/DocumentActions';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { formatFileSize, buildPreviewUrl } from './utils';
import './DocumentLink.css';

// Lazy load VersionHistory component outside of component render
const LazyVersionHistory = React.lazy(() =>
  import('../VersionHistory').then((mod) => ({ default: mod.VersionHistory }))
);

/**
 * DocumentLink component
 * Displays a link to a SharePoint document with configurable layouts, hover card, and actions
 *
 * @param props - Component props
 * @returns React element
 *
 * @example
 * ```typescript
 * // Simple link with icon
 * <DocumentLink
 *   documentUrl="https://tenant.sharepoint.com/sites/site/Shared%20Documents/file.pdf"
 *   layout="linkWithIcon"
 * />
 *
 * // Full featured with hover card and preview
 * <DocumentLink
 *   documentId={123}
 *   libraryName="Documents"
 *   layout="linkWithIconAndSize"
 *   sizePosition="below"
 *   enableHoverCard={true}
 *   onClick="preview"
 *   previewMode="view"
 *   previewTarget="modal"
 *   onAfterPreview={(doc) => console.log('Preview opened', doc)}
 * />
 *
 * // Download on click
 * <DocumentLink
 *   documentUniqueId="a1b2c3d4-..."
 *   layout="linkWithIconAndSize"
 *   onClick="download"
 *   onAfterDownload={(doc) => console.log('Downloaded', doc)}
 * />
 * ```
 */
export const DocumentLink: React.FC<IDocumentLinkProps> = ({
  documentUrl,
  documentId,
  documentUniqueId,
  libraryName,
  layout = 'linkWithIcon',
  sizePosition = 'inline',
  enableHoverCard = true,
  showVersionHistory = true,
  showDownloadInCard = true,
  onClick = 'preview',
  previewMode = 'view',
  previewTarget = 'modal',
  onAfterDownload,
  onAfterPreview,
  onError,
  enableCache = true,
  className,
  linkClassName,
  iconClassName,
}) => {
  // Fetch document metadata
  const { document, loading, error } = useDocumentMetadata({
    documentUrl,
    documentId,
    documentUniqueId,
    libraryName,
    enableCache,
  });

  // State for version history popup
  const [showVersionHistoryPopup, setShowVersionHistoryPopup] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  // Handle link click
  const handleClick = React.useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!document) return;

      try {
        if (onClick === 'preview' && previewTarget === 'newTab') {
          e.preventDefault();
          e.stopPropagation();
          openPreviewNewTab(document, previewMode);
          onAfterPreview?.(document);
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (onClick === 'download') {
          await downloadDocument(document);
          onAfterDownload?.(document);
        } else if (onClick === 'preview') {
          setIsPreviewOpen(true);
          onAfterPreview?.(document);
        }
      } catch (err: any) {
        onError?.(err);
        console.error('DocumentLink click error:', err);
      }
    },
    [
      document,
      onClick,
      previewMode,
      previewTarget,
      onAfterDownload,
      onAfterPreview,
      onError,
    ]
  );

  // Handle version history click
  const handleVersionHistoryClick = React.useCallback(() => {
    setShowVersionHistoryPopup(true);
  }, []);

  // Handle version history close
  const handleVersionHistoryClose = React.useCallback(() => {
    setShowVersionHistoryPopup(false);
  }, []);

  const handlePreviewDismiss = React.useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const handlePreviewError = React.useCallback(
    (previewError: Error) => {
      onError?.(previewError);
    },
    [onError]
  );

  // Error state
  if (error) {
    const errorMessage =
      error instanceof DocumentLinkError
        ? error.message
        : 'Failed to load document information';

    return (
      <MessageBar messageBarType={MessageBarType.error} isMultiline={false}>
        {errorMessage}
      </MessageBar>
    );
  }

  // Loading state
  if (loading) {
    return <Spinner size={SpinnerSize.small} label="Loading document..." />;
  }

  // No document loaded
  if (!document) {
    return (
      <MessageBar messageBarType={MessageBarType.warning} isMultiline={false}>
        Document not found
      </MessageBar>
    );
  }

  const previewHref = buildPreviewUrl(document.url, previewMode, document.serverRelativeUrl);
  const linkHref =
    onClick === 'preview' && previewTarget === 'newTab'
      ? previewHref || document.url
      : document.url;

  const linkTarget = onClick === 'preview' && previewTarget === 'newTab' ? '_blank' : undefined;
  const linkRel = linkTarget ? 'noopener noreferrer' : undefined;

  // Render link content based on layout
  const renderLinkContent = (): React.ReactNode => {
    const showIcon = layout === 'linkWithIcon' || layout === 'linkWithIconAndSize';
    const showSize = layout === 'linkWithIconAndSize';

    // linkOnly layout
    if (layout === 'linkOnly') {
      return (
        <span className="document-link-text" title={document.name}>
          {document.name}
        </span>
      );
    }

    // linkWithIcon or linkWithIconAndSize with inline size
    if (sizePosition === 'inline') {
      return (
        <span className="document-link-inline">
          {showIcon && (
            <DocumentIcon
              extension={document.fileType}
              path={document.serverRelativeUrl}
              size={showSize ? 28 : 20}
              className={iconClassName}
            />
          )}
          <span className="document-link-text" title={document.name}>
            {document.name}
          </span>
          {showSize && (
            <span className="document-link-size">{formatFileSize(document.size)}</span>
          )}
        </span>
      );
    }

    // linkWithIconAndSize with size below
    if (sizePosition === 'below' && showSize) {
      return (
        <span className="document-link-stacked">
          {showIcon && (
            <DocumentIcon
              extension={document.fileType}
              path={document.serverRelativeUrl}
              size={40}
              className={iconClassName}
            />
          )}
          <span className="document-link-content">
            <span className="document-link-text" title={document.name}>
              {document.name}
            </span>
            <span className="document-link-size">{formatFileSize(document.size)}</span>
          </span>
        </span>
      );
    }

    return null;
  };

  const linkElement = (
    <a
      href={linkHref}
      onClick={handleClick}
      className={`document-link ${layout} ${linkClassName || ''}`}
      title={document.name}
      target={linkTarget}
      rel={linkRel}
    >
      {renderLinkContent()}
    </a>
  );

  // Render VersionHistory popup if needed
  const renderVersionHistoryPopup = (): React.ReactNode => {
    if (!showVersionHistoryPopup || !document) return null;

    return (
      <React.Suspense fallback={<Spinner size={SpinnerSize.medium} label="Loading..." />}>
        <LazyVersionHistory
          listId={document.listId}
          itemId={document.id}
          onClose={handleVersionHistoryClose}
        />
      </React.Suspense>
    );
  };

  // Wrap with hover card if enabled
  if (enableHoverCard) {
    return (
      <div className={`document-link-container ${className || ''}`}>
        <DocumentHoverCard
          document={document}
          showDownload={showDownloadInCard}
          showVersionHistory={showVersionHistory}
          onVersionHistoryClick={handleVersionHistoryClick}
          onDownloadClick={() => onAfterDownload?.(document)}
        >
          {linkElement}
        </DocumentHoverCard>
        {renderVersionHistoryPopup()}
        {isPreviewOpen && (
          <DocumentPreviewModal
            document={document}
            mode={previewMode}
            onDismiss={handlePreviewDismiss}
            onError={handlePreviewError}
          />
        )}
      </div>
    );
  }

  // Without hover card
  return (
    <div className={`document-link-container ${className || ''}`}>
      {linkElement}
      {renderVersionHistoryPopup()}
      {isPreviewOpen && (
        <DocumentPreviewModal
          document={document}
          mode={previewMode}
          onDismiss={handlePreviewDismiss}
          onError={handlePreviewError}
        />
      )}
    </div>
  );
};

DocumentLink.displayName = 'DocumentLink';
