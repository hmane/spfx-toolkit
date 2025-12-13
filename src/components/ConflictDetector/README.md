# SPFx Conflict Detection Utility

A comprehensive SharePoint Framework (SPFx) utility for detecting and handling concurrent editing conflicts in SharePoint list items. Prevent data loss when multiple users edit the same record simultaneously.

## Features

- 🔍 **Real-time conflict detection** using SharePoint ETags and timestamps
- ⚛️ **Multiple integration patterns** - Hooks, Context Provider, and imperative API
- 🎨 **Fluent UI v8 components** - Ready-to-use notification bars and dialogs
- 🔧 **Flexible configuration** - Silent monitoring, notifications, or strict blocking
- 📦 **Tree-shakable** - Import only what you need for minimal bundle size
- 🧪 **TypeScript support** - Fully typed with comprehensive interfaces
- 📧 **Enhanced conflict info** - Includes modifier's email for better identification

## Installation

```bash
# Install spfx-toolkit (ConflictDetector is included)
npm install spfx-toolkit

# Ensure peer dependencies are installed
npm install @pnp/sp@^3.20.1 @fluentui/react@8.106.4
```

## Prerequisites

**SPContext must be initialized** before using ConflictDetector:

```typescript
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// In your web part's onInit
await SPContext.smart(this.context, 'MyWebPart');
```

## Quick Start

### 1. Hook-based Approach (Function Components)

```typescript
import {
  useConflictDetection,
  ConflictNotificationBar
} from 'spfx-toolkit/lib/components/ConflictDetector';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

const MyFormComponent: React.FC<{ listId: string; itemId: number }> = ({ listId, itemId }) => {
  const { hasConflict, conflictInfo, isChecking, error, checkForConflicts, updateSnapshot } =
    useConflictDetection({
      sp: SPContext.sp,  // Required: PnP SP instance
      listId,
      itemId,
      options: {
        checkOnSave: true,
        showNotification: true,
        blockSave: false,
      },
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
import {
  ConflictDetectionProvider,
  ConflictHandler,
  useConflictContext
} from 'spfx-toolkit/lib/components/ConflictDetector';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Wrap your application
const App: React.FC<{ listId: string; itemId: number }> = ({ listId, itemId }) => (
  <ConflictDetectionProvider
    sp={SPContext.sp}  // Required: PnP SP instance
    listId={listId}
    itemId={itemId}
    options={{
      checkOnSave: true,
      showNotification: true,
      notificationPosition: 'top',
    }}
  >
    <MyFormContent />
  </ConflictDetectionProvider>
);

// Use context in child component
const MyFormContent: React.FC = () => {
  const { checkForConflicts, updateSnapshot, getState } = useConflictContext();
  const state = getState();

  const handleSave = async () => {
    await checkForConflicts();
    // Handle conflicts through UI components

    await saveData();
    await updateSnapshot();
  };

  return (
    <div>
      <ConflictHandler
        conflictInfo={state.conflictInfo}
        isChecking={state.isChecking}
        error={state.error}
        showNotification={true}
        onRefresh={() => window.location.reload()}
        onOverwrite={handleSave}
      />

      {/* Your form content */}
    </div>
  );
};
```

### 3. Pre-save Conflict Checking

```typescript
import { usePreSaveConflictCheck } from 'spfx-toolkit/lib/components/ConflictDetector';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

const MyComponent: React.FC<{ listId: string; itemId: number }> = ({ listId, itemId }) => {
  const { checkBeforeSave, hasConflict, conflictInfo, updateSnapshot } = usePreSaveConflictCheck(
    SPContext.sp,  // Required: PnP SP instance
    listId,
    itemId,
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

    // Update snapshot after successful save
    await updateSnapshot();
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
  checkOnSave: boolean; // Check for conflicts before save operations
  checkInterval?: number; // Polling interval in milliseconds (optional)

  // UI behavior
  showNotification: boolean; // Show notification bars/dialogs
  blockSave: boolean; // Prevent saves when conflicts detected
  logConflicts: boolean; // Log conflicts to console

  // Customization
  notificationPosition: 'top' | 'bottom' | 'inline';
  customMessage?: string; // Custom conflict message
  onConflictDetected?: (conflict: ConflictInfo) => void;
  onConflictResolved?: () => void;
}
```

## Preset Configurations

```typescript
import { CONFLICT_DETECTION_PRESETS } from 'spfx-toolkit/lib/components/ConflictDetector';

// Silent monitoring - logs conflicts but no UI
const silentOptions = CONFLICT_DETECTION_PRESETS.silent;

// Show notifications but don't block saves
const notifyOptions = CONFLICT_DETECTION_PRESETS.notify;

// Strict mode - block saves on conflicts
const strictOptions = CONFLICT_DETECTION_PRESETS.strict;

// Real-time monitoring with 30s polling
const realtimeOptions = CONFLICT_DETECTION_PRESETS.realtime;

// Optimized for form customizers (inline notifications)
const formOptions = CONFLICT_DETECTION_PRESETS.formCustomizer;
```

## UI Components

### ConflictNotificationBar

Simple notification bar for conflicts:

