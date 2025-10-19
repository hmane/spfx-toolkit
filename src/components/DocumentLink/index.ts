export { DocumentLink } from './DocumentLink';
export type {
  IDocumentLinkProps,
  IDocumentInfo,
  DocumentLinkLayout,
  SizePosition,
  ClickAction,
  PreviewMode,
  PreviewTarget,
  DocumentLinkError,
} from './DocumentLink.types';
export { useDocumentMetadata, clearDocumentCache, removeCachedDocument } from './hooks';
// Note: formatFileSize and getFileExtension are available from './utils' for internal use
// They are not exported to avoid conflicts with StringUtils
