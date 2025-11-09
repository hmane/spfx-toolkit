import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Icon } from '@fluentui/react/lib/Icon';
import { IconButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Link } from '@fluentui/react/lib/Link';
import { IAttachment } from '../hooks/useDynamicFormData';
import { SPContext } from '../../../utilities/context';

export interface ISPDynamicFormAttachmentsProps {
  mode: 'new' | 'edit' | 'view';
  existingAttachments?: IAttachment[];
  maxSize?: number; // MB
  allowedTypes?: string[];
  disabled?: boolean;
  onFilesChange: (filesToAdd: File[], filesToDelete: string[]) => void;
}

/**
 * Attachment manager for SPDynamicForm
 * Handles file upload and deletion (operations tracked, not executed)
 */
export const SPDynamicFormAttachments: React.FC<ISPDynamicFormAttachmentsProps> = React.memo(
  (props) => {
    const {
      mode,
      existingAttachments = [],
      maxSize = 10,
      allowedTypes,
      disabled = false,
      onFilesChange,
    } = props;

    const [filesToAdd, setFilesToAdd] = React.useState<File[]>([]);
    const [filesToDelete, setFilesToDelete] = React.useState<Set<string>>(new Set());
    const [error, setError] = React.useState<string>('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Notify parent of changes
    React.useEffect(() => {
      onFilesChange(filesToAdd, Array.from(filesToDelete));
    }, [filesToAdd, filesToDelete, onFilesChange]);

    const handleFileSelect = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setError('');

        const files = e.target.files;
        if (!files || files.length === 0) {
          return;
        }

        const newFiles: File[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Validate file size
          const fileSizeMB = file.size / (1024 * 1024);
          if (fileSizeMB > maxSize) {
            setError(`File "${file.name}" exceeds maximum size of ${maxSize}MB`);
            continue;
          }

          // Validate file type
          if (allowedTypes && allowedTypes.length > 0) {
            const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
            if (!allowedTypes.map((t) => t.toLowerCase()).includes(ext)) {
              setError(
                `File "${file.name}" type not allowed. Allowed types: ${allowedTypes.join(', ')}`
              );
              continue;
            }
          }

          newFiles.push(file);
        }

        if (newFiles.length > 0) {
          setFilesToAdd((prev) => [...prev, ...newFiles]);
          SPContext.logger.info(`Added ${newFiles.length} file(s) for upload`);
        }

        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      [maxSize, allowedTypes]
    );

    const handleRemoveNewFile = React.useCallback((index: number) => {
      setFilesToAdd((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleDeleteExistingFile = React.useCallback((fileName: string) => {
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

    const handleBrowseClick = React.useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    // Filter existing attachments (exclude marked for deletion)
    const visibleExistingAttachments = existingAttachments.filter(
      (att) => !filesToDelete.has(att.FileName)
    );

    const markedForDeletion = existingAttachments.filter((att) => filesToDelete.has(att.FileName));

    if (mode === 'view') {
      // View mode - just show existing attachments
      if (existingAttachments.length === 0) {
        return (
          <Stack>
            <Text variant="medium" block styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>
              Attachments
            </Text>
            <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
              No attachments
            </Text>
          </Stack>
        );
      }

      return (
        <Stack tokens={{ childrenGap: 8 }}>
          <Text variant="medium" block styles={{ root: { fontWeight: 600 } }}>
            Attachments ({existingAttachments.length})
          </Text>
          {existingAttachments.map((att, index) => (
            <Stack key={index} horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
              <Icon iconName="Attach" styles={{ root: { fontSize: 14 } }} />
              <Link href={att.ServerRelativeUrl} target="_blank">
                {att.FileName}
              </Link>
            </Stack>
          ))}
        </Stack>
      );
    }

    return (
      <Stack tokens={{ childrenGap: 12 }}>
        <Text variant="medium" block styles={{ root: { fontWeight: 600 } }}>
          Attachments
        </Text>

        {error && (
          <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError('')}>
            {error}
          </MessageBar>
        )}

        {/* File input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes?.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Browse button */}
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <IconButton
            iconProps={{ iconName: 'Attach' }}
            text="Add Files"
            onClick={handleBrowseClick}
            disabled={disabled}
          />
          <Text variant="small" styles={{ root: { color: '#605e5c', alignSelf: 'center' } }}>
            Max size: {maxSize}MB
            {allowedTypes && ` • Allowed types: ${allowedTypes.join(', ')}`}
          </Text>
        </Stack>

        {/* Existing attachments */}
        {visibleExistingAttachments.length > 0 && (
          <Stack tokens={{ childrenGap: 6 }}>
            <Text variant="smallPlus" styles={{ root: { fontWeight: 600 } }}>
              Current Files
            </Text>
            {visibleExistingAttachments.map((att, index) => (
              <Stack
                key={index}
                horizontal
                verticalAlign="center"
                tokens={{ childrenGap: 8 }}
                styles={{ root: { padding: '4px 8px', backgroundColor: '#f3f2f1', borderRadius: 4 } }}
              >
                <Icon iconName="Attach" styles={{ root: { fontSize: 14 } }} />
                <Link href={att.ServerRelativeUrl} target="_blank" styles={{ root: { flex: 1 } }}>
                  {att.FileName}
                </Link>
                {mode === 'edit' && !disabled && (
                  <IconButton
                    iconProps={{ iconName: 'Delete' }}
                    title="Mark for deletion"
                    onClick={() => handleDeleteExistingFile(att.FileName)}
                  />
                )}
              </Stack>
            ))}
          </Stack>
        )}

        {/* Marked for deletion */}
        {markedForDeletion.length > 0 && (
          <Stack tokens={{ childrenGap: 6 }}>
            <Text variant="smallPlus" styles={{ root: { fontWeight: 600, color: '#a4262c' } }}>
              Marked for Deletion
            </Text>
            {markedForDeletion.map((att, index) => (
              <Stack
                key={index}
                horizontal
                verticalAlign="center"
                tokens={{ childrenGap: 8 }}
                styles={{
                  root: {
                    padding: '4px 8px',
                    backgroundColor: '#fde7e9',
                    borderRadius: 4,
                    textDecoration: 'line-through',
                  },
                }}
              >
                <Icon iconName="Attach" styles={{ root: { fontSize: 14, color: '#a4262c' } }} />
                <Text styles={{ root: { flex: 1, color: '#a4262c' } }}>{att.FileName}</Text>
                <IconButton
                  iconProps={{ iconName: 'Undo' }}
                  title="Undo deletion"
                  onClick={() => handleDeleteExistingFile(att.FileName)}
                />
              </Stack>
            ))}
          </Stack>
        )}

        {/* New files to add */}
        {filesToAdd.length > 0 && (
          <Stack tokens={{ childrenGap: 6 }}>
            <Text variant="smallPlus" styles={{ root: { fontWeight: 600, color: '#107c10' } }}>
              New Files to Add
            </Text>
            {filesToAdd.map((file, index) => (
              <Stack
                key={index}
                horizontal
                verticalAlign="center"
                tokens={{ childrenGap: 8 }}
                styles={{ root: { padding: '4px 8px', backgroundColor: '#dff6dd', borderRadius: 4 } }}
              >
                <Icon iconName="Attach" styles={{ root: { fontSize: 14, color: '#107c10' } }} />
                <Text styles={{ root: { flex: 1 } }}>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </Text>
                {!disabled && (
                  <IconButton
                    iconProps={{ iconName: 'Cancel' }}
                    title="Remove"
                    onClick={() => handleRemoveNewFile(index)}
                  />
                )}
              </Stack>
            ))}
          </Stack>
        )}

        {mode === 'new' && filesToAdd.length === 0 && (
          <Text variant="small" styles={{ root: { color: '#605e5c', fontStyle: 'italic' } }}>
            No files selected. Attachments will be uploaded after the item is created.
          </Text>
        )}
      </Stack>
    );
  }
);

SPDynamicFormAttachments.displayName = 'SPDynamicFormAttachments';
