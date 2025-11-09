/**
 * SPListItemAttachments - SharePoint List Item Attachments Component
 *
 * A feature-rich attachment manager with drag-and-drop support, file previews,
 * and comprehensive file management capabilities.
 *
 * @packageDocumentation
 */

import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Icon } from '@fluentui/react/lib/Icon';
import { IconButton, PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useTheme } from '@fluentui/react/lib/Theme';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { Link } from '@fluentui/react/lib/Link';
import { FileTypeIcon, ApplicationType, IconType } from '@pnp/spfx-controls-react/lib/FileTypeIcon';
import { ISPListItemAttachmentsProps, AttachmentDisplayMode, IAttachmentFile } from './SPListItemAttachments.types';
import { SPContext } from '../../utilities/context';
import { getListByNameOrId } from '../../utilities/spHelper';
import './SPListItemAttachments.css';

/**
 * SPListItemAttachments component for managing SharePoint list item attachments
 *
 * @example
 * ```tsx
 * // Edit mode with drag-and-drop
 * <SPListItemAttachments
 *   listId="MyList"
 *   itemId={123}
 *   mode="edit"
 *   maxFileSize={25}
 *   allowedExtensions={['.pdf', '.docx', '.xlsx']}
 * />
 *
 * // New item mode (files staged for upload)
 * <SPListItemAttachments
 *   listId="MyList"
 *   mode="new"
 *   onFilesAdded={(files) => console.log('Files added:', files)}
 * />
 *
 * // View mode (read-only)
 * <SPListItemAttachments
 *   listId="MyList"
 *   itemId={123}
 *   mode="view"
 *   displayMode="grid"
 * />
 * ```
 */
