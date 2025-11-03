# User Photo Helper

**Utilities for fetching SharePoint user photos and handling default images with intelligent fallbacks.**

## 📋 Overview

The User Photo Helper provides a robust solution for fetching SharePoint user profile photos with automatic detection of default "no photo" images. When a user has no custom photo, it intelligently generates initials and color-coded backgrounds for a professional fallback experience.

### ✨ Key Features

- **Smart default detection** - Identifies SharePoint's default "no photo" images using MD5 hash comparison
- **Automatic initials generation** - Creates professional 2-letter initials from display names
- **Consistent color coding** - Generates deterministic colors based on user names
- **Multiple size support** - S (≤32px), M (≤48px), L (>48px)
- **Tree-shakable** - Import only what you need for minimal bundle size
- **Type-safe** - Full TypeScript support
- **Error resilient** - Graceful fallbacks on network errors

---

## 🚀 Installation

This utility is part of `spfx-toolkit`. Import using tree-shakable paths:

```typescript
import { getUserImage } from 'spfx-toolkit/lib/utilities/userPhotoHelper';
```

---

## 📖 Core Function: `getUserImage`

### Overview

The primary function for getting user images with automatic fallback to initials.

### Signature

```typescript
async function getUserImage(
  userEmail: string,
  options?: IGetUserImageOptions
): Promise<IUserImageResult>
```

### Parameters

| Parameter   | Type                     | Required | Description                                  |
| ----------- | ------------------------ | -------- | -------------------------------------------- |
| `userEmail` | `string`                 | ✅       | User's email address or UPN                  |
| `options`   | `IGetUserImageOptions`   | ❌       | Configuration options (see below)            |

### Options (`IGetUserImageOptions`)

| Property      | Type                          | Default                   | Description                           |
| ------------- | ----------------------------- | ------------------------- | ------------------------------------- |
| `siteUrl`     | `string`                      | `SPContext.webAbsoluteUrl`| SharePoint site URL                   |
| `size`        | `'S' \| 'M' \| 'L' \| number` | `'M'`                     | Photo size (see size guide below)     |
| `displayName` | `string`                      | Extracted from email      | Display name for initials generation  |

**Size Guide:**
- `'S'` or `≤32` pixels - Small (32x32)
- `'M'` or `≤48` pixels - Medium (48x48)
- `'L'` or `>48` pixels - Large (72x72+)

### Return Value (`IUserImageResult`)

```typescript
interface IUserImageResult {
  photoUrl: string | undefined;        // Photo data URI (undefined if default)
  hasCustomPhoto: boolean;             // Whether user has a custom photo
  initials: string;                    // Auto-generated initials (e.g., "JD")
  initialsColor: number;               // Fluent UI PersonaInitialsColor enum
  displayName: string;                 // Display name used for initials
}
```

---

## 💡 Usage Examples

### Basic Usage

```typescript
import { getUserImage } from 'spfx-toolkit/lib/utilities/userPhotoHelper';

const result = await getUserImage('john.doe@company.com');

if (result.hasCustomPhoto) {
  console.log('User photo URL:', result.photoUrl);
} else {
  console.log('No custom photo. Use initials:', result.initials);
  console.log('Initials color:', result.initialsColor);
}
```

### With Fluent UI Persona

```typescript
import { Persona } from '@fluentui/react/lib/Persona';
import { getUserImage } from 'spfx-toolkit/lib/utilities/userPhotoHelper';

const MyComponent = () => {
  const [imageData, setImageData] = React.useState(null);

  React.useEffect(() => {
    getUserImage('john.doe@company.com', {
      size: 72,
      displayName: 'John Doe'
    }).then(setImageData);
  }, []);

  if (!imageData) return <div>Loading...</div>;

  return (
    <Persona
      text={imageData.displayName}
      imageUrl={imageData.photoUrl}
      imageInitials={!imageData.hasCustomPhoto ? imageData.initials : undefined}
      initialsColor={imageData.initialsColor}
    />
  );
};
```

### Custom Size and Site URL

```typescript
import { getUserImage } from 'spfx-toolkit/lib/utilities/userPhotoHelper';

const result = await getUserImage('alice.smith@company.com', {
  size: 'L',
  siteUrl: 'https://tenant.sharepoint.com/sites/mysite',
  displayName: 'Alice Smith'
});
```

