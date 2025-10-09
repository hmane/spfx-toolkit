# SPFx Toolkit 🚀

> **Production-ready components, hooks, and utilities for SharePoint Framework (SPFx) >= 1.21.1**

A comprehensive toolkit designed to accelerate SPFx development with reusable, tree-shakable components and utilities. Built with TypeScript, React, and modern SPFx best practices.

## ✨ Features

- 🎯 **Tree-Shakable Architecture** - Import only what you need for minimal bundle size
- 🔧 **SPFx Optimized** - Built specifically for SharePoint Framework applications
- 📦 **Zero External Dependencies** - Only requires SPFx peer dependencies
- 🎨 **Fluent UI Integration** - Consistent with SharePoint theming
- ♿ **Accessibility First** - WCAG 2.1 AA compliant components
- 📱 **Mobile Responsive** - Works seamlessly across all devices
- 🔒 **TypeScript Strict** - Complete type safety and IntelliSense support
- ⚡ **Performance Optimized** - Smart caching and lazy loading

## 🚀 Quick Start

### Installation

```bash
npm install spfx-toolkit
```

### Tree-Shakable Imports (Recommended)

```typescript
// Import only what you need for minimal bundle size
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';
```

### Direct Path Imports

```typescript
// Multiple items from same category
import { Card } from 'spfx-toolkit/lib/components/Card';
import { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';
import { useLocalStorage, useViewport } from 'spfx-toolkit/lib/hooks';
```

### Simple Example

```typescript
import React from 'react';
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';

const MyWebPart: React.FC = () => {
  const [data, setData] = useLocalStorage('my-data', {});

  return (
    <Card title="My Dashboard" allowExpand>
      <p>Welcome to SPFx Toolkit!</p>
    </Card>
  );
};
```

## 📦 What's Included

### 🎨 UI Components

| Component | Description |
|-----------|-------------|
| [**Card System**](./src/components/Card/README.md) | Expandable cards with animations, persistence, and accessibility |
| [**WorkflowStepper**](./src/components/WorkflowStepper/README.md) | Arrow-style workflow progress with responsive design |
| [**ConflictDetector**](./src/components/ConflictDetector/README.md) | Prevent data loss from concurrent editing |
| [**GroupViewer**](./src/components/GroupViewer/README.md) | Display SharePoint groups with rich tooltips |
| [**ManageAccess**](./src/components/ManageAccess/README.md) | SharePoint-like permission management |
| [**ErrorBoundary**](./src/components/ErrorBoundary/README.md) | Graceful error handling with retry functionality |
| [**Form Components**](./src/components/spForm/README.md) | Responsive forms with DevExtreme and PnP integration |
| [**UserPersona**](./src/components/UserPersona/README.md) | Display user profiles with automatic fetching and caching |
| [**VersionHistory**](./src/components/VersionHistory/README.md) | Document and list item version history with comparison |

### 🎣 React Hooks

| Hook | Description | Documentation |
|------|-------------|---------------|
| `useLocalStorage` | Persistent state with localStorage | [View Docs](./src/hooks/README.md) |
| `useViewport` | Responsive breakpoint detection | [View Docs](./src/hooks/README.md) |
| `useCardController` | Programmatic card control | [Card Docs](./src/components/Card/README.md) |
| `useConflictDetection` | Real-time conflict monitoring | [Conflict Docs](./src/components/ConflictDetector/README.md) |
| `useErrorHandler` | Error boundary integration | [Error Docs](./src/components/ErrorBoundary/README.md) |

### 🛠️ Utilities

| Utility | Description |
|---------|-------------|
| [**BatchBuilder**](./src/utilities/batchBuilder/README.md) | Fluent API for SharePoint batch operations |
| [**PermissionHelper**](./src/utilities/permissionHelper/README.md) | SharePoint permission and group validation |
| [**Context Management**](./src/utilities/context/README.md) | Advanced SPFx context handling with caching |
| [**ListItemHelper**](./src/utilities/listItemHelper/README.md) | Extract and transform SharePoint field values |
| [**StringUtils**](./src/utilities/stringUtils/README.md) | String manipulation extensions |
| [**DateUtils**](./src/utilities/dateUtils/README.md) | Date formatting and calculation utilities |

## 📊 Bundle Size Optimization

SPFx Toolkit is designed for optimal bundle sizes through tree-shaking:

```typescript
// ✅ RECOMMENDED: Import specific components
import { Card } from 'spfx-toolkit/lib/components/Card';

// ✅ GOOD: Direct path imports for multiple components
import { Card } from 'spfx-toolkit/lib/components/Card';
import { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';

// ❌ AVOID: Bulk imports (imports everything)
import * from 'spfx-toolkit';
```

**Bundle Size Tips:**
- Use direct imports (`/lib/components/Card`) for smallest bundles
- Monitor your bundle with `gulp bundle --ship`
- Use webpack-bundle-analyzer to see what's included
- Import only what you actually use

## 🎯 Component Categories

### 📋 Display & Layout
Perfect for dashboards, content display, and responsive layouts.

- **[Card System](./src/components/Card/README.md)** - Expandable containers with animations
- **[ErrorBoundary](./src/components/ErrorBoundary/README.md)** - Graceful error handling
- **[Form Components](./src/components/spForm/README.md)** - Responsive form layouts

### 🔄 Workflow & Process
Ideal for business processes, approvals, and task management.

- **[WorkflowStepper](./src/components/WorkflowStepper/README.md)** - Visual process flows
- **[ConflictDetector](./src/components/ConflictDetector/README.md)** - Concurrent editing protection

### 🔐 Security & Permissions
Essential for permission management and access control.

- **[GroupViewer](./src/components/GroupViewer/README.md)** - SharePoint group display
- **[ManageAccess](./src/components/ManageAccess/README.md)** - Permission management UI
- **[PermissionHelper](./src/utilities/permissionHelper/README.md)** - Permission validation utility

### ⚡ Performance & Data
Optimize data operations and enhance performance.

- **[BatchBuilder](./src/utilities/batchBuilder/README.md)** - Efficient SharePoint operations
- **[Context Management](./src/utilities/context/README.md)** - Smart caching and context handling
- **[ListItemHelper](./src/utilities/listItemHelper/README.md)** - Field extraction and transformation

## 🏗️ Architecture & Design

### Tree-Shaking Optimized

```typescript
// ✅ GOOD: Minimal bundle impact
import { Card } from 'spfx-toolkit/lib/components/Card';

// ❌ AVOID: Imports everything
import { Card } from 'spfx-toolkit';
```

### Component-First Design

Each component is self-contained with its own:
- TypeScript interfaces
- CSS styling
- Documentation
- Unit tests
- Usage examples

### Modern SPFx Patterns

- React functional components with hooks
- TypeScript strict mode
- CSS custom properties for theming
- Accessibility-first approach
- Mobile-responsive design

## 📚 Documentation

### Component Documentation

| Component | Features | Best For |
|-----------|----------|----------|
| [**Card System**](./src/components/Card/README.md) | Expand/collapse, maximize, animations, persistence | Dashboards, content containers |
| [**WorkflowStepper**](./src/components/WorkflowStepper/README.md) | Arrow design, responsive, keyboard navigation | Process flows, multi-step forms |
| [**ConflictDetector**](./src/components/ConflictDetector/README.md) | Real-time conflict detection, Fluent UI dialogs | Form applications, concurrent editing |
| [**GroupViewer**](./src/components/GroupViewer/README.md) | Rich tooltips, caching, responsive design | User/group display, permissions |
| [**ManageAccess**](./src/components/ManageAccess/README.md) | Avatar display, permission management, mobile-optimized | Document management, access control |
| [**ErrorBoundary**](./src/components/ErrorBoundary/README.md) | Retry functionality, remote logging, development debugging | Error handling, production monitoring |
| [**Form Components**](./src/components/spForm/README.md) | DevExtreme integration, responsive layouts, validation | Data entry, form applications |

### Utility Documentation

| Utility | Features | Best For |
|---------|----------|----------|
| [**BatchBuilder**](./src/utilities/batchBuilder/README.md) | Cross-list operations, fluent API, error handling | Bulk operations, data migration |
| [**PermissionHelper**](./src/utilities/permissionHelper/README.md) | Permission checking, group validation, batch operations | Security, access control |
| [**Context Management**](./src/utilities/context/README.md) | Environment detection, caching strategies, performance tracking | Application foundation |
| [**ListItemHelper**](./src/utilities/listItemHelper/README.md) | Field extraction, type safety, transformation | Data processing, field mapping |

## 🎯 Usage Scenarios

### 📊 Dashboard Applications

```typescript
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useViewport } from 'spfx-toolkit/lib/hooks';
import { Context } from 'spfx-toolkit/lib/utilities/context';

// Perfect for: Executive dashboards, KPI displays, metrics
```

