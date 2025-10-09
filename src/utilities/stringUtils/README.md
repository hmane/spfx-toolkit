# StringUtils Utility 📝

ES5-compatible string manipulation extensions and utilities specifically designed for SharePoint Framework (SPFx) applications.

## Features

- 🔤 **String Extensions** - Enhanced string methods for ES5 environments
- 📁 **File Path Operations** - Extract filenames, extensions, paths
- 🏷️ **Text Formatting** - Title case, truncate, initials generation
- 🔒 **HTML Utilities** - Escape/unescape HTML, strip tags
- 🔗 **SharePoint Helpers** - Query string parsing, list URL extraction
- ⚡ **Performance** - Optimized for SPFx bundle size
- 🎯 **TypeScript** - Full type definitions and IntelliSense

## Installation

```bash
npm install spfx-toolkit
```

## Quick Start

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

// Use utility functions
const filename = StringUtils.getFileName('/sites/mysite/Documents/file.pdf');
// "file.pdf"

const initials = StringUtils.getInitials('John Doe');
// "JD"

const truncated = StringUtils.truncate('Long text here', 10);
// "Long te..."

// Or use string extensions
import 'spfx-toolkit/lib/utilities/stringUtils';

const filename = '/sites/mysite/Documents/file.pdf'.getFileName();
const extension = 'document.pdf'.getFileExtension();
const initials = 'Jane Smith'.getInitials();
```

