# SPFx Conflict Detection Utility

A comprehensive SharePoint Framework (SPFx) utility for detecting and handling concurrent editing conflicts in SharePoint list items. Prevent data loss when multiple users edit the same record simultaneously.

## Features

- 🔍 **Real-time conflict detection** using SharePoint ETags and timestamps
- ⚛️ **Multiple integration patterns** - Hooks, Context Provider, and imperative API
- 🎨 **Fluent UI v8 components** - Ready-to-use notification bars and dialogs
- 🔧 **Flexible configuration** - Silent monitoring, notifications, or strict blocking
- 📦 **NPM ready** - Designed for reuse across multiple SPFx solutions
- 🧪 **TypeScript support** - Fully typed with comprehensive interfaces

## Installation

```bash
# Install the utility in your SPFx project
npm install @pnp/sp  # Required dependency
```

Copy the `conflictDetector` folder to your SPFx project source directory.

## Quick Start

### 1. Hook-based Approach (Function Components)

```typescript
import { useConflictDetection, ConflictNotificationBar } from './conflictDetector';

const MyFormComponent: React.FC = () => {
  const {
    hasConflict,
    conflictInfo,
    isChecking,
    error,
    checkForConflicts,
    updateSnapshot
  } = useConflictDetection({
    listId: "your-list-id",
    itemId: 123,
    options: {
      checkOnSave: true,
      showNotification: true,
      blockSave: false
    }
  });

  const handleSave = async () => {
    // Check for conflicts before saving
    const hasConflict = await checkForConflicts();
    if (hasConflict) {
      // Let user decide whether to proceed
      return;
    }

    // Save your data
    await saveData();
    
    // Update snapshot after successful save
    await updateSnapshot();
  };

  return (
    <div>
      <ConflictNotificationBar
        conflictInfo={conflictInfo}
        isChecking={isChecking}
        error={error}
        onRefresh={() => window.location.reload()}
        onOverwrite={handleSave}
      />
      
      <form>
        {/* Your form content */}
        <button onClick={handleSave}>Save</button>
      </form>
    </div>
  );
};
```

### 2. Provider-based Approach (Class Components)

```typescript
import { ConflictDetectionProvider, ConflictHandler } from './conflictDetector';

// Wrap your application
const App: React.FC = () => (
  <ConflictDetectionProvider
    listId="your-list-id"
    itemId={123}
    options={{
      checkOnSave: true,
      showNotification: true,
      notificationPosition: 'top'
    }}
  >
    <MyClassComponent />
  </ConflictDetectionProvider>
);

// Use in class component
class MyClassComponent extends React.Component {
  static contextType = ConflictContext;

  handleSave = async () => {
    const { checkForConflicts, updateSnapshot } = this.context;
    
    await checkForConflicts();
    // Handle conflicts through UI components
    
    await this.saveData();
    await updateSnapshot();
  };

  render() {
    return (
      <div>
        <ConflictHandler
          {...this.context.getState()}
          onRefresh={() => window.location.reload()}
          onOverwrite={this.handleSave}
        />
        
        {/* Your form content */}
      </div>
    );
  }
}
```

### 3. Pre-save Conflict Checking

```typescript
import { usePreSaveConflictCheck } from './conflictDetector';

const MyComponent: React.FC = () => {
  const { checkBeforeSave, hasConflict, conflictInfo } = usePreSaveConflictCheck(
    "list-id", 
    123,
    { blockSave: true } // Will prevent save if conflict detected
  );

  const handleSave = async () => {
    const { canSave, hasConflict } = await checkBeforeSave();
    
    if (!canSave) {
      alert('Cannot save due to conflicts. Please refresh first.');
      return;
    }
    
    // Proceed with save
    await saveData();
  };

  return (
    <button onClick={handleSave} disabled={hasConflict}>
      Save
    </button>
  );
};
```

## Configuration Options

```typescript
interface ConflictDetectionOptions {
  // Detection settings
  checkOnSave: boolean;           // Check for conflicts before save operations
  checkInterval?: number;         // Polling interval in milliseconds (optional)
  
  // UI behavior
  showNotification: boolean;      // Show notification bars/dialogs
  blockSave: boolean;            // Prevent saves when conflicts detected
  logConflicts: boolean;         // Log conflicts to console
  
  // Customization
  notificationPosition: 'top' | 'bottom' | 'inline';
  customMessage?: string;        // Custom conflict message
  onConflictDetected?: (conflict: ConflictInfo) => void;
  onConflictResolved?: () => void;
}
```

## Preset Configurations

```typescript
import { ConflictDetectionPresets } from './conflictDetector';

// Silent monitoring
const silentOptions = ConflictDetectionPresets.silent;

// Show notifications but don't block
const notifyOptions = ConflictDetectionPresets.notify;

// Block saves on conflicts
const strictOptions = ConflictDetectionPresets.strict;

// Real-time monitoring with 30s polling
const realtimeOptions = ConflictDetectionPresets.realtime;

// Optimized for form customizers
const formOptions = ConflictDetectionPresets.formCustomizer;
```

## UI Components

### ConflictNotificationBar

Simple notification bar for conflicts:

```typescript
<ConflictNotificationBar
  conflictInfo={conflictInfo}
  isChecking={isChecking}
  error={error}
  customMessage="Custom conflict message"
  onRefresh={() => window.location.reload()}
  onOverwrite={() => proceedWithSave()}
  onDismiss={() => dismissNotification()}
/>
```

### ConflictResolutionDialog

Full-featured dialog for conflict resolution:

```typescript
<ConflictResolutionDialog
  isOpen={showDialog}
  conflictInfo={conflictInfo}
  customTitle="Data Conflict Detected"
  showOverwriteOption={true}
  showRefreshOption={true}
  onResolve={(action) => handleAction(action)}
  onDismiss={() => setShowDialog(false)}
/>
```

