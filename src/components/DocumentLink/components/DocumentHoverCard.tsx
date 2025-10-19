import * as React from 'react';
import { HoverCard, HoverCardType } from '@fluentui/react/lib/HoverCard';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { IconButton } from '@fluentui/react/lib/Button';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Persona, PersonaSize } from '@fluentui/react/lib/Persona';
import { IDocumentInfo } from '../DocumentLink.types';
import { formatFileSize } from '../utils';
import { DocumentIcon } from './DocumentIcon';
import { downloadDocument } from './DocumentActions';

/**
 * Props for DocumentHoverCard component
 */
interface IDocumentHoverCardProps {
  /** Document information */
  document: IDocumentInfo;
  /** Show download button in hover card */
  showDownload?: boolean;
  /** Show version history link */
  showVersionHistory?: boolean;
  /** Callback when version history is clicked */
  onVersionHistoryClick?: () => void;
  /** Callback when download is clicked */
  onDownloadClick?: () => void;
  /** Children to render (trigger element) */
  children: React.ReactElement;
}

/**
 * DocumentHoverCard component
 * Displays document metadata in a hover card
 * @param props - Component props
 * @returns React element
 */
export const DocumentHoverCard: React.FC<IDocumentHoverCardProps> = ({
  document,
  showDownload = true,
  showVersionHistory = true,
  onVersionHistoryClick,
  onDownloadClick,
  children,
}) => {
  const handleDownload = React.useCallback(
    async (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        await downloadDocument(document);
        onDownloadClick?.();
      } catch (error) {
        console.error('Failed to download document', error);
      }
    },
    [document, onDownloadClick]
  );

  const handleVersionHistory = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onVersionHistoryClick?.();
    },
    [onVersionHistoryClick]
  );

  const onRenderPlainCard = (): JSX.Element => {
    // Format dates
    const formatDateTime = (date: Date): string => {
      const dateStr = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeStr = date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      return `${dateStr} at ${timeStr}`;
    };

    // Get user photo URL using SharePoint UserPhoto.aspx
    const getUserPhotoUrl = (email: string): string => {
      if (!email) return '';
      const siteUrl = window.location.origin;
      return `${siteUrl}/_layouts/15/userphoto.aspx?size=M&accountname=${encodeURIComponent(
        email
      )}`;
    };

    return (
      <div
        style={{
          padding: '16px',
          minWidth: '340px',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
        }}
      >
        <Stack tokens={{ childrenGap: 16 }}>
          {/* Header with icon, title, size, and download button */}
          <Stack horizontal horizontalAlign="space-between" verticalAlign="start">
            <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="start" style={{ flex: 1 }}>
              <div style={{ flexShrink: 0, paddingTop: '2px' }}>
                <DocumentIcon
                  extension={document.fileType}
                  path={document.serverRelativeUrl}
                  size={24}
                />
              </div>
              <Stack tokens={{ childrenGap: 4 }} style={{ flex: 1, minWidth: 0 }}>
                <Text
                  variant="medium"
                  styles={{
                    root: {
                      fontWeight: 600,
                      color: '#323130',
                      wordBreak: 'break-word',
                      lineHeight: '1.4',
                    },
                  }}
                >
                  {document.name}
                </Text>
                <Text
                  variant="small"
                  styles={{
                    root: {
                      color: '#605e5c',
                      fontWeight: 400,
                      paddingBottom: '4px',
                    },
                  }}
                >
                  {formatFileSize(document.size)}
                </Text>
              </Stack>
            </Stack>
            {showDownload && (
              <IconButton
                iconProps={{ iconName: 'Download' }}
                title="Download"
                ariaLabel="Download document"
                onClick={handleDownload}
                styles={{
                  root: {
                    color: '#0078d4',
                    marginLeft: '8px',
                    flexShrink: 0,
                  },
                  rootHovered: {
                    color: '#106ebe',
                    backgroundColor: '#f3f2f1',
                  },
                }}
              />
            )}
          </Stack>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #edebe9', margin: '0 -16px' }} />

          {/* Created by - Compact layout */}
          <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="start">
            <Persona
              imageUrl={getUserPhotoUrl(document.createdBy.email)}
              text={document.createdBy.title}
              size={PersonaSize.size40}
              hidePersonaDetails={true}
              styles={{
                root: {
                  flexShrink: 0,
                },
              }}
            />
            <Stack tokens={{ childrenGap: 2 }} style={{ flex: 1, minWidth: 0 }}>
              <Text
                variant="small"
                styles={{
                  root: {
                    fontWeight: 600,
                    color: '#323130',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                }}
              >
                {document.createdBy.title}
              </Text>
              <Text
                variant="xSmall"
                styles={{
                  root: {
                    color: '#605e5c',
                    lineHeight: '1.3',
                  },
                }}
              >
                Created {formatDateTime(document.created)}
              </Text>
            </Stack>
          </Stack>

          {/* Modified by - Compact layout */}
          <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="start">
            <Persona
              imageUrl={getUserPhotoUrl(document.modifiedBy.email)}
              text={document.modifiedBy.title}
              size={PersonaSize.size40}
              hidePersonaDetails={true}
              styles={{
                root: {
                  flexShrink: 0,
                },
              }}
            />
            <Stack tokens={{ childrenGap: 2 }} style={{ flex: 1, minWidth: 0 }}>
              <Text
                variant="small"
                styles={{
                  root: {
                    fontWeight: 600,
                    color: '#323130',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                }}
              >
                {document.modifiedBy.title}
              </Text>
              <Text
                variant="xSmall"
                styles={{
                  root: {
                    color: '#605e5c',
                    lineHeight: '1.3',
                  },
                }}
              >
                Modified {formatDateTime(document.modified)}
              </Text>
            </Stack>
          </Stack>

          {/* Version history link */}
          {showVersionHistory && (
            <>
              <div style={{ borderTop: '1px solid #edebe9', margin: '0 -16px' }} />
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text
                  variant="small"
                  styles={{
                    root: {
                      color: '#605e5c',
                      fontWeight: 400,
                    },
                  }}
                >
                  Version {document.version}
                </Text>
                <a
                  href="#"
                  onClick={handleVersionHistory}
                  style={{
                    color: '#0078d4',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  View history
                  <span style={{ fontSize: '10px' }}>→</span>
                </a>
              </Stack>
            </>
          )}
        </Stack>
      </div>
    );
  };

  return (
    <HoverCard
      type={HoverCardType.plain}
      plainCardProps={{
        onRenderPlainCard,
      }}
      instantOpenOnClick={false}
      styles={{
        host: {
          display: 'inline-block',
        },
      }}
    >
      {children}
    </HoverCard>
  );
};
