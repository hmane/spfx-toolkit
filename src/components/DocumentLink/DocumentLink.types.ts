/**
 * Document information interface
 * Contains metadata about a SharePoint document
 */
export interface IDocumentInfo {
  /** Document ID (numeric) */
  id: number;
  /** Document unique identifier (GUID) */
  uniqueId: string;
  /** Document name with extension */
  name: string;
  /** Document title (may differ from name) */
  title: string;
  /** Absolute URL to the document */
  url: string;
  /** Server-relative URL */
  serverRelativeUrl: string;
  /** File size in bytes */
  size: number;
  /** File extension (e.g., 'pdf', 'docx') */
  fileType: string;
  /** Date when document was created */
  created: Date;
  /** User who created the document */
  createdBy: {
    id: number;
    email: string;
    title: string;
    loginName: string;
  };
  /** Date when document was last modified */
  modified: Date;
  /** User who last modified the document */
  modifiedBy: {
    id: number;
    email: string;
    title: string;
    loginName: string;
  };
  /** User who has checked out the document (if any) */
  checkOutUser?: {
    id: number;
    email: string;
    title: string;
    loginName: string;
  };
  /** Library name where document resides */
  libraryName: string;
  /** List ID (GUID) */
  listId: string;
  /** Version number */
  version: string;
}

/**
 * Layout options for DocumentLink component
 */
export type DocumentLinkLayout = 'linkOnly' | 'linkWithIcon' | 'linkWithIconAndSize';

/**
 * Size position options when displaying file size
 */
export type SizePosition = 'inline' | 'below';

/**
 * Click action options
 */
export type ClickAction = 'download' | 'preview';

/**
 * Preview mode for SharePoint documents
 */
export type PreviewMode = 'view' | 'edit';

/**
 * Preview target location
 */
export type PreviewTarget = 'modal' | 'newTab';

/**
 * Props for DocumentLink component
 */
export interface IDocumentLinkProps {
  // Document identification (one required)
  /** Absolute or server-relative URL to the document */
  documentUrl?: string;
  /** Document ID (numeric) - requires libraryName */
  documentId?: number;
  /** Document unique identifier (GUID) */
  documentUniqueId?: string;
  /** Library name - required when using documentId */
  libraryName?: string;

  // Display options
  /** Layout style for the link */
  layout?: DocumentLinkLayout;
  /** Position of file size (only applies to linkWithIconAndSize layout) */
  sizePosition?: SizePosition;

  // Hover card options
  /** Enable hover card with document metadata */
  enableHoverCard?: boolean;
  /** Show version history link in hover card */
  showVersionHistory?: boolean;
  /** Show download action in hover card */
  showDownloadInCard?: boolean;

  // Click behavior
  /** Action to perform when link is clicked */
  onClick?: ClickAction;
  /** Preview mode when onClick is 'preview' */
  previewMode?: PreviewMode;
  /** Where to open preview when onClick is 'preview' */
  previewTarget?: PreviewTarget;

  // Custom callbacks
  /** Called after successful download */
  onAfterDownload?: (document: IDocumentInfo) => void;
  /** Called after preview is opened */
  onAfterPreview?: (document: IDocumentInfo) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;

  // Performance
  /** Enable caching of document metadata */
  enableCache?: boolean;

  // Styling
  /** Additional CSS class for container */
  className?: string;
  /** Additional CSS class for link element */
  linkClassName?: string;
  /** Additional CSS class for icon */
  iconClassName?: string;
}

/**
 * Error class for DocumentLink errors
 */
export class DocumentLinkError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'INVALID_INPUT' | 'FETCH_FAILED',
    public details?: any
  ) {
    super(message);
    this.name = 'DocumentLinkError';
  }
}
