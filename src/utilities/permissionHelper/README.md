# SharePoint Permission Helper - Production Ready 🚀

A comprehensive, production-ready TypeScript utility for checking SharePoint permissions and group memberships in SPFx applications. Built with clean architecture, full TypeScript support, and zero dependencies beyond PnP.js.

## ✨ **Key Features**

- 🔐 **Permission Checking** - List and item-level permission validation
- 👥 **Group Membership** - Flexible SharePoint group validation
- ⚡ **Batch Operations** - Efficient parallel permission checks
- 🧠 **Intelligent Caching** - Configurable caching with automatic expiration
- 🎯 **Type Safety** - Full TypeScript support with strict typing
- 🏗️ **Modular Structure** - Clean, maintainable code organization
- 📦 **Tree Shaking** - Import only what you need
- 🚫 **Zero Dependencies** - Only requires @pnp/sp

## 📁 **Project Structure**

```
src/permission-helper/
├── types.ts                    # 📋 All interfaces and type definitions
├── constants.ts                # 📊 Constants, enums, and mappings
├── utils.ts                    # 🛠️ Utility functions and helpers
├── PermissionHelper.ts         # 🎯 Main permission helper class
├── BatchPermissionChecker.ts   # ⚡ Batch operations class
├── PermissionError.ts          # ❌ Custom error handling
└── index.ts                    # 📤 Main exports
```

## 📦 **Installation**

```bash
npm install @pnp/sp
```

## 🛠️ **Setup**

### **1. Basic Setup**

```typescript
import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/security";
import "@pnp/sp/site-users";
import "@pnp/sp/site-groups";

import { createPermissionHelper } from './permission-helper';

// Initialize PnP.js (SPFx context)
const sp = spfi().using(SPFx(this.context));

// Create basic permission helper
const permissionHelper = createPermissionHelper(sp);
```

### **2. Advanced Configuration**

```typescript
import {
  createPermissionHelper,
  SPPermissionLevel,
  PermissionKind
} from './permission-helper';

const permissionHelper = createPermissionHelper(sp, {
  enableCaching: true,
  cacheTimeout: 600000, // 10 minutes

  // Map friendly names to actual SharePoint group names
  customGroupMappings: {
    "Admins": "Site Collection Administrators",
    "Editors": "Content Editors Group",
    "Reviewers": "Document Review Team",
    "Finance": "Finance Department - Full Access"
  },

  // Map custom permission levels to PermissionKind
  permissionLevelMappings: {
    [SPPermissionLevel.Edit]: PermissionKind.EditListItems,
    [SPPermissionLevel.Read]: PermissionKind.ViewListItems
  }
});
```

## 📖 **Usage Examples**

### **Basic Permission Checks**

```typescript
import { SPPermissionLevel } from './permission-helper';

// ✅ Check if user can edit a list
const canEdit = await permissionHelper.userHasPermissionOnList("Tasks", SPPermissionLevel.Edit);
if (canEdit.hasPermission) {
  console.log("User can edit the Tasks list");
}

// ✅ Check if user can read a specific item
const canRead = await permissionHelper.userHasPermissionOnItem("Documents", 123, SPPermissionLevel.Read);
if (canRead.hasPermission) {
  console.log("User can read document item 123");
  console.log("Permission level:", canRead.permissionLevel);
}

// ✅ Check for full control
const isAdmin = await permissionHelper.userHasPermissionOnList("Site Pages", SPPermissionLevel.FullControl);
if (isAdmin.hasPermission) {
  console.log("User has full control");
}
```

### **Group Membership Validation**

```typescript
// ✅ Check single group membership
const isApprover = await permissionHelper.userHasRole("Document Approvers");
if (isApprover.hasPermission) {
  console.log("User is in Document Approvers group");
  console.log("All user groups:", isApprover.roles);
}

// ✅ Check if user is in ANY of several groups (OR logic)
const hasAnyRole = await permissionHelper.userHasAnyRole([
  "Project Managers",
  "Team Leads",
  "Administrators"
]);

if (hasAnyRole.hasPermission) {
  console.log(`User has roles: ${hasAnyRole.roles?.join(', ')}`);
}

// ✅ Check if user has ALL required roles (AND logic)
const hasAllRoles = await permissionHelper.userHasAllRoles([
  "Finance Team",
  "Level 2 Approvers"
]);

if (hasAllRoles.hasPermission) {
  console.log("User has all required finance permissions");
}
```

### **Batch Operations (Performance Optimized)**

