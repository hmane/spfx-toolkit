/**
 * useCommentInput Hook
 *
 * Manages comment input state with a scan-on-submit design:
 * - `text` is always the display text (what the user sees in the textarea)
 * - `mentions` and `links` are append-only registries of inserted items
 * - On submit, `getSubmitText()` scans the current text for display labels
 *   that match registered mentions/links, replaces them with placeholder tokens,
 *   and returns only the mentions/links that are actually still present.
 *
 * This avoids all sync issues: if the user deletes or edits a mention/link
 * in the textarea, it simply won't match at submit time and gets dropped.
 * Duplicate labels are handled by consuming matches one-by-one.
 */

import * as React from 'react';
import { SPContext } from '../../../utilities/context';
import type { IPrincipal } from '../../../types/listItemTypes';
import type { ICommentLink, IUseCommentInputReturn } from '../Comments.types';
import { resolveSharePointUrl } from '../utils/commentFormatter';

interface UseCommentInputOptions {
  enableLinkResolution: boolean;
  onMentioned?: (user: IPrincipal) => void;
  onLinkAdded?: (link: ICommentLink) => void;
}

/**
 * Build the display label for a mention.
 */
function mentionLabel(user: IPrincipal): string {
  return `@${user.title || user.email || 'Unknown'}`;
}

/**
 * Build the display label for a link.
 */
function linkLabel(link: ICommentLink): string {
  return `#${link.name}`;
}

