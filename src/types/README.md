# SPFx Toolkit Types 📋

Comprehensive TypeScript type definitions for SharePoint Framework applications. These types provide full type safety for SharePoint operations, permissions, and data structures.

## Features

- 🔒 **Complete Type Safety** - Full TypeScript definitions for all SharePoint operations
- 📊 **SharePoint Field Types** - Comprehensive interfaces for all SharePoint field types
- 🛡️ **Permission Types** - Detailed permission and security type definitions
- ⚡ **Batch Operation Types** - Type-safe batch operation interfaces
- 🎯 **Runtime Type Guards** - Utility functions for runtime type checking
- 📦 **Tree-Shakable** - Import only the types you need

## Installation

```bash
npm install spfx-toolkit
```

## Quick Start

```typescript
import type {
  SPLookup,
  SPTaxonomy,
  IPrincipal,
  SPPermissionLevel,
  IBatchOperation,
} from 'spfx-toolkit/lib/types';

// Use types in your components
interface IMyComponentProps {
  assignedTo: IPrincipal;
  category: SPLookup;
  tags: SPTaxonomy[];
  requiredPermission: SPPermissionLevel;
}
```

## Type Categories

### 📄 SharePoint Field Types

Types for all SharePoint column/field data structures.

#### IPrincipal

User and group information interface.

```typescript
interface IPrincipal {
  id: string;
  email?: string;
  title?: string;
  value?: string; // login name
  loginName?: string; // alternative to value
  department?: string;
  jobTitle?: string;
  sip?: string;
  picture?: string;
}
```

#### SPLookup

Lookup field data structure.

```typescript
interface SPLookup {
  id?: number;
  title?: string;
}
```

#### SPTaxonomy

Managed metadata/taxonomy field structure.

```typescript
interface SPTaxonomy {
  label?: string;
  termId?: string;
  wssId?: number;
}
```

#### SPUrl

Hyperlink field structure.

```typescript
interface SPUrl {
  url?: string;
  description?: string;
}
```

#### SPLocation

Location field structure.

```typescript
interface SPLocation {
  displayName?: string;
  locationUri?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}
```

#### SPImage

Image field structure.

```typescript
interface SPImage {
  serverUrl?: string;
  serverRelativeUrl?: string;
  id?: string;
  fileName?: string;
}
```

### 🔐 Permission Types

Comprehensive permission and security type definitions.

#### SPPermissionLevel

Standard SharePoint permission levels.

```typescript
enum SPPermissionLevel {
  FullControl = 'Full Control',
  Design = 'Design',
  Edit = 'Edit',
  Contribute = 'Contribute',
  Read = 'Read',
  LimitedAccess = 'Limited Access',
  ViewOnly = 'View Only',
  RestrictedRead = 'Restricted Read',
}
```

#### IPermissionResult

Result of permission checks.

```typescript
interface IPermissionResult {
  hasPermission: boolean;
  permissionLevel?: string;
  roles?: string[];
  error?: string;
}
```

#### IUserPermissions

Comprehensive user permission information.

```typescript
interface IUserPermissions {
  userId: number;
  loginName: string;
  email?: string;
  displayName?: string;
  groups: string[];
  permissionLevels: string[];
  directPermissions: boolean;
  inheritedPermissions: boolean;
}
```

#### IItemPermissions

Item-level permission information.

```typescript
interface IItemPermissions {
  itemId: number;
  hasUniquePermissions: boolean;
  userPermissions: IUserPermissions[];
  groupPermissions: Array<{
    groupName: string;
    permissionLevels: string[];
  }>;
}
```

### ⚡ Batch Operation Types

Type definitions for batch SharePoint operations.

#### OperationType

Supported batch operation types.

```typescript
type OperationType =
  | 'add'
  | 'update'
  | 'delete'
  | 'addValidateUpdateItemUsingPath'
  | 'validateUpdateListItem';
```

#### IBatchOperation

