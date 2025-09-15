# SPFx Card Component System

A comprehensive, production-ready card component library for SharePoint Framework (SPFx) solutions. Built with React, TypeScript, and Fluent UI, this system provides everything you need to create engaging, accessible, and high-performance card-based interfaces in SharePoint.

## 🚀 Features

### Core Functionality

- ✅ **Expandable/Collapsible Cards** with smooth animations
- ✅ **Maximize/Restore** functionality with full-screen modal
- ✅ **Multiple Size Variants** (compact, regular, large, full-width)
- ✅ **Color Variants** (success, error, warning, info, default)
- ✅ **Flexible Content Padding** system
- ✅ **Action Buttons** with tooltips and variants
- ✅ **Loading States** (none, spinner, skeleton, shimmer, overlay)
- ✅ **Lazy Loading** for performance optimization

### Advanced Features

- 🎛️ **Accordion Mode** with single/multiple expand options
- 🎮 **Programmatic Control** via CardController
- 🔍 **Search & Filter** in accordions
- 💾 **State Persistence** with localStorage/sessionStorage
- ⚡ **Performance Optimizations** with memoization and debouncing
- 🛡️ **Error Boundaries** with retry functionality

### SharePoint Integration

- 🏢 **SPFx Optimized** - Component library, not web part
- 🎨 **SharePoint Theming** via CSS custom properties
- 🔧 **Fluent UI v8.x** integration
- 📦 **No External Dependencies** beyond SharePoint/Fluent UI
- 🏗️ **Class & Functional** component support

### Accessibility & Design

- ♿ **WCAG 2.1 AA Compliant** with full ARIA support
- ⌨️ **Keyboard Navigation** throughout
- 🎯 **High Contrast** mode support
- 🎭 **Reduced Motion** preferences
- 📱 **Responsive Design** with mobile support
- 🌐 **RTL Support** for international use

## 📦 Installation

### Prerequisites

- SharePoint Framework 1.15+
- React 16.8+
- Fluent UI React 8.x
- Node.js 16+

### Install Dependencies

```bash
npm install @fluentui/react@^8.0.0
```

### Add Component Files

1. Copy the component files to your SPFx project:

```
src/components/SpfxCard/
├── index.ts
├── Card.types.ts
├── Accordion.tsx
├── services/
├── hooks/
├── components/
├── utils/
└── styles/
```

2. Import styles in your main component:

```typescript
import './components/SpfxCard/styles/Card.module.scss';
import './components/SpfxCard/styles/Accordion.module.scss';
import './components/SpfxCard/styles/animations.module.scss';
```

## 🚀 Quick Start

### Basic Card Usage

```typescript
import React from 'react';
import { Card, Header, Content, Footer } from './components/SpfxCard';

export const MyComponent: React.FC = () => {
  return (
    <Card id='my-card' variant='info' size='regular'>
      <Header>My First Card</Header>
      <Content>
        <p>This is card content that can be expanded and collapsed.</p>
      </Content>
      <Footer>Last updated: {new Date().toLocaleDateString()}</Footer>
    </Card>
  );
};
```

### Card with Actions and Maximize

```typescript
import { Card, Header, Content, ActionButtons, useCardController } from './components/SpfxCard';

export const AdvancedCard: React.FC = () => {
  const cardController = useCardController();

  const actions = [
    {
      id: 'refresh',
      label: 'Refresh',
      icon: 'Refresh',
      onClick: () => console.log('Refresh clicked'),
      variant: 'primary' as const,
      tooltip: 'Refresh card data',
    },
  ];

  return (
    <Card
      id='advanced-card'
      variant='success'
      allowMaximize={true}
      persist={true}
      onExpand={data => console.log('Expanded:', data)}
    >
      <Header>Advanced Card</Header>
      <ActionButtons actions={actions} />
      <Content>
        <p>This card can be maximized and persists its state!</p>
      </Content>
    </Card>
  );
};
```

### Accordion Usage

