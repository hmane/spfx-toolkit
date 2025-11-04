# StringUtils Utility 📝

ES5-compatible string manipulation extensions and utilities specifically designed for SharePoint Framework (SPFx) applications. Provides powerful string operations through both static utility methods and String prototype extensions.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [String Formatting](#string-formatting)
  - [File Path Operations](#file-path-operations)
  - [Text Formatting](#text-formatting)
  - [HTML Utilities](#html-utilities)
  - [SharePoint Helpers](#sharepoint-helpers)
  - [CAML XML Utilities](#caml-xml-utilities)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- 🔤 **String Extensions** - Enhanced string methods for ES5 environments
- 📁 **File Path Operations** - Extract filenames, extensions, paths
- 🏷️ **Text Formatting** - Title case, truncate, initials generation
- 🔒 **HTML Utilities** - Escape/unescape HTML, strip tags
- 🔗 **SharePoint Helpers** - Query string parsing, list URL extraction
- 📋 **CAML XML** - Compact CAML query formatting
- ⚡ **Performance** - Optimized for SPFx bundle size
- 🎯 **TypeScript** - Full type definitions and IntelliSense
- 📦 **Zero Dependencies** - Only uses SPFx peer dependencies
- 🔧 **Two Usage Modes** - Static methods or prototype extensions

---

## Installation

```bash
npm install spfx-toolkit
```

---

## Quick Start

### Static Methods (Recommended for Production)

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

// File path operations
const filename = StringUtils.getFileName('/sites/mysite/Documents/file.pdf');
// "file.pdf"

const extension = StringUtils.getFileExtension('document.pdf');
// ".pdf"

// Text formatting
const initials = StringUtils.getInitials('John Doe');
// "JD"

const titleCase = StringUtils.toTitleCase('hello world');
// "Hello World"

const truncated = StringUtils.truncate('Long text here', 10);
// "Long te..."

// HTML safety
const escaped = StringUtils.escapeHtml('<script>alert("xss")</script>');
// "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"

// SharePoint utilities
const params = StringUtils.getQueryStringMap('?id=123&name=test');
// { id: '123', name: 'test' }
```

### String Prototype Extensions (For Convenience)

```typescript
import 'spfx-toolkit/lib/utilities/stringUtils';

// Extensions are automatically applied
const filename = '/sites/mysite/Documents/file.pdf'.getFileName();
// "file.pdf"

const extension = 'document.pdf'.getFileExtension();
// ".pdf"

const initials = 'Jane Smith'.getInitials();
// "JS"

const titleCase = 'hello world'.toTitleCase();
// "Hello World"

const formatted = 'Hello, {0}! You have {1} messages.'.format('Alice', 5);
// "Hello, Alice! You have 5 messages."
```

---

## API Reference

### String Formatting

#### `format(str: string, ...args: any[]): string`

Format string using placeholders `{0}`, `{1}`, etc.

**Static Method:**
```typescript
StringUtils.format('Hello, {0}! You have {1} new messages.', 'Alice', 5);
// "Hello, Alice! You have 5 new messages."

StringUtils.format('Order #{0} total: ${1}', 12345, 99.99);
// "Order #12345 total: $99.99"

StringUtils.format('{0} + {1} = {2}', 5, 3, 8);
// "5 + 3 = 8"
```

**String Extension:**
```typescript
'Hello, {0}! You have {1} new messages.'.format('Alice', 5);
// "Hello, Alice! You have 5 new messages."

'Item {0} of {1}'.format(currentIndex + 1, totalItems);
// "Item 3 of 10"
```

**Use Cases:**
- Templating dynamic text
- Error messages with variable data
- UI labels with placeholders
- Logging with context data

---

#### `replaceAll(str: string, searchValue: string | RegExp, replaceValue: string): string`

Replace all occurrences of a string or regex pattern (ES5 compatible).

**Static Method:**
```typescript
StringUtils.replaceAll('hello world hello', 'hello', 'hi');
// "hi world hi"

StringUtils.replaceAll('foo-bar-baz', '-', '_');
// "foo_bar_baz"

StringUtils.replaceAll('test123test456', /\d+/g, 'X');
// "testXtestX"
```

**String Extension:**
```typescript
'hello world hello'.replaceAll('hello', 'hi');
// "hi world hi"

'path/to/file.txt'.replaceAll('/', '\\');
// "path\to\file.txt"
```

**Use Cases:**
- String sanitization
- Path normalization
- Find and replace in templates
- Character escaping

---

### File Path Operations

#### `getFileName(str: string): string`

Extract filename from a file path or URL.

**Static Method:**
```typescript
StringUtils.getFileName('/sites/mysite/Documents/file.pdf');
// "file.pdf"

StringUtils.getFileName('C:\\Users\\Documents\\report.docx');
// "report.docx"

StringUtils.getFileName('https://contoso.sharepoint.com/Documents/file.pdf');
// "file.pdf"

StringUtils.getFileName('file.pdf');
// "file.pdf"
```

**String Extension:**
```typescript
'/sites/mysite/Documents/file.pdf'.getFileName();
// "file.pdf"

'C:\\Folder\\Subfolder\\document.docx'.getFileName();
// "document.docx"
```

**Use Cases:**
- Display file names in UI
- Extract filename from SharePoint URLs
- File upload validation
- Document library views

---

#### `getFileExtension(str: string): string`

Get file extension including the dot.

**Static Method:**
```typescript
StringUtils.getFileExtension('document.pdf');
// ".pdf"

StringUtils.getFileExtension('/path/to/file.docx');
// ".docx"

StringUtils.getFileExtension('image.png');
// ".png"

StringUtils.getFileExtension('no-extension');
// ""
```

**String Extension:**
```typescript
'document.pdf'.getFileExtension();
// ".pdf"

'photo.jpeg'.getFileExtension();
// ".jpeg"
```

**Use Cases:**
- File type validation
- Icon selection based on extension
- Filter files by type
- File categorization

---

#### `getFileNameWithoutExtension(str: string): string`

Get filename without extension.

**Static Method:**
```typescript
StringUtils.getFileNameWithoutExtension('document.pdf');
// "document"

StringUtils.getFileNameWithoutExtension('/path/to/report.docx');
// "report"

StringUtils.getFileNameWithoutExtension('my.file.with.dots.txt');
// "my.file.with.dots"
```

**String Extension:**
```typescript
'document.pdf'.getFileNameWithoutExtension();
// "document"

'/sites/docs/annual-report.docx'.getFileNameWithoutExtension();
// "annual-report"
```

**Use Cases:**
- Display clean file names
- File renaming operations
- Search/filter by base name
- Title extraction from files

---

### Text Formatting

#### `toTitleCase(str: string): string`

Convert string to Title Case (capitalize first letter of each word).

**Static Method:**
```typescript
StringUtils.toTitleCase('hello world');
// "Hello World"

StringUtils.toTitleCase('the quick brown fox');
// "The Quick Brown Fox"

StringUtils.toTitleCase('HELLO WORLD');
// "Hello World"

StringUtils.toTitleCase('jOhN dOe');
// "John Doe"
```

**String Extension:**
```typescript
'hello world'.toTitleCase();
// "Hello World"

'sharepoint framework toolkit'.toTitleCase();
// "Sharepoint Framework Toolkit"
```

**Use Cases:**
- Format user names
- Display list titles
- Headers and labels
- Proper noun formatting

---

#### `truncate(str: string, length: number, suffix?: string): string`

Truncate string to specified length with optional suffix.

**Static Method:**
```typescript
StringUtils.truncate('Very long text here', 10);
// "Very lo..."

StringUtils.truncate('Short', 10);
// "Short"

StringUtils.truncate('Custom suffix example', 15, '…');
// "Custom suffix…"

StringUtils.truncate('No suffix', 5, '');
// "No su"
```

**String Extension:**
```typescript
'Very long text here'.truncate(10);
// "Very lo..."

'This is a long description'.truncate(20, ' [more]');
// "This is a lon [more]"
```

**Use Cases:**
- List item descriptions
- Preview text
- Table cell content
- Search result snippets

**Parameters:**
- `length` - Maximum length **including** the suffix
- `suffix` - Text to append (default: `'...'`)

---

#### `getInitials(str: string, maxInitials?: number): string`

Generate initials from a name or text.

**Static Method:**
```typescript
StringUtils.getInitials('John Doe');
// "JD"

StringUtils.getInitials('John Doe Smith');
// "JD" (default: 2 initials)

StringUtils.getInitials('John Doe Smith', 3);
// "JDS"

StringUtils.getInitials('alice');
// "A"

StringUtils.getInitials('Multi  Word   Name'); // Handles extra spaces
// "MW"
```

**String Extension:**
```typescript
'John Doe'.getInitials();
// "JD"

'John Doe Smith'.getInitials(3);
// "JDS"
```

**Use Cases:**
- User avatars
- Persona components
- Name badges
- User identification

---

#### `formatFileSize(str: string): string`

Format a byte value as human-readable file size.

**Static Method:**
```typescript
StringUtils.formatFileSize('1536000');
// "1.46 MB"

StringUtils.formatFileSize('1024');
// "1 KB"

StringUtils.formatFileSize('1073741824');
// "1 GB"

StringUtils.formatFileSize('512');
// "512 Bytes"

StringUtils.formatFileSize('0');
// "0 Bytes"
```

**String Extension:**
```typescript
'1536000'.formatFileSize();
// "1.46 MB"

const fileSize = item.File_x0020_Size.toString();
fileSize.formatFileSize();
// "2.5 MB"
```

**Use Cases:**
- Document library views
- File upload displays
- Storage quota displays
- File property panels

---

### HTML Utilities

#### `escapeHtml(str: string): string`

Escape HTML entities in string (XSS protection).

**Static Method:**
```typescript
StringUtils.escapeHtml('<script>alert("xss")</script>');
// "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"

StringUtils.escapeHtml('5 < 10 & 10 > 5');
// "5 &lt; 10 &amp; 10 &gt; 5"

StringUtils.escapeHtml('<a href="link">Click</a>');
// "&lt;a href=&quot;link&quot;&gt;Click&lt;/a&gt;"
```

**String Extension:**
```typescript
'<script>alert("xss")</script>'.escapeHtml();
// "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"

const userInput = '<b>Bold text</b>';
userInput.escapeHtml();
// "&lt;b&gt;Bold text&lt;/b&gt;"
```

**Use Cases:**
- User input sanitization
- XSS prevention
- Safe display of user-generated content
- Form data handling

**Security Note:** Always escape user input before rendering in HTML!

---

#### `unescapeHtml(str: string): string`

Unescape HTML entities in string.

**Static Method:**
```typescript
StringUtils.unescapeHtml('&lt;b&gt;Bold&lt;/b&gt;');
// "<b>Bold</b>"

StringUtils.unescapeHtml('5 &lt; 10 &amp; 10 &gt; 5');
// "5 < 10 & 10 > 5"

StringUtils.unescapeHtml('&quot;Hello&quot;');
// '"Hello"'
```

**String Extension:**
```typescript
'&lt;b&gt;Bold&lt;/b&gt;'.unescapeHtml();
// "<b>Bold</b>"

'Tom &amp; Jerry'.unescapeHtml();
// "Tom & Jerry"
```

**Use Cases:**
- Parse SharePoint field values
- Process encoded data
- Restore original text
- Form pre-population

---

#### `stripHtml(str: string): string`

Remove all HTML tags from string.

**Static Method:**
```typescript
StringUtils.stripHtml('<p>Hello <b>world</b></p>');
// "Hello world"

StringUtils.stripHtml('<div><span>Nested</span> content</div>');
// "Nested content"

StringUtils.stripHtml('<a href="link">Click here</a>');
// "Click here"
```

**String Extension:**
```typescript
'<p>Hello <b>world</b></p>'.stripHtml();
// "Hello world"

const richText = '<div>Content with <strong>formatting</strong></div>';
richText.stripHtml();
// "Content with formatting"
```

**Use Cases:**
- Extract plain text from rich text fields
- Search indexing
- Email plain text versions
- Preview text generation

---

#### `highlightText(str: string, searchTerm: string, className?: string): string`

Highlight search term in text with HTML markup.

**Static Method:**
```typescript
StringUtils.highlightText('Hello world', 'world');
// "Hello <span class=\"highlight\">world</span>"

StringUtils.highlightText('Search in text', 'search', 'search-hit');
// "<span class=\"search-hit\">Search</span> in text"

StringUtils.highlightText('Case insensitive HELLO', 'hello');
// "Case insensitive <span class=\"highlight\">HELLO</span>"
```

**String Extension:**
```typescript
'Hello world'.highlightText('world');
// "Hello <span class=\"highlight\">world</span>"

'Find this keyword'.highlightText('keyword', 'match');
// "Find this <span class=\"match\">keyword</span>"
```

**Use Cases:**
- Search result highlighting
- Filter indicators
- Keyword emphasis
- Search-as-you-type UI

**CSS Example:**
```css
.highlight {
  background-color: yellow;
  font-weight: bold;
}
```

---

### SharePoint Helpers

#### `getSPListUrl(str: string): string`

Convert relative SharePoint list URL to full site-relative URL.

**Static Method:**
```typescript
// Assuming site: /sites/mysite
StringUtils.getSPListUrl('Lists/MyList');
// "sites/mysite/Lists/MyList"

StringUtils.getSPListUrl('/Lists/Documents');
// "sites/mysite/Lists/Documents"

// Root site
StringUtils.getSPListUrl('Shared Documents');
// "Shared Documents"
```

**String Extension:**
```typescript
'Lists/MyList'.getSPListUrl();
// "sites/mysite/Lists/MyList"

'/Shared Documents'.getSPListUrl();
// "sites/mysite/Shared Documents"
```

**Use Cases:**
- Build SharePoint URLs
- Navigation links
- List/library references
- Breadcrumb trails

**Requirements:**
- Requires `_spPageContextInfo` to be available
- Works in SharePoint classic and modern pages

---

#### `getQueryStringMap(str: string): { [key: string]: string }`

Parse query string into key-value pairs object.

**Static Method:**
```typescript
StringUtils.getQueryStringMap('?param1=value1&param2=value2');
// { param1: 'value1', param2: 'value2' }

StringUtils.getQueryStringMap('id=123&name=test');
// { id: '123', name: 'test' }

StringUtils.getQueryStringMap('?search=hello%20world');
// { search: 'hello world' } (auto URL-decoded)

StringUtils.getQueryStringMap('https://site.com?a=1&b=2');
// { a: '1', b: '2' }
```

**String Extension:**
```typescript
'?param1=value1&param2=value2'.getQueryStringMap();
// { param1: 'value1', param2: 'value2' }

window.location.search.getQueryStringMap();
// { /* current page query params */ }
```

**Use Cases:**
- Parse URL parameters
- Read filter values
- Navigation state
- Deep linking

---

#### `getQueryStringValue(str: string, key: string): string | undefined`

Get specific query string parameter value by key.

**Static Method:**
```typescript
StringUtils.getQueryStringValue('?id=123&name=test', 'id');
// "123"

StringUtils.getQueryStringValue('param1=value1&param2=value2', 'param2');
// "value2"

StringUtils.getQueryStringValue('?search=hello', 'missing');
// undefined

StringUtils.getQueryStringValue('?filter=status%3Dactive', 'filter');
// "status=active" (URL-decoded)
```

**String Extension:**
```typescript
'?id=123&name=test'.getQueryStringValue('id');
// "123"

window.location.search.getQueryStringValue('itemId');
// "42" (if URL contains ?itemId=42)
```

**Use Cases:**
- Read specific URL parameter
- Get item ID from URL
- Filter detection
- Feature flags

---

### CAML XML Utilities

#### `toCompactCaml(str: string): string`

Convert multiline CAML XML to compact single-line format while preserving quoted values and text content.

**Static Method:**
```typescript
const multilineCaml = `
  <View>
    <Where>
      <Eq>
        <FieldRef Name='Status' />
        <Value Type='Text'>Active</Value>
      </Eq>
    </Where>
  </View>
`;

StringUtils.toCompactCaml(multilineCaml);
// "<View><Where><Eq><FieldRef Name='Status' /><Value Type='Text'>Active</Value></Eq></Where></View>"
```

**String Extension:**
```typescript
const camlQuery = `
  <View>
    <Query>
      <Where>
        <And>
          <Eq>
            <FieldRef Name='ContentType' />
            <Value Type='Text'>Document</Value>
          </Eq>
          <Contains>
            <FieldRef Name='Title' />
            <Value Type='Text'>Important</Value>
          </Contains>
        </And>
      </Where>
      <OrderBy>
        <FieldRef Name='Modified' Ascending='FALSE' />
      </OrderBy>
    </Query>
    <ViewFields>
      <FieldRef Name='Title' />
      <FieldRef Name='Modified' />
    </ViewFields>
  </View>
`.toCompactCaml();
```

**Use Cases:**
- CAML query optimization
- Reduce payload size
- Improve readability in code
- SharePoint REST/CSOM queries

**Preserves:**
- Quoted attribute values with spaces (e.g., `Name='Field Name'`)
- Text content between tags
- All semantic XML structure

**Removes:**
- Whitespace between tags
- Line breaks and indentation
- Unnecessary spaces
- Formatting whitespace

---

## Usage Patterns

### Pattern 1: Static Methods (Production)

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

class MyComponent {
  public render() {
    const filename = StringUtils.getFileName(this.props.filePath);
    const initials = StringUtils.getInitials(this.props.userName);

    return (
      <div>
        <h2>{StringUtils.toTitleCase(filename)}</h2>
        <div className="avatar">{initials}</div>
      </div>
    );
  }
}
```

**Advantages:**
- No prototype pollution
- Clear import tracking
- Better tree-shaking
- Easier testing

---

### Pattern 2: String Extensions (Convenience)

```typescript
import 'spfx-toolkit/lib/utilities/stringUtils';

class MyComponent {
  public render() {
    const filename = this.props.filePath.getFileName();
    const initials = this.props.userName.getInitials();

    return (
      <div>
        <h2>{filename.toTitleCase()}</h2>
        <div className="avatar">{initials}</div>
      </div>
    );
  }
}
```

**Advantages:**
- Method chaining
- Cleaner syntax
- Less verbose
- Fluent API

---

### Pattern 3: Hybrid Approach

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';
import 'spfx-toolkit/lib/utilities/stringUtils'; // Enable extensions

// Use static for complex operations
const params = StringUtils.getQueryStringMap(window.location.search);

// Use extensions for simple chaining
const display = params.title?.toTitleCase().truncate(50) || 'Untitled';
```

---

## Complete Examples

### Example 1: Document Library Custom View

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';
import * as React from 'react';

interface IDocumentItem {
  FileLeafRef: string;
  File_x0020_Size: number;
  Author: { Title: string };
  Modified: string;
}

const DocumentList: React.FC<{ items: IDocumentItem[] }> = ({ items }) => {
  return (
    <div className="document-list">
      {items.map((item, index) => {
        const filename = StringUtils.getFileName(item.FileLeafRef);
        const extension = StringUtils.getFileExtension(filename);
        const nameWithoutExt = StringUtils.getFileNameWithoutExtension(filename);
        const fileSize = StringUtils.formatFileSize(item.File_x0020_Size.toString());
        const authorInitials = StringUtils.getInitials(item.Author.Title);

        return (
          <div key={index} className="document-item">
            <div className="doc-icon" data-extension={extension}>
              {extension}
            </div>
            <div className="doc-details">
              <div className="doc-name" title={filename}>
                {StringUtils.truncate(nameWithoutExt, 30)}
              </div>
              <div className="doc-meta">
                <span className="file-size">{fileSize}</span>
                <span className="author">{authorInitials}</span>
                <span className="modified">{new Date(item.Modified).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

---

### Example 2: Search Highlighting

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

function SearchResults({ results, searchTerm }: { results: any[], searchTerm: string }) {
  return (
    <div className="search-results">
      {results.map(result => {
        // Escape user input for safe HTML display
        const safeSearchTerm = StringUtils.escapeHtml(searchTerm);

        // Highlight in title
        const highlightedTitle = StringUtils.highlightText(
          result.Title,
          searchTerm,
          'search-highlight'
        );

        // Strip HTML and highlight in description
        const plainDescription = StringUtils.stripHtml(result.Description);
        const highlightedDescription = StringUtils.highlightText(
          StringUtils.truncate(plainDescription, 200),
          searchTerm,
          'search-highlight'
        );

        return (
          <div key={result.ID} className="search-result">
            <h3 dangerouslySetInnerHTML={{ __html: highlightedTitle }} />
            <p dangerouslySetInnerHTML={{ __html: highlightedDescription }} />
            <div className="meta">
              {StringUtils.getInitials(result.Author)} • {result.Modified}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

### Example 3: URL Parameter Handling

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

class FilterableListView {
  private getFiltersFromUrl(): { [key: string]: string } {
    const queryString = window.location.search;
    const params = StringUtils.getQueryStringMap(queryString);

    return {
      status: params.status || 'All',
      category: params.category || 'All',
      search: params.search || ''
    };
  }

  private applyFilters(items: any[]): any[] {
    const filters = this.getFiltersFromUrl();

    return items.filter(item => {
      // Status filter
      if (filters.status !== 'All' && item.Status !== filters.status) {
        return false;
      }

      // Category filter
      if (filters.category !== 'All' && item.Category !== filters.category) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = item.Title.toLowerCase().includes(searchLower);
        const descMatch = (item.Description || '').toLowerCase().includes(searchLower);
        return titleMatch || descMatch;
      }

      return true;
    });
  }

  public render() {
    const filters = this.getFiltersFromUrl();
    const filteredItems = this.applyFilters(this.props.items);

    return (
      <div>
        <div className="active-filters">
          {Object.entries(filters).map(([key, value]) => {
            if (value && value !== 'All') {
              return (
                <span key={key} className="filter-chip">
                  {StringUtils.toTitleCase(key)}: {value}
                </span>
              );
            }
            return null;
          })}
        </div>
        <div className="items">
          {/* Render filtered items */}
        </div>
      </div>
    );
  }
}
```

---

### Example 4: CAML Query Builder

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

class CamlQueryBuilder {
  public static buildActiveDocumentsQuery(searchText?: string): string {
    let camlQuery = `
      <View>
        <Query>
          <Where>
            ${searchText ? `
            <And>
              <Eq>
                <FieldRef Name='Status' />
                <Value Type='Text'>Active</Value>
              </Eq>
              <Contains>
                <FieldRef Name='Title' />
                <Value Type='Text'>${searchText}</Value>
              </Contains>
            </And>
            ` : `
            <Eq>
              <FieldRef Name='Status' />
              <Value Type='Text'>Active</Value>
            </Eq>
            `}
          </Where>
          <OrderBy>
            <FieldRef Name='Modified' Ascending='FALSE' />
          </OrderBy>
        </Query>
        <ViewFields>
          <FieldRef Name='Title' />
          <FieldRef Name='Modified' />
          <FieldRef Name='Author' />
          <FieldRef Name='FileLeafRef' />
        </ViewFields>
        <RowLimit>100</RowLimit>
      </View>
    `;

    // Compact the CAML for better performance
    return StringUtils.toCompactCaml(camlQuery);
  }

  public async getDocuments(listTitle: string, searchText?: string) {
    const camlQuery = this.buildActiveDocumentsQuery(searchText);

    const items = await sp.web.lists.getByTitle(listTitle)
      .getItemsByCAMLQuery({
        ViewXml: camlQuery
      });

    return items;
  }
}
```

---

### Example 5: User Display Name Formatting

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

interface IUserInfo {
  displayName: string;
  email: string;
}

class UserDisplay {
  public static formatUserName(user: IUserInfo, format: 'full' | 'initials' | 'title' = 'full'): string {
    switch (format) {
      case 'initials':
        return StringUtils.getInitials(user.displayName);

      case 'title':
        return StringUtils.toTitleCase(user.displayName);

      case 'full':
      default:
        return user.displayName;
    }
  }

  public static getUserAvatar(user: IUserInfo): React.ReactElement {
    const initials = StringUtils.getInitials(user.displayName);
    const displayName = StringUtils.toTitleCase(user.displayName);

    return (
      <div className="user-avatar" title={displayName}>
        <div className="initials">{initials}</div>
      </div>
    );
  }

  public static formatUserList(users: IUserInfo[], maxDisplay: number = 3): string {
    if (users.length === 0) return 'No users';
    if (users.length === 1) return StringUtils.toTitleCase(users[0].displayName);

    if (users.length <= maxDisplay) {
      const names = users.map(u => StringUtils.toTitleCase(u.displayName));
      return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    }

    const displayedNames = users.slice(0, maxDisplay).map(u => StringUtils.toTitleCase(u.displayName));
    const remaining = users.length - maxDisplay;
    return `${displayedNames.join(', ')} and ${remaining} ${remaining === 1 ? 'other' : 'others'}`;
  }
}

// Usage
const users = [
  { displayName: 'john doe', email: 'john@contoso.com' },
  { displayName: 'jane smith', email: 'jane@contoso.com' },
  { displayName: 'bob wilson', email: 'bob@contoso.com' },
  { displayName: 'alice brown', email: 'alice@contoso.com' }
];

UserDisplay.formatUserList(users, 2);
// "John Doe, Jane Smith and 2 others"
```

---

### Example 6: Safe User Input Display

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

class CommentDisplay {
  public static renderComment(commentHtml: string, maxLength: number = 300): string {
    // 1. Unescape HTML entities from SharePoint
    const unescaped = StringUtils.unescapeHtml(commentHtml);

    // 2. Strip HTML tags to get plain text
    const plainText = StringUtils.stripHtml(unescaped);

    // 3. Truncate for preview
    const truncated = StringUtils.truncate(plainText, maxLength);

    // 4. Escape for safe HTML display
    const safe = StringUtils.escapeHtml(truncated);

    return safe;
  }

  public static formatCommentForEdit(commentHtml: string): string {
    // Prepare SharePoint rich text for editing
    return StringUtils.unescapeHtml(commentHtml);
  }

  public static formatCommentForSave(userInput: string): string {
    // Sanitize user input before saving to SharePoint
    // Note: SharePoint will handle additional encoding
    return StringUtils.escapeHtml(userInput);
  }
}

// Usage in React component
function CommentCard({ comment }: { comment: any }) {
  const safeComment = CommentDisplay.renderComment(comment.Body);
  const authorInitials = StringUtils.getInitials(comment.Author.Title);

  return (
    <div className="comment-card">
      <div className="comment-author">
        <div className="avatar">{authorInitials}</div>
        <div className="name">{StringUtils.toTitleCase(comment.Author.Title)}</div>
      </div>
      <div className="comment-body" dangerouslySetInnerHTML={{ __html: safeComment }} />
    </div>
  );
}
```

---

## Best Practices

### 1. Security: Always Escape User Input

```typescript
// ❌ DANGEROUS: XSS vulnerability
const displayName = `<div>${userInput}</div>`;

// ✅ SAFE: Escaped HTML
const displayName = `<div>${StringUtils.escapeHtml(userInput)}</div>`;
```

---

### 2. Performance: Use Static Methods in Loops

```typescript
// ❌ BAD: Extensions may have slight overhead
items.forEach(item => {
  const name = item.FileLeafRef.getFileName().toTitleCase();
});

// ✅ GOOD: Static methods for better performance
items.forEach(item => {
  const filename = StringUtils.getFileName(item.FileLeafRef);
  const name = StringUtils.toTitleCase(filename);
});
```

---

### 3. Null Safety: Check for Empty Strings

```typescript
// ✅ GOOD: All StringUtils methods handle empty strings safely
const result = StringUtils.getFileName(''); // Returns ''
const initials = StringUtils.getInitials(''); // Returns ''
const truncated = StringUtils.truncate(null, 10); // Returns null
```

---

### 4. Tree-Shaking: Use Specific Imports

```typescript
// ✅ RECOMMENDED: Tree-shakable import
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

// ❌ AVOID: Bulk import
import { StringUtils } from 'spfx-toolkit';
```

---

### 5. Type Safety: Use TypeScript Types

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

// ✅ GOOD: Fully typed
const params: { [key: string]: string } = StringUtils.getQueryStringMap(window.location.search);
const filename: string = StringUtils.getFileName(filePath);
const initials: string = StringUtils.getInitials(userName);
```

---

### 6. CAML Queries: Use Template Literals

```typescript
// ✅ GOOD: Readable multiline CAML, then compact
const camlQuery = `
  <View>
    <Where>
      <Eq>
        <FieldRef Name='Status' />
        <Value Type='Text'>Active</Value>
      </Eq>
    </Where>
  </View>
`.toCompactCaml();

// ❌ BAD: Hard to read and maintain
const camlQuery = "<View><Where><Eq><FieldRef Name='Status' /><Value Type='Text'>Active</Value></Eq></Where></View>";
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';
import type { StringExtensionMethod } from 'spfx-toolkit/lib/utilities/stringUtils';

// All methods are fully typed
const filename: string = StringUtils.getFileName('/path/to/file.pdf');
const params: { [key: string]: string } = StringUtils.getQueryStringMap('?a=1&b=2');
const initials: string = StringUtils.getInitials('John Doe');

// String extension methods are also typed
const result: string = 'hello world'.toTitleCase();
const truncated: string = 'long text'.truncate(10);
```

**Type Exports:**
```typescript
// StringExtensionMethod type
type Method = StringExtensionMethod;
// 'format' | 'replaceAll' | 'getFileName' | 'getFileExtension' | ...
```

---

## Tree-Shaking

Always use specific imports for optimal bundle size:

```typescript
// ✅ RECOMMENDED: Specific import (tree-shakable)
import { StringUtils } from 'spfx-toolkit/lib/utilities/stringUtils';

// ❌ AVOID: Main package import
import { StringUtils } from 'spfx-toolkit';
```

---

## Related Utilities

- **[DateUtils](../dateUtils/README.md)** - Date formatting and operations
- **[ListItemHelper](../listItemHelper/README.md)** - SharePoint field extraction
- **[PermissionHelper](../permissionHelper/README.md)** - Permission validation

---

## Browser Compatibility

- ✅ ES5 compatible (IE11+)
- ✅ SharePoint Framework 1.21.1+
- ✅ Modern browsers (Chrome, Edge, Firefox, Safari)

---

## License

Part of [SPFx Toolkit](../../../README.md) - MIT License

---

**Last Updated:** November 2025
