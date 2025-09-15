// ========================================
// LIST ITEM TYPES - Individual exports for better tree-shaking

import {
  ExecuteBatchReturn,
  IBatchBuilderConfig,
  IBatchError,
  IBatchOperation,
  IBatchResult,
  IListItemFormUpdateValue,
  IOperationResult,
  OperationType,
} from './batchOperationTypes';
import { IPrincipal, SPImage, SPLocation, SPLookup, SPTaxonomy, SPUrl } from './listItemTypes';
import {
  IBatchItemRequest,
  IBatchListRequest,
  IItemPermissions,
  IPermissionHelperConfig,
  IPermissionResult,
  ISPGroup,
  ISPRoleAssignment,
  ISPUser,
  IUserPermissions,
  PermissionErrorCode,
  SPPermissionLevel,
} from './permissionTypes';

// ========================================
export type { IListItemFormUpdateValue, IPrincipal, SPImage, SPLocation, SPLookup, SPTaxonomy, SPUrl } from './listItemTypes';

// ========================================
// PERMISSION TYPES - Individual exports for better tree-shaking
// ========================================
export type { IBatchItemRequest, IBatchListRequest, ICachedPermission, IItemPermissions, IPermissionHelperConfig, IPermissionMask, IPermissionResult, ISPGroup, ISPItemWithPermissions, ISPRoleAssignment, ISPUser, IUserPermissions, PermissionErrorCode, SPPermissionLevel } from './permissionTypes';

// Export the PermissionErrorCodes constant
export { PermissionErrorCodes } from './permissionTypes';

// ========================================
// BATCH OPERATION TYPES - Individual exports for better tree-shaking
// ========================================
export type { ExecuteBatchReturn, IBatchBuilderConfig, IBatchedOperationTracker, IBatchError, IBatchOperation, IBatchResult, IOperationResult, OperationType } from './batchOperationTypes';

// ========================================
// GROUPED EXPORTS - For convenience when importing multiple related types
// ========================================

// List item related types
export type {
  IListItemFormUpdateValue as ListItemFormUpdateValue,
  IPrincipal as Principal,
  SPImage as SharePointImage,
  SPLocation as SharePointLocation,
  SPLookup as SharePointLookup,
  SPTaxonomy as SharePointTaxonomy,
  SPUrl as SharePointUrl
} from './listItemTypes';

// Permission related types
export type {
  IItemPermissions as ItemPermissions,
  IPermissionHelperConfig as PermissionHelperConfig, IPermissionResult as PermissionResult, SPPermissionLevel as SharePointPermissionLevel, IUserPermissions as UserPermissions
} from './permissionTypes';

// Batch operation related types
export type {
  IBatchBuilderConfig as BatchBuilderConfig, IBatchError as BatchError, ExecuteBatchReturn as BatchExecutionResult, IBatchOperation as BatchOperation,
  IBatchResult as BatchResult,
  IOperationResult as OperationResult
} from './batchOperationTypes';

// ========================================
// NAMESPACE EXPORTS - For organized imports
// ========================================

// Create namespaces for better organization
export namespace SharePointTypes {
  export type Image = SPImage;
  export type Location = SPLocation;
  export type Lookup = SPLookup;
  export type Taxonomy = SPTaxonomy;
  export type Url = SPUrl;
  export type Principal = IPrincipal;
  export type FormUpdateValue = IListItemFormUpdateValue;
}

export namespace PermissionTypes {
  export type Level = SPPermissionLevel;
  export type Result = IPermissionResult;
  export type UserPermissions = IUserPermissions;
  export type ItemPermissions = IItemPermissions;
  export type Config = IPermissionHelperConfig;
  export type ErrorCode = PermissionErrorCode;
  export type User = ISPUser;
  export type Group = ISPGroup;
  export type RoleAssignment = ISPRoleAssignment;
}

export namespace BatchTypes {
  export type Operation = IBatchOperation;
  export type Result = IBatchResult;
  export type OperationResult = IOperationResult;
  export type Error = IBatchError;
  export type Config = IBatchBuilderConfig;
  export type OperationTypes = OperationType;
  export type ExecutionResult = ExecuteBatchReturn;
}

// ========================================
// UTILITY TYPES - Common type combinations
// ========================================

// Union types for common scenarios
export type SPFieldValue = SPImage | SPLocation | SPLookup | SPTaxonomy | SPUrl | IPrincipal;
export type BatchRequestType = IBatchItemRequest | IBatchListRequest;
export type PermissionEntity = ISPUser | ISPGroup;

// Conditional types for advanced use cases
export type OperationByType<T extends OperationType> = IBatchOperation & {
  operationType: T;
};

// Helper types for specific operations
export type AddOperation = OperationByType<'add'>;
export type UpdateOperation = OperationByType<'update'>;
export type DeleteOperation = OperationByType<'delete'>;

// Result types with specific operation context
export type AddOperationResult = IOperationResult & { operationType: 'add' };
export type UpdateOperationResult = IOperationResult & { operationType: 'update' };
export type DeleteOperationResult = IOperationResult & { operationType: 'delete' };

// ========================================
// LEGACY SUPPORT - Maintain backward compatibility
// ========================================

// Keep the original bulk export for backward compatibility
// but mark as deprecated to encourage individual imports
/** @deprecated Use individual type imports instead for better tree-shaking */
export * from './batchOperationTypes';
/** @deprecated Use individual type imports instead for better tree-shaking */
export * from './listItemTypes';
/** @deprecated Use individual type imports instead for better tree-shaking */
export * from './permissionTypes';

// ========================================
// TYPE GUARDS - Runtime type checking utilities
// ========================================

// Type guard functions for runtime validation
export const TypeGuards = {
  isSPLookup: (value: any): value is SPLookup => {
    return typeof value === 'object' && value !== null && ('id' in value || 'title' in value);
  },

  isSPTaxonomy: (value: any): value is SPTaxonomy => {
    return (
      typeof value === 'object' &&
      value !== null &&
      ('label' in value || 'termId' in value || 'wssId' in value)
    );
  },

  isPrincipal: (value: any): value is IPrincipal => {
    return typeof value === 'object' && value !== null && 'id' in value;
  },

  isBatchOperation: (value: any): value is IBatchOperation => {
    return (
      typeof value === 'object' && value !== null && 'listName' in value && 'operationType' in value
    );
  },

  isOperationResult: (value: any): value is IOperationResult => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'operationType' in value &&
      'listName' in value &&
      'success' in value
    );
  },
} as const;
