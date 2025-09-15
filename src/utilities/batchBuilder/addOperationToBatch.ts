import { SPFI } from '@pnp/sp';
import '@pnp/sp/batching';
import '@pnp/sp/items';
import '@pnp/sp/lists';
import '@pnp/sp/webs';
import { IBatchOperation } from '../../types/batchOperationTypes';

/**
 * Queues a single operation into the provided batched SP client, wiring result/error into resultContainer.
 */
export function addOperationToBatch(
  operation: IBatchOperation,
  batchedSP: SPFI,
  resultContainer: { result?: any; error?: any }
): void {
  const list = batchedSP.web.lists.getByTitle(operation.listName);

  switch (operation.operationType) {
    case 'add': {
      if (!operation.data) throw new Error('Data required for add operation');
      list.items.add(operation.data).then(
        result => (resultContainer.result = result),
        error => (resultContainer.error = error)
      );
      break;
    }

    case 'update': {
      if (!operation.itemId || !operation.data)
        throw new Error('Item ID and data required for update operation');
      const item = list.items.getById(operation.itemId);
      const p = operation.eTag
        ? item.update(operation.data, operation.eTag)
        : item.update(operation.data);
      p.then(
        result => (resultContainer.result = result),
        error => (resultContainer.error = error)
      );
      break;
    }

    case 'delete': {
      if (!operation.itemId) throw new Error('Item ID required for delete operation');
      const item = list.items.getById(operation.itemId);
      const p = operation.eTag ? item.delete(operation.eTag) : item.delete();
      p.then(
        result => (resultContainer.result = result),
        error => (resultContainer.error = error)
      );
      break;
    }

    case 'addValidateUpdateItemUsingPath': {
      if (!operation.formValues || !operation.path) {
        throw new Error('Form values and path required for addValidateUpdateItemUsingPath');
      }
      list.addValidateUpdateItemUsingPath(operation.formValues, operation.path).then(
        result => (resultContainer.result = result),
        error => (resultContainer.error = error)
      );
      break;
    }

    case 'validateUpdateListItem': {
      if (!operation.itemId || !operation.formValues)
        throw new Error('Item ID and form values required for validateUpdateListItem');
      list.items
        .getById(operation.itemId)
        .validateUpdateListItem(operation.formValues)
        .then(
          result => (resultContainer.result = result),
          error => (resultContainer.error = error)
        );
      break;
    }

    default:
      throw new Error(`Unsupported operation type: ${operation.operationType}`);
  }
}