```typescript
import { BatchPermissionChecker } from './permission-helper';

const batchChecker = new BatchPermissionChecker(sp, {
  enableCaching: true,
  cacheTimeout: 300000
});

// ✅ Check multiple lists in parallel
const listResults = await batchChecker.checkMultipleLists([
  { listName: "Tasks", permission: SPPermissionLevel.Edit },
  { listName: "Documents", permission: SPPermissionLevel.Read },
  { listName: "Calendar", permission: SPPermissionLevel.Contribute, key: "calendar_access" }
]);

console.log("Tasks edit permission:", listResults["Tasks_Edit"].hasPermission);
console.log("Documents read permission:", listResults["Documents_Read"].hasPermission);
console.log("Calendar access:", listResults["calendar_access"].hasPermission);

// ✅ Check multiple items in parallel
const itemResults = await batchChecker.checkMultipleItems([
  { listName: "Tasks", itemId: 1, permission: SPPermissionLevel.Edit },
  { listName: "Tasks", itemId: 2, permission: SPPermissionLevel.Delete },
  { listName: "Documents", itemId: 15, permission: SPPermissionLevel.Read, key: "doc_15_read" }
]);

console.log("Task 1 edit permission:", itemResults["Tasks_1_Edit"].hasPermission);
console.log("Document 15 read permission:", itemResults["doc_15_read"].hasPermission);
```

### **Using Utility Functions**

```typescript
import {
  getAllSiteGroups,
  getHighestPermissionLevel,
  hasRequiredPermissions,
  permissionLevelIncludes,
  getPermissionNames
} from './permission-helper';

// ✅ Get all SharePoint groups
const allGroups = await getAllSiteGroups(sp);
console.log("Available groups:", allGroups);

// ✅ Check permission hierarchies
const canUserEdit = permissionLevelIncludes(
  SPPermissionLevel.Edit,
  [PermissionKind.EditListItems, PermissionKind.ViewListItems]
);
console.log("Edit level includes required permissions:", canUserEdit);

// ✅ Get user's comprehensive permissions
const userPerms = await permissionHelper.getCurrentUserPermissions("Tasks");
console.log("User ID:", userPerms.userId);
console.log("Groups:", userPerms.groups);
console.log("Permission levels:", userPerms.permissionLevels);

// ✅ Get highest permission level
const highestLevel = getHighestPermissionLevel(userPerms.permissionLevels);
console.log("Highest permission level:", highestLevel);

// ✅ Validate required permissions
const hasRequired = hasRequiredPermissions(
  userPerms.permissionLevels,
  ["Edit Items", "Delete Items"]
);
console.log("Has required permissions:", hasRequired);
```

### **Advanced Permission Analysis**

```typescript
import { PermissionKind } from "@pnp/sp/security";

// ✅ Check specific PnP.js PermissionKind
const canDelete = await permissionHelper.userHasSpecificPermission(
  "Tasks",
  PermissionKind.DeleteListItems
);

if (canDelete.hasPermission) {
  console.log("User can delete items from Tasks list");
}

// ✅ Check multiple permissions at once (parallel execution)
const permissions = await permissionHelper.checkMultiplePermissions("Tasks", [
  SPPermissionLevel.Read,
  SPPermissionLevel.Edit,
  SPPermissionLevel.FullControl
]);

console.log("Permission matrix:", {
  canRead: permissions[SPPermissionLevel.Read],
  canEdit: permissions[SPPermissionLevel.Edit],
  canFullControl: permissions[SPPermissionLevel.FullControl]
});

// ✅ Get item-specific permissions
const itemPerms = await permissionHelper.getItemPermissions("Documents", 123);
console.log("Item has unique permissions:", itemPerms.hasUniquePermissions);
console.log("Users with access:", itemPerms.userPermissions.length);
console.log("Groups with access:", itemPerms.groupPermissions.length);
```

## 🏗️ **Production Examples**

### **1. React Component with Permission-Based UI**