```typescript
import { Accordion, Card, Header, Content } from './components/SpfxCard';

export const MyAccordion: React.FC = () => {
  return (
    <Accordion id='settings-accordion' allowMultiple={false} variant='connected'>
      <Card id='general-settings'>
        <Header>General Settings</Header>
        <Content>
          <p>General configuration options</p>
        </Content>
      </Card>

      <Card id='advanced-settings'>
        <Header>Advanced Settings</Header>
        <Content>
          <p>Advanced configuration options</p>
        </Content>
      </Card>
    </Accordion>
  );
};
```

### Programmatic Control

```typescript
import { useCardController } from './components/SpfxCard';

export const ControlPanel: React.FC = () => {
  const cardController = useCardController();

  const handleExpandAll = () => {
    cardController.expandAll(true); // true = highlight changes
  };

  const handleScrollToCard = async () => {
    await cardController.expandAndScrollTo('my-card', {
      smooth: true,
      block: 'center',
      highlight: true,
    });
  };

  return (
    <div>
      <button onClick={handleExpandAll}>Expand All Cards</button>
      <button onClick={handleScrollToCard}>Find My Card</button>
    </div>
  );
};
```

### Import Options

```typescript
// Default import (SpfxCard object with all components)
import SpfxCard from './components/SpfxCard';
const { Card, Header, Content } = SpfxCard;

// Named imports (recommended for tree-shaking)
import { Card, Header, Content, Accordion } from './components/SpfxCard';

// Mixed imports
import SpfxCard, { useCardController, CardProps } from './components/SpfxCard';
```

## 📚 API Reference

### Card Props

| Prop            | Type                            | Default     | Description                                            |
| --------------- | ------------------------------- | ----------- | ------------------------------------------------------ |
| `id`            | `string`                        | Required    | Unique identifier for the card                         |
| `size`          | `CardSize`                      | `'regular'` | Size variant (compact, regular, large, full-width)     |
| `variant`       | `CardVariant`                   | `'default'` | Color variant (success, error, warning, info, default) |
| `allowExpand`   | `boolean`                       | `true`      | Whether card can be expanded/collapsed                 |
| `allowMaximize` | `boolean`                       | `false`     | Whether card can be maximized                          |
| `persist`       | `boolean`                       | `false`     | Save state to localStorage                             |
| `lazyLoad`      | `boolean`                       | `false`     | Load content only when expanded                        |
| `loading`       | `boolean`                       | `false`     | Show loading state                                     |
| `loadingType`   | `LoadingType`                   | `'none'`    | Type of loading indicator                              |
| `onExpand`      | `(data: CardEventData) => void` | -           | Callback when card expands                             |
| `onMaximize`    | `(data: CardEventData) => void` | -           | Callback when card maximizes                           |

### Content Padding Options

| Value           | CSS Equivalent                | Use Case              |
| --------------- | ----------------------------- | --------------------- |
| `'none'`        | `0`                           | Custom layouts        |
| `'compact'`     | `8px`                         | Tight spaces          |
| `'comfortable'` | `16px`                        | Default (recommended) |
| `'spacious'`    | `24px`                        | Breathing room        |
| `'loose'`       | `32px`                        | Luxury spacing        |
| Custom string   | e.g., `'12px 20px'`           | Specific requirements |
| Object          | `{ top: 12, right: 20, ... }` | Granular control      |

### CardController Methods

| Method                            | Description                  |
| --------------------------------- | ---------------------------- |
| `expandAll(highlight?)`           | Expand all cards             |
| `collapseAll(highlight?)`         | Collapse all cards           |
| `toggleCard(id, highlight?)`      | Toggle specific card         |
| `expandAndScrollTo(id, options?)` | Expand card and scroll to it |
| `maximizeCard(id)`                | Maximize specific card       |
| `getCardStates()`                 | Get all card states          |
| `persistStates()`                 | Save states to storage       |

### Accordion Props

