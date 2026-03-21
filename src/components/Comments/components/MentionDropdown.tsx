import * as React from 'react';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import type { IPrincipal } from '../../../types/listItemTypes';

export interface IMentionDropdownProps {
  visible: boolean;
  query: string;
  targetElement: HTMLElement | null;
  preferredUsers: IPrincipal[];
  onResolveMentions?: (query: string) => Promise<IPrincipal[]>;
  onSelect: (user: IPrincipal) => void;
  onDismiss: () => void;
}

export const MentionDropdown: React.FC<IMentionDropdownProps> = React.memo((props) => {
  const { visible, query, targetElement, preferredUsers, onResolveMentions, onSelect, onDismiss } = props;

  const [directoryResults, setDirectoryResults] = React.useState<IPrincipal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Filter preferred users client-side
  const filteredPreferred = React.useMemo(() => {
    if (!query) return preferredUsers;
    const lowerQuery = query.toLowerCase();
    return preferredUsers.filter(
      (u) =>
        (u.title || '').toLowerCase().includes(lowerQuery) ||
        (u.email || '').toLowerCase().includes(lowerQuery)
    );
  }, [preferredUsers, query]);

  // Fetch directory results with debounce
  React.useEffect(() => {
    if (!onResolveMentions || !query || query.length < 2) {
      setDirectoryResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await onResolveMentions(query);
        // Filter out users already in preferred list
        const preferredEmails = new Set(preferredUsers.map((u) => u.email?.toLowerCase()));
        setDirectoryResults(results.filter((r) => !preferredEmails.has(r.email?.toLowerCase())));
      } catch {
        setDirectoryResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onResolveMentions, preferredUsers]);

  // Reset active index when results change
  React.useEffect(() => {
    setActiveIndex(0);
  }, [filteredPreferred, directoryResults]);

  const allItems = React.useMemo(() => [...filteredPreferred, ...directoryResults], [filteredPreferred, directoryResults]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && allItems.length > 0) {
        e.preventDefault();
        onSelect(allItems[activeIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, allItems, activeIndex, onSelect]);

  if (!visible || !targetElement) return null;
  if (filteredPreferred.length === 0 && directoryResults.length === 0 && !loading) return null;

  return (
    <Callout
      target={targetElement}
      onDismiss={onDismiss}
      directionalHint={DirectionalHint.bottomLeftEdge}
      isBeakVisible={false}
      gapSpace={4}
      className="spfx-comments-mention-dropdown"
    >
      <div className="spfx-comments-dropdown" role="listbox">
        {filteredPreferred.length > 0 && (
          <>
            <div className="spfx-comments-dropdown-header">Preferred</div>
            {filteredPreferred.map((user, idx) => (
              <div
                key={`preferred-${user.id || user.email}`}
                className={`spfx-comments-dropdown-item ${idx === activeIndex ? 'active' : ''}`}
                role="option"
                aria-selected={idx === activeIndex}
                onClick={() => onSelect(user)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <div className="spfx-comments-dropdown-avatar" style={{ backgroundColor: getAvatarColor(user.title || '') }}>
                  {getInitials(user.title || user.email || '')}
                </div>
                <div className="spfx-comments-dropdown-info">
                  <div className="spfx-comments-dropdown-name">{user.title || user.email}</div>
                  {user.email && <div className="spfx-comments-dropdown-email">{user.email}</div>}
                </div>
              </div>
            ))}
          </>
        )}

        {directoryResults.length > 0 && (
          <>
            <div className="spfx-comments-dropdown-header">Directory</div>
            {directoryResults.map((user, idx) => {
              const globalIdx = filteredPreferred.length + idx;
              return (
                <div
                  key={`dir-${user.id || user.email}`}
                  className={`spfx-comments-dropdown-item ${globalIdx === activeIndex ? 'active' : ''}`}
                  role="option"
                  aria-selected={globalIdx === activeIndex}
                  onClick={() => onSelect(user)}
                  onMouseEnter={() => setActiveIndex(globalIdx)}
                >
                  <div className="spfx-comments-dropdown-avatar" style={{ backgroundColor: getAvatarColor(user.title || '') }}>
                    {getInitials(user.title || user.email || '')}
                  </div>
                  <div className="spfx-comments-dropdown-info">
                    <div className="spfx-comments-dropdown-name">{user.title || user.email}</div>
                    {user.email && <div className="spfx-comments-dropdown-email">{user.email}</div>}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {loading && (
          <div className="spfx-comments-dropdown-loading">
            <Spinner size={SpinnerSize.small} label="Searching..." />
          </div>
        )}
      </div>
    </Callout>
  );
});

MentionDropdown.displayName = 'MentionDropdown';

// Simple helpers (avoid importing full utils for bundle size)
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
