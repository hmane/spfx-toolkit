import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import { MentionsInput, Mention } from 'react-mentions';
import { SPContext } from '../../../utilities/context';
import type { IPrincipal } from '../../../types/listItemTypes';
import type { ICommentLink } from '../Comments.types';
import {
  dedupeMentionPrincipals,
  getMentionPrincipalKey,
  rankMentionPrincipals,
  resolveBuiltInMentionPrincipals,
} from '../utils/mentionSearch';

const MENTION_REMOTE_SEARCH_DEBOUNCE_MS = 250;
const MIN_REMOTE_MENTION_QUERY_LENGTH = 2;

export interface ICommentInputProps {
  inputReturn: {
    text: string;
    editorValue: string;
    mentions: IPrincipal[];
    links: ICommentLink[];
    activeTrigger: '@' | '#' | null;
    triggerQuery: string;
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleEditorChange: (
      event: { target: { value: string } },
      newValue: string,
      newPlainTextValue: string,
      mentions: Array<{ id: string; display: string; childIndex: number }>
    ) => void;
    handlePaste: (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    insertMention: (user: IPrincipal) => void;
    insertLink: (link: ICommentLink) => void;
    dismissTrigger: () => void;
    inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
    resolvingUrl: boolean;
    registerMention: (user: IPrincipal) => void;
    registerLink: (link: ICommentLink) => void;
  };
  preferredUsers: IPrincipal[];
  linkSuggestions: ICommentLink[];
  onResolveMentions?: (query: string) => Promise<IPrincipal[]>;
  onResolveLinkSuggestions?: (query: string) => Promise<ICommentLink[]>;
  onPost: () => void;
  posting: boolean;
  variant?: 'classic' | 'chat' | 'compact' | 'timeline';
}

export const CommentInput: React.FC<ICommentInputProps> = React.memo((props) => {
  const {
    inputReturn,
    preferredUsers,
    linkSuggestions,
    onResolveMentions,
    onResolveLinkSuggestions,
    onPost,
    posting,
    variant = 'classic',
  } = props;

  const {
    text,
    editorValue,
    activeTrigger,
    handleKeyDown,
    handleEditorChange,
    handlePaste,
    inputRef,
    resolvingUrl,
    registerMention,
    registerLink,
  } = inputReturn;

  const handleSubmit = React.useCallback(() => {
    if (!text.trim() || posting) return;
    onPost();
  }, [text, posting, onPost]);

  const handleKeyPress = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + Enter to post
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !activeTrigger) {
        e.preventDefault();
        handleSubmit();
        return;
      }
      handleKeyDown(e);
    },
    [handleKeyDown, handleSubmit, activeTrigger]
  );

  const hasMentionTrigger = preferredUsers.length > 0 || !!onResolveMentions || SPContext.isReady();
  const hasLinkTrigger = linkSuggestions.length > 0 || !!onResolveLinkSuggestions;

  const placeholder = React.useMemo(() => {
    const parts = ['Write a comment...'];
    if (hasMentionTrigger) parts.push('@ to mention');
    if (hasLinkTrigger) parts.push('# to link');
    return parts.join(' ');
  }, [hasMentionTrigger, hasLinkTrigger]);

  const isCompact = variant === 'compact';
  const suggestionsHostRef = React.useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const isExpanded = isFocused || !!text.trim() || posting;
  const mentionRequestIdRef = React.useRef(0);
  const mentionDebounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  const resolveMentionSuggestions = React.useCallback(
    async (query: string, callback: (results: Array<{ id: string; display: string }>) => void) => {
      const normalizedQuery = query.trim().toLowerCase();
      const requestId = ++mentionRequestIdRef.current;
      const isEmptyQuery = normalizedQuery.length === 0;
      const shouldResolveTenantSearch = normalizedQuery.length >= MIN_REMOTE_MENTION_QUERY_LENGTH;

      const preferredPrincipals = rankMentionPrincipals(
        normalizedQuery
          ? preferredUsers.filter((user) => {
            if (isExcludedMentionPrincipal(user)) return false;
            const value = `${user.title || ''} ${user.email || ''} ${user.loginName || ''} ${user.jobTitle || ''}`.toLowerCase();
            return value.includes(normalizedQuery);
          })
          : preferredUsers.filter((user) => !isExcludedMentionPrincipal(user)),
        query
      );

      const preferredMatches = preferredPrincipals.map((user) => {
        registerMention(user);
        return {
          id: user.email || user.id || '',
          display: user.title || user.email || 'Unknown',
          secondaryText: getMentionSecondaryText(user),
        };
      });

      // Always show the provided user list immediately, even while a background search runs.
      callback(preferredMatches);

      if (mentionDebounceRef.current) {
        clearTimeout(mentionDebounceRef.current);
        mentionDebounceRef.current = undefined;
      }

      if (!isEmptyQuery && !shouldResolveTenantSearch) {
        return;
      }

      const loadRemoteResults = async (): Promise<void> => {
        try {
          const [customResults, builtInResults] = await Promise.all([
            onResolveMentions
              ? onResolveMentions(query).catch(() => [])
              : Promise.resolve([] as IPrincipal[]),
            resolveBuiltInMentionPrincipals(query),
          ]);

          if (requestId !== mentionRequestIdRef.current) {
            return;
          }

          const preferredKeys = new Set(preferredPrincipals.map((user) => getMentionPrincipalKey(user)).filter(Boolean));

          const mergedRemoteResults = rankMentionPrincipals(
            dedupeMentionPrincipals(customResults
              .concat(builtInResults)
              .filter((user) => !isExcludedMentionPrincipal(user))
              .filter((user) => {
                const key = getMentionPrincipalKey(user);
                return !!key && !preferredKeys.has(key);
              })),
            query
          );

          const remoteMatches = mergedRemoteResults.map((user) => {
            registerMention(user);
            return {
              id: user.email || user.id || '',
              display: user.title || user.email || 'Unknown',
              secondaryText: getMentionSecondaryText(user),
            };
          });

          callback([...preferredMatches, ...remoteMatches]);
        } catch {
          // Keep the immediate preferred list result on background-search failure.
        }
      };

      if (isEmptyQuery) {
        void loadRemoteResults();
        return;
      }

      mentionDebounceRef.current = setTimeout(() => {
        mentionDebounceRef.current = undefined;
        void loadRemoteResults();
      }, MENTION_REMOTE_SEARCH_DEBOUNCE_MS);
    },
    [onResolveMentions, preferredUsers, registerMention]
  );

  React.useEffect(() => {
    return () => {
      if (mentionDebounceRef.current) {
        clearTimeout(mentionDebounceRef.current);
      }
    };
  }, []);

  const resolveLinkSuggestions = React.useCallback(
    async (query: string, callback: (results: Array<{ id: string; display: string }>) => void) => {
      const staticMatches = (query
        ? linkSuggestions.filter((link) => link.name.toLowerCase().includes(query.toLowerCase()))
        : linkSuggestions
      ).map((link) => {
        registerLink(link);
        return {
          id: link.url,
          display: link.name,
          secondaryText: getSuggestionLinkSecondaryText(link),
          description: link.description,
          fileType: link.fileType,
        };
      });

      if (!onResolveLinkSuggestions || query.length < 1) {
        callback(staticMatches);
        return;
      }

      try {
        const remote = await onResolveLinkSuggestions(query);
        const seen = new Set(staticMatches.map((item) => item.id));
        const remoteMatches = remote
          .filter((link) => !seen.has(link.url))
          .map((link) => {
            registerLink(link);
            return {
              id: link.url,
              display: link.name,
              secondaryText: getSuggestionLinkSecondaryText(link),
              description: link.description,
              fileType: link.fileType,
            };
          });
        callback([...staticMatches, ...remoteMatches]);
      } catch {
        callback(staticMatches);
      }
    },
    [linkSuggestions, onResolveLinkSuggestions, registerLink]
  );

  const editorStyles = React.useMemo(
    () => ({
      control: {
        backgroundColor: '#fff',
        fontSize: isCompact ? 12 : 13,
        fontWeight: 400,
        minHeight: isCompact ? 30 : isExpanded ? 84 : 38,
      },
      '&multiLine': {
        control: {
          fontFamily: 'inherit',
          minHeight: isCompact ? 30 : isExpanded ? 84 : 38,
        },
        highlighter: {
          padding: isCompact ? '6px 10px' : isExpanded ? '10px 44px 32px 12px' : '8px 44px 8px 12px',
          border: 'none',
          boxSizing: 'border-box',
          overflow: 'hidden',
        },
        input: {
          padding: isCompact ? '6px 10px' : isExpanded ? '10px 44px 32px 12px' : '8px 44px 8px 12px',
          border: 'none',
          outline: 'none',
          minHeight: isCompact ? 30 : isExpanded ? 84 : 38,
          boxSizing: 'border-box',
        },
      },
      suggestions: {
        list: {
          backgroundColor: 'white',
          border: '1px solid rgba(0,0,0,0.15)',
          fontSize: 14,
        },
        item: {
          padding: '0',
          '&focused': {
            backgroundColor: 'var(--spfx-comments-primary-subtle)',
          },
        },
      },
    }),
    [isCompact, isExpanded]
  );

  return (
    <div className={`spfx-comments-input-wrap spfx-comments-input-${variant}`}>
      <div ref={suggestionsHostRef} />
      <div className={`spfx-comments-input-shell ${isCompact ? 'compact' : ''}`}>
        <div
          className={`spfx-comments-input-editor ${isCompact ? 'compact' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}
        >
          <MentionsInput
            value={editorValue}
            onChange={handleEditorChange}
            onKeyDown={handleKeyPress}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={posting}
            style={editorStyles}
            className={`spfx-comments-mentions-input ${isCompact ? 'compact' : ''}`}
            suggestionsPortalHost={suggestionsHostRef.current}
            allowSuggestionsAboveCursor={true}
            a11ySuggestionsListLabel="Comment suggestions"
            inputRef={(el) => {
              (inputRef as React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>).current = el;
            }}
          >
            <Mention
              trigger="@"
              markup="@[__display__](__id__)"
              data={resolveMentionSuggestions}
              displayTransform={(_id, display) => `@${display}`}
              appendSpaceOnAdd={true}
              className="spfx-comments-mentions-token mention"
              renderSuggestion={(suggestion, _search, highlightedDisplay, _index, focused) => (
                <div className={`spfx-comments-dropdown-item ${focused ? 'active' : ''}`}>
                  <div
                    className="spfx-comments-dropdown-avatar"
                    style={{ backgroundColor: getAvatarColor(String(suggestion.display || '')) }}
                  >
                    {getInitials(String(suggestion.display || ''))}
                  </div>
                  <div className="spfx-comments-dropdown-info">
                    <div className="spfx-comments-dropdown-name">{highlightedDisplay}</div>
                    {(suggestion as { secondaryText?: string }).secondaryText ? (
                      <div className="spfx-comments-dropdown-secondary">
                        {(suggestion as { secondaryText?: string }).secondaryText}
                      </div>
                    ) : suggestion.id ? (
                      <div className="spfx-comments-dropdown-email">{suggestion.id}</div>
                    ) : null}
                  </div>
                </div>
              )}
            />
            <Mention
              trigger="#"
              markup="#[__display__](__id__)"
              data={resolveLinkSuggestions}
              displayTransform={(_id, display) => `#${display}`}
              appendSpaceOnAdd={true}
              className="spfx-comments-mentions-token link"
              renderSuggestion={(suggestion, _search, highlightedDisplay, _index, focused) => (
                <div className={`spfx-comments-dropdown-item ${focused ? 'active' : ''}`}>
                  <div className="spfx-comments-dropdown-link-icon">
                    <Icon
                      iconName={getFileIconName(String((suggestion as { fileType?: string }).fileType || suggestion.id || ''))}
                    />
                  </div>
                  <div className="spfx-comments-dropdown-info">
                    <div className="spfx-comments-dropdown-name">{highlightedDisplay}</div>
                    {(suggestion as { secondaryText?: string }).secondaryText && (
                      <div className="spfx-comments-dropdown-secondary">
                        {(suggestion as { secondaryText?: string }).secondaryText}
                      </div>
                    )}
                    {(suggestion as { description?: string }).description && (
                      <div className="spfx-comments-dropdown-tertiary">
                        {(suggestion as { description?: string }).description}
                      </div>
                    )}
                  </div>
                </div>
              )}
            />
          </MentionsInput>
          <button
            className={`spfx-comments-post-btn ${isCompact ? 'compact' : ''}`}
            onClick={handleSubmit}
            disabled={!text.trim() || posting}
            aria-label="Post comment"
            type="button"
          >
            {posting ? <Spinner size={SpinnerSize.xSmall} /> : <Icon iconName="Send" />}
          </button>
        </div>
      </div>

      {resolvingUrl && (
        <div className="spfx-comments-resolving">
          <Spinner size={SpinnerSize.xSmall} label="Resolving URL..." />
        </div>
      )}
    </div>
  );
});

