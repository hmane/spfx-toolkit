/**
 * Comments Component - Type Definitions
 *
 * Reuses IPrincipal from toolkit types for user representation.
 * All IDs are numeric to match SharePoint comment API responses.
 */

import type * as React from 'react';
import type { IPrincipal } from '../../types/listItemTypes';

// ─── Layout Types ───

export type CommentLayout = 'classic' | 'chat' | 'compact' | 'timeline';

// ─── Link Types ───

export interface ICommentLink {
  /** Display name for the link */
  name: string;
  /** Full URL */
  url: string;
  /** Optional secondary text for dropdown display */
  secondaryText?: string;
  /** Optional tertiary text for dropdown display */
  description?: string;
  /** File extension hint (e.g., 'xlsx', 'docx', 'pdf') */
  fileType?: string;
  /** Group header in dropdown (e.g., 'Recent Documents', 'Pinned') */
  group?: string;
}

// ─── Comment Types ───

export interface IComment {
  /** Comment ID from SharePoint */
  id: number;
  /** Raw text from SP (contains @mention{N} tokens and link encoding) */
  text: string;
  /** Author as IPrincipal */
  author: IPrincipal;
  /** Mentions in this comment */
  mentions: IPrincipal[];
  /** Links in this comment (parsed from encoded text) */
  links: ICommentLink[];
  /** Creation date */
  createdDate: Date;
  /** Like count */
  likeCount: number;
  /** Whether current user has liked this comment */
  isLiked: boolean;
}

// ─── System Event Types (Timeline Layout) ───

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

// ─── Parsed Comment Segment Types ───

export type CommentSegmentType = 'text' | 'mention' | 'link';

export interface ICommentSegment {
  type: CommentSegmentType;
  /** Plain text content (for 'text' segments) */
  text?: string;
  /** Mention index into IComment.mentions array */
  mentionIndex?: number;
  /** Link index into IComment.links array */
  linkIndex?: number;
}

// ─── SP API Response Types ───

export interface ISPCommentResponse {
  id: number | string;
  text: string;
  author: {
    email: string;
    id: number;
    isActive: boolean;
    isExternal: boolean;
    jobTitle: string;
    loginName: string;
    name: string;
    principalType: number;
    userId: { nameId: string; nameIdIssuer: string } | null;
  };
  createdDate: string;
  likeCount: number;
  isLiked?: boolean;
  isLikedByUser?: boolean;
  mentions: ISPMentionResponse[] | { results?: ISPMentionResponse[] } | null;
}

export interface ISPMentionResponse {
  email: string;
  name: string;
  id?: number;
  loginName?: string;
}

export interface ISPCommentsResponse {
  value: ISPCommentResponse[];
}

// ─── Component Props ───

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
   * Results are appended after the built-in resolver when provided.
   * Without a custom resolver, the component uses the same Graph query pattern as
   * PnP ListItemComments for non-preferred users.
   */
  onResolveMentions?: (query: string) => Promise<IPrincipal[]>;

  // ─── # Link Configuration ───

  /**
   * Static list of link suggestions shown when user types #.
   */
  linkSuggestions?: ICommentLink[];

  /**
   * Custom resolver for # link search.
   * Called as user types after #. If not provided, only static linkSuggestions are used.
   */
  onResolveLinkSuggestions?: (query: string) => Promise<ICommentLink[]>;

  /**
   * Auto-resolve pasted SharePoint URLs to document/page names.
   * @default true
   */
  enableLinkResolution?: boolean;

  // ─── Layout ───

  /**
   * Layout variant.
   * @default 'classic'
   */
  layout?: CommentLayout;

  // ─── Display ───

  /** Number of comments per page */
  numberCommentsPerPage?: 5 | 10 | 15 | 20;

  /** Comment ID to visually highlight (scroll-to + highlight animation) */
  highlightedCommentId?: number;

  /**
   * Sort order for comments
   * @default 'newest'
   */
  sortOrder?: 'newest' | 'oldest';

  /**
   * Enable search bar above comments
   * @default true
   */
  enableSearch?: boolean;

  /**
   * Enable document preview when clicking # links (via DocumentLink component).
   * @default true
   */
  enableDocumentPreview?: boolean;

  /**
   * Collapse long comments and show a "Read more" toggle.
   * Applied to classic/chat/timeline layouts.
   * @default true
   */
  enableCommentCollapse?: boolean;

  /**
   * Maximum visible lines before showing "Read more".
   * @default 8
   */
  collapsedMaxLines?: number;

  /** Label displayed above the component */
  label?: string;

  /**
   * Confirm before deleting a comment.
   * @default true
   */
  confirmDelete?: boolean;

  /** Confirmation dialog title for comment deletion */
  deleteConfirmationTitle?: React.ReactNode;

  /** Confirmation dialog body for comment deletion */
  deleteConfirmationMessage?: React.ReactNode;

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
   * Ignored in other layouts.
   */
  systemEvents?: ISystemEvent[];
}

// ─── Internal State Types ───

export interface ICommentsState {
  comments: IComment[];
  loading: boolean;
  error: Error | null;
  totalCount: number;
  currentPage: number;
  posting: boolean;
  /** Whether more comments exist beyond the current page */
  hasMore: boolean;
}

// ─── Hook Return Types ───

export interface IUseCommentsReturn {
  state: ICommentsState;
  addComment: (text: string, mentions: IPrincipal[], links: ICommentLink[]) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
  likeComment: (commentId: number) => Promise<void>;
  unlikeComment: (commentId: number) => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  loadCommentById: (commentId: number) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export interface IUseCommentInputReturn {
  text: string;
  editorValue: string;
  setText: (text: string) => void;
  mentions: IPrincipal[];
  links: ICommentLink[];
  activeTrigger: '@' | '#' | null;
  triggerQuery: string;
  triggerPosition: { top: number; left: number } | null;
  insertMention: (user: IPrincipal) => void;
  insertLink: (link: ICommentLink) => void;
  dismissTrigger: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleEditorChange: (
    event: { target: { value: string } },
    newValue: string,
    newPlainTextValue: string,
    mentions: Array<{ id: string; display: string; childIndex: number }>
  ) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  reset: () => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  resolvingUrl: boolean;
  registerMention: (user: IPrincipal) => void;
  registerLink: (link: ICommentLink) => void;
  /** Builds submit-ready text by replacing display labels with placeholder tokens */
  getSubmitText: () => string;
  /** Returns submit text + only the mentions/links still present in the text */
  getSubmitData: () => { submitText: string; activeMentions: IPrincipal[]; activeLinks: ICommentLink[] };
}

export interface IUseCommentSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  filteredComments: IComment[];
  matchCount: number;
  totalCount: number;
  clearSearch: () => void;
}

// ─── Defaults ───

export const COMMENTS_DEFAULTS = {
  layout: 'classic' as CommentLayout,
  numberCommentsPerPage: 10 as const,
  sortOrder: 'newest' as const,
  enableSearch: true,
  enableDocumentPreview: true,
  enableLinkResolution: true,
  enableCommentCollapse: true,
  collapsedMaxLines: 8,
  confirmDelete: true,
  deleteConfirmationTitle: 'Delete comment?',
  deleteConfirmationMessage: 'This comment will be permanently removed.',
};