Individual batch operation definition.

```typescript
interface IBatchOperation {
  listName: string;
  operationType: OperationType;
  itemId?: number;
  data?: any;
  formValues?: IListItemFormUpdateValue[];
  path?: string;
  eTag?: string;
  operationId?: string;
}
```

#### IBatchResult

Result of batch operation execution.

```typescript
interface IBatchResult {
  success: boolean;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  results: IOperationResult[];
  errors: IBatchError[];
}
```

## Usage Examples

### SharePoint Field Types

```typescript
import type { IPrincipal, SPLookup, SPTaxonomy } from 'spfx-toolkit/lib/types';

// Task item interface
interface ITaskItem {
  Id: number;
  Title: string;
  AssignedTo: IPrincipal;
  Category: SPLookup;
  Tags: SPTaxonomy[];
  DueDate: string;
  Priority: 'Low' | 'Medium' | 'High';
}

// Component props
interface ITaskCardProps {
  task: ITaskItem;
  currentUser: IPrincipal;
  onAssignmentChange: (newAssignee: IPrincipal) => void;
}

const TaskCard: React.FC<ITaskCardProps> = ({ task, currentUser, onAssignmentChange }) => {
  return (
    <div className='task-card'>
      <h3>{task.Title}</h3>
      <p>Assigned to: {task.AssignedTo.title}</p>
      <p>Category: {task.Category.title}</p>
      <div>Tags: {task.Tags.map(tag => tag.label).join(', ')}</div>
    </div>
  );
};
```

### Permission Types

```typescript
import type {
  SPPermissionLevel,
  IPermissionResult,
  IUserPermissions,
} from 'spfx-toolkit/lib/types';

// Permission service interface
interface IPermissionService {
  checkUserPermission(listName: string, permission: SPPermissionLevel): Promise<IPermissionResult>;

  getUserPermissions(listName: string): Promise<IUserPermissions>;
}

// Component with permission-based UI
interface ISecureComponentProps {
  requiredPermission: SPPermissionLevel;
  listName: string;
  children: React.ReactNode;
}

const SecureComponent: React.FC<ISecureComponentProps> = ({
  requiredPermission,
  listName,
  children,
}) => {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermission();
  }, [requiredPermission, listName]);

  const checkPermission = async () => {
    const result = await permissionService.checkUserPermission(listName, requiredPermission);
    setHasPermission(result.hasPermission);
  };

  if (!hasPermission) {
    return <div>Access denied</div>;
  }

  return <>{children}</>;
};
```

### Batch Operation Types

```typescript
import type { IBatchOperation, IBatchResult, OperationType } from 'spfx-toolkit/lib/types';

// Batch service interface
interface IBatchService {
  addOperation(operation: IBatchOperation): void;
  execute(): Promise<IBatchResult>;
}

// Bulk task update function
const updateMultipleTasks = async (
  updates: Array<{ id: number; data: Partial<ITaskItem> }>
): Promise<IBatchResult> => {
  const operations: IBatchOperation[] = updates.map(update => ({
    listName: 'Tasks',
    operationType: 'update' as OperationType,
    itemId: update.id,
    data: update.data,
    operationId: `update-task-${update.id}`,
  }));

  return batchService.executeOperations(operations);
};

// Handle batch results
const handleBatchResult = (result: IBatchResult) => {
  console.log(`✅ Successful operations: ${result.successfulOperations}`);
  console.log(`❌ Failed operations: ${result.failedOperations}`);

  if (result.errors.length > 0) {
    result.errors.forEach(error => {
      console.error(`Error in ${error.listName}: ${error.error}`);
    });
  }
};
```

### Form Data Types

