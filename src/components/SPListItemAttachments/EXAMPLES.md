# SPListItemAttachments - Usage Examples

## 🎨 Complete Examples

### Example 1: Basic Edit Mode with Drag & Drop

```tsx
import * as React from 'react';
import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';

export const BasicAttachmentsExample: React.FC = () => {
  return (
    <SPListItemAttachments
      listId="Documents"
      itemId={123}
      mode="edit"
      maxFileSize={25}
      allowedExtensions={['.pdf', '.docx', '.xlsx', '.jpg', '.png']}
      label="Project Documents"
      description="Upload supporting documents for this project"
    />
  );
};
```

### Example 2: New Item Mode with Callback Handling

```tsx
import * as React from 'react';
import { SPListItemAttachments, IAttachmentFile } from 'spfx-toolkit/lib/components/SPListItemAttachments';

export const NewItemAttachmentsExample: React.FC = () => {
  const [stagedFiles, setStagedFiles] = React.useState<File[]>([]);
  const [itemId, setItemId] = React.useState<number | undefined>();

  const handleCreateItem = async () => {
    // Create the SharePoint list item first
    const newItem = await createListItem({
      Title: 'New Project',
      Description: 'Project details...',
    });

    setItemId(newItem.Id);
    // Component will now switch to edit mode and files can be uploaded
  };

  return (
    <div>
      <SPListItemAttachments
        listId="Projects"
        itemId={itemId}
        mode={itemId ? 'edit' : 'new'}
        onFilesAdded={(files) => {
          console.log('Files staged:', files);
          setStagedFiles(files);
        }}
        onUploadComplete={(fileName, success) => {
          if (success) {
            console.log(`✅ Uploaded: ${fileName}`);
          } else {
            console.error(`❌ Failed: ${fileName}`);
          }
        }}
      />

      {!itemId && stagedFiles.length > 0 && (
        <button onClick={handleCreateItem}>
          Create Item & Upload {stagedFiles.length} Files
        </button>
      )}
    </div>
  );
};
```

### Example 3: Grid View with Image Previews

```tsx
import * as React from 'react';
import { SPListItemAttachments, AttachmentDisplayMode } from 'spfx-toolkit/lib/components/SPListItemAttachments';

export const GalleryViewExample: React.FC = () => {
  return (
    <SPListItemAttachments
      listId="ProductImages"
      itemId={456}
      mode="view"
      displayMode={AttachmentDisplayMode.Grid}
      showPreviews={true}
      label="Product Gallery"
    />
  );
};
```

### Example 4: Document Upload with Strict Validation

```tsx
import * as React from 'react';
import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

export const DocumentUploadExample: React.FC = () => {
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  return (
    <div>
      {uploadError && (
        <MessageBar
          messageBarType={MessageBarType.error}
          onDismiss={() => setUploadError(null)}
        >
          {uploadError}
        </MessageBar>
      )}

      <SPListItemAttachments
        listId="LegalDocuments"
        itemId={789}
        mode="edit"
        maxFileSize={50}
        allowedExtensions={['.pdf', '.docx', '.doc']}
        blockedExtensions={[
          '.exe', '.bat', '.cmd', '.com', '.scr',
          '.vbs', '.js', '.jar', '.zip', '.rar'
        ]}
        maxAttachments={5}
        label="Legal Documents (PDF or Word only)"
        description="Upload up to 5 legal documents (max 50MB each)"
        onError={(error) => {
          setUploadError(error.message);
        }}
        onUploadComplete={(fileName, success) => {
          if (success) {
            // Log audit trail
            console.log('Document uploaded:', {
              fileName,
              timestamp: new Date(),
              user: currentUser.email,
            });
          }
        }}
      />
    </div>
  );
};
```

### Example 5: Single File Avatar Upload

