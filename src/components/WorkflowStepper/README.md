# WorkflowStepper Component

A modern, responsive arrow-style workflow stepper component built with React and Fluent UI. Features horizontal scrolling with animated navigation arrows, multiple display modes, and full accessibility support.

## Features

- **Arrow Design**: Classic arrow-style steps with seamless visual connections
- **Responsive Layout**: Horizontal arrows on desktop, vertical stack on mobile
- **Scrollable Navigation**: Horizontal scrolling with animated hint arrows
- **Multiple Modes**: Full steps with content, progress-only, and compact modes
- **Accessibility**: Full ARIA support, keyboard navigation, and screen reader friendly
- **TypeScript**: Complete TypeScript definitions and type safety
- **Fluent UI Integration**: Built with Fluent UI 8.x components and theming

## Installation

```bash
npm install @fluentui/react
```

## Basic Usage

```tsx
import React from 'react';
import { WorkflowStepper, StepData } from './components/WorkflowStepper';

const steps: StepData[] = [
  {
    id: 'step-1',
    title: 'Request Submitted',
    description1: 'Completed by John Doe',
    description2: 'August 20, 2025',
    status: 'completed',
    content: '<p>Step completed successfully.</p>',
  },
  {
    id: 'step-2',
    title: 'Manager Review',
    description1: 'Currently with Jane Smith',
    description2: 'In progress',
    status: 'current',
    content: '<p>Step is currently being reviewed.</p>',
  },
  {
    id: 'step-3',
    title: 'Final Approval',
    description1: 'Pending',
    description2: 'Awaiting previous step',
    status: 'pending',
  },
];

export const MyWorkflow = () => {
  const [selectedStepId, setSelectedStepId] = useState('step-1');

  return (
    <WorkflowStepper
      steps={steps}
      mode='fullSteps'
      selectedStepId={selectedStepId}
      onStepClick={step => setSelectedStepId(step.id)}
    />
  );
};
```

## Display Modes

### Full Steps Mode

Complete workflow stepper with content area displaying step details.

```tsx
<WorkflowStepper
  steps={steps}
  mode='fullSteps'
  selectedStepId={selectedStepId}
  onStepClick={handleStepClick}
/>
```

### Progress Mode

Shows only the step progress without content area.

```tsx
<WorkflowStepper steps={steps} mode='progress' minStepWidth={120} />
```

### Compact Mode

Ultra-tight spacing perfect for dashboards and headers.

```tsx
<WorkflowStepper steps={steps} mode='compact' minStepWidth={100} />
```

## Step Data Structure

```tsx
interface StepData {
  id: string; // Unique identifier (required)
  title: string; // Step title (required)
  description1?: string; // Primary description (optional)
  description2?: string; // Secondary description (optional)
  status: StepStatus; // Step status (required)
  content?: string | React.ReactNode; // Step content (optional)
  isClickable?: boolean; // Override clickability (optional)
}

type StepStatus = 'completed' | 'current' | 'pending' | 'warning' | 'error' | 'blocked';
```

## Step Status Types

| Status      | Description                | Clickable | Visual Style          |
| ----------- | -------------------------- | --------- | --------------------- |
| `completed` | Step finished successfully | Yes       | Green background      |
| `current`   | Step currently in progress | Yes       | Blue/theme background |
| `pending`   | Step waiting to start      | No\*      | Gray background       |
| `warning`   | Step needs attention       | Yes       | Orange background     |
| `error`     | Step has errors            | Yes       | Red background        |
| `blocked`   | Step is blocked            | No\*      | Orange background     |

\*Can be overridden with `isClickable` property

## Props

### WorkflowStepperProps

| Prop                | Type                                     | Default       | Description                      |
| ------------------- | ---------------------------------------- | ------------- | -------------------------------- |
| `steps`             | `StepData[]`                             | -             | Array of step data (required)    |
| `mode`              | `'fullSteps' \| 'progress' \| 'compact'` | `'fullSteps'` | Display mode                     |
| `selectedStepId`    | `string`                                 | -             | ID of selected step (controlled) |
| `onStepClick`       | `(step: StepData) => void`               | -             | Step click handler               |
| `minStepWidth`      | `number`                                 | `160`         | Minimum width per step in pixels |
| `descriptionStyles` | `StepDescriptionStyles`                  | -             | Custom styles for descriptions   |
| `className`         | `string`                                 | -             | Additional CSS class             |
| `showScrollHint`    | `boolean`                                | `true`        | Show scroll hint arrows          |

