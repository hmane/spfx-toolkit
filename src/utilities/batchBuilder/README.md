# SharePoint BatchBuilder Utility

A fluent API utility for batching SharePoint list operations using PnP.js v3+. This utility simplifies the process of performing multiple operations across different lists in efficient batches.

## Features

- **Fluent API Design**: Chain operations naturally across multiple lists
- **Cross-List Operations**: Perform operations on multiple lists in a single batch
- **Correct PnP.js v3+ Pattern**: Uses the latest `sp.batched()` syntax
- **Comprehensive Error Handling**: Detailed error tracking with operation IDs
- **Configurable Batching**: Customizable batch sizes and execution modes
- **TypeScript Support**: Full type definitions included

## Installation

```bash
npm install @pnp/sp
```

## Quick Start

```typescript
import { spfi } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/batching';
import { createBatchBuilder } from './BatchBuilder';

const sp = spfi('https://yourtenant.sharepoint.com/sites/yoursite').using(/* your config */);

// Simple batch operations
const result = await createBatchBuilder(sp)
  .list('MyList')
  .add({ Title: 'Item 1', Description: 'Test item' })
  .add({ Title: 'Item 2', Description: 'Another test' })
  .update(1, { Title: 'Updated Title' })
  .execute();

console.log(`Successful operations: ${result.successfulOperations}`);
```

## API Reference

### Configuration

```typescript
interface IBatchBuilderConfig {
  batchSize?: number; // Default: 100
  enableConcurrency?: boolean; // Default: false
}
```

### Creating a BatchBuilder

```typescript
// With default configuration
const batchBuilder = createBatchBuilder(sp);

// With custom configuration
const batchBuilder = createBatchBuilder(sp, {
  batchSize: 50,
  enableConcurrency: true,
});
```

### List Operations

#### Add Items

```typescript
batchBuilder
  .list('MyList')
  .add({ Title: 'New Item', Status: 'Active' })
  .add({ Title: 'Another Item', Priority: 'High' });
```

#### Update Items

```typescript
batchBuilder
  .list('MyList')
  .update(1, { Title: 'Updated Title' })
  .update(2, { Status: 'Completed' }, '*'); // With eTag
```

#### Delete Items

```typescript
batchBuilder.list('MyList').delete(3).delete(4, '*'); // With eTag
```

#### Validation Operations

```typescript
batchBuilder
  .list('FormList')
  .addValidateUpdateItemUsingPath(
    [
      { FieldName: 'Title', FieldValue: 'New Item' },
      { FieldName: 'Status', FieldValue: 'Active' },
    ],
    '/sites/mysite/lists/FormList'
  )
  .validateUpdateListItem(1, [{ FieldName: 'Status', FieldValue: 'Completed' }]);
```

### Cross-List Operations

```typescript
const result = await createBatchBuilder(sp)
  .list('Projects')
  .add({ Title: 'Project A', Status: 'New' })
  .update(1, { Status: 'In Progress' })
  .list('Tasks')
  .add({ Title: 'Task 1', ProjectId: 1 })
  .add({ Title: 'Task 2', ProjectId: 1 })
  .list('Comments')
  .delete(5)
  .delete(6)
  .execute();
```

### Handling Results

```typescript
const result = await batchBuilder.execute();

// Check overall success
if (result.success) {
  console.log('All operations completed successfully');
} else {
  console.log(`${result.failedOperations} operations failed`);
}

// Process individual results
result.results.forEach(operationResult => {
  if (operationResult.success) {
    console.log(`✅ ${operationResult.operationType} on ${operationResult.listName}`);
    console.log('Data:', operationResult.data);
  } else {
    console.log(`❌ ${operationResult.operationType} failed: ${operationResult.error}`);
  }
});

// Handle errors
result.errors.forEach(error => {
  console.error(`Error in ${error.listName}: ${error.error}`);
});
```

### Result Interface

```typescript
interface IBatchResult {
  success: boolean;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  results: IOperationResult[];
  errors: IBatchError[];
}

interface IOperationResult {
  operationType: string;
  listName: string;
  success: boolean;
  data?: any;
  error?: string;
  itemId?: number;
  operationId?: string;
}
```

## Configuration Options

### Batch Size

Controls how many operations are included in each batch. SharePoint has limits on batch sizes, so the default of 100 is conservative for reliability.

```typescript
const batchBuilder = createBatchBuilder(sp, { batchSize: 50 });
```

### Concurrency

Controls whether multiple batches are executed concurrently or sequentially.

```typescript
// Sequential execution (safer, default)
const batchBuilder = createBatchBuilder(sp, { enableConcurrency: false });

// Concurrent execution (faster, but may hit throttling limits)
const batchBuilder = createBatchBuilder(sp, { enableConcurrency: true });
```

## Advanced Examples

### Complex Multi-List Workflow

```typescript
const result = await createBatchBuilder(sp, {
  batchSize: 50,
  enableConcurrency: false,
})
  .list('Orders')
  .add({
    CustomerName: 'John Doe',
    OrderDate: new Date().toISOString(),
    Status: 'Pending',
  })
  .list('OrderItems')
  .add({ OrderId: 1, ProductName: 'Widget A', Quantity: 5 })
  .add({ OrderId: 1, ProductName: 'Widget B', Quantity: 3 })
  .list('Inventory')
  .update(10, { StockLevel: 45 }) // Reduce Widget A stock
  .update(11, { StockLevel: 27 }) // Reduce Widget B stock
  .list('Notifications')
  .add({
    Type: 'Order Created',
    Message: 'New order from John Doe',
    CreatedDate: new Date().toISOString(),
  })
  .execute();

if (result.success) {
  console.log('Order workflow completed successfully');
} else {
  console.log('Some operations failed:', result.errors);
}
```

### Dynamic Configuration

```typescript
const batchBuilder = createBatchBuilder(sp);

// Update configuration based on conditions
if (operationsCount > 200) {
  batchBuilder.updateConfig({
    batchSize: 25,
    enableConcurrency: false,
  });
}

// Get current configuration
const config = batchBuilder.getConfig();
console.log('Current batch size:', config.batchSize);
```

## Error Handling Best Practices

1. **Always check the result**: Use `result.success` to determine if all operations completed successfully.

2. **Handle partial failures**: Even if some operations fail, others may succeed. Check individual results.

3. **Use operation IDs**: Each operation has a unique ID for tracking and debugging.

4. **Monitor batch sizes**: Large batches may hit SharePoint throttling limits.

5. **Consider sequential execution**: For critical operations, use `enableConcurrency: false`.

## SharePoint Limitations

- **Batch Size**: SharePoint has limits on the number of operations per batch
- **Throttling**: Rapid successive batches may trigger throttling
- **Transaction Scope**: Batches are not transactional - partial failures are possible
- **Field Validation**: Some validation occurs at batch execution time

## Dependencies

- `@pnp/sp` v3.x or higher
- TypeScript 4.x or higher (recommended)
