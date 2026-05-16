/**
 * Type definitions for SPTextField component
 *
 * @packageDocumentation
 */

import { ISPFieldBaseProps, ISPFieldSharePointProps } from '../types';
import { IPrincipal } from '../../../types';

/**
 * Text field display modes
 */
export enum SPTextFieldMode {
  /**
   * Single line text input
   */
  SingleLine = 'singleline',

  /**
   * Multi-line textarea
   */
  MultiLine = 'multiline',

  /**
   * Rich text editor (HTML content)
   */
  RichText = 'richtext',
}

/**
 * Note history entry from SharePoint versions
 */
export interface INoteHistoryEntry {
  /**
   * Version ID/number
   */
  id: number;

  /**
   * Author who created this note
   */
  author: IPrincipal;

  /**
   * When this note was created
   */
  created: Date;

  /**
   * The note content
   */
  text: string;

  /**
   * Whether content is HTML (rich text) or plain text
   */
  isRichText: boolean;

  /**
   * SharePoint version label (e.g., "1.0", "2.0")
   */
  versionLabel?: string;
}

/**
 * Configuration for note history display
 */
export interface INoteHistoryConfig {
  /**
   * Number of entries to show initially
   * @default 5
   */
  initialDisplayCount?: number;

  /**
   * Number of additional entries to load when "Show More" is clicked
   * @default 5
   */
  loadMoreCount?: number;

  /**
   * Show "Load More" button
   * @default true
   */
  showLoadMore?: boolean;

  /**
   * @deprecated Compatibility-only. Copy-previous UI is not rendered by the
   * current note history component.
   */
  enableCopyPrevious?: boolean;

  /**
   * Time format display
   * @default 'relative'
   */
  timeFormat?: 'relative' | 'absolute' | 'both';

  /**
   * Sort order for history entries
   * @default 'desc' (newest first)
   */
  sortOrder?: 'desc' | 'asc';

  /**
   * Show SharePoint version labels (v1.0, v2.0, etc.)
   * @default false
   */
  showVersionLabel?: boolean;

  /**
   * Show user photos in history entries
   * @default true
   */
  showUserPhoto?: boolean;

  /**
   * Position of history relative to input
   * @default 'below'
   */
  position?: 'above' | 'below';

  /**
   * Custom history section title
   * @default "Previous Notes"
   */
  historyTitle?: string;

  /**
   * @deprecated Compatibility-only. Empty history currently renders no history
   * block.
   */
  emptyHistoryMessage?: string;

  /**
   * Custom render function for history entry
   */
  renderHistoryEntry?: (entry: INoteHistoryEntry) => React.ReactNode;
}

/**
 * Props for SPTextField component
 */
export interface ISPTextFieldProps extends ISPFieldBaseProps<string>, ISPFieldSharePointProps {
  /**
   * Display mode for the text field
   * @default SPTextFieldMode.SingleLine
   */
  mode?: SPTextFieldMode;

  /**
   * Maximum character length
   */
  maxLength?: number;

  /**
   * Minimum character length
   */
  minLength?: number;

  /**
   * Number of rows for multiline mode
   * @default 4
   */
  rows?: number;

  /**
   * Whether to show character count
   * @default false
   */
  showCharacterCount?: boolean;

  /**
   * Custom validation pattern (regex)
   */
  pattern?: RegExp;

  /**
   * Custom validation message for pattern mismatch
   */
  patternMessage?: string;

  /**
   * Auto-focus the field on mount
   * @default false
   */
  autoFocus?: boolean;

  /**
   * Input type for single-line mode (text, email, tel, url, etc.)
   * @default 'text'
   */
  inputType?: 'text' | 'email' | 'tel' | 'url' | 'search' | 'password';

  /**
   * Enable spell check
   * @default true
   */
  spellCheck?: boolean;

  /**
   * Auto-complete attribute
   */
  autoComplete?: string;

  /**
   * Prefix icon name (DevExtreme icon)
   */
  prefixIcon?: string;

  /**
   * Suffix icon name (DevExtreme icon)
   */
  suffixIcon?: string;

  /**
   * Show clear button
   * @default false
   */
  showClearButton?: boolean;

  /**
   * Debounce delay for onChange in milliseconds
   * @default 300
   */
  debounceDelay?: number;

  /**
   * Custom CSS class for the input element
   */
  inputClassName?: string;

  /**
   * Mask for input (DevExtreme mask format)
   */
  mask?: string;

  /**
   * Mask placeholder character
   * @default '_'
   */
  maskChar?: string;

  /**
   * Input styling mode
   * @default 'outlined'
   */
  stylingMode?: 'outlined' | 'underlined' | 'filled';

  /**
   * DevExtreme tooltip text shown on hover.
   */
  hint?: string;

  /**
   * Extra HTML attributes for the underlying `<input>`/`<textarea>` element
   * (e.g. `autoComplete`, `aria-*`). Merged with the SPTextField defaults
   * (`type`, `spellcheck`, `autoComplete`) — your values win on collision.
   */
  inputAttr?: Record<string, any>;

  /**
   * DOM tab order for the editor.
   */
  tabIndex?: number;

  /**
   * Fires when Enter is pressed inside the editor. Common pattern for
   * submit-on-Enter. The event payload is DevExtreme's raw event object.
   */
  onEnterKey?: (e: any) => void;

  /**
   * Fires on any key down. The event payload is DevExtreme's raw event object.
   */
  onKeyDown?: (e: any) => void;

  // ===== APPEND-ONLY MODE (Note Field History) =====

  /**
   * Enable append-only mode (shows version history)
   * When true, displays previous note entries below the input field
   * @default false
   */
  appendOnly?: boolean;

  /**
   * SharePoint item ID to load history from
   * Required if appendOnly is true
   */
  itemId?: number;

  /**
   * List name or ID containing the item
   * Required if appendOnly is true
   */
  listNameOrId?: string;

  /**
   * Field internal name (for version history lookup)
   * Defaults to 'name' prop if not specified
   */
  fieldInternalName?: string;

  /**
   * Configuration for history display
   */
  historyConfig?: INoteHistoryConfig;

  /**
   * Use cached versions (spCached) or always fresh (spPessimistic)
   * @default false (uses spPessimistic for fresh data)
   */
  useCacheForHistory?: boolean;

  // ===== APPEND-ONLY CALLBACKS =====

  /**
   * Fired when history is successfully loaded
   */
  onHistoryLoad?: (entries: INoteHistoryEntry[], totalCount: number) => void;

  /**
   * Fired when history loading fails
   */
  onHistoryError?: (error: Error) => void;

  /**
   * @deprecated Compatibility-only. Append-only note entry is emitted via the
   * field's normal `onChange` flow.
   */
  onNoteAdd?: (newNote: string) => void;

  /**
   * @deprecated Compatibility-only. Copy-previous UI is not rendered by the
   * current note history component.
   */
  onCopyPrevious?: (entry: INoteHistoryEntry) => void;

}