```typescript
<ConflictNotificationBar
  conflictInfo={conflictInfo}
  isChecking={isChecking}
  error={error}
  customMessage='Custom conflict message'
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
  customTitle='Data Conflict Detected'
  showOverwriteOption={true}
  showRefreshOption={true}
  onResolve={action => handleAction(action)}
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
  showDialog={true} // Show dialog instead of just notification
  showNotification={true} // Also show notification bar
  onAction={action => handleConflictAction(action)}
/>
```

## Core API

### ConflictDetector Class

```typescript
import { ConflictDetector } from 'spfx-toolkit/lib/components/ConflictDetector';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// Create detector with SP instance
const detector = new ConflictDetector(
  SPContext.sp,  // Required: PnP SP instance
  listId,
  itemId,
  options
);

// Initialize and take snapshot
await detector.initialize();

// Check for conflicts
const result = await detector.checkForConflicts();
if (result.success && result.conflictInfo?.hasConflict) {
  console.log('Conflict detected!');
  console.log('Modified by:', result.conflictInfo.lastModifiedBy);
  console.log('Email:', result.conflictInfo.lastModifiedByEmail);
}

// Update snapshot after save
await detector.updateSnapshot();

// Polling control
detector.startPolling();
detector.pausePolling();   // Temporarily pause
detector.resumePolling();  // Resume polling
detector.stopPolling();    // Stop completely

// Check polling status
const isActive = detector.isPollingActive();

// Cleanup when done
detector.dispose();
```

## Advanced Usage

### Custom Conflict Detection Logic

```typescript
const detector = new ConflictDetector(listId, itemId, {
  checkOnSave: true,
  onConflictDetected: conflict => {
    // Custom logic when conflict is detected
    console.log(`Conflict: ${conflict.lastModifiedBy} modified at ${conflict.lastModified}`);

    // Could trigger custom notifications, logging, etc.
    sendToAnalytics('conflict_detected', conflict);
  },
  onConflictResolved: () => {
    console.log('Conflict resolved');
  },
});
```

### Integration with Form Libraries

```typescript
// With Formik
const formik = useFormik({
  initialValues: {
    /* ... */
  },
  onSubmit: async values => {
    const { canSave } = await checkBeforeSave();
    if (!canSave) return;

    await submitForm(values);
    await updateSnapshot();
  },
});

// With React Hook Form
const { handleSubmit } = useForm();
const onSubmit = handleSubmit(async data => {
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
    onConflictDetected: conflict => {
      // Show toast notification
      showToast(`Record modified by ${conflict.lastModifiedBy}`);
    },
  },
});
```

## TypeScript Interfaces

```typescript
interface ConflictInfo {
  hasConflict: boolean;
  originalVersion: string;    // ETag when editing started
  currentVersion: string;     // Current ETag
  lastModifiedBy: string;     // Display name of who modified the record
  lastModifiedByEmail?: string; // Email of who modified the record (NEW)
  lastModified: Date;         // When it was modified
  originalModified: Date;     // When editing session started
  itemId: number;
  listId: string;
}

interface ConflictResolutionAction {
  type: 'refresh' | 'overwrite' | 'cancel';
  message: string;
}

interface ConflictDetectionOptions {
  checkOnSave: boolean;           // Check before save operations
  checkInterval?: number;         // Polling interval in ms (5000-300000)
  showNotification: boolean;      // Show UI notifications
  blockSave: boolean;             // Prevent saves on conflict
  logConflicts: boolean;          // Log to console
  notificationPosition: 'top' | 'bottom' | 'inline';
  customMessage?: string;
  onConflictDetected?: (conflict: ConflictInfo) => void;
  onConflictResolved?: () => void;
}
```

## Error Handling

The utility provides comprehensive error handling:

```typescript
const { error, conflictInfo } = useConflictDetection({
  listId,
  itemId,
  options: {
    logConflicts: true, // Enable console logging
  },
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
  logConflicts: true, // Enable console logging
  checkOnSave: true,
};
```

## Available Hooks

| Hook | Purpose | Use Case |
|------|---------|----------|
| `useConflictDetection` | Full-featured conflict detection | Forms with manual control |
| `usePreSaveConflictCheck` | Pre-save validation | Simple save blocking |
| `useConflictMonitor` | Lightweight background monitoring | Dashboard monitoring |
| `useFormConflictDetection` | Form-optimized with validation | React Hook Form integration |

## Available Components

| Component | Purpose |
|-----------|---------|
| `ConflictNotificationBar` | Inline notification bar |
| `ConflictNotification` | Enhanced notification with auto-hide |
| `ConflictResolutionDialog` | Modal dialog for resolution |
| `EnhancedConflictResolutionDialog` | Dialog with confirmation |
| `ConflictHandler` | Combined notification + dialog |
| `ConflictToast` | Toast-style notification |
| `SimpleConflictNotification` | Minimal notification |

## Dependencies

- `@pnp/sp@^3.20.1` - SharePoint API integration
- `@fluentui/react@8.106.4` - UI components (tree-shakable imports)
- `react@^17.0.1` - React framework
- `typescript@^4.7` - Type definitions

## Bundle Size

- **Full import**: ~100-150KB
- **Lazy import**: ~3KB wrapper (loads on demand)

```typescript
// For optimal bundle size, use lazy loading
import { LazyConflictDetector } from 'spfx-toolkit/lib/components/lazy';
```
