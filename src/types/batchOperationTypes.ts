export type OperationType =
  | 'add'
  | 'update'
  | 'delete'
  | 'addValidateUpdateItemUsingPath'
  | 'validateUpdateListItem';

export interface IListItemFormUpdateValue {
  FieldName: string;
  FieldValue: string;
}

export interface IBatchOperation {
  listName: string;
  operationType: OperationType;
  itemId?: number;
  data?: any;
  formValues?: IListItemFormUpdateValue[];
  path?: string;
  eTag?: string;
  operationId?: string;
}

export interface IOperationResult {
  operationType: string;
  listName: string;
  success: boolean;
  data?: any;
  error?: string;
  itemId?: number;
  operationId?: string;
}

export interface IBatchError {
  listName: string;
  operationType: string;
  error: string;
  itemId?: number;
  operationId?: string;
}

export interface IBatchResult {
  success: boolean;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  results: IOperationResult[];
  errors: IBatchError[];
}

export interface IBatchBuilderConfig {
  batchSize?: number;
  enableConcurrency?: boolean;
}

/** Internal tracker for queued batched calls */
export interface IBatchedOperationTracker {
  operation: IBatchOperation;
  resultContainer: { result?: any; error?: any };
}

export type ExecuteBatchReturn = {
  results: IOperationResult[];
  errors: IBatchError[];
};