```tsx
import * as React from 'react';
import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';

export const AvatarUploadExample: React.FC = () => {
  return (
    <SPListItemAttachments
      listId="UserProfiles"
      itemId={101}
      mode="edit"
      allowMultiple={false}
      maxAttachments={1}
      maxFileSize={5}
      allowedExtensions={['.jpg', '.jpeg', '.png', '.gif']}
      showPreviews={true}
      displayMode="grid"
      label="Profile Picture"
      description="Upload your profile picture (max 5MB)"
    />
  );
};
```

### Example 6: Integration with SPDynamicForm

```tsx
import * as React from 'react';
import { SPDynamicForm } from 'spfx-toolkit/lib/components/SPDynamicForm';
import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';
import { Stack } from '@fluentui/react/lib/Stack';

export const FormWithAttachmentsExample: React.FC = () => {
  const [itemId, setItemId] = React.useState<number | undefined>();

  return (
    <Stack tokens={{ childrenGap: 24 }}>
      <SPDynamicForm
        listId="Projects"
        mode="new"
        onSubmitSuccess={(result) => {
          setItemId(result.itemId);
        }}
      />

      {itemId && (
        <SPListItemAttachments
          listId="Projects"
          itemId={itemId}
          mode="edit"
          label="Project Attachments"
        />
      )}
    </Stack>
  );
};
```

### Example 7: Batch Upload with Progress Tracking

```tsx
import * as React from 'react';
import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import { Text } from '@fluentui/react/lib/Text';

export const BatchUploadExample: React.FC = () => {
  const [uploadProgress, setUploadProgress] = React.useState<{
    current: number;
    total: number;
    currentFile: string;
  }>({ current: 0, total: 0, currentFile: '' });

  const [uploadedFiles, setUploadedFiles] = React.useState<string[]>([]);
  const [failedFiles, setFailedFiles] = React.useState<string[]>([]);

  return (
    <div>
      {uploadProgress.total > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text variant="medium">
            Uploading {uploadProgress.current} of {uploadProgress.total} files...
          </Text>
          <Text variant="small" block styles={{ root: { color: '#666', marginBottom: 8 } }}>
            Current: {uploadProgress.currentFile}
          </Text>
          <ProgressIndicator
            percentComplete={uploadProgress.current / uploadProgress.total}
          />
        </div>
      )}

      <SPListItemAttachments
        listId="BulkDocuments"
        itemId={999}
        mode="edit"
        allowMultiple={true}
        maxFileSize={100}
        onFilesAdded={(files) => {
          setUploadProgress({
            current: 0,
            total: files.length,
            currentFile: files[0]?.name || '',
          });
        }}
        onUploadStart={(fileName) => {
          setUploadProgress((prev) => ({
            ...prev,
            currentFile: fileName,
            current: prev.current + 1,
          }));
        }}
        onUploadComplete={(fileName, success) => {
          if (success) {
            setUploadedFiles((prev) => [...prev, fileName]);
          } else {
            setFailedFiles((prev) => [...prev, fileName]);
          }
        }}
      />

      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text variant="medium" styles={{ root: { color: '#107c10' } }}>
            ✅ Uploaded: {uploadedFiles.length} files
          </Text>
        </div>
      )}

      {failedFiles.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Text variant="medium" styles={{ root: { color: '#a80000' } }}>
            ❌ Failed: {failedFiles.join(', ')}
          </Text>
        </div>
      )}
    </div>
  );
};
```

### Example 8: Custom Styling and Branding

```tsx
import * as React from 'react';
import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';
import { mergeStyles } from '@fluentui/react/lib/Styling';

const customClass = mergeStyles({
  border: '2px dashed #0078d4',
  borderRadius: 8,
  padding: 24,
  backgroundColor: '#f3f2f1',
});

export const StyledAttachmentsExample: React.FC = () => {
  return (
    <SPListItemAttachments
      listId="BrandedDocs"
      itemId={555}
      mode="edit"
      className={customClass}
      width="800px"
      label="Company Documents"
    />
  );
};
```

### Example 9: Mobile-Optimized View

