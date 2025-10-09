# UserPersona Component 👤

A reusable, production-ready React component for displaying user personas in SharePoint Framework (SPFx) applications. Features automatic profile fetching, photo loading, intelligent caching, and multiple display modes.

## Features

- 🔄 **Automatic Profile Fetching** - Loads user information from SharePoint automatically
- 📸 **Photo Loading** - Fetches and displays user profile photos with fallback to initials
- ⚡ **Smart Caching** - Caches user profiles and photos for optimal performance
- 🎨 **Multiple Display Modes** - Avatar only, name only, or avatar + name
- 👥 **LivePersona Integration** - Optional hover cards with full profile information
- 📱 **Responsive Sizes** - 8 predefined sizes from 24px to 100px
- 🎭 **Customizable** - Custom initials, colors, icons, and styles
- 🔧 **TypeScript** - Full type safety with comprehensive interfaces
- ♿ **Accessible** - WCAG 2.1 AA compliant with proper ARIA attributes

## Installation

This component is part of the SPFx Toolkit:

```bash
npm install spfx-toolkit
```

**Peer Dependencies:**
```bash
npm install @fluentui/react@^8.0.0
npm install @pnp/sp@^3.20.1
npm install @pnp/spfx-controls-react@^3.22.0
```

## Quick Start

```typescript
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';

// Basic usage - automatic profile fetching
<UserPersona
  userIdentifier="john.doe@company.com"
/>

// With display mode
<UserPersona
  userIdentifier="i:0#.f|membership|jane.smith@company.com"
  displayMode="iconAndName"
  size={48}
/>

// With LivePersona hover card
<UserPersona
  userIdentifier="john.doe@company.com"
  showLivePersona={true}
  displayMode="avatarAndName"
/>
```

## API Reference

### Props

```typescript
interface IUserPersonaProps {
  userIdentifier: string;                    // Required: email, loginName, or UPN
  displayName?: string;                      // Optional: Override display name
  email?: string;                            // Optional: Override email
  size?: UserPersonaSize;                    // Optional: 24|28|32|40|48|56|72|100 (default: 32)
  displayMode?: UserPersonaDisplayMode;      // Optional: Display style (default: 'avatar')
  showLivePersona?: boolean;                 // Optional: Show hover card (default: false)
  showSecondaryText?: boolean;               // Optional: Show email in avatarAndName mode (default: true)
  onClick?: (userIdentifier: string, displayName: string) => void;  // Optional: Click handler
  className?: string;                        // Optional: Additional CSS classes
  title?: string;                            // Optional: Tooltip text
  customInitials?: string;                   // Optional: Override auto-generated initials
  customInitialsColor?: number;              // Optional: Custom initials color
}
```

### Display Modes

```typescript
type UserPersonaDisplayMode =
  | 'avatar'         // Avatar only (circular icon)
  | 'nameOnly'       // Name text only
  | 'avatarAndName'; // Avatar + name
```

### Sizes

```typescript
type UserPersonaSize = 24 | 28 | 32 | 40 | 48 | 56 | 72 | 100;
```

| Size | Use Case |
|------|----------|
| 24   | Compact lists, tags |
| 28   | Dense tables |
| 32   | Default, standard lists |
| 40   | Cards, panels |
| 48   | Header sections |
| 56   | Profile sections |
| 72   | Large cards |
| 100  | Profile pages |

## Usage Examples

### 1. Avatar Only (Default)

```typescript
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';

const MyComponent: React.FC = () => (
  <div>
    <UserPersona
      userIdentifier="john.doe@company.com"
      size={32}
    />
  </div>
);
```

### 2. Name Only

```typescript
<UserPersona
  userIdentifier="jane.smith@company.com"
  displayMode="nameOnly"
  onClick={(identifier, name) => {
    console.log(`Clicked on ${name}`);
  }}
/>
```

### 3. Avatar and Name

```typescript
<UserPersona
  userIdentifier="john.doe@company.com"
  displayMode="avatarAndName"
  size={40}
  showSecondaryText={true}  // Shows email below name
/>
```

### 4. With LivePersona Hover Card

```typescript
<UserPersona
  userIdentifier="john.doe@company.com"
  displayMode="avatarAndName"
  showLivePersona={true}
  size={48}
/>
```

### 5. User List Example

```typescript
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';

interface IUser {
  id: number;
  email: string;
  role: string;
}

const UserList: React.FC<{ users: IUser[] }> = ({ users }) => (
  <div className="user-list">
    {users.map(user => (
      <div key={user.id} className="user-item">
        <UserPersona
          userIdentifier={user.email}
          displayMode="avatarAndName"
          size={40}
          showLivePersona={true}
        />
        <span className="user-role">{user.role}</span>
      </div>
    ))}
  </div>
);
```

