# SPBooleanField Component 

A comprehensive boolean field component that mirrors SharePoint's Yes/No fields. Supports checkbox and toggle switch display modes with customizable text labels and DevExtreme UI integration.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props](#props)
- [Display Types](#display-types)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

-  **Multiple Display Types** - Checkbox or toggle switch
- <¨ **Custom Labels** - Customizable Yes/No text
- =Ý **Text Display** - Show Yes/No text alongside control
- <£ **React Hook Form** - Native integration with validation
- <¨ **DevExtreme UI** - Consistent styling with spForm system
-  **Validation** - Built-in validation with custom rules
- = **Access Control** - Read-only and disabled states
- =æ **Tree-Shakable** - Import only what you need
- <¯ **TypeScript** - Full type safety

---

## Installation

```bash
npm install spfx-toolkit
```

---

## Quick Start

### With React Hook Form

```typescript
import { SPBooleanField, SPBooleanDisplayType } from 'spfx-toolkit/lib/components/spFields/SPBooleanField';
import { useForm } from 'react-hook-form';

function MyForm() {
  const { control } = useForm();

  return (
    <>
      {/* Standard checkbox */}
      <SPBooleanField
        name="isActive"
        label="Active"
        control={control}
      />

      {/* Toggle switch with text */}
      <SPBooleanField
        name="enabled"
        label="Enabled"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        checkedText="On"
        uncheckedText="Off"
      />

      {/* Required checkbox */}
      <SPBooleanField
        name="agreeToTerms"
        label="I agree to the terms and conditions"
        control={control}
        rules={{
          required: 'You must agree to the terms',
          validate: (value) => value === true || 'You must agree to continue'
        }}
      />
    </>
  );
}
```

### Standalone (Without Form)

```typescript
import { SPBooleanField, SPBooleanDisplayType } from 'spfx-toolkit/lib/components/spFields/SPBooleanField';

function MyComponent() {
  const [isEnabled, setIsEnabled] = React.useState(false);

  return (
    <SPBooleanField
      label="Enable Notifications"
      value={isEnabled}
      onChange={setIsEnabled}
      displayType={SPBooleanDisplayType.Toggle}
      showText
    />
  );
}
```

---

## Props

### Base Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Field label text |
| `description` | `string` | - | Help text below the field |
| `required` | `boolean` | `false` | Mark field as required |
| `disabled` | `boolean` | `false` | Disable the field |
| `readOnly` | `boolean` | `false` | Make field read-only |
| `errorMessage` | `string` | - | Custom error message |
| `className` | `string` | - | CSS class for wrapper |
| `width` | `string \| number` | - | Field width |

### Form Integration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Field name for form |
| `control` | `Control` | - | React Hook Form control |
| `rules` | `RegisterOptions` | - | Validation rules |

### Standalone Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `boolean` | - | Controlled value |
| `defaultValue` | `boolean` | - | Initial value |
| `onChange` | `(value: boolean) => void` | - | Change handler |
| `onBlur` | `() => void` | - | Blur handler |
| `onFocus` | `() => void` | - | Focus handler |

### Boolean Field Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `displayType` | `SPBooleanDisplayType` | `Checkbox` | Display mode (checkbox or toggle) |
| `checkedText` | `string` | `'Yes'` | Text when checked |
| `uncheckedText` | `string` | `'No'` | Text when unchecked |
| `showText` | `boolean` | `false` | Show text labels |

---

## Display Types

### Checkbox (Default)

Standard checkbox control.

```typescript
<SPBooleanField
  name="isCompleted"
  label="Task Completed"
  control={control}
  displayType={SPBooleanDisplayType.Checkbox}
/>
```

**Use cases:** Single options, agreements, feature flags, status indicators

---

### Toggle Switch

Toggle switch control for on/off states.

```typescript
<SPBooleanField
  name="notifications"
  label="Enable Notifications"
  control={control}
  displayType={SPBooleanDisplayType.Toggle}
  showText
  checkedText="On"
  uncheckedText="Off"
/>
```

**Use cases:** Settings, enable/disable features, on/off states

---

## Usage Patterns

### Pattern 1: Simple Checkbox

```typescript
<SPBooleanField
  name="isActive"
  label="Active"
  control={control}
/>
```

---

### Pattern 2: Required Agreement Checkbox

```typescript
<SPBooleanField
  name="acceptTerms"
  label="I accept the terms and conditions"
  control={control}
  rules={{
    required: 'You must accept the terms',
    validate: (value) => value === true || 'Agreement is required to proceed'
  }}
/>
```

---

### Pattern 3: Toggle with Custom Text

```typescript
<SPBooleanField
  name="autoSave"
  label="Auto Save"
  control={control}
  displayType={SPBooleanDisplayType.Toggle}
  showText
  checkedText="Enabled"
  uncheckedText="Disabled"
  description="Automatically save changes as you work"
/>
```

---

### Pattern 4: Feature Flag

```typescript
<SPBooleanField
  name="betaFeatures"
  label="Enable Beta Features"
  control={control}
  displayType={SPBooleanDisplayType.Toggle}
  showText
  description="Access experimental features (may be unstable)"
/>
```

---

### Pattern 5: Confirmation Checkbox

```typescript
<SPBooleanField
  name="confirmDelete"
  label="I understand this action cannot be undone"
  control={control}
  rules={{
    validate: (value) => value === true || 'Please confirm before proceeding'
  }}
/>
```

---

### Pattern 6: Multiple Related Checkboxes

```typescript
<SPBooleanField
  name="emailNotifications"
  label="Email Notifications"
  control={control}
  displayType={SPBooleanDisplayType.Toggle}
  showText
/>

<SPBooleanField
  name="smsNotifications"
  label="SMS Notifications"
  control={control}
  displayType={SPBooleanDisplayType.Toggle}
  showText
/>

<SPBooleanField
  name="pushNotifications"
  label="Push Notifications"
  control={control}
  displayType={SPBooleanDisplayType.Toggle}
  showText
/>
```

---

### Pattern 7: Conditional Required Validation

```typescript
function MyForm() {
  const { control, watch } = useForm();
  const requiresApproval = watch('requiresApproval');

  return (
    <>
      <SPBooleanField
        name="requiresApproval"
        label="Requires Approval"
        control={control}
      />

      <SPBooleanField
        name="approved"
        label="Approved"
        control={control}
        rules={{
          validate: (value) => {
            if (requiresApproval && !value) {
              return 'Approval is required';
            }
            return true;
          }
        }}
      />
    </>
  );
}
```

---

## Complete Examples

### Example 1: User Settings Form

```typescript
import { SPBooleanField, SPBooleanDisplayType } from 'spfx-toolkit/lib/components/spFields/SPBooleanField';
import { useForm } from 'react-hook-form';
import { PrimaryButton } from '@fluentui/react/lib/Button';

interface IUserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
  darkMode: boolean;
  autoSave: boolean;
}

function UserSettingsForm() {
  const { control, handleSubmit } = useForm<IUserSettings>({
    defaultValues: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyDigest: true,
      marketingEmails: false,
      darkMode: false,
      autoSave: true
    }
  });

  const onSubmit = async (data: IUserSettings) => {
    console.log('Settings:', data);
    // Save to SharePoint
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h3>Notification Preferences</h3>

      <SPBooleanField
        name="emailNotifications"
        label="Email Notifications"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        description="Receive notifications via email"
      />

      <SPBooleanField
        name="pushNotifications"
        label="Push Notifications"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        description="Receive push notifications on your devices"
      />

      <SPBooleanField
        name="weeklyDigest"
        label="Weekly Digest"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        description="Receive a weekly summary of activity"
      />

      <SPBooleanField
        name="marketingEmails"
        label="Marketing Emails"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        description="Receive promotional content and updates"
      />

      <h3>Application Settings</h3>

      <SPBooleanField
        name="darkMode"
        label="Dark Mode"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        checkedText="On"
        uncheckedText="Off"
        description="Use dark color scheme"
      />

      <SPBooleanField
        name="autoSave"
        label="Auto Save"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        checkedText="Enabled"
        uncheckedText="Disabled"
        description="Automatically save changes"
      />

      <PrimaryButton type="submit" text="Save Settings" />
    </form>
  );
}
```

---

### Example 2: Project Configuration with Validation

```typescript
import { SPBooleanField, SPBooleanDisplayType } from 'spfx-toolkit/lib/components/spFields/SPBooleanField';
import { useForm } from 'react-hook-form';

interface IProjectConfig {
  isActive: boolean;
  requiresApproval: boolean;
  notifyStakeholders: boolean;
  trackTime: boolean;
  billable: boolean;
  confidential: boolean;
  agreeToTerms: boolean;
}

function ProjectConfigForm() {
  const { control, handleSubmit, watch } = useForm<IProjectConfig>();
  const requiresApproval = watch('requiresApproval');
  const billable = watch('billable');

  const onSubmit = async (data: IProjectConfig) => {
    console.log('Project config:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h3>Project Status</h3>

      <SPBooleanField
        name="isActive"
        label="Active Project"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        description="Mark project as active"
      />

      <h3>Workflow Settings</h3>

      <SPBooleanField
        name="requiresApproval"
        label="Requires Approval"
        control={control}
        description="All changes require manager approval"
      />

      <SPBooleanField
        name="notifyStakeholders"
        label="Notify Stakeholders"
        control={control}
        description="Send notifications to project stakeholders"
        rules={{
          validate: (value) => {
            if (requiresApproval && !value) {
              return 'Stakeholder notification required when approval is enabled';
            }
            return true;
          }
        }}
      />

      <h3>Billing Settings</h3>

      <SPBooleanField
        name="trackTime"
        label="Track Time"
        control={control}
        description="Enable time tracking for this project"
      />

      <SPBooleanField
        name="billable"
        label="Billable"
        control={control}
        description="Project is billable to client"
      />

      <h3>Security</h3>

      <SPBooleanField
        name="confidential"
        label="Confidential"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        description="Mark project as confidential"
      />

      <h3>Agreement</h3>

      <SPBooleanField
        name="agreeToTerms"
        label="I confirm that all project details are accurate"
        control={control}
        rules={{
          required: 'You must confirm project details',
          validate: (value) => value === true || 'Confirmation is required'
        }}
      />

      <PrimaryButton type="submit" text="Save Configuration" />
    </form>
  );
}
```

---

### Example 3: Feature Toggles Dashboard

```typescript
import { SPBooleanField, SPBooleanDisplayType } from 'spfx-toolkit/lib/components/spFields/SPBooleanField';
import { useForm } from 'react-hook-form';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

interface IFeatureFlags {
  newDashboard: boolean;
  advancedReporting: boolean;
  apiV2: boolean;
  betaFeatures: boolean;
  experimentalUI: boolean;
  debugMode: boolean;
}

function FeatureTogglesForm() {
  const { control, handleSubmit, watch } = useForm<IFeatureFlags>({
    defaultValues: {
      newDashboard: false,
      advancedReporting: false,
      apiV2: false,
      betaFeatures: false,
      experimentalUI: false,
      debugMode: false
    }
  });

  const betaFeatures = watch('betaFeatures');
  const debugMode = watch('debugMode');

  const onSubmit = async (data: IFeatureFlags) => {
    console.log('Feature flags:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2>Feature Toggles</h2>

      {betaFeatures && (
        <MessageBar messageBarType={MessageBarType.warning}>
          Beta features are enabled. Some features may be unstable.
        </MessageBar>
      )}

      {debugMode && (
        <MessageBar messageBarType={MessageBarType.severeWarning}>
          Debug mode is ON. Disable before deploying to production.
        </MessageBar>
      )}

      <h3>Stable Features</h3>

      <SPBooleanField
        name="newDashboard"
        label="New Dashboard"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        checkedText="Enabled"
        uncheckedText="Disabled"
        description="Enable the redesigned dashboard experience"
      />

      <SPBooleanField
        name="advancedReporting"
        label="Advanced Reporting"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        checkedText="Enabled"
        uncheckedText="Disabled"
        description="Enable advanced analytics and reporting features"
      />

      <SPBooleanField
        name="apiV2"
        label="API Version 2"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        checkedText="Enabled"
        uncheckedText="Disabled"
        description="Use the new API version (recommended)"
      />

      <h3>Beta Features</h3>

      <SPBooleanField
        name="betaFeatures"
        label="Enable Beta Features"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        checkedText="Enabled"
        uncheckedText="Disabled"
        description="Access beta features (may contain bugs)"
      />

      <SPBooleanField
        name="experimentalUI"
        label="Experimental UI"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        checkedText="Enabled"
        uncheckedText="Disabled"
        disabled={!betaFeatures}
        description="Requires beta features to be enabled"
      />

      <h3>Development</h3>

      <SPBooleanField
        name="debugMode"
        label="Debug Mode"
        control={control}
        displayType={SPBooleanDisplayType.Toggle}
        showText
        checkedText="ON"
        uncheckedText="OFF"
        description="Enable verbose logging and debug tools"
      />

      <PrimaryButton type="submit" text="Save Feature Flags" />
    </form>
  );
}
```

---

## Best Practices

### 1. Always Use Labels

```typescript
// L BAD: No label
<SPBooleanField name="field1" control={control} />

//  GOOD: Clear label
<SPBooleanField
  name="isActive"
  label="Active"
  control={control}
/>
```

---

### 2. Choose Appropriate Display Type

```typescript
//  GOOD: Checkbox for agreements
<SPBooleanField
  name="acceptTerms"
  label="I accept the terms and conditions"
  control={control}
  displayType={SPBooleanDisplayType.Checkbox}
/>

//  GOOD: Toggle for settings
<SPBooleanField
  name="notifications"
  label="Notifications"
  control={control}
  displayType={SPBooleanDisplayType.Toggle}
  showText
/>
```

---

### 3. Use Custom Text for Clarity

```typescript
//  GOOD: Custom text for toggle
<SPBooleanField
  name="autoSave"
  label="Auto Save"
  control={control}
  displayType={SPBooleanDisplayType.Toggle}
  showText
  checkedText="Enabled"
  uncheckedText="Disabled"
/>

//  GOOD: On/Off for features
<SPBooleanField
  name="darkMode"
  label="Dark Mode"
  control={control}
  displayType={SPBooleanDisplayType.Toggle}
  showText
  checkedText="On"
  uncheckedText="Off"
/>
```

---

### 4. Validate Required Agreements

```typescript
//  GOOD: Require checkbox to be checked
<SPBooleanField
  name="agreeToTerms"
  label="I agree to the terms and conditions"
  control={control}
  rules={{
    required: 'You must agree to continue',
    validate: (value) => value === true || 'Agreement is required'
  }}
/>
```

---

### 5. Provide Helpful Descriptions

```typescript
//  GOOD: Clear guidance
<SPBooleanField
  name="betaFeatures"
  label="Enable Beta Features"
  control={control}
  displayType={SPBooleanDisplayType.Toggle}
  showText
  description="Access experimental features (may be unstable)"
/>
```

---

### 6. Group Related Checkboxes

```typescript
//  GOOD: Logical grouping
<div>
  <h3>Notification Preferences</h3>

  <SPBooleanField
    name="emailNotifications"
    label="Email Notifications"
    control={control}
    displayType={SPBooleanDisplayType.Toggle}
    showText
  />

  <SPBooleanField
    name="smsNotifications"
    label="SMS Notifications"
    control={control}
    displayType={SPBooleanDisplayType.Toggle}
    showText
  />

  <SPBooleanField
    name="pushNotifications"
    label="Push Notifications"
    control={control}
    displayType={SPBooleanDisplayType.Toggle}
    showText
  />
</div>
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  SPBooleanField,
  SPBooleanDisplayType,
  ISPBooleanFieldProps
} from 'spfx-toolkit/lib/components/spFields/SPBooleanField';

// All props are fully typed
const props: ISPBooleanFieldProps = {
  name: 'isActive',
  label: 'Active',
  displayType: SPBooleanDisplayType.Toggle,
  showText: true,
  checkedText: 'Yes',
  uncheckedText: 'No'
};

// Display type enum
const displayType: SPBooleanDisplayType = SPBooleanDisplayType.Checkbox;
// Options: Checkbox, Toggle

// Boolean value
const value: boolean = true;
```

---

## Related Components

- **[SPChoiceField](../SPChoiceField/README.md)** - Choice and dropdown fields
- **[SPTextField](../SPTextField/README.md)** - Text input fields
- **[SPNumberField](../SPNumberField/README.md)** - Numeric input fields
- **[SPDateField](../SPDateField/README.md)** - Date and time fields

---

## Tree-Shaking

Always use specific imports for optimal bundle size:

```typescript
//  RECOMMENDED: Specific import
import { SPBooleanField } from 'spfx-toolkit/lib/components/spFields/SPBooleanField';

// L AVOID: Bulk import
import { SPBooleanField } from 'spfx-toolkit';
```

---

## License

Part of [SPFx Toolkit](../../../../README.md) - MIT License

---

**Last Updated:** November 2025
