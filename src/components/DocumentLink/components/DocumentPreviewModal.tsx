import * as React from 'react';
import { Modal } from '@fluentui/react/lib/Modal';
import { IconButton } from '@fluentui/react/lib/Button';
import { Text } from '@fluentui/react/lib/Text';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { IDocumentInfo, PreviewMode, DocumentLinkError } from '../DocumentLink.types';
import { buildPreviewUrl } from '../utils';

interface IDocumentPreviewModalProps {
  document: IDocumentInfo;
  mode: PreviewMode;
  onDismiss: () => void;
  onError?: (error: Error) => void;
}

/**
 * DocumentPreviewModal renders a preview inside a Fluent UI Modal
 * - Office documents: Uses WOPI iframe
 * - All other files (PDF, images, etc.): Uses iframe with direct URL + web=1
 */
export const DocumentPreviewModal: React.FC<IDocumentPreviewModalProps> = ({
  document,
  mode,
  onDismiss,
  onError,
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [previewError, setPreviewError] = React.useState<Error | null>(null);

  const previewUrl = React.useMemo(
    () => buildPreviewUrl(document.url, mode, document.serverRelativeUrl),
    [document.url, document.serverRelativeUrl, mode]
  );

  // Reset loading state whenever the preview URL changes
  React.useEffect(() => {
    setIsLoading(true);
    setPreviewError(null);

    if (!previewUrl) {
      const error = new DocumentLinkError(
        'Unable to determine preview URL for this document.',
        'FETCH_FAILED',
        {
          documentUrl: document.url,
          mode,
        }
      );
      setPreviewError(error);
      onError?.(error);
    }
  }, [previewUrl, document.url, mode, onError]);

  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleDismiss = React.useCallback(() => {
    setIsLoading(false);
    setPreviewError(null);
    onDismiss();
  }, [onDismiss]);

  return (
    <Modal
      isOpen={true}
      onDismiss={handleDismiss}
      isBlocking={true}
      styles={{
        main: {
          width: '90vw',
          maxWidth: '1280px',
          height: '90vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      containerClassName="document-preview-modal"
    >
      <div className="document-preview-modal__content">
        <div className="document-preview-modal__header">
          <Text className="document-preview-modal__title" nowrap variant="mediumPlus">
            {document.name}
          </Text>
          <IconButton
            iconProps={{ iconName: 'Cancel' }}
            ariaLabel="Close preview"
            onClick={handleDismiss}
            styles={{
              root: {
                color: '#605e5c',
              },
              rootHovered: {
                color: '#323130',
                backgroundColor: '#edebe9',
              },
            }}
          />
        </div>
        {previewError ? (
          <div className="document-preview-modal__message">
            <MessageBar messageBarType={MessageBarType.error} isMultiline={false}>
              {previewError.message}
            </MessageBar>
          </div>
        ) : (
          <div className="document-preview-modal__frameWrapper">
            {isLoading && (
              <div className="document-preview-modal__loading">
                <Spinner size={SpinnerSize.medium} label="Loading preview..." />
              </div>
            )}
            <iframe
              src={previewUrl}
              title={`Preview of ${document.name}`}
              className="document-preview-modal__iframe"
              onLoad={handleLoad}
              allowFullScreen
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

DocumentPreviewModal.displayName = 'DocumentPreviewModal';