### 6. Custom Initials and Colors

```typescript
<UserPersona
  userIdentifier="admin@company.com"
  customInitials="SA"
  customInitialsColor={3}  // Fluent UI persona color index (0-14)
  displayMode="avatar"
  size={56}
/>
```

### 7. With Provided Display Name

```typescript
// Skip automatic lookup by providing display name
<UserPersona
  userIdentifier="john.doe@company.com"
  displayName="John Doe"
  email="john.doe@company.com"
  displayMode="avatarAndName"
/>
```

### 8. SPFx WebPart Integration

```typescript
import * as React from 'react';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

interface IMyWebPartProps {
  assignedTo: string;
}

const MyWebPartComponent: React.FC<IMyWebPartProps> = ({ assignedTo }) => (
  <div>
    <h3>Assigned To:</h3>
    <UserPersona
      userIdentifier={assignedTo}
      displayMode="avatarAndName"
      size={48}
      showLivePersona={true}
    />
  </div>
);

export default class MyWebPart extends BaseClientSideWebPart<IMyWebPartProps> {
  protected async onInit(): Promise<void> {
    await SPContext.smart(this.context, 'MyWebPart');
    return super.onInit();
  }

  public render(): void {
    const element = React.createElement(MyWebPartComponent, {
      assignedTo: this.properties.assignedTo
    });
    ReactDom.render(element, this.domElement);
  }
}
```

### 9. Document Library - Created By Column

```typescript
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';

interface IDocumentItem {
  name: string;
  author: {
    email: string;
    title: string;
  };
  modified: Date;
}

const DocumentList: React.FC<{ items: IDocumentItem[] }> = ({ items }) => (
  <table>
    <thead>
      <tr>
        <th>Document</th>
        <th>Created By</th>
        <th>Modified</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item, index) => (
        <tr key={index}>
          <td>{item.name}</td>
          <td>
            <UserPersona
              userIdentifier={item.author.email}
              displayName={item.author.title}
              displayMode="avatarAndName"
              size={32}
            />
          </td>
          <td>{item.modified.toLocaleDateString()}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
```

## Utility Functions

The component exports several utility functions for advanced use cases:

```typescript
import {
  getCachedProfile,
  cacheProfile,
  clearProfileCache,
  getUserPhotoUrl,
  getInitials,
  getPersonaColor,
  normalizeUserIdentifier,
  isValidUserIdentifier,
  getPhotoSize
} from 'spfx-toolkit/lib/components/UserPersona';

// Get cached profile
const cached = getCachedProfile('john.doe@company.com');
if (cached) {
  console.log(cached.profile.displayName);
}

// Get initials from name
const initials = getInitials('John Doe');  // "JD"

// Normalize user identifier
const normalized = normalizeUserIdentifier('john.doe@company.com');
// Returns: "i:0#.f|membership|john.doe@company.com"

// Validate user identifier
const isValid = isValidUserIdentifier('john.doe@company.com');  // true

// Get photo size for API calls
const photoSize = getPhotoSize(48);  // Returns 'M' (S, M, or L)
```

## Caching

The component uses intelligent caching to improve performance:

### Profile Caching
- **Cache Duration:** 5 minutes
- **Cache Key:** Normalized user identifier
- **Cached Data:** Display name, email, login name

### Photo Caching
- **Cache Duration:** Uses PnP CachingPessimisticRefresh strategy
- **Validation:** Detects SharePoint default placeholders via MD5 hash
- **Fallback:** Shows initials if photo unavailable

### Manual Cache Management

```typescript
import { clearProfileCache } from 'spfx-toolkit/lib/components/UserPersona';

// Clear specific user
clearProfileCache('john.doe@company.com');

// Clear all profiles
clearProfileCache();
```

## User Identifier Formats

The component accepts multiple user identifier formats:

```typescript
// Email address (auto-converted to claims format)
<UserPersona userIdentifier="john.doe@company.com" />

// SharePoint claims format
<UserPersona userIdentifier="i:0#.f|membership|john.doe@company.com" />

// User Principal Name
<UserPersona userIdentifier="john.doe@company.com" />

// Login name
<UserPersona userIdentifier="DOMAIN\username" />
```

## Styling

### Default Styles

The component includes base styles in `UserPersona.css`. Import in your web part:

