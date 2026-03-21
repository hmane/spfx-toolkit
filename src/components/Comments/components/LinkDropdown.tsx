import * as React from 'react';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import type { ICommentLink } from '../Comments.types';

export interface ILinkDropdownProps {
  visible: boolean;
  query: string;
  targetElement: HTMLElement | null;
  linkSuggestions: ICommentLink[];
  onResolveLinkSuggestions?: (query: string) => Promise<ICommentLink[]>;
  onSelect: (link: ICommentLink) => void;
  onDismiss: () => void;
}

export const LinkDropdown: React.FC<ILinkDropdownProps> = React.memo((props) => {
  const { visible, query, targetElement, linkSuggestions, onResolveLinkSuggestions, onSelect, onDismiss } = props;

  const [dynamicResults, setDynamicResults] = React.useState<ICommentLink[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Filter static suggestions client-side
  const filteredStatic = React.useMemo(() => {
    if (!query) return linkSuggestions;
    const lowerQuery = query.toLowerCase();
    return linkSuggestions.filter(
      (l) => l.name.toLowerCase().includes(lowerQuery) || l.url.toLowerCase().includes(lowerQuery)
    );
  }, [linkSuggestions, query]);

  // Fetch dynamic results with debounce
  React.useEffect(() => {
    if (!onResolveLinkSuggestions || !query || query.length < 2) {
      setDynamicResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await onResolveLinkSuggestions(query);
        const staticUrls = new Set(linkSuggestions.map((l) => l.url));
        setDynamicResults(results.filter((r) => !staticUrls.has(r.url)));
      } catch {
        setDynamicResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onResolveLinkSuggestions, linkSuggestions]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [filteredStatic, dynamicResults]);

  const allItems = React.useMemo(() => [...filteredStatic, ...dynamicResults], [filteredStatic, dynamicResults]);

  // Group items by group property
  const groupedItems = React.useMemo(() => {
    const groups: Map<string, ICommentLink[]> = new Map();
    for (const item of allItems) {
      const group = item.group || 'Suggested';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(item);
    }
    return groups;
  }, [allItems]);

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
  if (allItems.length === 0 && !loading) return null;

  let globalIdx = 0;

  return (
    <Callout
      target={targetElement}
      onDismiss={onDismiss}
      directionalHint={DirectionalHint.bottomLeftEdge}
      isBeakVisible={false}
      gapSpace={4}
      className="spfx-comments-link-dropdown"
    >
      <div className="spfx-comments-dropdown" role="listbox">
        {Array.from(groupedItems.entries()).map(([groupName, items]) => (
          <React.Fragment key={groupName}>
            <div className="spfx-comments-dropdown-header">{groupName}</div>
            {items.map((link) => {
              const idx = globalIdx++;
              return (
                <div
                  key={`link-${link.url}`}
                  className={`spfx-comments-dropdown-item ${idx === activeIndex ? 'active' : ''}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  onClick={() => onSelect(link)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <div className="spfx-comments-dropdown-link-icon">
                    <Icon iconName={getFileIconName(link.fileType)} />
                  </div>
                  <div className="spfx-comments-dropdown-info">
                    <div className="spfx-comments-dropdown-name">{link.name}</div>
                    <div className="spfx-comments-dropdown-email">{truncateUrl(link.url)}</div>
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}

        {loading && (
          <div className="spfx-comments-dropdown-loading">
            <Spinner size={SpinnerSize.small} label="Searching..." />
          </div>
        )}
      </div>
    </Callout>
  );
});

LinkDropdown.displayName = 'LinkDropdown';

function getFileIconName(fileType?: string): string {
  switch (fileType?.toLowerCase()) {
    case 'xlsx': case 'xls': return 'ExcelDocument';
    case 'docx': case 'doc': return 'WordDocument';
    case 'pptx': case 'ppt': return 'PowerPointDocument';
    case 'pdf': return 'PDF';
    case 'jpg': case 'jpeg': case 'png': case 'gif': return 'FileImage';
    default: return 'Page';
  }
}

function truncateUrl(url: string, maxLen = 50): string {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 3) + '...';
}
