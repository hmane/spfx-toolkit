# Comments Component — Requirements Document

## 1. Overview

A production-ready, customizable comments component for SharePoint list items that replaces and extends the PnP `ListItemComments` control. Built entirely with existing toolkit utilities and peer dependencies — **zero new dependencies**.

### 1.1 Goals

- Replace PnP `ListItemComments` with a fully extensible alternative
- Support `@` mentions with preferred user lists and SharePoint notifications
- Support `#` link references with document URL preview modal
- Auto-resolve pasted SharePoint URLs to document names
- Provide multiple layout variants for different use cases
- Fix known PnP issues: special character handling, text selection/copy
- Client-side search across loaded/paginated comments (not server-side full-text search)
- Reuse existing toolkit components and utilities

### 1.2 Non-Goals

- Rich text editing (deferred — SP comment API has ~4KB text limit)
- File attachments (deferred — requires separate storage strategy)
- Reply threads (deferred — SP comment API is flat)
- Real-time/live updates (deferred — would require polling)

---

## 2. Component API

### 2.1 Props Interface

```typescript
export interface ICommentsProps {
  /** SharePoint list GUID */
  listId: string;

  /** List item ID */
  itemId: number;

  // ─── @ Mention Configuration ───

  /**
   * Preferred users shown first in @ mention dropdown.
   * These appear under a "Preferred" header before directory search results.
   */
  preferredUsers?: IPrincipal[];

  /**
   * Optional custom resolver for @ mention search.
   * Results are merged with the built-in resolver when available.
   * Without a custom resolver, the component uses built-in Graph/PeoplePicker search.
   *
   * Example custom resolver:
   *   onResolveMentions={async (query) => {
   *     const users = await customDirectory.searchUsers(query);
   *     return users.map(u => ({ id: u.mail, email: u.mail, title: u.displayName }));
   *   }}
   */
  onResolveMentions?: (query: string) => Promise<IPrincipal[]>;

  // ─── # Link Configuration ───

  /**
   * Static list of link suggestions shown when user types #.
   * Displayed under a "Suggested" header in the dropdown.
   */
  linkSuggestions?: ICommentLink[];

  /**
   * Custom resolver for # link search.
   * Called as user types after #. If not provided, only static linkSuggestions are used.
   */
  onResolveLinkSuggestions?: (query: string) => Promise<ICommentLink[]>;

  /**
   * Auto-resolve pasted SharePoint URLs to document/page names.
   * Uses SPContext to call GetFileByServerRelativeUrl.
   * @default true
   */
  enableLinkResolution?: boolean;

  // ─── Layout ───

  /**
   * Layout variant.
   * - 'classic': Traditional list view (PnP-compatible look)
   * - 'chat': Teams/Slack-style chat bubbles
   * - 'compact': Dense single-line rows, expandable on click
   * - 'timeline': Vertical timeline with system event support
   * @default 'classic'
   */
  layout?: CommentLayout;

  // ─── Display ───

  /** Number of comments per page */
  numberCommentsPerPage?: 5 | 10 | 15 | 20;

  /** Comment ID to visually highlight (scroll-to + highlight animation) */
  highlightedCommentId?: number;

  /** Sort order for comments
   * @default 'newest'
   */
  sortOrder?: 'newest' | 'oldest';

  /** Enable search bar above comments
   * @default true
   */
  enableSearch?: boolean;

  /** Enable document preview modal when clicking # links
   * @default true
   */
  enableDocumentPreview?: boolean;

  /**
   * Label displayed above the component
   */
  label?: string;

  // ─── Callbacks ───

  /** Fired after a comment is successfully posted */
  onCommentAdded?: (comment: IComment) => void;

  /** Fired after a comment is deleted */
  onCommentDeleted?: (commentId: number) => void;

  /** Fired after a comment is liked/unliked */
  onCommentLiked?: (commentId: number, isLiked: boolean) => void;

  /** Fired when a user is @mentioned in a new comment */
  onMentioned?: (user: IPrincipal) => void;

  /** Fired when a # link is added to a comment */
  onLinkAdded?: (link: ICommentLink) => void;

  /** Fired on any error */
  onError?: (error: Error) => void;

  // ─── Styling ───

  /** Additional CSS class */
  className?: string;

  // ─── Timeline-specific ───

  /**
   * System events to display in timeline layout.
   * These render as distinct system entries (status changes, approvals, etc.)
   * Ignored in other layouts.
   */
  systemEvents?: ISystemEvent[];
}
```