| Prop              | Type                                     | Default       | Description                                        |
| ----------------- | ---------------------------------------- | ------------- | -------------------------------------------------- |
| `id`              | `string`                                 | Required      | Unique identifier for the accordion                |
| `allowMultiple`   | `boolean`                                | `false`       | Allow multiple cards to be expanded simultaneously |
| `defaultExpanded` | `string[]`                               | `[]`          | Cards that should be expanded by default           |
| `spacing`         | `'none' \| 'compact' \| 'regular'`       | `'none'`      | Spacing between cards                              |
| `variant`         | `'default' \| 'connected' \| 'outlined'` | `'connected'` | Visual connection between cards                    |
| `persist`         | `boolean`                                | `false`       | Enable persistence of accordion state              |
| `onCardChange`    | `(expandedCards: string[]) => void`      | -             | Callback when card states change                   |

## 🎨 Styling and Theming

### SharePoint Theme Integration

The component automatically integrates with SharePoint themes:

```scss
:root {
  --spfx-card-theme-primary: var(--themePrimary, #0078d4);
  --spfx-card-theme-success: var(--green, #107c10);
  --spfx-card-neutral-lighter: var(--neutralLighter, #f8f9fa);
  // ... more theme variables
}
```

### Custom Theme Override

```typescript
<Card
  theme={{
    primaryColor: '#custom-color',
    backgroundColor: '#custom-bg',
    borderColor: '#custom-border'
  }}
>
```

### Size Customization

```scss
.spfx-card-compact {
  .spfx-card-header {
    padding: 8px 12px;
  }
  .spfx-card-body {
    padding: 8px 12px;
  }
}

.spfx-card-large {
  .spfx-card-header {
    padding: 24px 28px;
  }
  .spfx-card-body {
    padding: 24px 28px;
  }
}
```

## ⚡ Performance Optimization

### Best Practices

1. **Use Lazy Loading for Heavy Content**:

```typescript
<Card lazyLoad={true}>
  <Content>{() => <HeavyComponent />} // Function-based content</Content>
</Card>
```

2. **Enable Performance Mode**:

```typescript
<Card
  performance={{
    debounceToggle: 200,
    memoizeContent: true
  }}
  animation={{ disabled: true }} // Disable in high-performance scenarios
>
```

3. **Batch Operations**:

```typescript
const cardController = useCardController();

// Instead of multiple individual calls
cardController.batchOperation(
  [
    { cardId: 'card1', action: 'expand' },
    { cardId: 'card2', action: 'collapse' },
  ],
  true
);
```

### Memory Management

- Components automatically clean up subscriptions on unmount
- Use `cleanupCardSystem()` when removing the card system
- Enable content memoization for frequently re-rendered cards

## ♿ Accessibility Features

### ARIA Support

- All interactive elements have proper ARIA labels
- Cards support `aria-expanded`, `aria-controls`, `aria-describedby`
- Screen reader announcements for state changes

### Keyboard Navigation

- `Tab` / `Shift+Tab` - Navigate between cards
- `Enter` / `Space` - Expand/collapse cards
- `Escape` - Close maximized cards
- Arrow keys in accordions for sequential navigation

### High Contrast Mode

```css
@media (forced-colors: active) {
  .spfx-card {
    border: 2px solid ButtonBorder;
    background: ButtonFace;
  }
}
```

## 🧪 Testing

### Unit Testing Example

```typescript
import { render, fireEvent, screen } from '@testing-library/react';
import { Card, Header, Content } from './components/SpfxCard';

test('card expands and collapses', () => {
  render(
    <Card id='test-card'>
      <Header>Test Header</Header>
      <Content>Test Content</Content>
    </Card>
  );

  const header = screen.getByRole('button');

  // Test expand
  fireEvent.click(header);
  expect(screen.getByText('Test Content')).toBeVisible();

  // Test collapse
  fireEvent.click(header);
  expect(screen.getByText('Test Content')).not.toBeVisible();
});
```

### Integration Testing

```typescript
test('programmatic control works', () => {
  const TestComponent = () => {
    const cardController = useCardController();

    return (
      <div>
        <button onClick={() => cardController.expandAll()}>Expand All</button>
        <Card id='test-card'>
          <Header>Test</Header>
          <Content>Content</Content>
        </Card>
      </div>
    );
  };

  render(<TestComponent />);

  fireEvent.click(screen.getByText('Expand All'));
  expect(screen.getByText('Content')).toBeVisible();
});
```