```typescript
import React, { useEffect, useState } from 'react';
import {
  createPermissionHelper,
  SPPermissionLevel,
  BatchPermissionChecker,
  PermissionError,
  PermissionErrorCodes
} from './permission-helper';

interface ITaskPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  isManager: boolean;
}

const TaskManager: React.FC = () => {
  const [permissions, setPermissions] = useState<ITaskPermissions>({
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    isManager: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    try {
      setError(null);
      const batchChecker = new BatchPermissionChecker(sp);

      // Check multiple permissions in parallel for better performance
      const [listPerms, groupPerms] = await Promise.all([
        // List permissions
        batchChecker.checkMultipleLists([
          { listName: "Tasks", permission: SPPermissionLevel.Contribute, key: "create" },
          { listName: "Tasks", permission: SPPermissionLevel.Edit, key: "edit" },
          { listName: "Tasks", permission: SPPermissionLevel.FullControl, key: "delete" }
        ]),

        // Group memberships
        Promise.all([
          batchChecker.getPermissionHelper().userHasRole("Task Approvers"),
          batchChecker.getPermissionHelper().userHasAnyRole(["Project Managers", "Team Leads"])
        ])
      ]);

      const [approverCheck, managerCheck] = groupPerms;

      setPermissions({
        canCreate: listPerms.create.hasPermission,
        canEdit: listPerms.edit.hasPermission,
        canDelete: listPerms.delete.hasPermission,
        canApprove: approverCheck.hasPermission,
        isManager: managerCheck.hasPermission
      });

    } catch (error) {
      console.error("Permission check failed:", error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!permissions.canCreate) {
      throw new PermissionError(
        "You don't have permission to create tasks",
        PermissionErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }
    // Task creation logic here
  };

  const handleApproveTask = async (taskId: number) => {
    if (!permissions.canApprove) {
      throw new PermissionError(
        "You don't have permission to approve tasks",
        PermissionErrorCodes.PERMISSION_DENIED
      );
    }
    // Task approval logic here
  };

  if (isLoading) {
    return <div className="loading">🔄 Loading permissions...</div>;
  }

  if (error) {
    return <div className="error">❌ Error: {error}</div>;
  }

  return (
    <div className="task-manager">
      <h2>Task Manager</h2>

      {/* Conditional UI based on permissions */}
      <div className="actions">
        {permissions.canCreate && (
          <button onClick={handleCreateTask} className="btn-primary">
            ➕ Create New Task
          </button>
        )}

        {permissions.canEdit && (
          <button onClick={() => console.log('Edit task')} className="btn-secondary">
            ✏️ Edit Tasks
          </button>
        )}

        {permissions.canDelete && (
          <button onClick={() => console.log('Delete task')} className="btn-danger">
            🗑️ Delete Tasks
          </button>
        )}

        {permissions.canApprove && (
          <button onClick={() => handleApproveTask(1)} className="btn-success">
            ✅ Approve Tasks
          </button>
        )}
      </div>

      {/* Manager-only features */}
      {permissions.isManager && (
        <div className="manager-section">
          <h3>👑 Manager Features</h3>
          <button className="btn-special">📊 View Team Analytics</button>
          <button className="btn-special">⚙️ Manage Settings</button>
        </div>
      )}

      {/* No permissions message */}
      {!Object.values(permissions).some(Boolean) && (
        <div className="no-permissions">
          ℹ️ You don't have any task management permissions.
          Please contact your administrator.
        </div>
      )}

      {/* Permission summary for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <details className="debug-info">
          <summary>🔍 Debug: Current Permissions</summary>
          <pre>{JSON.stringify(permissions, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};

export default TaskManager;
```

### **2. Service Class with Comprehensive Permission Validation**

