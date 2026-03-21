/**
 * CommentText Component
 *
 * Parses and renders comment text with:
 * - UserPersona components for @mentions
 * - DocumentLink components for #links
 * - Plain text segments with proper HTML entity decoding
 */

import * as React from 'react';
import { Modal } from '@fluentui/react/lib/Modal';
import { IconButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { SPContext } from '../../../utilities/context';
import { buildPreviewUrl } from '../../DocumentLink/utils';
import { parseCommentText } from '../utils/commentParser';
import type { IComment, ICommentLink } from '../Comments.types';

const LivePersona = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/LivePersona').then((module) => ({
    default: module.LivePersona,
  }))
);

export interface ICommentTextProps {
  comment: IComment;
  enableDocumentPreview: boolean;
  className?: string;
}

export const CommentText: React.FC<ICommentTextProps> = React.memo((props) => {
  const { comment, enableDocumentPreview, className } = props;
  const [previewLink, setPreviewLink] = React.useState<ICommentLink | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(true);

  const segments = React.useMemo(
    () => parseCommentText(comment.text, comment.mentions, comment.links),
    [comment.text, comment.mentions, comment.links]
  );

  const previewUrl = React.useMemo(() => {
    if (!previewLink) return '';
    return buildPreviewUrl(previewLink.url, 'view');
  }, [previewLink]);

  const openPreviewLinkInNewTab = React.useCallback(() => {
    if (!previewLink) return;
    window.open(previewLink.url, '_blank', 'noopener,noreferrer');
  }, [previewLink]);

  return (
    <>
      <span className={`spfx-comments-text ${className || ''}`}>
        {segments.map((segment, idx) => {
          if (segment.type === 'text') {
            return <span key={idx}>{renderTextWithUrls(segment.text || '')}</span>;
          }

          if (segment.type === 'mention' && segment.mentionIndex !== undefined) {
            const mention = comment.mentions[segment.mentionIndex];
            if (!mention) return null;

            return (
              <span key={idx} className="spfx-comments-mention-inline">
                <InlineMention mention={mention} />
              </span>
            );
          }

          if (segment.type === 'link' && segment.linkIndex !== undefined) {
            const link = comment.links[segment.linkIndex];
            if (!link) return null;

            return (
              <span key={idx} className="spfx-comments-link-inline">
                <CommentLinkChip
                  link={link}
                  enableDocumentPreview={enableDocumentPreview}
                  onOpenPreview={(selectedLink) => {
                    setPreviewLoading(true);
                    setPreviewLink(selectedLink);
                  }}
                />
              </span>
            );
          }

          return null;
        })}
      </span>
      {previewLink && enableDocumentPreview && (
        <Modal
          isOpen={true}
          onDismiss={() => setPreviewLink(null)}
          isBlocking={false}
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
        >
          <div className="spfx-comments-preview-modal">
            <div className="spfx-comments-preview-header">
              <Text variant="mediumPlus" nowrap>{previewLink.name}</Text>
              <div className="spfx-comments-preview-header-actions">
                <button
                  type="button"
                  className="spfx-comments-preview-open-link"
                  onClick={openPreviewLinkInNewTab}
                >
                  Open in new tab <span aria-hidden="true">↗</span>
                </button>
                <IconButton
                  iconProps={{ iconName: 'Cancel' }}
                  ariaLabel="Close preview"
                  onClick={() => setPreviewLink(null)}
                />
              </div>
            </div>
            <div className="spfx-comments-preview-body">
              {previewLoading && (
                <div className="spfx-comments-preview-loading">
                  <Spinner size={SpinnerSize.medium} label="Loading preview..." />
                </div>
              )}
              <iframe
                src={previewUrl || previewLink.url}
                title={`Preview of ${previewLink.name}`}
                className="spfx-comments-preview-iframe"
                onLoad={() => setPreviewLoading(false)}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
});

CommentText.displayName = 'CommentText';

/**
 * Render plain text, converting bare URLs into clickable <a> links.
 * Handles http/https URLs that appear in text segments (e.g., unresolved pasted URLs).
 */
const URL_REGEX = /(https?:\/\/[^\s<>]+)/g;

function renderTextWithUrls(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  if (parts.length === 1) return text; // No URLs found

  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex since we reuse it
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="spfx-comments-plain-link"
          title="Open in new tab"
        >
          <span>{part}</span>
          <span className="spfx-comments-external-link-icon" aria-hidden="true">↗</span>
        </a>
      );
    }
    return part;
  });
}

const LINK_ICON_BY_TYPE: Record<string, string> = {
  xlsx: 'ExcelDocument',
  xls: 'ExcelDocument',
  docx: 'WordDocument',
  doc: 'WordDocument',
  pptx: 'PowerPointDocument',
  ppt: 'PowerPointDocument',
  pdf: 'PDF',
};

const CommentLinkChip: React.FC<{
  link: ICommentLink;
  enableDocumentPreview: boolean;
  onOpenPreview: (link: ICommentLink) => void;
}> = ({ link, enableDocumentPreview, onOpenPreview }) => {
  const extension = (link.fileType || link.url.split('.').pop() || '').toLowerCase();
  const iconName = LINK_ICON_BY_TYPE[extension] || 'Page';
  const handlePreviewClick = () => onOpenPreview(link);

  if (enableDocumentPreview) {
    return (
      <button
        type="button"
        className="spfx-comments-link-chip spfx-comments-link-chip-button"
        title={link.url}
        onClick={handlePreviewClick}
      >
        <Icon iconName={iconName} className="spfx-comments-link-chip-icon" />
        <span className="spfx-comments-link-chip-text">{link.name}</span>
      </button>
    );
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="spfx-comments-link-chip"
      title={`${link.url} (opens in new tab)`}
    >
      <Icon iconName={iconName} className="spfx-comments-link-chip-icon" />
      <span className="spfx-comments-link-chip-text">{link.name}</span>
      <span className="spfx-comments-external-link-icon" aria-hidden="true">↗</span>
    </a>
  );
};

const InlineMention: React.FC<{
  mention: { id?: string; email?: string; title?: string };
}> = ({ mention }) => {
  const displayName = `@${mention.title || mention.email || 'Unknown'}`;
  const upn = mention.email || mention.id || '';
  const serviceScope = SPContext.isReady() ? SPContext.spfxContext.serviceScope : undefined;

  if (!upn || !serviceScope) {
    return <span className="spfx-comments-mention-text">{displayName}</span>;
  }

  return (
    <React.Suspense fallback={<span className="spfx-comments-mention-text">{displayName}</span>}>
      <LivePersona
        upn={upn}
        serviceScope={serviceScope}
        template={<span className="spfx-comments-mention-text">{displayName}</span>}
      />
    </React.Suspense>
  );
};