```tsx
import * as React from 'react';
import { SPListItemAttachments, AttachmentDisplayMode } from 'spfx-toolkit/lib/components/SPListItemAttachments';
import { useViewport } from 'spfx-toolkit/lib/hooks';

export const ResponsiveAttachmentsExample: React.FC = () => {
  const viewport = useViewport();
  const isMobile = viewport.width < 768;

  return (
    <SPListItemAttachments
      listId="MobileDocs"
      itemId={321}
      mode="edit"
      displayMode={isMobile ? AttachmentDisplayMode.Compact : AttachmentDisplayMode.List}
      enableDragDrop={!isMobile} // Disable drag-drop on mobile
      showPreviews={!isMobile} // Hide previews on mobile for performance
    />
  );
};
```

### Example 10: Workflow-Based Permissions

```tsx
import * as React from 'react';
import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';

interface IWorkflowItem {
  Id: number;
  Status: string;
  AssignedToId: number;
}

export const WorkflowAttachmentsExample: React.FC<{ item: IWorkflowItem; currentUserId: number }> = ({
  item,
  currentUserId,
}) => {
  // Determine mode based on workflow status and user
  const canEdit =
    item.Status === 'Draft' &&
    item.AssignedToId === currentUserId;

  const mode = canEdit ? 'edit' : 'view';

  return (
    <SPListItemAttachments
      listId="WorkflowItems"
      itemId={item.Id}
      mode={mode}
      label={canEdit ? 'Upload Supporting Documents' : 'View Attachments'}
      description={
        canEdit
          ? 'Add documents while the item is in Draft status'
          : 'Item is locked - attachments cannot be modified'
      }
    />
  );
};
```

## 🎯 Real-World Scenarios

### Scenario: HR Document Management

```tsx
import * as React from 'react';
import { SPListItemAttachments } from 'spfx-toolkit/lib/components/SPListItemAttachments';
import { Panel } from '@fluentui/react/lib/Panel';

export const HRDocumentPanel: React.FC<{ employeeId: number; isOpen: boolean; onDismiss: () => void }> = ({
  employeeId,
  isOpen,
  onDismiss,
}) => {
  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      headerText="Employee Documents"
      closeButtonAriaLabel="Close"
    >
      <SPListItemAttachments
        listId="EmployeeRecords"
        itemId={employeeId}
        mode="edit"
        maxFileSize={25}
        allowedExtensions={['.pdf', '.docx', '.jpg', '.png']}
        label="Personal Documents"
        description="Upload ID, certificates, and other documents"
        onUploadComplete={(fileName, success) => {
          if (success) {
            // Trigger notification
            sendNotification(`Document ${fileName} uploaded successfully`);
          }
        }}
      />
    </Panel>
  );
};
```

### Scenario: Project Deliverables

```tsx
import * as React from 'react';
import { SPListItemAttachments, AttachmentDisplayMode } from 'spfx-toolkit/lib/components/SPListItemAttachments';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';

export const ProjectDeliverablesView: React.FC<{ projectId: number }> = ({ projectId }) => {
  return (
    <Pivot>
      <PivotItem headerText="Deliverables">
        <SPListItemAttachments
          listId="Projects"
          itemId={projectId}
          mode="edit"
          displayMode={AttachmentDisplayMode.List}
          label="Project Deliverables"
          maxFileSize={100}
          allowedExtensions={['.pdf', '.docx', '.xlsx', '.zip']}
        />
      </PivotItem>
      <PivotItem headerText="Gallery">
        <SPListItemAttachments
          listId="Projects"
          itemId={projectId}
          mode="view"
          displayMode={AttachmentDisplayMode.Grid}
          showPreviews={true}
        />
      </PivotItem>
    </Pivot>
  );
};
```

## 🔗 Related Examples

- See [SPDynamicForm README](../SPDynamicForm/README.md) for form integration
- See [UserPersona README](../UserPersona/README.md) for user context
- See [ConflictDetector README](../ConflictDetector/README.md) for concurrent editing