### Handling Multiple Users

```typescript
import { getUserImage } from 'spfx-toolkit/lib/utilities/userPhotoHelper';

const users = ['john.doe@company.com', 'alice.smith@company.com'];

const userImages = await Promise.all(
  users.map(email => getUserImage(email, { size: 'M' }))
);

userImages.forEach(({ displayName, hasCustomPhoto, initials }) => {
  console.log(`${displayName}: ${hasCustomPhoto ? 'Has photo' : `Initials: ${initials}`}`);
});
```

---

## 🛠️ Additional Utilities

### `getUserPhoto`

Lower-level function to fetch user photo URL directly.

```typescript
import { getUserPhoto } from 'spfx-toolkit/lib/utilities/userPhotoHelper';

const photoUrl = await getUserPhoto(
  'https://tenant.sharepoint.com',
  'john.doe@company.com',
  'M'
);

// Returns: "data:image/png;base64,..." or undefined
```

### `getInitials`

Generate initials from a display name.

```typescript
import { getInitials } from 'spfx-toolkit/lib/utilities/userPhotoHelper';

getInitials('John Doe');          // "JD"
getInitials('Alice');             // "AL"
getInitials('Bob Van Der Berg');  // "BB"
getInitials('');                  // "?"
```

### `getPersonaColor`

Generate a consistent color for a given name.

```typescript
import { getPersonaColor } from 'spfx-toolkit/lib/utilities/userPhotoHelper';
import { PersonaInitialsColor } from '@fluentui/react/lib/Persona';

const color = getPersonaColor('John Doe');
// Returns: PersonaInitialsColor enum value (e.g., PersonaInitialsColor.lightBlue)
```

### `getDisplayNameFromEmail`

Extract a formatted display name from an email address.

```typescript
import { getDisplayNameFromEmail } from 'spfx-toolkit/lib/utilities/userPhotoHelper';

getDisplayNameFromEmail('john.doe@company.com');      // "John Doe"
getDisplayNameFromEmail('alice_smith@company.com');   // "Alice Smith"
getDisplayNameFromEmail('bob-wilson@company.com');    // "Bob Wilson"
```

### `pixelSizeToPhotoSize`

Convert pixel size to photo size category.

```typescript
import { pixelSizeToPhotoSize } from 'spfx-toolkit/lib/utilities/userPhotoHelper';

pixelSizeToPhotoSize(24);   // "S"
pixelSizeToPhotoSize(32);   // "S"
pixelSizeToPhotoSize(48);   // "M"
pixelSizeToPhotoSize(72);   // "L"
```

---

## 🎯 How It Works

### Default Photo Detection

SharePoint returns a default "no photo" image for users without custom profile photos. The utility:

1. **Fetches the photo** from SharePoint's `/_layouts/15/userphoto.aspx` endpoint
2. **Converts to base64** for hash comparison
3. **Generates MD5 hash** using SharePoint's built-in MD5 library
4. **Compares against known defaults** - A set of MD5 hashes for default images
5. **Returns undefined** if default photo detected, otherwise returns data URI

### Initials Generation

- **Single name**: First 2 characters (e.g., "Alice" → "AL")
- **Multiple names**: First letter of first name + first letter of last name (e.g., "John Doe" → "JD")
- **Empty name**: Returns "?"

### Color Generation

Uses a deterministic hash algorithm based on the display name to select from 12 Fluent UI colors, ensuring the same name always gets the same color.

---

## 📦 Import Paths (Tree-Shaking)

```typescript
// ✅ RECOMMENDED: Import only what you need
import { getUserImage } from 'spfx-toolkit/lib/utilities/userPhotoHelper';

// ✅ GOOD: Import specific utilities
import {
  getUserImage,
  getInitials,
  getPersonaColor
} from 'spfx-toolkit/lib/utilities/userPhotoHelper';

// ❌ AVOID: Bulk import (imports all utilities)
import * from 'spfx-toolkit/lib/utilities';
```

---

## 🔍 Error Handling

The utility is designed to be resilient and always return a valid result:

```typescript
const result = await getUserImage('invalid-email');

// Result will be:
// {
//   photoUrl: undefined,
//   hasCustomPhoto: false,
//   initials: "?",
//   initialsColor: <calculated-color>,
//   displayName: "invalid-email"
// }
```