export const SPListItemAttachments: React.FC<ISPListItemAttachmentsProps> = (props) => {
  const {
    listId,
    itemId,
    mode = 'edit',
    displayMode = AttachmentDisplayMode.List,
    maxFileSize = 10,
    allowedExtensions,
    blockedExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js'],
    maxAttachments,
    enableDragDrop = true,
    showPreviews = true,
    allowMultiple = true,
    disabled = false,
    label = 'Attachments',
    description,
    onFilesAdded,
    onFilesRemoved,
    onUploadStart,
    onUploadComplete,
    onDeleteComplete,
    onError,
    className,
    width,
  } = props;

  const theme = useTheme();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dropRef = React.useRef<HTMLDivElement>(null);

  // State
  const [existingAttachments, setExistingAttachments] = React.useState<IAttachmentFile[]>([]);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [filesToDelete, setFilesToDelete] = React.useState<Set<string>>(new Set());
  const [uploading, setUploading] = React.useState<Set<string>>(new Set());
  const [deleting, setDeleting] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragActive, setIsDragActive] = React.useState<boolean>(false);
  const [previewUrls, setPreviewUrls] = React.useState<Map<string, string>>(new Map());

  // Load existing attachments
  React.useEffect(() => {
    if (mode === 'new' || !itemId) {
      return;
    }

    const loadAttachments = async () => {
      if (!SPContext.sp) {
        setError('SPContext not initialized');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const list = getListByNameOrId(SPContext.sp, listId);
        const item = await list.items.getById(itemId).select('AttachmentFiles').expand('AttachmentFiles')();

        const attachments: IAttachmentFile[] = (item.AttachmentFiles || []).map((att: any) => ({
          fileName: att.FileName,
          serverRelativeUrl: att.ServerRelativeUrl,
        }));

        setExistingAttachments(attachments);
        SPContext.logger.info('SPListItemAttachments: Loaded attachments', {
          count: attachments.length,
          itemId,
        });
      } catch (err: any) {
        const errorMsg = `Failed to load attachments: ${err?.message || 'Unknown error'}`;
        setError(errorMsg);
        SPContext.logger.error('SPListItemAttachments: Failed to load attachments', err, {
          listId,
          itemId,
        });
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadAttachments();
  }, [listId, itemId, mode]);

  // Create preview URLs for image files
  React.useEffect(() => {
    const newPreviewUrls = new Map<string, string>();

    newFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newPreviewUrls.set(file.name, url);
      }
    });

    setPreviewUrls(newPreviewUrls);

    // Cleanup preview URLs
    return () => {
      newPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newFiles]);

  // Validate file
  const validateFile = React.useCallback(
    (file: File): string | null => {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSize) {
        return `File "${file.name}" exceeds maximum size of ${maxFileSize}MB`;
      }

      // Check extension
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;

      // Check blocked extensions
      if (blockedExtensions.map((e) => e.toLowerCase()).includes(ext)) {
        return `File type "${ext}" is blocked for security reasons`;
      }

      // Check allowed extensions
      if (allowedExtensions && allowedExtensions.length > 0) {
        if (!allowedExtensions.map((e) => e.toLowerCase()).includes(ext)) {
          return `File type "${ext}" is not allowed. Allowed types: ${allowedExtensions.join(', ')}`;
        }
      }

      // Check max attachments
      if (maxAttachments) {
        const totalCount = existingAttachments.length - filesToDelete.size + newFiles.length + 1;
        if (totalCount > maxAttachments) {
          return `Maximum ${maxAttachments} attachments allowed`;
        }
      }

      return null;
    },
    [maxFileSize, allowedExtensions, blockedExtensions, maxAttachments, existingAttachments, filesToDelete, newFiles]
  );

  // Handle file selection (from browse or drag-drop)
  const handleFiles = React.useCallback(
    (files: FileList | File[]) => {
      setError(null);

      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      fileArray.forEach((file) => {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        setError(errors[0]); // Show first error
      }

      if (validFiles.length > 0) {
        setNewFiles((prev) => [...prev, ...validFiles]);
        SPContext.logger.info('SPListItemAttachments: Files added', {
          count: validFiles.length,
        });
        if (onFilesAdded) {
          onFilesAdded(validFiles);
        }
      }
    },
    [validateFile, onFilesAdded]
  );

  // Handle file input change
  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  // Handle browse click
  const handleBrowseClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Drag and drop handlers with proper event handling
  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the drop zone itself, not child elements
    if (e.currentTarget === e.target) {
      setIsDragActive(false);
    }
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Set the dropEffect to show the correct cursor
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  // Remove new file
  const handleRemoveNewFile = React.useCallback(
    (index: number) => {
      const file = newFiles[index];
      setNewFiles((prev) => prev.filter((_, i) => i !== index));
      SPContext.logger.info('SPListItemAttachments: File removed', { fileName: file.name });
      if (onFilesRemoved) {
        onFilesRemoved([file.name]);
      }
    },
    [newFiles, onFilesRemoved]
  );

  // Upload file to SharePoint
  const uploadFile = React.useCallback(
    async (file: File) => {
      if (!SPContext.sp || !itemId) {
        throw new Error('Cannot upload: SPContext not initialized or no item ID');
      }

      setUploading((prev) => new Set(prev).add(file.name));

      if (onUploadStart) {
        onUploadStart(file.name);
      }

      try {
        const list = getListByNameOrId(SPContext.sp, listId);
        await list.items.getById(itemId).attachmentFiles.add(file.name, file);

        SPContext.logger.success('SPListItemAttachments: File uploaded', { fileName: file.name });

        if (onUploadComplete) {
          onUploadComplete(file.name, true);
        }

        return true;
      } catch (err: any) {
        SPContext.logger.error('SPListItemAttachments: Upload failed', err, { fileName: file.name });
        if (onUploadComplete) {
          onUploadComplete(file.name, false);
        }
        throw err;
      } finally {
        setUploading((prev) => {
          const newSet = new Set(prev);
          newSet.delete(file.name);
          return newSet;
        });
      }
    },
    [listId, itemId, onUploadStart, onUploadComplete]
  );

  // Upload all new files
  const handleUploadAll = React.useCallback(async () => {
    if (newFiles.length === 0) return;

    setError(null);
    const errors: string[] = [];

    for (const file of newFiles) {
      try {
        await uploadFile(file);
      } catch (err: any) {
        errors.push(`${file.name}: ${err?.message || 'Upload failed'}`);
      }
    }

    if (errors.length === 0) {
      // All uploads successful - reload attachments
      setNewFiles([]);
      const list = getListByNameOrId(SPContext.sp, listId);
      const item = await list.items.getById(itemId!).select('AttachmentFiles').expand('AttachmentFiles')();
      const attachments: IAttachmentFile[] = (item.AttachmentFiles || []).map((att: any) => ({
        fileName: att.FileName,
        serverRelativeUrl: att.ServerRelativeUrl,
      }));
      setExistingAttachments(attachments);
    } else {
      setError(errors.join('\n'));
    }
  }, [newFiles, uploadFile, listId, itemId]);

  // Delete attachment
  const handleDeleteAttachment = React.useCallback(
    async (fileName: string) => {
      if (!SPContext.sp || !itemId) {
        return;
      }

      setDeleting((prev) => new Set(prev).add(fileName));
      setError(null);

      try {
        const list = getListByNameOrId(SPContext.sp, listId);
        await list.items.getById(itemId).attachmentFiles.getByName(fileName).delete();

        setExistingAttachments((prev) => prev.filter((att) => att.fileName !== fileName));
        setFilesToDelete((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileName);
          return newSet;
        });

        SPContext.logger.success('SPListItemAttachments: File deleted', { fileName });

        if (onDeleteComplete) {
          onDeleteComplete(fileName, true);
        }
      } catch (err: any) {
        const errorMsg = `Failed to delete "${fileName}": ${err?.message || 'Unknown error'}`;
        setError(errorMsg);
        SPContext.logger.error('SPListItemAttachments: Delete failed', err, { fileName });

        if (onDeleteComplete) {
          onDeleteComplete(fileName, false);
        }
      } finally {
        setDeleting((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileName);
          return newSet;
        });
      }
    },
    [listId, itemId, onDeleteComplete]
  );

  // Toggle delete mark (for batch delete)
  const handleToggleDeleteMark = React.useCallback((fileName: string) => {
    setFilesToDelete((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  }, []);

  // Get file extension
  const getFileExtension = React.useCallback((fileName: string): string => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }, []);

  // Get file size display
  const getFileSizeDisplay = React.useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // Styles
  const containerClass = mergeStyles({
    width: width || '100%',
    minHeight: 200,
  });

  const attachmentCardClass = mergeStyles({
    padding: 12,
    border: `1px solid ${theme.palette.neutralQuaternary}`,
    borderRadius: 4,
    backgroundColor: theme.palette.white,
    transition: 'all 0.2s ease',
    ':hover': {
      boxShadow: theme.effects.elevation8,
      borderColor: theme.palette.neutralTertiary,
    },
  });

  // Render attachment card
  const renderAttachmentCard = (
    fileName: string,
    serverRelativeUrl: string,
    isNew: boolean,
    index?: number
  ) => {
    const isDeleting = deleting.has(fileName);
    const isMarkedForDelete = filesToDelete.has(fileName);
    const isUploading = uploading.has(fileName);
    const ext = getFileExtension(fileName);
    const file = isNew && index !== undefined ? newFiles[index] : undefined;
    const previewUrl = file && previewUrls.get(file.name);

    return (
      <Stack
        key={fileName}
        className={attachmentCardClass}
        horizontal={displayMode !== AttachmentDisplayMode.Grid}
        verticalAlign="center"
        tokens={{ childrenGap: 12 }}
        styles={{
          root: {
            opacity: isMarkedForDelete ? 0.5 : 1,
            textDecoration: isMarkedForDelete ? 'line-through' : 'none',
          },
        }}
      >
        {/* File icon or preview */}
        {displayMode === AttachmentDisplayMode.Grid && showPreviews && previewUrl ? (
          <div
            style={{
              width: '100%',
              height: 120,
              backgroundImage: `url(${previewUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
        ) : (
          <FileTypeIcon type={IconType.image} path={fileName} size={displayMode === AttachmentDisplayMode.Grid ? 48 : 32} />
        )}

        <Stack styles={{ root: { flex: 1 } }} tokens={{ childrenGap: 4 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            {fileName}
          </Text>
          {file && (
            <Text variant="small" styles={{ root: { color: theme.palette.neutralSecondary } }}>
              {getFileSizeDisplay(file.size)}
            </Text>
          )}
          {!isNew && (
            <Link
              href={serverRelativeUrl}
              target="_blank"
              styles={{ root: { fontSize: 12 } }}
            >
              Download
            </Link>
          )}
        </Stack>

        {/* Actions */}
        <Stack horizontal tokens={{ childrenGap: 4 }}>
          {isUploading && <Spinner size={SpinnerSize.small} />}
          {isDeleting && <Spinner size={SpinnerSize.small} />}

          {!isUploading && !isDeleting && mode !== 'view' && !disabled && (
            <>
              {isNew && index !== undefined && (
                <TooltipHost content="Remove">
                  <IconButton
                    iconProps={{ iconName: 'Cancel' }}
                    onClick={() => handleRemoveNewFile(index)}
                  />
                </TooltipHost>
              )}
              {!isNew && mode === 'edit' && (
                <TooltipHost content={isMarkedForDelete ? 'Undo delete' : 'Delete'}>
                  <IconButton
                    iconProps={{ iconName: isMarkedForDelete ? 'Undo' : 'Delete' }}
                    onClick={() => handleDeleteAttachment(fileName)}
                  />
                </TooltipHost>
              )}
            </>
          )}
        </Stack>
      </Stack>
    );
  };

  // Render drag and drop zone
  const renderDropZone = () => {
    if (mode === 'view' || disabled) {
      return null;
    }

    const dropZoneStyle: React.CSSProperties = {
      border: `2px dashed ${isDragActive ? theme.palette.themePrimary : theme.palette.neutralQuaternary}`,
      borderRadius: 8,
      padding: '48px 32px',
      textAlign: 'center',
      backgroundColor: isDragActive ? theme.palette.themeLight : theme.palette.neutralLighter,
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      minHeight: 200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    };

    return (
      <div
        ref={dropRef}
        style={dropZoneStyle}
        onDragEnter={enableDragDrop ? handleDragEnter : undefined}
        onDragOver={enableDragDrop ? handleDragOver : undefined}
        onDragLeave={enableDragDrop ? handleDragLeave : undefined}
        onDrop={enableDragDrop ? handleDrop : undefined}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept={allowedExtensions?.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        <Icon
          iconName={isDragActive ? 'CloudAdd' : 'CloudUpload'}
          styles={{
            root: {
              fontSize: 64,
              color: isDragActive ? theme.palette.themePrimary : theme.palette.themePrimary,
              marginBottom: 16,
            },
          }}
        />

        <Text variant="xLarge" styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>
          {isDragActive ? 'Drop files here' : enableDragDrop ? 'Drag and drop files here' : 'Click to browse files'}
        </Text>

        {!isDragActive && enableDragDrop && (
          <Text variant="large" styles={{ root: { color: theme.palette.neutralSecondary, marginBottom: 16 } }}>
            or click to browse
          </Text>
        )}

        <Text variant="medium" styles={{ root: { color: theme.palette.neutralSecondary } }}>
          Max size: {maxFileSize}MB
          {maxAttachments && ` • Max files: ${maxAttachments}`}
        </Text>

        {allowedExtensions && allowedExtensions.length > 0 && (
          <Text variant="small" styles={{ root: { color: theme.palette.neutralTertiary, marginTop: 8 } }}>
            Allowed: {allowedExtensions.join(', ')}
          </Text>
        )}
      </div>
    );
  };

  // Main render
  return (
    <Stack className={`sp-list-item-attachments ${containerClass} ${className || ''}`} tokens={{ childrenGap: 16 }}>
      {/* Label */}
      {label && (
        <Text variant="large" block styles={{ root: { fontWeight: 600 } }}>
          {label}
          {existingAttachments.length > 0 && ` (${existingAttachments.length})`}
        </Text>
      )}

      {description && (
        <Text variant="small" styles={{ root: { color: theme.palette.neutralSecondary } }}>
          {description}
        </Text>
      )}

      {/* Error */}
      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(null)}>
          {error}
        </MessageBar>
      )}

      {/* Loading */}
      {loading && <Spinner size={SpinnerSize.large} label="Loading attachments..." />}

      {/* Drag and drop zone */}
      {!loading && (mode === 'new' || mode === 'edit') && renderDropZone()}

      {/* Existing attachments */}
      {!loading && existingAttachments.length > 0 && (
        <Stack tokens={{ childrenGap: 8 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            {mode === 'view' ? 'Attachments' : 'Current Attachments'}
          </Text>
          <Stack
            horizontal={displayMode === AttachmentDisplayMode.Grid}
            wrap={displayMode === AttachmentDisplayMode.Grid}
            tokens={{ childrenGap: 12 }}
          >
            {existingAttachments.map((att) =>
              renderAttachmentCard(att.fileName, att.serverRelativeUrl, false)
            )}
          </Stack>
        </Stack>
      )}

      {/* New files */}
      {!loading && newFiles.length > 0 && (
        <Stack tokens={{ childrenGap: 8 }}>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="medium" styles={{ root: { fontWeight: 600, color: theme.palette.green } }}>
              New Files ({newFiles.length})
            </Text>
            {mode === 'edit' && itemId && (
              <PrimaryButton text="Upload All" onClick={handleUploadAll} disabled={uploading.size > 0} />
            )}
          </Stack>
          <Stack
            horizontal={displayMode === AttachmentDisplayMode.Grid}
            wrap={displayMode === AttachmentDisplayMode.Grid}
            tokens={{ childrenGap: 12 }}
          >
            {newFiles.map((file, index) => renderAttachmentCard(file.name, '', true, index))}
          </Stack>
        </Stack>
      )}

      {/* Empty state */}
      {!loading && existingAttachments.length === 0 && newFiles.length === 0 && mode === 'view' && (
        <Text variant="small" styles={{ root: { color: theme.palette.neutralSecondary, fontStyle: 'italic' } }}>
          No attachments
        </Text>
      )}
    </Stack>
  );
};

export default SPListItemAttachments;