### 📝 Form Applications

```typescript
import { Card } from 'spfx-toolkit/lib/components/Card';
import { FormContainer, DevExtremeTextBox } from 'spfx-toolkit/lib/components/spForm';
import { ConflictDetector } from 'spfx-toolkit/lib/components/ConflictDetector';

// Perfect for: Data entry, document management, list forms
```

### 🔄 Workflow Applications

```typescript
import { Card } from 'spfx-toolkit/lib/components/Card';
import { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';
import { BatchBuilder } from 'spfx-toolkit/lib/utilities/batchBuilder';

// Perfect for: Approval processes, multi-step workflows, progress tracking
```

### 🔐 Permission Management

```typescript
import { ManageAccess } from 'spfx-toolkit/lib/components/ManageAccess';
import { GroupViewer } from 'spfx-toolkit/lib/components/GroupViewer';
import { PermissionHelper } from 'spfx-toolkit/lib/utilities/permissionHelper';

// Perfect for: Document libraries, access control, security applications
```

## 🚀 Getting Started

### 1. Choose Your Components

Start with our [Component Categories](#-component-categories) to identify what you need:

- **Display apps** → Card + ErrorBoundary
- **Form apps** → Card + ConflictDetector + Form Components
- **Workflow apps** → Card + WorkflowStepper + utilities
- **Permission apps** → ManageAccess + GroupViewer + PermissionHelper

### 2. Install and Import

```typescript
// Install the toolkit
npm install spfx-toolkit

// Import specific components
import { Card } from 'spfx-toolkit/lib/components/Card';
import { useLocalStorage } from 'spfx-toolkit/lib/hooks';
```

### 3. Integrate with Your SPFx Solution

```typescript
// In your web part
export default class MyWebPart extends BaseClientSideWebPart<IProps> {
  public render(): void {
    const element = React.createElement(MyComponent, {
      context: this.context
    });
    ReactDom.render(element, this.domElement);
  }
}
```

### 3. Bundle Size Monitoring

```bash
# Add to your package.json scripts
"analyze": "gulp bundle --ship && npx webpack-bundle-analyzer temp/deploy/*.js"

# Run analysis
npm run analyze
```

## 🛠️ Development & Contributing

### Prerequisites

- Node.js 18+
- SharePoint Framework 1.21.1+
- TypeScript 4.7+

### Development Setup

```bash
# Clone and install
git clone https://github.com/yourusername/spfx-toolkit.git
cd spfx-toolkit
npm install

# Build and test
npm run build
npm run validate
```

### Project Structure

```
spfx-toolkit/
├── src/
│   ├── components/           # React components
│   │   ├── Card/            # Card system with full documentation
│   │   ├── WorkflowStepper/ # Workflow component
│   │   ├── ConflictDetector/# Conflict detection
│   │   └── ...              # Other components
│   ├── hooks/               # Custom React hooks
│   ├── utilities/           # Helper utilities
│   │   ├── batchBuilder/    # SharePoint batch operations
│   │   ├── permissionHelper/# Permission validation
│   │   ├── context/         # Context management
│   │   └── ...              # Other utilities
│   └── types/               # TypeScript definitions
├── lib/                     # Compiled output
└── docs/                    # Additional documentation
```

## 📈 Performance Best Practices

### 1. Use Direct Imports

```typescript
// ✅ Best: Direct component import
import { Card } from 'spfx-toolkit/lib/components/Card';

// ✅ Good: Multiple direct imports
import { Card } from 'spfx-toolkit/lib/components/Card';
import { WorkflowStepper } from 'spfx-toolkit/lib/components/WorkflowStepper';

// ❌ Avoid: Main package import
import { Card } from 'spfx-toolkit';
```

### 2. Dynamic Imports for Optional Features

```typescript
// Load heavy components only when needed
const ManageAccess = React.lazy(() =>
  import('spfx-toolkit/lib/components/ManageAccess').then(m => ({
    default: m.ManageAccessComponent
  }))
);
```

### 3. Monitor Bundle Size

```typescript
// Check impact in your SPFx solution
gulp bundle --ship
ls -lh temp/deploy/
```

## 🔗 Resources

- [SharePoint Framework Documentation](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/)
- [Fluent UI React Components](https://developer.microsoft.com/en-us/fluentui#/controls/web)
- [PnP/PnPjs Documentation](https://pnp.github.io/pnpjs/)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

**Built with ❤️ for the SharePoint community**