```typescript
import 'spfx-toolkit/lib/components/UserPersona/UserPersona.css';
```

### Custom Styling

```typescript
// Apply custom class
<UserPersona
  userIdentifier="john.doe@company.com"
  className="my-custom-persona"
/>

// CSS
.my-custom-persona {
  border: 2px solid var(--themePrimary);
  border-radius: 50%;
  cursor: pointer;
}

.my-custom-persona:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
```

## Best Practices

### 1. Provide Display Name When Available

```typescript
// ✅ Good - Skips API call
<UserPersona
  userIdentifier="john.doe@company.com"
  displayName="John Doe"
  email="john.doe@company.com"
/>

// ❌ Less efficient - Makes API call
<UserPersona userIdentifier="john.doe@company.com" />
```

### 2. Use Appropriate Display Modes

```typescript
// ✅ Good - Compact for lists
<UserPersona
  userIdentifier="user@company.com"
  displayMode="avatar"
  size={32}
/>

// ✅ Good - Detailed for profiles
<UserPersona
  userIdentifier="user@company.com"
  displayMode="avatarAndName"
  size={72}
  showLivePersona={true}
/>
```

### 3. Initialize SPContext

```typescript
// ✅ Good - Initialize context in onInit
protected async onInit(): Promise<void> {
  await SPContext.smart(this.context, 'MyWebPart');
  return super.onInit();
}

// ❌ Bad - Missing context initialization
// UserPersona will fail without SPContext
```

### 4. Handle Click Events

```typescript
// ✅ Good - Handle clicks appropriately
<UserPersona
  userIdentifier="user@company.com"
  onClick={(identifier, name) => {
    // Navigate to profile page
    window.open(`/_layouts/15/userdisp.aspx?ID=${identifier}`, '_blank');
  }}
/>
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import {
  IUserPersonaProps,
  IUserProfile,
  UserPersonaSize,
  UserPersonaDisplayMode
} from 'spfx-toolkit/lib/components/UserPersona';

// Type-safe props
const props: IUserPersonaProps = {
  userIdentifier: 'john.doe@company.com',
  size: 48,
  displayMode: 'avatarAndName',
  onClick: (identifier: string, name: string) => {
    console.log(identifier, name);
  }
};

// Type-safe profile
const profile: IUserProfile = {
  displayName: 'John Doe',
  email: 'john.doe@company.com',
  loginName: 'i:0#.f|membership|john.doe@company.com'
};
```

## Troubleshooting

### Issue: Profile Not Loading

**Symptom:** Component shows initials but no name/photo

**Solution:**
```typescript
// 1. Verify SPContext is initialized
console.log(SPContext.isReady());  // Should be true

// 2. Check user identifier format
console.log(isValidUserIdentifier('john.doe@company.com'));

// 3. Clear cache and retry
clearProfileCache();
```

### Issue: Photo Not Displaying

**Symptom:** Shows initials instead of profile photo

**Possible Causes:**
- User has no profile photo in SharePoint
- Photo is a default placeholder (detected via MD5 hash)
- Network error loading photo

**Solution:**
```typescript
// Provide custom initials as fallback
<UserPersona
  userIdentifier="user@company.com"
  customInitials="AB"
  customInitialsColor={5}
/>
```

### Issue: LivePersona Not Working

**Symptom:** Hover card doesn't appear

**Solution:**
```typescript
// Ensure @pnp/spfx-controls-react is installed
npm install @pnp/spfx-controls-react@^3.22.0

// Enable LivePersona
<UserPersona
  userIdentifier="user@company.com"
  showLivePersona={true}
/>
```

### Issue: Performance Degradation

**Symptom:** Slow rendering with many personas

**Solution:**
```typescript
// 1. Provide display names to skip API calls
users.map(user => (
  <UserPersona
    key={user.id}
    userIdentifier={user.email}
    displayName={user.name}  // Prevents API lookup
  />
))

// 2. Use smaller sizes
<UserPersona size={24} displayMode="avatar" />

// 3. Disable LivePersona for large lists
<UserPersona showLivePersona={false} />
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Related Components

- [GroupViewer](../GroupViewer/README.md) - Display SharePoint groups
- [ManageAccess](../ManageAccess/README.md) - Permission management with personas

## Dependencies

- `@fluentui/react@^8.0.0` - UI components
- `@pnp/sp@^3.20.1` - SharePoint operations
- `@pnp/spfx-controls-react@^3.22.0` - LivePersona hover cards
- `@microsoft/sp-loader` - Component loading
- SPFx Toolkit Context utility