### StepDescriptionStyles

```tsx
interface StepDescriptionStyles {
  description1?: React.CSSProperties;
  description2?: React.CSSProperties;
}
```

## Scrolling and Navigation

### Automatic Scrolling

The component automatically shows scroll arrows when content overflows:

- **Hover activation**: Arrows appear with subtle animation on stepper hover
- **Click to scroll**: Click arrows to scroll by one step width
- **Smooth scrolling**: Uses CSS `scroll-behavior: smooth` for animations
- **Mobile responsive**: Arrows hidden on mobile, native touch scrolling enabled

### Keyboard Navigation

- **Arrow Keys**: Navigate between clickable steps
- **Home/End**: Jump to first/last clickable step
- **Tab**: Focus management for accessibility
- **Enter/Space**: Activate focused step

## Accessibility Features

### ARIA Support

- Proper roles (`application`, `region`, `tablist`, `button`)
- Descriptive labels and live regions
- Current step indication
- Progress announcements

### Screen Reader Support

- Step status descriptions
- Progress percentage announcements
- Navigation instructions
- Content change notifications

### Keyboard Support

- Full keyboard navigation
- Focus indicators
- Skip navigation patterns

## Styling and Theming

The component uses Fluent UI theming and can be customized through:

### Theme Integration

```tsx
import { ThemeProvider } from '@fluentui/react';

<ThemeProvider theme={customTheme}>
  <WorkflowStepper steps={steps} />
</ThemeProvider>;
```

### Custom Description Styles

```tsx
const customStyles: StepDescriptionStyles = {
  description1: {
    fontWeight: 600,
    color: theme.palette.themePrimary,
  },
  description2: {
    fontStyle: 'italic',
    fontSize: '11px',
  },
};

<WorkflowStepper steps={steps} descriptionStyles={customStyles} />;
```

## Advanced Examples

### React Component Content

```tsx
const CustomStepContent = ({ data }) => (
  <div>
    <h4>Custom React Component</h4>
    <button onClick={() => alert('Action triggered')}>Take Action</button>
  </div>
);

const steps: StepData[] = [
  {
    id: 'interactive-step',
    title: 'Interactive Step',
    status: 'current',
    content: <CustomStepContent data={someData} />,
  },
];
```

### Dynamic Step Updates

```tsx
const [steps, setSteps] = useState(initialSteps);

const updateStepStatus = (stepId: string, newStatus: StepStatus) => {
  setSteps(prev => prev.map(step => (step.id === stepId ? { ...step, status: newStatus } : step)));
};
```

### Integration with Forms

```tsx
const FormWorkflow = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});

  const steps = [
    {
      id: 'personal-info',
      title: 'Personal Information',
      status: currentStep > 0 ? 'completed' : 'current',
      content: <PersonalInfoForm data={formData} onChange={setFormData} />,
    },
    // ... more form steps
  ];

  return (
    <WorkflowStepper steps={steps} mode='fullSteps' onStepClick={step => navigateToStep(step)} />
  );
};
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- **Virtualization**: Not needed for typical use (< 50 steps)
- **Memoization**: Step rendering is optimized with React.memo patterns
- **Smooth scrolling**: Uses CSS animations for optimal performance
- **Responsive images**: Icons scale appropriately

## Troubleshooting

### Scrollbar Not Visible

Ensure container has sufficient width constraints:

```tsx
<div style={{ maxWidth: '800px' }}>
  <WorkflowStepper steps={manySteps} />
</div>
```

### Steps Not Clickable

Check step status and `isClickable` override:

```tsx
// Force clickability
{ id: 'step', status: 'pending', isClickable: true }
```

### Mobile Layout Issues

The component automatically handles mobile responsive design. For custom responsive behavior:

```css
@media (max-width: 768px) {
  .custom-stepper-container {
    padding: 0;
  }
}
```

## Contributing

1. Follow TypeScript strict mode
2. Include unit tests for new features
3. Update documentation for API changes
4. Test accessibility with screen readers
5. Verify mobile responsive behavior

## License

MIT License - see LICENSE file for details.

## Related Components

- `ContentArea` - Step content display component
- `StepItem` - Individual step rendering component
- `utils` - Utility functions for step management