**Scenarios handled gracefully:**
- Invalid email addresses
- Network failures
- Missing user profiles
- SharePoint endpoint unavailability
- MD5 library loading failures

All errors are logged via `SPContext.logger` but don't throw exceptions.

---

## 🎨 Integration with Components

### With UserPersona Component

The UserPersona component already uses this utility internally:

```typescript
import { UserPersona } from 'spfx-toolkit/lib/components/UserPersona';

<UserPersona userIdentifier="john.doe@company.com" size={48} />
```

### Custom Implementation

For custom components, use the utility directly:

```typescript
import { getUserImage } from 'spfx-toolkit/lib/utilities/userPhotoHelper';
import { Persona } from '@fluentui/react/lib/Persona';

export const CustomUserCard = ({ email }: { email: string }) => {
  const [userData, setUserData] = React.useState(null);

  React.useEffect(() => {
    getUserImage(email, { size: 72 }).then(setUserData);
  }, [email]);

  if (!userData) return null;

  return (
    <div className="user-card">
      <Persona
        imageUrl={userData.photoUrl}
        imageInitials={!userData.hasCustomPhoto ? userData.initials : undefined}
        initialsColor={userData.initialsColor}
        text={userData.displayName}
      />
    </div>
  );
};
```

---

## 🚨 Prerequisites

1. **SPContext must be initialized** before using this utility:

```typescript
import { SPContext } from 'spfx-toolkit/lib/utilities/context';

// In your web part's onInit()
await SPContext.smart(this.context, 'MyWebPart');
```

2. **Required peer dependencies**:
   - `@microsoft/sp-loader` - For MD5 library loading
   - `@fluentui/react` - For PersonaInitialsColor enum

---

## 📊 Performance Considerations

- **Network calls**: Each unique user email triggers one HTTP request
- **Caching**: Implement your own caching layer for repeated calls
- **Batch operations**: Use `Promise.all()` for multiple users

**Example with caching:**

```typescript
const photoCache = new Map<string, IUserImageResult>();

async function getCachedUserImage(email: string): Promise<IUserImageResult> {
  if (photoCache.has(email)) {
    return photoCache.get(email)!;
  }

  const result = await getUserImage(email);
  photoCache.set(email, result);
  return result;
}
```

---

## 🔗 Related Utilities

- [**UserPersona Component**](../../components/UserPersona/README.md) - Full-featured user display component
- [**SPContext**](../context/README.md) - SPFx context management
- [**StringUtils**](../stringUtils/README.md) - String manipulation utilities

---

## 📝 TypeScript Support

Full TypeScript definitions are included:

```typescript
import type {
  IUserImageResult,
  IGetUserImageOptions,
  PhotoSize,
  PixelPhotoSize
} from 'spfx-toolkit/lib/utilities/userPhotoHelper';
```

---

## 🎯 Best Practices

1. **Always provide display names** when available to get better initials
2. **Use appropriate size** - Don't fetch large photos for small avatars
3. **Handle loading states** - The function is async, show loading indicators
4. **Implement caching** - Cache results for frequently accessed users
5. **Use tree-shakable imports** - Import specific functions to minimize bundle size

---

## 📚 Examples Repository

**Complete working examples:**

### Avatar Grid

```typescript
import { getUserImage } from 'spfx-toolkit/lib/utilities/userPhotoHelper';
import { Persona, PersonaSize } from '@fluentui/react/lib/Persona';

const AvatarGrid = ({ users }: { users: string[] }) => {
  const [userImages, setUserImages] = React.useState<IUserImageResult[]>([]);

  React.useEffect(() => {
    Promise.all(
      users.map(email => getUserImage(email, { size: 'M' }))
    ).then(setUserImages);
  }, [users]);

  return (
    <div className="avatar-grid">
      {userImages.map((userData, i) => (
        <Persona
          key={i}
          size={PersonaSize.size48}
          imageUrl={userData.photoUrl}
          imageInitials={!userData.hasCustomPhoto ? userData.initials : undefined}
          initialsColor={userData.initialsColor}
          text={userData.displayName}
        />
      ))}
    </div>
  );
};
```

---

**Last Updated**: October 2025
**Version**: 1.0.0