CommentInput.displayName = 'CommentInput';

function getInitials(name: string): string {
  const parts = name.split(/[\s@.]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || '?')[0].toUpperCase();
}

const AVATAR_COLORS = ['#0078d4', '#038387', '#8764b8', '#ca5010', '#498205', '#d13438', '#8e562e', '#0063b1'];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getMentionSecondaryText(user: IPrincipal): string {
  return String(user.jobTitle || user.email || '').trim();
}

function getFileIconName(value?: string): string {
  const fileType = value?.split('.').pop()?.toLowerCase();
  switch (fileType) {
    case 'xlsx':
    case 'xls':
      return 'ExcelDocument';
    case 'docx':
    case 'doc':
      return 'WordDocument';
    case 'pptx':
    case 'ppt':
      return 'PowerPointDocument';
    case 'pdf':
      return 'PDF';
    default:
      return 'Page';
  }
}

function getSuggestionLinkSecondaryText(link: ICommentLink): string {
  const rawValue = (link.secondaryText || link.url || '').trim();
  return formatSuggestionLinkPath(rawValue);
}

function formatSuggestionLinkPath(value: string): string {
  if (!value) {
    return value;
  }

  const parsed = parseUrlSafely(value);
  if (!parsed) {
    return value;
  }

  const normalizedPath = decodeURIComponent(parsed.pathname || value).replace(/\/{2,}/g, '/');
  const currentWebUrl = getCurrentWebUrl();

  if (currentWebUrl && parsed.origin === currentWebUrl.origin) {
    const currentWebPath = normalizePath(currentWebUrl.pathname);
    const path = normalizePath(normalizedPath);

    if (currentWebPath && path.indexOf(`${currentWebPath}/`) === 0) {
      return path.slice(currentWebPath.length + 1);
    }

    return path.replace(/^\/+/, '');
  }

  return `${parsed.host}${normalizedPath}`;
}

function parseUrlSafely(url: string): URL | null {
  try {
    return new URL(url, window.location.origin);
  } catch {
    try {
      return new URL(encodeURI(url), window.location.origin);
    } catch {
      return null;
    }
  }
}

function getCurrentWebUrl(): URL | null {
  try {
    const webUrl = SPContext.webAbsoluteUrl || window.location.origin;
    return new URL(webUrl, window.location.origin);
  } catch {
    return null;
  }
}

function normalizePath(path: string): string {
  if (!path) {
    return '';
  }

  return path.replace(/\/{2,}/g, '/').replace(/\/$/, '');
}

function isExcludedMentionPrincipal(user: IPrincipal): boolean {
  const values = [user.title, user.email, user.loginName]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  return values.some((value) =>
    value === 'everyone' ||
    value === 'everyone except external users' ||
    value.includes('everyone except external users') ||
    value.includes('everyone') ||
    value.includes('spo-grid-all-users')
  );
}
