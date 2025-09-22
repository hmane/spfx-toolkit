import { IBatchOperation, IListItemFormUpdateValue, OperationType } from '../../types';

export class ListOperationBuilder {
  private operations: IBatchOperation[] = [];
  private operationCounter = 0;

  constructor(private readonly listName: string) {}

  private generateOperationId(): string {
    return `${this.listName}_${this.operationCounter++}_${Date.now()}`;
  }

  private push(
    op: Omit<IBatchOperation, 'listName' | 'operationId'> & { operationType: OperationType }
  ): this {
    this.operations.push({
      listName: this.listName,
      operationId: this.generateOperationId(),
      ...op,
    });
    return this;
  }

  /** Add new item */
  add(data: { [key: string]: any }): this {
    return this.push({ operationType: 'add', data });
  }

  /** Update existing item */
  update(itemId: number, data: { [key: string]: any }, eTag?: string): this {
    return this.push({ operationType: 'update', itemId, data, eTag });
  }

  /** Delete item */
  delete(itemId: number, eTag?: string): this {
    return this.push({ operationType: 'delete', itemId, eTag });
  }

  /** Add item with validation using server-side path */
  addValidateUpdateItemUsingPath(formValues: IListItemFormUpdateValue[], path: string): this {
    return this.push({ operationType: 'addValidateUpdateItemUsingPath', formValues, path });
  }

  /** Validate & update existing item */
  validateUpdateListItem(itemId: number, formValues: IListItemFormUpdateValue[]): this {
    return this.push({ operationType: 'validateUpdateListItem', itemId, formValues });
  }

  getOperations(): IBatchOperation[] {
    return this.operations;
  }
}