### 2.2 Type Definitions

```typescript
export type CommentLayout = 'classic' | 'chat' | 'compact' | 'timeline';

/**
 * IPrincipal — REUSED from src/types/listItemTypes.ts (already exists in toolkit)
 *
 * interface IPrincipal {
 *   id: string;
 *   email?: string;
 *   title?: string;        // display name
 *   value?: string;         // login name
 *   loginName?: string;     // alternative to value
 *   department?: string;
 *   jobTitle?: string;
 *   sip?: string;
 *   picture?: string;
 * }
 *
 * Used for: preferredUsers, onResolveMentions, and author on IComment.
 * Maps to SP mentions as: { email: principal.email, name: principal.title }
 */

export interface ICommentLink {
  /** Display name for the link */
  name: string;
  /** Full URL */
  url: string;
  /** Optional: file extension icon hint (e.g., 'xlsx', 'docx', 'pdf') */
  fileType?: string;
  /** Optional: group header in dropdown (e.g., 'Recent Documents', 'Pinned') */
  group?: string;
}

export interface IComment {
  /** Comment ID from SharePoint */
  id: number;
  /** Raw text from SP (contains @mention{N} and #link{N} tokens) */
  text: string;
  /** Author as IPrincipal (reused from toolkit types) */
  author: IPrincipal;
  /** Mentions in this comment (as IPrincipal array) */
  mentions: IPrincipal[];
  /** Links in this comment (custom, not from SP) */
  links: ICommentLink[];
  /** Creation date */
  createdDate: Date;
  /** Like count */
  likeCount: number;
  /** Whether current user has liked this comment */
  isLiked: boolean;
}

export interface ISystemEvent {
  /** Unique ID */
  id: string;
  /** Event text (can contain HTML like <strong>) */
  text: string;
  /** Timestamp */
  date: Date;
  /** Event type affects visual styling */
  type: 'info' | 'success' | 'warning' | 'error';
}
```

---

## 3. Features — Detailed Specifications

### 3.1 Core Comments (CRUD)

| Operation | SharePoint API | Details |
|-----------|---------------|---------|
| **Load** | `GET _api/web/lists('{listId}')/items({itemId})/Comments?$top={n}&$skip={offset}` | Paginated, returns comments with mentions array |
| **Add** | `POST _api/web/lists('{listId}')/items({itemId})/Comments()` | Body: `{ text, mentions }` — triggers SP notifications |
| **Delete** | `POST _api/web/lists('{listId}')/items({itemId})/Comments({commentId})/DeleteComment()` | Only comment author or list admin |
| **Like** | `POST _api/web/lists('{listId}')/items({itemId})/Comments({commentId})/Like()` | Toggle like for current user |
| **Unlike** | `POST _api/web/lists('{listId}')/items({itemId})/Comments({commentId})/Unlike()` | Toggle unlike for current user |

**API calls use `SPContext.sp`** — no direct fetch calls. All operations go through the existing PnP SP instance.

### 3.2 @ Mentions

**Input Behavior:**
1. User types `@` in comment input
2. Fluent UI `Callout` opens below the cursor position
3. Dropdown shows:
   - **"Preferred"** section: `preferredUsers` prop (always shown first, filtered by query)
   - **"Directory"** section: Built-in Graph/PeoplePicker results, merged with `onResolveMentions` (if provided)
   - If no preferred or directory matches are found, the dropdown stays hidden
4. User selects a person → `@DisplayName` chip inserted in input
5. Typing after `@` filters preferred list locally; tenant-wide directory search starts at 2+ characters with debounce

**Note:** Built-in directory search prefers Graph (`me/people` for bare `@`, `/users` for typed search) and falls back to PeoplePicker search when Graph is unavailable or returns no typed results.

**Storage Format:**
- Text: `"Hello @mention{0}, please review"`
- Mentions array: `[{ email: "user@contoso.com", name: "User Name" }]`
- This is the native SP format — notifications work automatically

**Rendering:**
- Parse `@mention&#123;N&#125;` tokens from SP response using regex
- Render each mention using the existing **`UserPersona`** component from the toolkit
- Props: `userIdentifier={email}`, `displayName={principal.title}`, `size={24}`, `displayMode="avatarAndName"`, `showLivePersona={true}`
- `showLivePersona={true}` enables the rich hover card (job title, email, org chart) via the Office LivePersona card
- Without `showLivePersona`, UserPersona renders only the avatar + name inline (no hover card)