```typescript
import type { IListItemFormUpdateValue } from 'spfx-toolkit/lib/types';

// Form submission handler
const handleFormSubmit = async (formData: Record<string, any>) => {
  // Convert form data to SharePoint format
  const formValues: IListItemFormUpdateValue[] = Object.entries(formData).map(
    ([fieldName, value]) => ({
      FieldName: fieldName,
      FieldValue: typeof value === 'string' ? value : JSON.stringify(value),
    })
  );

  const operation: IBatchOperation = {
    listName: 'FormResponses',
    operationType: 'addValidateUpdateItemUsingPath',
    formValues: formValues,
    path: '/sites/mysite/lists/FormResponses',
  };

  return batchService.addOperation(operation);
};
```

### Complex Data Transformation

```typescript
import type { IPrincipal, SPLookup, SPTaxonomy } from 'spfx-toolkit/lib/types';

// Data transformer utility
class SharePointDataTransformer {
  static transformUser(spUser: any): IPrincipal {
    return {
      id: spUser.Id?.toString() || spUser.id,
      email: spUser.Email || spUser.email,
      title: spUser.Title || spUser.title,
      loginName: spUser.LoginName || spUser.loginName,
      department: spUser.Department,
      jobTitle: spUser.JobTitle,
    };
  }

  static transformLookup(spLookup: any): SPLookup {
    return {
      id: spLookup.Id || spLookup.id,
      title: spLookup.Title || spLookup.title,
    };
  }

  static transformTaxonomy(spTaxonomy: any): SPTaxonomy {
    return {
      label: spTaxonomy.Label || spTaxonomy.label,
      termId: spTaxonomy.TermGuid || spTaxonomy.termId,
      wssId: spTaxonomy.WssId || spTaxonomy.wssId,
    };
  }
}

// Usage in data processing
const processListItems = (rawItems: any[]): ITaskItem[] => {
  return rawItems.map(item => ({
    Id: item.Id,
    Title: item.Title,
    AssignedTo: SharePointDataTransformer.transformUser(item.AssignedTo),
    Category: SharePointDataTransformer.transformLookup(item.Category),
    Tags: (item.Tags?.results || []).map(SharePointDataTransformer.transformTaxonomy),
    DueDate: item.DueDate,
    Priority: item.Priority,
  }));
};
```

## Type Guards and Utilities

### Runtime Type Checking

```typescript
import { TypeGuards } from 'spfx-toolkit/lib/types';

// Use type guards for runtime validation
const validateLookupField = (value: unknown): value is SPLookup => {
  return TypeGuards.isSPLookup(value);
};

const validateTaxonomyField = (value: unknown): value is SPTaxonomy => {
  return TypeGuards.isSPTaxonomy(value);
};

const validatePrincipal = (value: unknown): value is IPrincipal => {
  return TypeGuards.isPrincipal(value);
};

// Safe data processing
const processFieldValue = (fieldValue: unknown, fieldType: string) => {
  switch (fieldType) {
    case 'lookup':
      if (validateLookupField(fieldValue)) {
        return `${fieldValue.title} (ID: ${fieldValue.id})`;
      }
      break;

    case 'taxonomy':
      if (validateTaxonomyField(fieldValue)) {
        return fieldValue.label;
      }
      break;

    case 'user':
      if (validatePrincipal(fieldValue)) {
        return fieldValue.title || fieldValue.email;
      }
      break;
  }

  return 'Invalid field value';
};
```

### Error Code Constants

```typescript
import { PermissionErrorCodes } from 'spfx-toolkit/lib/types';

// Use predefined error codes
const handlePermissionError = (error: any) => {
  switch (error.code) {
    case PermissionErrorCodes.PERMISSION_DENIED:
      return 'You do not have permission to perform this action';

    case PermissionErrorCodes.GROUP_NOT_FOUND:
      return 'The specified group was not found';

    case PermissionErrorCodes.LIST_NOT_FOUND:
      return 'The specified list was not found';

    case PermissionErrorCodes.NETWORK_ERROR:
      return 'Network error occurred. Please try again';

    default:
      return 'An unknown error occurred';
  }
};

// Create typed errors
class PermissionError extends Error {
  constructor(message: string, public code: PermissionErrorCode, public details?: any) {
    super(message);
    this.name = 'PermissionError';
  }
}
```

