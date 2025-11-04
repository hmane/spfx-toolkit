# SPUrlField Component =

A comprehensive URL (hyperlink) field component that mirrors SharePoint's Hyperlink fields. Supports URL and description inputs, URL validation, relative URLs, link preview, and DevExtreme UI integration.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props](#props)
- [Value Structure](#value-structure)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- = **URL + Description** - URL with optional display text
-  **URL Validation** - Built-in format validation
- < **Relative URLs** - Optional support for relative paths
- = **Link Preview** - Show link icon and preview
- <£ **React Hook Form** - Native integration with validation
- <¨ **DevExtreme UI** - Consistent styling with spForm system
-  **Validation** - Built-in validation with custom rules
- <­ **Styling Modes** - Outlined, underlined, or filled styles
- <¯ **Custom Labels** - Configurable URL and description labels
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
import { SPUrlField } from 'spfx-toolkit/lib/components/spFields/SPUrlField';
import { useForm } from 'react-hook-form';

function MyForm() {
  const { control } = useForm();

  return (
    <>
      {/* URL with description */}
      <SPUrlField
        name="website"
        label="Website"
        control={control}
        rules={{ required: 'Website is required' }}
      />

      {/* URL only (no description) */}
      <SPUrlField
        name="link"
        label="Documentation Link"
        control={control}
        showDescription={false}
        urlPlaceholder="https://example.com"
      />

      {/* Allow relative URLs */}
      <SPUrlField
        name="relativeLink"
        label="Internal Link"
        control={control}
        allowRelativeUrl
        urlPlaceholder="/pages/about"
      />
    </>
  );
}
```

### Standalone (Without Form)

```typescript
import { SPUrlField } from 'spfx-toolkit/lib/components/spFields/SPUrlField';
import { ISPUrlFieldValue } from 'spfx-toolkit/lib/components/spFields/types';

function MyComponent() {
  const [url, setUrl] = React.useState<ISPUrlFieldValue>({
    Url: 'https://example.com',
    Description: 'Example Website'
  });

  return (
    <SPUrlField
      label="Website"
      value={url}
      onChange={setUrl}
      showDescription
      showLinkIcon
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
| `placeholder` | `string` | - | Placeholder text (legacy, use specific placeholders) |
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
| `value` | `ISPUrlFieldValue` | - | Controlled value |
| `defaultValue` | `ISPUrlFieldValue` | - | Initial value |
| `onChange` | `(value: ISPUrlFieldValue) => void` | - | Change handler |
| `onBlur` | `() => void` | - | Blur handler |
| `onFocus` | `() => void` | - | Focus handler |

### URL Field Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showDescription` | `boolean` | `true` | Show description field |
| `descriptionLabel` | `string` | `'Description'` | Label for description field |
| `urlLabel` | `string` | `'URL'` | Label for URL field |
| `validateUrl` | `boolean` | `true` | Validate URL format |
| `allowRelativeUrl` | `boolean` | `false` | Allow relative URLs |
| `showLinkIcon` | `boolean` | `true` | Show link icon/preview |
| `openInNewWindow` | `boolean` | `true` | Open in new window by default |
| `urlPlaceholder` | `string` | - | URL field placeholder |
| `descriptionPlaceholder` | `string` | - | Description field placeholder |
| `stylingMode` | `string` | `'outlined'` | Style variant |

---

## Value Structure

### ISPUrlFieldValue Interface

```typescript
interface ISPUrlFieldValue {
  /**
   * The URL
   */
  Url: string;

  /**
   * Display text/description (optional)
   */
  Description?: string;
}
```

### Example Values

```typescript
// Full URL with description
const value1: ISPUrlFieldValue = {
  Url: 'https://example.com',
  Description: 'Example Website'
};

// URL without description
const value2: ISPUrlFieldValue = {
  Url: 'https://docs.microsoft.com',
  Description: ''
};

// Relative URL
const value3: ISPUrlFieldValue = {
  Url: '/pages/about',
  Description: 'About Page'
};
```

---

## Usage Patterns

### Pattern 1: Basic URL with Description

```typescript
<SPUrlField
  name="companyWebsite"
  label="Company Website"
  control={control}
  urlPlaceholder="https://www.company.com"
  descriptionPlaceholder="Enter company name"
  rules={{ required: 'Website is required' }}
/>
```

---

### Pattern 2: URL Only (No Description)

```typescript
<SPUrlField
  name="documentationUrl"
  label="Documentation URL"
  control={control}
  showDescription={false}
  urlPlaceholder="https://docs.example.com"
  rules={{ required: 'Documentation URL is required' }}
/>
```

---

### Pattern 3: URL Validation

```typescript
<SPUrlField
  name="website"
  label="Website"
  control={control}
  validateUrl
  rules={{
    required: 'Website is required',
    validate: (value) => {
      if (!value?.Url) return 'URL is required';

      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value.Url)) {
        return 'URL must start with http:// or https://';
      }

      return true;
    }
  }}
/>
```

---

### Pattern 4: Allow Relative URLs

```typescript
<SPUrlField
  name="internalLink"
  label="Internal Link"
  control={control}
  allowRelativeUrl
  urlPlaceholder="/sites/team/pages/home.aspx"
  description="Enter a relative URL or full URL"
/>
```

---

### Pattern 5: Custom Labels

```typescript
<SPUrlField
  name="resource"
  label="Learning Resource"
  control={control}
  urlLabel="Resource URL"
  descriptionLabel="Resource Title"
  urlPlaceholder="https://..."
  descriptionPlaceholder="Enter a descriptive title"
/>
```

---

### Pattern 6: Social Media Links

```typescript
<SPUrlField
  name="linkedinProfile"
  label="LinkedIn Profile"
  control={control}
  showDescription={false}
  urlPlaceholder="https://www.linkedin.com/in/username"
  rules={{
    validate: (value) => {
      if (!value?.Url) return true; // Optional field
      if (!value.Url.includes('linkedin.com')) {
        return 'Must be a LinkedIn URL';
      }
      return true;
    }
  }}
/>
```

---

### Pattern 7: Email Link (mailto:)

```typescript
<SPUrlField
  name="contactEmail"
  label="Contact Email"
  control={control}
  showDescription={false}
  urlPlaceholder="mailto:contact@example.com"
  allowRelativeUrl  // Allow mailto: URLs
  validateUrl={false}  // Disable default URL validation
  rules={{
    validate: (value) => {
      if (!value?.Url) return true;
      if (!value.Url.startsWith('mailto:')) {
        return 'Email link must start with mailto:';
      }
      return true;
    }
  }}
/>
```

---

## Complete Examples

### Example 1: Resource Directory Form

```typescript
import { SPUrlField } from 'spfx-toolkit/lib/components/spFields/SPUrlField';
import { useForm } from 'react-hook-form';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { ISPUrlFieldValue } from 'spfx-toolkit/lib/components/spFields/types';

interface IResourceForm {
  website: ISPUrlFieldValue;
  documentation: ISPUrlFieldValue;
  supportPortal: ISPUrlFieldValue;
  knowledgeBase: ISPUrlFieldValue;
}

function ResourceDirectoryForm() {
  const { control, handleSubmit } = useForm<IResourceForm>();

  const onSubmit = async (data: IResourceForm) => {
    console.log('Resources:', data);
    // Submit to SharePoint
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Company Website */}
      <SPUrlField
        name="website"
        label="Company Website"
        control={control}
        urlPlaceholder="https://www.company.com"
        descriptionPlaceholder="Company name"
        rules={{
          required: 'Website is required',
          validate: (value) => {
            if (!value?.Url?.startsWith('http')) {
              return 'URL must start with http:// or https://';
            }
            return true;
          }
        }}
      />

      {/* Documentation */}
      <SPUrlField
        name="documentation"
        label="Documentation"
        control={control}
        urlLabel="Documentation URL"
        descriptionLabel="Documentation Title"
        urlPlaceholder="https://docs.company.com"
        descriptionPlaceholder="Main Documentation"
      />

      {/* Support Portal */}
      <SPUrlField
        name="supportPortal"
        label="Support Portal"
        control={control}
        showDescription={false}
        urlPlaceholder="https://support.company.com"
      />

      {/* Knowledge Base - Allow relative URLs */}
      <SPUrlField
        name="knowledgeBase"
        label="Knowledge Base"
        control={control}
        allowRelativeUrl
        urlPlaceholder="https://kb.company.com or /sites/kb"
        descriptionPlaceholder="Internal KB"
        description="Enter full URL or relative path"
      />

      <PrimaryButton type="submit" text="Save Resources" />
    </form>
  );
}
```

---

### Example 2: Social Media Profile Form

```typescript
import { SPUrlField } from 'spfx-toolkit/lib/components/spFields/SPUrlField';
import { useForm } from 'react-hook-form';
import { ISPUrlFieldValue } from 'spfx-toolkit/lib/components/spFields/types';

interface ISocialMediaForm {
  linkedin: ISPUrlFieldValue;
  twitter: ISPUrlFieldValue;
  github: ISPUrlFieldValue;
  website: ISPUrlFieldValue;
}

function SocialMediaProfileForm() {
  const { control, handleSubmit } = useForm<ISocialMediaForm>();

  // Validator helpers
  const validateLinkedIn = (value: ISPUrlFieldValue) => {
    if (!value?.Url) return true; // Optional
    if (!value.Url.includes('linkedin.com')) {
      return 'Must be a LinkedIn URL';
    }
    return true;
  };

  const validateTwitter = (value: ISPUrlFieldValue) => {
    if (!value?.Url) return true; // Optional
    if (!value.Url.includes('twitter.com') && !value.Url.includes('x.com')) {
      return 'Must be a Twitter/X URL';
    }
    return true;
  };

  const validateGitHub = (value: ISPUrlFieldValue) => {
    if (!value?.Url) return true; // Optional
    if (!value.Url.includes('github.com')) {
      return 'Must be a GitHub URL';
    }
    return true;
  };

  const onSubmit = async (data: ISocialMediaForm) => {
    console.log('Social media profiles:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h3>Social Media Profiles</h3>

      {/* LinkedIn */}
      <SPUrlField
        name="linkedin"
        label="LinkedIn Profile"
        control={control}
        showDescription={false}
        urlPlaceholder="https://www.linkedin.com/in/username"
        rules={{ validate: validateLinkedIn }}
      />

      {/* Twitter/X */}
      <SPUrlField
        name="twitter"
        label="Twitter Profile"
        control={control}
        showDescription={false}
        urlPlaceholder="https://twitter.com/username"
        rules={{ validate: validateTwitter }}
      />

      {/* GitHub */}
      <SPUrlField
        name="github"
        label="GitHub Profile"
        control={control}
        showDescription={false}
        urlPlaceholder="https://github.com/username"
        rules={{ validate: validateGitHub }}
      />

      {/* Personal Website */}
      <SPUrlField
        name="website"
        label="Personal Website"
        control={control}
        urlPlaceholder="https://yourwebsite.com"
        descriptionPlaceholder="Your name or website title"
        rules={{
          validate: (value) => {
            if (!value?.Url) return true;
            if (!value.Url.startsWith('http')) {
              return 'Website must be a full URL';
            }
            return true;
          }
        }}
      />

      <PrimaryButton type="submit" text="Save Profiles" />
    </form>
  );
}
```

---

### Example 3: Documentation Management

```typescript
import { SPUrlField } from 'spfx-toolkit/lib/components/spFields/SPUrlField';
import { useForm } from 'react-hook-form';
import { ISPUrlFieldValue } from 'spfx-toolkit/lib/components/spFields/types';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

interface IDocumentationForm {
  apiDocs: ISPUrlFieldValue;
  userGuide: ISPUrlFieldValue;
  videoTutorial: ISPUrlFieldValue;
  faqPage: ISPUrlFieldValue;
  sourceCode: ISPUrlFieldValue;
}

function DocumentationManagementForm() {
  const { control, handleSubmit, watch } = useForm<IDocumentationForm>();

  const apiDocs = watch('apiDocs');
  const videoTutorial = watch('videoTutorial');

  const onSubmit = async (data: IDocumentationForm) => {
    console.log('Documentation links:', data);
  };

  // Validate YouTube URL
  const validateYouTubeUrl = (value: ISPUrlFieldValue) => {
    if (!value?.Url) return true;
    const isYouTube = value.Url.includes('youtube.com') || value.Url.includes('youtu.be');
    if (!isYouTube) {
      return 'Must be a YouTube URL';
    }
    return true;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2>Documentation Links</h2>

      {apiDocs?.Url && (
        <MessageBar messageBarType={MessageBarType.success}>
          API documentation link added
        </MessageBar>
      )}

      {/* API Documentation */}
      <SPUrlField
        name="apiDocs"
        label="API Documentation"
        control={control}
        urlLabel="API Docs URL"
        descriptionLabel="API Version"
        urlPlaceholder="https://api.example.com/docs"
        descriptionPlaceholder="v2.0"
        rules={{ required: 'API documentation URL is required' }}
      />

      {/* User Guide */}
      <SPUrlField
        name="userGuide"
        label="User Guide"
        control={control}
        allowRelativeUrl
        urlPlaceholder="https://docs.example.com/guide or /docs/user-guide.pdf"
        descriptionPlaceholder="Getting Started Guide"
        description="Full URL or relative path to SharePoint document"
      />

      {/* Video Tutorial */}
      <SPUrlField
        name="videoTutorial"
        label="Video Tutorial"
        control={control}
        urlPlaceholder="https://www.youtube.com/watch?v=..."
        descriptionPlaceholder="Tutorial title"
        rules={{
          validate: validateYouTubeUrl
        }}
        description="YouTube video URL"
      />

      {/* FAQ Page */}
      <SPUrlField
        name="faqPage"
        label="FAQ Page"
        control={control}
        allowRelativeUrl
        urlPlaceholder="https://help.example.com/faq"
        descriptionPlaceholder="Frequently Asked Questions"
      />

      {/* Source Code Repository */}
      <SPUrlField
        name="sourceCode"
        label="Source Code Repository"
        control={control}
        showDescription={false}
        urlPlaceholder="https://github.com/org/repo"
        rules={{
          validate: (value) => {
            if (!value?.Url) return true;
            const isGitRepo = value.Url.includes('github.com') ||
                             value.Url.includes('gitlab.com') ||
                             value.Url.includes('bitbucket.org');
            if (!isGitRepo) {
              return 'Must be a Git repository URL (GitHub, GitLab, or Bitbucket)';
            }
            return true;
          }
        }}
      />

      <PrimaryButton type="submit" text="Save Documentation" />
    </form>
  );
}
```

---

## Best Practices

### 1. Always Use Labels

```typescript
// L BAD: No label
<SPUrlField name="url1" control={control} />

//  GOOD: Clear label
<SPUrlField
  name="website"
  label="Company Website"
  control={control}
/>
```

---

### 2. Provide Helpful Placeholders

```typescript
//  GOOD: Clear guidance
<SPUrlField
  name="linkedin"
  label="LinkedIn Profile"
  control={control}
  showDescription={false}
  urlPlaceholder="https://www.linkedin.com/in/username"
/>
```

---

### 3. Validate URL Format

```typescript
//  GOOD: Proper URL validation
<SPUrlField
  name="website"
  label="Website"
  control={control}
  rules={{
    required: 'Website is required',
    validate: (value) => {
      if (!value?.Url) return 'URL is required';

      const urlPattern = /^https?:\/\/.+\..+/;
      if (!urlPattern.test(value.Url)) {
        return 'Please enter a valid URL (e.g., https://example.com)';
      }

      return true;
    }
  }}
/>
```

---

### 4. Use Description for Context

```typescript
//  GOOD: Description provides context
<SPUrlField
  name="documentUrl"
  label="Supporting Document"
  control={control}
  allowRelativeUrl
  urlPlaceholder="https://... or /sites/documents/file.pdf"
  descriptionPlaceholder="Document title"
  description="Enter a full URL or relative path to a SharePoint document"
/>
```

---

### 5. Validate Domain-Specific URLs

```typescript
//  GOOD: Domain validation
<SPUrlField
  name="githubRepo"
  label="GitHub Repository"
  control={control}
  showDescription={false}
  urlPlaceholder="https://github.com/username/repo"
  rules={{
    validate: (value) => {
      if (!value?.Url) return true;
      if (!value.Url.includes('github.com')) {
        return 'Must be a GitHub repository URL';
      }
      return true;
    }
  }}
/>
```

---

### 6. Handle Optional vs Required

```typescript
//  GOOD: Clear required field
<SPUrlField
  name="website"
  label="Company Website"
  control={control}
  rules={{
    required: 'Website is required',
    validate: (value) => {
      if (!value?.Url) return 'URL is required';
      return true;
    }
  }}
/>

//  GOOD: Optional field with conditional validation
<SPUrlField
  name="blogUrl"
  label="Blog URL (Optional)"
  control={control}
  rules={{
    validate: (value) => {
      // Only validate if URL is provided
      if (value?.Url && !value.Url.startsWith('http')) {
        return 'URL must start with http:// or https://';
      }
      return true;
    }
  }}
/>
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  SPUrlField,
  ISPUrlFieldProps,
  ISPUrlFieldValue
} from 'spfx-toolkit/lib/components/spFields/SPUrlField';

// All props are fully typed
const props: ISPUrlFieldProps = {
  name: 'website',
  label: 'Website',
  showDescription: true,
  validateUrl: true,
  allowRelativeUrl: false
};

// URL value structure
const urlValue: ISPUrlFieldValue = {
  Url: 'https://example.com',
  Description: 'Example Website'
};

// URL only (no description)
const urlOnly: ISPUrlFieldValue = {
  Url: 'https://docs.microsoft.com',
  Description: ''
};

// Validation function
const validateUrl = (value: ISPUrlFieldValue): string | true => {
  if (!value?.Url) return 'URL is required';
  if (!value.Url.startsWith('http')) {
    return 'URL must start with http:// or https://';
  }
  return true;
};
```

---

## Related Components

- **[SPTextField](../SPTextField/README.md)** - Text input fields
- **[SPChoiceField](../SPChoiceField/README.md)** - Choice and dropdown fields
- **[SPUserField](../SPUserField/README.md)** - People picker fields
- **[SPLookupField](../SPLookupField/README.md)** - Lookup fields

---

## Tree-Shaking

Always use specific imports for optimal bundle size:

```typescript
//  RECOMMENDED: Specific import
import { SPUrlField } from 'spfx-toolkit/lib/components/spFields/SPUrlField';

// L AVOID: Bulk import
import { SPUrlField } from 'spfx-toolkit';
```

---

## License

Part of [SPFx Toolkit](../../../../README.md) - MIT License

---

**Last Updated:** November 2025