### 3.3 # Links

**Input Behavior:**
1. User types `#` in comment input
2. Callout opens showing `linkSuggestions` (grouped by `group` if provided)
3. Typing after `#` filters suggestions
4. If `onResolveLinkSuggestions` provided, calls it for dynamic results
5. User selects a link → `#DocumentName` chip inserted in input

**Paste Detection (SharePoint URLs):**
1. User pastes a URL into the comment input
2. Component detects SharePoint URL pattern: `*.sharepoint.com/*`
3. If `enableLinkResolution` is true:
   - Shows inline loading indicator next to the pasted URL
   - Calls `SPContext.sp.web.getFileByServerRelativePath(decodedPath)` imperatively (plain async function, NOT the `useDocumentMetadata` hook — that hook has React lifecycle semantics that don't fit an imperative paste handler)
   - On success: replaces raw URL with resolved link chip (name from API response)
   - On failure: keeps the raw URL as plain clickable text
4. Non-SharePoint URLs displayed as plain clickable text

**Storage Format — REQUIRES VALIDATION SPIKE:**

The SP comment API does not natively support links. Before implementing, a spike must verify which encoding survives the save/load round-trip. Test in this order of preference:

1. **Option A (preferred):** HTML comment appended to text:
   `"Review #link{0}<!--links:[{\"name\":\"Budget.xlsx\",\"url\":\"https://...\"}]-->"`
   - Invisible in raw display, structured, easy to parse
   - **Risk:** SP may strip HTML comments from comment text

2. **Option B (fallback):** Inline markdown-style encoding:
   `"Review [Budget.xlsx](https://contoso.sharepoint.com/...)"`
   - Human-readable even if parser fails
   - Parse with regex on render
   - **Risk:** Parentheses/brackets may get entity-encoded

3. **Option C (safe fallback):** Plain URL with custom delimiter:
   `"Review #link{0}||Budget.xlsx|https://contoso.sharepoint.com/...||"`
   - Ugly in raw text but guaranteed to survive (only alphanumeric + URL chars)
   - Least elegant but most robust

**Spike deliverable:** POST a comment with each format, GET it back, compare. Pick whichever survives intact. This spike MUST complete before implementing `commentFormatter.ts` and `commentParser.ts`.

**If no format survives:** Fall back to storing only the raw URL in comment text (no name resolution), and resolve the display name at render time using `useDocumentMetadata`.

**Rendering:**
- Parse link tokens using whichever encoding the validation spike selects (`#link{N}`, markdown `[name](url)`, or delimiter-based)
- Render each resolved link using the existing **`DocumentLink`** component from the toolkit
- DocumentLink provides: file type icon, hover card with metadata, preview modal
- Props: `documentUrl={link.url}`, `layout="linkWithIcon"`, `onClick="preview"`, `previewTarget="modal"`

### 3.4 Document Preview — Reusing DocumentLink Component

**No custom modal needed.** The existing `DocumentLink` component handles everything:

| Feature | DocumentLink provides |
|---------|----------------------|
| File type icon | `DocumentIcon` — auto-detects from file extension |
| Hover card | Rich popup with metadata, created/modified by (using UserPersona), version info, download button |
| Preview modal | Full iframe preview for Office docs (Word, Excel, PPT) via WopiFrame |
| URL resolution | `useDocumentMetadata` hook — fetches file name, size, author from SP |
| Download | Built-in download action |
| Caching | Map-based cache with request deduplication |

**Usage in CommentText rendering:**
```typescript
import { DocumentLink } from '../DocumentLink';

// For each #link{N} token, render:
// enableDocumentPreview prop from ICommentsProps controls click behavior
<DocumentLink
  documentUrl={link.url}
  layout="linkWithIcon"
  onClick={enableDocumentPreview ? 'preview' : undefined}
  previewTarget={enableDocumentPreview ? 'modal' : 'newTab'}
  enableHoverCard={true}
  className="comment-link-chip"
/>
```

**Paste Detection uses an imperative SP API call (NOT the hook):**
```typescript
import { SPContext } from '../../utilities/context';

// When user pastes a SharePoint URL (inside an async paste handler):
async function resolveSpUrl(url: string): Promise<{ name: string; url: string } | null> {
  try {
    const serverRelativePath = new URL(url).pathname;
    const file = await SPContext.sp.web.getFileByServerRelativePath(serverRelativePath)();
    return { name: file.Name, url };
  } catch {
    return null; // URL not resolvable — keep as plain text
  }
}
// If resolved → insert as #link chip with file.Name
```

This eliminates the need for a custom `DocumentLinkModal.tsx` and `urlResolver.ts`.

### 3.5 Search

**Location:** Below the comment input, above the comment list (in all layouts)

**Implementation:** Fluent UI `SearchBox` (from `@fluentui/react/lib/SearchBox`)

**Scope:** Client-side only — filters the currently loaded/paginated set, not all server-side comments.

**Behavior:**
- Client-side filtering across loaded comments
- Filters by: comment text, `author.title`, `mentions[].title`, `links[].name`
- Shows match count: "3 of 12 loaded comments"
- Real-time filtering as user types (debounced 200ms)
- Clear button resets search
- In compact layout: hides non-matching rows and their expanded panels
- Search highlight: matching text gets yellow background highlight

### 3.6 Special Character Handling

**Problem:** PnP component mangles `<`, `>`, `&`, `"`, `'` and other special chars.

**Solution:**
- On save: Properly encode special characters before sending to SP API
- On load: Decode HTML entities (`&amp;` → `&`, `&lt;` → `<`, etc.)
- Use toolkit's existing `htmlUtils` (HTML sanitization) and `stringUtils.escapeHtml()`
- Prevent XSS: Sanitize rendered HTML, only allow whitelisted tags for link rendering

### 3.7 Text Selection / Copy

**Problem:** PnP component blocks text selection via CSS or event handling.

**Solution:**
- All comment text containers have `user-select: text`
- Click handlers on comment rows use `event.target` checks to avoid capturing text selection clicks
- No `preventDefault()` on mousedown/mouseup in text areas

---

## 4. Layout Specifications

### 4.1 Classic Layout (`layout="classic"`)

**Purpose:** Drop-in replacement for PnP ListItemComments.

**Structure (top to bottom):**
1. Comment input (textarea + Post button + avatar)
2. Search bar
3. Comment list (avatar | name + timestamp | text | like/delete)
4. Pagination bar

**Visual Details:**
- Each comment: avatar (36px) left, content right
- Header: username (bold) + timestamp (gray)
- Text: full comment with UserPersona chips and link chips
- Actions: like button (heart icon + count) + delete button (visible on hover)
- Divider: 1px border between comments
- Hover: subtle background highlight

### 4.2 Chat Layout (`layout="chat"`)

**Purpose:** Modern Teams/Slack-style conversation.

**Structure:**
1. Chat input (rounded input + send button)
2. Search bar
3. Messages grouped by day ("Today", "Yesterday", "Mar 15")
4. Current user's messages right-aligned (blue bubble)
5. Other users' messages left-aligned (gray bubble) with avatar + name

**Visual Details:**
- Bubbles with rounded corners (12px, 4px on sender side)
- Day dividers: horizontal line with centered date text
- Reactions: small rounded pills below bubbles (emoji + count)
- Timestamp below message text (11px, gray)

### 4.3 Compact Layout (`layout="compact"`)

**Purpose:** Side panels, dashboards, space-constrained views.

**Structure:**
1. Compact input (small avatar + inline input + Post button)
2. Search bar
3. Single-line comment rows (avatar 24px | truncated text | username | timestamp | like)
4. Click to expand: full comment text + actions

**Visual Details:**
- Each row ~36px height
- Text truncated with ellipsis
- Click reveals expanded panel below with full text + timestamp + delete
- Like count always visible (compact)

### 4.4 Timeline Layout (`layout="timeline"`)

**Purpose:** Audit trails, approval workflows, document review tracking.

**Structure:**
1. Input area (avatar on timeline rail + textarea)
2. Search bar
3. Timeline entries: vertical rail with avatar/icon nodes
4. Mixed content: user comments + system events

**Visual Details:**
- Vertical 2px line on the left
- User comments: avatar on rail, comment box to the right
- System events: icon on rail (info/success/warning/error), colored box to the right
  - Info: yellow background, yellow border
  - Success: green background, green border
  - Warning: orange
  - Error: red
- `systemEvents` prop provides the system entries, interleaved with comments by date

---

## 5. Reused Toolkit Components & Utilities

| Need | Toolkit Module | Import Path (relative) |
|------|---------------|----------------------|
| SP API calls | `SPContext` | `../../utilities/context` |
| PnP SP instance | `SPContext.sp` | Via SPContext |
| Directory search | Built-in + optional custom merge | Graph/PeoplePicker via `SPContext`, merged with `onResolveMentions` when provided |
| User display in mentions | `UserPersona` | `../UserPersona` |
| Document link rendering | `DocumentLink` | `../DocumentLink` |
| Document metadata fetching | `useDocumentMetadata` | `../DocumentLink` |
| User/principal type | `IPrincipal` | `../../types/listItemTypes` |
| Date formatting | `DateUtils` | `../../utilities/dateUtils` |
| String operations | `StringUtils` | `../../utilities/stringUtils` |
| HTML sanitization | `htmlUtils` | `../../utilities/htmlUtils` |
| Error handling | `ErrorBoundary` | `../ErrorBoundary` |
| Permission checks | `PermissionHelper` | `../../utilities/permissionHelper` |
| Persistent drafts | `useLocalStorage` | `../../hooks/useLocalStorage` |
| Responsive layout | `useViewport` | `../../hooks/useViewport` |
| Logging | `SPContext.logger` | Via SPContext |
| User photos | `userPhotoHelper` | `../../utilities/userPhotoHelper` |

### Fluent UI Components (tree-shakable imports)

| Component | Import |
|-----------|--------|
| `Callout` | `@fluentui/react/lib/Callout` |
| `Dialog` | `@fluentui/react/lib/Dialog` |
| `SearchBox` | `@fluentui/react/lib/SearchBox` |
| `IconButton` | `@fluentui/react/lib/Button` |
| `Spinner` | `@fluentui/react/lib/Spinner` |
| `Icon` | `@fluentui/react/lib/Icon` |
| `TextField` | `@fluentui/react/lib/TextField` |
| `Persona` | `@fluentui/react/lib/Persona` |
| `Text` | `@fluentui/react/lib/Text` |
| `Stack` | `@fluentui/react/lib/Stack` |

---

## 6. File Structure

```
src/components/Comments/
├── index.ts                        # Main exports
├── Comments.tsx                    # Entry component (layout router)
├── Comments.types.ts               # All type definitions (reuses IPrincipal from ../../types)
├── Comments.css                    # All styles (plain CSS, CSS variables)
├── hooks/
│   ├── index.ts
│   ├── useComments.ts              # Core CRUD hook (load, add, delete, like)
│   ├── useCommentInput.ts          # Input state, trigger detection (@/#), paste handling
│   └── useCommentSearch.ts         # Search filtering logic
├── components/
│   ├── index.ts
│   ├── CommentInput.tsx            # Shared input with trigger dropdowns
│   ├── CommentText.tsx             # Parses & renders text (UserPersona for @, DocumentLink for #)
│   ├── CommentActions.tsx          # Like/delete action buttons
│   ├── MentionDropdown.tsx         # @ mention suggestion Callout
│   ├── LinkDropdown.tsx            # # link suggestion Callout
│   ├── CommentSearch.tsx           # Search bar wrapper
│   ├── ClassicLayout.tsx           # Classic layout renderer
│   ├── ChatLayout.tsx              # Chat layout renderer
│   ├── CompactLayout.tsx           # Compact layout renderer
│   └── TimelineLayout.tsx          # Timeline layout renderer
├── utils/
│   ├── index.ts
│   ├── commentParser.ts            # Parse @mention{N} and #link{N} tokens
│   └── commentFormatter.ts         # Format comment for SP API (encode tokens)
└── README.md                       # Component documentation
```

---

## 7. Data Flow

### 7.1 Posting a Comment

```
User types comment with @John and #Budget.xlsx
  → CommentInput detects triggers, shows dropdowns
  → User selects mention and link
  → Input state: { text: "Review @John Doe #Budget.xlsx", mentions: [...], links: [...] }

User clicks Post
  → useComments.addComment() called
  → commentFormatter encodes:
      text: "Review @mention{0} #link{0}...(link encoding per spike result)"
      mentions: [{ email: "john@contoso.com", name: "John Doe" }]  // name mapped from IPrincipal.title
  → SPContext.sp POST to /Comments()
  → SharePoint sends email notification to John Doe
  → onCommentAdded callback fired
  → Comment list refreshed
```

### 7.2 Loading & Rendering Comments

```
Component mounts
  → useComments.loadComments() called
  → SPContext.sp GET /Comments?$top=N&$skip=0
  → Response contains: text with @mention&#123;0&#125; tokens + mentions array
  → commentParser extracts:
      - Mention tokens (@mention&#123;N&#125;) → mapped to IPrincipal via mentions array
      - Link tokens → parsed using whichever encoding the spike validated
      - HTML entities decoded (&amp; → &, &lt; → <, etc.)
      - Special characters properly handled
  → CommentText renders:
      - Plain text segments
      - UserPersona components for mentions
      - Link chips for # references
  → Text is selectable (user-select: text)
```

### 7.3 Search Flow

```
User types in search bar
  → 200ms debounce
  → useCommentSearch filters currently loaded comments (paginated set only)
  → Matches against: text, author.title, mentions[].title, links[].name
  → Results count displayed: "3 of 12 loaded comments"
  → Non-matching comments hidden (CSS display:none)
  → Matching text highlighted with <mark> tags

NOTE: Search operates on the currently loaded page of comments only.
It does NOT search across all comments on the server. If the user needs
a specific older comment, they paginate to load more, then search filters
within that loaded set. This is a deliberate scope limitation — server-side
full-text search across SP comments is not supported by the REST API.
```

---

## 8. Error Handling

| Scenario | Behavior |
|----------|----------|
| SPContext not initialized | Show message: "SPContext must be initialized before using Comments" |
| Failed to load comments | Show error message with retry button, fire `onError` |
| Failed to post comment | Show error toast, keep draft in input, fire `onError` |
| Failed to delete comment | Show error toast, fire `onError` |
| Failed to resolve SP URL | Fall back to displaying raw URL |
| User has no permission to comment | Hide input area, show read-only view |
| User has no permission to delete | Hide delete button for that comment |
| Network error | Show offline indicator, queue action for retry |

All errors logged via `SPContext.logger.error()`.

---

## 9. Accessibility

- Full keyboard navigation: Tab through comments, Enter to expand/like, Escape to close dropdowns
- ARIA labels on all interactive elements
- Screen reader support for mention and link chips
- Focus management when dropdowns open/close
- High contrast mode support via Fluent UI theme
- Minimum touch target size (44px) for mobile

---

## 10. Performance

- Pagination: Only load N comments at a time (default 10)
- Memoization: `React.memo` on comment rows, `React.useCallback` on handlers
- Debounced search: 200ms debounce on search input
- Cached user profiles: UserPersona handles its own caching
- Lazy dropdowns: Mention/link Callouts only mount when triggered
- CSS transitions: Hardware-accelerated (transform, opacity only)

---

## 11. Bundle Impact

**Estimated addition:** ~15-25KB (minified, before gzip)

- Component code: ~12KB
- CSS: ~5KB
- No new dependencies added
- All Fluent UI imports are tree-shakable

---

## 12. Usage Examples

### Basic Usage (Classic Layout)
```typescript
import { Comments } from 'spfx-toolkit/lib/components/Comments';

<Comments
  listId="00000000-0000-0000-0000-000000000000"
  itemId={42}
/>
```

### With Preferred Users and Links
```typescript
<Comments
  listId={listId}
  itemId={itemId}
  preferredUsers={[
    { id: '1', email: 'sarah@contoso.com', title: 'Sarah Mitchell', jobTitle: 'PM' },
    { id: '2', email: 'john@contoso.com', title: 'John Doe', jobTitle: 'Analyst' },
  ]}
  linkSuggestions={[
    { name: 'Budget 2026.xlsx', url: 'https://contoso.sharepoint.com/...', fileType: 'xlsx', group: 'Finance' },
    { name: 'Project Plan.docx', url: 'https://contoso.sharepoint.com/...', fileType: 'docx', group: 'Planning' },
  ]}
  onCommentAdded={(comment) => console.log('Posted:', comment)}
  onError={(error) => console.error('Comments error:', error)}
/>
```

### Chat Layout
```typescript
<Comments
  listId={listId}
  itemId={itemId}
  layout="chat"
  preferredUsers={teamMembers}
  numberCommentsPerPage={20}
/>
```

### Compact Layout (Side Panel)
```typescript
<Comments
  listId={listId}
  itemId={itemId}
  layout="compact"
  numberCommentsPerPage={15}
  enableSearch={true}
/>
```

### Timeline Layout (Approval Workflow)
```typescript
<Comments
  listId={listId}
  itemId={itemId}
  layout="timeline"
  systemEvents={[
    { id: '1', text: 'Status changed to <strong>In Review</strong>', date: new Date(), type: 'info' },
    { id: '2', text: 'Approved by <strong>John Doe</strong>', date: new Date(), type: 'success' },
  ]}
  preferredUsers={approvers}
/>
```
