/**
 * Type definitions for SPListItemAttachments component
 *
 * @packageDocumentation
 */

/**
 * Attachment file information
 */
export interface IAttachmentFile {
  /**
   * File name
   */
  fileName: string;

  /**
   * Server relative URL
   */
  serverRelativeUrl: string;

  /**
   * File size in bytes (optional - for new files)
   */
  size?: number;
}

/**
 * Display modes for attachment component
 */
export enum AttachmentDisplayMode {
  /**
   * Compact list view
   */
  Compact = 'compact',

  /**
   * Grid view with previews
   */
  Grid = 'grid',

  /**
   * Detailed list view
   */
  List = 'list',
}

/**
 * Props for SPListItemAttachments component
 */
export interface ISPListItemAttachmentsProps {
  /**
   * List ID or name
   */
  listId: string;

  /**
   * Item ID (required for edit mode, not needed for new items)
   */
  itemId?: number;

  /**
   * Mode: new (upload only), edit (upload + delete), view (read-only)
   * @default 'edit'
   */
  mode?: 'new' | 'edit' | 'view';

  /**
   * Display mode for attachments
   * @default AttachmentDisplayMode.List
   */
  displayMode?: AttachmentDisplayMode;

  /**
   * Maximum file size in MB
   * @default 10
   */
  maxFileSize?: number;

  /**
   * Allowed file extensions (e.g., ['.pdf', '.docx', '.jpg'])
   */
  allowedExtensions?: string[];

  /**
   * Blocked file extensions (e.g., ['.exe', '.bat'])
   */
  blockedExtensions?: string[];

  /**
   * Maximum number of attachments
   */
  maxAttachments?: number;

  /**
   * Enable drag and drop
   * @default true
   */
  enableDragDrop?: boolean;

  /**
   * Show file previews for images
   * @default true
   */
  showPreviews?: boolean;

  /**
   * Enable multiple file selection
   * @default true
   */
  allowMultiple?: boolean;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Custom label text
   */
  label?: string;

  /**
   * Description text
   */
  description?: string;

  /**
   * Callback when files are added
   */
  onFilesAdded?: (files: File[]) => void;

  /**
   * Callback when files are removed
   */
  onFilesRemoved?: (fileNames: string[]) => void;

  /**
   * Callback when upload starts
   */
  onUploadStart?: (fileName: string) => void;

  /**
   * Callback when upload completes
   */
  onUploadComplete?: (fileName: string, success: boolean) => void;

  /**
   * Callback when delete completes
   */
  onDeleteComplete?: (fileName: string, success: boolean) => void;

  /**
   * Callback for errors
   */
  onError?: (error: Error) => void;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Component width
   */
  width?: string | number;
}