export function useCommentInput(options: UseCommentInputOptions): IUseCommentInputReturn {
  const { enableLinkResolution, onMentioned, onLinkAdded } = options;

  const [text, setTextState] = React.useState('');
  const [editorValue, setEditorValue] = React.useState('');
  const [mentions, setMentions] = React.useState<IPrincipal[]>([]);
  const [links, setLinks] = React.useState<ICommentLink[]>([]);
  const [activeTrigger, setActiveTrigger] = React.useState<'@' | '#' | null>(null);
  const [triggerQuery, setTriggerQuery] = React.useState('');
  const [triggerPosition, setTriggerPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [resolvingUrl, setResolvingUrl] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const triggerStartRef = React.useRef<number>(-1);
  const mentionRegistryRef = React.useRef<Record<string, IPrincipal>>({});
  const linkRegistryRef = React.useRef<Record<string, ICommentLink>>({});

  const getMentionKey = React.useCallback((id: string, display: string) => `${id}::${display}`, []);
  const getLinkKey = React.useCallback((id: string, display: string) => `${id}::${display}`, []);

  const registerMention = React.useCallback(
    (user: IPrincipal) => {
      const id = user.email || user.id || user.loginName || '';
      const display = user.title || user.email || 'Unknown';
      mentionRegistryRef.current[getMentionKey(id, display)] = user;
    },
    [getMentionKey]
  );

  const registerLink = React.useCallback(
    (link: ICommentLink) => {
      const id = link.url;
      const display = link.name;
      linkRegistryRef.current[getLinkKey(id, display)] = link;
    },
    [getLinkKey]
  );

  const setText = React.useCallback((value: string) => {
    setTextState(value);
    setEditorValue(value);
  }, []);

  /**
   * Scan the current text and produce submit-ready output.
   *
   * For each registered mention/link, finds its display label in the text.
   * Each label occurrence is consumed exactly once (handles duplicates).
   * Labels not found are dropped — they were edited/deleted by the user.
   *
   * Returns: { submitText, activeMentions, activeLinks }
   */
  const getSubmitData = React.useCallback((): {
    submitText: string;
    activeMentions: IPrincipal[];
    activeLinks: ICommentLink[];
  } => {
    const activeMentions: IPrincipal[] = [];
    const activeLinks: ICommentLink[] = [];
    const tokenRegex = /([@#])\[([^\]]+)\]\(([^)]+)\)/g;
    let submitText = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(editorValue)) !== null) {
      submitText += editorValue.slice(lastIndex, match.index);
      const trigger = match[1];
      const display = match[2];
      const id = match[3];

      if (trigger === '@') {
        const user =
          mentionRegistryRef.current[getMentionKey(id, display)] || {
            id,
            email: id,
            title: display,
          };
        const mentionIndex = activeMentions.length;
        activeMentions.push(user);
        submitText += `\x01M${mentionIndex}\x01`;
      } else {
        const link =
          linkRegistryRef.current[getLinkKey(id, display)] || {
            name: display,
            url: id,
            fileType: id.split('.').pop()?.toLowerCase() || '',
          };
        const linkIndex = activeLinks.length;
        activeLinks.push(link);
        submitText += `\x01L${linkIndex}\x01`;
      }

      lastIndex = match.index + match[0].length;
    }

    submitText += editorValue.slice(lastIndex);

    return { submitText, activeMentions, activeLinks };
  }, [editorValue, getLinkKey, getMentionKey]);

  // Expose getSubmitText for backward compat with the interface
  const getSubmitText = React.useCallback((): string => {
    return getSubmitData().submitText;
  }, [getSubmitData]);

  const handleEditorChange = React.useCallback(
    (
      _event: { target: { value: string } },
      newValue: string,
      newPlainTextValue: string,
      mentionEntries: Array<{ id: string; display: string; childIndex: number }>
    ) => {
      setEditorValue(newValue);
      setTextState(newPlainTextValue);

      const activeMentionEntries: IPrincipal[] = [];
      const activeLinkEntries: ICommentLink[] = [];

      mentionEntries.forEach((entry) => {
        if (entry.childIndex === 0) {
          const user =
            mentionRegistryRef.current[getMentionKey(entry.id, entry.display)] || {
              id: entry.id,
              email: entry.id,
              title: entry.display,
            };
          activeMentionEntries.push(user);
        } else if (entry.childIndex === 1) {
          const link =
            linkRegistryRef.current[getLinkKey(entry.id, entry.display)] || {
              name: entry.display,
              url: entry.id,
              fileType: entry.id.split('.').pop()?.toLowerCase() || '',
            };
          activeLinkEntries.push(link);
        }
      });

      setMentions(activeMentionEntries);
      setLinks(activeLinkEntries);
    },
    [getLinkKey, getMentionKey]
  );

  /**
   * Detect @ or # trigger from cursor position
   */
  const detectTrigger = React.useCallback((value: string, cursorPos: number) => {
    const textBeforeCursor = value.substring(0, cursorPos);

    for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
      const char = textBeforeCursor[i];

      if (char === ' ' || char === '\n' || char === '\t') break;

      if (char === '@' || char === '#') {
        const isAtStart = i === 0;
        const isPrecededBySpace = i > 0 && /\s/.test(textBeforeCursor[i - 1]);

        if (isAtStart || isPrecededBySpace) {
          const query = textBeforeCursor.substring(i + 1);
          triggerStartRef.current = i;

          if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setTriggerPosition({ top: rect.bottom + 4, left: rect.left });
          }

          setActiveTrigger(char as '@' | '#');
          setTriggerQuery(query);
          return;
        }
      }
    }

    setActiveTrigger(null);
    setTriggerQuery('');
    setTriggerPosition(null);
    triggerStartRef.current = -1;
  }, []);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      setTextState(value);
      detectTrigger(value, cursorPos);
    },
    [detectTrigger]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Escape' && activeTrigger) {
        e.preventDefault();
        setActiveTrigger(null);
        setTriggerQuery('');
        setTriggerPosition(null);
        triggerStartRef.current = -1;
      }
    },
    [activeTrigger]
  );

  const insertMention = React.useCallback(
    (user: IPrincipal) => {
      const label = mentionLabel(user);

      if (triggerStartRef.current >= 0) {
        const before = text.substring(0, triggerStartRef.current);
        const cursorPos = inputRef.current?.selectionStart || text.length;
        const after = text.substring(cursorPos);
        setTextState(before + label + ' ' + after);
      }

      setMentions((prev) => [...prev, user]);
      setActiveTrigger(null);
      setTriggerQuery('');
      setTriggerPosition(null);
      triggerStartRef.current = -1;
      onMentioned?.(user);

      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [text, onMentioned]
  );

  const insertLink = React.useCallback(
    (link: ICommentLink) => {
      const label = linkLabel(link);

      if (triggerStartRef.current >= 0) {
        const before = text.substring(0, triggerStartRef.current);
        const cursorPos = inputRef.current?.selectionStart || text.length;
        const after = text.substring(cursorPos);
        setTextState(before + label + ' ' + after);
      }

      setLinks((prev) => [...prev, link]);
      setActiveTrigger(null);
      setTriggerQuery('');
      setTriggerPosition(null);
      triggerStartRef.current = -1;
      onLinkAdded?.(link);

      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [text, onLinkAdded]
  );

  const dismissTrigger = React.useCallback(() => {
    setActiveTrigger(null);
    setTriggerQuery('');
    setTriggerPosition(null);
    triggerStartRef.current = -1;
  }, []);

  const handlePaste = React.useCallback(
    async (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!enableLinkResolution) return;

      const pastedText = e.clipboardData.getData('text/plain').trim();

      if (!pastedText.startsWith('http://') && !pastedText.startsWith('https://')) return;
      if (!pastedText.includes('.sharepoint.com') && !pastedText.includes('.sharepoint.us')) return;
      if (!SPContext.isReady()) return;

      setResolvingUrl(true);

      try {
        const resolved = await resolveSharePointUrl(pastedText, SPContext.sp);
        if (resolved) {
          const resolvedLink = { name: resolved.name, url: resolved.url };
          registerLink(resolvedLink);
          setEditorValue((current) => current.replace(pastedText, `#[${resolved.name}](${resolved.url}) `));
          setTextState((current) => current.replace(pastedText, `#${resolved.name} `));
          setLinks((prev) => [...prev, resolvedLink]);
          onLinkAdded?.(resolvedLink);
        }
      } catch {
        // Resolution failed — raw URL stays as-is
      } finally {
        setResolvingUrl(false);
      }
    },
    [enableLinkResolution, onLinkAdded]
  );

  const reset = React.useCallback(() => {
    setTextState('');
    setEditorValue('');
    setMentions([]);
    setLinks([]);
    setActiveTrigger(null);
    setTriggerQuery('');
    setTriggerPosition(null);
    triggerStartRef.current = -1;
  }, []);

  return {
    text,
    editorValue,
    setText,
    mentions,
    links,
    activeTrigger,
    triggerQuery,
    triggerPosition,
    insertMention,
    insertLink,
    dismissTrigger,
    handleKeyDown,
    handleChange,
    handleEditorChange,
    handlePaste,
    reset,
    inputRef,
    resolvingUrl,
    registerMention,
    registerLink,
    getSubmitText,
    getSubmitData,
  };
}