```typescript
import {
  createPermissionHelper,
  SPPermissionLevel,
  PermissionError,
  PermissionErrorCodes,
  PermissionKind
} from './permission-helper';

interface ITaskData {
  Title: string;
  Description: string;
  AssignedTo: string;
  Priority: 'Low' | 'Medium' | 'High';
  DueDate: string;
}

interface IApprovalData {
  Status: 'Approved' | 'Rejected';
  Comments: string;
  ApprovalDate: string;
}

class TaskService {
  private permissionHelper = createPermissionHelper(sp, {
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    customGroupMappings: {
      "TaskManagers": "Task Managers Group",
      "Approvers": "Task Approval Team"
    }
  });

  /**
   * Create a new task with permission validation
   */
  async createTask(taskData: ITaskData): Promise<number> {
    try {
      // Validate permissions before proceeding
      const canCreate = await this.permissionHelper.userHasPermissionOnList(
        "Tasks",
        SPPermissionLevel.Contribute
      );

      if (!canCreate.hasPermission) {
        throw new PermissionError(
          "Insufficient permissions to create tasks",
          PermissionErrorCodes.INSUFFICIENT_PERMISSIONS,
          {
            requiredPermission: SPPermissionLevel.Contribute,
            listName: "Tasks",
            operation: "create"
          }
        );
      }

      // Proceed with task creation
      const list = sp.web.lists.getByTitle("Tasks");
      const result = await list.items.add(taskData);

      console.log(`✅ Task created successfully with ID: ${result.data.Id}`);
      return result.data.Id;

    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      throw PermissionError.fromError(error, PermissionErrorCodes.UNKNOWN_ERROR);
    }
  }

  /**
   * Approve a task with role-based validation
   */
  async approveTask(taskId: number, approvalData: IApprovalData): Promise<void> {
    try {
      // Check both permission level and group membership in parallel
      const [canEdit, isApprover, currentUser] = await Promise.all([
        this.permissionHelper.userHasPermissionOnItem("Tasks", taskId, SPPermissionLevel.Edit),
        this.permissionHelper.userHasRole("Approvers"),
        sp.web.currentUser()
      ]);

      // Validate edit permissions
      if (!canEdit.hasPermission) {
        throw new PermissionError(
          `Cannot edit task with ID ${taskId}`,
          PermissionErrorCodes.PERMISSION_DENIED,
          {
            taskId,
            requiredPermission: SPPermissionLevel.Edit,
            userPermissions: canEdit.permissionLevel
          }
        );
      }

      // Validate approver role
      if (!isApprover.hasPermission) {
        throw new PermissionError(
          "User is not authorized to approve tasks",
          PermissionErrorCodes.INSUFFICIENT_PERMISSIONS,
          {
            taskId,
            requiredRole: "Approvers",
            userRoles: isApprover.roles
          }
        );
      }

      // Proceed with approval
      const list = sp.web.lists.getByTitle("Tasks");
      await list.items.getById(taskId).update({
        ...approvalData,
        ApprovedBy: currentUser.Title,
        ApprovedDate: new Date().toISOString()
      });

      console.log(`✅ Task ${taskId} approved by ${currentUser.Title}`);

    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      throw PermissionError.fromError(error, PermissionErrorCodes.UNKNOWN_ERROR);
    }
  }

  /**
   * Delete a task with enhanced permission checking
   */
  async deleteTask(taskId: number): Promise<void> {
    try {
      // Multiple permission checks for deletion
      const [canDelete, isOwner, isManager] = await Promise.all([
        this.permissionHelper.userHasSpecificPermission("Tasks", PermissionKind.DeleteListItems),
        this.permissionHelper.userHasRole("Owners"),
        this.permissionHelper.userHasRole("TaskManagers")
      ]);

      // Check if user has any permission to delete
      const hasDeletePermission = canDelete.hasPermission || isOwner.hasPermission || isManager.hasPermission;

      if (!hasDeletePermission) {
        throw new PermissionError(
          `Insufficient permissions to delete task ${taskId}`,
          PermissionErrorCodes.INSUFFICIENT_PERMISSIONS,
          {
            taskId,
            checkedPermissions: {
              deleteItems: canDelete.hasPermission,
              isOwner: isOwner.hasPermission,
              isManager: isManager.hasPermission
            }
          }
        );
      }

      // Proceed with deletion
      const list = sp.web.lists.getByTitle("Tasks");
      await list.items.getById(taskId).delete();

      console.log(`✅ Task ${taskId} deleted successfully`);

    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      throw PermissionError.fromError(error, PermissionErrorCodes.UNKNOWN_ERROR);
    }
  }

  /**
   * Get comprehensive task permissions for debugging
   */
  async getTaskPermissions(taskId: number): Promise<any> {
    try {
      const [itemPerms, userPerms] = await Promise.all([
        this.permissionHelper.getItemPermissions("Tasks", taskId),
        this.permissionHelper.getCurrentUserPermissions("Tasks")
      ]);

      return {
        item: itemPerms,
        user: userPerms,
        summary: {
          hasUniquePermissions: itemPerms.hasUniquePermissions,
          userPermissionCount: itemPerms.userPermissions.length,
          groupPermissionCount: itemPerms.groupPermissions.length,
          currentUserGroups: userPerms.groups,
          currentUserPermissions: userPerms.permissionLevels
        }
      };
    } catch (error) {
      throw PermissionError.fromError(error, PermissionErrorCodes.UNKNOWN_ERROR);
    }
  }

  /**
   * Bulk permission check for multiple tasks
   */
  async checkTasksPermissions(taskIds: number[]): Promise<Record<number, boolean>> {
    try {
      const batchChecker = new (await import('./permission-helper')).BatchPermissionChecker(sp);

      const requests = taskIds.map(taskId => ({
        listName: "Tasks",
        itemId: taskId,
        permission: SPPermissionLevel.Edit,
        key: `task_${taskId}`
      }));

      const results = await batchChecker.checkMultipleItems(requests);

      // Convert results to taskId -> boolean mapping
      const permissions: Record<number, boolean> = {};
      for (const taskId of taskIds) {
        permissions[taskId] = results[`task_${taskId}`]?.hasPermission || false;
      }

      return permissions;
    } catch (error) {
      throw PermissionError.fromError(error, PermissionErrorCodes.UNKNOWN_ERROR);
    }
  }

  /**
   * Clear permission cache (useful after permission changes)
   */
  clearCache(): void {
    this.permissionHelper.clearCache();
    console.log("🧹 Permission cache cleared");
  }
}