### ConflictHandler

Combined notification and dialog:

```typescript
<ConflictHandler
  conflictInfo={conflictInfo}
  isChecking={isChecking}
  error={error}
  showDialog={true}          // Show dialog instead of just notification
  showNotification={true}    // Also show notification bar
  onAction={(action) => handleConflictAction(action)}
/>
```

## Core API

### ConflictDetector Class

```typescript
import { ConflictDetector } from './conflictDetector';

const detector = new ConflictDetector(listId, itemId, options);

// Initialize and take snapshot
await detector.initialize();

// Check for conflicts
const result = await detector.checkForConflicts();
if (result.success && result.conflictInfo?.hasConflict) {
  console.log('Conflict detected!');
}

// Update snapshot after save
await detector.updateSnapshot();

// Start/stop polling
detector.startPolling();
detector.stopPolling();

// Cleanup
detector.dispose();
```

## Advanced Usage

### Custom Conflict Detection Logic

```typescript
const detector = new ConflictDetector(listId, itemId, {
  checkOnSave: true,
  onConflictDetected: (conflict) => {
    // Custom logic when conflict is detected
    console.log(`Conflict: ${conflict.lastModifiedBy} modified at ${conflict.lastModified}`);
    
    // Could trigger custom notifications, logging, etc.
    sendToAnalytics('conflict_detected', conflict);
  },
  onConflictResolved: () => {
    console.log('Conflict resolved');
  }
});
```

### Integration with Form Libraries

```typescript
// With Formik
const formik = useFormik({
  initialValues: { /* ... */ },
  onSubmit: async (values) => {
    const { canSave } = await checkBeforeSave();
    if (!canSave) return;
    
    await submitForm(values);
    await updateSnapshot();
  }
});

// With React Hook Form
const { handleSubmit } = useForm();
const onSubmit = handleSubmit(async (data) => {
  const hasConflict = await checkForConflicts();
  if (hasConflict && blockSave) {
    // Handle conflict
    return;
  }
  
  await saveData(data);
  await updateSnapshot();
});
```

### Real-time Monitoring

```typescript
// Enable polling every 30 seconds
const { conflictInfo } = useConflictDetection({
  listId,
  itemId,
  options: {
    checkInterval: 30000,
    onConflictDetected: (conflict) => {
      // Show toast notification
      showToast(`Record modified by ${conflict.lastModifiedBy}`);
    }
  }
});
```

## TypeScript Interfaces

```typescript
interface ConflictInfo {
  hasConflict: boolean;
  originalVersion: string;      // ETag when editing started
  currentVersion: string;       // Current ETag
  lastModifiedBy: string;       // Who modified the record
  lastModified: Date;          // When it was modified
  originalModified: Date;      // When editing session started
  itemId: number;
  listId: string;
}

interface ConflictResolutionAction {
  type: 'refresh' | 'overwrite' | 'cancel';
  message: string;
}
```

## Error Handling

The utility provides comprehensive error handling:

```typescript
const { error, conflictInfo } = useConflictDetection({
  listId,
  itemId,
  options: {
    logConflicts: true  // Enable console logging
  }
});

// Check for errors
if (error) {
  console.error('Conflict detection error:', error);
  // Handle error appropriately
}
```

## Best Practices

### 1. Initialize Early
```typescript
useEffect(() => {
  // Initialize when form loads
  initialize();
}, [listId, itemId]);
```

### 2. Check Before Save
```typescript
const handleSave = async () => {
  // Always check before saving
  const hasConflict = await checkForConflicts();
  if (hasConflict && shouldBlock) return;
  
  await saveData();
  await updateSnapshot(); // Update after successful save
};
```

### 3. Handle Refresh Properly
```typescript
const handleRefresh = () => {
  // Save current form state if needed
  const formData = getCurrentFormData();
  localStorage.setItem('tempFormData', JSON.stringify(formData));
  
  // Refresh page
  window.location.reload();
};
```

### 4. Use Appropriate UI Patterns
```typescript
// For critical data - use dialog
<ConflictHandler showDialog={true} />

// For regular forms - use notification bar
<ConflictNotificationBar />

// For background monitoring - use silent mode
const options = ConflictDetectionPresets.silent;
```

## Troubleshooting

### Common Issues

1. **"Detector not initialized" error**
   - Ensure you call `initialize()` or use the hook properly
   - Check that listId and itemId are valid

2. **PnPjs not configured**
   - Make sure PnPjs is properly set up in your SPFx solution
   - Check SharePoint context is available

3. **Permissions errors**
   - Ensure user has read access to the list item
   - Check if item exists and is accessible

### Debug Mode

Enable detailed logging:

```typescript
const options = {
  logConflicts: true,  // Enable console logging
  checkOnSave: true
};
```

## Dependencies

- `@pnp/sp` - SharePoint API integration
- `@fluentui/react@^8.*` - UI components
- `react` - React framework
- `typescript` - Type definitions

## License

MIT License - Feel free to use in your SPFx projects.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new functionality
4. Submit a pull request

## Changelog

### v1.0.0
- Initial release
- Core conflict detection functionality
- React hooks and context provider
- Fluent UI v8 components
- TypeScript support
- Comprehensive documentation

### v1.1.0 (Enhanced Features)
- ✨ **Soft change detection** with `hasChangedSinceLastCheck()`
- 🎛️ **Granular polling controls** - pause/resume/isActive
- ⚡ **Optimistic updates** - use save response data to avoid extra API calls
- 🔋 **Performance optimizations** - smart polling with Page Visibility API integration
- 📚 **Enhanced documentation** with advanced usage examples
- 🛠️ **Better developer experience** with more control and flexibility