## Advanced Usage Patterns

### Generic Type Utilities

```typescript
// Generic interfaces for list operations
interface IListService<T extends { Id: number }> {
  getItems(): Promise<T[]>;
  getItem(id: number): Promise<T>;
  createItem(data: Omit<T, 'Id'>): Promise<T>;
  updateItem(id: number, data: Partial<T>): Promise<T>;
  deleteItem(id: number): Promise<void>;
}

// Typed list service implementation
class TaskService implements IListService<ITaskItem> {
  async getItems(): Promise<ITaskItem[]> {
    // Implementation
  }

  async getItem(id: number): Promise<ITaskItem> {
    // Implementation
  }

  // ... other methods
}
```

### Type-Safe Configuration

```typescript
// Configuration with types
interface IComponentConfig {
  permissions: {
    required: SPPermissionLevel;
    fallback: SPPermissionLevel;
  };
  fields: {
    lookup: string[];
    taxonomy: string[];
    user: string[];
  };
  batch: {
    size: number;
    concurrent: boolean;
  };
}

const defaultConfig: IComponentConfig = {
  permissions: {
    required: SPPermissionLevel.Edit,
    fallback: SPPermissionLevel.Read,
  },
  fields: {
    lookup: ['Category', 'Project'],
    taxonomy: ['Tags', 'Keywords'],
    user: ['AssignedTo', 'CreatedBy'],
  },
  batch: {
    size: 100,
    concurrent: false,
  },
};
```

## Best Practices

### 1. Use Strict Typing

```typescript
// ✅ Good: Strict typing with interfaces
interface IUserData {
  user: IPrincipal;
  permissions: SPPermissionLevel[];
}

// ❌ Avoid: Loose typing
const userData: any = { user: {}, permissions: [] };
```

### 2. Leverage Type Guards

```typescript
// ✅ Good: Runtime type validation
if (TypeGuards.isSPLookup(fieldValue)) {
  console.log(fieldValue.title); // Type-safe access
}

// ❌ Avoid: Unsafe casting
const lookup = fieldValue as SPLookup; // Could fail at runtime
```

### 3. Use Utility Types

```typescript
// ✅ Good: Utility types for partial updates
type TaskUpdate = Partial<Pick<ITaskItem, 'Title' | 'DueDate' | 'Priority'>>;

// ✅ Good: Omit for create operations
type CreateTask = Omit<ITaskItem, 'Id'>;
```

### 4. Document Complex Types

```typescript
/**
 * Represents a SharePoint task item with all related metadata
 * @interface ITaskItem
 */
interface ITaskItem {
  /** Unique SharePoint item ID */
  Id: number;

  /** Task title/name */
  Title: string;

  /** User assigned to this task */
  AssignedTo: IPrincipal;

  /** Task category lookup field */
  Category: SPLookup;

  /** Managed metadata tags */
  Tags: SPTaxonomy[];
}
```

## Import Patterns

### Tree-Shakable Imports

```typescript
// ✅ Best: Import specific types
import type { IPrincipal, SPLookup } from 'spfx-toolkit/lib/types';

// ✅ Good: Import type category
import type { SharePointTypes } from 'spfx-toolkit/lib/types';
type User = SharePointTypes.Principal;

// ❌ Avoid: Bulk import
import * as Types from 'spfx-toolkit/lib/types';
```

### Namespace Usage

```typescript
// Use organized namespaces for clarity
import type { SharePointTypes, PermissionTypes, BatchTypes } from 'spfx-toolkit/lib/types';

type User = SharePointTypes.Principal;
type Permission = PermissionTypes.Level;
type Operation = BatchTypes.Operation;
```

## TypeScript Configuration

Ensure your `tsconfig.json` supports the toolkit types:

```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```