## 🔧 Advanced Usage

### Class Component Integration

```typescript
import { CardControllerComponent } from './components/SpfxCard';

class MyClassComponent extends CardControllerComponent {
  componentDidMount() {
    // Subscribe to card events
    this.subscribeToAllCards((action, cardId, data) => {
      console.log(`Card ${cardId} performed ${action}`);
    });
  }

  handleExpandAll = () => {
    this.cardController.expandAll(true);
  };

  render() {
    return (
      <div>
        <button onClick={this.handleExpandAll}>Expand All</button>
        {/* Your cards here */}
      </div>
    );
  }
}
```

### Custom Loading States

```typescript
const MyCustomLoader = () => (
  <div className='my-custom-loader'>
    <div>Loading custom content...</div>
    <div className='spinner' />
  </div>
);

<Card loading={true}>
  <Content loadingPlaceholder={<MyCustomLoader />}>{/* Content */}</Content>
</Card>;
```

### Form Validation with Cards

```typescript
const FormWithValidation = () => {
  const [errors, setErrors] = useState({});
  const cardController = useCardController();

  const handleSubmit = () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    // Expand and scroll to first error
    if (Object.keys(validationErrors).length > 0) {
      const firstErrorField = Object.keys(validationErrors)[0];
      cardController.expandAndScrollTo(`form-${firstErrorField}`, {
        smooth: true,
        block: 'center',
        highlight: true,
      });
    }
  };

  return (
    <Accordion id='form-accordion'>
      <Card id='form-basic-info' variant={errors.name ? 'error' : 'default'}>
        <Header>
          Basic Information
          {errors.name && <span className='error-indicator'>*</span>}
        </Header>
        <Content>
          <input name='name' className={errors.name ? 'error' : ''} />
          {errors.name && <div className='error-text'>{errors.name}</div>}
        </Content>
      </Card>
    </Accordion>
  );
};
```

## 🐛 Troubleshooting

### Common Issues

1. **Cards Not Rendering**

   - Ensure SCSS files are imported
   - Check that Fluent UI is properly installed
   - Verify component imports are correct

2. **Styles Not Applied**

   - Import the SCSS files in your main component
   - Check for CSS conflicts with existing styles
   - Ensure SharePoint theme variables are available

3. **Performance Issues**

   - Enable lazy loading for content-heavy cards
   - Use performance optimization props
   - Consider disabling animations for large card sets

4. **State Not Persisting**

   - Check localStorage availability
   - Verify `persist={true}` prop
   - Ensure unique card IDs

5. **TypeScript Errors**
   - Ensure all imports are correct
   - Check for missing type definitions
   - Verify component props match interfaces

### Debug Mode

```typescript
import { initializeCardSystem } from './components/SpfxCard';

// Enable debug mode in development
initializeCardSystem({
  debugMode: process.env.NODE_ENV === 'development',
});
```

## 🤝 Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

### Code Standards

- Use TypeScript strict mode
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Include unit tests for new features
- Update documentation for API changes

### Submitting Changes

1. Create feature branch
2. Make changes with tests
3. Update documentation
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [SharePoint Framework Documentation](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/)
- [Fluent UI React](https://developer.microsoft.com/en-us/fluentui#/controls/web)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 📊 Browser Support

| Browser | Minimum Version | Notes         |
| ------- | --------------- | ------------- |
| Chrome  | 88+             | Full support  |
| Edge    | 88+             | Full support  |
| Firefox | 85+             | Full support  |
| Safari  | 14+             | Full support  |
| IE 11   | ❌              | Not supported |

## 🏷️ Version History

### v1.0.0 (Current)

- Initial release
- Full card functionality
- Accordion support
- Programmatic control
- SharePoint theming
- Accessibility compliance
- Performance optimizations
- TypeScript support
- Production-ready codebase

---

**Built with ❤️ for the SharePoint community**
