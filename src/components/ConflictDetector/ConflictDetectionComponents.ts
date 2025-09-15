// =====================================================================================
// Conflict Detection Components - Component Combination Helpers
// This file provides helper functions to get the right components for different scenarios
// without directly exporting complex component types that cause TypeScript errors
// =====================================================================================

// =====================================================================================
// Component Combination Maps (as strings to avoid type issues)
// =====================================================================================

export const ComponentCombinations = {
  withNotificationBar: [
    'useConflictDetection',
    'ConflictNotificationBar',
    'SimpleConflictNotification',
  ],
  withDialog: ['useConflictDetection', 'ConflictResolutionDialog', 'useConflictResolutionDialog'],
  withProvider: ['ConflictDetectionProvider', 'useConflictContext', 'withConflictDetection'],
  complete: [
    'ConflictDetectionProvider',
    'useConflictDetection',
    'ConflictHandler',
    'ConflictNotificationBar',
    'ConflictResolutionDialog',
  ],
  forForms: ['useFormConflictDetection', 'ConflictHandler', 'ConflictNotificationBar'],
  monitoring: ['useConflictMonitor', 'ConflictToast', 'SimpleConflictNotification'],
} as const;

// =====================================================================================
// Helper Functions
// =====================================================================================

/**
 * Get component names for a specific scenario
 * @param scenario - The use case scenario
 * @returns Array of component names needed for the scenario
 */
export const getComponentsForScenario = (scenario: string): readonly string[] => {
  switch (scenario.toLowerCase()) {
    case 'simple':
    case 'basic':
    case 'notification':
      return ComponentCombinations.withNotificationBar;

    case 'dialog':
    case 'modal':
    case 'advanced':
      return ComponentCombinations.withDialog;

    case 'provider':
    case 'context':
    case 'class':
      return ComponentCombinations.withProvider;

    case 'form':
    case 'forms':
    case 'validation':
      return ComponentCombinations.forForms;

    case 'monitor':
    case 'monitoring':
    case 'background':
    case 'lightweight':
      return ComponentCombinations.monitoring;

    case 'complete':
    case 'full':
    case 'everything':
    default:
      return ComponentCombinations.complete;
  }
};

// =====================================================================================
// Quick Start Templates
// =====================================================================================

export const ConflictDetectionTemplates = {
  basicHook: `
import { useConflictDetection, ConflictNotificationBar } from './conflictDetector';
import { getSP } from '../pnpjsConfig';

const MyComponent = () => {
  const sp = getSP();
  const {
    conflictInfo,
    isChecking,
    error,
    checkForConflicts,
    updateSnapshot
  } = useConflictDetection({
    sp,
    listId: "your-list-id",
    itemId: 123,
    options: { checkInterval: 30000 }
  });

  const handleSave = async () => {
    const hasConflict = await checkForConflicts();
    if (hasConflict) return;

    await saveData();
    await updateSnapshot();
  };

  return (
    <>
      <ConflictNotificationBar
        conflictInfo={conflictInfo}
        isChecking={isChecking}
        error={error}
        onRefresh={() => window.location.reload()}
        onOverwrite={handleSave}
      />
      <button onClick={handleSave}>Save</button>
    </>
  );
};
  `,

  withProvider: `
import { ConflictDetectionProvider, ConflictHandler } from './conflictDetector';
import { getSP } from '../pnpjsConfig';

const App = () => {
  const sp = getSP();

  return (
    <ConflictDetectionProvider
      sp={sp}
      listId="your-list-id"
      itemId={123}
      options={{ checkInterval: 30000 }}
    >
      <MyFormComponent />
    </ConflictDetectionProvider>
  );
};

const MyFormComponent = () => {
  return (
    <>
      <ConflictHandler
        showDialog={true}
        showNotification={true}
        onRefresh={() => window.location.reload()}
      />
    </>
  );
};
  `,

  formIntegration: `
import { useFormConflictDetection } from './conflictDetector';
import { getSP } from '../pnpjsConfig';

const MyForm = () => {
  const sp = getSP();
  const { validateBeforeSave, handleSuccessfulSave } =
    useFormConflictDetection(sp, "list-id", 123, { blockSave: true });

  const handleSubmit = async (formData) => {
    const { isValid, message } = await validateBeforeSave();
    if (!isValid) {
      alert(message);
      return;
    }

    await saveForm(formData);
    await handleSuccessfulSave();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="title" />
      <button type="submit">Save</button>
    </form>
  );
};
  `,

  monitoring: `
import { useConflictMonitor, ConflictToast } from './conflictDetector';
import { getSP } from '../pnpjsConfig';

const MyComponent = () => {
  const sp = getSP();
  const { hasConflict, conflictInfo } = useConflictMonitor(sp, "list-id", 123, 30000);

  return (
    <>
      <ConflictToast conflictInfo={conflictInfo} duration={8000} />
      {hasConflict && <div>Record modified by another user!</div>}
    </>
  );
};
  `,
} as const;

/**
 * Get template code for a specific scenario
 * @param scenario - The use case scenario
 * @returns Template code as string
 */
export const getTemplateForScenario = (scenario: string): string => {
  switch (scenario.toLowerCase()) {
    case 'hook':
    case 'basic':
    case 'simple':
      return ConflictDetectionTemplates.basicHook;

    case 'provider':
    case 'context':
    case 'class':
      return ConflictDetectionTemplates.withProvider;

    case 'form':
    case 'forms':
    case 'validation':
      return ConflictDetectionTemplates.formIntegration;

    case 'monitor':
    case 'monitoring':
    case 'lightweight':
      return ConflictDetectionTemplates.monitoring;

    default:
      return ConflictDetectionTemplates.basicHook;
  }
};

// =====================================================================================
// Usage Documentation
// =====================================================================================

export const UsageGuide = {
  scenarios: {
    basic: 'Simple notification-based conflict handling for function components',
    provider: 'Context-based approach for class components or large applications',
    form: 'Form validation integration with conflict checking',
    monitoring: 'Lightweight background monitoring with minimal UI',
    complete: 'Full-featured solution with all components',
  },

  gettingStarted: `
// 1. Choose your scenario
import { getComponentsForScenario, getTemplateForScenario } from './conflictDetector';

// 2. Get the components you need
const components = getComponentsForScenario('basic');
console.log(components); // ['useConflictDetection', 'ConflictNotificationBar', ...]

// 3. Get template code
const template = getTemplateForScenario('basic');
console.log(template); // Copy-paste ready code

// 4. Import the actual components
import { useConflictDetection, ConflictNotificationBar } from './conflictDetector';
  `,

  commonPatterns: [
    'Use "basic" for simple notifications',
    'Use "provider" for class components',
    'Use "form" for form validation',
    'Use "monitoring" for background checks',
    'Use "complete" for full functionality',
  ],
} as const;
